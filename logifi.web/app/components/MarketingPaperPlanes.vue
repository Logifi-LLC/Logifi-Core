<template>
  <div
    class="paper-planes-container absolute inset-0 z-[1] pointer-events-none"
    aria-hidden="true"
    style="height: 100%"
  >
    <div class="paper-plane plane-1">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-cyan-400" style="opacity: 0.5" />
      </svg>
    </div>

    <div class="paper-plane plane-2">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-blue-400" style="opacity: 0.45" />
      </svg>
    </div>

    <div class="paper-plane plane-3">
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-blue-300" style="opacity: 0.4" />
      </svg>
    </div>

    <div class="paper-plane plane-4">
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-cyan-300" style="opacity: 0.55" />
      </svg>
    </div>

    <div class="paper-plane plane-5">
      <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-blue-400" style="opacity: 0.48" />
      </svg>
    </div>

    <div class="paper-plane plane-6">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-cyan-500" style="opacity: 0.42" />
      </svg>
    </div>

    <div class="paper-plane plane-7">
      <svg width="58" height="58" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-blue-400" style="opacity: 0.46" />
      </svg>
    </div>

    <div class="paper-plane plane-8">
      <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-cyan-400" style="opacity: 0.38" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.paper-planes-container {
  overflow: visible;
  pointer-events: none;
}

.paper-plane {
  position: absolute;
  will-change: transform;
  background: none !important;
}

.paper-plane svg {
  display: block;
  background: none !important;
  overflow: visible;
}

.plane-1 {
  top: 10%;
  left: -8%;
  offset-path: path('M 0 0 Q 200 -150 400 -80 Q 600 150 800 80 Q 1000 -120 1200 120');
  offset-rotate: auto;
  animation: path-1 60s ease-in-out infinite;
}

@keyframes path-1 {
  0% {
    offset-distance: 0%;
  }
  100% {
    offset-distance: 100%;
  }
}

.plane-2 {
  top: 35%;
  left: 105%;
  offset-path: path('M 0 0 Q -250 -120 -500 -80 Q -700 100 -900 200 Q -1050 120 -1150 -50');
  offset-rotate: auto;
  animation: path-2 45s ease-in-out infinite;
}

@keyframes path-2 {
  0% {
    offset-distance: 0%;
  }
  100% {
    offset-distance: 100%;
  }
}

.plane-3 {
  top: 55%;
  left: -8%;
  offset-path: path('M 0 0 Q 300 -200 600 -150 Q 900 80 1150 200');
  offset-rotate: auto;
  animation: path-3 35s linear infinite;
}

@keyframes path-3 {
  0% {
    offset-distance: 0%;
  }
  100% {
    offset-distance: 100%;
  }
}

.plane-4 {
  top: 8%;
  left: 105%;
  offset-path: path('M 0 0 Q -300 180 -600 120 Q -850 -80 -1050 -150');
  offset-rotate: auto;
  animation: path-4 50s ease-in-out infinite;
}

@keyframes path-4 {
  0% {
    offset-distance: 0%;
  }
  100% {
    offset-distance: 100%;
  }
}

.plane-5 {
  top: 45%;
  left: -12%;
  offset-path: path('M 0 0 Q 250 -180 550 -250 Q 850 -180 1050 50 Q 1100 120 1150 180');
  offset-rotate: auto;
  animation: path-5 55s ease-in-out infinite;
}

@keyframes path-5 {
  0% {
    offset-distance: 0%;
  }
  100% {
    offset-distance: 100%;
  }
}

.plane-6 {
  top: 5%;
  right: 5%;
  offset-path: path('M 0 0 Q -150 100 -300 150 Q -400 120 -450 100');
  offset-rotate: auto;
  animation: path-6 40s ease-in-out infinite;
}

@keyframes path-6 {
  0% {
    offset-distance: 0%;
  }
  100% {
    offset-distance: 100%;
  }
}

.plane-7 {
  top: 50%;
  left: -10%;
  offset-path: path('M 0 0 Q 300 -80 650 -50 Q 800 0 950 30');
  offset-rotate: auto;
  animation: path-7 48s ease-in-out infinite;
}

@keyframes path-7 {
  0% {
    offset-distance: 0%;
  }
  100% {
    offset-distance: 100%;
  }
}

.plane-8 {
  top: 75%;
  right: -8%;
  offset-path: path('M 0 0 Q -200 80 -450 120 Q -700 80 -950 -50');
  offset-rotate: auto;
  animation: path-8 52s ease-in-out infinite;
}

@keyframes path-8 {
  0% {
    offset-distance: 0%;
  }
  100% {
    offset-distance: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .paper-plane {
    animation: none !important;
    opacity: 0.2 !important;
  }

  .plane-1 {
    top: 15%;
    left: 15%;
    transform: rotate(45deg);
  }
  .plane-2 {
    top: 40%;
    right: 20%;
    transform: rotate(180deg);
  }
  .plane-3 {
    top: 60%;
    left: 25%;
    transform: rotate(90deg);
  }
  .plane-4 {
    top: 12%;
    right: 30%;
    transform: rotate(225deg);
  }
  .plane-5 {
    top: 50%;
    left: 45%;
    transform: rotate(135deg);
  }
  .plane-6 {
    top: 8%;
    right: 8%;
    transform: rotate(90deg);
  }
  .plane-7 {
    top: 55%;
    left: 35%;
    transform: rotate(60deg);
  }
  .plane-8 {
    top: 75%;
    right: 25%;
    transform: rotate(200deg);
  }
}
</style>
