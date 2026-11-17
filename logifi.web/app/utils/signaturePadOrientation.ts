/** screen.orientation.angle (0|90|180|270) or legacy window.orientation; 0 when unavailable. */
export function readScreenOrientationAngle(): number {
  if (typeof window === 'undefined') return 0
  const modern = window.screen?.orientation?.angle
  if (typeof modern === 'number' && Number.isFinite(modern)) {
    return ((modern % 360) + 360) % 360
  }
  const legacy = (window as Window & { orientation?: number }).orientation
  if (typeof legacy === 'number' && Number.isFinite(legacy)) {
    return ((legacy % 360) + 360) % 360
  }
  return 0
}

/** Most frequent sample while drawing; ties use the latest sample. */
export function dominantOrientationAngle(samples: number[]): number | undefined {
  if (!samples.length) return undefined
  const counts = new Map<number, number>()
  for (const angle of samples) {
    const normalized = ((angle % 360) + 360) % 360
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }
  let best = ((samples[samples.length - 1] % 360) + 360) % 360
  let bestCount = 0
  for (const [angle, count] of counts) {
    if (count > bestCount) {
      bestCount = count
      best = angle
    }
  }
  return best
}

/** Rotate stored bitmap back to portrait-up (0°) from device angle at signing time. */
export function orientationCorrectionDegrees(captureAngle: number): number {
  return (360 - (((captureAngle % 360) + 360) % 360)) % 360
}