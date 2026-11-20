import { describe, expect, it } from 'vitest'
import { computed } from 'vue'
import { mount } from '@vue/test-utils'
import LogbookEmptyState from '../LogbookEmptyState.vue'
import { canShowLogbookEmptyState } from '../../../utils/dashboardHydration'

function mountWhenEmptyStateVisible(show: boolean) {
  const showLogbookEmptyState = computed(() => show)
  const GateHost = {
    components: { LogbookEmptyState },
    setup() {
      return { showLogbookEmptyState }
    },
    template: `
      <LogbookEmptyState
        v-if="showLogbookEmptyState"
        :is-dark-mode="true"
        :is-simulator="false"
      />
    `,
  }
  return mount(GateHost, {
    global: { stubs: { Icon: true } },
  })
}

describe('LogbookEmptyState gate', () => {
  it('does not render while the dashboard considers the logbook still loading', () => {
    const gate = { localCacheReadComplete: false, inboundSyncPending: false }
    expect(canShowLogbookEmptyState(gate, false)).toBe(false)

    const wrapper = mountWhenEmptyStateVisible(false)
    expect(wrapper.find('[data-testid="logbook-empty-state"]').exists()).toBe(false)
  })

  it('renders once loaded with zero entries', () => {
    const gate = { localCacheReadComplete: true, inboundSyncPending: false }
    expect(canShowLogbookEmptyState(gate, false)).toBe(true)

    const wrapper = mountWhenEmptyStateVisible(true)
    expect(wrapper.find('[data-testid="logbook-empty-state"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Start your logbook')
  })
})