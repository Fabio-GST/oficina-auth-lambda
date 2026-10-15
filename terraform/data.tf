# ---------------------------------------------------------------------------
# Contratos com os outros repositórios, via SSM Parameter Store e Secrets
# Manager (os states permanecem independentes):
#
#   oficina-infra-k8s  → /oficina/vpc/id, /oficina/vpc/subnets-privadas,
#                        /oficina/<amb>/gateway/id (se habilitar_rota_gateway)
#   oficina-infra-db   → /oficina/<amb>/db/sg-id e o segredo oficina/<amb>/db
# ---------------------------------------------------------------------------
data "aws_iam_role" "lab" {
  name = var.nome_role_lab
}

data "aws_ssm_parameter" "vpc_id" {
  name = "/${var.prefixo}/vpc/id"
}

data "aws_ssm_parameter" "subnets_privadas" {
  name = "/${var.prefixo}/vpc/subnets-privadas"
}

data "aws_ssm_parameter" "db_sg_id" {
  for_each = local.ambientes
  name     = "/${var.prefixo}/${each.key}/db/sg-id"
}

data "aws_secretsmanager_secret_version" "db" {
  for_each  = local.ambientes
  secret_id = "${var.prefixo}/${each.key}/db"
}

# Lista os gateways já publicados pelo oficina-infra-k8s: a rota só é criada nos
# ambientes em que o gateway existe (ex.: hml antes de prod).
data "aws_ssm_parameters_by_path" "gateways" {
  path      = "/${var.prefixo}"
  recursive = true
}

data "aws_ssm_parameter" "gateway_id" {
  for_each = local.ambientes_gateway
  name     = "/${var.prefixo}/${each.key}/gateway/id"
}

locals {
  ambientes = toset(var.ambientes)
  ambientes_gateway = toset([
    for amb in var.ambientes : amb
    if var.habilitar_rota_gateway && contains(data.aws_ssm_parameters_by_path.gateways.names, "/${var.prefixo}/${amb}/gateway/id")
  ])
  vpc_id           = data.aws_ssm_parameter.vpc_id.value
  subnets_privadas = split(",", data.aws_ssm_parameter.subnets_privadas.value)

  # Credenciais do banco por ambiente (chaves DB_* gravadas pelo oficina-infra-db).
  db = {
    for amb in local.ambientes : amb => jsondecode(data.aws_secretsmanager_secret_version.db[amb].secret_string)
  }
}
