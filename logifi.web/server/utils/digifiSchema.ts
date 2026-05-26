import { z } from 'zod'

const logbookColumnKeySchema = z.enum([
  'date',
  'aircraft',
  'identification',
  'flightNumber',
  'fromTo',
  'departure',
  'destination',
  'route',
  'simulator',
  'categoryClass',
  'conditions',
  'remarks',
  'pic',
  'sic',
  'dualR',
  'solo',
  'night',
  'actual',
  'hood',
  'dualG',
  'xc',
  'dayLandings',
  'nightLandings',
  'approach',
  'approachType',
  'pilots',
  'pilotRole',
  'role',
  'total',
])

export const digifiTemplateColumnSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  fieldKey: logbookColumnKeySchema.nullable(),
  order: z.number().int().nonnegative(),
  categoryClassValue: z.string().optional(),
})

const digifiScanChunkSchema = z.object({
  partName: z.string().min(1).max(100),
  rowStart: z.number().int().min(0).max(99),
  rowEnd: z.number().int().min(0).max(99),
}).refine((value) => value.rowEnd >= value.rowStart, {
  message: 'rowEnd must be greater than or equal to rowStart',
})

export const digifiScanMetaSchema = z.object({
  pageSide: z.enum(['left', 'right']),
  layout: z.enum(['single', 'two-page']),
  rowCount: z.number().int().min(1).max(100),
  twoPageSplitIndex: z.number().int().min(1).max(99),
  defaultYear: z.number().int().min(1900).max(2100).nullable(),
  templateName: z.string().max(200).optional(),
  columns: z.array(digifiTemplateColumnSchema).min(1).max(40),
  useProModel: z.boolean().optional(),
  chunkedScan: z.object({
    strategy: z.literal('page-overview+row-bands'),
    chunkSize: z.number().int().min(1).max(20),
    overlapRows: z.number().int().min(0).max(10),
    chunks: z.array(digifiScanChunkSchema).min(1).max(40),
  }).optional(),
})

const geminiCellSchema = z.object({
  columnId: z.string(),
  value: z.string(),
})

export const geminiScanRowSchema = z.object({
  rowIndex: z.number().int().min(0).max(99),
  cells: z.array(geminiCellSchema),
  tags: z.array(z.string()).optional(),
})

export const geminiScanResponseSchema = z.object({
  rows: z.array(geminiScanRowSchema),
})

export type DigifiScanMetaInput = z.infer<typeof digifiScanMetaSchema>
export type GeminiScanResponse = z.infer<typeof geminiScanResponseSchema>

/** JSON Schema for Gemini structured output. */
export const GEMINI_SCAN_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    rows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rowIndex: { type: 'integer' },
          cells: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                columnId: { type: 'string' },
                value: { type: 'string' },
              },
              required: ['columnId', 'value'],
            },
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['rowIndex', 'cells'],
      },
    },
  },
  required: ['rows'],
} as const
