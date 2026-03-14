const MAX_DT = 0.05

export interface Clock {
  dt: number
  elapsed: number
  frame: number
  update(deltaMs: number): void
}

export function createClock(): Clock {
  const clock: Clock = {
    dt: 0,
    elapsed: 0,
    frame: 0,
    update(deltaMs: number) {
      clock.dt = Math.min(deltaMs / 1000, MAX_DT)
      clock.elapsed += clock.dt
      clock.frame++
    },
  }
  return clock
}
