import { describe, it, expect } from 'vitest'
import { calculateNightTime } from '../nightTimeCalculator'
import type { NightTimeParams } from '../nightTimeCalculator'

describe('nightTimeCalculator', () => {
  describe('calculateNightTime', () => {
    it('should calculate night time for a valid flight', () => {
      const params: NightTimeParams = {
        date: '2024-06-15',
        depLatitude: 40.6398, // KJFK
        depLongitude: -73.7789,
        destLatitude: 42.3656, // KBOS
        destLongitude: -71.0096,
        outTime: '20:00',
        inTime: '22:00',
        isZulu: true
      }
      
      const result = calculateNightTime(params)
      
      expect(result.success).toBe(true)
      expect(result.nightHours).toBeGreaterThanOrEqual(0)
      expect(result.totalHours).toBe(2.0)
    })

    it('should handle flights with no night time', () => {
      const params: NightTimeParams = {
        date: '2024-06-15',
        depLatitude: 40.6398,
        depLongitude: -73.7789,
        outTime: '10:00',
        inTime: '12:00',
        isZulu: true
      }
      
      const result = calculateNightTime(params)
      
      expect(result.success).toBe(true)
      expect(result.nightHours).toBe(0)
      expect(result.totalHours).toBe(2.0)
    })

    it('should return error for invalid date format', () => {
      const params: NightTimeParams = {
        date: 'invalid-date',
        depLatitude: 40.6398,
        depLongitude: -73.7789,
        outTime: '20:00',
        inTime: '22:00',
        isZulu: true
      }
      
      const result = calculateNightTime(params)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should return error for invalid time format', () => {
      const params: NightTimeParams = {
        date: '2024-06-15',
        depLatitude: 40.6398,
        depLongitude: -73.7789,
        outTime: 'invalid-time',
        inTime: '22:00',
        isZulu: true
      }
      
      const result = calculateNightTime(params)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle single location when destination not provided', () => {
      const params: NightTimeParams = {
        date: '2024-06-15',
        depLatitude: 40.6398,
        depLongitude: -73.7789,
        outTime: '20:00',
        inTime: '22:00',
        isZulu: true
      }
      
      const result = calculateNightTime(params)
      
      expect(result.success).toBe(true)
      expect(result.totalHours).toBe(2.0)
    })

    it('should handle local time when isZulu is false', () => {
      const params: NightTimeParams = {
        date: '2024-06-15',
        depLatitude: 40.6398,
        depLongitude: -73.7789,
        outTime: '20:00',
        inTime: '22:00',
        isZulu: false
      }
      
      const result = calculateNightTime(params)
      
      expect(result.success).toBe(true)
      expect(result.totalHours).toBe(2.0)
    })
  })
})
