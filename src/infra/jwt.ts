import jwt from 'jsonwebtoken'
import type { EmissorDeToken, TokenEmitido } from '../dominio/autenticar-por-cpf.js'

/**
 * Contrato com a API (repo oficina-api, `ServicoJwt`): HS256 com o mesmo
 * `JWT_SECRET`; claims exatamente `sub` (id do cliente), `cpf`,
 * `papel: 'cliente'`, mais `iat`/`exp` gerados pela biblioteca. O teste
 * `tests/unit/contrato-jwt.spec.ts` da API espelha este formato.
 */
export const ALGORITMO_JWT = 'HS256'
export const PAPEL_CLIENTE = 'cliente'

export class EmissorJwt implements EmissorDeToken {
  constructor(
    private readonly segredo: string,
    private readonly expiraEm: string = '1h'
  ) {
    if (!segredo) throw new Error('JWT_SECRET não configurado.')
  }

  emitir(cliente: { id: string; cpf: string }): TokenEmitido {
    const token = jwt.sign({ sub: cliente.id, cpf: cliente.cpf, papel: PAPEL_CLIENTE }, this.segredo, {
      algorithm: ALGORITMO_JWT,
      expiresIn: this.expiraEm as jwt.SignOptions['expiresIn'],
    })
    const { exp } = jwt.decode(token) as jwt.JwtPayload
    return { token, expiraEm: new Date((exp ?? 0) * 1000) }
  }
}
