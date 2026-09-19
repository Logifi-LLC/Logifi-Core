import { describe, expect, it } from 'vitest'
import {
  focusedColumnIndexFromScroll,
  isDigifiMobileReviewEnabled,
  layoutFromPageShape,
  markColumnReviewed,
  resolveDigifiAppRoute,
  scanSideForPageShape,
} from '../../app/utils/digifiMobileReview'

describe('isDigifiMobileReviewEnabled', () => {
  it('defaults on and treats off/false/0 as disabled', () => {
    expect(isDigifiMobileReviewEnabled('on')).toBe(true)
    expect(isDigifiMobileReviewEnabled('')).toBe(true)
    expect(isDigifiMobileReviewEnabled('off')).toBe(false)
    expect(isDigifiMobileReviewEnabled('false')).toBe(false)
    expect(isDigifiMobileReviewEnabled('0')).toBe(false)
  })
})

describe('resolveDigifiAppRoute', () => {
  it('keeps web Digifi on the builder or marketing page', () => {
    expect(resolveDigifiAppRoute({ isIos: false })).toBe('/logbook-builder?digifi=open')
    expect(resolveDigifiAppRoute({ isIos: false, webPath: 'marketing' })).toBe('/digifi')
  })

  it('routes iOS to mobile scan when enabled and Eye when disabled', () => {
    expect(resolveDigifiAppRoute({ isIos: true, mobileReviewEnabled: true })).toBe('/digifi-scan')
    expect(resolveDigifiAppRoute({ isIos: true, mobileReviewEnabled: false })).toBe('/digifi-eye')
  })
})

describe('page shape helpers', () => {
  it('maps two-page shape onto builder layout and scan side', () => {
    expect(layoutFromPageShape('two-page')).toBe('two-page')
    expect(layoutFromPageShape('left')).toBe('single')
    expect(scanSideForPageShape('left', false)).toBe('left')
    expect(scanSideForPageShape('right', false)).toBe('right')
    expect(scanSideForPageShape('two-page', false)).toBe('left')
    expect(scanSideForPageShape('two-page', true)).toBe('right')
  })
})

describe('carousel review helpers', () => {
  it('snaps the focused column from scroll position', () => {
    expect(focusedColumnIndexFromScroll(0, 200, 4)).toBe(0)
    expect(focusedColumnIndexFromScroll(210, 200, 4)).toBe(1)
    expect(focusedColumnIndexFromScroll(800, 200, 4)).toBe(3)
    expect(focusedColumnIndexFromScroll(0, 0, 4)).toBe(0)
  })

  it('marks a swiped column reviewed without requiring an edit', () => {
    const reviewed = markColumnReviewed(new Set(), 'date')
    expect(reviewed.has('date')).toBe(true)
    expect(markColumnReviewed(reviewed, 'pic').has('pic')).toBe(true)
  })
})
