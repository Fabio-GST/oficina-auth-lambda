import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda'
import { autenticarPorCpf, type Dependencias, type ResultadoAutenticacao } from './dominio/autenticar-por-cpf.js'
import { mascararCpf, normalizarCpf } from './dominio/cpf.js'
import { ClientesRepositorioMysql } from './infra/clientes-repositorio-mysql.js'
import { carregarConfig } from './infra/config.js'
import { EmissorJwt } from './infra/jwt.js'

type Resposta = Exclude<APIGatewayProxyResultV2, string>

/**
 * Handler HTTP da Function (API Gateway HTTP API, payload v2):
 *
 *   POST /auth/cpf  { "cpf": "111.444.777-35" }
 *
 *   200 { token, tipo: "Bearer", expiraEm, cliente: { id, nome } }
 *   400 CPF ausente ou inválido (dígitos verificadores)
 *   401 CPF não cadastrado
 *   403 Cliente inativo
 *   405 Método diferente de POST
 *   500 Falha ao consultar a base
 *
 * Decisão: 401 e 403 são distintos para a demonstração deixar claro o status
 * do cliente. Em produção, ambos poderiam colapsar em 401 para não revelar
 * quais CPFs existem; o throttling do API Gateway mitiga enumeração.
 */
export function criarHandler(obterDependencias: () => Dependencias) {
  return async (evento: APIGatewayProxyEventV2, contexto?: Context): Promise<Resposta> => {
    const inicio = Date.now()
    const requestId =
      evento.headers?.['x-request-id'] ?? evento.requestContext?.requestId ?? contexto?.awsRequestId ?? 'local'
    const metodo = evento.requestContext?.http?.method ?? 'POST'

    const registrar = (nivel: 'info' | 'warn' | 'error', dados: Record<string, unknown>) => {
      console.log(
        JSON.stringify({
          nivel,
          requestId,
          funcao: 'auth-cpf',
          rota: `${metodo} ${evento.rawPath ?? '/auth/cpf'}`,
          duracaoMs: Date.now() - inicio,
          ...dados,
        })
      )
    }

    const responder = (status: number, corpo: Record<string, unknown>): Resposta => ({
      statusCode: status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-request-id': requestId,
        'cache-control': 'no-store',
      },
      body: JSON.stringify(corpo),
    })

    if (metodo !== 'POST') {
      registrar('warn', { status: 405 })
      return responder(405, { erro: 'METODO_NAO_PERMITIDO', mensagem: 'Use POST /auth/cpf.' })
    }

    const entrada = lerCorpo(evento)
    if (entrada === undefined) {
      registrar('warn', { status: 400, motivo: 'json_invalido' })
      return responder(400, { erro: 'CORPO_INVALIDO', mensagem: 'Corpo deve ser JSON com o campo "cpf".' })
    }

    const cpfMascarado = mascararCpf(normalizarCpf(entrada.cpf) ?? '')

    let resultado: ResultadoAutenticacao
    try {
      resultado = await autenticarPorCpf(entrada, obterDependencias())
    } catch (erro) {
      registrar('error', {
        status: 500,
        cpf: cpfMascarado,
        erro: erro instanceof Error ? erro.message : String(erro),
      })
      return responder(500, { erro: 'ERRO_INTERNO', mensagem: 'Não foi possível autenticar agora.' })
    }

    switch (resultado.tipo) {
      case 'cpf_invalido':
        registrar('warn', { status: 400, cpf: cpfMascarado, resultado: resultado.tipo })
        return responder(400, { erro: 'CPF_INVALIDO', mensagem: resultado.mensagem })
      case 'cliente_nao_encontrado':
        registrar('warn', { status: 401, cpf: cpfMascarado, resultado: resultado.tipo })
        return responder(401, { erro: 'NAO_AUTORIZADO', mensagem: 'CPF não cadastrado.' })
      case 'cliente_inativo':
        registrar('warn', { status: 403, cpf: cpfMascarado, resultado: resultado.tipo })
        return responder(403, { erro: 'CLIENTE_INATIVO', mensagem: 'Cliente inativo. Procure a oficina.' })
      case 'autenticado':
        registrar('info', { status: 200, cpf: cpfMascarado, clienteId: resultado.cliente.id, resultado: 'autenticado' })
        return responder(200, {
          token: resultado.token,
          tipo: 'Bearer',
          expiraEm: resultado.expiraEm.toISOString(),
          cliente: resultado.cliente,
        })
    }
  }
}

/** Devolve o objeto do corpo, `{}` se vazio, ou `undefined` se não for JSON válido. */
function lerCorpo(evento: APIGatewayProxyEventV2): { cpf?: unknown } | undefined {
  if (!evento.body) return {}
  const texto = evento.isBase64Encoded ? Buffer.from(evento.body, 'base64').toString('utf8') : evento.body
  try {
    const json: unknown = JSON.parse(texto)
    return typeof json === 'object' && json !== null ? (json as { cpf?: unknown }) : undefined
  } catch {
    return undefined
  }
}

// Dependências reais, criadas uma vez por instância e reaproveitadas (warm start).
let dependencias: Dependencias | undefined
function dependenciasReais(): Dependencias {
  if (!dependencias) {
    const config = carregarConfig()
    dependencias = {
      clientes: new ClientesRepositorioMysql(config.db),
      emissor: new EmissorJwt(config.jwt.segredo, config.jwt.expiraEm),
    }
  }
  return dependencias
}

export const handler = criarHandler(dependenciasReais)
