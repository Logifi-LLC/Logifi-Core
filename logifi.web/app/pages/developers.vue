<template>
  <div
    :class="[
      'min-h-screen transition-colors duration-300 font-quicksand',
      isFromLanding
        ? 'bg-[#e4e8e7] text-gray-900'
        : theme === 'dark'
          ? 'bg-gray-900'
          : 'bg-gray-50'
    ]"
  >
    <!-- Marketing header (?from=landing) — matches integrations / landing shell -->
    <header v-if="isFromLanding" class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/10 bg-white/5 backdrop-blur-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div class="flex items-center">
          <NuxtLink to="/" class="flex items-center">
            <img src="/images/logifi-logo.png" alt="Logifi" class="h-32 w-auto brightness-0" />
          </NuxtLink>
        </div>
        
        <nav class="hidden md:flex items-center space-x-8">
          <NuxtLink to="/#features" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Features</NuxtLink>
          <NuxtLink to="/integrations" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Integrations</NuxtLink>
          <NuxtLink to="/pricing" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Pricing</NuxtLink>
          <NuxtLink to="/developers?from=landing" class="text-sm font-medium text-blue-600 transition-colors dark:text-blue-600">Developers</NuxtLink>
          <NuxtLink to="/feedback?from=landing" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Feedback</NuxtLink>
          <div class="h-4 w-px bg-gray-200 dark:bg-gray-200"></div>
          <button 
            @click="openAuth('signin')"
            class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600"
          >
            Sign In
          </button>
          <button 
            @click="openAuth('signup')"
            class="btn-cta-primary px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all ring-1 ring-blue-400/60 shadow-[0_0_16px_-3px_rgba(37,99,235,0.48),0_0_32px_-12px_rgba(59,130,246,0.22)] hover:shadow-[0_0_24px_-2px_rgba(37,99,235,0.55),0_0_40px_-10px_rgba(59,130,246,0.28)] active:scale-[0.98] dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
          >
            <span class="relative z-10">Get Started</span>
          </button>
        </nav>

        <!-- Mobile Menu Button -->
        <button class="md:hidden p-2 text-gray-600 dark:text-gray-600">
          <Icon name="ri:menu-line" size="24" />
        </button>
      </div>
    </header>

    <!-- App header (dashboard / default) -->
    <header v-else>
      <div
        :class="[
          'fixed top-0 left-0 right-0 z-10 transition-colors duration-300',
          effectiveDark ? 'border-gray-700/50' : 'border-gray-400/50'
        ]"
      >
        <div class="mr-auto px-6 sm:px-8 py-4 flex items-center justify-between relative">
          <a class="left" href="/">
            <img
              src="/images/logifi-logo.png"
              alt="logifi"
              :class="[
                'h-20 sm:h-24 lg:h-28 w-auto transition-all duration-300',
                effectiveDark ? '' : 'brightness-[0.2]'
              ]"
            />
          </a>

          <div class="absolute inset-x-0 flex justify-center pointer-events-none">
            <span
              :class="[
                'px-3 py-1 rounded-md text-xl font-quicksand font-semibold select-none',
                effectiveDark ? 'text-gray-200' : 'text-gray-800'
              ]"
              aria-live="polite"
            >
              {{ displayClock }}
            </span>
          </div>

          <nav class="flex items-center gap-3 relative z-10">
            <a
              href="https://discord.gg/hBaDkNt2ev"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-quicksand font-bold transition-all duration-200 bg-[#5865F2] hover:bg-[#4752C4] text-white"
            >
              <Icon name="ri:discord-fill" size="18" class="mr-2" />
              Join Community
            </a>

            <button
              type="button"
              class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-quicksand font-bold transition-all duration-200"
              :class="
                effectiveDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
              "
              @click="goBack"
            >
              <Icon name="ri:arrow-left-line" size="18" class="mr-2" />
              Back to Logbook
            </button>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main
      :class="[
        'pb-16 px-4 sm:px-6 lg:px-8 relative z-10',
        isFromLanding ? 'pt-32' : 'pt-24'
      ]"
    >
      <div :class="['max-w-4xl mx-auto', isFromLanding ? 'relative overflow-hidden rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_0_42px_-12px_rgba(59,130,246,0.24),0_0_56px_-18px_rgba(37,99,235,0.14)] p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8' : '']">
        <!-- Hero Section -->
        <div class="text-center mb-12">
          <div :class="['inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-lg', isFromLanding ? 'bg-blue-600 shadow-[0_0_24px_-2px_rgba(37,99,235,0.55)]' : 'bg-blue-600 shadow-blue-900/20']">
            <Icon name="ri:open-source-line" size="32" class="text-white" />
          </div>
          <h1
            :class="[
              'font-bold font-quicksand mb-4',
              isFromLanding ? 'text-4xl text-gray-950 dark:text-gray-900 drop-shadow-sm' : ['text-4xl', effectiveDark ? 'text-white' : 'text-gray-900']
            ]"
          >
            Open Source
          </h1>
          <p
            :class="[
              'max-w-2xl mx-auto',
              isFromLanding ? 'text-lg text-gray-800 dark:text-gray-700 font-medium' : ['text-lg', effectiveDark ? 'text-gray-400' : 'text-gray-600']
            ]"
          >
            Logifi-Core is open source software built by pilots, for pilots. Join our community and help shape the future of digital flight logging.
          </p>
        </div>

        <!-- Links Grid -->
        <div class="grid gap-6 md:grid-cols-2 mb-12 auto-rows-min">
          <!-- GitHub -->
          <a
            href="https://github.com/Logifi-LLC/Logifi-Core"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200 hover:scale-[1.02]',
              isFromLanding ? 'bg-white/10 backdrop-blur-md border-white/15 hover:border-white/25 shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)] dark:bg-white/10 dark:border-white/15 dark:hover:border-white/25' : (effectiveDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)]' 
                : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]')
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', isFromLanding ? 'bg-white/50 dark:bg-white/50' : (effectiveDark ? 'bg-gray-700' : 'bg-gray-200')]">
              <Icon name="ri:github-fill" size="24" :class="isFromLanding ? 'text-gray-900' : (effectiveDark ? 'text-white' : 'text-gray-900')" />
            </div>
            <div>
              <h3 :class="['font-semibold font-quicksand mb-1', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-white' : 'text-gray-900')]">
                GitHub Repository
              </h3>
              <p :class="['text-sm', isFromLanding ? 'text-gray-800 dark:text-gray-800' : (effectiveDark ? 'text-gray-400' : 'text-gray-600')]">
                View source code, report issues, and submit pull requests.
              </p>
            </div>
            <Icon name="ri:external-link-line" size="18" :class="['flex-shrink-0 mt-1', isFromLanding ? 'text-gray-600 dark:text-gray-600' : (effectiveDark ? 'text-gray-500' : 'text-gray-400')]" />
          </a>

          <!-- Contributing -->
          <a
            href="https://github.com/Logifi-LLC/Logifi-Core/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200 hover:scale-[1.02]',
              isFromLanding ? 'bg-white/10 backdrop-blur-md border-white/15 hover:border-white/25 shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)] dark:bg-white/10 dark:border-white/15 dark:hover:border-white/25' : (effectiveDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)]' 
                : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]')
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', isFromLanding ? 'bg-green-100/50 dark:bg-green-100/50' : (effectiveDark ? 'bg-green-900/50' : 'bg-green-100')]">
              <Icon name="ri:git-pull-request-line" size="24" :class="isFromLanding ? 'text-green-700 dark:text-green-700' : (effectiveDark ? 'text-green-400' : 'text-green-600')" />
            </div>
            <div>
              <h3 :class="['font-semibold font-quicksand mb-1', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-white' : 'text-gray-900')]">
                Contributing Guide
              </h3>
              <p :class="['text-sm', isFromLanding ? 'text-gray-800 dark:text-gray-800' : (effectiveDark ? 'text-gray-400' : 'text-gray-600')]">
                Learn how to contribute to the project and what we accept.
              </p>
            </div>
            <Icon name="ri:external-link-line" size="18" :class="['flex-shrink-0 mt-1', isFromLanding ? 'text-gray-600 dark:text-gray-600' : (effectiveDark ? 'text-gray-500' : 'text-gray-400')]" />
          </a>

          <!-- License -->
          <a
            href="https://github.com/Logifi-LLC/Logifi-Core/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200 hover:scale-[1.02]',
              isFromLanding ? 'bg-white/10 backdrop-blur-md border-white/15 hover:border-white/25 shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)] dark:bg-white/10 dark:border-white/15 dark:hover:border-white/25' : (effectiveDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)]' 
                : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]')
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', isFromLanding ? 'bg-purple-100/50 dark:bg-purple-100/50' : (effectiveDark ? 'bg-purple-900/50' : 'bg-purple-100')]">
              <Icon name="ri:scales-3-line" size="24" :class="isFromLanding ? 'text-purple-700 dark:text-purple-700' : (effectiveDark ? 'text-purple-400' : 'text-purple-600')" />
            </div>
            <div>
              <h3 :class="['font-semibold font-quicksand mb-1', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-white' : 'text-gray-900')]">
                License
              </h3>
              <p :class="['text-sm', isFromLanding ? 'text-gray-800 dark:text-gray-800' : (effectiveDark ? 'text-gray-400' : 'text-gray-600')]">
                Apache 2.0 License - free to use, modify, and distribute.
              </p>
            </div>
            <Icon name="ri:external-link-line" size="18" :class="['flex-shrink-0 mt-1', isFromLanding ? 'text-gray-600 dark:text-gray-600' : (effectiveDark ? 'text-gray-500' : 'text-gray-400')]" />
          </a>

          <!-- Code of Conduct -->
          <a
            href="https://github.com/Logifi-LLC/Logifi-Core/blob/main/CODE_OF_CONDUCT.md"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200 hover:scale-[1.02]',
              isFromLanding ? 'bg-white/10 backdrop-blur-md border-white/15 hover:border-white/25 shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)] dark:bg-white/10 dark:border-white/15 dark:hover:border-white/25' : (effectiveDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)]' 
                : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]')
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', isFromLanding ? 'bg-orange-100/50 dark:bg-orange-100/50' : (effectiveDark ? 'bg-orange-900/50' : 'bg-orange-100')]">
              <Icon name="ri:heart-line" size="24" :class="isFromLanding ? 'text-orange-700 dark:text-orange-700' : (effectiveDark ? 'text-orange-400' : 'text-orange-600')" />
            </div>
            <div>
              <h3 :class="['font-semibold font-quicksand mb-1', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-white' : 'text-gray-900')]">
                Code of Conduct
              </h3>
              <p :class="['text-sm', isFromLanding ? 'text-gray-800 dark:text-gray-800' : (effectiveDark ? 'text-gray-400' : 'text-gray-600')]">
                Our community guidelines for a welcoming environment.
              </p>
            </div>
            <Icon name="ri:external-link-line" size="18" :class="['flex-shrink-0 mt-1', isFromLanding ? 'text-gray-600 dark:text-gray-600' : (effectiveDark ? 'text-gray-500' : 'text-gray-400')]" />
          </a>

          <!-- ICLA -->
          <a
            href="/images/ICLA.pdf"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200 hover:scale-[1.02]',
              isFromLanding ? 'bg-white/10 backdrop-blur-md border-white/15 hover:border-white/25 shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)] dark:bg-white/10 dark:border-white/15 dark:hover:border-white/25' : (effectiveDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)]' 
                : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]')
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', isFromLanding ? 'bg-blue-100/50 dark:bg-blue-100/50' : (effectiveDark ? 'bg-blue-900/50' : 'bg-blue-100')]">
              <Icon name="ri:file-pdf-2-line" size="24" :class="isFromLanding ? 'text-blue-700 dark:text-blue-700' : (effectiveDark ? 'text-blue-400' : 'text-blue-600')" />
            </div>
            <div>
              <h3 :class="['font-semibold font-quicksand mb-1', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-white' : 'text-gray-900')]">
                Contributor License Agreement
              </h3>
              <p :class="['text-sm', isFromLanding ? 'text-gray-800 dark:text-gray-800' : (effectiveDark ? 'text-gray-400' : 'text-gray-600')]">
                Review and sign the CLA to contribute.
              </p>
            </div>
            <Icon name="ri:external-link-line" size="18" :class="['flex-shrink-0 mt-1', isFromLanding ? 'text-gray-600 dark:text-gray-600' : (effectiveDark ? 'text-gray-500' : 'text-gray-400')]" />
          </a>

          <!-- Lightning donation — layout aligned with other link cards (icon + body); small QR top-right in body so the cell stays narrow. -->
          <div
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200',
              isFromLanding
                ? 'bg-white/10 backdrop-blur-md border-white/15 shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)] dark:bg-white/10 dark:border-white/15'
                : effectiveDark
                  ? 'bg-gray-800 border-gray-700 text-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)]'
                  : 'bg-gray-100 border-gray-300 text-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]'
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', isFromLanding ? 'bg-amber-100/60 dark:bg-amber-100/60' : (effectiveDark ? 'bg-amber-900/40' : 'bg-amber-100')]">
              <Icon name="ri:flashlight-fill" size="24" :class="isFromLanding ? 'text-amber-700 dark:text-amber-800' : (effectiveDark ? 'text-amber-300' : 'text-amber-600')" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <h3 :class="['font-semibold font-quicksand mb-1', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-white' : 'text-gray-900')]">
                    Donate (Lightning BTC)
                  </h3>
                  <p :class="['text-sm leading-snug', isFromLanding ? 'text-gray-800 dark:text-gray-800' : (effectiveDark ? 'text-gray-400' : 'text-gray-600')]">
                    Optional support for development. Kachow!
                  </p>
                  <p
                    v-if="!lightningAddress"
                    :class="['mt-2 text-xs', isFromLanding ? 'text-gray-600 dark:text-gray-600' : (effectiveDark ? 'text-gray-500' : 'text-gray-500')]"
                  >
                    Set <span class="font-mono">NUXT_PUBLIC_LIGHTNING_DONATION_ADDRESS</span> to enable tap-to-copy on the QR.
                  </p>
                </div>
                <div
                  v-if="lightningQrPath && lightningQrLoaded !== false"
                  class="flex shrink-0 flex-col items-center gap-0.5 self-center"
                >
                  <div class="relative rounded-md">
                    <img
                      :src="lightningQrPath"
                      alt=""
                      role="presentation"
                      class="block h-14 w-14 shrink-0 rounded-md border object-contain sm:h-16 sm:w-16"
                      :class="isFromLanding ? 'border-white/25 bg-white/90' : effectiveDark ? 'border-gray-600 bg-white' : 'border-gray-200 bg-white'"
                      loading="lazy"
                      decoding="async"
                      @error="onLightningQrError"
                    />
                    <button
                      v-if="lightningAddress"
                      type="button"
                      class="absolute inset-0 rounded-md transition-colors hover:bg-black/[0.06] active:bg-black/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      :class="isFromLanding ? 'focus-visible:ring-offset-[#e4e8e7]' : effectiveDark ? 'focus-visible:ring-offset-gray-800' : 'focus-visible:ring-offset-gray-100'"
                      aria-label="Copy Lightning payment link to clipboard"
                      @click="copyLightningAddress"
                    />
                  </div>
                  <span
                    :class="['text-center text-[8px] leading-none uppercase tracking-wide text-balance max-w-[4.25rem]', isFromLanding ? 'text-gray-500' : effectiveDark ? 'text-gray-500' : 'text-gray-500']"
                  >
                    <template v-if="lightningAddress">
                      {{ copyLightningStatus === 'copied' ? 'Copied' : copyLightningStatus === 'error' ? 'Retry' : 'Scan · tap' }}
                    </template>
                    <template v-else>Scan</template>
                  </span>
                </div>
              </div>
              <p
                v-if="lightningQrLoaded === false && lightningQrPath"
                :class="['mt-2 text-[11px] leading-snug', isFromLanding ? 'text-gray-600' : effectiveDark ? 'text-gray-500' : 'text-gray-500']"
              >
                QR did not load. Add <span class="font-mono">public/images/lightning-donation-qr.png</span> or set <span class="font-mono">NUXT_PUBLIC_LIGHTNING_DONATION_QR_PATH</span>.
              </p>
            </div>
          </div>
        </div>

        <!-- Tech Stack -->
        <div :class="['rounded-2xl border p-8', isFromLanding ? 'bg-white/10 backdrop-blur-md border-white/15 shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)] dark:bg-white/10 dark:border-white/15' : (effectiveDark ? 'bg-gray-800 border-gray-700 text-gray-200 shadow-sm' : 'bg-gray-100 border-gray-300 text-gray-800 shadow-sm')]">
          <h2 :class="['text-xl font-semibold font-quicksand mb-6', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-white' : 'text-gray-900')]">
            Built With
          </h2>
          <div class="flex flex-wrap gap-3">
            <span
              v-for="tech in ['Nuxt 4', 'Vue 3', 'TypeScript', 'Tailwind CSS']"
              :key="tech"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-quicksand font-medium',
                isFromLanding ? 'bg-white/60 text-gray-900 border border-white/30 dark:bg-white/60 dark:text-gray-900' : (effectiveDark ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700 border border-gray-200')
              ]"
            >
              {{ tech }}
            </span>
          </div>
        </div>

        <!-- Footer -->
        <div v-if="!isFromLanding" class="mt-12 text-center">
          <p :class="['text-sm', effectiveDark ? 'text-gray-500' : 'text-gray-500']">
            Made with ❤️ by the aviation community
          </p>
        </div>
      </div>
    </main>

    <!-- Marketing Footer -->
    <footer v-if="isFromLanding" class="relative z-10 border-t border-white/10 bg-white/5 backdrop-blur-md pb-6 pt-2 mt-12 transition-colors duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 text-center">
        <p class="text-sm font-medium text-gray-600 dark:text-gray-600">
          <NuxtLink to="/integrations" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Integrations</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/pricing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Pricing</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/data-sources?from=landing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Data sources</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/terms?from=landing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Terms of Service</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/privacy?from=landing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Privacy Policy</NuxtLink>
        </p>
      </div>
    </footer>

    <!-- Auth Modal -->
    <ClientOnly>
      <AuthModal 
        v-if="showAuth" 
        :initial-tab="authTab"
        @close="showAuth = false" 
        @success="handleAuthSuccess"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from '#imports'
