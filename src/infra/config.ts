/**
 * Configuração vinda do ambiente da função. No deploy, o Terraform preenche as
 * variáveis `DB_*` a partir do segredo `oficina/<ambiente>/db` do Secrets
 * Manager (repo oficina-infra-db) e `JWT_SECRET` a partir do mesmo secret do
 * GitHub usado pelo CD da API. Localmente vêm do `.env`.
 */
export interface Config {
  ambiente: string
  db: { host: string; port: number; database: string; user: string; password: string }
  jwt: { segredo: string; expiraEm: string }
}

function obrigatoria(nome: string, env: NodeJS.ProcessEnv): string {
  const valor = env[nome]
  if (!valor) throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`)
  return valor
}

export function carregarConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    ambiente: env.AMBIENTE ?? 'local',
    db: {
      host: obrigatoria('DB_HOST', env),
      port: Number(env.DB_PORT ?? 3306),
      database: obrigatoria('DB_DATABASE', env),
      user: obrigatoria('DB_USER', env),
      password: obrigatoria('DB_PASSWORD', env),
    },
    jwt: {
      segredo: obrigatoria('JWT_SECRET', env),
      expiraEm: env.JWT_EXPIRES_IN ?? '1h',
    },
  }
}
