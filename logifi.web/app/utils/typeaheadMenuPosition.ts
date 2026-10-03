/** About five option rows (py-2 + text-sm). Extra names scroll inside the menu. */
export const TYPEAHEAD_OPTION_HEIGHT = 36
export const TYPEAHEAD_VISIBLE_OPTIONS = 5
export const TYPEAHEAD_MENU_MAX_HEIGHT = TYPEAHEAD_OPTION_HEIGHT * TYPEAHEAD_VISIBLE_OPTIONS
/** Keep the menu inside a rounded clip edge. */
export const TYPEAHEAD_CLIP_GUTTER = 8

export type TypeaheadScrollInput = {
  anchorTop: number
  anchorBottom: number
  menuHeight: number
  viewportHeight: number
  safeTop?: number
  safeBottom?: number
}

/**
 * Pixels to scroll the page upward so a menu that hangs off the cell's bottom
 * edge stays inside the visual viewport. Never negative — the menu is not moved
 * above the cell.
 */
export function typeaheadScrollDelta(input: TypeaheadScrollInput): number {
  const safeTop = input.safeTop ?? 0
  const safeBottom = input.safeBottom ?? 0
  const bottomLimit = input.viewportHeight - safeBottom
  const menuBottom = input.anchorBottom + input.menuHeight
  let delta = menuBottom > bottomLimit ? menuBottom - bottomLimit : 0
  const nextTop = input.anchorTop - delta
  if (nextTop < safeTop) delta = Math.max(0, input.anchorTop - safeTop)
  return delta
}

/** Extra padding so a menu that hangs past a clipping box stays inside it. */
export function typeaheadClipPadding(
  anchorBottom: number,
  containerBottom: number,
  menuHeight: number,
  gutter = TYPEAHEAD_CLIP_GUTTER
): number {
  return Math.max(0, anchorBottom + menuHeight + gutter - containerBottom)
}

/** Extra padding when the scroller cannot move `delta` pixels. */
export function typeaheadScrollRoomShortfall(
  delta: number,
  scrollHeight: number,
  clientHeight: number,
  scrollTop: number
): number {
  if (delta <= 0) return 0
  const room = scrollHeight - clientHeight - scrollTop
  return Math.max(0, delta - room)
}

export type TypeaheadSafeArea = {
  top: number
  right: number
  bottom: number
  left: number
}

const ZERO_SAFE: TypeaheadSafeArea = { top: 0, right: 0, bottom: 0, left: 0 }

let cachedSafeArea: TypeaheadSafeArea | null = null

export function readSafeAreaInsets(): TypeaheadSafeArea {
  if (cachedSafeArea) return cachedSafeArea
  if (typeof document === 'undefined' || !document.body) return ZERO_SAFE
  const probe = document.createElement('div')
  probe.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'visibility:hidden',
    'pointer-events:none',
    'padding-top:env(safe-area-inset-top)',
    'padding-right:env(safe-area-inset-right)',
    'padding-bottom:env(safe-area-inset-bottom)',
    'padding-left:env(safe-area-inset-left)',
  ].join(';')
  document.body.appendChild(probe)
  const style = getComputedStyle(probe)
  const parse = (value: string) => {
    const n = Number.parseFloat(value)
    return Number.isFinite(n) ? n : 0
  }
  cachedSafeArea = {
    top: parse(style.paddingTop),
    right: parse(style.paddingRight),
    bottom: parse(style.paddingBottom),
    left: parse(style.paddingLeft),
  }
  probe.remove()
  return cachedSafeArea
}

/** Horizontal carousels set overflow-x only; CSS promotes overflow-y and would steal the scroll. */
function isHorizontalOnlyScroller(node: HTMLElement): boolean {
  const className = typeof node.className === 'string' ? node.className : ''
  const horizontal =
    /\boverflow-x-(auto|scroll)\b/.test(className) &&
    !/\boverflow-y-(auto|scroll)\b/.test(className) &&
    !/\boverflow-(auto|scroll)\b/.test(className)
  return horizontal
}

function verticalScroller(anchor: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = anchor.parentElement
  while (node) {
    if (!isHorizontalOnlyScroller(node)) {
      const style = getComputedStyle(node)
      const overflowY = style.overflowY
      if (
        (overflowY === 'auto' || overflowY === 'scroll') &&
        node.scrollHeight > node.clientHeight + 1
      ) {
        return node
      }
    }
    node = node.parentElement
  }
  return null
}

