/** Favicon tight crop 186×209 → viewBox 186×210. Vertex math for propeller merge. */
export const MARK_VIEWBOX = { width: 186, height: 210 } as const

export const MARK_BL_PIVOT = { x: 39, y: 185 } as const
export const MARK_TR_PIVOT = { x: 161, y: 24 } as const
export const MARK_CENTER = { x: MARK_VIEWBOX.width / 2, y: MARK_VIEWBOX.height / 2 } as const

/** Unified arm thickness so horizontal and vertical bars align at the + center. */
export const MARK_ARM = 10

/**
 * Merge translates for a clean 10px + through MARK_CENTER.
 * BL foot is below its inner vertex; TR cap is above theirs. Shifting each
 * vertex by ±MARK_ARM/2 along y puts both 10px horizontals on the same band
 * (y = center ± 5) so the arms overlap instead of stacking with a jog.
 */
export const MARK_MERGE_BL = {
  x: MARK_CENTER.x - MARK_BL_PIVOT.x,
  y: MARK_CENTER.y - MARK_ARM / 2 - MARK_BL_PIVOT.y,
} as const
export const MARK_MERGE_TR = {
  x: MARK_CENTER.x - MARK_TR_PIVOT.x,
  y: MARK_CENTER.y + MARK_ARM / 2 - MARK_TR_PIVOT.y,
} as const

/** Pivot-local rects (bottom-left / top-right inner vertices at 0,0). */
export const MARK_BL_RECTS_LOCAL = [
  {
    x: -MARK_BL_PIVOT.x,
    y: 73 - MARK_BL_PIVOT.y,
    w: MARK_BL_PIVOT.x,
    h: MARK_BL_PIVOT.y - 73 + MARK_ARM,
  },
  { x: -MARK_BL_PIVOT.x, y: 0, w: 119, h: MARK_ARM },
] as const

export const MARK_TR_RECTS_LOCAL = [
  {
    x: 50 - MARK_TR_PIVOT.x,
    y: -MARK_ARM,
    w: MARK_TR_PIVOT.x - 50 + MARK_ARM,
    h: MARK_ARM,
  },
  { x: 0, y: 0, w: MARK_ARM, h: 113 },
] as const

/**
 * fill-box origin of the inner pivot (0,0) relative to the local rect bbox.
 * CSS scale/rotate on the inner motion group uses these so origin stays on the vertex.
 */
export const MARK_BL_ORIGIN = { x: MARK_BL_PIVOT.x, y: MARK_BL_PIVOT.y - 73 } as const
export const MARK_TR_ORIGIN = { x: MARK_TR_PIVOT.x - 50, y: MARK_ARM } as const

/** Full-wordmark canvas (`public/images/logifi-logo.png` is the only raster wordmark). */
export const WORDMARK_CANVAS = { width: 400, height: 400 } as const

/**
 * Bracket inner vertices traced from logifi-logo.png (1024² → 400 viewBox, ×400/1024).
 * No SVG/vector wordmark in repo.
 */
export const WORDMARK_LOCKUP_BL = { x: 85, y: 251 } as const
export const WORDMARK_LOCKUP_TR = { x: 316, y: 133 } as const

/**
 * Uniform-per-axis scale that maps icon-sized local rects onto the lockup L's
 * (lockup arm / icon arm), around the inner vertex.
 */
export const WORDMARK_LOCKUP_SCALE_BL = { x: 0.286, y: 0.827 } as const
export const WORDMARK_LOCKUP_SCALE_TR = { x: 0.697, y: 0.729 } as const

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
