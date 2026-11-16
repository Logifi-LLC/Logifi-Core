import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SignaturePad from '../SignaturePad.vue'

describe('SignaturePad', () => {
  it('sizes the canvas to match the bordered frame when fillParent is true', async () => {
    const wrapper = mount(SignaturePad, {
      props: { fillParent: true, hideFooter: true },
      attachTo: document.body,
      global: {
        stubs: {},
      },
    })

    const host = document.createElement('div')
    host.style.width = '360px'
    host.style.height = '480px'
    document.body.appendChild(host)
    host.appendChild(wrapper.element)

    const frame = wrapper.find<HTMLDivElement>('[data-signature-pad-frame]')
    Object.defineProperty(frame.element, 'clientWidth', { configurable: true, value: 360 })
    Object.defineProperty(frame.element, 'clientHeight', { configurable: true, value: 480 })
    Object.defineProperty(frame.element, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        width: 360,
        height: 480,
        top: 0,
        left: 0,
        right: 360,
        bottom: 480,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    })

    const exposed = wrapper.vm as { resize?: () => void }
    exposed.resize?.()
    await nextTick()

    const canvas = wrapper.find<HTMLCanvasElement>('canvas').element
    expect(canvas.style.width).toBe('')
    expect(canvas.style.height).toBe('')
    expect(canvas.width).toBe(360)
    expect(canvas.height).toBe(480)
    expect(canvas.classList.contains('h-full')).toBe(true)
    expect(canvas.classList.contains('w-full')).toBe(true)

    wrapper.unmount()
    host.remove()
  })
})