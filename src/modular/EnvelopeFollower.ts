export interface Envelope {
  readonly id: string
  source: string
  attack: number
  release: number
  value: number
  update(dt: number, input: number): void
}

export function createEnvelope(id: string, source: string, attack: number, release: number): Envelope {
  const env: Envelope = {
    id, source, attack, release, value: 0,
    update(dt: number, input: number) {
      const coeff = input > env.value
        ? Math.min(1, dt / Math.max(env.attack, 0.001))
        : Math.min(1, dt / Math.max(env.release, 0.001))
      env.value += (input - env.value) * coeff
    },
  }
  return env
}
