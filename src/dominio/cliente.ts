/** Projeção mínima do cliente necessária para autenticar. */
export interface Cliente {
  id: string
  nome: string
  /** CPF apenas com dígitos (coluna `clientes.documento`). */
  cpf: string
  /** Coluna `clientes.ativo` — cliente inativo não recebe token. */
  ativo: boolean
}

export interface ClientesRepositorio {
  buscarPorCpf(cpf: string): Promise<Cliente | null>
}
