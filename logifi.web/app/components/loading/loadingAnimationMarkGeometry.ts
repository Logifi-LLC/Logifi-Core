/** Favicon tight crop 186×209 → viewBox 186×210. Vertex math for propeller merge. */
export const MARK_VIEWBOX = { width: 186, height: 210 } as const

export const MARK_BL_PIVOT = { x: 39, y: 185 } as const
export const MARK_TR_PIVOT = { x: 161, y: 24 } as const
export const MARK_CENTER = { x: MARK_VIEWBOX.width / 2, y: MARK_VIEWBOX.height / 2 } as const

/** Inner-corner translate so both pivots meet at MARK_CENTER (merge +). */
export const MARK_MERGE_BL = {
  x: MARK_CENTER.x - MARK_BL_PIVOT.x,
  y: MARK_CENTER.y - MARK_BL_PIVOT.y,
} as const
export const MARK_MERGE_TR = {
  x: MARK_CENTER.x - MARK_TR_PIVOT.x,
  y: MARK_CENTER.y - MARK_TR_PIVOT.y,
} as const

/** Unified arm thickness so horizontal and vertical bars align at the + center. */
export const MARK_ARM = 10

/** Pivot-local rects (bottom-left / top-right inner vertices at 0,0). */
export const MARK_BL_RECTS_LOCAL = [
  { x: -MARK_BL_PIVOT.x, y: 73 - MARK_BL_PIVOT.y, w: MARK_BL_PIVOT.x, h: MARK_BL_PIVOT.y - 73 },
  { x: -MARK_BL_PIVOT.x, y: 0, w: 119, h: MARK_ARM },
] as const

export const MARK_TR_RECTS_LOCAL = [
  { x: 50 - MARK_TR_PIVOT.x, y: -MARK_ARM, w: MARK_TR_PIVOT.x - 50, h: MARK_ARM },
  { x: 0, y: 0, w: MARK_ARM, h: 113 },
] as const

/** @deprecated use MARK_BL_RECTS_LOCAL with pivot transform */
export const MARK_BL_RECTS = MARK_BL_RECTS_LOCAL
export const MARK_TR_RECTS = MARK_TR_RECTS_LOCAL

/** Full-wordmark canvas (`public/images/logifi-logo.png` is the only raster wordmark). */
export const WORDMARK_CANVAS = { width: 400, height: 400 } as const

/** Bracket pivots traced from logifi-logo.png — no SVG/vector wordmark in repo. */
export const WORDMARK_LOCKUP_BL = { x: 40, y: 252 } as const
export const WORDMARK_LOCKUP_TR = { x: 330, y: 132 } as const

const ICON_STAGE_OFFSET = {
  x: (WORDMARK_CANVAS.width - MARK_VIEWBOX.width) / 2,
  y: (WORDMARK_CANVAS.height - MARK_VIEWBOX.height) / 2,
}

export const WORDMARK_ICON_BL = {
  x: ICON_STAGE_OFFSET.x + MARK_BL_PIVOT.x,
  y: ICON_STAGE_OFFSET.y + MARK_BL_PIVOT.y,
}
export const WORDMARK_ICON_TR = {
  x: ICON_STAGE_OFFSET.x + MARK_TR_PIVOT.x,
  y: ICON_STAGE_OFFSET.y + MARK_TR_PIVOT.y,
}

export const WORDMARK_BL_TO_ICON = {
  x: WORDMARK_ICON_BL.x - WORDMARK_LOCKUP_BL.x,
  y: WORDMARK_ICON_BL.y - WORDMARK_LOCKUP_BL.y,
}
export const WORDMARK_TR_TO_ICON = {
  x: WORDMARK_ICON_TR.x - WORDMARK_LOCKUP_TR.x,
  y: WORDMARK_ICON_TR.y - WORDMARK_LOCKUP_TR.y,
}