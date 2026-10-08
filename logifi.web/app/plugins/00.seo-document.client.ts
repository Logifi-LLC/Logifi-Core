import { isCapacitorNative } from '~/composables/useCapacitorPlatform'
import {
  APP_STORE_APP_ID,
  canonicalHrefForPath,
  isVercelAppHost,
} from '../../shared/publicSeo'

function ensureMeta(name: string, content: string | null) {
  const existing = document.head.querySelector(`meta[name="${name}"]`)
  if (!content) {
    existing?.remove()
    return
  }
  const el = existing ?? document.head.appendChild(document.createElement('meta'))
  el.setAttribute('name', name)
  el.setAttribute('content', content)
}

function ensureCanonical(href: string | null) {
  const existing = document.head.querySelector('link[rel="canonical"]')
  if (!href) {
    existing?.remove()
    return
  }
  const el = (existing as HTMLLinkElement | null) ?? document.head.appendChild(document.createElement('link'))
  el.setAttribute('rel', 'canonical')
  el.setAttribute('href', href)
}

/**
 * Keeps canonicals in sync on client navigations. The smart banner is added
 * only in the browser and removed when Capacitor.isNativePlatform() is true.
 */
export default defineNuxtPlugin(() => {
  const native = isCapacitorNative()
  const router = useRouter()

  const apply = (path: string) => {
    ensureCanonical(canonicalHrefForPath(path))
    ensureMeta('apple-itunes-app', native ? null : `app-id=${APP_STORE_APP_ID}`)
    if (isVercelAppHost(window.location.hostname)) ensureMeta('robots', 'noindex')
  }

  apply(router.currentRoute.value.path)
  router.afterEach((to) => apply(to.path))
})
