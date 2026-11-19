import { onMounted, ref } from 'vue'
import { LOGIFI_APP_VERSION } from '~/utils/fullBackupConstants'
import {
  formatFallbackAppVersionLabel,
  formatNativeAppVersionLabel,
  formatWebAppVersionLabel,
} from '~/utils/appVersionFormat'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'

export function useAppVersion() {
  const versionLabel = ref(formatFallbackAppVersionLabel())

  onMounted(async () => {
    try {
      if (isCapacitorNative()) {
        const { App } = await import('@capacitor/app')
        const info = await App.getInfo()
        versionLabel.value = formatNativeAppVersionLabel(info.version, info.build)
        return
      }

      const config = useRuntimeConfig()
      const sha = String(config.public.gitCommitSha ?? '')
      versionLabel.value = formatWebAppVersionLabel(LOGIFI_APP_VERSION, sha)
    } catch {
      // Keep fallback label — never break Settings.
    }
  })

  return { versionLabel }
}