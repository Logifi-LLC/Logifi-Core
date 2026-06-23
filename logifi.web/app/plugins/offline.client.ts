export default defineNuxtPlugin(() => {
  const { startMonitoring } = useOffline()
  startMonitoring()
})
