import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import jwt from 'jsonwebtoken'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cliente, ClientesRepositorio } from '../src/dominio/cliente.js'
import { criarHandler } from '../src/handler.js'
import { EmissorJwt } from '../src/infra/jwt.js'

const SEGREDO = 'segredo-de-teste'

class RepositorioEmMemoria implements ClientesRepositorio {
  constructor(private readonly clientes: Cliente[]) {}
  async buscarPorCpf(cpf: string) {
    return this.clientes.find((c) => c.cpf === cpf) ?? null
  }
}

class RepositorioQuebrado implements ClientesRepositorio {
  async buscarPorCpf(): Promise<Cliente | null> {
    throw new Error('connect ECONNREFUSED')
  }
}

const clientes: Cliente[] = [
  { id: 'c-maria', nome: 'Maria Silva', cpf: '11144477735', ativo: true },
  { id: 'c-carlos', nome: 'Carlos Inativo', cpf: '12345678909', ativo: false },
]

function evento(corpo?: unknown, extras: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'POST /auth/cpf',
    rawPath: '/auth/cpf',
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    isBase64Encoded: false,
    body: corpo === undefined ? undefined : typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
    requestContext: {
      accountId: '1',
      apiId: 'api',
      domainName: 'x',
      domainPrefix: 'x',
      requestId: 'req-1',
      routeKey: 'POST /auth/cpf',
      stage: '$default',
      time: '',
      timeEpoch: 0,
      http: { method: 'POST', path: '/auth/cpf', protocol: 'HTTP/1.1', sourceIp: '127.0.0.1', userAgent: 'vitest' },
    },
    ...extras,
  }
}

function corpoDe(resposta: Awaited<ReturnType<ReturnType<typeof criarHandler>>>) {
  return JSON.parse(resposta.body ?? '{}')
}

describe('handler POST /auth/cpf', () => {
  const handler = criarHandler(() => ({
    clientes: new RepositorioEmMemoria(clientes),
    emissor: new EmissorJwt(SEGREDO, '1h'),
  }))

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('200: emite JWT para cliente ativo e devolve x-request-id', async () => {
    const resposta = await handler(evento({ cpf: '111.444.777-35' }))

    expect(resposta.statusCode).toBe(200)
    expect(resposta.headers?.['x-request-id']).toBe('req-1')
    const corpo = corpoDe(resposta)
    expect(corpo.tipo).toBe('Bearer')
    expect(corpo.cliente).toEqual({ id: 'c-maria', nome: 'Maria Silva' })
    expect(new Date(corpo.expiraEm).getTime()).toBeGreaterThan(Date.now())

    const payload = jwt.verify(corpo.token, SEGREDO) as jwt.JwtPayload
    expect(payload.sub).toBe('c-maria')
    expect(payload.cpf).toBe('11144477735')
    expect(payload.papel).toBe('cliente')
  })

  it('aceita corpo em base64 (API Gateway)', async () => {
    const corpo = Buffer.from(JSON.stringify({ cpf: '11144477735' })).toString('base64')
    const resposta = await handler(evento(corpo, { isBase64Encoded: true }))
    expect(resposta.statusCode).toBe(200)
  })

  it('400: CPF ausente', async () => {
    const resposta = await handler(evento({}))
    expect(resposta.statusCode).toBe(400)
    expect(corpoDe(resposta)).toEqual({ erro: 'CPF_INVALIDO', mensagem: 'Informe o CPF.' })
  })

  it('400: CPF com dígito verificador errado', async () => {
    const resposta = await handler(evento({ cpf: '11144477736' }))
    expect(resposta.statusCode).toBe(400)
    expect(corpoDe(resposta).erro).toBe('CPF_INVALIDO')
  })

  it('400: corpo que não é JSON', async () => {
    const resposta = await handler(evento('cpf=123'))
    expect(resposta.statusCode).toBe(400)
    expect(corpoDe(resposta).erro).toBe('CORPO_INVALIDO')
  })

  it('401: CPF válido mas não cadastrado', async () => {
    const resposta = await handler(evento({ cpf: '52998224725' }))
    expect(resposta.statusCode).toBe(401)
    expect(corpoDe(resposta).erro).toBe('NAO_AUTORIZADO')
  })

  it('403: cliente inativo', async () => {
    const resposta = await handler(evento({ cpf: '12345678909' }))
    expect(resposta.statusCode).toBe(403)
    expect(corpoDe(resposta).erro).toBe('CLIENTE_INATIVO')
  })

  it('405: método diferente de POST', async () => {
    const ev = evento({ cpf: '11144477735' })
    ev.requestContext.http.method = 'GET'
    const resposta = await handler(ev)
    expect(resposta.statusCode).toBe(405)
  })

  it('500: falha na base não vaza detalhes e é registrada', async () => {
    const quebrado = criarHandler(() => ({
      clientes: new RepositorioQuebrado(),
      emissor: new EmissorJwt(SEGREDO),
    }))
    const resposta = await quebrado(evento({ cpf: '11144477735' }))

    expect(resposta.statusCode).toBe(500)
    expect(corpoDe(resposta)).toEqual({ erro: 'ERRO_INTERNO', mensagem: 'Não foi possível autenticar agora.' })
    const log = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0])
    expect(log.nivel).toBe('error')
    expect(log.erro).toContain('ECONNREFUSED')
  })

  it('logs em JSON não contêm o CPF completo', async () => {
    await handler(evento({ cpf: '11144477735' }))
    const log = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0])
    expect(log).toMatchObject({ nivel: 'info', requestId: 'req-1', status: 200, cpf: '*********35' })
    expect(JSON.stringify(log)).not.toContain('11144477735')
  })
})
