// https://nuxt.com/docs/api/configuration/nuxt-config
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Paths only — listhen resolves HTTPS via `s.startsWith("--")` (inline PEM) or `readFile(path)`.
 * Passing Buffers breaks with `s.startsWith is not a function`.
 */
function resolveDevHttpsPaths():
  | { key: string; cert: string }
  | undefined {
  const keyPath = process.env.NUXT_DEV_HTTPS_KEY?.trim()
  const certPath = process.env.NUXT_DEV_HTTPS_CERT?.trim()
  if (!keyPath || !certPath) return undefined
  const key = path.resolve(__dirname, keyPath)
  const cert = path.resolve(__dirname, certPath)
  try {
    if (!fs.existsSync(key) || !fs.existsSync(cert)) {
      console.warn(
        '[nuxt] NUXT_DEV_HTTPS_KEY / NUXT_DEV_HTTPS_CERT paths not found; using HTTP for dev.'
      )
      return undefined
    }
    return { key, cert }
  } catch {
    console.warn(
      '[nuxt] NUXT_DEV_HTTPS_KEY / NUXT_DEV_HTTPS_CERT could not be resolved; using HTTP for dev.'
    )
    return undefined
  }
}

const devHttps = resolveDevHttpsPaths()

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  /** FC View OAuth requires https:// redirect URIs; use mkcert + NUXT_DEV_HTTPS_* (see env.example). */
  devServer: devHttps ? { https: devHttps } : undefined,
  modules: ['@nuxt/icon'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
    optimizeDeps: {
      include: ['suncalc'],
    },
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
      /** `off` | `beta` | `coming_soon` — see useFcvUiLabel (integrations page + Settings connect UI only). */
      fcvUiLabel: process.env.NUXT_PUBLIC_FCV_UI_LABEL || 'off',
      /** Lightning / LNURL-pay / Lightning address shown on /developers (Open Source donation). */
      lightningDonationAddress: process.env.NUXT_PUBLIC_LIGHTNING_DONATION_ADDRESS || '',
      /** Public URL or site-relative path to a QR PNG/SVG. Leave env unset for `/images/lightning-donation-qr.png`; set to empty string to hide the QR. */
      lightningDonationQrPath:
        process.env.NUXT_PUBLIC_LIGHTNING_DONATION_QR_PATH !== undefined
          ? process.env.NUXT_PUBLIC_LIGHTNING_DONATION_QR_PATH
          : '/images/lightning-donation-qr.png',
    },
    // FC View OAuth (server-only; never expose to client)
    fcvClientId: process.env.FCV_CLIENT_ID || '',
    fcvClientSecret: process.env.FCV_CLIENT_SECRET || '',
    fcvRedirectUri: process.env.FCV_REDIRECT_URI || '',
    fcvTokenUrl: process.env.FCV_TOKEN_URL || '',
    fcvAuthorizeUrl: process.env.FCV_AUTHORIZE_URL || '',
    fcvApiBaseUrl: process.env.FCV_API_BASE_URL || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  // Client-side only app (uses localStorage for data persistence)
  ssr: false,
  nitro: {
    prerender: {
      routes: ['/']
    }
  },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap' }
      ]
    }
  }
})