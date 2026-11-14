import { describe, expect, it } from 'vitest'
import { ACCENT_BAR, applyDeadKey, insertAt } from './accents'

describe('accent insertion', () => {
  it('offers the seven Spanish accents and the diaeresis', () => {
    expect(ACCENT_BAR).toEqual(['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'])
  })

  it('inserts at the caret and leaves the caret after the inserted character', () => {
    expect(insertAt('habl', 4, 4, 'é')).toEqual({ value: 'hablé', caret: 5 })
    expect(insertAt('hblo', 1, 1, 'a')).toEqual({ value: 'hablo', caret: 2 })
  })

  it('replaces a selected range', () => {
    expect(insertAt('hello', 1, 4, 'i')).toEqual({ value: 'hio', caret: 2 })
  })

  it('clamps a caret outside the value', () => {
    expect(insertAt('hola', 99, 99, '!')).toEqual({ value: 'hola!', caret: 5 })
    expect(insertAt('hola', -1, -1, '¡')).toEqual({ value: '¡hola', caret: 1 })
  })
})

describe('dead keys', () => {
  it('waits for a letter after the accent mark', () => {
    expect(applyDeadKey(null, "'")).toEqual({ insert: '', pending: "'" })
  })

  it('turns the acute mark plus a vowel into the accented vowel', () => {
    expect(applyDeadKey("'", 'a')).toEqual({ insert: 'á', pending: null })
    expect(applyDeadKey("'", 'e')).toEqual({ insert: 'é', pending: null })
    expect(applyDeadKey("'", 'i')).toEqual({ insert: 'í', pending: null })
    expect(applyDeadKey("'", 'o')).toEqual({ insert: 'ó', pending: null })
    expect(applyDeadKey("'", 'u')).toEqual({ insert: 'ú', pending: null })
  })

  it('maps the diaeresis and the tilde', () => {
    expect(applyDeadKey('"', 'u')).toEqual({ insert: 'ü', pending: null })
    expect(applyDeadKey('~', 'n')).toEqual({ insert: 'ñ', pending: null })
  })

  it('keeps the letter when the mark has no accented form', () => {
    expect(applyDeadKey("'", 'n')).toEqual({ insert: "'n", pending: null })
    expect(applyDeadKey('~', 'a')).toEqual({ insert: '~a', pending: null })
  })

  it('folds an uppercase letter to the lowercase accented form', () => {
    expect(applyDeadKey("'", 'A')).toEqual({ insert: 'á', pending: null })
  })

  it('replaces a pending mark with another one', () => {
    expect(applyDeadKey("'", '~')).toEqual({ insert: '', pending: '~' })
  })

  it('leaves ordinary typing and named keys alone', () => {
    expect(applyDeadKey(null, 'a')).toBeUndefined()
    expect(applyDeadKey(null, 'Enter')).toBeUndefined()
    expect(applyDeadKey("'", 'Backspace')).toBeUndefined()
  })
})
