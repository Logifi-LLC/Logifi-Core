import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import IosAppPageShell from '../../app/components/ios/IosAppPageShell.vue'

vi.mock('~/composables/useTheme', () => ({
  useTheme: () => ({ isDark: ref(false) }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}))

function mountShell(props?: Record<string, unknown>, slots?: { default?: string; footer?: string }) {
  return mount(IosAppPageShell, {
    props: { title: 'Digifi', ...props },
    slots,
    global: { stubs: { Icon: true } },
  })
}

describe('IosAppPageShell', () => {
  it('keeps document scroll for other screens', () => {
    const wrapper = mountShell({}, { footer: '<p>Import</p>' })
    const root = wrapper.get('div')
    expect(root.classes()).toContain('min-h-[100dvh]')
    expect(root.classes()).not.toContain('overflow-hidden')
    expect(wrapper.get('header').classes()).toContain('fixed')
    expect(wrapper.get('main').classes()).not.toContain('overflow-y-auto')
    expect(wrapper.get('main').classes()).toContain('pb-[calc(5.5rem+env(safe-area-inset-bottom))]')
    expect(wrapper.get('footer').classes()).toContain('fixed')
    expect(wrapper.get('footer').classes()).toContain('pb-[env(safe-area-inset-bottom)]')
  })

  it('scrolls only the main slot when contained', () => {
    const wrapper = mountShell(
      { scrollContained: true },
      { default: '<button type="button">Photograph left page</button>' }
    )
    const root = wrapper.get('div')
    expect(root.classes()).toContain('h-[100dvh]')
    expect(root.classes()).toContain('overflow-hidden')
    expect(root.classes()).toContain('overscroll-none')
    expect(wrapper.get('header').classes()).not.toContain('fixed')
    expect(wrapper.get('header').classes()).toContain('pt-[env(safe-area-inset-top)]')

    const main = wrapper.get('main')
    expect(main.classes()).toContain('overflow-y-auto')
    expect(main.classes()).toContain('overscroll-none')
    expect(main.classes()).toContain('pb-[calc(1rem+env(safe-area-inset-bottom))]')
    expect(main.classes()).not.toContain('pt-[calc(3rem+env(safe-area-inset-top))]')
    expect(main.text()).toContain('Photograph left page')
  })

  it('keeps a contained footer in the column with safe-area padding', () => {
    const wrapper = mountShell({ scrollContained: true }, { footer: '<p>Import</p>' })
    const footer = wrapper.get('footer')
    expect(footer.classes()).not.toContain('fixed')
    expect(footer.classes()).toContain('pb-[env(safe-area-inset-bottom)]')
    expect(wrapper.get('main').classes()).toContain('pb-4')
  })
})

describe('payload script css', () => {
  it('hides script and application/json payload nodes', () => {
    const css = readFileSync(resolve(__dirname, '../../app/assets/css/main.css'), 'utf8')
    expect(css).toMatch(/script,\s*#__NUXT_DATA__,\s*\[type='application\/json'\]\s*\{[^}]*display:\s*none\s*!important/)
    expect(css).toContain('html.digifi-scan-lock')
    expect(css).toContain('overscroll-behavior: none')
  })
})
