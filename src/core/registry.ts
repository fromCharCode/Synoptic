import type { Visualizer, VisualizerCategory } from './types'

interface VisualizerInfo {
  id: string
  name: string
  category: VisualizerCategory
  description: string
}

export interface Registry {
  registerVisualizer(viz: Visualizer): void
  getVisualizer(id: string): Visualizer | undefined
  getVisualizerList(): VisualizerInfo[]
}

export function createRegistry(): Registry {
  const visualizers = new Map<string, Visualizer>()
  return {
    registerVisualizer(viz) {
      visualizers.set(viz.id, viz)
    },
    getVisualizer(id) {
      return visualizers.get(id)
    },
    getVisualizerList() {
      return [...visualizers.values()].map(v => ({
        id: v.id, name: v.name, category: v.category, description: v.description,
      }))
    },
  }
}
