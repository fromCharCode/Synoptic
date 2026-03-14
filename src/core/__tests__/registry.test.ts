import { describe, it, expect } from 'vitest'
import { createRegistry } from '../registry'
import type { Visualizer } from '../types'

const mockViz: Visualizer = {
  id: 'test', name: 'Test Viz', category: '2d', description: 'A test',
  params: [], toggles: [],
  init: () => {}, update: () => {}, resize: () => {}, dispose: () => {}, setOpacity: () => {},
}

describe('Registry', () => {
  it('registers and retrieves a visualizer', () => {
    const reg = createRegistry()
    reg.registerVisualizer(mockViz)
    expect(reg.getVisualizer('test')).toBe(mockViz)
  })
  it('returns undefined for unknown id', () => {
    const reg = createRegistry()
    expect(reg.getVisualizer('nope')).toBeUndefined()
  })
  it('lists registered visualizers', () => {
    const reg = createRegistry()
    reg.registerVisualizer(mockViz)
    const list = reg.getVisualizerList()
    expect(list).toHaveLength(1)
    expect(list[0]).toEqual({ id: 'test', name: 'Test Viz', category: '2d', description: 'A test' })
  })
})
