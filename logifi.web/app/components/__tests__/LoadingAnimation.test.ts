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
    expect(svg.attributes('viewBox')).toBe('0 0 186 210')
    expect(svg.attributes('overflow')).toBe('visible')
    expect(wrapper.findAll('.loading-animation__pivot')).toHaveLength(2)
    expect(wrapper.findAll('.loading-animation__motion')).toHaveLength(2)
    expect(wrapper.findAll('.loading-animation__corner')).toHaveLength(2)
    const pivots = wrapper.findAll('.loading-animation__pivot')
    expect(pivots[0].attributes('transform')).toBe('translate(39 185)')
    expect(pivots[1].attributes('transform')).toBe('translate(161 24)')
    expect(wrapper.find('.loading-animation__motion--bl').attributes('transform')).toBeUndefined()
    expect(wrapper.find('.loading-animation__word').exists()).toBe(false)
  })

  it('renders wordmark variant with marketing lockup image', () => {
    const wrapper = mount(LoadingAnimation, {
      props: { variant: 'wordmark', fullscreen: false, size: 'sm' },
    })
    expect(wrapper.get('.loading-animation').classes()).toContain('loading-animation--variant-wordmark')
    const svg = wrapper.get('svg')
    expect(svg.attributes('viewBox')).toBe('0 0 400 400')
    expect(svg.attributes('overflow')).toBe('visible')
    expect(wrapper.find('.loading-animation__wordmark-image').exists()).toBe(true)
    const pivots = wrapper.findAll('.loading-animation__pivot')
    expect(pivots).toHaveLength(2)
    expect(pivots[0].attributes('transform')).toBe('translate(85 251)')
    expect(pivots[1].attributes('transform')).toBe('translate(316 133)')
    expect(wrapper.find('.loading-animation__motion--bl-wordmark').attributes('transform')).toBeUndefined()
  })
})