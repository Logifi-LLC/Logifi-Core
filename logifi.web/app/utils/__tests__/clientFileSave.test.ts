import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveClientFile } from '../clientFileSave'

vi.mock('~/composables/useCapacitorPlatform', () => ({
  isCapacitorNative: () => false,
}))

describe('saveClientFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('uses Blob + anchor download on web', async () => {
    const click = vi.fn()
    const setAttribute = vi.fn()
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        return {
          setAttribute,
          click,
          style: {},
        } as unknown as HTMLAnchorElement
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag)
    })
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)

    await saveClientFile({
      filename: 'logifi-logbook.pdf',
      mimeType: 'application/pdf',
      data: new Uint8Array([1, 2, 3]),
    })

    expect(createObjectURL).toHaveBeenCalled()
    expect(setAttribute).toHaveBeenCalledWith('download', 'logifi-logbook.pdf')
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })
})
