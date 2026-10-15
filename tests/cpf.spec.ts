import { describe, expect, it } from 'vitest'
import { CpfInvalido, cpfValido, mascararCpf, normalizarCpf, validarCpf } from '../src/dominio/cpf.js'

describe('normalizarCpf', () => {
  it('remove pontuação e espaços', () => {
    expect(normalizarCpf(' 111.444.777-35 ')).toBe('11144477735')
  })

  it('aceita número', () => {
    expect(normalizarCpf(52998224725)).toBe('52998224725')
  })

  it('devolve null para tipos não textuais', () => {
    expect(normalizarCpf(undefined)).toBeNull()
    expect(normalizarCpf(null)).toBeNull()
    expect(normalizarCpf({ cpf: '1' })).toBeNull()
  })
})

describe('cpfValido', () => {
  it.each(['11144477735', '52998224725', '12345678909'])('aceita %s', (cpf) => {
    expect(cpfValido(cpf)).toBe(true)
  })

  it.each(['11144477736', '00000000000', '11111111111', '1234567890', '123456789012', 'abcdefghijk'])(
    'recusa %s',
    (cpf) => {
      expect(cpfValido(cpf)).toBe(false)
    }
  )
})

describe('validarCpf', () => {
  it('devolve só os dígitos quando válido', () => {
    expect(validarCpf('111.444.777-35')).toBe('11144477735')
  })

  it('lança CpfInvalido quando ausente', () => {
    expect(() => validarCpf(undefined)).toThrow(CpfInvalido)
    expect(() => validarCpf('')).toThrow('Informe o CPF.')
  })

  it('lança CpfInvalido para tamanho errado', () => {
    expect(() => validarCpf('123')).toThrow('CPF deve ter 11 dígitos.')
  })

  it('lança CpfInvalido para dígito verificador errado', () => {
    expect(() => validarCpf('111.444.777-36')).toThrow('CPF inválido.')
  })
})

describe('mascararCpf', () => {
  it('mantém só os dois últimos dígitos', () => {
    expect(mascararCpf('11144477735')).toBe('*********35')
    expect(mascararCpf('')).toBe('**')
  })
})
