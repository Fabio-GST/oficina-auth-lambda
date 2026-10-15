import mysql from 'mysql2/promise'
import type { Pool, RowDataPacket } from 'mysql2/promise'
import type { Cliente, ClientesRepositorio } from '../dominio/cliente.js'
import type { Config } from './config.js'

interface LinhaCliente extends RowDataPacket {
  id: string
  nome: string
  documento: string
  ativo: number | boolean | null
}

/**
 * Consulta a tabela `clientes` do banco da API (RDS MySQL). O pool é criado
 * uma vez por instância da Lambda e reaproveitado entre invocações (warm
 * start); `connectionLimit` baixo porque cada instância atende uma requisição
 * por vez.
 */
export class ClientesRepositorioMysql implements ClientesRepositorio {
  private pool: Pool | undefined

  constructor(private readonly db: Config['db']) {}

  async buscarPorCpf(cpf: string): Promise<Cliente | null> {
    const [linhas] = await this.obterPool().query<LinhaCliente[]>(
      `SELECT id, nome, documento, ativo
         FROM clientes
        WHERE documento = ? AND tipo_documento = 'CPF'
        LIMIT 1`,
      [cpf]
    )
    const linha = linhas[0]
    if (!linha) return null
    return { id: linha.id, nome: linha.nome, cpf: linha.documento, ativo: Boolean(linha.ativo) }
  }

  private obterPool(): Pool {
    this.pool ??= mysql.createPool({
      host: this.db.host,
      port: this.db.port,
      database: this.db.database,
      user: this.db.user,
      password: this.db.password,
      connectionLimit: 2,
      connectTimeout: 5_000,
      waitForConnections: true,
    })
    return this.pool
  }

  async encerrar(): Promise<void> {
    await this.pool?.end()
    this.pool = undefined
  }
}
