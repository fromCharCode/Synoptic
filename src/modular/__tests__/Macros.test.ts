import { describe, it, expect } from 'vitest'
import { createMacro } from '../Macros'

describe('Macro', () => {
  it('starts with value 0', () => {
    const m = createMacro('macro1', 'Macro 1')
    expect(m.value).toBe(0)
    expect(m.bindings).toEqual([])
  })
  it('stores value', () => {
    const m = createMacro('macro1', 'Macro 1')
    m.value = 0.75
    expect(m.value).toBe(0.75)
  })
  it('manages bindings', () => {
    const m = createMacro('macro1', 'Macro 1')
    m.addBinding('scale', 0.5)
    expect(m.bindings).toHaveLength(1)
    expect(m.bindings[0]).toEqual({ destId: 'scale', amount: 0.5 })
  })
  it('removes bindings', () => {
    const m = createMacro('macro1', 'Macro 1')
    m.addBinding('scale', 0.5); m.addBinding('hue', -0.3)
    m.removeBinding('scale')
    expect(m.bindings).toHaveLength(1)
    expect(m.bindings[0]?.destId).toBe('hue')
  })
  it('exposes as signal source', () => {
    const m = createMacro('macro1', 'Macro 1')
    m.value = 0.6
    expect(m.signal.id).toBe('macro1')
    expect(m.signal.value).toBe(0.6)
  })
})
