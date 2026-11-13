<template>
  <div class="min-h-screen bg-[#0a0e1a] font-quicksand text-gray-100">
    <ClientOnly>
      <AuthModal
        v-if="showModal"
        :initial-tab="initialTab"
        :referral-open-count="referralOpenCount"
        @close="handleClose"
        @success="handleSuccess"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AuthModal from '~/components/AuthModal.vue'
import { captureReferralFromSearch, storeReferralCode } from '~/utils/referralCapture'

const props = defineProps<{
  initialTab: 'signin' | 'signup'
}>()

const router = useRouter()
const showModal = ref(true)
const referralOpenCount = ref(0)

onMounted(() => {
  if (typeof window === 'undefined') return
  const code = captureReferralFromSearch(window.location.search)
  if (code) {
    storeReferralCode(code)
    if (props.initialTab === 'signup') referralOpenCount.value = 1
  }
})

function handleClose() {
  showModal.value = false
  void router.push('/')
}

function handleSuccess() {
  if (typeof window !== 'undefined') {
    window.location.href = '/dashboard'
  }
}
</script>
