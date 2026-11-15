<template>
  <div
    class="logifi-boot-loader"
    role="status"
    aria-busy="true"
    aria-label="Loading logbook"
  >
    <img
      src="/images/app-logo-mark.png"
      alt=""
      class="logifi-boot-loader__mark"
      width="72"
      height="72"
      decoding="async"
    />
  </div>
</template>

<style scoped>
.logifi-boot-loader {
  position: fixed;
  inset: 0;
  z-index: 99990;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #030712;
}

.logifi-boot-loader__mark {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  object-fit: cover;
  animation: logifi-boot-mark-pulse 2.4s ease-in-out infinite;
}

@keyframes logifi-boot-mark-pulse {
  0%,
  100% {
    opacity: 0.72;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .logifi-boot-loader__mark {
    animation: none;
    opacity: 1;
  }
}
</style>