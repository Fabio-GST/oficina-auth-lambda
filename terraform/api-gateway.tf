# ---------------------------------------------------------------------------
# Rota POST /auth/cpf no API Gateway de cada ambiente (gateway criado pelo repo
# oficina-infra-k8s; id lido do SSM). A rota ANY /{proxy+} do gateway vai para
# a API no EKS; esta rota, mais específica, tem precedência.
# ---------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "auth_cpf" {
  for_each = local.ambientes_gateway

  api_id                 = data.aws_ssm_parameter.gateway_id[each.key].value
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.auth_cpf[each.key].invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = (var.timeout_segundos + 2) * 1000
}

resource "aws_apigatewayv2_route" "auth_cpf" {
  for_each = local.ambientes_gateway

  api_id    = data.aws_ssm_parameter.gateway_id[each.key].value
  route_key = "POST /auth/cpf"
  target    = "integrations/${aws_apigatewayv2_integration.auth_cpf[each.key].id}"
}

# Permissão baseada em recurso (não é IAM role, por isso o lab permite).
resource "aws_lambda_permission" "gateway" {
  for_each = local.ambientes_gateway

  statement_id  = "PermitirApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_cpf[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${var.regiao}:${data.aws_caller_identity.atual.account_id}:${data.aws_ssm_parameter.gateway_id[each.key].value}/*/*/auth/cpf"
}

data "aws_caller_identity" "atual" {}
