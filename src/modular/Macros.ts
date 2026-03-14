import type { Signal, MacroBinding } from '@core/types'

export interface Macro {
  readonly id: string
  label: string
  value: number
  readonly bindings: ReadonlyArray<MacroBinding>
  readonly signal: Signal
  addBinding(destId: string, amount: number): void
  removeBinding(destId: string): void
}

export function createMacro(id: string, label: string): Macro {
  const bindings: MacroBinding[] = []
  const macro: Macro = {
    id, label, value: 0,
    get bindings() { return bindings },
    get signal(): Signal {
      return { id: macro.id, label: macro.label, value: macro.value, group: 'macro' }
    },
    addBinding(destId: string, amount: number) {
      bindings.push({ destId, amount })
    },
    removeBinding(destId: string) {
      const idx = bindings.findIndex(b => b.destId === destId)
      if (idx >= 0) bindings.splice(idx, 1)
    },
  }
  return macro
}
