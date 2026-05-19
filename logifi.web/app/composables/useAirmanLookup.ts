export interface AirmanRegistryData {
  name: string
  certificates: string
  certificateLevels: string[]
  ratings: string[]
  typeRatings: string[]
  residentialAddress?: string
  residentialCity?: string
  residentialState?: string
  residentialZip?: string
  medicalClass?: string
  medicalDate?: string
  source: string
}

export interface AirmanRegistryCandidate {
  displayName: string
  eventTarget: string
}

type LookupSuccess = { success: true; data: AirmanRegistryData }
type LookupMultiple = {
  success: false
  code: 'MULTIPLE_MATCHES'
  message: string
  candidates: AirmanRegistryCandidate[]
}
type LookupError = { success: false; error: string }

export type AirmanLookupResponse = LookupSuccess | LookupMultiple | LookupError

export interface AirmanLookupParams {
  lastName: string
  certificateNumber: string
  firstName?: string
  eventTarget?: string
}

/**
 * Look up FAA airman certificate & rating data for pilot profile autofill.
 */
export const useAirmanLookup = () => {
  const lookupAirman = async (params: AirmanLookupParams): Promise<AirmanLookupResponse> => {
    const search = new URLSearchParams({
      lastName: params.lastName.trim(),
      certificateNumber: params.certificateNumber.trim(),
    })
    if (params.firstName?.trim()) search.set('firstName', params.firstName.trim())
    if (params.eventTarget) search.set('eventTarget', params.eventTarget)

    try {
      return await $fetch<AirmanLookupResponse>(`/api/lookup-airman?${search.toString()}`)
    } catch (error: unknown) {
      console.error('Airman lookup failed:', error)
      const data = (error as { data?: { error?: string } })?.data
      if (data?.error) {
        return { success: false, error: data.error }
      }
      return {
        success: false,
        error:
          'Could not reach the FAA registry lookup service. Check your connection and try again.',
      }
    }
  }

  return { lookupAirman }
}
