import type { CurveType, Destination, Patchbay as PatchbayInterface } from '@core/types'

interface PatchEntry {
  sourceId: string
  amount: number
  curve: CurveType
  lag: number
}

function applyCurve(value: number, curve: CurveType): number {
  switch (curve) {
    case 'linear': return value
    case 'exp': return value * value
    case 'log': return Math.sqrt(value)
    case 'step': return Math.floor(value * 4) / 4
  }
}

export function createPatchbay(): PatchbayInterface {
  const destinations = new Map<string, Destination>()
  const patches = new Map<string, PatchEntry>()
  const modValues = new Map<string, number>()
  const laggedValues = new Map<string, number>()

  return {
    registerDestinations(dests: Destination[]) {
      for (const d of dests) {
        destinations.set(d.id, d)
        modValues.set(d.id, 0)
        laggedValues.set(d.id, 0)
      }
    },
    unregisterDestinations(ids: string[]) {
      for (const id of ids) {
        destinations.delete(id)
        patches.delete(id)
        modValues.delete(id)
        laggedValues.delete(id)
      }
    },
    setPatch(destId, sourceId, amount, curve, lag) {
      patches.set(destId, { sourceId, amount, curve, lag })
    },
    clearPatch(destId) {
      patches.delete(destId)
      modValues.set(destId, 0)
      laggedValues.set(destId, 0)
    },
    update(signals: Record<string, number>, dt: number) {
      for (const [destId, patch] of patches) {
        const dest = destinations.get(destId)
        if (!dest) continue
        const raw = signals[patch.sourceId] ?? 0
        const curved = applyCurve(raw, patch.curve)
        const target = curved * patch.amount * (dest.max - dest.min)
        if (patch.lag > 0) {
          const prev = laggedValues.get(destId) ?? 0
          const slew = (1 - patch.lag) * dt * 60
          const lagged = prev + (target - prev) * Math.min(slew, 1)
          laggedValues.set(destId, lagged)
          modValues.set(destId, lagged)
        } else {
          modValues.set(destId, target)
          laggedValues.set(destId, target)
        }
      }
    },
    get(destId: string): number {
      return modValues.get(destId) ?? 0
    },
    getDestinations(): Destination[] {
      return [...destinations.values()]
    },
    getPatches() {
      return new Map(patches)
    },
  }
}
