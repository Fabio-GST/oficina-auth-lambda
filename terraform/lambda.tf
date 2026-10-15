# ---------------------------------------------------------------------------
# Function Serverless de autenticação por CPF — uma por ambiente.
#
# Adaptações ao Learner Lab da AWS Academy:
# - Execution role = LabRole existente (o lab não cria roles IAM).
# - A função roda DENTRO da VPC (subnets privadas) para alcançar o RDS. Sem
#   NAT Gateway ela não tem saída para a internet, por isso as credenciais do
#   banco e o segredo do JWT vão como variáveis de ambiente (criptografadas em
#   repouso pela AWS), preenchidas pelo Terraform a partir do Secrets Manager.
#   Evolução: VPC endpoint do Secrets Manager + leitura em tempo de execução.
# ---------------------------------------------------------------------------
data "archive_file" "pacote" {
  type        = "zip"
  source_file = "${var.caminho_pacote}/index.js"
  output_path = "${path.module}/.terraform/auth-cpf.zip"
}

resource "aws_security_group" "lambda" {
  for_each = local.ambientes

  name        = "${var.prefixo}-${each.key}-auth-lambda"
  description = "Saida da Lambda de autenticacao ${each.key} para o RDS"
  vpc_id      = local.vpc_id

  egress {
    description = "MySQL no RDS"
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name     = "${var.prefixo}-${each.key}-auth-lambda"
    ambiente = each.key
  }
}

# Abre a porta do banco (SG criado pelo repo oficina-infra-db) para esta função.
resource "aws_vpc_security_group_ingress_rule" "db_lambda" {
  for_each = local.ambientes

  security_group_id            = data.aws_ssm_parameter.db_sg_id[each.key].value
  description                  = "MySQL a partir da Lambda de autenticacao ${each.key}"
  referenced_security_group_id = aws_security_group.lambda[each.key].id
  ip_protocol                  = "tcp"
  from_port                    = 3306
  to_port                      = 3306
}

resource "aws_cloudwatch_log_group" "lambda" {
  for_each = local.ambientes

  name              = "/aws/lambda/${var.prefixo}-${each.key}-auth-cpf"
  retention_in_days = 7
}

resource "aws_lambda_function" "auth_cpf" {
  for_each = local.ambientes

  function_name = "${var.prefixo}-${each.key}-auth-cpf"
  description   = "Autentica clientes da oficina por CPF e emite o JWT (${each.key})"
  role          = data.aws_iam_role.lab.arn

  filename         = data.archive_file.pacote.output_path
  source_code_hash = data.archive_file.pacote.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  memory_size      = var.memoria_mb
  timeout          = var.timeout_segundos

  vpc_config {
    subnet_ids         = local.subnets_privadas
    security_group_ids = [aws_security_group.lambda[each.key].id]
  }

  environment {
    variables = {
      AMBIENTE       = each.key
      DB_HOST        = local.db[each.key].DB_HOST
      DB_PORT        = local.db[each.key].DB_PORT
      DB_DATABASE    = local.db[each.key].DB_DATABASE
      DB_USER        = local.db[each.key].DB_USER
      DB_PASSWORD    = local.db[each.key].DB_PASSWORD
      JWT_SECRET     = var.jwt_secret
      JWT_EXPIRES_IN = var.jwt_expires_in
    }
  }

  tags = {
    ambiente = each.key
  }

  depends_on = [aws_cloudwatch_log_group.lambda]
}

# URL pública da função para testes antes do API Gateway (mesmo contrato HTTP).
resource "aws_lambda_function_url" "auth_cpf" {
  for_each = var.habilitar_url_funcao ? local.ambientes : toset([])

  function_name      = aws_lambda_function.auth_cpf[each.key].function_name
  authorization_type = "NONE"

  cors {
    allow_origins = ["*"]
    allow_methods = ["POST"]
    allow_headers = ["content-type", "x-request-id"]
  }
}
