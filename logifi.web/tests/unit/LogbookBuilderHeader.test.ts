import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import LogbookBuilderHeader from '../../app/components/logbook-builder/LogbookBuilderHeader.vue'
import { CATEGORY_CLASS_OPTIONS } from '../../app/utils/logbookBuilderTypes'
import type { BuilderColumn } from '../../app/utils/logbookBuilderTypes'

vi.mock('~/composables/useTheme', () => ({
  useTheme: () => ({ isDark: ref(false) }),
}))

const column: BuilderColumn = {
  id: 'col-1',
  fieldKey: 'date',
  label: 'Date',
  order: 0,
}

function installMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

async function openMenu(wrapper: VueWrapper) {
  await wrapper.get('button').trigger('click')
}

describe('LogbookBuilderHeader category/class menu', () => {
  const wrappers: VueWrapper[] = []

  afterEach(() => {
    for (const wrapper of wrappers) wrapper.unmount()
    wrappers.length = 0
    document.body.innerHTML = ''
  })

  function mountHeader() {
    const wrapper = mount(LogbookBuilderHeader, {
      props: { column: { ...column } },
      attachTo: document.body,
    })
    wrappers.push(wrapper)
    return wrapper
  }

  it('opens classes inline on a coarse pointer and keeps the parent menu open', async () => {
    installMatchMedia(true)
    const wrapper = mountHeader()
    await openMenu(wrapper)

    const row = wrapper.get('[data-testid="category-class-row"]')
    await row.trigger('pointerdown', { pointerType: 'touch' })
    await row.trigger('click')

    const inline = wrapper.get('[data-testid="category-inline"]')
    expect(inline.findAll('button').map((b) => b.text())).toEqual([...CATEGORY_CLASS_OPTIONS])
    expect(inline.element.closest('.overflow-y-auto')).toBeTruthy()
    expect(document.body.querySelector('[data-testid="category-flyout"]')).toBeNull()
    expect(row.get('span[aria-hidden="true"]').classes()).toContain('lb-cat-chevron-open')
    expect(wrapper.text()).toContain('Date')
    expect(wrapper.text()).toContain('Aircraft')

    await row.trigger('click')
    expect(wrapper.find('[data-testid="category-inline"]').exists()).toBe(false)
    expect(row.get('span[aria-hidden="true"]').classes()).not.toContain('lb-cat-chevron-open')
    expect(wrapper.text()).toContain('Remarks')
    expect(wrapper.emitted('update')).toBeUndefined()
  })

  it('adds the column when a class in the inline list is tapped', async () => {
    installMatchMedia(true)
    const wrapper = mountHeader()
    await openMenu(wrapper)

    const row = wrapper.get('[data-testid="category-class-row"]')
    await row.trigger('pointerdown', { pointerType: 'touch' })
    await row.trigger('click')
    const asel = wrapper
      .get('[data-testid="category-inline"]')
      .findAll('button')
      .find((b) => b.text() === 'ASEL')
    expect(asel).toBeTruthy()
    await asel!.trigger('click')

    expect(wrapper.emitted('update')?.[0]?.[1]).toEqual({
      fieldKey: 'categoryClass',
      label: 'ASEL',
      categoryClassValue: 'ASEL',
      columnKind: null,
    })
    expect(wrapper.find('[data-testid="category-inline"]').exists()).toBe(false)
  })

  it('uses the inline list for a touch pointer even when the primary pointer is fine', async () => {
    installMatchMedia(false)
    const wrapper = mountHeader()
    await openMenu(wrapper)

    const row = wrapper.get('[data-testid="category-class-trigger"]')
    await row.trigger('pointerenter', { pointerType: 'touch' })
    await row.trigger('pointerdown', { pointerType: 'touch' })
    await row.trigger('mouseenter')
    expect(document.body.querySelector('[data-testid="category-flyout"]')).toBeNull()

    await row.get('[data-testid="category-class-row"]').trigger('click')
    expect(wrapper.find('[data-testid="category-inline"]').exists()).toBe(true)
    expect(document.body.querySelector('[data-testid="category-flyout"]')).toBeNull()
  })

  it('keeps the desktop hover flyout and does not open the inline list for a mouse', async () => {
    installMatchMedia(false)
    const wrapper = mountHeader()
    await openMenu(wrapper)

    const row = wrapper.get('[data-testid="category-class-trigger"]')
    await row.trigger('pointerenter', { pointerType: 'mouse' })
    await row.trigger('mouseenter')

    const flyout = document.body.querySelector('[data-testid="category-flyout"]')
    expect(flyout).toBeTruthy()
    expect(flyout?.textContent).toContain('ASEL')
    expect(flyout?.textContent).toContain('HELI')
    expect(wrapper.find('[data-testid="category-inline"]').exists()).toBe(false)

    await row.trigger('pointerdown', { pointerType: 'mouse' })
    await row.get('[data-testid="category-class-row"]').trigger('click')
    expect(document.body.querySelector('[data-testid="category-flyout"]')).toBeNull()
    expect(wrapper.find('[data-testid="category-inline"]').exists()).toBe(false)

    await row.trigger('pointerenter', { pointerType: 'mouse' })
    const reopened = document.body.querySelector('[data-testid="category-flyout"]')
    expect(reopened).toBeTruthy()
    const amel = Array.from(reopened!.querySelectorAll('button')).find((b) => b.textContent === 'AMEL')
    amel?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update')?.[0]?.[1]).toEqual({
      fieldKey: 'categoryClass',
      label: 'AMEL',
      categoryClassValue: 'AMEL',
      columnKind: null,
    })
  })

  it('offers Day as a builder column with no stored field', async () => {
    installMatchMedia(false)
    const wrapper = mountHeader()
    await openMenu(wrapper)
    expect(wrapper.text()).toContain('Day')
    await wrapper.get('[data-testid="day-column-option"]').trigger('click')
    expect(wrapper.emitted('update')?.[0]?.[1]).toEqual({
      fieldKey: null,
      label: 'Day',
      categoryClassValue: undefined,
      columnKind: 'day',
    })
  })

  it('adds a custom column from a free-text title', async () => {
    installMatchMedia(false)
    const wrapper = mountHeader()
    await openMenu(wrapper)
    await wrapper.get('[data-testid="custom-column-title"]').setValue('Retractable Gear')
    await wrapper.get('[data-testid="custom-column-form"]').trigger('submit')
    expect(wrapper.emitted('update')?.[0]?.[1]).toEqual({
      fieldKey: null,
      label: 'Retractable Gear',
      categoryClassValue: undefined,
      columnKind: 'custom',
    })
  })
})
