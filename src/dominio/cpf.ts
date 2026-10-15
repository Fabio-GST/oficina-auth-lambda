/**
 * Validação de CPF pelos dígitos verificadores. Regra idêntica à do objeto de
 * valor `Documento` da API (repo oficina-api), para que um CPF aceito no
 * cadastro seja aceito aqui e vice-versa.
 */
export class CpfInvalido extends Error {
  constructor(mensagem = 'CPF inválido.') {
    super(mensagem)
    this.name = 'CpfInvalido'
  }
}

/** Remove tudo que não é dígito. Devolve `null` se o valor não for texto ou número. */
export function normalizarCpf(valor: unknown): string | null {
  if (typeof valor === 'number') valor = String(valor)
  if (typeof valor !== 'string') return null
  return valor.replace(/\D/g, '')
}

export function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const calcular = (quantidade: number): number => {
    let soma = 0
    for (let i = 0; i < quantidade; i++) {
      soma += Number(cpf[i]) * (quantidade + 1 - i)
    }
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  return calcular(9) === Number(cpf[9]) && calcular(10) === Number(cpf[10])
}

/** Normaliza e valida; devolve só os 11 dígitos ou lança `CpfInvalido`. */
export function validarCpf(valor: unknown): string {
  const numeros = normalizarCpf(valor)
  if (numeros === null || numeros.length === 0) {
    throw new CpfInvalido('Informe o CPF.')
  }
  if (numeros.length !== 11) {
    throw new CpfInvalido('CPF deve ter 11 dígitos.')
  }
  if (!cpfValido(numeros)) {
    throw new CpfInvalido('CPF inválido.')
  }
  return numeros
}

/** Para logs: mantém só os 2 últimos dígitos (ex.: `*********35`). */
export function mascararCpf(cpf: string): string {
  return cpf.length <= 2 ? '**' : '*'.repeat(cpf.length - 2) + cpf.slice(-2)
}
