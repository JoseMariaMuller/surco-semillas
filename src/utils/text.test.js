import { test } from 'node:test'
import assert from 'node:assert/strict'
import { minusculaInicial } from './text.js'

test('minúscula solo la inicial: respeta siglas y números romanos', () => {
  assert.equal(minusculaInicial('Grupo de madurez IV'), 'grupo de madurez IV')
  assert.equal(minusculaInicial('Híbrido alto oleico'), 'híbrido alto oleico')
  assert.equal(minusculaInicial(''), '')
})
