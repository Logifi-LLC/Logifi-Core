import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import LogbookExpandedSignedFooter from '../LogbookExpandedSignedFooter.vue'

const SIGNED_LINE =
  '11/16/2026  /s/ Alex Instructor  1234567CFI  Exp. 12/31/2027'

describe('LogbookExpandedSignedFooter (locked / view drawer signed block)', () => {
  it('renders the /s/ line and mounts ink <img> once inkUrl resolves', async () => {
    const wrapper = mount(LogbookExpandedSignedFooter, {
      props: {
        isSigned: true,
        blockText: SIGNED_LINE,
        inkUrl: null,
        showInkUnavailable: false,
        isDarkMode: false,
      },
      global: {
        stubs: {
          FlightDrawnSignatureImage: {
            template:
              '<img class="stub-ink" :src="src" alt="Instructor signature" />',
            props: ['src', 'isDarkMode', 'alt'],
          },
        },
      },
    })

    expect(wrapper.text()).toContain('/s/')
    expect(wrapper.text()).toContain('Alex Instructor')
    expect(wrapper.find('img.stub-ink').exists()).toBe(false)

    const ink =
      'https://example.test/storage/v1/object/sign/flight-signatures/fake-user/fake.png?token=fictional'
    await wrapper.setProps({ inkUrl: ink })

    const img = wrapper.find('img.stub-ink')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(ink)
  })

  it('shows unavailable copy when resolved without a URL', () => {
    const wrapper = mount(LogbookExpandedSignedFooter, {
      props: {
        isSigned: true,
        blockText: SIGNED_LINE,
        inkUrl: null,
        showInkUnavailable: true,
        isDarkMode: false,
      },
      global: { stubs: { FlightDrawnSignatureImage: true } },
    })

    expect(wrapper.text()).toContain('Signature image unavailable')
    expect(wrapper.find('img').exists()).toBe(false)
  })
})