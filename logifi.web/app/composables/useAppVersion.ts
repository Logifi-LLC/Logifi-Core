import { onMounted, ref } from 'vue'
import { LOGIFI_WEB_VERSION } from '~/utils/fullBackupConstants'
import {
  formatFallbackAppVersionLabel,
  formatLogifiVersionLabel,
} from '~/utils/appVersionFormat'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'

export function useAppVersion() {
  const versionLabel = ref(formatFallbackAppVersionLabel())

  onMounted(async () => {
    try {
      if (isCapacitorNative()) {
        const { App } = await import('@capacitor/app')
        const info = await App.getInfo()
        versionLabel.value = formatLogifiVersionLabel(info.version)
        return
      }

      versionLabel.value = formatLogifiVersionLabel(LOGIFI_WEB_VERSION)
    } catch {
      versionLabel.value = formatFallbackAppVersionLabel()
    }
  })

  return { versionLabel }
}