import type { Cliente, ClientesRepositorio } from './cliente.js'
import { CpfInvalido, validarCpf } from './cpf.js'

export interface TokenEmitido {
  token: string
  /** Instante de expiração (claim `exp`). */
  expiraEm: Date
}

export interface EmissorDeToken {
  emitir(cliente: Pick<Cliente, 'id' | 'cpf'>): TokenEmitido
}

export type ResultadoAutenticacao =
  | { tipo: 'autenticado'; token: string; expiraEm: Date; cliente: Pick<Cliente, 'id' | 'nome'> }
  | { tipo: 'cpf_invalido'; mensagem: string }
  | { tipo: 'cliente_nao_encontrado' }
  | { tipo: 'cliente_inativo' }

export interface Dependencias {
  clientes: ClientesRepositorio
  emissor: EmissorDeToken
}

/**
 * Caso de uso da Function: valida o CPF, confere existência e status do
 * cliente na base e emite o JWT. Não conhece HTTP nem AWS.
 */
export async function autenticarPorCpf(
  entrada: { cpf?: unknown },
  { clientes, emissor }: Dependencias
): Promise<ResultadoAutenticacao> {
  let cpf: string
  try {
    cpf = validarCpf(entrada.cpf)
  } catch (erro) {
    if (erro instanceof CpfInvalido) return { tipo: 'cpf_invalido', mensagem: erro.message }
    throw erro
  }

  const cliente = await clientes.buscarPorCpf(cpf)
  if (!cliente) return { tipo: 'cliente_nao_encontrado' }
  if (!cliente.ativo) return { tipo: 'cliente_inativo' }

  const { token, expiraEm } = emissor.emitir({ id: cliente.id, cpf: cliente.cpf })
  return { tipo: 'autenticado', token, expiraEm, cliente: { id: cliente.id, nome: cliente.nome } }
}
