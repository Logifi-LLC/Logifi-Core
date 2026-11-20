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
    expect(svg.attributes('viewBox')).toBe('0 0 512 512')
    expect(svg.attributes('overflow')).toBe('visible')
    expect(wrapper.findAll('.loading-animation__motion')).toHaveLength(2)
    const paths = wrapper.findAll('path')
    expect(paths[0].attributes('d')).toBe('M116 207.5H142V389.5H323V415H116Z')
    expect(paths[1].attributes('d')).toBe('M190.5 98H397V306H372V124H190.5Z')
    expect(wrapper.find('.loading-animation__motion--bl').attributes('transform')).toBeUndefined()
    expect(wrapper.find('.loading-animation__word').exists()).toBe(false)
  })

  it('renders wordmark variant from the logo SVG paths', () => {
    const wrapper = mount(LoadingAnimation, {
      props: { variant: 'wordmark', fullscreen: false, size: 'sm' },
    })
    expect(wrapper.get('.loading-animation').classes()).toContain('loading-animation--variant-wordmark')
    const svg = wrapper.get('svg')
    expect(svg.attributes('viewBox')).toBe('0 0 1024 1024')
    expect(svg.attributes('overflow')).toBe('visible')
    expect(wrapper.find('image').exists()).toBe(false)
    expect(wrapper.find('.loading-animation__wordmark-image').findAll('path').length).toBe(8)
    expect(wrapper.find('.loading-animation__motion--bl-wordmark path').attributes('transform')).toBe('translate(194,405)')
    expect(wrapper.find('.loading-animation__motion--tr-wordmark path').attributes('transform')).toBe('translate(634,315)')
  })
})