import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LoadingAnimation from '../LoadingAnimation.vue'

describe('LoadingAnimation', () => {
  it('renders default propeller variant fullscreen', () => {
    const wrapper = mount(LoadingAnimation, {
      props: { label: 'Loading logbook', fullscreen: true, size: 'md' },
    })
    const root = wrapper.get('.loading-animation')
    expect(root.classes()).toContain('loading-animation--variant-propeller')
    expect(root.classes()).toContain('loading-animation--fullscreen')
    expect(root.attributes('aria-label')).toBe('Loading logbook')
    const svg = wrapper.get('svg.loading-animation__mark')
    expect(svg.attributes('viewBox')).toBe('0 0 100 100')
    expect(wrapper.findAll('.loading-animation__corner')).toHaveLength(2)
    expect(wrapper.find('.loading-animation__word').exists()).toBe(false)
  })

  it('renders wordmark variant with logifi text', () => {
    const wrapper = mount(LoadingAnimation, {
      props: { variant: 'wordmark', fullscreen: false, size: 'sm' },
    })
    expect(wrapper.get('.loading-animation').classes()).toContain('loading-animation--variant-wordmark')
    expect(wrapper.get('svg').attributes('viewBox')).toBe('0 0 240 100')
    expect(wrapper.get('.loading-animation__word').text()).toBe('logifi')
  })
})