import AuthModal from '~/components/AuthModal.vue'

const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()

const lightningAddress = computed(() => {
  const v = runtimeConfig.public.lightningDonationAddress
  return typeof v === 'string' ? v.trim() : ''
})

const lightningQrPath = computed(() => {
  const v = runtimeConfig.public.lightningDonationQrPath
  return typeof v === 'string' ? v.trim() : ''
})

/** `null` until error: show `<img>`; `false` after `@error` hides broken asset */
const lightningQrLoaded = ref<boolean | null>(null)

function onLightningQrError() {
  lightningQrLoaded.value = false
}

const copyLightningStatus = ref<'idle' | 'copied' | 'error'>('idle')

async function copyLightningAddress() {
  if (!lightningAddress.value || !import.meta.client) return
  try {
    await navigator.clipboard.writeText(lightningAddress.value)
    copyLightningStatus.value = 'copied'
    window.setTimeout(() => {
      copyLightningStatus.value = 'idle'
    }, 2000)
  } catch {
    copyLightningStatus.value = 'error'
    window.setTimeout(() => {
      copyLightningStatus.value = 'idle'
    }, 2500)
  }
}

const showAuth = ref(false)
const authTab = ref<'signin' | 'signup'>('signin')

const openAuth = (tab: 'signin' | 'signup') => {
  authTab.value = tab
  showAuth.value = true
}

