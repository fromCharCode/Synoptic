import type { BusEvents } from './types'

type Listener<T> = (payload: T) => void

export interface Bus {
  on<K extends keyof BusEvents>(event: K, listener: Listener<BusEvents[K]>): void
  off<K extends keyof BusEvents>(event: K, listener: Listener<BusEvents[K]>): void
  emit<K extends keyof BusEvents>(event: K, payload: BusEvents[K]): void
}

export function createBus(): Bus {
  const listeners = new Map<string, Set<Listener<unknown>>>()
  return {
    on(event, listener) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(listener as Listener<unknown>)
    },
    off(event, listener) {
      listeners.get(event)?.delete(listener as Listener<unknown>)
    },
    emit(event, payload) {
      listeners.get(event)?.forEach(fn => fn(payload))
    },
  }
}
