import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LogbookCheckView from '../../app/components/logbook/LogbookCheckView.vue'
import type { AuditRuleGroup } from '../../app/utils/logbookAudit'

function mountView(groups: AuditRuleGroup[], hasEntries = true) {
  return mount(LogbookCheckView, {
    props: {
      isDarkMode: false,
      groups,
      errorCount: groups.reduce((sum, group) => sum + group.findings.filter((item) => item.severity === 'error').length, 0),
      checkCount: groups.reduce((sum, group) => sum + group.findings.filter((item) => item.severity === 'check').length, 0),
      loading: false,
      hasEntries,
    },
  })
}

describe('LogbookCheckView', () => {
  it('shows No issues found when the logbook is clean', () => {
    const wrapper = mountView([], true)
    expect(wrapper.get('[data-testid="logbook-check-empty"]').text()).toBe('No issues found')
  })

  it('groups findings by rule and emits open-entry', async () => {
    const wrapper = mountView([
      {
        ruleId: 'zero_total',
        title: 'Total time missing',
        severity: 'error',
        count: 1,
        findings: [
          {
            id: 'zero_total:abc',
            ruleId: 'zero_total',
            severity: 'error',
            entryId: 'abc',
            date: '2024-03-15',
            summary: 'Total is 0 on a flight with airports or times',
            field: 'total',
          },
        ],
      },
    ])

    expect(wrapper.get('[data-testid="logbook-check-group-zero_total"]').text()).toContain('Total time missing')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('open-entry')?.[0]).toEqual(['abc'])
  })
})
