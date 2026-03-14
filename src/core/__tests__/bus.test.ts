import { describe, it, expect, vi } from 'vitest'
import { createBus } from '../bus'

describe('EventBus', () => {
  it('calls listeners on emit', () => {
    const bus = createBus()
    const fn = vi.fn()
    bus.on('beat:detected', fn)
    bus.emit('beat:detected', undefined as void)
    expect(fn).toHaveBeenCalledOnce()
  })
  it('passes payload to listeners', () => {
    const bus = createBus()
    const fn = vi.fn()
    bus.on('audio:connected', fn)
    bus.emit('audio:connected', { mode: 'mic' })
    expect(fn).toHaveBeenCalledWith({ mode: 'mic' })
  })
  it('removes listener with off()', () => {
    const bus = createBus()
    const fn = vi.fn()
    bus.on('beat:detected', fn)
    bus.off('beat:detected', fn)
    bus.emit('beat:detected', undefined as void)
    expect(fn).not.toHaveBeenCalled()
  })
  it('supports multiple listeners', () => {
    const bus = createBus()
    const fn1 = vi.fn(); const fn2 = vi.fn()
    bus.on('beat:detected', fn1); bus.on('beat:detected', fn2)
    bus.emit('beat:detected', undefined as void)
    expect(fn1).toHaveBeenCalledOnce(); expect(fn2).toHaveBeenCalledOnce()
  })
  it('does not throw on emit with no listeners', () => {
    const bus = createBus()
    expect(() => bus.emit('beat:detected', undefined as void)).not.toThrow()
  })
})
