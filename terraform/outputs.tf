output "funcoes" {
  description = "Nome da função por ambiente."
  value       = { for amb in local.ambientes : amb => aws_lambda_function.auth_cpf[amb].function_name }
}

output "urls_funcao" {
  description = "Function URL por ambiente (vazio se habilitar_url_funcao = false)."
  value       = { for amb, url in aws_lambda_function_url.auth_cpf : amb => url.function_url }
}

output "rotas_gateway" {
  description = "Rota criada no API Gateway por ambiente (vazio até habilitar_rota_gateway = true)."
  # O provider marca o valor de parâmetros SSM como sensível; o id do gateway não é.
  value = { for amb in local.ambientes_gateway : amb => "${nonsensitive(data.aws_ssm_parameter.gateway_id[amb].value)}: ${aws_apigatewayv2_route.auth_cpf[amb].route_key}" }
}

output "security_groups" {
  value = { for amb in local.ambientes : amb => aws_security_group.lambda[amb].id }
}
