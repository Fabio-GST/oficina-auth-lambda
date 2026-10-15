variable "regiao" {
  description = "Região AWS. O Learner Lab da AWS Academy libera us-east-1."
  type        = string
  default     = "us-east-1"
}

variable "prefixo" {
  description = "Prefixo dos nomes de recursos e dos parâmetros no SSM."
  type        = string
  default     = "oficina"
}

variable "ambientes" {
  description = "Ambientes que recebem uma função própria (cada um aponta para o RDS do mesmo ambiente)."
  type        = list(string)
  default     = ["hml", "prod"]
}

variable "nome_role_lab" {
  description = "Role IAM pré-existente do Learner Lab usada como execution role (a Academy não permite criar roles)."
  type        = string
  default     = "LabRole"
}

variable "jwt_secret" {
  description = "Segredo HS256 do JWT. Deve ser IDÊNTICO ao JWT_SECRET da API (repo oficina-api), senão a API recusa o token."
  type        = string
  sensitive   = true
}

variable "jwt_expires_in" {
  description = "Validade do token (formato do jsonwebtoken, ex.: 1h, 30m)."
  type        = string
  default     = "1h"
}

variable "caminho_pacote" {
  description = "Pasta com o bundle gerado por `npm run build` (dist/index.js)."
  type        = string
  default     = "../dist"
}

variable "memoria_mb" {
  description = "Memória da função. 256 MB é suficiente para mysql2 + jsonwebtoken."
  type        = number
  default     = 256
}

variable "timeout_segundos" {
  description = "Timeout da função (inclui o cold start da conexão com o banco)."
  type        = number
  default     = 10
}

variable "habilitar_rota_gateway" {
  description = "Cria a rota POST /auth/cpf no API Gateway de cada ambiente. Requer o gateway criado pelo repo oficina-infra-k8s (habilitar_gateway = true lá); deixe false antes disso."
  type        = bool
  default     = false
}

variable "habilitar_url_funcao" {
  description = "Cria uma Function URL pública para testar a autenticação antes do API Gateway existir (sem custo adicional)."
  type        = bool
  default     = true
}
