import { describe, it, expect } from 'vitest'
import { createPatchbay } from '../Patchbay'
import type { Destination } from '@core/types'

const testDest: Destination = {
  id: 'scale', label: 'Scale', group: 'transform',
  defaultSource: 'none', defaultAmount: 50, min: -1, max: 1, colorIndex: 1,
}

describe('Patchbay', () => {
  it('returns 0 for unpatched destination', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.update({ bass: 0.8 }, 1/60)
    expect(pb.get('scale')).toBe(0)
  })
  it('applies linear modulation', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', 1.0, 'linear', 0)
    pb.update({ bass: 0.5 }, 1/60)
    expect(pb.get('scale')).toBeCloseTo(1.0)
  })
  it('applies bipolar amount', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', -0.5, 'linear', 0)
    pb.update({ bass: 1.0 }, 1/60)
    expect(pb.get('scale')).toBeCloseTo(-1.0)
  })
  it('applies exp curve', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', 1.0, 'exp', 0)
    pb.update({ bass: 0.5 }, 1/60)
    expect(pb.get('scale')).toBeCloseTo(0.5)
  })
  it('applies log curve', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', 1.0, 'log', 0)
    pb.update({ bass: 0.25 }, 1/60)
    expect(pb.get('scale')).toBeCloseTo(1.0)
  })
  it('applies step curve', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', 1.0, 'step', 0)
    pb.update({ bass: 0.3 }, 1/60)
    expect(pb.get('scale')).toBeCloseTo(0.5)
  })
  it('applies lag/slew', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', 1.0, 'linear', 0.9)
    pb.update({ bass: 1.0 }, 1/60)
    const first = pb.get('scale')
    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThan(1.0)
  })
  it('clears a patch', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', 1.0, 'linear', 0)
    pb.clearPatch('scale')
    pb.update({ bass: 1.0 }, 1/60)
    expect(pb.get('scale')).toBe(0)
  })
  it('unregisters destinations', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', 1.0, 'linear', 0)
    pb.unregisterDestinations(['scale'])
    pb.update({ bass: 1.0 }, 1/60)
    expect(pb.get('scale')).toBe(0)
  })
  it('returns 0 for unknown source', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'nonexistent', 1.0, 'linear', 0)
    pb.update({}, 1/60)
    expect(pb.get('scale')).toBe(0)
  })
})
