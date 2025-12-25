declare module 'luxon' {
  export interface DateTimeObject {
    year?: number
    month?: number
    day?: number
    hour?: number
    minute?: number
    second?: number
    millisecond?: number
  }
  
  export interface DateTimeOptions {
    zone?: string
    locale?: string
  }
  
  export class DateTime {
    static now(): DateTime
    static fromISO(iso: string): DateTime
    static fromJSDate(date: Date): DateTime
    static fromObject(obj: DateTimeObject, opts?: DateTimeOptions): DateTime
    isValid: boolean
    toJSDate(): Date
    toISO(): string | null
    toFormat(format: string): string
    toUTC(): DateTime
    toMillis(): number
    setZone(zone: string): DateTime
    plus(duration: Duration): DateTime
    minus(duration: Duration): DateTime
    diff(other: DateTime, unit: string | string[]): Duration
    [key: string]: any
  }
  
  export class Duration {
    static fromObject(obj: { [key: string]: number }): Duration
    as(unit: string): number
    toObject(): { [key: string]: number }
    [key: string]: any
  }
}