/** Fixed Review chrome that would cover the cell or the menu. */
function viewportChromeInsets(viewportHeight: number): { top: number; bottom: number } {
  const safe = readSafeAreaInsets()
  let top = Math.max(4, safe.top)
  let bottom = Math.max(4, safe.bottom)
  if (typeof document === 'undefined') return { top, bottom }

  const header = document.querySelector('header')
  if (header instanceof HTMLElement) {
    const style = getComputedStyle(header)
    if (style.position === 'fixed' || style.position === 'sticky') {
      const rect = header.getBoundingClientRect()
      if (rect.bottom > 0 && rect.top < viewportHeight) top = Math.max(top, rect.bottom)
    }
  }

  const footer = document.querySelector('footer')
  if (footer instanceof HTMLElement) {
    const style = getComputedStyle(footer)
    if (style.position === 'fixed' || style.position === 'sticky') {
      const rect = footer.getBoundingClientRect()
      if (rect.top < viewportHeight && rect.bottom > 0) {
        bottom = Math.max(bottom, viewportHeight - rect.top)
      }
    }
  }

  return { top, bottom }
}

function intendedMenuHeight(menu: HTMLElement): number {
  const content = Math.max(menu.scrollHeight, menu.getBoundingClientRect().height)
  if (content <= 0) return TYPEAHEAD_MENU_MAX_HEIGHT
  return Math.min(content, TYPEAHEAD_MENU_MAX_HEIGHT)
}

type PaddingRecord = { el: HTMLElement; previous: string }
const paddingRecords: PaddingRecord[] = []

function addBottomPadding(el: HTMLElement, extra: number) {
  if (extra <= 1) return
  let record = paddingRecords.find((item) => item.el === el)
  if (!record) {
    record = { el, previous: el.style.paddingBottom }
    paddingRecords.push(record)
    el.dataset.typeaheadPad = '1'
  }
  const base = el.style.paddingBottom
    ? Number.parseFloat(el.style.paddingBottom) || 0
    : Number.parseFloat(getComputedStyle(el).paddingBottom) || 0
  el.style.paddingBottom = `${base + extra}px`
}

/** Drop padding added so a menu could clear the card or the footer. */
export function releaseTypeaheadMenuSpace(): void {
  for (const { el, previous } of paddingRecords) {
    el.style.paddingBottom = previous
    delete el.dataset.typeaheadPad
  }
  paddingRecords.length = 0
}

/** The review card clips overflow. Grow it so the menu is painted, still under the cell. */
function expandClippingAncestors(anchor: HTMLElement, menuHeight: number) {
  let node: HTMLElement | null = anchor.parentElement
  while (node && node !== document.body && node !== document.documentElement) {
    const style = getComputedStyle(node)
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
      const extra = typeaheadClipPadding(
        anchor.getBoundingClientRect().bottom,
        node.getBoundingClientRect().bottom,
        menuHeight
      )
      addBottomPadding(node, extra)
    }
    node = node.parentElement
  }
}

function growScrollRoom(el: HTMLElement, delta: number) {
  const short = typeaheadScrollRoomShortfall(delta, el.scrollHeight, el.clientHeight, el.scrollTop)
  addBottomPadding(el, short)
}

/** Scroll so the open menu, still attached under the cell, clears the keyboard. */
export function scrollTypeaheadMenuIntoVisualViewport(
  anchor: HTMLElement,
  menu: HTMLElement
): void {
  const menuHeight = intendedMenuHeight(menu)
  expandClippingAncestors(anchor, menuHeight)
  const anchorRect = anchor.getBoundingClientRect()
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const chrome = viewportChromeInsets(height)
  const delta = typeaheadScrollDelta({
    anchorTop: anchorRect.top,
    anchorBottom: anchorRect.bottom,
    menuHeight,
    viewportHeight: height,
    safeTop: chrome.top,
    safeBottom: chrome.bottom,
  })
  if (delta <= 0) return
  const scroller = verticalScroller(anchor)
  if (scroller) {
    growScrollRoom(scroller, delta)
    scroller.scrollTop += delta
    return
  }
  const root = document.scrollingElement
  if (root instanceof HTMLElement) growScrollRoom(root, delta)
  window.scrollBy(0, delta)
}
