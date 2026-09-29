/** Server verify success: credits were added on this request. */
export type IapVerifyOutcome = 'credited' | 'already_granted'

export interface IapPurchaseSuccessBody {
  ok: true
  credits: number
  granted: boolean
  outcome?: IapVerifyOutcome
}

export interface NormalizedIapPurchaseResult {
  ok: true
  credits: number
  granted: boolean
  outcome: IapVerifyOutcome
}

export const IAP_ALREADY_GRANTED_MESSAGE =
  "You're all set. This purchase is already on your account."

const USER_CANCELLED_MARKERS = [
  'user cancelled',
  'user canceled',
  'payment was cancelled',
  'payment was canceled',
  'payment cancelled',
  'payment canceled',
  'err_canceled',
  'user_cancelled',
] as const

/** Loose server/native hints when no structured outcome is present (last resort). */
const ALREADY_GRANTED_MESSAGE_MARKERS = [
  'already processed',
  'already credited',
  'already granted',
  'already on your account',
  'duplicate transaction',
  'already finished',
  'already own',
] as const

export class IapPurchaseCancelledError extends Error {
  readonly cancelled = true

  constructor() {
    super('Purchase cancelled')
    this.name = 'IapPurchaseCancelledError'
  }
}

function messageFromUnknown(err: unknown): string {
  const data = (err as { data?: { statusMessage?: string; code?: string } })?.data
  if (data?.statusMessage) return data.statusMessage
  if (err instanceof Error) return err.message
  return String(err ?? '')
}

function structuredCodeFromError(err: unknown): string | undefined {
  const data = (err as { data?: { code?: string } })?.data
  return data?.code
}

export function normalizeIapVerifyResponse(body: IapPurchaseSuccessBody): NormalizedIapPurchaseResult {
  const outcome: IapVerifyOutcome =
    body.outcome ?? (body.granted ? 'credited' : 'already_granted')
  return {
    ok: true,
    credits: body.credits,
    granted: body.granted,
    outcome,
  }
}

export function isIapUserCancelled(err: unknown): boolean {
  if (err instanceof IapPurchaseCancelledError) return true
  const code = structuredCodeFromError(err)?.toLowerCase()
  if (code === 'user_cancelled' || code === 'purchase_cancelled') return true
  const message = messageFromUnknown(err).toLowerCase()
  return USER_CANCELLED_MARKERS.some((marker) => message.includes(marker))
}

export function isIapAlreadyGrantedError(err: unknown): boolean {
  const code = structuredCodeFromError(err)?.toLowerCase()
  if (code === 'already_granted') return true
  const message = messageFromUnknown(err).toLowerCase()
  return ALREADY_GRANTED_MESSAGE_MARKERS.some((marker) => message.includes(marker))
}

export type IapPurchaseFailureKind = 'cancelled' | 'already_granted' | 'error'

export function classifyIapPurchaseFailure(err: unknown): IapPurchaseFailureKind {
  if (isIapUserCancelled(err)) return 'cancelled'
  if (isIapAlreadyGrantedError(err)) return 'already_granted'
  return 'error'
}
