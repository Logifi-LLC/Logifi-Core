import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'
import handler from '../iap/verify.post'
import * as supabaseUtils from '../../../utils/supabase'
import * as supabaseServiceUtils from '../../../utils/supabaseService'
import * as creditsPaymentUtils from '../../../utils/creditsPayment'
import * as appleIapUtils from '../../../utils/appleIapVerification'

vi.mock('../../../utils/supabase')
vi.mock('../../../utils/supabaseService')
vi.mock('../../../utils/creditsPayment')
vi.mock('../../../utils/appleIapVerification')
vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    createError: (opts: { statusCode: number; statusMessage: string }) => {
      const error = new Error(opts.statusMessage) as Error & {
        statusCode: number
        statusMessage: string
      }
      error.statusCode = opts.statusCode
      error.statusMessage = opts.statusMessage
      return error
    },
  }
})

describe('POST /api/credits/iap/verify', () => {
  const mockUserId = 'user-123'
  const mockTransactionId = 'txn-abc123'
  const mockProductId = 'io.logifi.app.credits.25'
  const mockJwsRepresentation = 'eyJhbGciOiJFUzI1NiIsIng1YyI6WyJNSUlCb0RDQ0FVYWdBd0lCQWdJSVZnRE1NUFhYVkxJd0NnWUlLb1pJemowRUF3SXdUREVnTUI0R0ExVUVBd3dYVkdWemRDQkJjSEFnVTNSdmNtVWdRMEVnTFNCSE16RU1NQW9HQTFVRUN3d0RSRVZXTVJNd0VRWURWUVFLREFwQmNIQnNaU0JKYm1NdU1Rc3dDUVlEVlFRR0V3SlZVekFlRncweU5EQTVNVEEwTVRNNU16bGFGdzB5TlRBNU1URXdNRFF4TXpRNFdqQllNUTB3Q3dZRFZRUURFd1JUUTBwVE1TSXdJQVlEVlFRTERCa0FjbkJwWkNCQmNIQWdVMlZ5ZG1WeUlFRlFTU0JQUW5NRVFTQk1URVpEVzFFNFdqRXhNQThHQTFVRUN3d0lVbVZqWldsd2RERVBNQTBHQTFVRUN3d0dRMjl1YzNWdFpYSXhFVEFQQmdOVkJBb01DRUZrYldsdWFYTjBNUXN3Q1FZRFZRUUdFd0pWVXpCWk1CTUdCeXFHU000OUFnRUdDQ3FHU000OUF3RUhBMElBQkROV2R6QlFXemdpaEtqU2RSMTFRSi90VTNqdUlvcmhDL0NIcUYzcUxoQUJ4SzljVzMwRDl6MGJYbjRhMnZESlhMaEUrZmp0V0FWU1BPZUJ1QkhFS3dualp6QmlNQmdHQTFVZElBUVJNQTh3RFFZTEtvWklodmRqWkFVQkJ6QXNCZ05WSFNVRUpUQWpNQVlHQkZVZEpRQXdCd1lGSzRFRUFnRXdFQVlJS3dZQkJRVUhBd0VHQkNzR0FRUURNQWtHQTFVZEV3UUNNQUF3RGdZRFZSMFBBUUgvQkFRREFnQ2lNQm9HQTFVZEVRUVRNQkdnRHdZS0tvWklodmRqWkFRREFvRUJCREF3Q2dZSUtvWklqMEVBd0lEU0FBd1JRSWhBTFR0c21QVitLdGJwdnRNM0JGS01lWlc3b3pBb3NlR29ZUnNxVkt3WjRlR0FpQWpuQVhzS3ZVRXR6TkFVZjBER0hvRUhvSFV1eGVrY09POVgyMDBEc1hXWnc9PSIsIk1JSUNERENDQWJLZ0F3SUJBZ0lJR05aY0lkVXVZSzR3Q2dZSUtvWklqMEVBd013VHpFak1DRUdBMVVFQXd3YVZHVnpkQ0JCY0hBZ1UzUnZjbVVnVW05dmRDQkRRU0F0SUVjek1Rd3dDZ1lEVlFRTERBTkVSVll4RXpBUkJnTlZCQW9NQ2tGd2NHeGxJRWx1WXk0eEN6QUpCZ05WQkFZVEFsVlRNQjRYRFRJME1Ea3dPVEV5TVRBek1sb1hEVE0wTURrd09URXlNVGN3TWxvd1RERWdNQjRHQTFVRUF3d1hWR1Z6ZENCQmNIQWdVM1J2Y21VZ1EwRWdMU0JITXpFTU1Bb0dBMVVFQ3d3RFJFVldNUk13RVFZRFZRUUtEQXBCY0hCc1pTQkpibU11TVFzd0NRWURWUVFHRXdKVlV6QlpNQk1HQnlxR1NNNDlBZ0VHQ0NxR1NNNDlBd0VIQTBJQUJNbVRnbGRIUU9nSllzbkdSbllTRGxXZjNmNUdaZUh0d0x0Y0VGYVBsZFdzcGxZcURYSE5YeDByMFU1US95YTRTSHg0NWxTTXFjSzQyNVhLREJyaDJ3WmlqWnpCbE1COEdBMVVkSXdRWU1CYUFGTWtlbWxzRHJVdG9DM1RhWlZLYklMU3RWYW9tTUIwR0ExVWREZ1FXQkJTR3Z3RVBHUE16YzJZQlpudWw4V2hFV0lvOEdUQVBCZ05WSFJNQkFmOEVCVEFEQVFIL01BNEdBMVVkRHdFQi93UUVBd0lCQmpBS0JnZ3Foa2pPUFFRREF3TklBREJGQWlCbW16elJiQ254ZFNZNHR6NnhxYUZObUlSOWRLWk1HNUpnb2JsQWhLM0pwQUloQUtRdVhPU2VQMWhLdUJTYjZicVlZTWdKU25PWVd6Sk1LM1JsNTRFOVAxV1giLCJNSUlDUkRDQ0FjdWdBd0lCQWdJSUQrVlpyV0VEaWFvd0NnWUlLb1pJemowRUF3TXdVekVwTUNjR0ExVUVBd3dnVkdWemRDQkJjSEFnVTNSdmNtVWdVbTl2ZENCRFFTQXRJRWN6SURVeEREQUtCZ05WQkFzTUEwUkZWakVUTUJFR0ExVUVDZ3dLUVhCd2JHVWdTVzVqTGpFTE1Ba0dBMVVFQmhNQ1ZWTXdIaGNOTWpRd09UQTNNRGs1T0RJM1doY05NelF3T1RBNU1ERXdNRGd3V2pCUE1TTXdJUVlEVlFRRERCcFVaWE4wSUVGd2NDQlRkRzl5WlNCU2IyOTBJRU5CSUMwZ1J6TXhEREFLQmdOVkJBc01BMFJGVmpFVE1CRUdBMVVFQ2d3S1FYQndiR1VnU1c1akxqRUxNQWtHQTFVRUJoTUNWVk13ZGpBUUJnY3Foa2pPUFFJQkJnVXJnUVFBSWdOaUFBUThhMGVZTnd6VUxabXd5bnFNRFNlbVJVMDhSODFZUVErRnRXMjZwM0JRMkFvcVlzNEp1cUxlU0FGQzl2QzIvajAwTEx4WHBqVEhVbUpGSFl4R2xuUzZLbzdDK08vQ3JaWnpnVjZqdzZiMWhURTlKOTFCZUU2NEhKZFNJU1JpeFByNldpalp6Qmxqem1NQjhnTkJnY3Foa2lHOTJOa0FnRURJbW93YURBZUJna3Foa2lHOTJOa0FRRUVFVlJsYzNRZ1NIWnVMeUJGUTBOdk1CSUdDU3FHU0liM1kyUUNCUVFGQ3dNRUFnRUFNQjBHQTFVZERnUVdCQlRKSHBwYkE2MUxhQXQwMm1WU215QzByVldxSmpBUEJnTlZIUk1CQWY4RUJUQURBUUgvTUE0R0ExVWREd0VCL3dRRUF3SUJCakFLQmdncWhrak9QUVFEQXdOb0FEQmxBakVBb1dsRU5JblYrNmxUTmVGWUpGMWJ0VWg3Z0RaNFR1ZEpmL0QwZnQ4bDNGRml1T1IzZ0cwUmIwN1lTeW5xV1ZYWkFqQURyVnhxZXlLVjlJQUEwYXk5ZmZqQ3JLTHgrZHRhUG1MenBKT1B0YkVleEpxQVhtTVhnT05Gbi9nYVhVWW9oQnB3PSIsIk1JSUM1akNDQWNhZ0F3SUJBZ0lJUnJ4WlBVWVBlSkF3RFFZSktvWklodmNOQVFFTkJRQXdaekViTUJrR0ExVUVBd3dTUVhCd2JHVWdVbTl2ZENCRFFTQXRJRWN6TVNZd0pBWURWUVFMREIxQmNIQnNaU0JEWlhKMGFXWnBZMkYwYVc5dUlFRjFkR2h2Y21sMGVURVRNQkVHQTFVRUNnd0tRWEJ3YkdVZ1NXNWpMakVMTUFrR0ExVUVCaE1DVlZNd0hoY05NVFF3TkRNd01UZ3hPVEEyV2hjTk16a3dORE13TVRneE9UQTJXakJUTVNrd0p3WURWUVFERENCVVpYTjBJRUZ3Y0NCVGRHOXlaU0JTYjI5MElFTkJJQzBnUnpNZ05URU1NQW9HQTFVRUN3d0RSRVZXTVJNd0VRWURWUVFLREFwQmNIQnNaU0JKYm1NdU1Rc3dDUVlEVlFRR0V3SlZVekIyTUJBR0J5cUdTTTQ5QWdFR0JTdUJCQUFpQTJJQUJDWU9QTnN2RitjWTVLWDBrSUdqajY1aFdZUGI4THhLUnEzcDRLdTdBNnFDUG40bWR0YzBPMzRyamZVVXVXR2hBQ0xxc2FpelQybUN3Y2ltTmVjUDZxS0xUK1J0b3RBejdYVDNkTHdpam1lbVpqY2prcU9XQitqZlk1S2hOWkJjdXZhZmFNKzV6aTBjalp6Qmxqem1NQjhnTkJnY3Foa2lHOTJOa0FnRURJbW93YURBY0JnZ3Foa2lHOTJOa0FRRUVFRXhrY0hnaVF6RXdVVEExTkVjd0dnWUlLb1pJaHZkalpBUUVCQWd3T1lXTnBiRFVRQmxsQkpsa3dFZ1lJS29aSWh2ZGpaQVFVRUJBZ0VBTUIwR0ExVWREZ1FXQkJUTEh3R2swODJ1Szh6L3F2UEJYRnYxdTRDNVp6QVBCZ05WSFJNQkFmOEVCVEFEQVFIL01BNEdBMVVkRHdFQi93UUVBd0lCQmpBTkJna3Foa2lHOXcwQkFRMEZBQU9DQVFFQVdZeVdkNVZpY09RQmdGNEZlMWxwdFlCUlp6aDRtYmUxRGRYS2pQQWk1VmR0Zk5jYldibkFJdUM5VHQwRGIvWUk3Vnl2L3cxTW1WZXRUbEdsdFU0VFhmVXJWSGxyRGlBN0paMmdDRFhYOU1iVXZRMFJxT3gxZG5kVzhyeUd6S0p1OEx5WmhYb1owWGV4MFVJZERTdHkvV0UyREdHTUl4d240cUZ3NFVwZmhmNXlPajJ1aDhRSDJrb0pPblQySzVqK0p2TU9qdWpncHBHT2gya1NoT0ZRRTJMYUljY0tJVlBPTnkyMWMwZTJhdGxkYlVyT0paVytnR0tFYlRsbHFxK2NiUDBFTDVtVGNhOG1TZmpOZXEyUU5QM2FYL1hLZmhBc0JzREMwdWNLN05lNXc2R1BBeC9TbWo2RnhGL2VVL1k2aGd5bUtibFlJT0dYQW1oNTd5N3RKOUFBPT0iXX0.eyJ0cmFuc2FjdGlvbklkIjoidHhuLWFiYzEyMyIsInByb2R1Y3RJZCI6ImlvLmxvZ2lmaS5hcHAuY3JlZGl0cy4yNSIsImJ1bmRsZUlkIjoiaW8ubG9naWZpLmFwcCJ9.signature'

  let mockEvent: Partial<H3Event>

  beforeEach(() => {
    vi.clearAllMocks()

    mockEvent = {
      node: {
        req: {
          headers: {
            'content-type': 'application/json',
          },
        },
        res: {},
      },
    } as Partial<H3Event>

    vi.mocked(supabaseUtils.getUserIdFromEvent).mockResolvedValue(mockUserId)
    vi.mocked(supabaseServiceUtils.getSupabaseServiceClient).mockReturnValue({} as any)
    vi.mocked(appleIapUtils.isAppleIapConfigured).mockReturnValue(true)
  })

  it('should verify Apple transaction and grant credits', async () => {
    const mockVerifiedPayload = {
      transactionId: mockTransactionId,
      productId: mockProductId,
      bundleId: 'io.logifi.app',
      originalTransactionId: mockTransactionId,
      purchaseDate: Date.now(),
      quantity: 1,
    }

    vi.mocked(appleIapUtils.verifyTransaction).mockResolvedValue(mockVerifiedPayload as any)
    vi.mocked(creditsPaymentUtils.grantCreditsIdempotent).mockResolvedValue({
      credits: 100,
      granted: true,
    })

    const body = {
      productId: mockProductId,
      transactionId: mockTransactionId,
      jwsRepresentation: mockJwsRepresentation,
    }

    vi.mocked(global as any).readBody = vi.fn().mockResolvedValue(body)

    const result = await handler(mockEvent as H3Event)

    expect(appleIapUtils.verifyTransaction).toHaveBeenCalledWith(mockJwsRepresentation)
    expect(creditsPaymentUtils.grantCreditsIdempotent).toHaveBeenCalledWith(
      expect.anything(),
      mockUserId,
      25,
      {
        referenceId: `apple:${mockTransactionId}`,
        paymentMethod: 'apple_iap',
        description: 'Purchased 25 credits (Apple IAP)',
      }
    )
    expect(result).toEqual({
      ok: true,
      credits: 100,
      granted: true,
    })
  })

  it('should reject if user is not authenticated', async () => {
    vi.mocked(supabaseUtils.getUserIdFromEvent).mockResolvedValue(null)

    await expect(handler(mockEvent as H3Event)).rejects.toThrow('Unauthorized')
  })

  it('should reject if Apple IAP is not configured', async () => {
    vi.mocked(appleIapUtils.isAppleIapConfigured).mockReturnValue(false)

    await expect(handler(mockEvent as H3Event)).rejects.toThrow(
      'Apple IAP verification is not configured'
    )
  })

  it('should reject if product ID is missing', async () => {
    vi.mocked(global as any).readBody = vi.fn().mockResolvedValue({
      transactionId: mockTransactionId,
      jwsRepresentation: mockJwsRepresentation,
    })

    await expect(handler(mockEvent as H3Event)).rejects.toThrow('productId is required')
  })

  it('should reject if transaction ID is missing', async () => {
    vi.mocked(global as any).readBody = vi.fn().mockResolvedValue({
      productId: mockProductId,
      jwsRepresentation: mockJwsRepresentation,
    })

    await expect(handler(mockEvent as H3Event)).rejects.toThrow('transactionId is required')
  })

  it('should reject if JWS representation is missing', async () => {
    vi.mocked(global as any).readBody = vi.fn().mockResolvedValue({
      productId: mockProductId,
      transactionId: mockTransactionId,
    })

    await expect(handler(mockEvent as H3Event)).rejects.toThrow(
      'jwsRepresentation is required for StoreKit 2 verification'
    )
  })

  it('should reject if product is not in catalog', async () => {
    vi.mocked(global as any).readBody = vi.fn().mockResolvedValue({
      productId: 'io.logifi.app.credits.999',
      transactionId: mockTransactionId,
      jwsRepresentation: mockJwsRepresentation,
    })

    await expect(handler(mockEvent as H3Event)).rejects.toThrow('Unknown product')
  })

  it('should reject if Apple verification fails', async () => {
    vi.mocked(appleIapUtils.verifyTransaction).mockRejectedValue(
      new Error('Invalid signature')
    )

    vi.mocked(global as any).readBody = vi.fn().mockResolvedValue({
      productId: mockProductId,
      transactionId: mockTransactionId,
      jwsRepresentation: mockJwsRepresentation,
    })

    await expect(handler(mockEvent as H3Event)).rejects.toThrow('Invalid signature')
  })

  it('should reject if product ID mismatch', async () => {
    const mockVerifiedPayload = {
      transactionId: mockTransactionId,
      productId: 'io.logifi.app.credits.50',
      bundleId: 'io.logifi.app',
      originalTransactionId: mockTransactionId,
    }

    vi.mocked(appleIapUtils.verifyTransaction).mockResolvedValue(mockVerifiedPayload as any)

    vi.mocked(global as any).readBody = vi.fn().mockResolvedValue({
      productId: mockProductId,
      transactionId: mockTransactionId,
      jwsRepresentation: mockJwsRepresentation,
    })

    await expect(handler(mockEvent as H3Event)).rejects.toThrow('Product ID mismatch')
  })

  it('should reject if transaction ID mismatch', async () => {
    const mockVerifiedPayload = {
      transactionId: 'different-txn-id',
      productId: mockProductId,
      bundleId: 'io.logifi.app',
      originalTransactionId: 'different-txn-id',
    }

    vi.mocked(appleIapUtils.verifyTransaction).mockResolvedValue(mockVerifiedPayload as any)

    vi.mocked(global as any).readBody = vi.fn().mockResolvedValue({
      productId: mockProductId,
      transactionId: mockTransactionId,
      jwsRepresentation: mockJwsRepresentation,
    })

    await expect(handler(mockEvent as H3Event)).rejects.toThrow('Transaction ID mismatch')
  })

  it('should handle idempotent credits grant', async () => {
    const mockVerifiedPayload = {
      transactionId: mockTransactionId,
      productId: mockProductId,
      bundleId: 'io.logifi.app',
      originalTransactionId: mockTransactionId,
    }

    vi.mocked(appleIapUtils.verifyTransaction).mockResolvedValue(mockVerifiedPayload as any)
    vi.mocked(creditsPaymentUtils.grantCreditsIdempotent).mockResolvedValue({
      credits: 75,
      granted: false, // Already granted
    })

    vi.mocked(global as any).readBody = vi.fn().mockResolvedValue({
      productId: mockProductId,
      transactionId: mockTransactionId,
      jwsRepresentation: mockJwsRepresentation,
    })

    const result = await handler(mockEvent as H3Event)

    expect(result).toEqual({
      ok: true,
      credits: 75,
      granted: false,
    })
  })
})
