# Digifi environment parity (localhost vs beta / private server)

Logbook Builder Digifi scans run on the **server** (`/api/digifi/scan`). Accuracy differences between localhost and a deployed beta host are usually configuration, not client code.

## Required

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` or `NUXT_GEMINI_API_KEY` | Must be set on the **deployment** runtime (not only in a local `.env` used for dev). |

## Recommended alignment

Compare these between local `.env` and the beta host (Coolify, Vercel, etc.):

| Variable | Default if unset | Notes |
|----------|------------------|-------|
| `DIGIFI_MODEL` / `NUXT_DIGIFI_MODEL` | `gemini-3.5-flash` | Weaker or legacy models reduce OCR quality. |
| `DIGIFI_ENABLE_CAPACITY_MODEL_FALLBACK` | `true` | On 429/503, may fall back to `gemini-3-flash-preview` (logged server-side). |
| `DIGIFI_MODEL_FALLBACKS` | (empty) | Comma-separated extra models when capacity fallback is on. |
| `DIGIFI_SEND_ROW_BANDS` | `true` | Set to `false` only if intentionally disabling client row-band crops (`disableRowBandsToGemini`). |
| `DIGIFI_ENABLE_RESCUE_SCAN` | `false` | Second Gemini pass for missing rows; costs extra latency/credits. |
| `DIGIFI_GEMINI_MEDIA_RESOLUTION` | `MEDIA_RESOLUTION_HIGH` | `LOW` reduces accuracy. |
| `DIGIFI_GEMINI_MAX_OUTPUT_TOKENS` | capped at 20000 | Truncation on dense pages causes incomplete rows. |
| `DIGIFI_GEMINI_THINKING_LEVEL` | `low` | Higher levels share the output token budget on Gemini 3.x. |

Implementation reference: [`server/utils/digifiEnv.ts`](../server/utils/digifiEnv.ts), [`nuxt.config.ts`](../nuxt.config.ts).

## Logbook Builder row count

Set toolbar **Rows** to the number of **flight entry lines** on the photo, **not** the bottom totals / carry-forward row. A row count that includes the totals line often makes Digifi write cumulative totals into the last grid row and merge or overwrite real flights.

## Verification steps

1. On beta, trigger one Digifi scan and check server logs for model id and any `[digifi]` fallback warnings.
2. Match `DIGIFI_MODEL` and `DIGIFI_SEND_ROW_BANDS` to localhost.
3. Re-scan the same image locally and on beta with the same **Rows** value and template columns.
4. If beta uses a different API key (quota, billing tier), expect different rate limits and fallback behavior.
