# Publicado para os outros repositórios e para o smoke test do CD.
locals {
  parametros = merge(
    { for amb in local.ambientes : "/${var.prefixo}/${amb}/auth/lambda-arn" => aws_lambda_function.auth_cpf[amb].arn },
    { for amb in local.ambientes : "/${var.prefixo}/${amb}/auth/lambda-nome" => aws_lambda_function.auth_cpf[amb].function_name },
    { for amb in keys(aws_lambda_function_url.auth_cpf) : "/${var.prefixo}/${amb}/auth/url" => aws_lambda_function_url.auth_cpf[amb].function_url },
  )
}

resource "aws_ssm_parameter" "auth" {
  for_each = local.parametros

  name  = each.key
  type  = "String"
  value = each.value
}