const handleAuthSuccess = () => {
  window.location.href = '/dashboard'
}

const backTarget = computed(() => {
  const from = route.query.from
  if (from === 'landing') return '/'
  if (from === 'dashboard' || from === 'app') return '/dashboard'
  return '/dashboard' // default
})

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push(backTarget.value)
  }
}

const { theme, isDark } = useTheme()
/** `?from=landing` uses marketing shell; app chrome uses theme. */
const isFromLanding = computed(() => route.query.from === 'landing')
const effectiveDark = computed(() => isDark.value && !isFromLanding.value)

// Clock State
type ClockFormat = '12' | '24'
type ClockZone = 'UTC' | 'Local'
const clockFormat = ref<ClockFormat>('24')
const clockZone = ref<ClockZone>('UTC')
const now = ref<Date>(new Date())
let clockTimer: number | null = null

const displayClock = computed(() => {
  const date = now.value
  const use12Hour = clockFormat.value === '12'
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: use12Hour,
    timeZone: clockZone.value === 'UTC' ? 'UTC' : undefined
  }
  const time = date.toLocaleTimeString(undefined, options)
  if (clockZone.value === 'UTC') {
    return `${time} UTC`
  }
  return time
})

function loadClockPrefs(): void {
  // Check if we're in the browser environment
  if (import.meta.server) return
  
  const savedFmt = window.localStorage.getItem('logifi-clock-format')
  const savedZone = window.localStorage.getItem('logifi-clock-zone')
  if (savedFmt === '12' || savedFmt === '24') {
    clockFormat.value = savedFmt
  }
  if (savedZone === 'UTC' || savedZone === 'Local') {
    clockZone.value = savedZone
  }
}

onMounted(() => {
  if (route.query.from === 'landing') return
  loadClockPrefs()
  clockTimer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (clockTimer) {
    clearInterval(clockTimer)
  }
})
</script>

<style>
@keyframes cta-shimmer {
  0%,
  100% {
    transform: translateX(-140%) skewX(-14deg);
  }
  50% {
    transform: translateX(140%) skewX(-14deg);
  }
}

.btn-cta-primary {
  position: relative;
  overflow: hidden;
}

.btn-cta-primary::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(
    105deg,
    transparent 38%,
    rgba(255, 255, 255, 0.12) 50%,
    transparent 62%
  );
  animation: cta-shimmer 3.2s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .btn-cta-primary::after {
    animation: none;
    opacity: 0;
  }
}
</style>
