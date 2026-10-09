import { hideApplicationJsonScripts } from '../utils/hideNuxtPayloadScript'

type HtmlContext = {
  head: string[]
  bodyPrepend: string[]
  body: string[]
  bodyAppend: string[]
}

/**
 * Capacitor ships `nuxt generate` output. The SPA payload script is a sibling
 * of #__nuxt; iOS paints its JSON unless the tag is hidden in the HTML itself.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', ((html: HtmlContext) => {
    for (const key of ['head', 'bodyPrepend', 'body', 'bodyAppend'] as const) {
      const chunks = html[key]
      if (!Array.isArray(chunks)) continue
      html[key] = chunks.map(hideApplicationJsonScripts)
    }
  }) as never)
})
