/**
 * Apple App Store receipt verification using official App Store Server Library.
 * Verifies JWS transactions from StoreKit 2.
 * 
 * Uses dynamic imports to avoid bundling Apple's library during prerender.
 */

// Dynamic import types
type SignedDataVerifier = any
type Environment = any
type JWSTransactionDecodedPayload = any

let verifier: SignedDataVerifier | null = null
let appleLibrary: any = null

async function loadAppleLibrary() {
  if (appleLibrary) return appleLibrary
  appleLibrary = await import('@apple/app-store-server-library')
  return appleLibrary
}

function getAppleRootCAs(): Buffer[] {
  // Apple Root CA certificates (G3 and Inc Root)
  // These are the latest root certificates from https://www.apple.com/certificateauthority/
  const appleRootCAG3 = Buffer.from(
    `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf
TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517
IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr
MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA
MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4
at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM
6BgD56KyKA==
-----END CERTIFICATE-----`,
    'utf8'
  )

  const appleIncRootCertificate = Buffer.from(
    `-----BEGIN CERTIFICATE-----
MIIEuzCCA6OgAwIBAgIBAjANBgkqhkiG9w0BAQUFADBiMQswCQYDVQQGEwJVUzET
MBEGA1UEChMKQXBwbGUgSW5jLjEmMCQGA1UECxMdQXBwbGUgQ2VydGlmaWNhdGlv
biBBdXRob3JpdHkxFjAUBgNVBAMTDUFwcGxlIFJvb3QgQ0EwHhcNMDYwNDI1MjE0
MDM2WhcNMzUwMjA5MjE0MDM2WjBiMQswCQYDVQQGEwJVUzETMBEGA1UEChMKQXBw
bGUgSW5jLjEmMCQGA1UECxMdQXBwbGUgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkx
FjAUBgNVBAMTDUFwcGxlIFJvb3QgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAw
ggEKAoIBAQDkkakJH5HbHkdQ6wXtXnmELes2oldMVeyLGYne+Uts9QerIjAC6Bg+
+FAJ039BqJj50cpmnCRrEdCju+QbKsMflZ56DKRHi1vUFjczy8QPTc4UadHJGXL1
XQ7Vf1+b8iUDulWPTV0N8WQ1IxVLFVkds5T39pyez1C6wVhQZ48ItCD3y6wsIG9w
tj8BMIy3Q88PnT3zK0koGsj+zrW5DtleHNbLPbU6rfQPDgCSC7EhFi501TwN22IW
q6NxkkdTVcGvL0Gz+PvjcM3mo0xFfh9Ma1CWQYnEdGILEINBhzOKgbEwWOxaBDKM
aLOPHd5lc/9nXmW8Sdh2nzMUZaF3lMktAgMBAAGjggF6MIIBdjAOBgNVHQ8BAf8E
BAMCAQYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUK9BpR5R2Cf70a40uQKb3
R01/CF4wHwYDVR0jBBgwFoAUK9BpR5R2Cf70a40uQKb3R01/CF4wggERBgNVHSAE
ggEIMIIBBDCCAQAGCSqGSIb3Y2QFATCB8jAqBggrBgEFBQcCARYeaHR0cHM6Ly93
d3cuYXBwbGUuY29tL2FwcGxlY2EvMIHDBggrBgEFBQcCAjCBthqBs1JlbGlhbmNl
IG9uIHRoaXMgY2VydGlmaWNhdGUgYnkgYW55IHBhcnR5IGFzc3VtZXMgYWNjZXB0
YW5jZSBvZiB0aGUgdGhlbiBhcHBsaWNhYmxlIHN0YW5kYXJkIHRlcm1zIGFuZCBj
b25kaXRpb25zIG9mIHVzZSwgY2VydGlmaWNhdGUgcG9saWN5IGFuZCBjZXJ0aWZp
Y2F0aW9uIHByYWN0aWNlIHN0YXRlbWVudHMuMA0GCSqGSIb3DQEBBQUAA4IBAQBc
NplMLXi37Yyb3PN3m/J20ncwT8EfhYOFG5k9RzfyqZtAjizUsZAS2L70c5vu0mQP
y3lPNNiiPvl4/2vIB+x9OYOLUyDTOMSxv5pPCmv/K/xZpwUJfBdAVhEedNO3iyM7
R6PVbyTi69G3cN8PReEnyvFteO3ntRcXqNx+IjXKJdXZD9Zr1KIkIxH3oayPc4Fg
xhtbCS+SsvhESPBgOJ4V9T0mZyCKM2r3DYLP3uujL/lTaltkwGMzd/c6ByxW69oP
IQ7aunMZT7XZNn/Bh1XZp5m5MkL72NVxnn6hUrcbvZNCJBIqxw8dtk2cXmPIS4AX
UKqK1drk/NAJBzewdXUh
-----END CERTIFICATE-----`,
    'utf8'
  )

  return [appleRootCAG3, appleIncRootCertificate]
}

async function getEnvironment(): Promise<Environment> {
  const lib = await loadAppleLibrary()
  const env = process.env.APPLE_IAP_ENVIRONMENT
  if (env === 'production') {
    return lib.Environment.PRODUCTION
  }
  return lib.Environment.SANDBOX
}

function getBundleId(): string {
  const bundleId = process.env.APPLE_BUNDLE_ID ?? 'io.logifi.app'
  return bundleId
}

async function getAppAppleId(): Promise<number | undefined> {
  const lib = await loadAppleLibrary()
  const env = await getEnvironment()
  if (env === lib.Environment.PRODUCTION) {
    const appAppleId = process.env.APPLE_APP_ID
    if (!appAppleId) {
      throw new Error('APPLE_APP_ID environment variable is required for production environment')
    }
    return Number(appAppleId)
  }
  return undefined
}

async function initializeVerifier(): Promise<SignedDataVerifier> {
  const lib = await loadAppleLibrary()
  const appleRootCAs = getAppleRootCAs()
  const enableOnlineChecks = true
  const environment = await getEnvironment()
  const bundleId = getBundleId()
  const appAppleId = await getAppAppleId()

  return new lib.SignedDataVerifier(
    appleRootCAs,
    enableOnlineChecks,
    environment,
    bundleId,
    appAppleId
  )
}

export async function getVerifier(): Promise<SignedDataVerifier> {
  if (!verifier) {
    verifier = await initializeVerifier()
  }
  return verifier
}

/**
 * Verify a JWS transaction from StoreKit 2
 */
export async function verifyTransaction(
  jwsRepresentation: string
): Promise<JWSTransactionDecodedPayload> {
  const verifier = await getVerifier()

  try {
    const payload = await verifier.verifyAndDecodeTransaction(jwsRepresentation)

    // Extra sanity checks
    const bundleId = getBundleId()
    if (payload.bundleId !== bundleId) {
      throw new Error(`Bundle ID mismatch: expected ${bundleId}, got ${payload.bundleId}`)
    }

    if (!payload.transactionId || !payload.originalTransactionId) {
      throw new Error('Missing transaction IDs in payload')
    }

    // Check if the transaction was refunded
    if (payload.revocationDate) {
      throw new Error(`Transaction was refunded at ${new Date(payload.revocationDate).toISOString()}`)
    }

    return payload
  } catch (err: unknown) {
    console.error('[apple-iap] Transaction verification failed:', err)
    throw err
  }
}

/**
 * Check if Apple IAP verification is configured
 */
export async function isAppleIapConfigured(): Promise<boolean> {
  try {
    await getVerifier()
    return true
  } catch {
    return false
  }
}
