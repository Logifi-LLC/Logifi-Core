<template>
  <!-- Force light theme on landing: dark: overrides so links/header stay light even when app uses dark mode -->
  <div class="min-h-screen bg-[#e4e8e7] font-quicksand text-gray-900 overflow-x-hidden dark:bg-[#e4e8e7] dark:text-gray-900">
    <!-- Sticky Header -->
    <header 
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b bg-white/80 backdrop-blur-md border-[#e4e8e7] dark:bg-white/80 dark:border-[#e4e8e7]"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div class="flex items-center">
          <img src="/images/logifi-logo.png" alt="Logifi" class="h-32 w-auto brightness-0" />
        </div>
        
        <nav class="hidden md:flex items-center space-x-8">
          <a href="#features" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Features</a>
          <NuxtLink to="/developers?from=landing" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Developers</NuxtLink>
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
            class="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
          >
            Get Started
          </button>
        </nav>

        <!-- Mobile Menu Button -->
        <button class="md:hidden p-2 text-gray-600 dark:text-gray-600">
          <Icon name="ri:menu-line" size="24" />
        </button>
      </div>
    </header>

    <!-- Hero Section -->
    <main>
      <section class="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-[url('/images/hero-bg.png')] bg-cover bg-center bg-no-repeat">
        <!-- Overlay to ensure text readability -->
        <div class="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-0"></div>
        <div class="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-[#e4e8e7] z-0"></div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div class="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-8 animate-fade-in dark:bg-blue-50 dark:border-blue-100 dark:text-blue-700">
            <span class="mr-2">✨</span> NOW IN BETA
          </div>
          
          <h1 class="text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-8 animate-slide-up dark:text-gray-900">
            The Future of <br />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-600 dark:to-indigo-600">Pilot Logbooks</span>
          </h1>
          
          <p class="max-w-2xl mx-auto text-xl text-gray-600 mb-12 animate-slide-up delay-100 dark:text-gray-600">
            Logifi is constantly innovating with new technology to keep your records secure, organized, and FAA-compliant.
          </p>
          
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up delay-200">
            <button 
              @click="openAuth('signup')"
              class="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
            >
              Get Started
            </button>
            <button 
              @click="openAuth('signin')"
              class="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 text-lg font-bold rounded-xl border border-[#d1d8d6] hover:border-blue-200 hover:bg-blue-50/50 transition-all active:scale-[0.98] dark:bg-white dark:text-gray-900 dark:border-[#d1d8d6] dark:hover:border-blue-200 dark:hover:bg-blue-50/50"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section id="features" class="py-24 bg-[#e4e8e7] dark:bg-[#e4e8e7]">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl font-bold text-gray-900 sm:text-4xl dark:text-gray-900">Everything you need</h2>
            <p class="mt-4 text-lg text-gray-600 dark:text-gray-600">Built by pilots, for pilots.</p>
          </div>
          
          <!-- Current Features -->
          <div class="mb-20">
            <h3 class="text-2xl font-bold text-gray-900 mb-8 text-center dark:text-gray-900">Features</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div v-for="(feature, i) in features" :key="i" class="bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-[#e4e8e7] dark:bg-white dark:border-[#e4e8e7]">
                <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 dark:bg-blue-50 dark:text-blue-600">
                  <Icon :name="feature.icon" size="24" />
                </div>
                <h3 class="text-xl font-bold mb-3 dark:text-gray-900">{{ feature.title }}</h3>
                <p class="text-gray-600 leading-relaxed dark:text-gray-600">{{ feature.description }}</p>
              </div>
            </div>
          </div>

          <!-- Features to Come -->
          <div>
            <h3 class="text-2xl font-bold text-gray-900 mb-8 text-center dark:text-gray-900">Features to Come</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div v-for="(feature, i) in featuresToCome" :key="i" class="bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-[#e4e8e7] dark:bg-white dark:border-[#e4e8e7]">
                <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 dark:bg-blue-50 dark:text-blue-600">
                  <Icon :name="feature.icon" size="24" />
                </div>
                <h3 class="text-xl font-bold mb-3 dark:text-gray-900">{{ feature.title }}</h3>
                <p class="text-gray-600 leading-relaxed dark:text-gray-600">{{ feature.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="mt-16 py-8 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-500">
          <NuxtLink to="/terms?from=landing" class="text-gray-600 hover:text-blue-600 hover:underline dark:text-gray-600 dark:hover:text-blue-600">Terms of Service</NuxtLink>
          <span class="mx-2">·</span>
          <NuxtLink to="/privacy?from=landing" class="text-gray-600 hover:text-blue-600 hover:underline dark:text-gray-600 dark:hover:text-blue-600">Privacy Policy</NuxtLink>
        </p>
      </footer>
    </main>

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
import { ref } from 'vue'
import AuthModal from '~/components/AuthModal.vue'

const showAuth = ref(false)
const authTab = ref<'signin' | 'signup'>('signin')

const openAuth = (tab: 'signin' | 'signup') => {
  authTab.value = tab
  showAuth.value = true
}

const handleAuthSuccess = () => {
  // In Core, after auth we send users to the main app dashboard
  window.location.href = '/dashboard'
}

const features = [
  {
    title: 'Open Source Logbook',
    description: 'Built with transparency and community collaboration. View our code, contribute, and help shape the future of digital flight logging.',
    icon: 'ri:open-source-line'
  },
  {
    title: 'FAA Compliant',
    description: 'Rest easy knowing your records meet all AC 120-78B requirements. Digital signatures coming soon.',
    icon: 'ri:shield-check-line'
  },
  {
    title: 'Import/Export Instantly',
    description: 'Generate formatted PDFs or CSVs for interviews, checkrides, or backups. Import from existing logbooks seamlessly.',
    icon: 'ri:file-download-line'
  }
] as const

const featuresToCome = [
  {
    title: 'Digifi',
    description: 'AI-powered digitization of paper logbooks with advanced handwriting recognition technology.',
    icon: 'ri:scan-line'
  },
  {
    title: 'Student/Instructor Portals',
    description: 'Dedicated portals for flight training with progress tracking and collaborative logbook management.',
    icon: 'ri:user-star-line'
  },
  {
    title: 'Community Driven Improvements',
    description: 'Your feedback shapes our roadmap. Join our community to suggest features and ideas on what we build next.',
    icon: 'ri:community-line'
  }
] as const
</script>

<style>
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 1s ease-out forwards;
}

.animate-slide-up {
  opacity: 0;
  animation: slide-up 0.8s ease-out forwards;
}

.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
</style>
