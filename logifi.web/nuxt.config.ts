// https://nuxt.com/docs/api/configuration/nuxt-config
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { OG_IMAGE_URL } from './shared/publicSeo'

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
  /** Avoid client manifest route-rule errors in dev (HTTPS / LAN); see nuxt/nuxt#24625 */
  experimental: {
    appManifest: false,
  },
  /**
   * Nuxt 4 does not render root app.html. This fragment is the #app-splash,
   * inserted beside #__nuxt so it can cover the first paint.
   */
  spaLoadingTemplate: '../app.html',
  devtools: { enabled: false },
  /** FC View OAuth requires https:// redirect URIs; use mkcert + NUXT_DEV_HTTPS_* (see env.example). */
  devServer: devHttps ? { https: devHttps } : undefined,
  modules: ['@nuxt/icon'],
  icon: {
    provider: 'none',
    serverBundle: false,
    clientBundle: {
      scan: {
        globInclude: ['app/**/*.{vue,ts,tsx,jsx}', 'shared/**/*.{vue,ts,tsx,jsx}'],
        globExclude: ['node_modules', 'dist', 'build', 'coverage', 'test', 'tests', '.*', '**/*.test.ts', '**/__tests__/**'],
      },
      icons: [
        'ri:loader-4-line',
        'ri:wifi-off-line',
        'ri:wifi-line',
        'ri:plane-line',
        'ri:map-pin-2-line',
        'ri:user-star-line',
        'ri:award-line',
      ],
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
    optimizeDeps: {
      include: ['suncalc'],
      exclude: ['@capgo/native-purchases']
    },
    ssr: {
      // Don't try to resolve iOS-only modules during SSR
      noExternal: [],
      external: ['@capgo/native-purchases']
    }
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
      /** API origin for Capacitor static builds. TestFlight and App Store: https://www.logifi.io. `dev.logifi.io` is not a live host. */
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '',
      /** `off` | `beta` | `coming_soon` — see useFcvUiLabel (integrations page + Settings connect UI only). */
      fcvUiLabel: process.env.NUXT_PUBLIC_FCV_UI_LABEL || 'off',
      /** `on` (default) routes iOS Digifi entries to /digifi-scan. `off` keeps /digifi-eye. Route always exists. */
      digifiMobileReview: process.env.NUXT_PUBLIC_DIGIFI_MOBILE_REVIEW || 'on',
      /** `true` / `on` / `1` shows Continue with Apple on web. Default off until Services ID + Apple provider are live. */
      appleWebSignIn: process.env.NUXT_PUBLIC_APPLE_WEB_SIGNIN || '',
      /** Lightning / LNURL-pay / Lightning address shown on /developers (Open Source donation). */
      /** Base URL for Digifi phone capture QR/links. Unset in dev to auto-detect LAN IP. */
      companionCaptureOrigin: process.env.NUXT_PUBLIC_COMPANION_CAPTURE_ORIGIN || '',
      /** Stripe publishable key — when set, Digifi credit checkout uses Stripe instead of mock. */
      stripePublishableKey:
        process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
        process.env.STRIPE_PUBLISHABLE_KEY ||
        '',
      /** When true, Lightning credit checkout is available (OpenNode or BTCPay configured on server). */
      lightningPaymentsEnabled:
        (process.env.NUXT_PUBLIC_LIGHTNING_PAYMENTS_ENABLED ||
          process.env.LIGHTNING_PAYMENTS_ENABLED ||
          '') === 'true',
    },
    // FC View OAuth (server-only; never expose to client)
    fcvClientId: process.env.FCV_CLIENT_ID || '',
    fcvClientSecret: process.env.FCV_CLIENT_SECRET || '',
    fcvRedirectUri: process.env.FCV_REDIRECT_URI || '',
    fcvTokenUrl: process.env.FCV_TOKEN_URL || '',
    fcvAuthorizeUrl: process.env.FCV_AUTHORIZE_URL || '',
    fcvApiBaseUrl: process.env.FCV_API_BASE_URL || '',
    // AeroDataBox via RapidAPI (server-only; Flica schedule enrichment)
    aeroDataBoxApiKey: process.env.AERODATABOX_API_KEY || '',
    aeroDataBoxApiHost:
      process.env.AERODATABOX_API_HOST || 'aerodatabox.p.rapidapi.com',
    // FlightAware AeroAPI (server-only; Flica schedule enrichment alternative)
    flightAwareApiKey: process.env.FLIGHTAWARE_API_KEY || '',
    flightAwareApiBase:
      process.env.FLIGHTAWARE_API_BASE || 'https://aeroapi.flightaware.com/aeroapi',
    // Flight enrichment provider. flightaware is the default; aerodatabox is the explicit rollback.
    flightEnrichProvider: process.env.FLIGHT_ENRICH_PROVIDER || 'flightaware',
    /** AES-256 key for sealing FLICA passwords (base64 or hex). */
    flicaCredentialsKey: process.env.FLICA_CREDENTIALS_KEY || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    /** Vercel Cron sends this as `Authorization: Bearer <value>` to /api/cron/purge-digifi-scans. */
    cronSecret: process.env.CRON_SECRET || '',
    // Digifi paper logbook scan (server-only)
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    /** Server-only. Empty provider keeps direct Gemini. */
    openrouterApiKey: process.env.OPENROUTER_API_KEY || process.env.NUXT_OPENROUTER_API_KEY || '',
    digifiProvider: process.env.NUXT_DIGIFI_PROVIDER || process.env.DIGIFI_PROVIDER || '',
    digifiOpenrouterModel:
      process.env.NUXT_DIGIFI_OPENROUTER_MODEL || process.env.DIGIFI_OPENROUTER_MODEL || '',
    digifiOpenrouterProviders:
      process.env.NUXT_DIGIFI_OPENROUTER_PROVIDERS || process.env.DIGIFI_OPENROUTER_PROVIDERS || '',
    digifiModel: process.env.NUXT_DIGIFI_MODEL || process.env.DIGIFI_MODEL || 'gemini-3.8-flash',
    digifiModelFallbacks: process.env.NUXT_DIGIFI_MODEL_FALLBACKS || process.env.DIGIFI_MODEL_FALLBACKS || '',
    digifiEnableCapacityModelFallback: process.env.NUXT_DIGIFI_ENABLE_CAPACITY_MODEL_FALLBACK || '',
    digifiMaxScansPerDay: parseInt(process.env.NUXT_DIGIFI_MAX_SCANS_PER_DAY || process.env.DIGIFI_MAX_SCANS_PER_DAY || '10', 10) || 10,
    // Stripe (server-only)
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || process.env.NUXT_STRIPE_SECRET_KEY || '',
    stripeWebhookSecret:
      process.env.STRIPE_WEBHOOK_SECRET || process.env.NUXT_STRIPE_WEBHOOK_SECRET || '',
    // Lightning (server-only)
    lightningProvider:
      process.env.LIGHTNING_PROVIDER || process.env.NUXT_LIGHTNING_PROVIDER || 'opennode',
    opennodeApiKey: process.env.OPENNODE_API_KEY || process.env.NUXT_OPENNODE_API_KEY || '',
    opennodeApiBase:
      process.env.OPENNODE_API_BASE ||
      process.env.NUXT_OPENNODE_API_BASE ||
      'https://api.opennode.com',
    opennodeCallbackOrigin:
      process.env.OPENNODE_CALLBACK_ORIGIN || process.env.NUXT_OPENNODE_CALLBACK_ORIGIN || '',
    btcpayHost: process.env.BTCPAY_HOST || process.env.NUXT_BTCPAY_HOST || '',
    btcpayApiKey: process.env.BTCPAY_API_KEY || process.env.NUXT_BTCPAY_API_KEY || '',
    btcpayStoreId: process.env.BTCPAY_STORE_ID || process.env.NUXT_BTCPAY_STORE_ID || '',
    btcpayWebhookSecret:
      process.env.BTCPAY_WEBHOOK_SECRET || process.env.NUXT_BTCPAY_WEBHOOK_SECRET || '',
    /** Mock instant credit grant for beta testers. Defaults to on in dev, off in production builds. */
    creditsMockEnabled:
      process.env.NUXT_CREDITS_MOCK_ENABLED || process.env.CREDITS_MOCK_ENABLED || '',
  },
  // Client-side only app (uses localStorage for data persistence)
  ssr: false,
  nitro: {
    prerender: {
      routes: [
        '/',
        '/faq',
        '/how-to-digitize-a-paper-pilot-logbook',
        '/import-foreflight-logten-logbook',
        '/airline-pilot-logbook-app',
      ]
    },
    hooks: {
      // ssr:false also prerenders /index.html. Both routes write public/index.html.
      // Parallel writes leave the tail of the longer file (the `/` canonical tag
      // makes it 52 bytes longer) after </html>, and WKWebView paints that tail.
      'prerender:generate'(route: { route?: string; skip?: boolean }) {
        if (route.route === '/index.html') route.skip = true
      },
    },
  },
  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      title: 'Logifi — Digital Pilot Logbooks',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
        {
          name: 'description',
          content:
            'Free, FAA-compliant digital pilot logbooks. AI-powered paper scanning with Digifi, airline schedule import, and open-source transparency.',
        },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Logifi — Digital Pilot Logbooks' },
        {
          property: 'og:description',
          content:
            'Free, FAA-compliant digital pilot logbooks. AI-powered paper scanning with Digifi, airline schedule import, and open-source transparency.',
        },
        { property: 'og:image', content: OG_IMAGE_URL },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Logifi — Digital Pilot Logbooks' },
        {
          name: 'twitter:description',
          content:
            'Free, FAA-compliant digital pilot logbooks. AI-powered paper scanning with Digifi, airline schedule import, and open-source transparency.',
        },
        { name: 'twitter:image', content: OG_IMAGE_URL },
      ],
      link: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
      style: [{ innerHTML: 'html,body{margin:0;background:#030712;color:#e5e7eb}' }],
    }
  }
})