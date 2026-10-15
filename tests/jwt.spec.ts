import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import { ALGORITMO_JWT, EmissorJwt, PAPEL_CLIENTE } from '../src/infra/jwt.js'

const SEGREDO = 'segredo-de-teste'

/**
 * Teste de contrato com a API (repo oficina-api, tests/unit/contrato-jwt.spec.ts):
 * HS256, mesmo segredo, claims exatamente sub, cpf, papel, iat e exp.
 */
describe('EmissorJwt (contrato com a API)', () => {
  const emissor = new EmissorJwt(SEGREDO, '1h')

  it('assina com HS256', () => {
    const { token } = emissor.emitir({ id: 'cliente-123', cpf: '11144477735' })
    const decodificado = jwt.decode(token, { complete: true })!
    expect(decodificado.header.alg).toBe('HS256')
    expect(ALGORITMO_JWT).toBe('HS256')
  })

  it('as claims são exatamente sub, cpf, papel, iat e exp', () => {
    const { token } = emissor.emitir({ id: 'cliente-123', cpf: '11144477735' })
    const payload = jwt.verify(token, SEGREDO, { algorithms: ['HS256'] }) as jwt.JwtPayload

    expect(Object.keys(payload).sort()).toEqual(['cpf', 'exp', 'iat', 'papel', 'sub'])
    expect(payload.sub).toBe('cliente-123')
    expect(payload.cpf).toBe('11144477735')
    expect(payload.papel).toBe(PAPEL_CLIENTE)
    expect(payload.papel).toBe('cliente')
  })

  it('expiraEm corresponde à claim exp', () => {
    const { token, expiraEm } = emissor.emitir({ id: 'c', cpf: '11144477735' })
    const { exp } = jwt.decode(token) as jwt.JwtPayload
    expect(expiraEm.getTime()).toBe(exp! * 1000)
    expect(expiraEm.getTime() - Date.now()).toBeGreaterThan(55 * 60 * 1000)
  })

  it('token não é aceito com outro segredo', () => {
    const { token } = emissor.emitir({ id: 'c', cpf: '11144477735' })
    expect(() => jwt.verify(token, 'outro')).toThrow()
  })

  it('exige segredo', () => {
    expect(() => new EmissorJwt('')).toThrow('JWT_SECRET não configurado.')
  })
})
