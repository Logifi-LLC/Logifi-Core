import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearDrawnSignatureUrlCache,
  resolveDrawnSignatureUrlCached,
} from '../drawnSignatureUrlResolve'

afterEach(() => {
  clearDrawnSignatureUrlCache()
})

describe('resolveDrawnSignatureUrlCached', () => {
  it('calls resolve once and reuses the cached URL', async () => {
    const resolve = vi.fn(async () => 'https://cdn/signed.png')
    const url1 = await resolveDrawnSignatureUrlCached('e1', 'path/a.png', resolve)
    const url2 = await resolveDrawnSignatureUrlCached('e1', 'path/a.png', resolve)
    expect(url1).toBe('https://cdn/signed.png')
    expect(url2).toBe('https://cdn/signed.png')
    expect(resolve).toHaveBeenCalledTimes(1)
  })

  it('shares one in-flight promise for concurrent requests', async () => {
    let release!: () => void
    const resolve = vi.fn(
      () =>
        new Promise<string | null>((res) => {
          release = () => res('https://cdn/once.png')
        })
    )
    const p1 = resolveDrawnSignatureUrlCached('e1', 'p.png', resolve)
    const p2 = resolveDrawnSignatureUrlCached('e1', 'p.png', resolve)
    expect(resolve).toHaveBeenCalledTimes(1)
    release()
    await expect(Promise.all([p1, p2])).resolves.toEqual([
      'https://cdn/once.png',
      'https://cdn/once.png',
    ])
  })
})