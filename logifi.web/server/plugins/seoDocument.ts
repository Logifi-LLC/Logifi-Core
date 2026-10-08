import { getRequestHost, getRequestURL, setResponseHeader } from 'h3'
import { robotsNoindexHeader, seoHeadTags, shouldEmbedItunesAppMeta } from '../../shared/publicSeo'

type HtmlContext = { head: string[] }

/**
 * Canonicals and the App Store smart-banner tag on the HTML Nitro already
 * renders for each path. noindex meta is added only when the request host
 * is *.vercel.app.
 */
export default defineNitroPlugin((nitroApp) => {
  // Static files (prerendered `/`, sitemap.xml) skip route middleware. This
  // still runs for those responses. vercel.json repeats the header at the edge.
  nitroApp.hooks.hook('beforeResponse', (event) => {
    const header = robotsNoindexHeader(getRequestHost(event, { xForwardedHost: true }))
    if (!header) return
    setResponseHeader(event, 'X-Robots-Tag', header)
  })

  nitroApp.hooks.hook('render:html', ((html: HtmlContext, { event }) => {
    const tags = seoHeadTags({
      pathname: getRequestURL(event).pathname,
      hostname: getRequestHost(event, { xForwardedHost: true }),
      embedItunes: shouldEmbedItunesAppMeta({
        prerender: import.meta.prerender,
        lifecycleEvent: process.env.npm_lifecycle_event,
        nitroPreset: process.env.NITRO_PRESET,
      }),
    })
    if (!tags.length) return
    const head = html.head.join('')
    const fresh = tags.filter((tag) => {
      if (tag.includes('rel="canonical"')) return !head.includes('rel="canonical"')
      if (tag.includes('apple-itunes-app')) return !head.includes('apple-itunes-app')
      if (tag.includes('name="robots"')) return !/name="robots"/i.test(head)
      return true
    })
    if (fresh.length) html.head.push(fresh.join(''))
  }) as never)
})
