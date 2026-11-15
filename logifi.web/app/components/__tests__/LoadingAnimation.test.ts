import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LoadingAnimation from '../LoadingAnimation.vue'

describe('LoadingAnimation', () => {
  it('renders fullscreen boot loader with label', () => {
    const wrapper = mount(LoadingAnimation, {
      props: { label: 'Loading logbook', fullscreen: true, size: 'md' },
    })
    const root = wrapper.get('.loading-animation')
    expect(root.classes()).toContain('loading-animation--fullscreen')
    expect(root.attributes('aria-label')).toBe('Loading logbook')
    expect(root.attributes('aria-busy')).toBe('true')
    const img = wrapper.get('img')
    expect(img.classes()).toContain('loading-animation__mark--md')
    expect(img.attributes('width')).toBe('72')
  })

  it('supports inline layout and size tokens', () => {
    const wrapper = mount(LoadingAnimation, {
      props: { fullscreen: false, size: 'sm' },
    })
    expect(wrapper.get('.loading-animation').classes()).toContain('loading-animation--inline')
    expect(wrapper.get('img').attributes('width')).toBe('48')
  })
})