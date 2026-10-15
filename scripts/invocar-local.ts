/**
 * Invoca o handler localmente contra um MySQL acessível (por exemplo o
 * `docker compose up` do repo oficina-api), com as variáveis do `.env`.
 *
 *   npm run local -- 111.444.777-35
 */
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { handler } from '../src/handler.js'

const cpf = process.argv[2]
if (!cpf) {
  console.error('Uso: npm run local -- <cpf>')
  process.exit(1)
}

const evento = {
  version: '2.0',
  routeKey: 'POST /auth/cpf',
  rawPath: '/auth/cpf',
  rawQueryString: '',
  headers: { 'content-type': 'application/json', 'x-request-id': `local-${Date.now()}` },
  isBase64Encoded: false,
  body: JSON.stringify({ cpf }),
  requestContext: {
    http: { method: 'POST', path: '/auth/cpf', protocol: 'HTTP/1.1', sourceIp: '127.0.0.1', userAgent: 'local' },
    requestId: `local-${Date.now()}`,
  },
} as unknown as APIGatewayProxyEventV2

const resposta = await handler(evento)
console.log(`\nHTTP ${resposta.statusCode}`)
console.log(JSON.stringify(JSON.parse(resposta.body ?? '{}'), null, 2))
process.exit(0)
