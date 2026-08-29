<template>
<div
  ref="rootScrollContainerRef"
  :class="[
    isIos
      ? 'h-dvh overflow-y-auto overscroll-y-contain transition-colors duration-300 font-quicksand'
      : 'min-h-screen overflow-y-auto transition-colors duration-300 font-quicksand',
    isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
  ]"
>
  <!-- Auth Modal -->
  <AuthModal
    v-if="showAuthModal"
    :is-dark-mode="isDarkMode"
    :dismissible="!isIos"
    @close="showAuthModal = false"
    @success="showAuthModal = false"
  />

  <!-- Audit Trail Modal -->
  <AuditTrail
    :is-open="showAuditTrail"
    :entry-id="auditTrailEntryId"
    :is-dark-mode="isDarkMode"
    :local-entry="logEntries?.find(e => e.id === auditTrailEntryId)"
    @close="showAuditTrail = false"
    @restored="handleEntryRestored"
  />

  <!-- Audit Trail Sidebar (inline edit + entry form drawer) -->
  <Teleport to="body" :disabled="!isIos">
    <Transition name="fade">
      <div
        v-if="isIos && showAuditTrailSidebar && activeAuditTrailEntryId"
        class="fixed inset-0 z-[65] bg-black/50"
        aria-hidden="true"
        @click="closeAuditTrailSidebar"
      />
    </Transition>
    <Transition name="slide-left">
      <div
        v-if="showAuditTrailSidebar && activeAuditTrailEntryId"
        :class="[
          isIos
            ? 'fixed inset-0 z-[70] h-[100dvh] w-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl overflow-hidden flex flex-col'
            : 'fixed left-0 top-0 h-full w-full max-w-[400px] z-[60] shadow-2xl',
          isDarkMode
            ? 'bg-gray-900 border-r border-white/10 shadow-md shadow-black/40'
            : 'bg-white border-r border-gray-200 shadow-sm'
        ]"
      >
        <div class="h-full flex flex-col min-h-0 min-w-0">
          <!-- Sidebar Header -->
          <div
            :class="[
              'flex items-center justify-between p-4 border-b flex-shrink-0',
              isDarkMode ? 'border-gray-700' : 'border-gray-300'
            ]"
          >
            <div>
              <h2 :class="['text-lg font-bold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                Audit Trail
              </h2>
              <p :class="['text-xs mt-1 font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                History of changes
              </p>
            </div>
            <button
              @click="closeAuditTrailSidebar"
              :class="[
                'p-2 rounded-lg transition-colors',
                isDarkMode
                  ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              ]"
              aria-label="Close audit trail"
            >
              <Icon name="ri:close-line" size="20" />
            </button>
          </div>

          <!-- Sidebar Content -->
          <div
            :class="[
              'flex-1 min-h-0 overflow-y-auto p-4',
              isIos ? 'audit-trail-ios-scroll' : ''
            ]"
          >
            <AuditTrail
              :key="`${activeAuditTrailEntryId}-${auditTrailRefreshKey}`"
              :is-open="true"
              :entry-id="activeAuditTrailEntryId"
              :is-dark-mode="isDarkMode"
              :local-entry="activeAuditTrailLocalEntry"
              :is-sidebar="true"
              @close="closeAuditTrailSidebar"
              @restored="handleEntryRestored"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Currency Dashboard Modal -->
  <CurrencyDashboard
    :is-open="showCurrencyDashboard"
    :is-dark-mode="isDarkMode"
    :passenger-currency="passengerCurrency"
    :night-currency="nightCurrency"
    :instrument-currency="instrumentCurrency"
    :annual-requirements="annualRequirements"
    :is-loading="isLoadingCurrency"
    :error="currencyError"
    @close="showCurrencyDashboard = false"
  />

  <!-- Migration Progress (if migrating) -->
  <div
    v-if="isMigrating"
    :class="[
      'fixed top-20 left-1/2 transform -translate-x-1/2 z-50 rounded-lg border p-4 shadow-2xl max-w-md',
      isDarkMode 
                  ? 'bg-gray-900 border-white/10 shadow-xl shadow-black/50' 
                  : 'bg-white border-gray-200'
    ]"
  >
    <div class="flex items-center gap-3">
      <Icon name="ri:loader-4-line" size="24" class="animate-spin" :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'" />
      <div class="flex-1">
        <div :class="['text-sm font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
          Migrating your data...
        </div>
        <div :class="['text-xs mt-1 font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
          {{ migrationProgress.step === 'entries' ? `Entries: ${migrationProgress.current}/${migrationProgress.total}` : '' }}
          {{ migrationProgress.step === 'profile' ? 'Migrating profile...' : '' }}
          {{ migrationProgress.step === 'crew' ? `Crew profiles: ${migrationProgress.current}` : '' }}
        </div>
      </div>
    </div>
  </div>

  <!-- Pull-to-refresh indicator (iOS) -->
  <div
    v-if="isIos && (pullDistance > 0 || isPullRefreshing)"
    class="fixed left-0 right-0 top-0 z-40 flex items-end justify-center pointer-events-none pb-2"
    :style="{ height: `calc(env(safe-area-inset-top, 0px) + ${isPullRefreshing ? 100 : pullDistance}px)` }"
  >
    <div
      class="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium font-quicksand shadow-md"
      :class="isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-700'"
    >
      <Icon
        :name="isPullRefreshing ? 'ri:loader-4-line' : 'ri:arrow-down-line'"
        size="16"
        :class="{
          'animate-spin': isPullRefreshing,
          'rotate-180': pullDistance >= 100 && !isPullRefreshing,
        }"
      />
      {{ isPullRefreshing ? 'Syncing...' : pullDistance >= 100 ? 'Release to sync' : 'Pull to sync' }}
    </div>
  </div>

  <!-- iOS sync status banner -->
  <div
    v-if="isIos && iosSyncBannerVisible"
    class="fixed left-0 right-0 z-[55] px-4 pointer-events-auto"
    :style="{ top: 'calc(env(safe-area-inset-top, 0px) + 3.25rem)' }"
  >
    <div
      :class="[
        'rounded-lg border px-3 py-2 text-xs font-quicksand flex items-center justify-between gap-2 shadow-md',
        iosSyncStatus === 'error'
          ? isDarkMode
            ? 'border-red-700/50 bg-red-950/90 text-red-200'
            : 'border-red-300 bg-red-50 text-red-800'
          : iosSyncStatus === 'success'
            ? isDarkMode
              ? 'border-green-700/50 bg-green-950/90 text-green-200'
              : 'border-green-300 bg-green-50 text-green-800'
            : isDarkMode
              ? 'border-blue-700/50 bg-gray-900/95 text-gray-200'
              : 'border-blue-200 bg-white text-gray-800'
      ]"
    >
      <div class="flex items-center gap-2 min-w-0">
        <Icon
          v-if="iosSyncStatus === 'loading'"
          name="ri:loader-4-line"
          size="14"
          class="animate-spin flex-shrink-0"
        />
        <span class="truncate">{{ iosSyncMessage }}</span>
      </div>
      <button
        v-if="iosSyncStatus === 'error'"
        type="button"
        class="flex-shrink-0 rounded-md px-2 py-1 text-xs font-semibold underline-offset-2 hover:underline"
        @click="retryIosSync"
      >
        Retry
      </button>
    </div>
  </div>

  <!-- Main Content (only show when authenticated) -->
  <div v-if="isAuthenticated && !authLoading">
    <div :style="pullTransformStyle">
      <header>
      <div
        :class="[
          'left-0 right-0 z-50 transition-colors duration-300',
          isIos
            ? 'sticky inset-x-0 top-0 border-b backdrop-blur-sm pt-[env(safe-area-inset-top)]'
            : 'fixed top-0',
          isDarkMode
            ? isIos
              ? 'border-gray-700/50 bg-gray-950/95'
              : 'border-gray-700/50'
            : isIos
              ? 'border-gray-200 bg-gray-50/95'
              : 'border-gray-400/50'
        ]"
      >
        <div
          :class="[
            'mr-auto px-6 sm:px-8 flex items-center justify-between relative',
            isIos ? 'py-2' : 'py-4'
          ]"
        >
        <div class="flex items-center gap-2 min-w-0">
          <button
            v-if="isIos"
            type="button"
            class="relative flex-shrink-0 p-2 rounded-lg transition-colors"
            :class="[
              isDarkMode
                ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
            ]"
            aria-label="Open Logbook Catalog"
            @click="openCatalogDrawer"
          >
            <Icon name="ri:database-2-line" :size="24" />
            <span
              v-if="activeCatalogFilterCount > 0"
              class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white"
            >
              {{ activeCatalogFilterCount > 9 ? '9+' : activeCatalogFilterCount }}
            </span>
          </button>
        <a v-if="!isIos" class="left" href="/dashboard">
            <img
              src="/images/logifi-logo.png"
              alt="logifi"
              :class="[
                'w-auto transition-all duration-300',
                'h-20 sm:h-24 lg:h-28',
                isDarkMode ? '' : 'brightness-[0.2]'
              ]"
            />
          </a>
        </div>
        <div class="absolute inset-x-0 flex justify-center pointer-events-none">
          <span
            :class="[
              'px-3 py-1 rounded-md text-xl font-quicksand font-semibold select-none',
              isDarkMode ? 'text-gray-200' : 'text-gray-800'
            ]"
            aria-live="polite"
          >
            {{ displayClock }}
          </span>
        </div>
        <nav class="flex items-center gap-2 relative z-10">
          <NuxtLink
            to="/feedback?from=dashboard"
            class="hidden sm:inline-block text-xs sm:text-sm font-medium font-quicksand transition-colors mr-2"
            :class="[
              isDarkMode
                ? 'text-gray-300 hover:text-blue-400'
                : 'text-gray-600 hover:text-blue-600'
            ]"
            aria-label="Send feedback about Logifi"
          >
            Feedback
          </NuxtLink>
          <button
            type="button"
            @click="openSettings()"
            :class="[
              'h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center text-sm sm:text-base font-bold transition-all duration-200 shadow-sm border',
              isDarkMode 
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/40' 
                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            ]"
            aria-label="Profile & Settings"
          >
            {{ pilotInitials }}
          </button>
        </nav>
          </div>
        </div>
      </header>

    <main
      :class="[
        'min-h-screen flex flex-col px-4 sm:px-6 lg:px-8 transition-colors duration-300 overflow-x-hidden',
        isIos
          ? 'pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]'
          : 'pt-40 pb-20',
        isDarkMode ? '' : ''
      ]"
    >
      <section
        v-show="showFcvFetchPanel && !isIos"
        ref="fcvFetchSectionRef"
        :class="[
          'mr-auto mb-8 w-full rounded-2xl border p-4 sm:p-6 space-y-4',
          isDarkMode ? 'bg-gray-900 border-white/10 text-gray-200 shadow-md shadow-black/40' : 'bg-white border-gray-200 text-gray-900 shadow-sm'
        ]"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 :class="['text-base sm:text-lg font-semibold font-quicksand', isDarkMode ? 'text-gray-100' : 'text-gray-900']">
                Airline schedule
              </h3>
              <AutofiBetaPill :is-dark-mode="isDarkMode" />
            </div>
            <p :class="['text-sm mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
              Fetch and import flights from Republic (RJET) FLICA.
            </p>
          </div>
          <button
            type="button"
            :class="[
              'inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-quicksand font-medium transition-colors',
              isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
            @click="closeFcvFetchUi"
          >
            Close
          </button>
        </div>

        <div :class="['space-y-4 rounded-2xl border p-4 sm:p-6', isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-white border-gray-200 shadow-sm']">
          <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
            <NuxtLink
              to="/data-sources?from=dashboard"
              :class="isDarkMode ? 'text-blue-400 hover:underline' : 'text-blue-700 hover:underline'"
            >
              Data sources &amp; third-party APIs
            </NuxtLink>
          </p>
          <FcvSync
            :key="`flica-fetch-${showFcvFetchPanel ? 'open' : 'closed'}`"
            mode="fetch"
            :is-dark-mode="isDarkMode"
            :external-connected="dashboardFcvConnected"
            :before-duplicate-check="prepareLogbookForFcvImport"
            :pending-sync-count="queueLength"
            :catalog-person-names="catalogPersonNames"
            :tail-catalog-family-by-tail="tailCatalogFamilyByTail"
            @imported="handleFcvImported"
            @connection-changed="handleFlicaConnectionChanged"
          />
          <p
            v-if="fcvImportMessage"
            :class="['text-xs mt-2', isDarkMode ? 'text-emerald-400' : 'text-emerald-600']"
          >
            {{ fcvImportMessage }}
          </p>
        </div>
      </section>

      <!-- iOS: fullscreen airline schedule import sheet -->
      <Teleport to="body">
        <Transition name="fade">
          <div
            v-if="isIos && showFcvFetchPanel"
            class="fixed inset-0 z-[65] flex flex-col font-quicksand"
            :class="isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'"
          >
            <header
              class="shrink-0 border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
              :class="isDarkMode ? 'border-gray-800 bg-gray-900/95' : 'border-gray-200 bg-gray-50/95'"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2 min-w-0">
                  <h2 class="text-base font-semibold font-quicksand">Airline schedule</h2>
                  <AutofiBetaPill :is-dark-mode="isDarkMode" />
                </div>
                <button
                  type="button"
                  class="rounded-lg px-2 py-1.5 text-sm font-semibold font-quicksand transition-colors"
                  :class="isDarkMode ? 'text-blue-400 hover:bg-gray-800' : 'text-blue-600 hover:bg-gray-200'"
                  @click="closeFcvFetchUi"
                >
                  Done
                </button>
              </div>
              <p
                :class="['text-xs mt-1 font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-600']"
              >
                Pull new flights from Republic (RJET) FLICA. Review before importing.
              </p>
            </header>
            <div
              class="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4"
            >
              <FcvSync
                key="flica-ios-sheet"
                mode="fetch"
                compact
                :is-dark-mode="isDarkMode"
                :external-connected="dashboardFcvConnected"
                :before-duplicate-check="prepareLogbookForFcvImport"
                :pending-sync-count="queueLength"
                :catalog-person-names="catalogPersonNames"
                :tail-catalog-family-by-tail="tailCatalogFamilyByTail"
                @imported="handleFcvImported"
                @connection-changed="handleFlicaConnectionChanged"
              />
            </div>
          </div>
        </Transition>
      </Teleport>

      <div class="mr-auto w-full max-w-full flex flex-col gap-10 lg:flex-row">
        <Teleport to="body" :disabled="!isIos">
          <Transition name="fade">
            <div
              v-if="isIos && isCatalogDrawerOpen"
              class="fixed inset-0 z-40 bg-black/50"
              aria-hidden="true"
              @click="closeCatalogDrawer"
            />
          </Transition>
          <Transition name="slide-left">
          <aside
            v-if="!isIos || isCatalogDrawerOpen"
            ref="catalogDrawerRef"
            :class="[
            'flex-shrink-0 rounded-2xl border text-left font-quicksand transition-all duration-300 flex flex-col',
            isDarkMode
              ? 'bg-gray-900 border-white/10 text-gray-200 shadow-md shadow-black/40'
              : 'bg-gray-100 border-gray-200 text-gray-800 shadow-sm',
            isIos
              ? 'catalog-drawer-ios fixed left-0 top-0 z-50 h-[100dvh] w-full max-w-sm overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] px-5 py-6 shadow-2xl'
              : isSidebarCollapsed
                ? 'lg:w-16 px-3 py-4'
                : 'lg:w-72 xl:w-80 px-5 py-6'
          ]"
        >
          <div :class="['flex items-center mb-6 flex-shrink-0', isSidebarCollapsed && !isIos ? 'justify-center' : 'justify-between']">
            <div v-show="!isSidebarCollapsed || isIos" class="flex-1">
              <h2 :class="['text-lg font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                Logbook Catalog
              </h2>
              <p :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Grows from saved entries and Digifi imports. Corrections teach future scans.
              </p>
        </div>
            <div class="flex items-center gap-2">
              <Icon 
                v-show="!isSidebarCollapsed && !isIos"
                :name="'ri:database-2-line'" 
                :size="22" 
                :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" 
              />
              <button
                v-if="isIos"
                type="button"
                @click="closeCatalogDrawer"
                :class="[
                  'p-1.5 rounded-lg transition-colors',
                  isDarkMode
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                    : 'hover:bg-gray-200 text-gray-600 hover:text-gray-700'
                ]"
                aria-label="Close Logbook Catalog"
              >
                <Icon name="ri:close-line" :size="20" />
              </button>
              <button
                v-else
                @click="toggleSidebar"
                :class="[
                  'p-1.5 rounded-lg transition-colors',
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                    : 'hover:bg-gray-200 text-gray-600 hover:text-gray-700'
                ]"
                :aria-label="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
              >
                <Icon 
                  :name="isSidebarCollapsed ? 'ri:menu-unfold-line' : 'ri:menu-fold-line'" 
                  :size="20" 
                />
              </button>
            </div>
          </div>
          <div
            v-show="!isSidebarCollapsed || isIos"
            :class="isIos ? 'catalog-drawer-ios-scroll flex-1 min-h-0 overflow-y-auto' : 'flex-1'"
          >
            <div class="space-y-6">
            <div
              v-if="isIos && iosCatalogBuilding"
              :class="[
                'rounded-xl border px-4 py-8 text-center text-sm font-quicksand',
                isDarkMode
                  ? 'bg-white/5 border-white/10 text-gray-400'
                  : 'bg-white border-gray-200 text-gray-500'
              ]"
            >
              Building filters…
            </div>
            <template v-if="!isIos || !iosCatalogBuilding">
            <div
              v-for="section in catalogSections"
              :key="section.key"
              :class="[
                'rounded-xl border px-4 py-4 transition-colors duration-300',
                isDarkMode
                  ? 'bg-white/5 border-white/10 shadow-sm shadow-black/20'
                  : 'bg-white border-gray-200 shadow-sm'
              ]"
            >
            <button 
                type="button"
                class="flex w-full items-center justify-between gap-3 text-left"
                @click="toggleCatalogSection(section.key)"
                :aria-expanded="catalogOpenState[section.key]"
              >
                <div class="flex items-center gap-2">
                  <Icon :name="section.icon" :size="18" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-600']" />
                  <h3 :class="['text-sm font-semibold font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                    {{ section.label }}
                  </h3>
              </div>
          <div class="flex items-center gap-3">
                  <span :class="['text-xs uppercase tracking-wider font-quicksand', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                      {{ section.key === 'aircraft' ? (catalogs.totalAircraftItems || catalogs.families?.length || catalogs[section.key].length) : catalogs[section.key].length }}
                  </span>
                  <Icon
                    name="ri:arrow-down-s-line"
                    :size="16"
                    :class="[
                      'transition-transform',
                      isDarkMode ? 'text-gray-400' : 'text-gray-500',
                      catalogOpenState[section.key] ? 'rotate-180' : ''
                    ]"
              />
              </div>
            </button>
              <div v-show="catalogOpenState[section.key]" class="mt-3 space-y-3">
                <label class="block">
                  <span class="sr-only">Search {{ section.label }}</span>
                  <input
                    v-model="catalogSearchTerms[section.key]"
                    type="text"
                    :placeholder="`Search ${section.label.toLowerCase()}...`"
                    :class="[
                      'w-full rounded-lg border px-2.5 py-1.5 text-xs font-quicksand',
                      isDarkMode
                        ? 'bg-black/20 border-white/10 text-white placeholder-gray-500 shadow-inner'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500',
                    ]"
                  />
                </label>
                <div
                    v-if="(section.key !== 'aircraft' && filteredCatalogItemsBySection[section.key].length === 0) || (section.key === 'aircraft' && filteredAircraftFamiliesList.length === 0)"
                  :class="['text-xs italic font-quicksand', isDarkMode ? 'text-gray-500' : 'text-gray-400']"
                >
                  No records yet.
          </div>

                  <!-- Aircraft: family tree -->
                  <template v-if="section.key === 'aircraft'">
                    <ul :class="['catalog-section-scroll space-y-2 text-sm max-h-56 overflow-y-auto pr-1 font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                      <li v-for="fam in filteredAircraftFamiliesList" :key="'fam-' + fam" class="space-y-1">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-2">
                            <input
                              type="checkbox"
                              @click.stop
                              :checked="!!selectedFilters.families[fam]"
                              @change="(e) => { const c = (e.target as HTMLInputElement).checked; selectedFilters.families[fam] = c }"
                            />
                            <button
                              type="button"
                              :aria-expanded="familyOpenState[fam]"
                              class="touch-manipulation select-none"
                              style="-webkit-touch-callout: none"
                              @click="onFamilyNameClick(fam)"
                              @contextmenu.prevent="showRenameFamilyContextMenu($event, fam)"
                              @pointerdown="onFamilyLongPressStart($event, fam)"
                              @pointermove="onFamilyLongPressMove($event)"
                              @pointerup="onFamilyLongPressEnd"
                              @pointercancel="onFamilyLongPressCancel"
                              :class="[
                                'inline-flex items-center gap-1 px-1 py-0.5 rounded',
                                isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-300'
                              ]"
                            >
                              <Icon
                                name="ri:arrow-down-s-line"
                                :size="14"
                                :class="[
                                  'shrink-0 transition-transform',
                                  isDarkMode ? 'text-gray-400' : 'text-gray-500',
                                  familyOpenState[fam] ? 'rotate-180' : ''
                                ]"
                              />
                              <span class="font-medium">{{ catalogs.familyDisplayName?.[fam] ?? fam }}</span>
                            </button>
                            <span :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                              ({{ catalogs.familyToItems?.[fam]?.length || 0 }})
                            </span>
                          </div>
                        </div>
                        <ul v-show="familyOpenState[fam]" class="ml-7 space-y-1">
                          <li
                            v-for="item in (filteredAircraftItemsByFamily[fam] || [])"
                            :key="'fam-item-' + fam + '-' + item"
                            class="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            @click="showAircraftInfo(item)"
                          >
                            <input
                              type="checkbox"
                              @click.stop
                              :checked="!!selectedFilters.aircraft[extractTailFromCatalogItem(item) || '']"
                              @change="(e) => {
                                const checked = (e.target as HTMLInputElement).checked
                                const tail = extractTailFromCatalogItem(item)
                                if (tail) selectedFilters.aircraft[tail] = checked
                              }"
                            />
                            <Icon :name="'ri:plane-line'" :size="14" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-600']" />
                            <span class="truncate" :title="item">{{ item }}</span>
                          </li>
                        </ul>
                      </li>
                    </ul>
                  </template>

                  <!-- Default: airports/pilots lists -->
                  <template v-else>
                    <ul
                  :class="[
                    'catalog-section-scroll space-y-2 text-sm max-h-48 overflow-y-auto pr-1 font-quicksand',
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  ]"
                >
                  <li
                    v-for="item in filteredCatalogItemsBySection[section.key]"
                    :key="`${section.key}-${item}`"
                    :class="[
                      'flex items-center gap-2 min-w-0',
                          (section.key === 'airports' || section.key === 'pilots') ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''
                        ]"
                        @click="section.key === 'airports' ? showAirportInfo(item) : section.key === 'pilots' ? showCrewProfile(item) : null"
                      >
                        <input
                          type="checkbox"
                          @click.stop
                          :checked="section.key === 'airports'
                            ? !!selectedFilters.airports[item]
                            : section.key === 'pilots'
                            ? !!selectedFilters.pilots[item]
                            : section.key === 'categoryClass'
                            ? !!selectedFilters.categoryClass[item]
                            : false"
                          @change="
                            (e) => {
                              const checked = (e.target as HTMLInputElement).checked
                              if (section.key === 'airports') {
                                selectedFilters.airports[item] = checked
                              } else if (section.key === 'pilots') {
                                selectedFilters.pilots[item] = checked
                              } else if (section.key === 'categoryClass') {
                                selectedFilters.categoryClass[item] = checked
                              }
                            }
                          "
                        />
                    <span class="truncate min-w-0 flex-1" :title="section.key === 'airports' ? getAirportDisplayText(item) : item">
                      {{ section.key === 'airports' ? getAirportDisplayText(item) : item }}
                    </span>
                  </li>
                </ul>
                  </template>
        </div>
            </div>
            </template>

          <!-- Conditions filter section -->
          <div v-show="!isSidebarCollapsed || isIos">
            <div
              :class="[
                'rounded-xl border px-4 py-4 transition-colors duration-300',
                isDarkMode ? 'bg-white/5 border-white/10 shadow-sm shadow-black/20' : 'bg-white border-gray-200 shadow-sm'
              ]"
            >
              <div class="flex items-center justify-between mb-2">
                <h3 :class="['text-sm font-semibold font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                  Conditions
                </h3>
                <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Optional filter
                </span>
              </div>
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="opt in activeConditionOptions"
                  :key="'filter-cond-' + opt.value"
                  :class="[
                    'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-quicksand cursor-pointer transition-all',
                    selectedFilters.conditions[opt.value]
                      ? (isDarkMode ? 'border-blue-500 bg-blue-900/40 text-blue-300' : 'border-blue-500 bg-blue-50 text-blue-700')
                      : (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200')
                  ]"
                >
                  <input
                    type="checkbox"
                    @click.stop
                    :checked="!!selectedFilters.conditions[opt.value]"
                    @change="(e) => { const c = (e.target as HTMLInputElement).checked; selectedFilters.conditions[opt.value] = c }"
                    :class="[
                      'h-4 w-4 rounded border transition-colors',
                      isDarkMode ? 'border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500' : 'border-gray-400 bg-gray-100 text-blue-600 focus:ring-blue-500'
                    ]"
                  />
                  <span>{{ opt.label }}</span>
                </label>
            </div>
                  </div>
                </div>

          <!-- Flag/Tag Entries filter section -->
          <div v-show="!isSidebarCollapsed || isIos">
            <div
              :class="[
                'rounded-xl border px-4 py-4 transition-colors duration-300',
                isDarkMode ? 'bg-white/5 border-white/10 shadow-sm shadow-black/20' : 'bg-white border-gray-200 shadow-sm'
              ]"
            >
              <div class="flex items-center justify-between mb-2">
                <h3 :class="['text-sm font-semibold font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                  Flag/Tag Entries
                </h3>
                <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Optional filter
                </span>
              </div>
              <label
                :class="[
                  'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-quicksand cursor-pointer transition-all',
                  isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200'
                ]"
              >
                <input
                  type="checkbox"
                  :checked="selectedFilters.flagged"
                  @change="(e) => { selectedFilters.flagged = (e.target as HTMLInputElement).checked }"
                  :class="[
                    'h-4 w-4 rounded border transition-colors',
                    isDarkMode ? 'border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500' : 'border-gray-400 bg-gray-100 text-blue-600 focus:ring-blue-500'
                  ]"
                />
                <Icon name="ri:flag-fill" :size="14" :class="[isDarkMode ? 'text-amber-400' : 'text-amber-600']" />
                <span>Show flagged entries only</span>
              </label>
              <div v-if="catalogTags.length > 0" class="mt-3 pt-3 border-t" :class="[isDarkMode ? 'border-gray-600' : 'border-gray-300']">
                <div :class="['text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Filter by tag</div>
                <div class="flex flex-wrap gap-1.5">
                  <label
                    v-for="tag in catalogTags"
                    :key="tag"
                    :class="[
                      'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-quicksand cursor-pointer transition-all',
                      selectedFilters.tags[tag]
                        ? (isDarkMode ? 'border-blue-500 bg-blue-900/40 text-blue-300' : 'border-blue-500 bg-blue-50 text-blue-700')
                        : (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200')
                    ]"
                  >
                    <input
                      type="checkbox"
                      :checked="!!selectedFilters.tags[tag]"
                      @change="(e) => { selectedFilters.tags[tag] = (e.target as HTMLInputElement).checked }"
                      :class="['h-3.5 w-3.5 rounded border transition-colors', isDarkMode ? 'border-gray-500 bg-gray-700' : 'border-gray-400 bg-gray-100']"
                    />
                    <span>{{ tag }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Filters active section -->
          <div v-show="!isSidebarCollapsed || isIos" class="relative settings-container pt-6">
            <div class="mb-3 flex items-center justify-between">
              <div :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Filters active:
                <span :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                  {{
                    Object.values(selectedFilters.aircraft).filter(Boolean).length +
                    Object.values(selectedFilters.airports).filter(Boolean).length +
                    Object.values(selectedFilters.pilots).filter(Boolean).length +
                    Object.values(selectedFilters.conditions).filter(Boolean).length +
                    Object.values(selectedFilters.families).filter(Boolean).length +
                    Object.values(selectedFilters.categoryClass).filter(Boolean).length +
                    Object.values(selectedFilters.tags).filter(Boolean).length +
                    (selectedFilters.flagged ? 1 : 0)
                  }}
                </span>
              </div>
                    <button
                      type="button"
                @click="clearAllFilters"
                      :class="[
                  'text-xs px-3 py-1 rounded-lg transition-colors font-quicksand',
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                ]"
              >
                Clear Filters
                    </button>
            </div>
          </div>
            </div>
          </div>
          <div v-show="isSidebarCollapsed && !isIos" class="flex flex-col items-center gap-4">
            <Icon 
              :name="'ri:database-2-line'" 
              :size="24" 
              :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" 
            />
            <div class="space-y-3">
              <div
                v-for="section in catalogSections"
                :key="section.key"
                class="flex flex-col items-center"
                :title="section.label"
              >
                <Icon 
                  :name="section.icon" 
                  :size="20" 
                  :class="[isDarkMode ? 'text-gray-400' : 'text-gray-600']" 
                />
                <span :class="['text-xs mt-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ catalogs[section.key].length }}
                </span>
            </div>
            </div>
          </div>
          </aside>
          </Transition>
        </Teleport>

        <div :class="['flex-1 space-y-12 min-w-0']">
          <section class="text-center lg:text-left">

            <div class="space-y-6">
              <div :class="[
                'p-6 rounded-2xl border text-left transition-colors duration-300',
                isDarkMode 
                  ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40' 
                  : 'bg-white border-gray-200 shadow-sm'
              ]">
                <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div class="flex flex-wrap items-center gap-3">
                    <div>
                      <h2 :class="['text-lg font-quicksand font-semibold', isDarkMode ? 'text-white' : 'text-gray-900']">
                        Totals Overview
                      </h2>
                      <p
                        v-if="dateRangeFilterSummary"
                        :class="['text-xs font-quicksand mt-0.5', isDarkMode ? 'text-blue-300/80' : 'text-blue-700']"
                      >
                        Filtering logbook to {{ dateRangeFilterSummary }} ({{ filteredEntries.length }} {{ filteredEntries.length === 1 ? 'entry' : 'entries' }})
                      </p>
                    </div>
                    <div class="flex rounded-lg border p-0.5" :class="isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-200'">
                      <button
                        type="button"
                        :class="[
                          'px-3 py-1.5 rounded-md text-xs font-quicksand transition-colors',
                          totalsViewMode === 'flight'
                            ? (isDarkMode ? 'bg-gray-600 text-white' : 'bg-white text-gray-900 shadow-sm')
                            : (isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900')
                        ]"
                        @click="setActiveLogbook('flight')"
                      >
                        Flight
                      </button>
                      <button
                        type="button"
                        :class="[
                          'px-3 py-1.5 rounded-md text-xs font-quicksand transition-colors',
                          totalsViewMode === 'sim'
                            ? (isDarkMode ? 'bg-gray-600 text-white' : 'bg-white text-gray-900 shadow-sm')
                            : (isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900')
                        ]"
                        @click="setActiveLogbook('simulator')"
                      >
                        Sim
                      </button>
                    </div>
                    <button
                      v-if="dashboardFcvConnected"
                      type="button"
                      :class="[
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-quicksand font-medium transition-colors border',
                        isDarkMode
                          ? 'border-blue-500/40 bg-blue-600/15 text-blue-300 hover:bg-blue-600/30'
                          : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
                      ]"
                      aria-label="Open Autofi"
                      @click="openFcvFetchSection"
                    >
                      <Icon name="ri:download-cloud-2-line" size="16" class="shrink-0" />
                      Autofi
                    </button>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      :class="[
                        'px-3 py-1.5 rounded-md text-xs font-quicksand transition-colors',
                        totalsTimeMode === 'all'
                          ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-800')
                      ]"
                      @click="totalsTimeMode = 'all'"
                    >
                      All time
                    </button>
                    <button
                      type="button"
                      :class="[
                        'px-3 py-1.5 rounded-md text-xs font-quicksand transition-colors',
                        totalsTimeMode === '30'
                          ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-800')
                      ]"
                      @click="totalsTimeMode = '30'"
                    >
                      Last 30 days
                    </button>
                    <button
                      type="button"
                      :class="[
                        'px-3 py-1.5 rounded-md text-xs font-quicksand transition-colors',
                        totalsTimeMode === '60'
                          ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-800')
                      ]"
                      @click="totalsTimeMode = '60'"
                    >
                      Last 60 days
                    </button>
                    <button
                      type="button"
                      :class="[
                        'px-3 py-1.5 rounded-md text-xs font-quicksand transition-colors',
                        totalsTimeMode === 'custom'
                          ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-800')
                      ]"
                      @click="totalsTimeMode = 'custom'"
                    >
                      Custom
                    </button>
                    <div v-if="totalsTimeMode === 'custom'" class="flex items-center gap-2">
                      <input
                        type="date"
                        v-model="totalsCustomStart"
                        :class="[
                          'px-2 py-1 rounded-md text-xs font-quicksand border',
                          isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900'
                        ]"
                      />
                      <span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-600']">to</span>
                      <input
                        type="date"
                        v-model="totalsCustomEnd"
                        :class="[
                          'px-2 py-1 rounded-md text-xs font-quicksand border',
                          isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900'
                        ]"
                      />
                    </div>
                  </div>
                </div>
                <!-- Flight totals (airplane time) -->
                <div
                  v-if="totalsViewMode === 'flight'"
                  :class="[
                    'grid gap-4',
                    isIos ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  ]"
                >
                  <div
                    v-for="summaryField in summaryFields"
                    :key="summaryField.key"
                    :class="[
                      'rounded-xl border text-left transition-all duration-300 relative overflow-hidden group',
                      isIos ? 'px-3 py-3' : 'px-4 py-5',
                      summaryField.key === 'totalTime'
                        ? (isDarkMode 
                            ? 'bg-blue-500/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                            : 'bg-gray-100 border-blue-200 shadow-md shadow-blue-100')
                        : (isDarkMode 
                            ? 'bg-white/5 border-white/10 hover:bg-white/10 shadow-sm shadow-black/20' 
                            : 'bg-gray-100 border-gray-200 hover:bg-gray-200 shadow-sm')
                    ]"
                  >
                    <!-- Decorative glow for Total Time -->
                    <div v-if="summaryField.key === 'totalTime'" class="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-colors duration-500"></div>
                    
                    <p
                      :title="summaryField.label"
                      :class="[
                      'text-xs uppercase tracking-wider font-semibold font-quicksand relative z-10',
                      summaryField.key === 'totalTime'
                        ? (isDarkMode ? 'text-blue-400' : 'text-blue-600')
                        : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                    ]">
                      {{ summaryField.cardLabel ?? summaryField.label }}
                    </p>
                    <p :class="[
                      'font-semibold font-quicksand mt-2 relative z-10',
                      summaryField.key === 'totalTime'
                        ? (isIos ? 'text-2xl tracking-tight' : 'text-3xl tracking-tight')
                        : (isIos ? 'text-xl' : 'text-2xl'),
                      summaryField.key === 'totalTime'
                        ? (isDarkMode ? 'text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-gray-900')
                        : (isDarkMode ? 'text-gray-200' : 'text-gray-900')
                    ]">
                      {{ formatTotalValue(summaryField.key) }}
                    </p>
                  </div>
                </div>
                <!-- Sim totals -->
                <div
                  v-else
                  :class="[
                    'grid gap-4',
                    isIos ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2',
                    !isIos && (pilotProfile.enableMilitaryFields ? 'lg:grid-cols-5' : 'lg:grid-cols-3')
                  ]"
                >
                  <div
                    v-for="summaryField in simOverviewFields"
                    :key="summaryField.key"
                    :class="[
                      'rounded-xl border text-left transition-all duration-300 relative overflow-hidden group',
                      isIos ? 'px-3 py-3' : 'px-4 py-5',
                      summaryField.key === 'totalTime'
                        ? (isDarkMode 
                            ? 'bg-blue-500/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                            : 'bg-gray-100 border-blue-200 shadow-md shadow-blue-100')
                        : (isDarkMode 
                            ? 'bg-white/5 border-white/10 hover:bg-white/10 shadow-sm shadow-black/20' 
                            : 'bg-gray-100 border-gray-200 hover:bg-gray-200 shadow-sm')
                    ]"
                  >
                    <div v-if="summaryField.key === 'totalTime'" class="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-colors duration-500"></div>
                    <p
                      :title="summaryField.label"
                      :class="[
                      'text-xs uppercase tracking-wider font-semibold font-quicksand relative z-10',
                      summaryField.key === 'totalTime'
                        ? (isDarkMode ? 'text-blue-400' : 'text-blue-600')
                        : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                    ]">
                      {{ summaryField.cardLabel ?? summaryField.label }}
                    </p>
                    <p :class="[
                      'font-semibold font-quicksand mt-2 relative z-10',
                      summaryField.key === 'totalTime'
                        ? (isIos ? 'text-2xl tracking-tight' : 'text-3xl tracking-tight')
                        : (isIos ? 'text-xl' : 'text-2xl'),
                      summaryField.key === 'totalTime'
                        ? (isDarkMode ? 'text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-gray-900')
                        : (isDarkMode ? 'text-gray-200' : 'text-gray-900')
                    ]">
                      {{ formatSimTotalValue(summaryField.key) }}
                    </p>
                  </div>
                </div>
    </div>
              <CurrencyStatusChips
                v-if="shouldShowCurrencyChips(showCurrencyChips) && hasAnyEntriesForActiveLogbook"
                :passenger-currency="passengerCurrency"
                :night-currency="nightCurrency"
                :instrument-currency="instrumentCurrency"
                :is-dark-mode="isDarkMode"
                @open="showCurrencyDashboard = true"
              />
<Transition
                enter-active-class="transition ease-out duration-300"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition ease-in duration-200"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2"
              >
                <div
                  v-if="showLatestBanner && latestUpdate"
                  :class="[
                    'relative p-6 rounded-2xl border text-left transition-colors duration-300 mb-6',
                    isDarkMode
                      ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40'
                      : 'bg-white border-gray-200 shadow-sm'
                  ]"
                >
                  <button
                    type="button"
                    class="absolute right-4 top-4 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200 transition-colors"
                    aria-label="Dismiss"
                    @click="dismissLatest"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <h2 :class="['text-lg font-quicksand font-semibold mb-3 pr-10', isDarkMode ? 'text-white' : 'text-gray-900']">
                    Updates!
                  </h2>
                  <ProductUpdateHeadline
                    v-if="latestUpdate.tagline"
                    :title="latestUpdate.title"
                    :tagline="latestUpdate.tagline"
                    :is-dark-mode="isDarkMode"
                    compact
                    heading-tag="p"
                  />
                  <p
                    v-else
                    :class="['text-sm font-quicksand font-semibold mb-3', isDarkMode ? 'text-white' : 'text-gray-900']"
                  >
                    {{ latestUpdate.title }}
                  </p>
                  <ul :class="['space-y-2 text-sm font-quicksand mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-600']">
                    <li v-for="(bullet, i) in latestUpdate.bullets.slice(0, 3)" :key="i">
                      {{ bullet }}
                    </li>
                  </ul>
                  <button
                    type="button"
                    :class="[
                      'text-sm font-quicksand font-semibold transition-colors',
                      isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                    ]"
                    @click="openSettingsUpdates"
                  >
                    View all updates
                  </button>
                </div>
              </Transition>
              <div
                v-if="!showLatestBanner"
                class="flex items-center justify-center"
              >
                <button
                  type="button"
                  :class="[
                    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-quicksand transition-colors',
                    isDarkMode
                      ? 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  ]"
                  @click="restoreLatestBanner"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Show updates
                </button>
              </div>
            </div>
          </section>

            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div class="max-w-xl text-left">
                <h2 :class="['text-2xl font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                  Logbook
            </h2>
      </div>
              <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end w-full lg:w-auto">
              <div class="flex flex-col gap-2 w-full sm:w-60">
                <div class="relative w-full">
              <input 
                    ref="searchInputRef"
                    v-model="searchTerm"
                    type="search"
                    placeholder="Search entries"
                    aria-keyshortcuts="/"
                    :class="[
                      'w-full rounded-lg border px-5 py-2 focus:outline-none focus:ring-2 font-quicksand transition-colors duration-300',
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:ring-blue-500' 
                        : 'border-gray-300 bg-gray-100 text-gray-900 placeholder-gray-400 focus:ring-blue-500'
                    ]"
              />
        <span :class="['absolute inset-y-0 right-3 flex items-center', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            <Icon name="ri:search-line" size="18" />
          </span>        
          </div>
                <div v-if="searchChips.length" class="flex flex-wrap gap-1.5">
                  <span
                    v-for="chip in searchChips"
                    :key="chip.id"
                    :class="[
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-quicksand',
                      isDarkMode
                        ? 'bg-gray-700 text-gray-200 border border-white/10'
                        : 'bg-gray-200 text-gray-700 border border-gray-300'
                    ]"
                  >
                    {{ chip.label }}
                    <button
                      type="button"
                      class="leading-none opacity-70 hover:opacity-100"
                      :aria-label="`Remove ${chip.label}`"
                      @click="searchTerm = stripSearchToken(searchTerm, chip.raw)"
                    >
                      ×
                    </button>
                  </span>
                </div>
              </div>
              </div>
        </div>

            <div class="flex w-full items-center justify-between gap-4">
            <div class="flex w-full items-center justify-between gap-4">
            <div :class="['mt-4 text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              <span v-if="dateRangeFilterSummary">
                Showing {{ filteredEntries.length }} {{ filteredEntries.length === 1 ? 'entry' : 'entries' }} for {{ dateRangeFilterSummary }}.
              </span>
              <span v-else>
                Sorted by most recent entry date.
              </span>
            </div>
            <div
              v-if="!isIos && filteredEntries.length > 0"
              class="relative column-settings-container mt-4 ml-auto"
            >
              <button
                ref="columnSettingsTriggerRef"
                type="button"
                @click.stop="showColumnSettings = !showColumnSettings"
                :class="[
                  'p-1.5 rounded transition-colors',
                  isDarkMode
                    ? 'hover:bg-white/10 text-gray-400 hover:text-gray-300 bg-white/5 border border-white/10 shadow-sm shadow-black/20'
                    : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700 bg-gray-100'
                ]"
                aria-label="Column settings"
              >
                <Icon name="ri:settings-3-line" size="16" />
              </button>
            </div>
            <Teleport to="body">
              <div
                v-if="showColumnSettings"
                class="column-settings-panel"
                :class="[
                  'fixed z-[100] w-80 rounded-xl border shadow-2xl p-4',
                  isDarkMode
                    ? 'bg-gray-900 border-white/10 shadow-xl shadow-black/50'
                    : 'bg-white border-gray-200'
                ]"
                :style="{ top: `${columnSettingsPosition.top}px`, left: `${columnSettingsPosition.left}px` }"
                @click.stop
              >
                <div class="flex items-center justify-between mb-4">
                  <h3 :class="['font-semibold font-quicksand text-sm', isDarkMode ? 'text-white' : 'text-gray-900']">
                    Column Settings
                  </h3>
                  <button
                    type="button"
                    @click="showColumnSettings = false"
                    :class="['hover:opacity-70 transition-opacity', isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700']"
                    aria-label="Close column settings"
                  >
                    <Icon name="ri:close-line" size="20" />
                  </button>
                </div>
                <div class="space-y-2 max-h-96 overflow-y-auto">
                  <div
                    v-for="col in [...displayColumnConfig].sort((a, b) => a.order - b.order)"
                    :key="col.key"
                    :draggable="true"
                    @dragstart="draggedColumnKey = col.key"
                    @dragover.prevent
                    @drop.prevent="handleColumnDrop(col.key)"
                    :class="[
                      'flex items-center gap-3 p-2 rounded-lg cursor-move transition-colors',
                      draggedColumnKey === col.key
                        ? (isDarkMode ? 'bg-gray-700 opacity-50' : 'bg-gray-200 opacity-50')
                        : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200')
                    ]"
                  >
                    <Icon
                      name="ri:drag-move-2-line"
                      size="16"
                      :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']"
                    />
                    <label
                      :class="[
                        'flex-1 flex items-center gap-2 cursor-pointer',
                        col.required ? 'opacity-60' : ''
                      ]"
                    >
                      <input
                        type="checkbox"
                        :checked="col.visible"
                        :disabled="col.required"
                        @change="toggleColumnVisibility(col.key)"
                        :class="[
                          'h-4 w-4 rounded border transition-colors',
                          isDarkMode
                            ? 'border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500'
                            : 'border-gray-400 bg-gray-100 text-blue-600 focus:ring-blue-500'
                        ]"
                      />
                      <span :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                        {{ col.label }}
                        <span v-if="col.required" :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400']">(required)</span>
                      </span>
                    </label>
                  </div>
                </div>
                <div class="mt-4 pt-4 border-t" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
                  <div class="flex flex-col gap-2">
                    <button
                      type="button"
                      @click="resetColumnWidths()"
                      :class="[
                        'w-full px-4 py-2 rounded-lg text-sm font-quicksand transition-colors',
                        isDarkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      ]"
                    >
                      Reset Column Widths
                    </button>
                    <button
                      type="button"
                      @click="resetColumnConfig()"
                      :class="[
                        'w-full px-4 py-2 rounded-lg text-sm font-quicksand transition-colors',
                        isDarkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      ]"
                    >
                      Reset to Defaults
                    </button>
                  </div>
                </div>
              </div>
            </Teleport>
            </div>
            <button
              v-if="isIos && filteredEntries.length > 0"
              type="button"
              :class="[
                'mt-4 text-xs font-quicksand underline-offset-2 hover:underline transition-colors',
                isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-700 hover:text-blue-800',
              ]"
              @click="openLogbookLayoutPreferences"
            >
              Customize logbook layout in Settings →
            </button>
          </div>

            <div
              v-if="filteredEntries.length === 0"
              :class="[
                'mt-6 rounded-2xl border border-dashed font-quicksand transition-colors duration-300',
                !hasAnyEntriesForActiveLogbook ? 'p-6' : 'p-10 text-center',
                isDarkMode
                  ? 'bg-gray-900 border-white/10 text-gray-400 shadow-md shadow-black/40'
                  : 'bg-gray-100 border-gray-300 text-gray-500',
              ]"
            >
              <template v-if="entriesHiddenOnlyByDateRange">
                No entries in {{ dateRangeFilterSummary }}. Adjust the date range in Totals Overview above, or choose <strong>All time</strong> to see every entry.
              </template>
              <template v-else-if="!hasAnyEntriesForActiveLogbook">
                <LogbookEmptyState
                  :is-dark-mode="isDarkMode"
                  :is-simulator="activeLogbook === 'simulator'"
                  @add-entry="toggleEntryForm()"
                  @import-csv="showDashboardImportModal = true"
                  @scan-digifi="openDigifiFromEmptyState"
                />
              </template>
              <template v-else>
                No entries match your current filters. Clear sidebar filters or search to see more entries.
              </template>
          </div>

            <LogEntryList
              v-else-if="isIos"
              :entries="displayedEntries"
              :is-dark-mode="isDarkMode"
              :visible-detail-fields="visibleDetailFields"
              :show-remarks-footer="showRemarksFooter"
              :is-entry-signed="isEntrySigned"
              @select="beginInlineEditing"
            />

            <div
              v-else
              ref="tableContainerRef"
              :class="[
                'mt-6 rounded-2xl border transition-colors duration-300 relative overflow-x-auto',
                isDarkMode
                  ? 'border-gray-700'
                  : 'border-gray-300 shadow-sm'
              ]"
            >
              <table
                ref="tableRef"
                :class="[
                  'w-full divide-y text-left font-quicksand',
                  isDarkMode
                    ? 'divide-white/10 bg-gray-900 border-white/10 shadow-md shadow-black/40'
                    : 'divide-gray-200 bg-gray-100'
                ]"
                style="table-layout: fixed; width: 100%;"
              >
                <thead
                  ref="tableHeaderRef"
                  :class="[
                    'uppercase text-xs font-semibold tracking-wider font-quicksand z-20',
                    isDarkMode
                      ? 'bg-gray-900 text-gray-400 border-b border-white/10 shadow-md shadow-black/40'
                      : 'bg-gray-100 text-gray-500 border-b border-gray-200'
                  ]"
                >
                  <tr>
                    <th
                      v-for="col in visibleColumns"
                      :key="col.key"
                      :class="[
                        'font-medium relative group',
                        getHeaderTextAlign(col),
                        col.responsiveClass || '',
                        ...getColumnPadding(col)
                      ]"
                      :style="col.width ? `width: ${col.width}px;` : ''"
                    >
                      {{ col.label }}
                      <div
                        class="absolute top-0 right-0 h-full w-1 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        :class="isDarkMode ? 'hover:bg-blue-500' : 'hover:bg-blue-600'"
                        @mousedown.prevent="startResize(col.key, $event)"
                        style="margin-right: -2px;"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody
                  :class="[
                    'divide-y text-sm font-quicksand',
                    isDarkMode
                      ? 'divide-gray-700 bg-gray-900 text-gray-300'
                      : 'divide-gray-200 bg-gray-100 text-gray-600'
                  ]"
                >
                  <template v-for="entry in displayedEntries" :key="entry.id">
                    <tr
                      :class="[
                        'transition-all duration-200 border-l-4 cursor-pointer',
                        entry.flagged
                          ? (isDarkMode
                            ? 'bg-amber-900/20 border-l-amber-500 hover:bg-amber-900/30'
                            : 'bg-amber-50 border-l-amber-500 hover:bg-amber-100')
                          : (isDarkMode
                            ? 'hover:bg-white/10 border-transparent hover:border-blue-500/50'
                            : 'hover:bg-gray-200 border-transparent hover:border-blue-500')
                      ]"
                      @click="beginInlineEditing(entry)"
                    >
                      <td
                        v-for="col in visibleColumns"
                        :key="col.key"
                        :class="[...getCellClasses(col), getCellTextColor(col)]"
                        :style="col.width ? `width: ${col.width}px;` : ''"
                      >
                        <template v-if="col.key === 'date'">
                          <div>
                            <div :class="['flex items-center gap-1.5 font-semibold text-sm', isDarkMode ? 'text-white' : 'text-gray-900']">
                              <span>{{ formatDisplayDate(entry.date) }}</span>
                              <Icon
                                v-if="entry.isVoid"
                                name="ri:prohibited-line"
                                size="14"
                                :class="isDarkMode ? 'text-rose-400' : 'text-rose-600'"
                                title="Voided entry"
                              />
                              <Icon
                                v-else-if="isEntrySigned(entry.id)"
                                name="ri:lock-line"
                                size="14"
                                :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
                                title="Signed by instructor"
                              />
                              <Icon
                                v-else-if="entry.signaturePending"
                                name="ri:time-line"
                                size="14"
                                :class="isDarkMode ? 'text-amber-400' : 'text-amber-600'"
                                title="Pending instructor signature"
                              />
                            </div>
                            <div :class="['text-xs truncate', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                              {{ roleDisplayLabel(entry.role) }}
                            </div>
                          </div>
                        </template>
                        <template v-else-if="col.key === 'aircraft'">
                          <div :class="['text-sm truncate', isDarkMode ? 'text-gray-200' : 'text-gray-900']">{{ entry.aircraftMakeModel }}</div>
                          <div :class="['text-xs truncate', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                            {{ entry.aircraftCategoryClass }}
                          </div>
                        </template>
                        <template v-else-if="col.key === 'identification'">
                          {{ entry.registration }}
                        </template>
                        <template v-else-if="col.key === 'flightNumber'">
                          {{ entry.flightNumber || '—' }}
                        </template>
                        <template v-else-if="col.key === 'fromTo'">
                          <div :class="['font-semibold text-sm truncate', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                            {{ formatEntryAirportCode(entry, entry.departure) }} → {{ formatEntryAirportCode(entry, entry.destination) }}
                          </div>
                          <div v-if="entry.route" :class="['text-xs truncate', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                            {{ entry.route }}
                          </div>
                        </template>
                        <template v-else-if="col.key === 'conditions'">
                          <div class="flex flex-wrap gap-1">
                            <span
                              v-for="condition in getDisplayConditions(entry)"
                              :key="`${entry.id}-${condition}`"
                              :class="[
                                'rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold border',
                                isDarkMode
                                  ? 'bg-gray-900 border-white/10 text-gray-300 shadow-md shadow-black/40'
                                  : 'bg-gray-100 border-gray-200 text-gray-600'
                              ]"
                            >
                              {{ condition }}
                            </span>
                            <span
                              v-if="getDisplayConditions(entry).length === 0"
                              :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400']"
                            >
                              —
                            </span>
                          </div>
                        </template>
                        <template v-else-if="col.key === 'remarks'">
                          <div class="whitespace-normal break-words">{{ entry.remarks || '—' }}</div>
                        </template>
                        <template v-else-if="col.key === 'pic'">
                          {{ formatNumber(entry.flightTime.pic) }}
                        </template>
                        <template v-else-if="col.key === 'sic'">
                          {{ formatNumber(entry.flightTime.sic) }}
                        </template>
                        <template v-else-if="col.key === 'dualR'">
                          {{ formatNumber(entry.flightTime.dual) }}
                        </template>
                        <template v-else-if="col.key === 'solo'">
                          {{ formatNumber(entry.flightTime.solo) }}
                        </template>
                        <template v-else-if="col.key === 'night'">
                          {{ formatNumber(entry.flightTime.night) }}
                        </template>
                        <template v-else-if="col.key === 'nvg'">
                          {{ formatNumber(entry.flightTime.nvg) }}
                        </template>
                        <template v-else-if="col.key === 'actual'">
                          {{ formatNumber(entry.flightTime.actualInstrument) }}
                        </template>
                        <template v-else-if="col.key === 'hood'">
                          {{ formatNumber(entry.flightTime.simulatedInstrument) }}
                        </template>
                        <template v-else-if="col.key === 'dualG'">
                          {{ formatNumber(entry.flightTime.dualGiven) }}
                        </template>
                        <template v-else-if="col.key === 'xc'">
                          {{ formatNumber(entry.flightTime.crossCountry) }}
                        </template>
                        <template v-else-if="col.key === 'dayLandings'">
                          {{ entry.performance.dayLandings ?? '—' }}
                        </template>
                        <template v-else-if="col.key === 'nightLandings'">
                          {{ entry.performance.nightLandings ?? '—' }}
                        </template>
                        <template v-else-if="col.key === 'approach'">
                          {{ getTotalApproachCount(entry.performance) || '—' }}
                        </template>
                        <template v-else-if="col.key === 'pilots'">
                          <div class="truncate">{{ entry.trainingElements || '—' }}</div>
                        </template>
                        <template v-else-if="col.key === 'total'">
                          <span :class="getTotalTimeColorClass(entry, isDarkMode)">
                            {{ formatNumber(entry.flightTime.total) }}
                          </span>
                        </template>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>

            <div
              v-if="filteredEntries.length > visibleEntryCount"
              ref="entriesLoadMoreSentinelRef"
              class="mt-4 flex flex-col items-center gap-1 py-3"
              aria-live="polite"
            >
              <p
                :class="[
                  'text-xs font-quicksand',
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                ]"
              >
                Showing {{ displayedEntries.length }} of {{ filteredEntries.length }}
              </p>
            </div>
      </div>
    </div>
    </main>
    </div>

    <!-- Backdrop Overlay for Edit Panel -->
    <Transition name="fade">
      <div
        v-if="expandedEntryId !== null"
        :class="[
          'fixed inset-0 z-40 bg-black/50',
          isIos ? '' : 'pointer-events-none'
        ]"
        aria-hidden="true"
        @click="isIos && cancelInlineEdit()"
      ></div>
    </Transition>

    <!-- Right-Side Edit Panel -->
    <Transition name="slide-right">
      <div
        v-if="expandedEntryId !== null && inlineEditEntry"
        ref="editEntryDrawerRef"
        :class="[
          'fixed left-0 right-0 top-0 h-full w-full max-w-[100dvw] md:w-[500px] lg:w-[600px] md:max-w-none md:left-auto z-50 overflow-x-hidden overscroll-x-none',
          isIos ? 'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]' : ''
        ]"
        @keydown.escape="cancelInlineEdit"
        tabindex="-1"
      >
        <div
          :class="[
            'h-full flex flex-col shadow-2xl relative overflow-x-hidden min-w-0 max-w-full w-full',
            isIos ? 'entry-panel-ios' : '',
            isDarkMode ? 'bg-gray-900 border-l border-gray-700' : 'bg-gray-50 border-l border-gray-200'
          ]"
        >
          <!-- Panel Header -->
        <div 
          class="flex items-center justify-between p-4 border-b"
          :class="[
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          ]"
        >
          <div class="flex items-center gap-2">
            <button
              v-if="expandedEntryId"
              type="button"
              @click="toggleAuditTrailSidebar"
              :class="[
                'p-2 rounded-lg transition-colors',
                showAuditTrailSidebar
                  ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                  : (isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200')
              ]"
              :title="showAuditTrailSidebar ? 'Hide Audit Trail' : 'Show Audit Trail'"
              aria-label="Toggle audit trail"
            >
              <Icon name="ri:history-line" size="20" />
            </button>
          <h2 
            class="text-lg font-semibold font-quicksand"
            :class="[
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            ]"
          >
            {{ isExpandedEntrySigned
              ? (inlineEditEntry?.logbookType === 'simulator' ? 'View Simulator Entry' : 'View Flight Entry')
              : (inlineEditEntry?.logbookType === 'simulator' ? 'Edit Simulator Entry' : 'Edit Flight Entry') }}
          </h2>
          <span
            v-if="inlineEditEntry?.logbookType === 'simulator'"
            :class="['text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded', isDarkMode ? 'bg-blue-900/40 text-blue-300 border border-blue-700/50' : 'bg-blue-100 text-blue-700 border border-blue-200']"
          >
            Simulator
          </span>
          <Icon
            v-if="isExpandedEntrySigned"
            name="ri:lock-line"
            size="18"
            :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
            title="Signed by instructor"
          />
          <Icon
            v-else-if="isExpandedEntryPending"
            name="ri:time-line"
            size="18"
            :class="isDarkMode ? 'text-amber-400' : 'text-amber-600'"
            title="Pending instructor signature"
          />
          </div>
          <button
            type="button"
            @click="cancelInlineEdit"
            :class="[
              'p-2 rounded-lg transition-colors',
              isDarkMode 
                ? 'text-gray-400 hover:text-gray-200 hover:bg-white/10' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
            ]"
            aria-label="Close panel"
          >
            <Icon name="ri:close-line" size="20" />
          </button>
          </div>
          
          <!-- Scrollable Form Content -->
          <div
            class="flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full max-w-full box-border"
            :class="[isIos ? 'py-4 entry-panel-ios' : 'p-6']"
            data-edit-panel
          >
          <div v-if="inlineEditEntry" class="grid gap-6 min-w-0 max-w-full w-full">

            <div
              v-if="inlineEditEntry?.isVoid"
              :class="[
                'rounded-lg border px-3 py-2 text-sm font-quicksand',
                isDarkMode
                  ? 'border-rose-700/60 bg-rose-900/20 text-rose-200'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              ]"
            >
              Void entry — zeroed hours supersede the signed original (kept in audit history).
            </div>
            <div
              v-if="isExpandedEntrySigned"
              :class="[
                'rounded-lg border px-3 py-2 text-sm font-quicksand space-y-2',
                isDarkMode
                  ? 'border-green-700/60 bg-green-900/20 text-green-200'
                  : 'border-green-200 bg-green-50 text-green-800'
              ]"
            >
              <p v-if="isExpandedGuestSigned">
                Signed by {{ expandedSignatureMeta?.guest_name || 'guest instructor' }} (guest) — this entry cannot be edited or deleted. Use Amend or Void if it was a mistake.
              </p>
              <p v-else>
                Signed by instructor — this entry cannot be edited or deleted. Use Amend or Void if it was a mistake.
              </p>
              <img
                v-if="expandedGuestSignatureUrl"
                :src="expandedGuestSignatureUrl"
                alt="Guest instructor signature"
                class="max-h-24 w-auto rounded border bg-white object-contain"
                :class="isDarkMode ? 'border-green-800' : 'border-green-200'"
              />
            </div>
            <div
              v-else-if="isExpandedEntryPending"
              :class="[
                'rounded-lg border px-3 py-2 text-sm font-quicksand',
                isDarkMode
                  ? 'border-amber-700/60 bg-amber-900/20 text-amber-200'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              ]"
            >
              Pending instructor signature — re-save with <strong>Save without Signing</strong> if they do not see it yet, or Save &amp; Sign when ready.
            </div>

            <div
              v-if="expandedEntryNeedsSignature"
              :class="[
                'rounded-lg border p-3 space-y-3 font-quicksand',
                isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
              ]"
            >
              <p :class="['text-sm font-semibold', isDarkMode ? 'text-gray-100' : 'text-gray-900']">
                Instructor signature
              </p>
              <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Dual Received time is set. Use a linked instructor (PIN) or a guest / fill-in instructor (drawn signature).
              </p>
              <label class="block text-sm">
                <span :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">Instructor</span>
                <select
                  v-model="signInstructorId"
                  :class="[
                    'mt-1 w-full rounded-lg border px-3 py-2 text-sm',
                    isDarkMode ? 'border-gray-600 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                  ]"
                >
                  <option disabled value="">Select instructor</option>
                  <optgroup v-if="mainInstructorsForSigning.length" label="Main">
                    <option
                      v-for="row in mainInstructorsForSigning"
                      :key="row.id"
                      :value="row.instructor_id"
                    >
                      {{ instructorDisplayName(row) }} (Main)
                    </option>
                  </optgroup>
                  <optgroup v-if="otherInstructorsForSigning.length" label="Instructors">
                    <option
                      v-for="row in otherInstructorsForSigning"
                      :key="row.id"
                      :value="row.instructor_id"
                    >
                      {{ instructorDisplayName(row) }}
                    </option>
                  </optgroup>
                  <option :value="GUEST_SIGNER_VALUE">Guest / fill-in instructor</option>
                </select>
              </label>
              <template v-if="isGuestSignerSelected">
                <label class="block text-sm">
                  <span :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">Guest instructor name</span>
                  <input
                    v-model="guestSignerName"
                    type="text"
                    autocomplete="name"
                    placeholder="Full name"
                    :class="[
                      'mt-1 w-full rounded-lg border px-3 py-2 text-sm',
                      isDarkMode ? 'border-gray-600 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                    ]"
                  />
                </label>
                <label class="block text-sm">
                  <span :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">Certificate # (optional)</span>
                  <input
                    v-model="guestCertificateNumber"
                    type="text"
                    autocomplete="off"
                    placeholder="CFI / certificate number"
                    :class="[
                      'mt-1 w-full rounded-lg border px-3 py-2 text-sm',
                      isDarkMode ? 'border-gray-600 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                    ]"
                  />
                </label>
                <div>
                  <span :class="['block text-sm mb-1', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Signature</span>
                  <SignaturePad
                    ref="inlineGuestPadRef"
                    :is-dark-mode="isDarkMode"
                    :disabled="isSubmittingSign || isSavingInlineEdit"
                    @change="(v) => (guestPadHasInk = v)"
                  />
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    :disabled="guestQrCreating || isSavingInlineEdit || isSubmittingSign"
                    :class="[
                      'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold border',
                      isDarkMode
                        ? 'border-cyan-700/60 bg-cyan-900/30 text-cyan-100 hover:bg-cyan-900/50'
                        : 'border-cyan-300 bg-cyan-50 text-cyan-900 hover:bg-cyan-100',
                      (guestQrCreating || isSavingInlineEdit) ? 'opacity-60 cursor-not-allowed' : ''
                    ]"
                    @click.stop="startGuestSignOnPhone"
                  >
                    <Icon v-if="guestQrCreating" name="ri:loader-4-line" class="animate-spin" size="16" />
                    <Icon v-else name="ri:qr-code-line" size="16" />
                    {{ guestQrCreating ? 'Creating QR…' : 'Sign on phone (QR)' }}
                  </button>
                </div>
                <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Saves the entry, then opens a QR for the guest’s phone.
                </p>
                <p v-if="guestQrError" :class="['text-xs', isDarkMode ? 'text-red-300' : 'text-red-600']">
                  {{ guestQrError }}
                </p>
              </template>
              <template v-else>
                <label class="block text-sm">
                  <span :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">Instructor signing PIN</span>
                  <input
                    v-model="signPin"
                    type="password"
                    autocomplete="off"
                    maxlength="12"
                    placeholder="4–12 characters"
                    :class="[
                      'mt-1 w-full rounded-lg border px-3 py-2 text-base',
                      isDarkMode ? 'border-gray-600 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                    ]"
                  />
                </label>
                <p
                  v-if="activeInstructorsForSigning.length === 0"
                  :class="['text-xs', isDarkMode ? 'text-amber-300' : 'text-amber-700']"
                >
                  No linked instructors — choose Guest / fill-in, or link someone in Settings → Instructor Links.
                </p>
              </template>
            </div>

            <div
              :aria-disabled="isExpandedEntrySigned ? 'true' : undefined"
              :class="isExpandedEntrySigned ? 'pointer-events-none opacity-80' : ''"
            >

            <!-- Simulator edit layout -->
            <template v-if="inlineEditEntry.logbookType === 'simulator'">
              <div class="flex justify-between mb-2">
                <button
                  type="button"
                  @click="toggleEntryFlag(inlineEditEntry)"
                  :class="['text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border transition-colors',
                    inlineEditEntry.flagged
                      ? (isDarkMode ? 'bg-amber-900/30 text-amber-300 border-amber-700' : 'bg-amber-100 text-amber-700 border-amber-200')
                      : (isDarkMode ? 'text-gray-500 border-gray-700' : 'text-gray-400 border-gray-200')
                  ]"
                  :aria-label="inlineEditEntry.flagged ? 'Unflag entry' : 'Flag entry'"
                >
                  {{ inlineEditEntry.flagged ? 'Flagged' : '+ Flag' }}
                </button>
              </div>
              <!-- Session block -->
              <div :class="['rounded-lg border p-4', isDarkMode ? 'border-white/10 bg-gray-900/50 shadow-md shadow-black/40' : 'border-gray-200 bg-white']">
                <div :class="['text-[10px] uppercase font-bold mb-3', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Session</div>
                <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4']">
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Date</label>
                    <input v-model="inlineEditEntry.date" type="date" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" />
                  </div>
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Type</label>
                    <select
                      :value="getSelectedSimType(inlineEditEntry)"
                      :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                      @change="setSimType(inlineEditEntry, ($event.target as HTMLSelectElement).value as '' | 'FFS' | 'FTD' | 'ATD')"
                    >
                      <option value="">—</option>
                      <option v-for="opt in categoryClassSimOptions" :key="opt" :value="opt">{{ opt }}</option>
                    </select>
                  </div>
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Time</label>
                    <input
                      :value="getSimTimeDisplayValue(inlineEditEntry)"
                      type="text"
                      inputmode="decimal"
                      placeholder="0.0"
                      :disabled="!getSelectedSimType(inlineEditEntry)"
                      :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200', !getSelectedSimType(inlineEditEntry) ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : (isDarkMode ? 'text-white' : 'text-gray-900')]"
                      @input="(e) => {
                        if (!inlineEditEntry) return;
                        const sel = getSelectedSimType(inlineEditEntry);
                        if (!sel) return;
                        const input = e.target as HTMLInputElement;
                        const val = input.value.trim();
                        if (val === '' || val === '-') {
                          inlineEditEntry.flightTime[sel.toLowerCase() as 'ffs'|'ftd'|'atd'] = null;
                          inlineEditEntry.flightTime.total = null;
                          syncSimRoleTime(inlineEditEntry);
                          return;
                        }
                        const num = parseFloat(val.replace(/[^\d.-]/g, ''));
                        const ok = !isNaN(num) && isFinite(num);
                        inlineEditEntry.flightTime[sel.toLowerCase() as 'ffs'|'ftd'|'atd'] = ok ? num : null;
                        inlineEditEntry.flightTime.total = ok ? num : null;
                        syncSimRoleTime(inlineEditEntry);
                      }"
                      @blur="(e) => {
                        if (!inlineEditEntry) return;
                        const sel = getSelectedSimType(inlineEditEntry);
                        if (!sel) return;
                        const input = e.target as HTMLInputElement;
                        const val = inlineEditEntry.flightTime[sel.toLowerCase() as 'ffs'|'ftd'|'atd'];
                        if (val === null || val === undefined) { input.value = ''; } else { input.value = formatEntryTimeDisplay(val); }
                      }"
                    />
                  </div>
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Role</label>
                    <select v-model="inlineEditEntry.role" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" @change="inlineEditEntry && syncSimRoleTime(inlineEditEntry)">
                      <option v-for="role in roleOptions" :key="role" :value="role">{{ roleDisplayLabel(role) }}</option>
                    </select>
                  </div>
                </div>
                <div :class="['mt-3 grid gap-4', isIos ? 'entry-grid-ios-2' : 'md:grid-cols-2']">
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">PIC / Captain</label>
                    <input v-model="inlineEditEntry.picName" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" autocomplete="off" />
                  </div>
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">SIC / First Officer</label>
                    <input v-model="inlineEditEntry.sicName" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" autocomplete="off" />
                  </div>
                </div>
                <div
                  class="mt-4 pt-3 border-t grid gap-4 grid-cols-1 sm:grid-cols-2"
                  :class="[
                    isDarkMode ? 'border-gray-600' : 'border-gray-200',
                    pilotProfile.enableMilitaryFields ? 'lg:grid-cols-4' : ''
                  ]"
                >
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Simulated instrument (hrs)</label>
                    <input
                      :value="formatEntryTimeDisplay(inlineEditEntry?.flightTime.simulatedInstrument)"
                      type="text"
                      inputmode="decimal"
                      placeholder="0.0"
                      :class="['w-full max-w-[120px] rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200', (inlineEditEntry?.flightTime.simulatedInstrument === null || inlineEditEntry?.flightTime.simulatedInstrument === 0 || inlineEditEntry?.flightTime.simulatedInstrument === undefined) ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : (isDarkMode ? 'text-white' : 'text-gray-900')]"
                      @input="(e) => {
                        if (!inlineEditEntry) return;
                        const input = e.target as HTMLInputElement;
                        const val = input.value.trim();
                        if (val === '' || val === '-') { inlineEditEntry.flightTime.simulatedInstrument = null; return; }
                        const num = parseFloat(val.replace(/[^\d.-]/g, ''));
                        inlineEditEntry.flightTime.simulatedInstrument = !isNaN(num) && isFinite(num) ? num : null;
                      }"
                      @blur="(e) => {
                        if (!inlineEditEntry) return;
                        const input = e.target as HTMLInputElement;
                        const val = inlineEditEntry.flightTime.simulatedInstrument;
                        if (val === null || val === undefined) { input.value = ''; } else { input.value = formatEntryTimeDisplay(val); }
                      }"
                    />
                  </div>
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Dual Rcvd (hrs)</label>
                    <input
                      :value="formatEntryTimeDisplay(inlineEditEntry?.flightTime.dual)"
                      type="text"
                      inputmode="decimal"
                      placeholder="0.0"
                      :class="['w-full max-w-[120px] rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200', (inlineEditEntry?.flightTime.dual === null || inlineEditEntry?.flightTime.dual === 0 || inlineEditEntry?.flightTime.dual === undefined) ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : (isDarkMode ? 'text-white' : 'text-gray-900')]"
                      @input="(e) => {
                        if (!inlineEditEntry) return;
                        const input = e.target as HTMLInputElement;
                        const val = input.value.trim();
                        if (val === '' || val === '-') { inlineEditEntry.flightTime.dual = null; return; }
                        const num = parseFloat(val.replace(/[^\d.-]/g, ''));
                        inlineEditEntry.flightTime.dual = !isNaN(num) && isFinite(num) ? num : null;
                      }"
                      @blur="(e) => {
                        if (!inlineEditEntry) return;
                        const input = e.target as HTMLInputElement;
                        const val = inlineEditEntry.flightTime.dual;
                        if (val === null || val === undefined) { input.value = ''; } else { input.value = formatEntryTimeDisplay(val); }
                      }"
                    />
                  </div>
                  <div v-if="pilotProfile.enableMilitaryFields">
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Night (hrs)</label>
                    <input
                      :value="formatEntryTimeDisplay(inlineEditEntry?.flightTime.night)"
                      type="text"
                      inputmode="decimal"
                      placeholder="0.0"
                      :class="['w-full max-w-[120px] rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200', (inlineEditEntry?.flightTime.night === null || inlineEditEntry?.flightTime.night === 0 || inlineEditEntry?.flightTime.night === undefined) ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : (isDarkMode ? 'text-white' : 'text-gray-900')]"
                      @input="(e) => {
                        if (!inlineEditEntry) return;
                        const input = e.target as HTMLInputElement;
                        const val = input.value.trim();
                        if (val === '' || val === '-') { inlineEditEntry.flightTime.night = null; return; }
                        const num = parseFloat(val.replace(/[^\d.-]/g, ''));
                        inlineEditEntry.flightTime.night = !isNaN(num) && isFinite(num) ? num : null;
                      }"
                      @blur="(e) => {
                        if (!inlineEditEntry) return;
                        const input = e.target as HTMLInputElement;
                        const val = inlineEditEntry.flightTime.night;
                        if (val === null || val === undefined) { input.value = ''; } else { input.value = formatEntryTimeDisplay(val); }
                      }"
                    />
                  </div>
                  <div v-if="pilotProfile.enableMilitaryFields">
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">NVG (hrs)</label>
                    <input
                      :value="formatEntryTimeDisplay(inlineEditEntry?.flightTime.nvg)"
                      type="text"
                      inputmode="decimal"
                      placeholder="0.0"
                      :class="['w-full max-w-[120px] rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200', (inlineEditEntry?.flightTime.nvg === null || inlineEditEntry?.flightTime.nvg === 0 || inlineEditEntry?.flightTime.nvg === undefined) ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : (isDarkMode ? 'text-white' : 'text-gray-900')]"
                      @input="(e) => {
                        if (!inlineEditEntry) return;
                        const input = e.target as HTMLInputElement;
                        const val = input.value.trim();
                        if (val === '' || val === '-') { inlineEditEntry.flightTime.nvg = null; return; }
                        const num = parseFloat(val.replace(/[^\d.-]/g, ''));
                        inlineEditEntry.flightTime.nvg = !isNaN(num) && isFinite(num) ? num : null;
                      }"
                      @blur="(e) => {
                        if (!inlineEditEntry) return;
                        const input = e.target as HTMLInputElement;
                        const val = inlineEditEntry.flightTime.nvg;
                        if (val === null || val === undefined) { input.value = ''; } else { input.value = formatEntryTimeDisplay(val); }
                      }"
                    />
                  </div>
                </div>
              </div>
              <!-- Optional details -->
              <div :class="['rounded-lg border p-4', isDarkMode ? 'border-white/10 bg-gray-900/30 shadow-md shadow-black/40' : 'border-gray-200 bg-gray-50/50']">
                <div :class="['text-[10px] uppercase font-bold mb-3', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Optional — Aircraft &amp; Route</div>
                <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'md:grid-cols-2']">
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Aircraft</label>
                    <input v-model="inlineEditEntry.aircraftMakeModel" type="text" :class="['w-full rounded border px-2 py-1 text-sm font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" placeholder="OPTIONAL" />
                  </div>
                  <div class="relative">
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Ident</label>
                    <input
                      v-model="inlineEditEntry.registration"
                      type="text"
                      :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                      placeholder="OPTIONAL"
                      autocomplete="off"
                      @input="inlineEditEntry.registration = ($event.target as HTMLInputElement).value.toUpperCase()"
                      @focus="showInlineIdentDropdown = true; highlightedInlineIdentIndex = filteredAircraftForInlineEdit.length > 0 ? 0 : -1"
                      @keydown="(e) => handleDropdownKeydown(e, 'inlineIdent', filteredAircraftForInlineEdit, (item) => selectAircraftForInlineEdit(item))"
                      @blur="handleInlineIdentBlur"
                    />
                    <div v-if="showInlineIdentDropdown && filteredAircraftForInlineEdit.length > 0" data-dropdown="inlineIdent" :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']">
                      <button v-for="(aircraft, index) in filteredAircraftForInlineEdit" :key="aircraft.registration" :data-index="index" type="button" :class="['w-full px-3 py-2 text-left text-sm font-mono uppercase transition-colors', highlightedInlineIdentIndex === index ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')]" @mousedown.prevent="selectAircraftForInlineEdit(aircraft)">{{ aircraft.registration }}</button>
                    </div>
                  </div>
                </div>
                <div :class="['grid gap-4 mt-3', isIos ? 'entry-grid-ios-2' : 'grid-cols-1 md:grid-cols-[1fr_1fr_2fr]']">
                  <div class="relative">
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">From</label>
                    <input v-model="inlineEditEntry.departure" type="text" :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" placeholder="OPTIONAL" autocomplete="off" @input="inlineEditEntry.departure = ($event.target as HTMLInputElement).value.toUpperCase()" @focus="showInlineFromDropdown = true; highlightedInlineFromIndex = filteredAirportsForInlineFrom.length > 0 ? 0 : -1" @keydown="(e) => handleDropdownKeydown(e, 'inlineFrom', filteredAirportsForInlineFrom, (item) => selectAirportForInlineFrom(item))" @blur="handleInlineFromBlur" />
                    <div v-if="showInlineFromDropdown && filteredAirportsForInlineFrom.length > 0" data-dropdown="inlineFrom" :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']">
                      <button v-for="(airport, index) in filteredAirportsForInlineFrom" :key="airport" :data-index="index" type="button" :class="['w-full px-3 py-2 text-left text-sm font-mono uppercase transition-colors', highlightedInlineFromIndex === index ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')]" @mousedown.prevent="selectAirportForInlineFrom(airport)">{{ airport }}</button>
                    </div>
                  </div>
                  <div class="relative">
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">To</label>
                    <input v-model="inlineEditEntry.destination" type="text" :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" placeholder="OPTIONAL" autocomplete="off" @input="inlineEditEntry.destination = ($event.target as HTMLInputElement).value.toUpperCase()" @focus="showInlineToDropdown = true; highlightedInlineToIndex = filteredAirportsForInlineTo.length > 0 ? 0 : -1" @keydown="(e) => handleDropdownKeydown(e, 'inlineTo', filteredAirportsForInlineTo, (item) => selectAirportForInlineTo(item))" @blur="handleInlineToBlur" />
                    <div v-if="showInlineToDropdown && filteredAirportsForInlineTo.length > 0" data-dropdown="inlineTo" :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']">
                      <button v-for="(airport, index) in filteredAirportsForInlineTo" :key="airport" :data-index="index" type="button" :class="['w-full px-3 py-2 text-left text-sm font-mono uppercase transition-colors', highlightedInlineToIndex === index ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')]" @mousedown.prevent="selectAirportForInlineTo(airport)">{{ airport }}</button>
                    </div>
                  </div>
                  <div :class="isIos ? 'col-span-2' : ''">
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Route</label>
                    <input v-model="inlineEditEntry.route" type="text" :class="['w-full rounded border px-2 py-1 text-sm font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" placeholder="OPTIONAL" @blur="inlineEditEntry.route = (inlineEditEntry.route || '').trim().toUpperCase()" />
                  </div>
                </div>
              </div>
              <!-- Performance -->
              <div>
                <div :class="['text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Performance</div>
                <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4']">
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Day Ldg</label>
                    <input v-model.number="inlineEditEntry.performance.dayLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" />
                  </div>
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Night Ldg</label>
                    <input v-model.number="inlineEditEntry.performance.nightLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" />
                  </div>
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Holds</label>
                    <input v-model.number="inlineEditEntry.performance.holdingProcedures" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" />
                  </div>
                </div>
                <div class="mt-3">
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Approaches</label>
                  <div class="space-y-1.5">
                    <div v-for="(approach, aIdx) in (inlineEditEntry.performance.approaches || [])" :key="'sim-inline-' + aIdx" class="flex gap-2 items-center">
                      <select v-model="approach.type" :class="['flex-1 max-w-[120px] rounded border px-2 py-1 text-sm font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']">
                        <option v-for="opt in approachTypeOptions" :key="opt" :value="opt">{{ opt }}</option>
                        <option value="Other">Other</option>
                      </select>
                      <input v-model.number="approach.count" type="number" min="1" class="w-14 rounded border px-2 py-1 text-sm text-center font-mono" :class="isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900'" />
                      <button type="button" aria-label="Remove approach" @click="inlineEditEntry.performance.approaches!.splice(aIdx, 1)" :class="['p-1 rounded', isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-200']"><Icon name="ri:close-line" size="16" /></button>
                    </div>
                    <button type="button" @click="(inlineEditEntry.performance.approaches ||= []).push({ type: 'ILS', count: 1 })" :class="['text-xs font-quicksand', isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700']">+ Add approach</button>
                  </div>
                </div>
              </div>
              <!-- Conditions, Tags, Remarks, Pilot -->
              <div :class="isIos ? 'grid gap-2 entry-grid-ios-2' : 'flex flex-wrap gap-3'">
                <label v-for="condition in activeConditionOptions" :key="condition.value" :class="['rounded-lg border text-sm font-quicksand cursor-pointer transition-all', isIos ? 'entry-chip-ios' : 'inline-flex items-center gap-2 px-4 py-2', (inlineEditEntry.flightConditions || []).includes(condition.value) ? (isDarkMode ? 'border-blue-500 bg-blue-900/30 text-blue-300' : 'border-blue-500 bg-blue-50 text-blue-700') : (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200')]">
                  <input v-model="inlineEditEntry.flightConditions" :value="condition.value" type="checkbox" :class="['rounded border transition-colors flex-shrink-0', isIos ? 'h-[18px] w-[18px]' : 'h-4 w-4', isDarkMode ? 'border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500' : 'border-gray-400 bg-gray-100 text-blue-600 focus:ring-blue-500']" />
                  <span>{{ condition.label }}</span>
                </label>
              </div>
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Tags</label>
                <div :class="[isIos ? 'grid gap-2 entry-grid-ios-2 mb-3' : 'flex flex-wrap gap-2 mb-3 items-center']">
                  <template v-for="tag in [...allTagOptions, ...customTagsFor(inlineEditEntry)]" :key="'sim-inline-' + tag">
                    <label :class="['rounded-lg border text-sm font-quicksand cursor-pointer transition-all', isIos ? 'entry-chip-ios' : 'inline-flex items-center gap-2 px-3 py-1.5', (inlineEditEntry.tags || []).includes(tag) ? (isDarkMode ? 'border-blue-500 bg-blue-900/30 text-blue-300' : 'border-blue-500 bg-blue-50 text-blue-700') : (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500' : 'border-gray-300 bg-gray-100 text-gray-600 hover:border-gray-400')]">
                      <input v-model="inlineEditEntry.tags" type="checkbox" :value="tag" :class="['rounded border transition-colors flex-shrink-0', isIos ? 'h-[18px] w-[18px]' : 'h-4 w-4', isDarkMode ? 'border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500' : 'border-gray-400 bg-gray-100 text-blue-600 focus:ring-blue-500']" />
                      <span>{{ tag }}</span>
                    </label>
                  </template>
                  <template v-if="!showInlineCustomTagInput">
                    <button type="button" @click="showInlineCustomTagInput = true" :class="['inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-quicksand transition-all', isIos ? 'col-span-2' : '', isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-400 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200']" aria-label="Add custom tag">+</button>
                  </template>
                  <template v-else>
                    <div :class="['inline-flex gap-1 items-center', isIos ? 'col-span-2' : '']">
                      <input v-model="customTagInputInline" type="text" placeholder="Custom tag" :class="['w-28 rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" @keydown.enter.prevent="addCustomTag(inlineEditEntry, customTagInputInline); customTagInputInline = ''; showInlineCustomTagInput = false" />
                      <button type="button" @click="addCustomTag(inlineEditEntry, customTagInputInline); customTagInputInline = ''; showInlineCustomTagInput = false" :class="['rounded px-2 py-1 text-xs', isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300']">Add</button>
                      <button type="button" @click="showInlineCustomTagInput = false; customTagInputInline = ''" :class="['rounded p-1', isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-200']" aria-label="Cancel"><Icon name="ri:close-line" size="16" /></button>
                    </div>
                  </template>
                </div>
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Remarks / Applicable 61.51 Notes</label>
                <textarea v-model="inlineEditEntry.remarks" rows="3" placeholder="Document training received, endorsements pending, or other relevant notes." :class="['w-full rounded border px-2 py-2 text-sm font-quicksand transition-colors duration-300', isDarkMode ? 'border-white/10 bg-black/20 text-white placeholder-gray-400 shadow-inner' : 'border-gray-300 bg-gray-100 text-gray-900 placeholder-gray-400']"></textarea>
              </div>
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Pilot</label>
                <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'md:grid-cols-3']">
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Job</label>
                    <select v-model="inlineEditEntry.trainingInstructor" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']">
                      <option value="">Select...</option>
                      <option value="Student">Student</option>
                      <option value="Instructor">Instructor</option>
                      <option value="Safety Pilot">Safety Pilot</option>
                      <option value="Captain">Captain</option>
                      <option value="First Officer">First Officer</option>
                    </select>
                  </div>
                  <div :class="['relative', isIos ? 'col-span-2' : '']">
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Name</label>
                    <input v-model="inlineEditEntry.trainingElements" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" placeholder="Pilot Name" autocomplete="off" @focus="showInlinePilotNameDropdown = true; highlightedInlinePilotIndex = filteredPilotsForInline.length > 0 ? 0 : -1" @keydown="(e) => handleDropdownKeydown(e, 'inlinePilot', filteredPilotsForInline, (item) => selectPilotNameForInline(item))" @blur="handleInlinePilotNameBlur" />
                    <div v-if="showInlinePilotNameDropdown && filteredPilotsForInline.length > 0" data-dropdown="inlinePilot" :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']">
                      <button v-for="(pilot, index) in filteredPilotsForInline" :key="pilot" :data-index="index" type="button" :class="['w-full px-3 py-2 text-left text-sm transition-colors', highlightedInlinePilotIndex === index ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')]" @mousedown.prevent="selectPilotNameForInline(pilot)">{{ pilot }}</button>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- Flight edit layout -->
            <template v-else>
            <div class="flex justify-between mb-2">
              <button
                type="button"
                @click="toggleEntryFlag(inlineEditEntry)"
                :class="['text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border transition-colors',
                  inlineEditEntry.flagged
                    ? (isDarkMode ? 'bg-amber-900/30 text-amber-300 border-amber-700' : 'bg-amber-100 text-amber-700 border-amber-200')
                    : (isDarkMode ? 'text-gray-500 border-gray-700' : 'text-gray-400 border-gray-200')
                ]"
                :aria-label="inlineEditEntry.flagged ? 'Unflag entry' : 'Flag entry'"
              >
                {{ inlineEditEntry.flagged ? 'Flagged' : '+ Flag' }}
              </button>
              <button
                type="button"
                @click="toggleInlineOOOIMode"
                :class="['text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border transition-colors',
                  isInlineCommercialMode
                    ? (isDarkMode ? 'bg-blue-900/30 text-blue-300 border-blue-700' : 'bg-blue-100 text-blue-700 border-blue-200')
                    : (isDarkMode ? 'text-gray-500 border-gray-700' : 'text-gray-400 border-gray-200')
                ]"
              >
                {{ isInlineCommercialMode ? 'OOOI Active' : '+ OOOI' }}
              </button>
            </div>


            <div v-if="isInlineCommercialMode && inlineEditEntry?.oooi" class="mb-4">
              <div class="flex justify-between items-center mb-2 px-2">
                <span :class="['text-xs font-medium', isDarkMode ? 'text-gray-400' : 'text-gray-600']">Time Format:</span>
                <button 
                  type="button"
                  @click="inlineEditEntry.oooi.isZulu = !inlineEditEntry.oooi.isZulu"
                  :class="[
                    'px-3 py-1 text-xs font-medium rounded transition-colors',
                    inlineEditEntry.oooi.isZulu
                      ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                      : (isDarkMode ? 'bg-gray-700 text-gray-300 border border-gray-600' : 'bg-gray-200 text-gray-700 border border-gray-300')
                  ]"
                >
                  {{ inlineEditEntry.oooi.isZulu ? 'Zulu (UTC)' : 'Local' }}
                </button>
              </div>
              <div :class="['grid gap-2 p-2 rounded border border-dashed border-gray-600/50', isIos ? 'entry-grid-ios-2' : 'grid-cols-2 sm:grid-cols-4']">
               <div v-for="field in oooiFields" :key="field">
                  <label :class="['block text-[10px] uppercase font-bold mb-1 text-center', isDarkMode ? 'text-blue-400' : 'text-blue-600']">{{ oooiFieldLabels[field] }}</label>
                  <input 
                    v-if="inlineEditEntry?.oooi" 
                    v-model="inlineEditEntry.oooi[field]" 
                    type="text" 
                    maxlength="4" 
                    placeholder="1430"
                    @input="(e) => { if (inlineEditEntry?.oooi && field !== 'isZulu') (inlineEditEntry.oooi as unknown as Record<string, string | null>)[field] = formatOOOIInput((e.target as HTMLInputElement).value) }"
                    :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" 
                  />
                </div>
               </div>
            </div>

            <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'md:grid-cols-4']">
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Date</label>
                <input v-model="inlineEditEntry.date" type="date" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" />
              </div>
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Role</label>
                <select v-model="inlineEditEntry.role" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']">
                  <option v-for="role in roleOptions" :key="role" :value="role">{{ roleDisplayLabel(role) }}</option>
                </select>
              </div>
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Aircraft</label>
                <input v-model="inlineEditEntry.aircraftMakeModel" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" />
              </div>
              <div class="relative">
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Ident</label>
                <input 
                  v-model="inlineEditEntry.registration" 
                  type="text" 
                  :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                  autocomplete="off"
                  @input="inlineEditEntry.registration = ($event.target as HTMLInputElement).value.toUpperCase()"
                  @focus="showInlineIdentDropdown = true; highlightedInlineIdentIndex = filteredAircraftForInlineEdit.length > 0 ? 0 : -1"
                  @keydown="(e) => handleDropdownKeydown(e, 'inlineIdent', filteredAircraftForInlineEdit, (item) => selectAircraftForInlineEdit(item))"
                  @blur="handleInlineIdentBlur"
                />
                <!-- Aircraft Ident Dropdown for Inline Edit -->
                <div 
                  v-if="showInlineIdentDropdown && filteredAircraftForInlineEdit.length > 0"
                  data-dropdown="inlineIdent"
                  :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']"
                >
                  <button
                    v-for="(aircraft, index) in filteredAircraftForInlineEdit"
                    :key="aircraft.registration"
                    :data-index="index"
                    type="button"
                    :class="[
                      'w-full px-3 py-2 text-left text-sm font-mono uppercase transition-colors',
                      highlightedInlineIdentIndex === index
                        ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                        : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')
                    ]"
                    @mousedown.prevent="selectAircraftForInlineEdit(aircraft)"
                  >
                    {{ aircraft.registration }}
                  </button>
                </div>
              </div>
            </div>
            <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'md:grid-cols-2']">
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">PIC / Captain</label>
                <input v-model="inlineEditEntry.picName" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" autocomplete="off" />
              </div>
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">SIC / First Officer</label>
                <input v-model="inlineEditEntry.sicName" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" autocomplete="off" />
              </div>
            </div>
            <div :class="['grid gap-4 mb-2 items-end', isIos ? 'entry-grid-ios-1' : 'md:grid-cols-4']">
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Flight Number</label>
                <input 
                  v-model="inlineEditEntry.flightNumber" 
                  type="text" 
                  :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                  autocomplete="off"
                  placeholder="OPTIONAL"
                />
              </div>
            </div>

            <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'entry-grid-route-row']">
              <div class="relative">
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">From</label>
                <input 
                  v-model="inlineEditEntry.departure" 
                  type="text" 
                  :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                  autocomplete="off"
                  @input="inlineEditEntry.departure = ($event.target as HTMLInputElement).value.toUpperCase()"
                  @focus="showInlineFromDropdown = true; highlightedInlineFromIndex = filteredAirportsForInlineFrom.length > 0 ? 0 : -1"
                  @keydown="(e) => handleDropdownKeydown(e, 'inlineFrom', filteredAirportsForInlineFrom, (item) => selectAirportForInlineFrom(item))"
                  @blur="handleInlineFromBlur"
                />
                <!-- Airport FROM Dropdown for Inline Edit -->
                <div 
                  v-if="showInlineFromDropdown && filteredAirportsForInlineFrom.length > 0"
                  data-dropdown="inlineFrom"
                  :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']"
                >
                  <button
                    v-for="(airport, index) in filteredAirportsForInlineFrom"
                    :key="airport"
                    :data-index="index"
                    type="button"
                    :class="[
                      'w-full px-3 py-2 text-left text-sm font-mono uppercase transition-colors',
                      highlightedInlineFromIndex === index
                        ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                        : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')
                    ]"
                    @mousedown.prevent="selectAirportForInlineFrom(airport)"
                  >
                    {{ airport }}
                  </button>
                </div>
              </div>
              <div class="relative">
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">To</label>
                <input 
                  v-model="inlineEditEntry.destination" 
                  type="text" 
                  :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                  autocomplete="off"
                  @input="inlineEditEntry.destination = ($event.target as HTMLInputElement).value.toUpperCase()"
                  @focus="showInlineToDropdown = true; highlightedInlineToIndex = filteredAirportsForInlineTo.length > 0 ? 0 : -1"
                  @keydown="(e) => handleDropdownKeydown(e, 'inlineTo', filteredAirportsForInlineTo, (item) => selectAirportForInlineTo(item))"
                  @blur="handleInlineToBlur"
                />
                <!-- Airport TO Dropdown for Inline Edit -->
                <div 
                  v-if="showInlineToDropdown && filteredAirportsForInlineTo.length > 0"
                  data-dropdown="inlineTo"
                  :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']"
                >
                  <button
                    v-for="(airport, index) in filteredAirportsForInlineTo"
                    :key="airport"
                    :data-index="index"
                    type="button"
                    :class="[
                      'w-full px-3 py-2 text-left text-sm font-mono uppercase transition-colors',
                      highlightedInlineToIndex === index
                        ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                        : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')
                    ]"
                    @mousedown.prevent="selectAirportForInlineTo(airport)"
                  >
                    {{ airport }}
                  </button>
                </div>
              </div>
              <div class="min-w-0">
                <label :class="['block text-[10px] uppercase font-bold mb-1 truncate', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Category/Class</label>
                <select
                  :value="categoryClassAircraftOptions.includes(inlineEditEntry.aircraftCategoryClass as any) ? inlineEditEntry.aircraftCategoryClass : ''"
                  :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                  @change="inlineEditEntry.aircraftCategoryClass = ($event.target as HTMLSelectElement).value"
                >
                  <option value="">—</option>
                  <option v-for="opt in categoryClassAircraftOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="entry-grid-time-col">
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Time</label>
                <input
                  :value="formatEntryTimeDisplay(inlineEditEntry.categoryClassTime)"
                  type="text"
                  inputmode="decimal"
                  placeholder="0.0"
                  :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                  @input="(e) => {
                    const input = e.target as HTMLInputElement;
                    const val = input.value.trim();
                    if (val === '' || val === '-') {
                      inlineEditEntry.categoryClassTime = null;
                      return;
                    }
                    const num = parseFloat(val.replace(/[^\d.-]/g, ''));
                    inlineEditEntry.categoryClassTime = !isNaN(num) && isFinite(num) ? num : null;
                  }"
                  @blur="(e) => {
                    (e.target as HTMLInputElement).value = formatEntryTimeDisplay(inlineEditEntry.categoryClassTime);
                  }"
                />
              </div>
              <div :class="isIos ? 'col-span-2' : ''">
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Route</label>
                <input v-model="inlineEditEntry.route" type="text" :class="['w-full rounded border px-2 py-1 text-sm font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" @blur="inlineEditEntry.route = (inlineEditEntry.route || '').trim().toUpperCase()" />
              </div>
            </div>
            
            <!-- Flight Times Inline (main air time only; sim time is under Category/Class) -->
             <div>
              <label :class="['block text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Time</label>
              <div :class="['grid gap-3 w-full', isIos ? 'entry-grid-ios-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5']">
                <div v-for="field in mainTimeFields" :key="field.key">
                  <div :class="['text-[9px] uppercase font-bold mb-1 text-center whitespace-normal sm:whitespace-nowrap', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                    {{ mainTimeShortLabels[field.key] ?? field.label }}
                  </div>
                  <input
                    :value="formatEntryTimeDisplay(inlineEditEntry.flightTime[field.key])"
                    type="text"
                    inputmode="decimal"
                    placeholder="0.0"
                    :class="[
                      'w-full rounded border px-2 py-1 text-sm text-center font-mono',
                      field.key !== 'total' ? 'cursor-pointer' : '',
                      isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200',
                      (inlineEditEntry.flightTime[field.key] === null || inlineEditEntry.flightTime[field.key] === 0 || inlineEditEntry.flightTime[field.key] === undefined)
                        ? (isDarkMode ? 'text-gray-500' : 'text-gray-400')
                        : (isDarkMode ? 'text-white' : 'text-gray-900')
                    ]"
                    @input="(e) => {
                      if (!inlineEditEntry) return;
                      const input = e.target as HTMLInputElement;
                      const val = input.value.trim();
                      if (val === '' || val === '-') {
                        inlineEditEntry.flightTime[field.key] = null;
                        return;
                      }
                      const cleaned = val.replace(/[^\d.-]/g, '');
                      const num = parseFloat(cleaned);
                      inlineEditEntry.flightTime[field.key] = (isNaN(num) ? null : (isFinite(num) ? num : null)) as number | null;
                    }"
                    @click="field.key !== 'total' && inlineEditEntry && fillFieldWithTotalTime(field.key, inlineEditEntry.flightTime.total, true)"
                    @blur="(e) => {
                      if (!inlineEditEntry) return;
                      const input = e.target as HTMLInputElement;
                      const val = inlineEditEntry.flightTime[field.key];
                      if (val === null || val === undefined) { input.value = ''; } else { input.value = formatEntryTimeDisplay(val); }
                    }"
                  />
                </div>
              </div>
             </div>

             <!-- Performance Inline -->
             <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4']">
               <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Day Ldg</label>
                  <input v-model.number="inlineEditEntry.performance.dayLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" />
               </div>
               <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Night Ldg</label>
                  <input v-model.number="inlineEditEntry.performance.nightLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" />
               </div>
               <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Holds</label>
                  <input v-model.number="inlineEditEntry.performance.holdingProcedures" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" />
               </div>
               <div class="col-span-2 md:col-span-4">
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Approaches</label>
                  <div class="space-y-1.5">
                    <div
                      v-for="(approach, aIdx) in (inlineEditEntry.performance.approaches || [])"
                      :key="'inline-' + aIdx"
                      class="flex gap-2 items-center"
                    >
                      <select
                        v-model="approach.type"
                        :class="['flex-1 max-w-[120px] rounded border px-2 py-1 text-sm font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                      >
                        <option v-for="opt in approachTypeOptions" :key="opt" :value="opt">{{ opt }}</option>
                        <option value="Other">Other</option>
                      </select>
                      <input v-model.number="approach.count" type="number" min="1" class="w-14 rounded border px-2 py-1 text-sm text-center font-mono" :class="isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900'" />
                      <button type="button" aria-label="Remove approach" @click="inlineEditEntry.performance.approaches!.splice(aIdx, 1)" :class="['p-1 rounded', isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-200']">
                        <Icon name="ri:close-line" size="16" />
                      </button>
                    </div>
                    <button type="button" @click="(inlineEditEntry.performance.approaches ||= []).push({ type: 'ILS', count: 1 })" :class="['text-xs font-quicksand', isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700']">
                      + Add approach
                    </button>
                  </div>
               </div>
             </div>

            <div :class="isIos ? 'grid gap-2 entry-grid-ios-2' : 'flex flex-wrap gap-3'">
              <label
                v-for="condition in activeConditionOptions"
                :key="condition.value"
                :class="[
                  'rounded-lg border text-sm font-quicksand cursor-pointer transition-all',
                  isIos ? 'entry-chip-ios' : 'inline-flex items-center gap-2 px-4 py-2',
                  (inlineEditEntry.flightConditions || []).includes(condition.value)
                    ? (isDarkMode ? 'border-blue-500 bg-blue-900/30 text-blue-300' : 'border-blue-500 bg-blue-50 text-blue-700')
                    : (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200')
                ]"
              >
                <input
                  v-model="inlineEditEntry.flightConditions"
                  :value="condition.value"
                  type="checkbox"
                  :class="[
                    'rounded border transition-colors flex-shrink-0',
                    isIos ? 'h-[18px] w-[18px]' : 'h-4 w-4',
                    isDarkMode 
                      ? 'border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500' 
                      : 'border-gray-400 bg-gray-100 text-blue-600 focus:ring-blue-500'
                  ]"
                />
                <span>{{ condition.label }}</span>
              </label>
            </div>

            <div>
              <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Tags</label>
              <div :class="[isIos ? 'grid gap-2 entry-grid-ios-2 mb-3' : 'flex flex-wrap gap-2 mb-3 items-center']">
                <template v-for="tag in [...allTagOptions, ...customTagsFor(inlineEditEntry)]" :key="'inline-' + tag">
                  <label
                    :class="[
                      'rounded-lg border text-sm font-quicksand cursor-pointer transition-all',
                      isIos ? 'entry-chip-ios' : 'inline-flex items-center gap-2 px-3 py-1.5',
                      (inlineEditEntry.tags || []).includes(tag)
                        ? (isDarkMode ? 'border-blue-500 bg-blue-900/30 text-blue-300' : 'border-blue-500 bg-blue-50 text-blue-700')
                        : (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500' : 'border-gray-300 bg-gray-100 text-gray-600 hover:border-gray-400')
                    ]"
                  >
                    <input v-model="inlineEditEntry.tags" type="checkbox" :value="tag" :class="['rounded border transition-colors flex-shrink-0', isIos ? 'h-[18px] w-[18px]' : 'h-4 w-4', isDarkMode ? 'border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500' : 'border-gray-400 bg-gray-100 text-blue-600 focus:ring-blue-500']" />
                    <span>{{ tag }}</span>
                  </label>
                </template>
                <template v-if="!showInlineCustomTagInput">
                  <button type="button" @click="showInlineCustomTagInput = true" :class="['inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-quicksand transition-all', isIos ? 'col-span-2' : '', isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-400 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200']" aria-label="Add custom tag">+</button>
                </template>
                <template v-else>
                  <div :class="['inline-flex gap-1 items-center', isIos ? 'col-span-2' : '']">
                    <input v-model="customTagInputInline" type="text" placeholder="Custom tag" :class="['w-28 rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" @keydown.enter.prevent="addCustomTag(inlineEditEntry, customTagInputInline); customTagInputInline = ''; showInlineCustomTagInput = false" />
                    <button type="button" @click="addCustomTag(inlineEditEntry, customTagInputInline); customTagInputInline = ''; showInlineCustomTagInput = false" :class="['rounded px-2 py-1 text-xs', isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300']">Add</button>
                    <button type="button" @click="showInlineCustomTagInput = false; customTagInputInline = ''" :class="['rounded p-1', isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-200']" aria-label="Cancel"><Icon name="ri:close-line" size="16" /></button>
                  </div>
                </template>
              </div>
              <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Remarks / Applicable 61.51 Notes</label>
              <textarea
                v-model="inlineEditEntry.remarks"
                rows="3"
                placeholder="Document training received, endorsements pending, or other relevant notes."
                :class="[
                  'w-full rounded border px-2 py-2 text-sm font-quicksand transition-colors duration-300',
                  isDarkMode 
                    ? 'border-white/10 bg-black/20 text-white placeholder-gray-400 shadow-inner' 
                    : 'border-gray-300 bg-gray-100 text-gray-900 placeholder-gray-400'
                ]"
              ></textarea>
            </div>

            <!-- Pilot Section -->
            <div>
              <label :class="['block text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Pilot</label>
              <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'md:grid-cols-3']">
                <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Job</label>
                  <select v-model="inlineEditEntry.trainingInstructor" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']">
                    <option value="">Select...</option>
                    <option value="Student">Student</option>
                    <option value="Instructor">Instructor</option>
                    <option value="Safety Pilot">Safety Pilot</option>
                    <option value="Captain">Captain</option>
                    <option value="First Officer">First Officer</option>
                  </select>
                </div>
                <div :class="['relative', isIos ? 'col-span-2' : '']">
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Name</label>
                  <input 
                    v-model="inlineEditEntry.trainingElements" 
                    type="text" 
                    :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" 
                    placeholder="Pilot Name"
                    autocomplete="off"
                    @focus="showInlinePilotNameDropdown = true; highlightedInlinePilotIndex = filteredPilotsForInline.length > 0 ? 0 : -1"
                    @keydown="(e) => handleDropdownKeydown(e, 'inlinePilot', filteredPilotsForInline, (item) => selectPilotNameForInline(item))"
                    @blur="handleInlinePilotNameBlur"
                  />
                  <!-- Pilot Name Dropdown for Inline Edit -->
                  <div 
                    v-if="showInlinePilotNameDropdown && filteredPilotsForInline.length > 0"
                    data-dropdown="inlinePilot"
                    :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']"
                  >
                    <button
                      v-for="(pilot, index) in filteredPilotsForInline"
                      :key="pilot"
                      :data-index="index"
                      type="button"
                      :class="[
                        'w-full px-3 py-2 text-left text-sm transition-colors',
                        highlightedInlinePilotIndex === index
                          ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                          : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')
                      ]"
                      @mousedown.prevent="selectPilotNameForInline(pilot)"
                    >
                      {{ pilot }}
                    </button>
                  </div>
                </div>
               </div>
             </div>

            </template>

            </div>

            <div 
              :class="[
                'flex items-center justify-between mt-2 pt-4 border-t',
                isIos ? 'entry-panel-actions-ios flex-col items-stretch gap-3' : '',
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              ]"
            >
              <div class="flex items-center gap-2 flex-wrap">
                <button
                  v-if="expandedEntryId"
                  type="button"
                  @click.stop="toggleAuditTrailSidebar"
                  :class="[
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-quicksand transition-colors',
                    showAuditTrailSidebar
                      ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                      : (isDarkMode
                        ? 'border border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'border border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200')
                  ]"
                >
                  <Icon name="ri:history-line" size="14" />
                  {{ showAuditTrailSidebar ? 'Hide History' : 'View History' }}
                </button>
                <button
                  v-if="canAmendExpandedEntry"
                  type="button"
                  @click.stop="beginAmendSignedEntry"
                  :class="[
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-quicksand transition-colors',
                    isDarkMode
                      ? 'border border-blue-700/60 bg-blue-900/30 text-blue-200 hover:bg-blue-900/50'
                      : 'border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100'
                  ]"
                >
                  <Icon name="ri:file-copy-line" size="14" />
                  Amend entry
                </button>
                <button
                  v-if="canVoidExpandedEntry"
                  type="button"
                  @click.stop="beginVoidSignedEntry"
                  :class="[
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-quicksand transition-colors',
                    isDarkMode
                      ? 'border border-rose-700/60 bg-rose-900/30 text-rose-200 hover:bg-rose-900/50'
                      : 'border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100'
                  ]"
                >
                  <Icon name="ri:prohibited-line" size="14" />
                  Void entry
                </button>
                <button
                  v-if="canSignExpandedEntry && !isGuestSignerSelected"
                  type="button"
                  @click.stop="openSignEntryModal"
                  :class="[
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-quicksand transition-colors',
                    isDarkMode
                      ? 'border border-green-700/60 bg-green-900/30 text-green-200 hover:bg-green-900/50'
                      : 'border border-green-300 bg-green-50 text-green-800 hover:bg-green-100'
                  ]"
                >
                  <Icon name="ri:quill-pen-line" size="14" />
                  Sign with instructor
                </button>
              <button
                v-if="!isExpandedEntrySigned"
                type="button"
                @click.stop="expandedEntryId && confirmAndDeleteEntry(expandedEntryId)"
                :class="['text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1']"
              >
                Delete Entry
              </button>
              </div>
              <div class="flex items-center gap-3 flex-wrap justify-end">
                <button
                  type="button"
                  @click.stop="cancelInlineEdit"
                  :class="['px-4 py-2 rounded-lg text-sm font-medium', isDarkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-200']"
                >
                  {{ isExpandedEntrySigned ? 'Close' : 'Cancel' }}
                </button>
                <template v-if="!isExpandedEntrySigned && expandedEntryNeedsSignature">
                  <button
                    v-if="!isGuestSignerSelected"
                    type="button"
                    @click.stop="saveInlineEditWithIntent('later')"
                    :disabled="isSavingInlineEdit || isSubmittingSign || isMarkingSignaturePending"
                    :class="[
                      'inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold border',
                      isDarkMode
                        ? 'border-amber-700/60 bg-amber-900/30 text-amber-100 hover:bg-amber-900/50'
                        : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
                      (isSavingInlineEdit || isSubmittingSign) ? 'opacity-60 cursor-not-allowed' : ''
                    ]"
                  >
                    Save without Signing
                  </button>
                  <button
                    type="button"
                    @click.stop="saveInlineEditWithIntent(isGuestSignerSelected ? 'guest' : 'sign')"
                    :disabled="isSavingInlineEdit || isSubmittingSign || !canSaveAndSignInlineEntry"
                    :class="[
                      'inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-bold shadow-lg',
                      isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white',
                      (isSavingInlineEdit || isSubmittingSign || !canSaveAndSignInlineEntry) ? 'opacity-60 cursor-not-allowed' : ''
                    ]"
                  >
                    <Icon v-if="isSavingInlineEdit || isSubmittingSign" name="ri:loader-4-line" class="animate-spin mr-2" size="16" />
                    {{
                      isSubmittingSign
                        ? 'Signing…'
                        : isSavingInlineEdit
                          ? 'Saving…'
                          : isGuestSignerSelected
                            ? 'Sign with guest'
                            : 'Save & Sign'
                    }}
                  </button>
                </template>
                <button
                  v-else-if="!isExpandedEntrySigned"
                  type="button"
                  @click.stop="saveInlineEditWithIntent('none')"
                  :disabled="isSavingInlineEdit"
                  :class="[
                    'inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-bold shadow-lg',
                    isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white',
                    isSavingInlineEdit ? 'opacity-60 cursor-not-allowed' : ''
                  ]"
                >
                  <Icon v-if="isSavingInlineEdit" name="ri:loader-4-line" class="animate-spin mr-2" size="16" />
                  {{ isSavingInlineEdit ? 'Saving…' : 'Confirm Changes' }}
                </button>
              </div>
            </div>

            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Sign with instructor modal -->
    <Teleport to="body">
      <div
        v-if="showSignEntryModal"
        class="fixed inset-0 z-[80] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-entry-title"
      >
        <div class="absolute inset-0 bg-black/50" @click="closeSignEntryModal" />
        <div
          :class="[
            'relative z-10 w-full max-w-md rounded-2xl border p-5 shadow-xl font-quicksand',
            isDarkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-200 bg-white text-gray-900'
          ]"
        >
          <h3 id="sign-entry-title" class="text-lg font-semibold">Sign with instructor</h3>
          <p :class="['mt-1 text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            Have your linked instructor enter their signing PIN. This locks the entry permanently.
          </p>

          <label class="mt-4 block text-sm font-medium">
            Instructor
            <select
              v-model="signInstructorId"
              :class="[
                'mt-1 w-full rounded-lg border px-3 py-2 text-sm',
                isDarkMode ? 'border-gray-600 bg-gray-800 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
              ]"
            >
              <optgroup v-if="mainInstructorsForSigning.length" label="Main">
                <option
                  v-for="row in mainInstructorsForSigning"
                  :key="row.id"
                  :value="row.instructor_id"
                >
                  {{ instructorDisplayName(row) }} (Main)
                </option>
              </optgroup>
              <optgroup v-if="otherInstructorsForSigning.length" label="Instructors">
                <option
                  v-for="row in otherInstructorsForSigning"
                  :key="row.id"
                  :value="row.instructor_id"
                >
                  {{ instructorDisplayName(row) }}
                </option>
              </optgroup>
            </select>
          </label>

          <label class="mt-3 block text-sm font-medium">
            Instructor signing PIN
            <input
              v-model="signPin"
              type="password"
              autocomplete="off"
              maxlength="12"
              placeholder="4–12 characters"
              :class="[
                'mt-1 w-full rounded-lg border px-3 py-2 text-base',
                isDarkMode ? 'border-gray-600 bg-gray-800 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
              ]"
              @keydown.enter.prevent="submitSignEntry"
            />
          </label>

          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              :class="[
                'rounded-lg px-4 py-2 text-sm font-medium',
                isDarkMode ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
              ]"
              @click="closeSignEntryModal"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="isSubmittingSign || isFlightSigningLoading || !signInstructorId || !signPin.trim()"
              :class="[
                'rounded-lg px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed'
              ]"
              @click="submitSignEntry"
            >
              {{ isSubmittingSign ? 'Signing…' : 'Confirm signature' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Finish dual entry: Sign now or Sign later -->
    <Teleport to="body">
      <div
        v-if="showSignatureFinishModal"
        class="fixed inset-0 z-[80] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signature-finish-title"
      >
        <div class="absolute inset-0 bg-black/50" />
        <div
          :class="[
            'relative z-10 w-full max-w-md rounded-2xl border p-5 shadow-xl font-quicksand',
            isDarkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-200 bg-white text-gray-900'
          ]"
        >
          <h3 id="signature-finish-title" class="text-lg font-semibold">Instructor signature needed</h3>
          <p :class="['mt-1 text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            This entry has Dual Received time. Sign now with your instructor, or mark it to sign later.
          </p>

          <div class="mt-5 flex flex-col gap-2">
            <button
              type="button"
              :disabled="isMarkingSignaturePending || isSubmittingSign"
              :class="[
                'w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60'
              ]"
              @click="openSignEntryModal"
            >
              Sign now
            </button>
            <button
              type="button"
              :disabled="isMarkingSignaturePending || isSubmittingSign"
              :class="[
                'w-full rounded-lg px-4 py-2.5 text-sm font-semibold border',
                isDarkMode
                  ? 'border-amber-700/60 bg-amber-900/30 text-amber-100 hover:bg-amber-900/50'
                  : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
              ]"
              @click="sendEntryForSigning"
            >
              {{ isMarkingSignaturePending ? 'Saving…' : 'Sign later' }}
            </button>
            <button
              type="button"
              :class="[
                'w-full rounded-lg px-4 py-2 text-sm font-medium',
                isDarkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
              ]"
              @click="showSignatureFinishModal = false"
            >
              Stay on entry
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Guest sign QR companion modal -->
    <Teleport to="body">
      <div
        v-if="guestQrShowModal"
        class="fixed inset-0 z-[85] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-sign-qr-title"
      >
        <div class="absolute inset-0 bg-black/50" @click="closeGuestSignQrModal" />
        <div
          :class="[
            'relative z-10 w-full max-w-md rounded-2xl border p-5 shadow-xl font-quicksand space-y-4',
            isDarkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-200 bg-white text-gray-900'
          ]"
        >
          <h3 id="guest-sign-qr-title" class="text-lg font-semibold">Sign on phone</h3>
          <p :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            Have the guest instructor scan this QR code. They enter their name and draw a signature — no account needed.
          </p>

          <div v-if="guestQrCompleted" class="rounded-lg border px-3 py-2 text-sm border-green-600/40 bg-green-900/20 text-green-200">
            Signature received — entry is locked.
          </div>
          <template v-else>
            <div class="flex justify-center">
              <img
                v-if="guestQrDataUrl"
                :src="guestQrDataUrl"
                alt="Guest sign QR code"
                class="h-[220px] w-[220px] rounded-lg bg-white p-2"
              />
            </div>
            <p v-if="guestQrMobileUrl" :class="['text-xs break-all', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
              {{ guestQrMobileUrl }}
            </p>
            <p v-if="guestQrExpiresAt" :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
              Expires {{ new Date(guestQrExpiresAt).toLocaleTimeString() }}
              <span v-if="!guestQrSessionActive"> (expired)</span>
            </p>
            <p :class="['text-sm font-medium', isDarkMode ? 'text-cyan-200' : 'text-cyan-800']">
              Waiting for signature…
            </p>
          </template>

          <div class="flex flex-wrap gap-2 justify-end">
            <button
              v-if="guestQrMobileUrl && !guestQrCompleted"
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-semibold border"
              :class="isDarkMode ? 'border-gray-600 hover:bg-white/10' : 'border-gray-300 hover:bg-gray-100'"
              @click="copyGuestSignQrUrl().then(() => showToast('Link copied', { type: 'success' }))"
            >
              Copy link
            </button>
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-semibold"
              :class="isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'"
              @click="guestQrCompleted ? (closeGuestSignQrModal(), resetGuestSignQr()) : closeGuestSignQrModal()"
            >
              {{ guestQrCompleted ? 'Done' : 'Close' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Backdrop Overlay for Add Entry Panel -->
    <Transition name="fade">
      <div
        v-if="isEntryFormOpen"
        :class="[
          'fixed inset-0 z-40 bg-black/50',
          isIos ? '' : 'pointer-events-none'
        ]"
        aria-hidden="true"
        @click="isIos && toggleEntryForm()"
      ></div>
    </Transition>

    <!-- Right-Side Add Entry Panel -->
    <Transition name="slide-right">
      <div
        v-if="isEntryFormOpen"
        ref="entryFormDrawerRef"
        :class="[
          'fixed left-0 right-0 top-0 h-full w-full max-w-[100dvw] md:w-[500px] lg:w-[600px] md:max-w-none md:left-auto z-50 overflow-x-hidden overscroll-x-none',
          isIos ? 'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]' : ''
        ]"
        @keydown.escape="toggleEntryForm"
        tabindex="-1"
      >
        <div
          :class="[
            'h-full flex flex-col shadow-2xl overflow-x-hidden min-w-0 max-w-full w-full',
            isIos ? 'entry-panel-ios' : '',
            isDarkMode ? 'bg-gray-900 border-l border-gray-700' : 'bg-gray-50 border-l border-gray-200'
          ]"
        >
          <!-- Panel Header -->
          <div class="flex items-center justify-between gap-3 p-4 border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
            <div class="flex items-center gap-2 min-w-0">
              <h2 class="text-lg font-semibold font-quicksand truncate" :class="[isDarkMode ? 'text-gray-100' : 'text-gray-900']">
                {{ activeLogbook === 'simulator' ? (editingEntryId ? 'Edit Simulator Entry' : 'New Simulator Entry') : (editingEntryId ? 'Edit Log Entry' : 'New Log Entry') }}
              </h2>
              <span
                v-if="activeLogbook === 'simulator'"
                :class="['text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded flex-shrink-0', isDarkMode ? 'bg-blue-900/40 text-blue-300 border border-blue-700/50' : 'bg-blue-100 text-blue-700 border border-blue-200']"
              >
                Simulator
              </span>
            </div>
            <NuxtLink
              v-if="!isIos"
              to="/logbook-builder"
              :class="[
                'flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-quicksand font-medium transition-colors',
                isDarkMode ? 'border border-gray-600 hover:bg-gray-700 text-gray-200' : 'border border-gray-300 hover:bg-gray-200 text-gray-800'
              ]"
            >
              <Icon name="ri:table-line" size="14" />
              Add Pages
            </NuxtLink>
            <button
              type="button"
              @click="toggleEntryForm"
              :class="[
                'p-2 rounded-lg transition-colors',
                isDarkMode 
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-white/10' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
              ]"
              aria-label="Close panel"
            >
              <Icon name="ri:close-line" size="20" />
            </button>
          </div>
          
          <!-- Scrollable Form Content -->
          <div
            class="flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full max-w-full box-border"
            :class="[isIos ? 'py-4 entry-panel-ios' : 'p-6']"
            data-add-entry-panel
          >
            <form class="grid gap-6 min-w-0 max-w-full w-full" @submit.prevent="onAddEntryFormSubmit">

              <!-- Simulator layout -->
              <template v-if="activeLogbook === 'simulator'">
                <div v-if="duplicableLastEntry" class="flex items-center justify-end mb-2">
                  <button
                    type="button"
                    @click="duplicateLastFlight"
                    :class="['text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border transition-colors',
                      isDarkMode ? 'text-gray-500 border-gray-700' : 'text-gray-400 border-gray-200'
                    ]"
                  >
                    Duplicate last
                  </button>
                </div>
                <div class="grid gap-6">
                  <!-- Session block: Date, Type, Time, Role -->
                  <div :class="['rounded-lg border p-4', isDarkMode ? 'border-white/10 bg-gray-900/50 shadow-md shadow-black/40' : 'border-gray-200 bg-white']">
                    <div :class="['text-[10px] uppercase font-bold mb-3', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Session</div>
                    <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4']">
                      <div>
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Date</label>
                        <input v-model="newEntry.date" type="date" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" required />
                      </div>
                      <div>
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Type</label>
                        <select
                          :value="getSelectedSimType(newEntry)"
                          :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                          @change="setSimType(newEntry, ($event.target as HTMLSelectElement).value as '' | 'FFS' | 'FTD' | 'ATD')"
                        >
                          <option value="">—</option>
                          <option v-for="opt in categoryClassSimOptions" :key="opt" :value="opt">{{ opt }}</option>
                        </select>
                      </div>
                      <div>
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Time</label>
                        <input
                          :value="getSimTimeDisplayValue(newEntry)"
                          type="text"
                          inputmode="decimal"
                          placeholder="0.0"
                          :disabled="!getSelectedSimType(newEntry)"
                          :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200', !getSelectedSimType(newEntry) ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : (isDarkMode ? 'text-white' : 'text-gray-900')]"
                          @input="(e) => {
                            const sel = getSelectedSimType(newEntry);
                            if (!sel) return;
                            const input = e.target as HTMLInputElement;
                            const val = input.value.trim();
                            if (val === '' || val === '-') {
                              newEntry.flightTime[sel.toLowerCase() as 'ffs'|'ftd'|'atd'] = null;
                              newEntry.flightTime.total = null;
                              syncSimRoleTime(newEntry);
                              return;
                            }
                            const num = parseFloat(val.replace(/[^\d.-]/g, ''));
                            const ok = !isNaN(num) && isFinite(num);
                            newEntry.flightTime[sel.toLowerCase() as 'ffs'|'ftd'|'atd'] = ok ? num : null;
                            newEntry.flightTime.total = ok ? num : null;
                            syncSimRoleTime(newEntry);
                          }"
                          @blur="(e) => {
                            const sel = getSelectedSimType(newEntry);
                            if (!sel) return;
                            const input = e.target as HTMLInputElement;
                            const val = newEntry.flightTime[sel.toLowerCase() as 'ffs'|'ftd'|'atd'];
                            if (val === null || val === undefined) { input.value = ''; } else { input.value = formatEntryTimeDisplay(val); }
                          }"
                        />
                      </div>
                      <div>
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Role</label>
                        <select v-model="newEntry.role" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" @change="syncSimRoleTime(newEntry)">
                          <option v-for="role in roleOptions" :key="role" :value="role">{{ roleDisplayLabel(role) }}</option>
                        </select>
                      </div>
                    </div>
                    <div :class="['mt-3 grid gap-4', isIos ? 'entry-grid-ios-2' : 'md:grid-cols-2']">
                      <div>
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">PIC / Captain</label>
                        <input v-model="newEntry.picName" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" autocomplete="off" />
                      </div>
                      <div>
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">SIC / First Officer</label>
                        <input v-model="newEntry.sicName" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" autocomplete="off" />
                      </div>
                    </div>
                    <div
                      class="mt-4 pt-3 border-t grid gap-4 grid-cols-1 sm:grid-cols-2"
                      :class="[
                        isDarkMode ? 'border-gray-600' : 'border-gray-200',
                        pilotProfile.enableMilitaryFields ? 'lg:grid-cols-4' : ''
                      ]"
                    >
                      <div>
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Simulated instrument (hrs)</label>
                        <input
                          :value="formatEntryTimeDisplay(newEntry.flightTime.simulatedInstrument)"
                          type="text"
                          inputmode="decimal"
                          placeholder="0.0"
                          :class="['w-full max-w-[120px] rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200', (newEntry.flightTime.simulatedInstrument === null || newEntry.flightTime.simulatedInstrument === 0 || newEntry.flightTime.simulatedInstrument === undefined) ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : (isDarkMode ? 'text-white' : 'text-gray-900')]"
                          @input="(e) => {
                            const input = e.target as HTMLInputElement;
                            const val = input.value.trim();
                            if (val === '' || val === '-') { newEntry.flightTime.simulatedInstrument = null; return; }
                            const num = parseFloat(val.replace(/[^\d.-]/g, ''));
                            newEntry.flightTime.simulatedInstrument = !isNaN(num) && isFinite(num) ? num : null;
                          }"
                          @blur="(e) => {
                            const input = e.target as HTMLInputElement;
                            const val = newEntry.flightTime.simulatedInstrument;
                            if (val === null || val === undefined) { input.value = ''; } else { input.value = formatEntryTimeDisplay(val); }
                          }"
                        />
                      </div>
                      <div>
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Dual Rcvd (hrs)</label>
                        <input
                          :value="formatEntryTimeDisplay(newEntry.flightTime.dual)"
                          type="text"
                          inputmode="decimal"
                          placeholder="0.0"
                          :class="['w-full max-w-[120px] rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200', (newEntry.flightTime.dual === null || newEntry.flightTime.dual === 0 || newEntry.flightTime.dual === undefined) ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : (isDarkMode ? 'text-white' : 'text-gray-900')]"
                          @input="(e) => {
                            const input = e.target as HTMLInputElement;
                            const val = input.value.trim();
                            if (val === '' || val === '-') { newEntry.flightTime.dual = null; return; }
                            const num = parseFloat(val.replace(/[^\d.-]/g, ''));
                            newEntry.flightTime.dual = !isNaN(num) && isFinite(num) ? num : null;
                          }"
                          @blur="(e) => {
                            const input = e.target as HTMLInputElement;
                            const val = newEntry.flightTime.dual;
                            if (val === null || val === undefined) { input.value = ''; } else { input.value = formatEntryTimeDisplay(val); }
                          }"
                        />
                      </div>
                      <div v-if="pilotProfile.enableMilitaryFields">
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Night (hrs)</label>
                        <input
                          :value="formatEntryTimeDisplay(newEntry.flightTime.night)"
                          type="text"
                          inputmode="decimal"
                          placeholder="0.0"
                          :class="['w-full max-w-[120px] rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200', (newEntry.flightTime.night === null || newEntry.flightTime.night === 0 || newEntry.flightTime.night === undefined) ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : (isDarkMode ? 'text-white' : 'text-gray-900')]"
                          @input="(e) => {
                            const input = e.target as HTMLInputElement;
                            const val = input.value.trim();
                            if (val === '' || val === '-') { newEntry.flightTime.night = null; return; }
                            const num = parseFloat(val.replace(/[^\d.-]/g, ''));
                            newEntry.flightTime.night = !isNaN(num) && isFinite(num) ? num : null;
                          }"
                          @blur="(e) => {
                            const input = e.target as HTMLInputElement;
                            const val = newEntry.flightTime.night;
                            if (val === null || val === undefined) { input.value = ''; } else { input.value = formatEntryTimeDisplay(val); }
                          }"
                        />
                      </div>
                      <div v-if="pilotProfile.enableMilitaryFields">
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">NVG (hrs)</label>
                        <input
                          :value="formatEntryTimeDisplay(newEntry.flightTime.nvg)"
                          type="text"
                          inputmode="decimal"
                          placeholder="0.0"
                          :class="['w-full max-w-[120px] rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200', (newEntry.flightTime.nvg === null || newEntry.flightTime.nvg === 0 || newEntry.flightTime.nvg === undefined) ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : (isDarkMode ? 'text-white' : 'text-gray-900')]"
                          @input="(e) => {
                            const input = e.target as HTMLInputElement;
                            const val = input.value.trim();
                            if (val === '' || val === '-') { newEntry.flightTime.nvg = null; return; }
                            const num = parseFloat(val.replace(/[^\d.-]/g, ''));
                            newEntry.flightTime.nvg = !isNaN(num) && isFinite(num) ? num : null;
                          }"
                          @blur="(e) => {
                            const input = e.target as HTMLInputElement;
                            const val = newEntry.flightTime.nvg;
                            if (val === null || val === undefined) { input.value = ''; } else { input.value = formatEntryTimeDisplay(val); }
                          }"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Optional details (collapsible) -->
                  <div :class="['rounded-lg border p-4', isDarkMode ? 'border-white/10 bg-gray-900/30 shadow-md shadow-black/40' : 'border-gray-200 bg-gray-50/50']">
                    <div :class="['text-[10px] uppercase font-bold mb-3', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Optional — Aircraft &amp; Route</div>
                    <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'md:grid-cols-2']">
                      <div>
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Aircraft</label>
                        <input v-model="newEntry.aircraftMakeModel" type="text" :class="['w-full rounded border px-2 py-1 text-sm font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" placeholder="OPTIONAL" />
                      </div>
                      <div class="relative">
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Ident</label>
                        <input
                          v-model="newEntry.registration"
                          type="text"
                          :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                          placeholder="OPTIONAL"
                          autocomplete="off"
                          @input="newEntry.registration = ($event.target as HTMLInputElement).value.toUpperCase()"
                          @focus="showIdentDropdown = true; highlightedIdentIndex = filteredAircraftForNewEntry.length > 0 ? 0 : -1"
                          @blur="handleIdentBlur"
                          @keydown="(e) => handleDropdownKeydown(e, 'ident', filteredAircraftForNewEntry, (item) => selectAircraftForNewEntry(item))"
                        />
                        <div
                          v-if="showIdentDropdown && filteredAircraftForNewEntry.length > 0"
                          data-dropdown="ident"
                          :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']"
                        >
                          <button
                            v-for="(aircraft, index) in filteredAircraftForNewEntry"
                            :key="aircraft.registration"
                            :data-index="index"
                            type="button"
                            :class="['w-full px-3 py-2 text-left text-sm font-mono uppercase transition-colors', highlightedIdentIndex === index ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')]"
                            @mousedown.prevent="selectAircraftForNewEntry(aircraft)"
                          >
                            {{ aircraft.registration }}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div :class="['grid gap-4 mt-3', isIos ? 'entry-grid-ios-2' : 'grid-cols-1 md:grid-cols-[1fr_1fr_2fr]']">
                      <div class="relative">
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">From</label>
                        <input
                          v-model="newEntry.departure"
                          type="text"
                          :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                          placeholder="OPTIONAL"
                          autocomplete="off"
                          @input="(e) => { newEntry.departure = (e.target as HTMLInputElement).value.toUpperCase(); nextTick(() => checkAndAutoLogCrossCountry()) }"
                          @focus="showFromDropdown = true; highlightedFromIndex = filteredAirportsForFrom.length > 0 ? 0 : -1"
                          @keydown="(e) => handleDropdownKeydown(e, 'from', filteredAirportsForFrom, (item) => selectAirportForFrom(item))"
                          @blur="handleFromBlur"
                        />
                        <div v-if="showFromDropdown && filteredAirportsForFrom.length > 0" data-dropdown="from" :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']">
                          <button v-for="(airport, index) in filteredAirportsForFrom" :key="airport" :data-index="index" type="button" :class="['w-full px-3 py-2 text-left text-sm font-mono uppercase transition-colors', highlightedFromIndex === index ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')]" @mousedown.prevent="selectAirportForFrom(airport)">{{ airport }}</button>
                        </div>
                      </div>
                      <div class="relative">
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">To</label>
                        <input
                          v-model="newEntry.destination"
                          type="text"
                          :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                          placeholder="OPTIONAL"
                          autocomplete="off"
                          @input="(e) => { newEntry.destination = (e.target as HTMLInputElement).value.toUpperCase(); nextTick(() => checkAndAutoLogCrossCountry()) }"
                          @focus="showToDropdown = true; highlightedToIndex = filteredAirportsForTo.length > 0 ? 0 : -1"
                          @keydown="(e) => handleDropdownKeydown(e, 'to', filteredAirportsForTo, (item) => selectAirportForTo(item))"
                          @blur="handleToBlur"
                        />
                        <div v-if="showToDropdown && filteredAirportsForTo.length > 0" data-dropdown="to" :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']">
                          <button v-for="(airport, index) in filteredAirportsForTo" :key="airport" :data-index="index" type="button" :class="['w-full px-3 py-2 text-left text-sm font-mono uppercase transition-colors', highlightedToIndex === index ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')]" @mousedown.prevent="selectAirportForTo(airport)">{{ airport }}</button>
                        </div>
                      </div>
                      <div :class="isIos ? 'col-span-2' : ''">
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Route</label>
                        <input v-model="newEntry.route" type="text" :class="['w-full rounded border px-2 py-1 text-sm font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" placeholder="OPTIONAL" @input="() => nextTick(() => checkAndAutoLogCrossCountry())" @blur="newEntry.route = (newEntry.route || '').trim().toUpperCase(); checkAndAutoLogCrossCountry()" />
                      </div>
                    </div>
                  </div>

                  <!-- Performance: Approaches & Holds -->
                  <div>
                    <div :class="['text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Performance</div>
                    <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4']">
                      <div>
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Day Ldg</label>
                        <input v-model.number="newEntry.performance.dayLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" />
                      </div>
                      <div>
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Night Ldg</label>
                        <input v-model.number="newEntry.performance.nightLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" />
                      </div>
                      <div>
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Holds</label>
                        <input v-model.number="newEntry.performance.holdingProcedures" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" />
                      </div>
                    </div>
                    <div class="mt-3">
                      <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Approaches</label>
                      <div class="space-y-1.5">
                        <div v-for="(approach, aIdx) in (newEntry.performance.approaches || [])" :key="'sim-new-' + aIdx" class="flex gap-2 items-center">
                          <select v-model="approach.type" :class="['flex-1 max-w-[120px] rounded border px-2 py-1 text-sm font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']">
                            <option v-for="opt in approachTypeOptions" :key="opt" :value="opt">{{ opt }}</option>
                            <option value="Other">Other</option>
                          </select>
                          <input v-model.number="approach.count" type="number" min="1" class="w-14 rounded border px-2 py-1 text-sm text-center font-mono" :class="isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900'" />
                          <button type="button" aria-label="Remove approach" @click="newEntry.performance.approaches!.splice(aIdx, 1)" :class="['p-1 rounded', isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-200']">
                            <Icon name="ri:close-line" size="16" />
                          </button>
                        </div>
                        <button type="button" @click="(newEntry.performance.approaches ||= []).push({ type: 'ILS', count: 1 })" :class="['text-xs font-quicksand', isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700']">+ Add approach</button>
                      </div>
                    </div>
                  </div>

                  <!-- Conditions, Tags, Remarks, Pilot -->
                  <div :class="isIos ? 'grid gap-2 entry-grid-ios-2' : 'flex flex-wrap gap-3'">
                    <label v-for="condition in activeConditionOptions" :key="condition.value" :class="['rounded-lg border text-sm font-quicksand cursor-pointer transition-all', isIos ? 'entry-chip-ios' : 'inline-flex items-center gap-2 px-4 py-2', (newEntry.flightConditions || []).includes(condition.value) ? (isDarkMode ? 'border-blue-500 bg-blue-900/30 text-blue-300' : 'border-blue-500 bg-blue-50 text-blue-700') : (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200')]">
                      <input v-model="newEntry.flightConditions" :value="condition.value" type="checkbox" :class="['rounded border transition-colors flex-shrink-0', isIos ? 'h-[18px] w-[18px]' : 'h-4 w-4', isDarkMode ? 'border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500' : 'border-gray-400 bg-gray-100 text-blue-600 focus:ring-blue-500']" />
                      <span>{{ condition.label }}</span>
                    </label>
                  </div>
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Tags</label>
                    <div :class="[isIos ? 'grid gap-2 entry-grid-ios-2 mb-3' : 'flex flex-wrap gap-2 mb-3 items-center']">
                      <template v-for="tag in [...allTagOptions, ...customTagsFor(newEntry)]" :key="'sim-new-' + tag">
                        <label
                          :class="[
                            'rounded-lg border text-sm font-quicksand cursor-pointer transition-all',
                            isIos ? 'entry-chip-ios' : 'inline-flex items-center gap-2 px-3 py-1.5',
                            (newEntry.tags || []).includes(tag)
                              ? (isDarkMode ? 'border-blue-500 bg-blue-900/30 text-blue-300' : 'border-blue-500 bg-blue-50 text-blue-700')
                              : (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500' : 'border-gray-300 bg-gray-100 text-gray-600 hover:border-gray-400')
                          ]"
                        >
                          <input v-model="newEntry.tags" type="checkbox" :value="tag" :class="['rounded border transition-colors flex-shrink-0', isIos ? 'h-[18px] w-[18px]' : 'h-4 w-4', isDarkMode ? 'border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500' : 'border-gray-400 bg-gray-100 text-blue-600 focus:ring-blue-500']" />
                          <span>{{ tag }}</span>
                        </label>
                      </template>
                      <template v-if="!showNewEntryCustomTagInput">
                        <button type="button" @click="showNewEntryCustomTagInput = true" :class="['inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-quicksand transition-all', isIos ? 'col-span-2' : '', isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-400 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200']" aria-label="Add custom tag">+</button>
                      </template>
                      <template v-else>
                        <div :class="['inline-flex gap-1 items-center', isIos ? 'col-span-2' : '']">
                          <input v-model="customTagInput" type="text" placeholder="Custom tag" :class="['w-28 rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" @keydown.enter.prevent="addCustomTag(newEntry, customTagInput); customTagInput = ''; showNewEntryCustomTagInput = false" />
                          <button type="button" @click="addCustomTag(newEntry, customTagInput); customTagInput = ''; showNewEntryCustomTagInput = false" :class="['rounded px-2 py-1 text-xs', isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300']">Add</button>
                          <button type="button" @click="showNewEntryCustomTagInput = false; customTagInput = ''" :class="['rounded p-1', isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-200']" aria-label="Cancel"><Icon name="ri:close-line" size="16" /></button>
                        </div>
                      </template>
                    </div>
                  </div>
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Remarks / Applicable 61.51 Notes</label>
                    <textarea v-model="newEntry.remarks" rows="3" placeholder="Document training received, endorsements pending, or other relevant notes." :class="['w-full rounded border px-2 py-2 text-sm font-quicksand transition-colors duration-300', isDarkMode ? 'border-white/10 bg-black/20 text-white placeholder-gray-400 shadow-inner' : 'border-gray-300 bg-gray-100 text-gray-900 placeholder-gray-400']"></textarea>
                  </div>
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Pilot</label>
                    <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'md:grid-cols-3']">
                      <div>
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Job</label>
                        <select v-model="newEntry.trainingInstructor" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']">
                          <option value="">Select...</option>
                          <option value="Student">Student</option>
                          <option value="Instructor">Instructor</option>
                          <option value="Safety Pilot">Safety Pilot</option>
                          <option value="Captain">Captain</option>
                          <option value="First Officer">First Officer</option>
                        </select>
                      </div>
                      <div :class="['relative', isIos ? 'col-span-2' : '']">
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Name</label>
                        <input v-model="newEntry.trainingElements" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" placeholder="Pilot Name" autocomplete="off" @focus="showPilotNameDropdown = true; highlightedPilotIndex = filteredPilots.length > 0 ? 0 : -1" @keydown="(e) => handleDropdownKeydown(e, 'pilot', filteredPilots, (item) => selectPilotName(item))" @blur="handlePilotNameBlur" />
                        <div v-if="showPilotNameDropdown && filteredPilots.length > 0" data-dropdown="pilot" :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']">
                          <button v-for="(pilot, index) in filteredPilots" :key="pilot" :data-index="index" type="button" :class="['w-full px-3 py-2 text-left text-sm transition-colors', highlightedPilotIndex === index ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')]" @mousedown.prevent="selectPilotName(pilot)">{{ pilot }}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Flight layout -->
              <template v-else>
              <div class="flex items-center justify-between mb-2">
                <button
                  type="button"
                  @click="toggleCommercialMode"
                  :class="['text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border transition-colors', 
                    isCommercialMode 
                      ? (isDarkMode ? 'bg-blue-900/30 text-blue-300 border-blue-700' : 'bg-blue-100 text-blue-700 border-blue-200')
                      : (isDarkMode ? 'text-gray-500 border-gray-700' : 'text-gray-400 border-gray-200')
                  ]"
                >
                  {{ isCommercialMode ? 'OOOI Active' : '+ OOOI' }}
                </button>
                <button
                  v-if="duplicableLastEntry"
                  type="button"
                  @click="duplicateLastFlight"
                  :class="['text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border transition-colors',
                    isDarkMode ? 'text-gray-500 border-gray-700' : 'text-gray-400 border-gray-200'
                  ]"
                >
                  Duplicate last
                </button>
              </div>

              <div v-if="isCommercialMode" class="mb-4">
                <div class="flex justify-between items-center mb-2 px-2">
                  <span :class="['text-xs font-medium', isDarkMode ? 'text-gray-400' : 'text-gray-600']">Time Format:</span>
                  <button 
                    type="button"
                    @click="newEntry.oooi && (newEntry.oooi.isZulu = !newEntry.oooi.isZulu)"
                    :class="[
                      'px-3 py-1 text-xs font-medium rounded transition-colors',
                      newEntry.oooi?.isZulu
                        ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                        : (isDarkMode ? 'bg-gray-700 text-gray-300 border border-gray-600' : 'bg-gray-200 text-gray-700 border border-gray-300')
                    ]"
                  >
                    {{ newEntry.oooi?.isZulu ? 'Zulu (UTC)' : 'Local' }}
                  </button>
                </div>
                <div :class="['grid gap-2 p-2 rounded border border-dashed border-gray-600/50', isIos ? 'entry-grid-ios-2' : 'grid-cols-2 sm:grid-cols-4']">
                 <div v-for="field in oooiFields" :key="field">
                    <label :class="['block text-[10px] uppercase font-bold mb-1 text-center', isDarkMode ? 'text-blue-400' : 'text-blue-600']">{{ oooiFieldLabels[field] }}</label>
                    <input 
                      v-if="newEntry.oooi" 
                      v-model="newEntry.oooi[field]" 
                      type="text" 
                      maxlength="4" 
                      placeholder="1430" 
                      @input="(e) => { if (newEntry.oooi && field !== 'isZulu') (newEntry.oooi as unknown as Record<string, string | null>)[field] = formatOOOIInput((e.target as HTMLInputElement).value) }"
                      :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" 
                    />
                  </div>
                 </div>
              </div>
            
              <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'md:grid-cols-4']">
                <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Date</label>
                  <input v-model="newEntry.date" type="date" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" required />
                </div>
                <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Role</label>
                  <select v-model="newEntry.role" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']">
                    <option v-for="role in roleOptions" :key="role" :value="role">{{ roleDisplayLabel(role) }}</option>
                  </select>
                </div>
                <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Aircraft</label>
                  <input v-model="newEntry.aircraftMakeModel" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" :required="!isLoggingSimTime(newEntry)" />
                </div>
                <div class="relative">
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Ident</label>
                  <input 
                    v-model="newEntry.registration" 
                    type="text" 
                    :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" 
                    :required="!isLoggingSimTime(newEntry)"
                    autocomplete="off"
                    @input="newEntry.registration = ($event.target as HTMLInputElement).value.toUpperCase()"
                    @focus="showIdentDropdown = true; highlightedIdentIndex = filteredAircraftForNewEntry.length > 0 ? 0 : -1"
                    @blur="handleIdentBlur"
                    @keydown="(e) => handleDropdownKeydown(e, 'ident', filteredAircraftForNewEntry, (item) => selectAircraftForNewEntry(item))"
                  />
                  <!-- Aircraft Ident Dropdown -->
                  <div 
                    v-if="showIdentDropdown && filteredAircraftForNewEntry.length > 0"
                    data-dropdown="ident"
                    :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']"
                  >
                    <button
                      v-for="(aircraft, index) in filteredAircraftForNewEntry"
                      :key="aircraft.registration"
                      :data-index="index"
                      type="button"
                      :class="[
                        'w-full px-3 py-2 text-left text-sm font-mono uppercase transition-colors',
                        highlightedIdentIndex === index
                          ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                          : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')
                      ]"
                      @mousedown.prevent="selectAircraftForNewEntry(aircraft)"
                    >
                      {{ aircraft.registration }}
                    </button>
                  </div>
                </div>
              </div>
              <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'md:grid-cols-2']">
                <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">PIC / Captain</label>
                  <input v-model="newEntry.picName" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" autocomplete="off" />
                </div>
                <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">SIC / First Officer</label>
                  <input v-model="newEntry.sicName" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" autocomplete="off" />
                </div>
              </div>
              <div :class="['grid gap-4 mb-2 items-end', isIos ? 'entry-grid-ios-1' : 'md:grid-cols-4']">
                <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Flight Number</label>
                  <input 
                    v-model="newEntry.flightNumber" 
                    type="text" 
                    :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" 
                    autocomplete="off"
                    placeholder="OPTIONAL"
                  />
                </div>
              </div>

              <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'entry-grid-route-row']">
                <div class="relative">
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">From</label>
                  <input 
                    v-model="newEntry.departure" 
                    type="text" 
                    :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" 
                    required
                    autocomplete="off"
                    @input="(e) => { 
                      newEntry.departure = (e.target as HTMLInputElement).value.toUpperCase()
                      // Trigger cross-country check after a brief delay to allow value to update
                      nextTick(() => checkAndAutoLogCrossCountry())
                    }"
                    @focus="showFromDropdown = true; highlightedFromIndex = filteredAirportsForFrom.length > 0 ? 0 : -1"
                    @keydown="(e) => handleDropdownKeydown(e, 'from', filteredAirportsForFrom, (item) => selectAirportForFrom(item))"
                    @blur="handleFromBlur"
                  />
                  <!-- Airport FROM Dropdown -->
                  <div 
                    v-if="showFromDropdown && filteredAirportsForFrom.length > 0"
                    data-dropdown="from"
                    :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']"
                  >
                    <button
                      v-for="(airport, index) in filteredAirportsForFrom"
                      :key="airport"
                      :data-index="index"
                      type="button"
                      :class="[
                        'w-full px-3 py-2 text-left text-sm font-mono uppercase transition-colors',
                        highlightedFromIndex === index
                          ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                          : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')
                      ]"
                      @mousedown.prevent="selectAirportForFrom(airport)"
                    >
                      {{ airport }}
                    </button>
                  </div>
                </div>
                <div class="relative">
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">To</label>
                  <input 
                    v-model="newEntry.destination" 
                    type="text" 
                    :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" 
                    required
                    autocomplete="off"
                    @input="(e) => { 
                      newEntry.destination = (e.target as HTMLInputElement).value.toUpperCase()
                      // Trigger cross-country check after a brief delay to allow value to update
                      nextTick(() => checkAndAutoLogCrossCountry())
                    }"
                    @focus="showToDropdown = true; highlightedToIndex = filteredAirportsForTo.length > 0 ? 0 : -1"
                    @keydown="(e) => handleDropdownKeydown(e, 'to', filteredAirportsForTo, (item) => selectAirportForTo(item))"
                    @blur="handleToBlur"
                  />
                  <!-- Airport TO Dropdown -->
                  <div 
                    v-if="showToDropdown && filteredAirportsForTo.length > 0"
                    data-dropdown="to"
                    :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']"
                  >
                    <button
                      v-for="(airport, index) in filteredAirportsForTo"
                      :key="airport"
                      :data-index="index"
                      type="button"
                      :class="[
                        'w-full px-3 py-2 text-left text-sm font-mono uppercase transition-colors',
                        highlightedToIndex === index
                          ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                          : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')
                      ]"
                      @mousedown.prevent="selectAirportForTo(airport)"
                    >
                      {{ airport }}
                    </button>
                  </div>
                </div>
                <div class="min-w-0">
                  <label :class="['block text-[10px] uppercase font-bold mb-1 truncate', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Category/Class</label>
                  <select
                    :value="categoryClassAircraftOptions.includes(newEntry.aircraftCategoryClass as any) ? newEntry.aircraftCategoryClass : ''"
                    :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                    @change="newEntry.aircraftCategoryClass = ($event.target as HTMLSelectElement).value"
                  >
                    <option value="">—</option>
                    <option v-for="opt in categoryClassAircraftOptions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </div>
                <div class="entry-grid-time-col">
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Time</label>
                  <input
                    :value="formatEntryTimeDisplay(newEntry.categoryClassTime)"
                    type="text"
                    inputmode="decimal"
                    placeholder="0.0"
                    :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                    @input="(e) => {
                      const input = e.target as HTMLInputElement;
                      const val = input.value.trim();
                      if (val === '' || val === '-') {
                        newEntry.categoryClassTime = null;
                        return;
                      }
                      const num = parseFloat(val.replace(/[^\d.-]/g, ''));
                      newEntry.categoryClassTime = !isNaN(num) && isFinite(num) ? num : null;
                    }"
                    @blur="(e) => {
                      (e.target as HTMLInputElement).value = formatEntryTimeDisplay(newEntry.categoryClassTime);
                    }"
                  />
                </div>
                <div :class="isIos ? 'col-span-2' : ''">
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Route</label>
                  <input v-model="newEntry.route" type="text" :class="['w-full rounded border px-2 py-1 text-sm font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" @input="() => nextTick(() => checkAndAutoLogCrossCountry())" @blur="newEntry.route = (newEntry.route || '').trim().toUpperCase(); checkAndAutoLogCrossCountry()" />
                </div>
              </div>
              
              <!-- Flight Times (main air time only; sim time is under Category/Class) -->
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Time</label>
                <div :class="['grid gap-3 w-full', isIos ? 'entry-grid-ios-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5']">
                  <div v-for="field in mainTimeFields" :key="field.key">
                    <div :class="['text-[9px] uppercase font-bold mb-1 text-center whitespace-normal sm:whitespace-nowrap', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                      {{ mainTimeShortLabels[field.key] ?? field.label }}
                    </div>
                    <input
                      :value="formatEntryTimeDisplay(newEntry.flightTime[field.key])"
                      type="text"
                      inputmode="decimal"
                      :placeholder="'0.0'"
                      :class="[
                        'w-full rounded border px-2 py-1 text-sm text-center font-mono',
                        field.key !== 'total' ? 'cursor-pointer' : '',
                        isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200',
                        (newEntry.flightTime[field.key] === null || newEntry.flightTime[field.key] === 0 || newEntry.flightTime[field.key] === undefined)
                          ? (isDarkMode ? 'text-gray-500' : 'text-gray-400')
                          : (isDarkMode ? 'text-white' : 'text-gray-900')
                      ]"
                      @input="(e) => {
                        const input = e.target as HTMLInputElement;
                        const val = input.value.trim();
                        
                        // Track manual XC time entry
                        if (field.key === 'crossCountry') {
                          setXcTimeManuallySet(true);
                        }
                        
                        // Handle empty input
                        if (val === '' || val === '-') {
                          newEntry.flightTime[field.key] = null;
                          if (field.key === 'crossCountry') {
                            setXcTimeManuallySet(false);
                          }
                          return;
                        }
                        
                        // Remove any non-numeric characters except decimal point and minus
                        const cleaned = val.replace(/[^\d.-]/g, '');
                        
                        // Parse as float
                        const num = parseFloat(cleaned);
                        
                        if (isNaN(num)) {
                          // Invalid input - revert to previous value or null
                          newEntry.flightTime[field.key] = null;
                          if (field.key === 'crossCountry') {
                            setXcTimeManuallySet(false);
                          }
                        } else {
                          // Ensure it's a valid number (not Infinity, etc.)
                          newEntry.flightTime[field.key] = isFinite(num) ? num : null;
                        }
                      }"
                      @click="field.key !== 'total' && fillFieldWithTotalTime(field.key, newEntry.flightTime.total, false)"
                      @blur="(e) => {
                        const input = e.target as HTMLInputElement;
                        const val = newEntry.flightTime[field.key];
                        input.value = formatEntryTimeDisplay(val);
                      }"
                    />
                  </div>
                </div>
              </div>

               <!-- Performance -->
               <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4']">
                 <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Day Ldg</label>
                    <input v-model.number="newEntry.performance.dayLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" />
                 </div>
                 <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Night Ldg</label>
                    <input v-model.number="newEntry.performance.nightLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" />
                 </div>
                 <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Holds</label>
                    <input v-model.number="newEntry.performance.holdingProcedures" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" />
                 </div>
                 <div class="col-span-2 md:col-span-4">
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Approaches</label>
                    <div class="space-y-1.5">
                      <div
                        v-for="(approach, aIdx) in (newEntry.performance.approaches || [])"
                        :key="'new-' + aIdx"
                        class="flex gap-2 items-center"
                      >
                        <select
                          v-model="approach.type"
                          :class="['flex-1 max-w-[120px] rounded border px-2 py-1 text-sm font-mono', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
                        >
                          <option v-for="opt in approachTypeOptions" :key="opt" :value="opt">{{ opt }}</option>
                          <option value="Other">Other</option>
                        </select>
                        <input v-model.number="approach.count" type="number" min="1" class="w-14 rounded border px-2 py-1 text-sm text-center font-mono" :class="isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900'" />
                        <button type="button" aria-label="Remove approach" @click="newEntry.performance.approaches!.splice(aIdx, 1)" :class="['p-1 rounded', isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-200']">
                          <Icon name="ri:close-line" size="16" />
                        </button>
                      </div>
                      <button type="button" @click="(newEntry.performance.approaches ||= []).push({ type: 'ILS', count: 1 })" :class="['text-xs font-quicksand', isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700']">
                        + Add approach
                      </button>
                    </div>
                 </div>
               </div>

              <div :class="isIos ? 'grid gap-2 entry-grid-ios-2' : 'flex flex-wrap gap-3'">
                <label
                  v-for="condition in activeConditionOptions"
                  :key="condition.value"
                  :class="[
                    'rounded-lg border text-sm font-quicksand cursor-pointer transition-all',
                    isIos ? 'entry-chip-ios' : 'inline-flex items-center gap-2 px-4 py-2',
                    (newEntry.flightConditions || []).includes(condition.value)
                      ? (isDarkMode ? 'border-blue-500 bg-blue-900/30 text-blue-300' : 'border-blue-500 bg-blue-50 text-blue-700')
                      : (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200')
                  ]"
                >
                  <input
                    v-model="newEntry.flightConditions"
                    :value="condition.value"
                    type="checkbox"
                    :class="[
                      'rounded border transition-colors flex-shrink-0',
                      isIos ? 'h-[18px] w-[18px]' : 'h-4 w-4',
                      isDarkMode 
                        ? 'border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500' 
                        : 'border-gray-400 bg-gray-100 text-blue-600 focus:ring-blue-500'
                    ]"
                  />
                  <span>{{ condition.label }}</span>
                </label>
              </div>

              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Tags</label>
                <div :class="[isIos ? 'grid gap-2 entry-grid-ios-2 mb-3' : 'flex flex-wrap gap-2 mb-3 items-center']">
                  <template v-for="tag in [...allTagOptions, ...customTagsFor(newEntry)]" :key="'new-' + tag">
                    <label
                      :class="[
                        'rounded-lg border text-sm font-quicksand cursor-pointer transition-all',
                        isIos ? 'entry-chip-ios' : 'inline-flex items-center gap-2 px-3 py-1.5',
                        (newEntry.tags || []).includes(tag)
                          ? (isDarkMode ? 'border-blue-500 bg-blue-900/30 text-blue-300' : 'border-blue-500 bg-blue-50 text-blue-700')
                          : (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500' : 'border-gray-300 bg-gray-100 text-gray-600 hover:border-gray-400')
                      ]"
                    >
                      <input v-model="newEntry.tags" type="checkbox" :value="tag" :class="['rounded border transition-colors flex-shrink-0', isIos ? 'h-[18px] w-[18px]' : 'h-4 w-4', isDarkMode ? 'border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500' : 'border-gray-400 bg-gray-100 text-blue-600 focus:ring-blue-500']" />
                      <span>{{ tag }}</span>
                    </label>
                  </template>
                  <template v-if="!showNewEntryCustomTagInput">
                    <button type="button" @click="showNewEntryCustomTagInput = true" :class="['inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-quicksand transition-all', isIos ? 'col-span-2' : '', isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-400 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200']" aria-label="Add custom tag">+</button>
                  </template>
                  <template v-else>
                    <div :class="['inline-flex gap-1 items-center', isIos ? 'col-span-2' : '']">
                      <input v-model="customTagInput" type="text" placeholder="Custom tag" :class="['w-28 rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" @keydown.enter.prevent="addCustomTag(newEntry, customTagInput); customTagInput = ''; showNewEntryCustomTagInput = false" />
                      <button type="button" @click="addCustomTag(newEntry, customTagInput); customTagInput = ''; showNewEntryCustomTagInput = false" :class="['rounded px-2 py-1 text-xs', isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300']">Add</button>
                      <button type="button" @click="showNewEntryCustomTagInput = false; customTagInput = ''" :class="['rounded p-1', isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-200']" aria-label="Cancel"><Icon name="ri:close-line" size="16" /></button>
                    </div>
                  </template>
                </div>
              </div>

              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Remarks / Applicable 61.51 Notes</label>
                <textarea
                  v-model="newEntry.remarks"
                  rows="3"
                  placeholder="Document training received, endorsements pending, or other relevant notes."
                  :class="[
                    'w-full rounded border px-2 py-2 text-sm font-quicksand transition-colors duration-300',
                    isDarkMode 
                      ? 'border-white/10 bg-black/20 text-white placeholder-gray-400 shadow-inner' 
                      : 'border-gray-300 bg-gray-100 text-gray-900 placeholder-gray-400'
                  ]"
                ></textarea>
              </div>

              <!-- Pilot Section -->
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Pilot</label>
                <div :class="['grid gap-4', isIos ? 'entry-grid-ios-2' : 'md:grid-cols-3']">
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Job</label>
                    <select v-model="newEntry.trainingInstructor" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']">
                      <option value="">Select...</option>
                      <option value="Student">Student</option>
                      <option value="Instructor">Instructor</option>
                      <option value="Safety Pilot">Safety Pilot</option>
                      <option value="Captain">Captain</option>
                      <option value="First Officer">First Officer</option>
                    </select>
                  </div>
                  <div :class="['relative', isIos ? 'col-span-2' : '']">
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Name</label>
                    <input 
                      v-model="newEntry.trainingElements" 
                      type="text" 
                      :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" 
                      placeholder="Pilot Name"
                      autocomplete="off"
                      @focus="showPilotNameDropdown = true; highlightedPilotIndex = filteredPilots.length > 0 ? 0 : -1"
                      @keydown="(e) => handleDropdownKeydown(e, 'pilot', filteredPilots, (item) => selectPilotName(item))"
                      @blur="handlePilotNameBlur"
                    />
                    <!-- Pilot Name Dropdown -->
                    <div 
                      v-if="showPilotNameDropdown && filteredPilots.length > 0"
                      data-dropdown="pilot"
                      :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-black/20 border-white/10 shadow-inner' : 'bg-white border-gray-200']"
                    >
                      <button
                        v-for="(pilot, index) in filteredPilots"
                        :key="pilot"
                        :data-index="index"
                        type="button"
                        :class="[
                          'w-full px-3 py-2 text-left text-sm transition-colors',
                          highlightedPilotIndex === index
                            ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                            : (isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-200')
                        ]"
                        @mousedown.prevent="selectPilotName(pilot)"
                      >
                        {{ pilot }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              </template>

              <div
                v-if="newEntryNeedsSignature"
                :class="[
                  'rounded-lg border p-3 space-y-3 font-quicksand',
                  isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                ]"
              >
                <p :class="['text-sm font-semibold', isDarkMode ? 'text-gray-100' : 'text-gray-900']">
                  Instructor signature
                </p>
                <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Dual Received time is set. Use a linked instructor (PIN) or a guest / fill-in instructor (drawn signature).
                </p>
                <label class="block text-sm">
                  <span :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">Instructor</span>
                  <select
                    v-model="signInstructorId"
                    :class="[
                      'mt-1 w-full rounded-lg border px-3 py-2 text-sm',
                      isDarkMode ? 'border-gray-600 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                    ]"
                  >
                    <option disabled value="">Select instructor</option>
                    <optgroup v-if="mainInstructorsForSigning.length" label="Main">
                      <option
                        v-for="row in mainInstructorsForSigning"
                        :key="row.id"
                        :value="row.instructor_id"
                      >
                        {{ instructorDisplayName(row) }} (Main)
                      </option>
                    </optgroup>
                    <optgroup v-if="otherInstructorsForSigning.length" label="Instructors">
                      <option
                        v-for="row in otherInstructorsForSigning"
                        :key="row.id"
                        :value="row.instructor_id"
                      >
                        {{ instructorDisplayName(row) }}
                      </option>
                    </optgroup>
                    <option :value="GUEST_SIGNER_VALUE">Guest / fill-in instructor</option>
                  </select>
                </label>
                <template v-if="isGuestSignerSelected">
                  <label class="block text-sm">
                    <span :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">Guest instructor name</span>
                    <input
                      v-model="guestSignerName"
                      type="text"
                      autocomplete="name"
                      placeholder="Full name"
                      :class="[
                        'mt-1 w-full rounded-lg border px-3 py-2 text-sm',
                        isDarkMode ? 'border-gray-600 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                      ]"
                    />
                  </label>
                  <label class="block text-sm">
                    <span :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">Certificate # (optional)</span>
                    <input
                      v-model="guestCertificateNumber"
                      type="text"
                      autocomplete="off"
                      placeholder="CFI / certificate number"
                      :class="[
                        'mt-1 w-full rounded-lg border px-3 py-2 text-sm',
                        isDarkMode ? 'border-gray-600 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                      ]"
                    />
                  </label>
                  <div>
                    <span :class="['block text-sm mb-1', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Signature</span>
                    <SignaturePad
                      ref="addGuestPadRef"
                      :is-dark-mode="isDarkMode"
                      :disabled="isSubmittingSign || isSavingEntry"
                      @change="(v) => (guestPadHasInk = v)"
                    />
                  </div>
                  <div class="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      :disabled="guestQrCreating || isSavingEntry || isSubmittingSign"
                      :class="[
                        'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold border',
                        isDarkMode
                          ? 'border-cyan-700/60 bg-cyan-900/30 text-cyan-100 hover:bg-cyan-900/50'
                          : 'border-cyan-300 bg-cyan-50 text-cyan-900 hover:bg-cyan-100',
                        (guestQrCreating || isSavingEntry) ? 'opacity-60 cursor-not-allowed' : ''
                      ]"
                      @click.prevent="startGuestSignOnPhoneFromAdd"
                    >
                      <Icon v-if="guestQrCreating" name="ri:loader-4-line" class="animate-spin" size="16" />
                      <Icon v-else name="ri:qr-code-line" size="16" />
                      {{ guestQrCreating ? 'Creating QR…' : 'Sign on phone (QR)' }}
                    </button>
                  </div>
                  <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Saves the entry, then opens a QR for the guest’s phone.
                  </p>
                  <p v-if="guestQrError" :class="['text-xs', isDarkMode ? 'text-red-300' : 'text-red-600']">
                    {{ guestQrError }}
                  </p>
                </template>
                <template v-else>
                  <label class="block text-sm">
                    <span :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">Instructor signing PIN</span>
                    <input
                      v-model="signPin"
                      type="password"
                      autocomplete="off"
                      maxlength="12"
                      placeholder="4–12 characters"
                      :class="[
                        'mt-1 w-full rounded-lg border px-3 py-2 text-base',
                        isDarkMode ? 'border-gray-600 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                      ]"
                    />
                  </label>
                  <p
                    v-if="activeInstructorsForSigning.length === 0"
                    :class="['text-xs', isDarkMode ? 'text-amber-300' : 'text-amber-700']"
                  >
                    No linked instructors — choose Guest / fill-in, or link someone in Settings → Instructor Links.
                  </p>
                </template>
              </div>

              <div
                :class="[
                  'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
                  isIos ? 'entry-panel-actions-ios' : ''
                ]"
              >
                <div class="flex flex-col gap-2">
                  <div v-if="validationError" :class="['font-quicksand text-sm', isDarkMode ? 'text-red-400' : 'text-red-600']">
                    {{ validationError }}
                  </div>
                  <div v-if="duplicateWarning" 
                       :class="['rounded-lg border p-3', isDarkMode ? 'border-yellow-700 bg-yellow-900/20' : 'border-yellow-300 bg-yellow-50']">
                    <div class="flex items-start gap-2">
                      <Icon name="ri:alert-line" size="20" :class="[isDarkMode ? 'text-yellow-400' : 'text-yellow-600', 'flex-shrink-0 mt-0.5']" />
                      <div class="flex-1">
                        <div :class="['font-quicksand text-sm font-semibold mb-1', isDarkMode ? 'text-yellow-300' : 'text-yellow-800']">
                          Duplicate Entry Detected
                        </div>
                        <div :class="['font-quicksand text-xs mb-2', isDarkMode ? 'text-yellow-200' : 'text-yellow-700']">
                          This entry matches {{ duplicateWarning.matches.length }} existing {{ duplicateWarning.matches.length === 1 ? 'entry' : 'entries' }}:
                        </div>
                        <div class="space-y-1">
                          <div v-for="match in duplicateWarning.matches.slice(0, 3)" :key="match.id"
                               :class="['font-quicksand text-xs', isDarkMode ? 'text-yellow-200' : 'text-yellow-800']">
                            • {{ formatDisplayDate(match.date) }} · {{ match.registration }} · {{ formatEntryAirportCode(match, match.departure) }} → {{ formatEntryAirportCode(match, match.destination) }}
                          </div>
                          <div v-if="duplicateWarning.matches.length > 3"
                               :class="['font-quicksand text-xs', isDarkMode ? 'text-yellow-300' : 'text-yellow-700']">
                            ... and {{ duplicateWarning.matches.length - 3 }} more
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-if="validationWarning && (hasErrors || hasWarnings)" 
                       :class="['rounded-lg border p-3', hasErrors ? (isDarkMode ? 'border-red-700 bg-red-900/20' : 'border-red-300 bg-red-50') : (isDarkMode ? 'border-yellow-700 bg-yellow-900/20' : 'border-yellow-300 bg-yellow-50')]">
                    <div class="flex items-start gap-2">
                      <Icon 
                        :name="hasErrors ? 'ri:error-warning-line' : 'ri:alert-line'" 
                        size="20" 
                        :class="[hasErrors ? (isDarkMode ? 'text-red-400' : 'text-red-600') : (isDarkMode ? 'text-yellow-400' : 'text-yellow-600'), 'flex-shrink-0 mt-0.5']" 
                      />
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                          <div :class="['font-quicksand text-sm font-semibold', hasErrors ? (isDarkMode ? 'text-red-300' : 'text-red-800') : (isDarkMode ? 'text-yellow-300' : 'text-yellow-800')]">
                            {{ hasErrors ? 'Validation Errors' : 'Validation Warnings' }}
                          </div>
                          <span v-if="validationErrors.some(r => r.message.includes('Part 61') || r.message.includes('14 CFR'))" 
                                :class="['text-xs px-2 py-0.5 rounded font-semibold', isDarkMode ? 'bg-red-800/30 text-red-300' : 'bg-red-100 text-red-700']">
                            Part 61
                          </span>
                        </div>
                        <div class="space-y-2">
                          <div v-for="(result, index) in [...validationErrors, ...validationWarnings]" :key="index"
                               :class="['font-quicksand text-xs', hasErrors && result.type === 'error' ? (isDarkMode ? 'text-red-200' : 'text-red-800') : (isDarkMode ? 'text-yellow-200' : 'text-yellow-800')]">
                            <div class="font-semibold mb-0.5">
                              {{ result.field === 'date' ? 'Date' : 
                                 result.field === 'total' ? 'Total Time' : 
                                 result.field === 'pic' ? 'PIC' : 
                                 result.field === 'sic' ? 'SIC' : 
                                 result.field === 'dual' ? 'Dual Received' : 
                                 result.field === 'solo' ? 'Solo' : 
                                 result.field === 'night' ? 'Night' : 
                                 result.field === 'nvg' ? 'NVG' : 
                                 result.field === 'actualInstrument' ? 'Actual Instrument' : 
                                 result.field === 'simulatedInstrument' ? 'Simulated Instrument' : 
                                 result.field === 'crossCountry' ? 'Cross-Country' : 
                                 result.field === 'dualGiven' ? 'Dual Given' : 
                                 result.field === 'departure' ? 'Departure Airport' :
                                 result.field === 'destination' ? 'Destination Airport' :
                                 result.field === 'registration' ? 'Aircraft Registration' :
                                 result.field === 'aircraftCategoryClass' ? 'Aircraft Category/Class' :
                                 result.field === 'aircraftMakeModel' ? 'Aircraft Make/Model' :
                                 result.field === 'role' ? 'Pilot Role' :
                                 result.field === 'flightConditions' ? 'Flight Conditions' :
                                 result.field }}:
                            </div>
                            <div class="mb-1">{{ result.message }}</div>
                            <div v-if="result.suggestion" :class="['text-xs italic', hasErrors && result.type === 'error' ? (isDarkMode ? 'text-red-300/80' : 'text-red-700') : (isDarkMode ? 'text-yellow-300/80' : 'text-yellow-700')]">
                              💡 {{ result.suggestion }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-if="successMessage" :class="['font-quicksand text-sm', isDarkMode ? 'text-emerald-400' : 'text-emerald-600']">
                    {{ successMessage }}
                  </div>
                </div>
                <div
                  :class="[
                    'flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end',
                    isIos ? 'entry-panel-actions-ios w-full' : ''
                  ]"
                >
                  <button
                    v-if="editingEntryId"
                    type="button"
                    :class="[
                      'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold font-quicksand transition-all',
                      showAuditTrailSidebar
                        ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                        : (isDarkMode 
                          ? 'border border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' 
                          : 'border border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200')
                    ]"
                    @click="toggleAuditTrailSidebar"
                  >
                    <Icon name="ri:history-line" size="16" />
                    {{ showAuditTrailSidebar ? 'Hide History' : 'View History' }}
                  </button>
                  <button
                    v-if="editingEntryId"
                    type="button"
                    :class="[
                      'inline-flex items-center justify-center rounded-lg px-6 py-2 font-semibold font-quicksand transition-all',
                      isDarkMode 
                        ? 'bg-red-600/80 text-white hover:bg-red-600' 
                        : 'bg-red-600 text-white hover:bg-red-700'
                    ]"
                    @click="confirmAndDeleteEditing"
                  >
                    Delete Entry
                  </button>
                  <button
                    v-if="editingEntryId"
                    type="button"
                    :class="[
                      'inline-flex items-center justify-center rounded-lg px-6 py-2 border font-semibold font-quicksand transition-all',
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' 
                        : 'border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200'
                    ]"
                    @click="cancelEditing"
                  >
                    Cancel
                  </button>
                  <button
                    v-if="duplicateWarning"
                    type="button"
                    :class="[
                      'inline-flex items-center justify-center rounded-lg px-6 py-2 font-semibold font-quicksand transition-all',
                      isDarkMode 
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    ]"
                    @click="showDuplicateOverrideDialog = true"
                  >
                    Save Anyway
                  </button>
                  <button
                    v-if="validationWarning && !duplicateWarning && (hasWarnings || hasErrors)"
                    type="button"
                    :class="[
                      'inline-flex items-center justify-center rounded-lg px-6 py-2 font-semibold font-quicksand transition-all',
                      hasErrors
                        ? (isDarkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-600 text-white hover:bg-red-700')
                        : (isDarkMode ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-yellow-600 text-white hover:bg-yellow-700')
                    ]"
                    @click.prevent="() => { saveAnywayValidation = true; void (newEntryNeedsSignature ? submitEntryWithIntent('later') : submitEntryWithIntent('none')) }"
                  >
                    {{ hasErrors ? 'Save Despite Errors' : 'Save Anyway' }}
                  </button>
                  <template v-else-if="!duplicateWarning && !validationWarning && newEntryNeedsSignature">
                    <button
                      v-if="!isGuestSignerSelected"
                      type="button"
                      :disabled="isSavingEntry || isSubmittingSign || isMarkingSignaturePending"
                      :class="[
                        'inline-flex items-center justify-center rounded-lg px-6 py-2 font-semibold font-quicksand border transition-all',
                        isDarkMode
                          ? 'border-amber-700/60 bg-amber-900/30 text-amber-100 hover:bg-amber-900/50'
                          : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
                        (isSavingEntry || isSubmittingSign) ? 'opacity-60 cursor-not-allowed' : ''
                      ]"
                      @click.prevent="submitEntryWithIntent('later')"
                    >
                      Save without Signing
                    </button>
                    <button
                      type="button"
                      :disabled="isSavingEntry || isSubmittingSign || !canSaveAndSignNewEntry"
                      :class="[
                        'inline-flex items-center justify-center rounded-lg px-6 py-2 font-semibold font-quicksand transition-all',
                        isDarkMode
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700',
                        (isSavingEntry || isSubmittingSign || !canSaveAndSignNewEntry) ? 'opacity-60 cursor-not-allowed' : ''
                      ]"
                      @click.prevent="submitEntryWithIntent(isGuestSignerSelected ? 'guest' : 'sign')"
                    >
                      <Icon v-if="isSavingEntry || isSubmittingSign" name="ri:loader-4-line" class="animate-spin mr-2" size="18" />
                      {{
                        isSubmittingSign
                          ? 'Signing…'
                          : isSavingEntry
                            ? 'Saving…'
                            : isGuestSignerSelected
                              ? 'Sign with guest'
                              : 'Save & Sign'
                      }}
                    </button>
                  </template>
                  <button
                    v-else-if="!duplicateWarning && !validationWarning"
                    type="submit"
                    :disabled="isSavingEntry"
                    :class="[
                      'inline-flex items-center justify-center rounded-lg px-6 py-2 font-semibold font-quicksand transition-all',
                      isDarkMode 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700',
                      isSavingEntry ? 'opacity-60 cursor-not-allowed' : ''
                    ]"
                  >
                    <Icon v-if="isSavingEntry" name="ri:loader-4-line" class="animate-spin mr-2" size="18" />
                    {{ isSavingEntry ? 'Saving…' : (editingEntryId ? 'Update Entry' : 'Save Entry') }}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Profile & Settings Modal -->
    <DashboardSettingsModal
      v-if="showSettingsModal"
      :open="showSettingsModal"
      :stack="settingsStack"
      :is-dark-mode="isDarkMode"
      :profile="pilotProfile"
      :profile-preview="settingsProfilePreview"
      v-model:profile-sub-tab="pilotProfileSubTab"
      v-model:show8710="show8710Fields"
      :initials="pilotInitials"
      :updates-badge="settingsUpdatesBadge"
      :stat-cards="pilotStatCards"
      :profile-stats="settingsProfileStats"
      :currency-summary="settingsCurrencySummary"
      :recent-flights="settingsRecentFlights"
      :format-date="formatDisplayDate"
      v-model:account-email="accountEmail"
      v-model:current-password="currentPassword"
      v-model:new-password="newPassword"
      v-model:confirm-new-password="confirmNewPassword"
      :user-email="user?.email"
      :is-updating-email="isUpdatingEmail"
      :is-updating-password="isUpdatingPassword"
      :email-success="emailSuccessMessage"
      :email-error="emailErrorMessage"
      :password-success="passwordSuccessMessage"
      :password-error="passwordErrorMessage"
      :theme="theme"
      :clock-format="clockFormat"
      :clock-zone="clockZone"
      :available-metrics="availableTotalsMetrics"
      :selected-metrics="selectedTotalsMetrics"
      :show-currency-chips="showCurrencyChips === true"
      :is-online="isOnline"
      :is-syncing="isSyncing"
      :sync-error="syncError"
      :sync-status-icon="syncStatusIcon"
      :sync-status-text="syncStatusText"
      :queue-length="queueLength"
      :is-drag-over-import="isDragOverImport"
      :entry-count="logEntries.length"
      :fcv-connected="dashboardFcvConnected"
      @close="closeSettings"
      @logout="handleLogout"
      @account-deleted="handleAccountDeleted"
      @pop="popSettingsFrame"
      @push="pushSettingsFrame"
      @open-currency="showCurrencyDashboard = true"
      @update-email="handleUpdateEmail"
      @update-password="handleUpdatePassword"
      @set-theme="setTheme"
      @set-clock-format="setClockFormat"
      @set-clock-zone="setClockZone"
      @toggle-metric="toggleTotalsMetric"
      @toggle-currency-chips="toggleShowCurrencyChips"
      :logbook-layout-presets="logbookLayoutPresets"
      :active-logbook-layout-preset-id="activePresetId"
      :logbook-layout-picker-fields="pickerFields"
      :logbook-layout-detail-crowded="detailFieldCrowded"
      :is-ios="isIos"
      @apply-logbook-layout-preset="applyLogbookLayoutPreset"
      @toggle-logbook-layout-field="toggleColumnVisibility"
      @logbook-layout-drag-start="onLogbookLayoutDragStart"
      @logbook-layout-drop="handleColumnDrop"
      @logbook-layout-move-up="(key) => moveColumn(key, 'up')"
      @logbook-layout-move-down="(key) => moveColumn(key, 'down')"
      @reset-logbook-layout="resetColumnConfig"
      @retry-sync="retryFailed()"
      @sync-now="refreshDashboardData()"
      @force-full-sync="forceFullDashboardSync()"
      @import-dragover="handleImportDragOver"
      @import-dragenter="handleImportDragEnter"
      @import-dragleave="handleImportDragLeave"
      @import-drop="handleImportDrop"
      @import-file="handleSettingsImportFile"
      @import-provider-file="handleSettingsProviderImportFile"
      @export-logbook="openExportDialog"
      @generate-8710="showForm8710Modal = true"
      @import-fcv="handleOpenFcvImportFromSettings"
      @flica-connection-changed="handleFlicaConnectionChanged"
    />

    <LogbookImportModal
      :is-open="showDashboardImportModal"
      :is-dark-mode="isDarkMode"
      @close="showDashboardImportModal = false"
      @import-provider-file="onDashboardImportProviderFile"
      @request-transfer="onDashboardImportRequestTransfer"
    />

    <input
      ref="csvFileInput"
      type="file"
      accept=".csv,.txt,.tsv,text/csv,text/plain"
      class="hidden"
      @change="handleCSVImport"
    />
    <input
      ref="jsonFileInput"
      type="file"
      accept=".json,application/json"
      class="hidden"
      @change="handleJSONImport"
    />


    <!-- Form 8710 Generator Modal -->
    <Teleport to="body">
    <div
      v-if="showForm8710Modal"
      :class="[
        'app-modal-overlay flex justify-center',
        isIos ? 'items-stretch p-0' : 'items-start px-4 py-8',
      ]"
    >
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showForm8710Modal = false"></div>
      <div
        :class="[
          'relative w-full overflow-y-auto border shadow-2xl transition-colors duration-300 space-y-6',
          isIos
            ? 'max-w-none max-h-[100dvh] h-[100dvh] rounded-none p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]'
            : 'max-w-4xl max-h-[90vh] rounded-3xl p-6 sm:p-8',
          isDarkMode 
            ? 'bg-gray-900 border-gray-700 text-gray-100' 
            : 'bg-gray-100 border-gray-200 text-gray-900'
        ]"
      >
        <div :class="['flex gap-3', isIos ? 'flex-col' : 'items-center justify-between']">
          <div class="flex items-start justify-between gap-3 min-w-0">
            <div class="min-w-0 flex-1">
              <h2 :class="[isIos ? 'text-lg' : 'text-2xl', 'font-semibold font-quicksand']">
                Generate FAA Form 8710-1
              </h2>
              <p :class="['text-sm mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Pre-fill form with your logbook data
              </p>
            </div>
            <button
              @click="showForm8710Modal = false"
              :class="[
                'rounded-full p-2 transition-colors shrink-0',
                isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              ]"
              aria-label="Close"
            >
              <Icon name="ri:close-line" size="22" />
            </button>
          </div>
        </div>

        <!-- Warnings -->
        <div
          v-if="form8710Warnings.length > 0"
          :class="[
            'rounded-xl border p-4 space-y-2',
            isDarkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'
          ]"
        >
          <div class="flex items-start gap-2">
            <Icon name="ri:alert-line" size="20" :class="isDarkMode ? 'text-yellow-400' : 'text-yellow-600'" />
            <div class="flex-1">
              <p :class="['text-sm font-semibold mb-1', isDarkMode ? 'text-yellow-300' : 'text-yellow-800']">
                Please review before generating:
              </p>
              <ul class="list-disc list-inside space-y-1">
                <li
                  v-for="(warning, idx) in form8710Warnings"
                  :key="idx"
                  :class="['text-sm', isDarkMode ? 'text-yellow-200' : 'text-yellow-700']"
                >
                  {{ warning }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Preview Section -->
        <div
          :class="[
            'rounded-2xl border space-y-4',
            isIos ? 'p-4' : 'p-6',
            isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
          ]"
        >
          <h3 :class="['text-lg font-semibold', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
            Preview Totals
          </h3>
          
          <!-- All-Time Totals -->
          <div>
            <h4 :class="['text-sm font-semibold mb-2', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              All-Time Totals
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Total Time</p>
                <p class="text-lg font-semibold">{{ formatNumber(form8710PreviewData?.sectionII?.allTime?.totalTime || 0) }}</p>
              </div>
              <div>
                <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">PIC Time</p>
                <p class="text-lg font-semibold">{{ formatNumber(form8710PreviewData?.sectionII?.allTime?.picTime || 0) }}</p>
              </div>
              <div>
                <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">SIC Time</p>
                <p class="text-lg font-semibold">{{ formatNumber(form8710PreviewData?.sectionII?.allTime?.sicTime || 0) }}</p>
              </div>
              <div>
                <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Cross Country</p>
                <p class="text-lg font-semibold">{{ formatNumber(form8710PreviewData?.sectionII?.allTime?.crossCountryTime || 0) }}</p>
              </div>
              <div>
                <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Instrument</p>
                <p class="text-lg font-semibold">{{ formatNumber(form8710PreviewData?.sectionII?.allTime?.instrumentTime || 0) }}</p>
              </div>
              <div>
                <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Night</p>
                <p class="text-lg font-semibold">{{ formatNumber(form8710PreviewData?.sectionII?.allTime?.nightTime || 0) }}</p>
              </div>
            </div>
          </div>

          <!-- Categories Summary -->
          <div v-if="form8710PreviewData?.sectionIII?.categories && form8710PreviewData.sectionIII.categories.length > 0">
            <h4 :class="['text-sm font-semibold mb-2', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              Categories ({{ form8710PreviewData?.sectionIII?.categories?.length || 0 }})
            </h4>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              <div
                v-for="category in (form8710PreviewData?.sectionIII?.categories || [])"
                :key="category.category"
                :class="[
                  'rounded-lg border p-3',
                  isDarkMode ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40' : 'bg-white border-gray-200'
                ]"
              >
                <div class="flex items-center justify-between">
                  <span :class="['text-sm font-medium', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                    {{ getCategoryDisplayName(category.category) }}
                  </span>
                  <span :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    {{ category.totalFlights }} flight{{ category.totalFlights !== 1 ? 's' : '' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Entry Statistics -->
          <div v-if="form8710PreviewData?.complianceMetadata">
            <h4 :class="['text-sm font-semibold mb-2', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              Entry Statistics
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div :class="['rounded-lg border p-3', isDarkMode ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40' : 'bg-white border-gray-200']">
                <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Total Entries</p>
                <p :class="['text-lg font-semibold', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ form8710PreviewData.complianceMetadata.totalEntries }}
                </p>
              </div>
              <div :class="['rounded-lg border p-3', isDarkMode ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40' : 'bg-white border-gray-200']">
                <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Imported</p>
                <p :class="['text-lg font-semibold', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ form8710PreviewData.complianceMetadata.importedEntries }}
                </p>
              </div>
              <div :class="['rounded-lg border p-3', isDarkMode ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40' : 'bg-white border-gray-200']">
                <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Manual</p>
                <p :class="['text-lg font-semibold', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ form8710PreviewData.complianceMetadata.manualEntries }}
                </p>
              </div>
            </div>
            <!-- Import Sources Breakdown -->
            <div v-if="form8710PreviewData.complianceMetadata.importBatches.length > 0" class="mt-3">
              <p :class="['text-xs font-semibold mb-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Import Sources:
              </p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="batch in form8710PreviewData.complianceMetadata.importBatches"
                  :key="batch.batchId || batch.sourceType"
                  :class="[
                    'px-2 py-1 rounded text-xs font-medium',
                    isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'
                  ]"
                >
                  {{ batch.sourceType.toUpperCase() }} ({{ batch.entryCount }})
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div :class="['flex gap-3', isIos ? 'flex-col-reverse' : 'justify-end']">
          <button
            @click="showForm8710Modal = false"
            :class="[
              'px-4 py-2 rounded-lg font-quicksand transition-colors',
              isIos ? 'w-full text-center' : '',
              isDarkMode ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white shadow-sm shadow-black/20' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            ]"
          >
            Cancel
          </button>
          <button
            @click="showForm8710View = true; showForm8710Modal = false"
            :class="[
              'px-4 py-2 rounded-lg font-quicksand transition-colors flex items-center gap-2',
              isIos ? 'w-full justify-center' : '',
              isDarkMode ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
            ]"
          >
            <Icon name="ri:file-list-3-line" size="18" />
            View Form
          </button>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Form 8710 Full View -->
    <Teleport to="body">
    <div
      v-if="showForm8710View"
      class="app-modal-overlay overflow-y-auto"
      :class="isDarkMode ? 'bg-gray-900' : 'bg-gray-100'"
    >
      <div :class="['min-h-screen min-w-0', isIos ? 'p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]' : 'p-4 sm:p-6 lg:p-8']">
        <div class="max-w-6xl mx-auto min-w-0">
          <!-- Header -->
          <div
            :class="[
              'mb-6 print:hidden',
              isIos
                ? 'sticky top-0 z-20 -mx-3 px-3 py-3 flex flex-col gap-3 border-b backdrop-blur-md'
                : 'flex items-center justify-between',
              isIos
                ? (isDarkMode ? 'bg-gray-900/95 border-gray-700' : 'bg-gray-100/95 border-gray-200')
                : '',
            ]"
          >
            <div class="min-w-0">
              <h1 :class="[isIos ? 'text-xl' : 'text-3xl', 'font-bold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                FAA Form 8710-1
              </h1>
              <p :class="['text-sm mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
                Airman Certificate and/or Rating Application
              </p>
            </div>
            <div :class="['flex gap-3', isIos ? 'flex-col w-full' : '']">
              <button
                @click="printForm8710"
                :class="[
                  'px-4 py-2 rounded-lg font-quicksand transition-colors flex items-center gap-2',
                  isIos ? 'w-full justify-center' : '',
                  isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                ]"
              >
                <Icon name="ri:printer-line" size="18" />
                Print
              </button>
              <button
                @click="showForm8710View = false"
                :class="[
                  'px-4 py-2 rounded-lg font-quicksand transition-colors',
                  isIos ? 'w-full text-center' : '',
                  isDarkMode ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white shadow-sm shadow-black/20' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                ]"
              >
                Close
              </button>
            </div>
          </div>

          <!-- Form Content -->
          <div
            :class="[
              'rounded-2xl border space-y-8 print:p-0 print:border-0 print:rounded-none print:shadow-none min-w-0',
              isIos ? 'p-3' : 'p-6 sm:p-8',
              isDarkMode ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40 print:bg-white print:text-black print:shadow-none' : 'bg-white border-gray-300'
            ]"
            id="form8710-content"
          >
            <!-- Section I: Application Information -->
            <div class="space-y-4">
              <h2 :class="[isIos ? 'text-lg' : 'text-xl', 'font-bold border-b pb-2', isDarkMode ? 'text-white border-gray-600 print:text-black print:border-gray-400' : 'text-gray-900 border-gray-300']">
                I. APPLICATION INFORMATION
              </h2>
              
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label :class="['block text-xs font-semibold uppercase mb-1', isDarkMode ? 'text-gray-400 print:text-gray-700' : 'text-gray-600']">
                    Name
                  </label>
                  <div :class="['px-3 py-2 rounded border', isDarkMode ? 'bg-gray-900 border-gray-600 text-white print:bg-white print:text-black print:border-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900']">
                    {{ form8710PreviewData?.sectionI?.name || '_________________' }}
                  </div>
                </div>
                
                <div>
                  <label :class="['block text-xs font-semibold uppercase mb-1', isDarkMode ? 'text-gray-400 print:text-gray-700' : 'text-gray-600']">
                    Date of Birth (MM/DD/YYYY)
                  </label>
                  <div :class="['px-3 py-2 rounded border', isDarkMode ? 'bg-gray-900 border-gray-600 text-white print:bg-white print:text-black print:border-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900']">
                    {{ form8710PreviewData?.sectionI?.dateOfBirth || '_________________' }}
                  </div>
                </div>
                
                <div>
                  <label :class="['block text-xs font-semibold uppercase mb-1', isDarkMode ? 'text-gray-400 print:text-gray-700' : 'text-gray-600']">
                    Place of Birth
                  </label>
                  <div :class="['px-3 py-2 rounded border', isDarkMode ? 'bg-gray-900 border-gray-600 text-white print:bg-white print:text-black print:border-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900']">
                    {{ form8710PreviewData?.sectionI?.placeOfBirth || '_________________' }}
                  </div>
                </div>
                
              </div>
              
              <div>
                <label :class="['block text-xs font-semibold uppercase mb-1', isDarkMode ? 'text-gray-400 print:text-gray-700' : 'text-gray-600']">
                  Residential Address
                </label>
                <div :class="['px-3 py-2 rounded border', isDarkMode ? 'bg-gray-900 border-gray-600 text-white print:bg-white print:text-black print:border-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900']">
                  {{ buildAddress(form8710PreviewData?.sectionI, 'residential') || '_________________' }}
                </div>
              </div>
              
              <div v-if="hasMailingAddress(form8710PreviewData?.sectionI)">
                <label :class="['block text-xs font-semibold uppercase mb-1', isDarkMode ? 'text-gray-400 print:text-gray-700' : 'text-gray-600']">
                  Mailing Address (if different)
                </label>
                <div :class="['px-3 py-2 rounded border', isDarkMode ? 'bg-gray-900 border-gray-600 text-white print:bg-white print:text-black print:border-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900']">
                  {{ buildAddress(form8710PreviewData?.sectionI, 'mailing') }}
                </div>
              </div>
            </div>

            <!-- Section II: Recent Experience -->
            <div class="space-y-4">
              <h2 :class="[isIos ? 'text-lg' : 'text-xl', 'font-bold border-b pb-2', isDarkMode ? 'text-white border-gray-600 print:text-black print:border-gray-400' : 'text-gray-900 border-gray-300']">
                II. RECENT EXPERIENCE
              </h2>
              
              <p v-if="isIos" :class="['text-xs print:hidden', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Swipe to see all columns
              </p>
              <div :class="['overflow-x-auto min-w-0', isIos ? '-mx-3 px-3' : '']">
                <table class="w-full border-collapse">
                  <thead>
                    <tr :class="isDarkMode ? 'bg-gray-700 print:bg-gray-200' : 'bg-gray-100'">
                      <th :class="['px-3 py-2 text-left text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">Period</th>
                      <th :class="['px-3 py-2 text-right text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">Total Time</th>
                      <th :class="['px-3 py-2 text-right text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">PIC</th>
                      <th :class="['px-3 py-2 text-right text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">SIC</th>
                      <th :class="['px-3 py-2 text-right text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">Cross Country</th>
                      <th :class="['px-3 py-2 text-right text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">Instrument</th>
                      <th :class="['px-3 py-2 text-right text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">Night</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="period in recentExperiencePeriods" :key="period.key">
                      <td :class="['px-3 py-2 border font-medium', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ period.label }}
                      </td>
                      <td :class="['px-3 py-2 border text-right font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(form8710PreviewData?.sectionII?.[period.key]?.totalTime || 0) }}
                      </td>
                      <td :class="['px-3 py-2 border text-right font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(form8710PreviewData?.sectionII?.[period.key]?.picTime || 0) }}
                      </td>
                      <td :class="['px-3 py-2 border text-right font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(form8710PreviewData?.sectionII?.[period.key]?.sicTime || 0) }}
                      </td>
                      <td :class="['px-3 py-2 border text-right font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(form8710PreviewData?.sectionII?.[period.key]?.crossCountryTime || 0) }}
                      </td>
                      <td :class="['px-3 py-2 border text-right font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(form8710PreviewData?.sectionII?.[period.key]?.instrumentTime || 0) }}
                      </td>
                      <td :class="['px-3 py-2 border text-right font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(form8710PreviewData?.sectionII?.[period.key]?.nightTime || 0) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Section III: Record of Pilot Time -->
            <div class="space-y-4">
              <h2 :class="[isIos ? 'text-lg' : 'text-xl', 'font-bold border-b pb-2', isDarkMode ? 'text-white border-gray-600 print:text-black print:border-gray-400' : 'text-gray-900 border-gray-300']">
                III. RECORD OF PILOT TIME
              </h2>
              
              <p v-if="isIos" :class="['text-xs print:hidden', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Swipe to see all columns
              </p>
              <div :class="['overflow-x-auto min-w-0', isIos ? '-mx-3 px-3' : '']">
                <table class="w-full border-collapse text-xs">
                  <thead>
                    <tr :class="isDarkMode ? 'bg-gray-700 print:bg-gray-200' : 'bg-gray-100'">
                      <th :class="['px-2 py-2 text-left text-xs font-semibold uppercase border sticky left-0 z-10', isDarkMode ? 'border-gray-600 text-gray-300 bg-gray-700 print:text-black print:bg-gray-200 print:border-gray-400' : 'border-gray-300 text-gray-700 bg-gray-100']">Category</th>
                      <th :class="['px-2 py-2 text-center text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">Flights</th>
                      <th :class="['px-2 py-2 text-center text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">Instr Rcv</th>
                      <th :class="['px-2 py-2 text-center text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">Solo</th>
                      <th :class="['px-2 py-2 text-center text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">PIC</th>
                      <th :class="['px-2 py-2 text-center text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">SIC</th>
                      <th :class="['px-2 py-2 text-center text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">XC Instr</th>
                      <th :class="['px-2 py-2 text-center text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">XC Solo</th>
                      <th :class="['px-2 py-2 text-center text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">XC PIC</th>
                      <th :class="['px-2 py-2 text-center text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">XC SIC</th>
                      <th :class="['px-2 py-2 text-center text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">Inst</th>
                      <th :class="['px-2 py-2 text-center text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">Night</th>
                      <th :class="['px-2 py-2 text-center text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">Night PIC</th>
                      <th :class="['px-2 py-2 text-center text-xs font-semibold uppercase border', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">Night SIC</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="category in (form8710PreviewData?.sectionIII?.categories || [])"
                      :key="category.category"
                      :class="isDarkMode ? 'hover:bg-gray-700/50 print:hover:bg-transparent' : 'hover:bg-gray-50'"
                    >
                      <td :class="['px-2 py-2 border font-medium sticky left-0 z-10', isDarkMode ? 'border-white/10 text-gray-300 bg-gray-900 shadow-md shadow-black/40 print:text-black print:bg-white print:border-gray-400' : 'border-gray-300 text-gray-700 bg-white']">
                        {{ getCategoryDisplayName(category.category) }}
                      </td>
                      <td :class="['px-2 py-2 border text-center font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ category.totalFlights }}
                      </td>
                      <td :class="['px-2 py-2 border text-center font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(category.instructionReceived) }}
                      </td>
                      <td :class="['px-2 py-2 border text-center font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(category.solo) }}
                      </td>
                      <td :class="['px-2 py-2 border text-center font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(category.pic) }}
                      </td>
                      <td :class="['px-2 py-2 border text-center font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(category.sic) }}
                      </td>
                      <td :class="['px-2 py-2 border text-center font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(category.crossCountryInstructionReceived) }}
                      </td>
                      <td :class="['px-2 py-2 border text-center font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(category.crossCountrySolo) }}
                      </td>
                      <td :class="['px-2 py-2 border text-center font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(category.crossCountryPic) }}
                      </td>
                      <td :class="['px-2 py-2 border text-center font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(category.crossCountrySic) }}
                      </td>
                      <td :class="['px-2 py-2 border text-center font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(category.instrument) }}
                      </td>
                      <td :class="['px-2 py-2 border text-center font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(category.nightPic + category.nightSic + category.nightInstructionReceived) }}
                      </td>
                      <td :class="['px-2 py-2 border text-center font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(category.nightPic) }}
                      </td>
                      <td :class="['px-2 py-2 border text-center font-mono', isDarkMode ? 'border-gray-600 text-gray-300 print:text-black print:border-gray-400' : 'border-gray-300 text-gray-700']">
                        {{ formatTime(category.nightSic) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Compliance Metadata Section -->
            <div v-if="form8710PreviewData?.complianceMetadata" class="mt-8 pt-6 border-t print:border-gray-400" :class="isDarkMode ? 'border-gray-600 print:border-gray-400' : 'border-gray-300'">
              <h2 :class="['text-lg font-bold border-b pb-2 mb-4', isDarkMode ? 'text-white border-gray-600 print:text-black print:border-gray-400' : 'text-gray-900 border-gray-300']">
                COMPLIANCE METADATA
              </h2>
              
              <div class="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
                <div>
                  <label :class="['block text-xs font-semibold uppercase mb-1', isDarkMode ? 'text-gray-400 print:text-gray-700' : 'text-gray-600']">
                    Total Entries
                  </label>
                  <div :class="['px-3 py-2 rounded border', isDarkMode ? 'bg-gray-900 border-gray-600 text-white print:bg-white print:text-black print:border-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900']">
                    {{ form8710PreviewData.complianceMetadata.totalEntries }}
                  </div>
                </div>
                
                <div>
                  <label :class="['block text-xs font-semibold uppercase mb-1', isDarkMode ? 'text-gray-400 print:text-gray-700' : 'text-gray-600']">
                    Imported Entries
                  </label>
                  <div :class="['px-3 py-2 rounded border', isDarkMode ? 'bg-gray-900 border-gray-600 text-white print:bg-white print:text-black print:border-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900']">
                    {{ form8710PreviewData.complianceMetadata.importedEntries }}
                  </div>
                </div>
                
                <div>
                  <label :class="['block text-xs font-semibold uppercase mb-1', isDarkMode ? 'text-gray-400 print:text-gray-700' : 'text-gray-600']">
                    Manual Entries
                  </label>
                  <div :class="['px-3 py-2 rounded border', isDarkMode ? 'bg-gray-900 border-gray-600 text-white print:bg-white print:text-black print:border-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900']">
                    {{ form8710PreviewData.complianceMetadata.manualEntries }}
                  </div>
                </div>
                
                <div>
                  <label :class="['block text-xs font-semibold uppercase mb-1', isDarkMode ? 'text-gray-400 print:text-gray-700' : 'text-gray-600']">
                    Import Batches
                  </label>
                  <div :class="['px-3 py-2 rounded border', isDarkMode ? 'bg-gray-900 border-gray-600 text-white print:bg-white print:text-black print:border-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900']">
                    {{ form8710PreviewData.complianceMetadata.importBatches.length }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Import Metadata Section -->
            <div v-if="form8710PreviewData?.complianceMetadata?.importBatches && form8710PreviewData.complianceMetadata.importBatches.length > 0" class="mt-8 pt-6 border-t print:border-gray-400" :class="isDarkMode ? 'border-gray-600 print:border-gray-400' : 'border-gray-300'">
              <h2 :class="['text-lg font-bold border-b pb-2 mb-4', isDarkMode ? 'text-white border-gray-600 print:text-black print:border-gray-400' : 'text-gray-900 border-gray-300']">
                IMPORT METADATA
              </h2>
              
              <div class="space-y-4">
                <div
                  v-for="batch in form8710PreviewData.complianceMetadata.importBatches"
                  :key="batch.batchId || batch.sourceType"
                  :class="['rounded-lg border p-4', isDarkMode ? 'bg-gray-900 border-gray-600 print:bg-white print:border-gray-400' : 'bg-gray-50 border-gray-300']"
                >
                  <div class="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
                    <div>
                      <label :class="['block text-xs font-semibold uppercase mb-1', isDarkMode ? 'text-gray-400 print:text-gray-700' : 'text-gray-600']">
                        Source Type
                      </label>
                      <div :class="['px-3 py-2 rounded border', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner print:bg-white print:text-black print:border-gray-400' : 'bg-white border-gray-300 text-gray-900']">
                        {{ batch.sourceType.toUpperCase() }}
                      </div>
                    </div>
                    
                    <div>
                      <label :class="['block text-xs font-semibold uppercase mb-1', isDarkMode ? 'text-gray-400 print:text-gray-700' : 'text-gray-600']">
                        Entry Count
                      </label>
                      <div :class="['px-3 py-2 rounded border', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner print:bg-white print:text-black print:border-gray-400' : 'bg-white border-gray-300 text-gray-900']">
                        {{ batch.entryCount }}
                      </div>
                    </div>
                    
                    <div v-if="batch.batchId">
                      <label :class="['block text-xs font-semibold uppercase mb-1', isDarkMode ? 'text-gray-400 print:text-gray-700' : 'text-gray-600']">
                        Batch ID
                      </label>
                      <div :class="['px-3 py-2 rounded border font-mono text-xs', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner print:bg-white print:text-black print:border-gray-400' : 'bg-white border-gray-300 text-gray-900']">
                        {{ batch.batchId }}
                      </div>
                    </div>
                    
                    <div v-if="batch.importedAt">
                      <label :class="['block text-xs font-semibold uppercase mb-1', isDarkMode ? 'text-gray-400 print:text-gray-700' : 'text-gray-600']">
                        Import Date
                      </label>
                      <div :class="['px-3 py-2 rounded border', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner print:bg-white print:text-black print:border-gray-400' : 'bg-white border-gray-300 text-gray-900']">
                        {{ formatDisplayDate(batch.importedAt) }}
                      </div>
                    </div>
                    
                    <div v-if="batch.dateRange" class="sm:col-span-2">
                      <label :class="['block text-xs font-semibold uppercase mb-1', isDarkMode ? 'text-gray-400 print:text-gray-700' : 'text-gray-600']">
                        Entry Date Range
                      </label>
                      <div :class="['px-3 py-2 rounded border', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner print:bg-white print:text-black print:border-gray-400' : 'bg-white border-gray-300 text-gray-900']">
                        {{ formatDisplayDate(batch.dateRange.start) }} - {{ formatDisplayDate(batch.dateRange.end) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer Note -->
            <div :class="['text-xs mt-8 pt-4 border-t print:hidden', isDarkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-300']">
              <p>This form is generated by Logifi. Review all fields before submitting to FAA.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Aircraft Information Modal -->
    <Teleport to="body">
    <div
      v-if="showAircraftModal"
      class="app-modal-overlay flex items-center justify-center p-4"
      @click.self="closeAircraftModal"
    >
      <div
        :class="[
          'relative w-full max-w-lg rounded-2xl border shadow-2xl transition-colors duration-300',
          isDarkMode 
            ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40' 
            : 'bg-white border-gray-200 shadow-sm'
        ]"
        @click.stop
      >
        <div class="flex items-center justify-between p-6 border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
          <h3 :class="['text-xl font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
            Aircraft Information
          </h3>
          <button
            @click="closeAircraftModal"
            :class="[
              'p-1 rounded-lg transition-colors',
              isDarkMode 
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-300'
            ]"
            aria-label="Close"
          >
            <Icon name="ri:close-line" size="24" />
          </button>
          </div>
        
        <div class="p-6">
          <div v-if="loadingAircraftInfo" class="text-center py-8">
            <div :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Loading aircraft information...
        </div>
      </div>

          <div v-else-if="aircraftInfoError" class="text-center py-8">
            <Icon name="ri:error-warning-line" size="48" :class="[isDarkMode ? 'text-red-400' : 'text-red-600', 'mx-auto mb-4']" />
            <div :class="['text-sm font-quicksand', isDarkMode ? 'text-red-400' : 'text-red-600']">
              {{ aircraftInfoError }}
            </div>
    </div>

          <div v-else-if="currentAircraftInfo" class="space-y-4">
            <div>
              <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Registration
              </div>
              <div :class="['text-lg font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ currentAircraftInfo.registration }}
        </div>
      </div>

            <div v-if="currentAircraftInfo.make || currentAircraftInfo.model" class="grid grid-cols-2 gap-4">
              <div v-if="currentAircraftInfo.make">
                <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Manufacturer
                </div>
                <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                  {{ currentAircraftInfo.make }}
                </div>
              </div>
              <div v-if="currentAircraftInfo.model">
                <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Model
                </div>
                <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                  {{ currentAircraftInfo.model }}
                </div>
        </div>
      </div>

            <div v-if="currentAircraftInfo.year || aircraftEngineTypeLabel(currentAircraftInfo) || currentAircraftInfo.category" class="grid grid-cols-2 gap-4">
              <div v-if="currentAircraftInfo.year">
                <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Year
                </div>
                <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                  {{ currentAircraftInfo.year }}
                </div>
              </div>
              <div v-if="aircraftEngineTypeLabel(currentAircraftInfo)">
                <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Engine Type
                </div>
                <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                  {{ aircraftEngineTypeLabel(currentAircraftInfo) }}
                </div>
                <div
                  v-if="aircraftEngineClassLabel(currentAircraftInfo)"
                  :class="['text-sm font-quicksand mt-0.5', isDarkMode ? 'text-gray-400' : 'text-gray-500']"
                >
                  {{ aircraftEngineClassLabel(currentAircraftInfo) }}
                </div>
              </div>
              <div v-if="currentAircraftInfo.category || derivedAircraftCategoryDisplay(currentAircraftInfo)">
                <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Category / class
                </div>
                <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                  {{ derivedAircraftCategoryDisplay(currentAircraftInfo) || currentAircraftInfo.category }}
                </div>
              </div>
            </div>
            
            <div v-if="currentAircraftInfo.owner">
              <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Registered Owner
              </div>
              <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                {{ currentAircraftInfo.owner }}
              </div>
              <div
                v-if="currentAircraftInfo.city || currentAircraftInfo.state"
                :class="['text-sm font-quicksand mt-0.5', isDarkMode ? 'text-gray-400' : 'text-gray-500']"
              >
                {{ [currentAircraftInfo.city, currentAircraftInfo.state].filter(Boolean).join(', ') }}
              </div>
            </div>

            <!-- Tags for this aircraft (applied to all entries with this registration, autofill on new entries) -->
            <div v-if="isAuthenticated && currentAircraftInfo?.registration" class="pt-4 border-t" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
              <div :class="['text-sm font-semibold font-quicksand mb-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Tags</div>
              <!-- Family tags (from aircraft family; also applied to log entries) -->
              <div v-if="currentAircraftFamilyName && getEntityTags('family', currentAircraftFamilyName).length" class="mb-2">
                <span :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500']">From family: </span>
                <span v-for="tag in getEntityTags('family', currentAircraftFamilyName)" :key="'fam-' + tag" class="inline-flex items-center rounded-full px-2.5 py-1 text-sm mr-1" :class="[isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700']">{{ tag }}</span>
              </div>
              <div class="flex flex-wrap gap-2 items-center">
                <span v-for="tag in getEntityTags('aircraft', currentAircraftInfo?.registration || '')" :key="tag" class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm" :class="[isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-300 text-gray-800']">
                  {{ tag }}
                  <button type="button" aria-label="Remove tag" @click="removeEntityTag('aircraft', currentAircraftInfo?.registration || '', tag); aircraftModalNewTagInput = ''" :class="['rounded p-0.5', isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-400']"><Icon name="ri:close-line" size="14" /></button>
                </span>
                <template v-if="!aircraftModalShowAddTag">
                  <button type="button" @click="aircraftModalShowAddTag = true" :class="['inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-sm font-quicksand', isDarkMode ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-400 text-gray-600 hover:bg-gray-200']">+ Add tag</button>
                </template>
                <template v-else>
                  <div class="flex flex-col gap-2">
                    <div v-if="[...fixedTagOptions, ...presetsInUse].filter(t => !getEntityTags('aircraft', currentAircraftInfo?.registration || '').includes(t)).length" class="flex flex-wrap gap-1">
                      <span :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500']">Presets: </span>
                      <button v-for="tag in [...fixedTagOptions, ...presetsInUse].filter(t => !getEntityTags('aircraft', currentAircraftInfo?.registration || '').includes(t))" :key="'preset-' + tag" type="button" @click="addEntityTag('aircraft', currentAircraftInfo?.registration || '', tag); aircraftModalShowAddTag = false" :class="['rounded-full px-2 py-0.5 text-xs font-quicksand', isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300']">{{ tag }}</button>
                    </div>
                    <div v-if="presetsUnused.length" class="flex flex-wrap gap-1 items-center">
                      <span :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500']">Unused (remove): </span>
                      <span v-for="tag in presetsUnused" :key="'unused-' + tag" class="inline-flex items-center gap-0.5 rounded-full pl-2 pr-0.5 py-0.5 text-xs" :class="[isDarkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-200 text-gray-600']">
                        {{ tag }}
                        <button type="button" aria-label="Remove from presets" @click="removeTagPreset(tag)" :class="['rounded p-0.5', isDarkMode ? 'hover:bg-gray-500' : 'hover:bg-gray-300']"><Icon name="ri:close-line" size="12" /></button>
                      </span>
                    </div>
                    <div class="inline-flex gap-1 items-center">
                      <input v-model="aircraftModalNewTagInput" type="text" placeholder="Or type new tag" :class="['w-32 rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" @keydown.enter.prevent="addEntityTag('aircraft', currentAircraftInfo?.registration || '', aircraftModalNewTagInput); aircraftModalNewTagInput = ''; aircraftModalShowAddTag = false" />
                      <button type="button" @click="addEntityTag('aircraft', currentAircraftInfo?.registration || '', aircraftModalNewTagInput); aircraftModalNewTagInput = ''; aircraftModalShowAddTag = false" :class="['rounded px-2 py-1 text-xs', isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300']">Add</button>
                      <button type="button" @click="aircraftModalShowAddTag = false; aircraftModalNewTagInput = ''" :class="['rounded p-1', isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-200']" aria-label="Cancel"><Icon name="ri:close-line" size="16" /></button>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <div
              v-if="currentAircraftInfo.source || currentAircraftInfo.asOf || currentAircraftInfo.ownerCheckedAt"
              class="pt-4 border-t space-y-0.5"
              :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']"
            >
              <div
                v-if="currentAircraftInfo.source"
                :class="['text-xs font-quicksand italic', isDarkMode ? 'text-gray-500' : 'text-gray-400']"
              >
                Source: {{ currentAircraftInfo.source }}
              </div>
              <div
                v-if="currentAircraftInfo.asOf"
                :class="['text-xs font-quicksand italic', isDarkMode ? 'text-gray-500' : 'text-gray-400']"
              >
                FAA registry as of {{ currentAircraftInfo.asOf }}
              </div>
              <div
                v-if="currentAircraftInfo.ownerCheckedAt"
                :class="['text-xs font-quicksand italic', isDarkMode ? 'text-gray-500' : 'text-gray-400']"
              >
                {{ aircraftOwnerCheckedLabel(currentAircraftInfo.ownerCheckedAt) }}
              </div>
            </div>
      </div>

          <div v-else class="text-center py-8">
            <div :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              No information available for this aircraft.
            </div>
          </div>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Airport Information Modal -->
    <Teleport to="body">
    <div
      v-if="showAirportModal"
      class="app-modal-overlay flex items-center justify-center p-4"
      @click.self="closeAirportModal"
    >
      <div
        :class="[
          'relative w-full max-w-lg rounded-2xl border shadow-2xl transition-colors duration-300',
          isDarkMode 
            ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40' 
            : 'bg-white border-gray-200 shadow-sm'
        ]"
        @click.stop
      >
        <div class="flex items-center justify-between p-6 border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
          <h3 :class="['text-xl font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
            Airport Information
          </h3>
          <button
            @click="closeAirportModal"
            :class="[
              'p-1 rounded-lg transition-colors',
              isDarkMode 
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-300'
            ]"
            aria-label="Close"
          >
            <Icon name="ri:close-line" size="24" />
          </button>
        </div>
        
        <div class="p-6">
          <div v-if="loadingAirportInfo" class="text-center py-8">
            <div :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Loading airport information...
        </div>
      </div>

          <div v-else-if="airportInfoError" class="text-center py-8">
            <Icon name="ri:error-warning-line" size="48" :class="[isDarkMode ? 'text-red-400' : 'text-red-600', 'mx-auto mb-4']" />
            <div :class="['text-sm font-quicksand', isDarkMode ? 'text-red-400' : 'text-red-600']">
              {{ airportInfoError }}
            </div>
          </div>
          
          <div v-else-if="currentAirportInfo" class="space-y-4">
            <div>
              <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Airport Code
              </div>
              <div :class="['text-lg font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ currentAirportInfo.code }}
                <span v-if="currentAirportInfo.iata && currentAirportInfo.iata !== currentAirportInfo.code" class="text-sm ml-2" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  (IATA: {{ currentAirportInfo.iata }})
                </span>
              </div>
            </div>
            
            <div v-if="currentAirportInfo.name">
              <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Airport Name
              </div>
              <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                {{ currentAirportInfo.name }}
              </div>
            </div>
            
            <div v-if="currentAirportInfo.city || currentAirportInfo.state" class="grid grid-cols-2 gap-4">
              <div v-if="currentAirportInfo.city">
                <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  City
                </div>
                <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                  {{ currentAirportInfo.city }}
                </div>
              </div>
              <div v-if="currentAirportInfo.state">
                <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  State
                </div>
                <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                  {{ currentAirportInfo.state }}
                </div>
              </div>
            </div>
            
            <div v-if="currentAirportInfo.country">
              <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Country
              </div>
              <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                {{ currentAirportInfo.country }}
              </div>
            </div>
            
            <div v-if="currentAirportInfo.elevation || currentAirportInfo.latitude || currentAirportInfo.longitude" class="grid grid-cols-2 gap-4">
              <div v-if="currentAirportInfo.elevation">
                <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Elevation
                </div>
                <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                  {{ currentAirportInfo.elevation }}
                </div>
              </div>
              <div v-if="currentAirportInfo.latitude && currentAirportInfo.longitude">
                <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Coordinates
                </div>
                <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                  {{ Number(currentAirportInfo.latitude).toFixed(4) }}, {{ Number(currentAirportInfo.longitude).toFixed(4) }}
                </div>
              </div>
            </div>
            
            <div v-if="currentAirportInfo.timezone">
              <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Timezone
              </div>
              <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                {{ currentAirportInfo.timezone }}
              </div>
            </div>
            
            <div v-if="currentAirportInfo.source" class="pt-4 border-t" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
              <div :class="['text-xs font-quicksand italic', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                Source: {{ currentAirportInfo.source }}
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-8">
            <div :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              No information available for this airport.
            </div>
          </div>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Crew/Instructor Profile Modal -->
    <Teleport to="body">
    <div
      v-if="showCrewProfileModal && currentCrewName"
      :class="[
        'app-modal-overlay flex items-center justify-center p-4 overflow-x-hidden',
        isIos ? 'catalog-modal-ios' : ''
      ]"
      @click.self="closeCrewProfileModal"
    >
      <div
        :class="[
          'relative w-full max-w-lg min-w-0 overflow-x-hidden rounded-2xl border shadow-2xl transition-colors duration-300',
          isDarkMode 
            ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40' 
            : 'bg-white border-gray-200 shadow-sm'
        ]"
        @click.stop
      >
        <div class="flex items-center justify-between p-6 border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
          <div class="flex items-center gap-3 flex-1">
            <div :class="['w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0', isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white']">
              {{ (isEditingCrewName ? editingCrewName : currentCrewName).charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <input
                v-if="isEditingCrewName"
                v-model="editingCrewName"
                type="text"
                :class="[
                  'text-xl font-semibold font-quicksand w-full bg-transparent border-b-2 pb-1 focus:outline-none',
                  isDarkMode 
                    ? 'text-white border-blue-500 focus:border-blue-400' 
                    : 'text-gray-900 border-blue-600 focus:border-blue-700'
                ]"
                @blur="saveCrewNameEdit"
                @keyup.enter="saveCrewNameEdit"
                @keyup.escape="cancelCrewNameEdit"
                @click.stop
                :autofocus="!isIos"
              />
              <h3 
                v-else
                :class="['text-xl font-semibold font-quicksand cursor-pointer hover:opacity-80 transition-opacity', isDarkMode ? 'text-white' : 'text-gray-900']"
                @click.stop="startEditingCrewName"
              >
                {{ currentCrewName }}
              </h3>
            </div>
          </div>
          <button
            @click="closeCrewProfileModal"
            :class="[
              'p-1 rounded-lg transition-colors',
              isDarkMode 
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-300'
            ]"
            aria-label="Close"
          >
            <Icon name="ri:close-line" size="24" />
          </button>
        </div>
        
        <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <!-- Notes Section -->
          <div>
            <div :class="['text-sm font-semibold font-quicksand mb-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Notes
            </div>
            <textarea
              :value="getCrewProfile(currentCrewName).notes"
              @input="(e) => updateCrewNotes(currentCrewName, (e.target as HTMLTextAreaElement).value)"
              :class="[
                'w-full rounded-lg border px-3 py-2 text-sm font-quicksand resize-none h-24',
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                  : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400'
              ]"
              placeholder="Add notes about this crew member..."
            />
          </div>

          <!-- Tags for this person (applied to all entries with this crew, autofill on new entries) -->
          <div v-if="isAuthenticated && currentCrewName" class="pt-4 border-t" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
            <div :class="['text-sm font-semibold font-quicksand mb-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Tags</div>
            <p :class="['text-xs mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-500']">Crew tags are also applied to all log entries that list this person.</p>
            <div v-if="crewModalLastTagEntryCount !== null" :class="['text-xs mb-2', isDarkMode ? 'text-green-400' : 'text-green-600']">
              {{ crewModalLastTagEntryCount === 0 ? 'Tag added to this crew member.' : `Tag added to this crew member and to ${crewModalLastTagEntryCount} log entry${crewModalLastTagEntryCount === 1 ? '' : 's'}.` }}
            </div>
            <div class="flex flex-wrap gap-2 items-center">
              <span v-for="tag in getEntityTags('person', currentCrewName)" :key="tag" class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm" :class="[isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-300 text-gray-800']">
                {{ tag }}
                <button type="button" aria-label="Remove tag" @click="removeEntityTag('person', currentCrewName, tag); crewModalNewTagInput = ''" :class="['rounded p-0.5', isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-400']"><Icon name="ri:close-line" size="14" /></button>
              </span>
              <template v-if="!crewModalShowAddTag">
                <button type="button" @click="crewModalShowAddTag = true" :class="['inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-sm font-quicksand', isDarkMode ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-400 text-gray-600 hover:bg-gray-200']">+ Add tag</button>
              </template>
              <template v-else>
                <div class="flex flex-col gap-2">
                  <div v-if="[...fixedTagOptions, ...presetsInUse].filter(t => !getEntityTags('person', currentCrewName).includes(t)).length" class="flex flex-wrap gap-1">
                    <span :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500']">Presets: </span>
                    <button v-for="tag in [...fixedTagOptions, ...presetsInUse].filter(t => !getEntityTags('person', currentCrewName).includes(t))" :key="'preset-' + tag" type="button" @click="addEntityTag('person', currentCrewName, tag); crewModalShowAddTag = false" :class="['rounded-full px-2 py-0.5 text-xs font-quicksand', isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300']">{{ tag }}</button>
                  </div>
                  <div v-if="presetsUnused.length" class="flex flex-wrap gap-1 items-center">
                    <span :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500']">Unused (remove): </span>
                    <span v-for="tag in presetsUnused" :key="'unused-' + tag" class="inline-flex items-center gap-0.5 rounded-full pl-2 pr-0.5 py-0.5 text-xs" :class="[isDarkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-200 text-gray-600']">
                      {{ tag }}
                      <button type="button" aria-label="Remove from presets" @click="removeTagPreset(tag)" :class="['rounded p-0.5', isDarkMode ? 'hover:bg-gray-500' : 'hover:bg-gray-300']"><Icon name="ri:close-line" size="12" /></button>
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-1 items-center max-w-full">
                    <input v-model="crewModalNewTagInput" type="text" placeholder="Or type new tag" :class="['min-w-0 flex-1 max-w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" @keydown.enter.prevent="addEntityTag('person', currentCrewName, crewModalNewTagInput); crewModalNewTagInput = ''; crewModalShowAddTag = false" />
                    <button type="button" @click="addEntityTag('person', currentCrewName, crewModalNewTagInput); crewModalNewTagInput = ''; crewModalShowAddTag = false" :class="['rounded px-2 py-1 text-xs', isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300']">Add</button>
                    <button type="button" @click="crewModalShowAddTag = false; crewModalNewTagInput = ''" :class="['rounded p-1', isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-200']" aria-label="Cancel"><Icon name="ri:close-line" size="16" /></button>
                  </div>
                </div>
              </template>
            </div>
          </div>
          
          <!-- Statistics Section -->
          <div v-if="crewStats">
            <div :class="['text-sm font-semibold font-quicksand mb-3', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Flight Statistics
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div :class="['rounded-lg p-3', isDarkMode ? 'bg-gray-700/50' : 'bg-gray-300']">
                <div :class="['text-2xl font-bold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ crewStats.totalFlights }}
                </div>
                <div :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Total Flights
                </div>
              </div>
              <div :class="['rounded-lg p-3', isDarkMode ? 'bg-gray-700/50' : 'bg-gray-300']">
                <div :class="['text-2xl font-bold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ crewStats.totalHours.toFixed(1) }}
                </div>
                <div :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Total Hours
                </div>
              </div>
            </div>
            <div v-if="crewStats.firstFlight || crewStats.lastFlight" class="mt-3 grid grid-cols-2 gap-4">
              <div v-if="crewStats.firstFlight">
                <div :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  First Flight
                </div>
                <div :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                  {{ formatDisplayDate(crewStats.firstFlight) }}
                </div>
              </div>
              <div v-if="crewStats.lastFlight">
                <div :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  Last Flight
                </div>
                <div :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                  {{ formatDisplayDate(crewStats.lastFlight) }}
                </div>
              </div>
            </div>
          </div>
          
          <!-- Recent Flights Section -->
          <div v-if="crewRecentFlights.length > 0">
            <div :class="['text-sm font-semibold font-quicksand mb-3', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Recent Flights ({{ crewRecentFlights.length }})
            </div>
            <div class="space-y-2">
              <div
                v-for="flight in crewRecentFlights.slice(0, 5)"
                :key="flight.id"
                :class="[
                  'rounded-lg p-3 flex items-center justify-between gap-2 min-w-0',
                  isDarkMode ? 'bg-gray-700/50' : 'bg-gray-300'
                ]"
              >
                <div class="min-w-0 flex-1">
                  <div :class="['text-sm font-quicksand font-medium truncate', isDarkMode ? 'text-white' : 'text-gray-900']">
                    {{ formatEntryAirportCode(flight, flight.departure) }} → {{ formatEntryAirportCode(flight, flight.destination) }}
                  </div>
                  <div :class="['text-xs font-quicksand truncate', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    {{ formatDisplayDate(flight.date) }} · {{ flight.aircraftMakeModel || flight.registration }}
                  </div>
                </div>
                <div :class="['text-sm font-mono font-bold', isDarkMode ? 'text-blue-400' : 'text-blue-600']">
                  {{ (flight.flightTime.total ?? 0).toFixed(1) }}h
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-4">
            <div :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              No flights recorded with this crew member yet.
            </div>
          </div>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Context Menu for Aircraft Family Rename -->
    <div
      v-if="contextMenuVisible"
      class="context-menu-container fixed z-50"
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
      @click.stop
    >
      <div
        :class="[
          'rounded-lg border shadow-lg py-1 min-w-[160px]',
          isDarkMode ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40' : 'bg-white border-gray-300'
        ]"
      >
        <button
          @click="openRenameFamilyModal"
          :class="[
            'w-full px-4 py-2 text-left text-sm transition-colors',
            isDarkMode 
              ? 'text-gray-200 hover:bg-gray-700' 
              : 'text-gray-700 hover:bg-gray-100'
          ]"
        >
          <div class="flex items-center gap-2">
            <Icon name="ri:edit-line" :size="16" />
            <span>Edit Family</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Rename Aircraft Family Modal -->
    <Teleport to="body">
    <div
      v-if="showRenameFamilyModal"
      class="app-modal-overlay flex items-center justify-center p-4"
      @click.self="closeRenameFamilyModal"
    >
      <div
        :class="[
          'relative w-full max-w-md rounded-2xl border shadow-2xl transition-colors duration-300',
          isDarkMode 
            ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40' 
            : 'bg-white border-gray-200 shadow-sm'
        ]"
        @click.stop
      >
        <div class="flex items-center justify-between p-6 border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
          <h3 :class="['text-xl font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
            Edit Aircraft Family
          </h3>
          <button
            @click="closeRenameFamilyModal"
            :class="[
              'p-1 rounded-lg transition-colors',
              isDarkMode 
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-300'
            ]"
            aria-label="Close"
          >
            <Icon name="ri:close-line" size="24" />
          </button>
        </div>
        
        <div class="p-6 space-y-4">
          <div>
            <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Current Name
            </div>
            <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
              {{ renameFamilyOldName }}
            </div>
            <div :class="['text-xs mt-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              {{ entriesToRenameCount }} entries will be updated
            </div>
          </div>

          <div>
            <label :class="['block text-sm font-semibold font-quicksand mb-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              New Name
            </label>
            <input
              v-model="renameFamilyNewName"
              type="text"
              :class="[
                'w-full rounded-lg border px-3 py-2 text-base font-quicksand',
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              ]"
              placeholder="Enter new family name"
              @keyup.enter="confirmRenameFamily"
              @keyup.escape="closeRenameFamilyModal"
              autofocus
            />
          </div>

          <div v-if="renameFamilyNewName.trim()" class="rounded-lg p-3" :class="[isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100']">
            <div :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              <span class="font-semibold">Note:</span>
              <span v-if="renameFamilyNewName.trim() === (renameFamilyCanonicalKey || renameFamilyOldName).trim()">
                Display name will update; same family and tags.
              </span>
              <span v-else-if="catalogs.families?.includes(renameFamilyNewName.trim())">
                This will merge with the existing "{{ renameFamilyNewName.trim() }}" family.
              </span>
              <span v-else>
                This will create a new family group.
              </span>
            </div>
          </div>

          <!-- Simulator type for training device families -->
          <div v-if="renameFamilyShowSimType" class="pt-4 border-t" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
            <label :class="['block text-sm font-semibold font-quicksand mb-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Simulator Type
            </label>
            <select
              v-model="renameFamilySimType"
              :class="['w-full rounded-lg border px-3 py-2 text-sm font-quicksand', isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']"
            >
              <option value="">Not set (default ATD on import)</option>
              <option v-for="opt in categoryClassSimOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <p :class="['text-xs mt-1', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
              Saved to your catalog for future imports. Existing simulator entries in this family can be updated when you save.
            </p>
          </div>

          <!-- Tags for this family (applied to all entries in family, autofill on new entries) -->
          <div v-if="isAuthenticated" class="pt-4 border-t" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
            <div :class="['text-sm font-semibold font-quicksand mb-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Tags</div>
            <p :class="['text-xs mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-500']">Family tags are also applied to all log entries that use this aircraft family.</p>
            <div v-if="editFamilyLastTagEntryCount !== null" :class="['text-xs mb-2', isDarkMode ? 'text-green-400' : 'text-green-600']">
              {{ editFamilyLastTagEntryCount === 0 ? 'Tag added to this family.' : `Tag added to this family and to ${editFamilyLastTagEntryCount} log entry${editFamilyLastTagEntryCount === 1 ? '' : 's'}.` }}
            </div>
            <div class="flex flex-wrap gap-2 items-center">
              <span v-for="tag in getEntityTags('family', renameFamilyCanonicalKey)" :key="tag" class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm" :class="[isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-300 text-gray-800']">
                {{ tag }}
                <button type="button" aria-label="Remove tag" @click="removeEntityTag('family', renameFamilyCanonicalKey, tag); editFamilyNewTagInput = ''" :class="['rounded p-0.5', isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-400']"><Icon name="ri:close-line" size="14" /></button>
              </span>
              <template v-if="!editFamilyShowAddTag">
                <button type="button" @click="editFamilyShowAddTag = true" :class="['inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-sm font-quicksand', isDarkMode ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-400 text-gray-600 hover:bg-gray-200']">+ Add tag</button>
              </template>
              <template v-else>
                <div class="flex flex-col gap-2">
                  <div v-if="[...fixedTagOptions, ...presetsInUse].filter(t => !getEntityTags('family', renameFamilyCanonicalKey).includes(t)).length" class="flex flex-wrap gap-1">
                    <span :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500']">Presets: </span>
                    <button v-for="tag in [...fixedTagOptions, ...presetsInUse].filter(t => !getEntityTags('family', renameFamilyCanonicalKey).includes(t))" :key="'preset-' + tag" type="button" @click="addEntityTag('family', renameFamilyCanonicalKey, tag); editFamilyShowAddTag = false" :class="['rounded-full px-2 py-0.5 text-xs font-quicksand', isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300']">{{ tag }}</button>
                  </div>
                  <div v-if="presetsUnused.length" class="flex flex-wrap gap-1 items-center">
                    <span :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500']">Unused (remove): </span>
                    <span v-for="tag in presetsUnused" :key="'unused-' + tag" class="inline-flex items-center gap-0.5 rounded-full pl-2 pr-0.5 py-0.5 text-xs" :class="[isDarkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-200 text-gray-600']">
                      {{ tag }}
                      <button type="button" aria-label="Remove from presets" @click="removeTagPreset(tag)" :class="['rounded p-0.5', isDarkMode ? 'hover:bg-gray-500' : 'hover:bg-gray-300']"><Icon name="ri:close-line" size="12" /></button>
                    </span>
                  </div>
                  <div class="inline-flex gap-1 items-center">
                    <input v-model="editFamilyNewTagInput" type="text" placeholder="Or type new tag" :class="['w-32 rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']" @keydown.enter.prevent="addEntityTag('family', renameFamilyCanonicalKey, editFamilyNewTagInput); editFamilyNewTagInput = ''; editFamilyShowAddTag = false" />
                    <button type="button" @click="addEntityTag('family', renameFamilyCanonicalKey, editFamilyNewTagInput); editFamilyNewTagInput = ''; editFamilyShowAddTag = false" :class="['rounded px-2 py-1 text-xs', isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300']">Add</button>
                    <button type="button" @click="editFamilyShowAddTag = false; editFamilyNewTagInput = ''" :class="['rounded p-1', isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-200']" aria-label="Cancel"><Icon name="ri:close-line" size="16" /></button>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 p-6 border-t" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
          <button
            @click="closeRenameFamilyModal"
            :class="[
              'px-4 py-2 rounded-lg font-semibold font-quicksand transition-colors',
              isDarkMode 
                ? 'text-gray-300 hover:bg-gray-700' 
                : 'text-gray-700 hover:bg-gray-300'
            ]"
          >
            Cancel
          </button>
          <button
            @click="confirmRenameFamily"
            :disabled="!renameFamilyNewName.trim() || (!renameFamilyShowSimType && renameFamilyNewName.trim() === renameFamilyOldName)"
            :class="[
              'px-4 py-2 rounded-lg font-semibold font-quicksand transition-colors',
              (!renameFamilyNewName.trim() || (!renameFamilyShowSimType && renameFamilyNewName.trim() === renameFamilyOldName))
                ? (isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                : (isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700')
            ]"
          >
            {{ renameFamilyNewName.trim() === renameFamilyOldName ? 'Save' : 'Rename' }}
          </button>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Import busy overlay (parse + commit) -->
    <Teleport to="body">
      <div
        v-if="importBusy"
        class="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div
          :class="[
            'flex items-center gap-3 rounded-2xl px-5 py-4 shadow-xl border',
            isDarkMode
              ? 'bg-gray-900 border-white/10 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          ]"
        >
          <Icon name="ri:loader-4-line" size="24" class="animate-spin flex-shrink-0" />
          <span class="text-sm font-quicksand font-medium">{{ importBusyLabel }}</span>
        </div>
      </div>
    </Teleport>

    <!-- Import Preview Modal -->
    <Teleport to="body">
    <div
      v-if="showImportPreview && importPreviewStatistics && importPreviewMetadata"
      class="app-modal-overlay flex items-center justify-center p-4"
      @click.self="!importBusy && cancelImport()"
    >
      <div
        :class="[
          'relative w-full max-w-4xl max-h-[90vh] rounded-2xl border shadow-2xl transition-colors duration-300 flex flex-col',
          isDarkMode 
            ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40' 
            : 'bg-white border-gray-200 shadow-sm'
        ]"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b flex-shrink-0" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
          <div>
            <h3 :class="['text-xl font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
              Import Preview
            </h3>
            <p :class="['text-sm font-quicksand mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              {{ importPreviewMetadata.fileName }} ({{ importPreviewMetadata.fileType }})
            </p>
          </div>
          <button
            @click="cancelImport"
            :disabled="importBusy"
            :class="[
              'p-1 rounded-lg transition-colors',
              importBusy ? 'opacity-40 cursor-not-allowed' : '',
              isDarkMode 
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-300'
            ]"
            aria-label="Close"
          >
            <Icon name="ri:close-line" size="24" />
          </button>
        </div>

        <!-- Content - Scrollable -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Summary Statistics -->
          <div>
            <h4 :class="['text-lg font-semibold font-quicksand mb-4', isDarkMode ? 'text-white' : 'text-gray-900']">
              Summary
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div :class="['rounded-lg border p-4', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Total Entries</div>
                <div :class="['text-2xl font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ importPreviewStatistics.totalEntries }}
                </div>
              </div>
              <div :class="['rounded-lg border p-4', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">To Import</div>
                <div :class="['text-2xl font-bold font-mono text-green-500']">
                  {{ importPreviewStatistics.totalEntries - importPreviewStatistics.duplicates - importPreviewStatistics.errors }}
                </div>
              </div>
              <div :class="['rounded-lg border p-4', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Duplicates</div>
                <div :class="['text-2xl font-bold font-mono', importPreviewStatistics.duplicates > 0 ? 'text-yellow-500' : 'text-gray-400']">
                  {{ importPreviewStatistics.duplicates }}
                </div>
              </div>
              <div :class="['rounded-lg border p-4', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Errors</div>
                <div :class="['text-2xl font-bold font-mono', importPreviewStatistics.errors > 0 ? 'text-red-500' : 'text-gray-400']">
                  {{ importPreviewStatistics.errors }}
                </div>
              </div>
            </div>
          </div>

          <!-- Flight Time Statistics -->
          <div>
            <h4 :class="['text-lg font-semibold font-quicksand', importPreviewStatistics.duplicates > 0 ? 'mb-1' : 'mb-4', isDarkMode ? 'text-white' : 'text-gray-900']">
              Flight Time
            </h4>
            <p
              v-if="importPreviewStatistics.duplicates > 0"
              :class="['text-xs font-quicksand mb-4', isDarkMode ? 'text-gray-400' : 'text-gray-500']"
            >
              Totals reflect all rows in this file (including duplicates). Only non-duplicate rows will be imported.
            </p>
            <div v-if="importPreviewTimeCards.length" class="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div
                v-for="card in importPreviewTimeCards"
                :key="card.label"
                :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']"
              >
                <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ card.label }}</div>
                <div :class="['text-lg font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ card.hours.toFixed(1) }}h
                </div>
              </div>
            </div>
            <p v-else :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              No flight time data found in entries to import.
            </p>
          </div>

          <!-- Performance Statistics -->
          <div>
            <h4 :class="['text-lg font-semibold font-quicksand mb-4', isDarkMode ? 'text-white' : 'text-gray-900']">
              Performance
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Total Landings</div>
                <div :class="['text-lg font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ importPreviewStatistics.totalLandings }}
                </div>
              </div>
              <div :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Day Landings</div>
                <div :class="['text-lg font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ importPreviewStatistics.dayLandings }}
                </div>
              </div>
              <div :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Night Landings</div>
                <div :class="['text-lg font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ importPreviewStatistics.nightLandings }}
                </div>
              </div>
              <div :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Approaches</div>
                <div :class="['text-lg font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ importPreviewStatistics.totalApproaches }}
                </div>
              </div>
            </div>
          </div>

          <!-- Date Range & Aircraft Breakdown -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 :class="['text-sm font-semibold font-quicksand mb-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Date Range
              </h4>
              <div :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div :class="['text-sm font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ importPreviewStatistics.dateRange.earliest ? formatDisplayDate(importPreviewStatistics.dateRange.earliest) : 'N/A' }}
                  <span :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']"> → </span>
                  {{ importPreviewStatistics.dateRange.latest ? formatDisplayDate(importPreviewStatistics.dateRange.latest) : 'N/A' }}
                </div>
              </div>
            </div>
            <div>
              <h4 :class="['text-sm font-semibold font-quicksand mb-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Aircraft ({{ Object.keys(importPreviewStatistics.aircraftBreakdown).length }})
              </h4>
              <div :class="['rounded-lg border p-3 max-h-32 overflow-y-auto', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div v-for="(count, aircraft) in importPreviewStatistics.aircraftBreakdown" :key="aircraft" 
                     :class="['text-xs font-quicksand py-1', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                  {{ aircraft }}: {{ count }}
                </div>
              </div>
            </div>
          </div>

          <!-- Errors (if any) -->
          <div v-if="importPreviewStatistics.errors > 0">
            <h4 :class="['text-lg font-semibold font-quicksand mb-4 text-red-500']">
              Errors ({{ importPreviewStatistics.errors }})
            </h4>
            <div :class="['rounded-lg border p-4 max-h-40 overflow-y-auto', isDarkMode ? 'border-red-700 bg-red-900/20' : 'border-red-300 bg-red-50']">
              <div v-for="(error, index) in importPreviewStatistics.errorMessages.slice(0, 10)" :key="index"
                   :class="['text-sm font-quicksand text-red-600 py-1']">
                {{ error }}
              </div>
              <div v-if="importPreviewStatistics.errorMessages.length > 10" 
                   :class="['text-sm font-quicksand text-red-500 py-1']">
                ... and {{ importPreviewStatistics.errorMessages.length - 10 }} more errors
              </div>
            </div>
            <div class="mt-4 p-3 rounded-lg border" :class="[isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-gray-50']">
              <label class="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="importWithErrors"
                  class="rounded"
                />
                <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                  Import entries with errors and flag them
                </span>
              </label>
              <p :class="['text-xs mt-1 ml-6', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
                These entries will be flagged for review. The validation error will be added to the remarks field.
              </p>
            </div>
          </div>

          <!-- Duplicates (if any) -->
          <div v-if="importPreviewStatistics.duplicates > 0">
            <h4 :class="['text-lg font-semibold font-quicksand mb-4 text-yellow-500']">
              Duplicates ({{ importPreviewStatistics.duplicates }})
            </h4>
            <div :class="['rounded-lg border p-4 max-h-60 overflow-y-auto', isDarkMode ? 'border-yellow-700 bg-yellow-900/20' : 'border-yellow-300 bg-yellow-50']">
              <div v-for="(dup, index) in importPreviewStatistics.duplicateEntries.slice(0, 10)" :key="index"
                   :class="['text-sm font-quicksand py-2 border-b last:border-b-0', isDarkMode ? 'border-yellow-700/30 text-yellow-200' : 'border-yellow-300/50 text-yellow-800']">
                <div class="font-semibold mb-1">
                  {{ formatDisplayDate(dup.entry.date) }} · {{ dup.entry.registration }} · {{ formatEntryAirportCode(dup.entry, dup.entry.departure) }} → {{ formatEntryAirportCode(dup.entry, dup.entry.destination) }}
                </div>
                <div :class="['text-xs mt-1', isDarkMode ? 'text-yellow-300' : 'text-yellow-700']">
                  Matches {{ dup.matches.length }} existing {{ dup.matches.length === 1 ? 'entry' : 'entries' }}:
                  <span v-for="(match, matchIndex) in dup.matches" :key="match.id" class="ml-1">
                    {{ formatDisplayDate(match.date) }} {{ match.registration }}{{ matchIndex < dup.matches.length - 1 ? ',' : '' }}
                  </span>
                </div>
              </div>
              <div v-if="importPreviewStatistics.duplicateEntries.length > 10" 
                   :class="['text-sm font-quicksand py-2', isDarkMode ? 'text-yellow-300' : 'text-yellow-700']">
                ... and {{ importPreviewStatistics.duplicateEntries.length - 10 }} more duplicate {{ importPreviewStatistics.duplicateEntries.length - 10 === 1 ? 'entry' : 'entries' }}
              </div>
            </div>
            <div class="mt-4 p-3 rounded-lg border" :class="[isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-gray-50']">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="importDuplicatesFlagged"
                  class="rounded"
                />
                <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                  Import duplicate entries and flag them for review
                </span>
              </label>
              <p :class="['text-xs mt-1 ml-6', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
                Use Import All to save every row in this file. Rows that match your logbook will be flagged with a note in remarks.
              </p>
            </div>
          </div>

          <!-- Simulator device types (when sim rows need FFS/FTD/ATD) -->
          <div v-if="importPreviewSimDevices.length > 0">
            <h4 :class="['text-lg font-semibold font-quicksand mb-4', isDarkMode ? 'text-white' : 'text-gray-900']">
              Simulator Devices
            </h4>
            <p :class="['text-xs font-quicksand mb-3', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Choose the device type for each simulator before importing. Defaults to your catalog setting or ATD.
            </p>
            <div class="space-y-3">
              <div
                v-for="device in importPreviewSimDevices"
                :key="device.key"
                :class="['rounded-lg border p-4', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-gray-50']"
              >
                <div class="flex flex-wrap items-center gap-3 justify-between">
                  <div :class="['text-sm font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                    {{ device.makeModel }}<span v-if="device.registration" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']"> · {{ device.registration }}</span>
                  </div>
                  <select
                    v-model="importSimTypeOverrides[device.key]"
                    :class="['rounded-lg border px-3 py-1.5 text-sm font-quicksand', isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']"
                  >
                    <option v-for="opt in categoryClassSimOptions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </div>
                <label class="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    v-model="importSimRememberDevice[device.key]"
                    type="checkbox"
                    class="rounded"
                  />
                  <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                    Remember this device type in catalog
                  </span>
                </label>
              </div>
            </div>
          </div>

          <!-- Entry List -->
          <div>
            <h4 :class="['text-lg font-semibold font-quicksand mb-4', isDarkMode ? 'text-white' : 'text-gray-900']">
              Entries in File ({{ importPreviewStatistics.totalEntries }})
            </h4>
            <div class="space-y-2 max-h-96 overflow-y-auto">
              <div
                v-for="item in importPreviewListItems"
                :key="item.entry.id"
                :class="[
                  'rounded-lg border p-3 cursor-pointer transition-colors',
                  isDarkMode 
                    ? 'border-gray-700 bg-gray-900/30 hover:bg-gray-900/50' 
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                ]"
                @click="togglePreviewEntry(item.entry.id)"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3">
                      <div :class="['text-sm font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">
                        {{ formatDisplayDate(item.entry.date) }}
                      </div>
                      <div :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                        {{ item.entry.registration }}
                      </div>
                      <div :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                        {{ item.entry.aircraftMakeModel }}
                      </div>
                      <span
                        v-if="item.status === 'duplicate'"
                        :class="['inline-block rounded px-1.5 py-0.5 text-xs font-quicksand', isDarkMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-800']"
                      >
                        Duplicate
                      </span>
                    </div>
                    <div class="flex items-center gap-2 mt-1">
                      <div :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                        {{ formatEntryAirportCode(item.entry, item.entry.departure) }} → {{ formatEntryAirportCode(item.entry, item.entry.destination) }}
                      </div>
                      <div :class="['text-xs font-mono', isDarkMode ? 'text-blue-400' : 'text-blue-600']">
                        {{ (item.entry.flightTime.total ?? 0).toFixed(1) }}h
                      </div>
                    </div>
                  </div>
                  <Icon 
                    :name="expandedPreviewEntries.has(item.entry.id) ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'" 
                    size="20" 
                    :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']"
                  />
                </div>
                <div v-if="expandedPreviewEntries.has(item.entry.id)" class="mt-3 pt-3 border-t" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div><span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">Role:</span> <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ roleDisplayLabel(item.entry.role) }}</span></div>
                    <div
                      v-for="timeField in entryNonZeroTimeFields(item.entry)"
                      :key="timeField.label"
                    >
                      <span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ timeField.label }}:</span>
                      <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ timeField.hours.toFixed(1) }}h</span>
                    </div>
                    <div><span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">Landings:</span> <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ (item.entry.performance.dayLandings ?? 0) + (item.entry.performance.nightLandings ?? 0) }}</span></div>
                    <div><span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">Approaches:</span> <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ getTotalApproachCount(item.entry.performance) }}</span></div>
                    <div v-if="(item.entry.tags || []).length" class="col-span-2 flex flex-wrap gap-1">
                      <span v-for="t in (item.entry.tags || [])" :key="t" :class="['inline-block rounded px-1.5 py-0.5 text-xs', isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700']">{{ t }}</span>
                    </div>
                  </div>
                  <div v-if="item.entry.remarks" class="mt-2 text-xs" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-600']">
                    {{ item.entry.remarks }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer with Buttons -->
        <div class="flex items-center justify-end gap-3 p-6 border-t flex-shrink-0" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
          <button
            @click="cancelImport"
            :disabled="importBusy"
            :class="[
              'px-4 py-2 rounded-lg font-quicksand transition-colors',
              importBusy ? 'opacity-50 cursor-not-allowed' : '',
              isDarkMode 
                ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white shadow-sm shadow-black/20' 
                : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
            ]"
          >
            Cancel
          </button>
          <button
            v-if="importPreviewStatistics.duplicates > 0"
            @click="handleSkipDuplicatesImport"
            :disabled="importBusy || importPreviewToImportCount === 0"
            :class="[
              'px-4 py-2 rounded-lg font-quicksand transition-colors',
              importBusy || importPreviewToImportCount === 0
                ? 'opacity-50 cursor-not-allowed'
                : '',
              importPreviewToImportCount > 0
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : (isDarkMode ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900')
            ]"
          >
            Skip Duplicates & Import ({{ importPreviewToImportCount }})
          </button>
          <button
            v-if="importPreviewStatistics.duplicates > 0"
            :disabled="importBusy || !importDuplicatesFlagged"
            @click="handleImportAllWithDuplicates"
            :class="[
              'px-4 py-2 rounded-lg font-quicksand transition-colors',
              importBusy || !importDuplicatesFlagged
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            ]"
          >
            Import All ({{ importPreviewStatistics.totalEntries }})
          </button>
          <button
            v-else
            @click="handleSkipDuplicatesImport"
            :disabled="importBusy"
            :class="[
              'px-4 py-2 rounded-lg font-quicksand transition-colors',
              importBusy ? 'opacity-50 cursor-not-allowed' : '',
              'bg-green-600 hover:bg-green-700 text-white'
            ]"
          >
            Import ({{ importPreviewToImportCount }})
          </button>
        </div>
      </div>
    </div>
    </Teleport>
  </div>

  <!-- End Main Content -->
  
  <!-- Loading State -->
  <div
    v-else-if="authLoading"
    class="flex items-center justify-center min-h-screen"
    :class="isDarkMode ? 'bg-gray-900' : 'bg-gray-300'"
  >
    <div class="text-center">
      <Icon name="ri:loader-4-line" size="48" class="animate-spin mx-auto mb-4" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'" />
      <p :class="['text-lg font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Loading...</p>
    </div>
  </div>

  <!-- Duplicate Confirmation Dialog -->
  <Teleport to="body">
  <div
    v-if="showDuplicateConfirmDialog && importPreviewStatistics"
    class="app-modal-overlay flex items-center justify-center p-4"
    @click.self="handleDuplicateConfirm(false)"
  >
    <div
      :class="[
        'relative w-full max-w-md rounded-2xl border shadow-2xl transition-colors duration-300',
        isDarkMode 
          ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40' 
          : 'bg-white border-gray-200 shadow-sm'
      ]"
      @click.stop
    >
      <div class="flex items-center justify-between p-6 border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
        <h3 :class="['text-xl font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
          Duplicate Entries Detected
        </h3>
        <button
          @click="handleDuplicateConfirm(false)"
          :class="[
            'p-1 rounded-lg transition-colors',
            isDarkMode 
              ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-300'
          ]"
          aria-label="Close"
        >
          <Icon name="ri:close-line" size="24" />
        </button>
      </div>
      
      <div class="p-6 space-y-4">
        <div :class="['flex items-start gap-3', isDarkMode ? 'text-yellow-200' : 'text-yellow-700']">
          <Icon name="ri:alert-line" size="24" class="flex-shrink-0 mt-0.5" />
          <div class="flex-1">
            <p :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              Found {{ importPreviewStatistics.duplicates }} duplicate {{ importPreviewStatistics.duplicates === 1 ? 'entry' : 'entries' }} that match existing entries in your logbook.
            </p>
            <p :class="['text-sm font-quicksand mt-2', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
              Duplicates are rows that match an existing flight on date, tail, route, role, times, and landings. Remarks and tags are ignored. Importing duplicates may create duplicate entries in your logbook.
            </p>
          </div>
        </div>
        
        <div v-if="importPreviewStatistics.duplicateEntries.length > 0" 
             :class="['rounded-lg border p-3 max-h-40 overflow-y-auto', isDarkMode ? 'border-yellow-700/50 bg-yellow-900/10' : 'border-yellow-300 bg-yellow-50']">
          <div :class="['text-xs font-semibold font-quicksand mb-2', isDarkMode ? 'text-yellow-300' : 'text-yellow-700']">
            Sample duplicates:
          </div>
          <div v-for="(dup, index) in importPreviewStatistics.duplicateEntries.slice(0, 3)" :key="index"
               :class="['text-xs font-quicksand py-1', isDarkMode ? 'text-yellow-200' : 'text-yellow-800']">
            {{ formatDisplayDate(dup.entry.date) }} · {{ dup.entry.registration }} · {{ formatEntryAirportCode(dup.entry, dup.entry.departure) }} → {{ formatEntryAirportCode(dup.entry, dup.entry.destination) }}
          </div>
          <div v-if="importPreviewStatistics.duplicateEntries.length > 3"
               :class="['text-xs font-quicksand py-1', isDarkMode ? 'text-yellow-300' : 'text-yellow-700']">
            ... and {{ importPreviewStatistics.duplicateEntries.length - 3 }} more
          </div>
        </div>
      </div>
      
      <div class="flex items-center justify-end gap-3 p-6 border-t" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
        <button
          @click="handleDuplicateConfirm(false)"
          :class="[
            'px-4 py-2 rounded-lg font-quicksand transition-colors',
            isDarkMode 
              ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white shadow-sm shadow-black/20' 
              : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
          ]"
        >
          Cancel
        </button>
        <button
          @click="handleDuplicateConfirm(true)"
          :class="[
            'px-4 py-2 rounded-lg font-quicksand transition-colors',
            'bg-yellow-600 hover:bg-yellow-700 text-white'
          ]"
        >
          Import Anyway
        </button>
      </div>
    </div>
  </div>
  </Teleport>

  <!-- Duplicate Override Confirmation Dialog (for individual entry saves) -->
  <Teleport to="body">
  <div
    v-if="showDuplicateOverrideDialog && duplicateWarning"
    class="app-modal-overlay flex items-center justify-center p-4"
    @click.self="showDuplicateOverrideDialog = false"
  >
    <div
      :class="[
        'relative w-full max-w-md rounded-2xl border shadow-2xl transition-colors duration-300',
        isDarkMode 
          ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40' 
          : 'bg-white border-gray-200 shadow-sm'
      ]"
      @click.stop
    >
      <div class="flex items-center justify-between p-6 border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
        <h3 :class="['text-xl font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
          Confirm Save Duplicate Entry
        </h3>
        <button
          @click="showDuplicateOverrideDialog = false"
          :class="[
            'p-1 rounded-lg transition-colors',
            isDarkMode 
              ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-300'
          ]"
          aria-label="Close"
        >
          <Icon name="ri:close-line" size="24" />
        </button>
      </div>
      
      <div class="p-6 space-y-4">
        <div :class="['flex items-start gap-3', isDarkMode ? 'text-yellow-200' : 'text-yellow-700']">
          <Icon name="ri:alert-line" size="24" class="flex-shrink-0 mt-0.5" />
          <div class="flex-1">
            <p :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              This entry matches {{ duplicateWarning.matches.length }} existing {{ duplicateWarning.matches.length === 1 ? 'entry' : 'entries' }} in your logbook.
            </p>
            <p :class="['text-sm font-quicksand mt-2', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
              Are you sure you want to save this duplicate entry? This may create duplicate records in your logbook.
            </p>
          </div>
        </div>
        
        <div v-if="duplicateWarning.matches.length > 0" 
             :class="['rounded-lg border p-3 max-h-40 overflow-y-auto', isDarkMode ? 'border-yellow-700/50 bg-yellow-900/10' : 'border-yellow-300 bg-yellow-50']">
          <div :class="['text-xs font-semibold font-quicksand mb-2', isDarkMode ? 'text-yellow-300' : 'text-yellow-700']">
            Matching {{ duplicateWarning.matches.length === 1 ? 'entry' : 'entries' }}:
          </div>
          <div v-for="match in duplicateWarning.matches.slice(0, 5)" :key="match.id"
               :class="['text-xs font-quicksand py-1', isDarkMode ? 'text-yellow-200' : 'text-yellow-800']">
            • {{ formatDisplayDate(match.date) }} · {{ match.registration }} · {{ formatEntryAirportCode(match, match.departure) }} → {{ formatEntryAirportCode(match, match.destination) }}
          </div>
          <div v-if="duplicateWarning.matches.length > 5"
               :class="['text-xs font-quicksand py-1', isDarkMode ? 'text-yellow-300' : 'text-yellow-700']">
            ... and {{ duplicateWarning.matches.length - 5 }} more
          </div>
        </div>
      </div>
      
      <div class="flex items-center justify-end gap-3 p-6 border-t" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
        <button
          @click="showDuplicateOverrideDialog = false"
          :class="[
            'px-4 py-2 rounded-lg font-quicksand transition-colors',
            isDarkMode 
              ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white shadow-sm shadow-black/20' 
              : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
          ]"
        >
          Cancel
        </button>
        <button
          @click="showDuplicateOverrideDialog = false; saveAnyway = true; void (newEntryNeedsSignature ? submitEntryWithIntent('later') : submitEntryWithIntent('none'))"
          :class="[
            'px-4 py-2 rounded-lg font-quicksand transition-colors',
            'bg-yellow-600 hover:bg-yellow-700 text-white'
          ]"
        >
          Yes, Save Anyway
        </button>
      </div>
    </div>
  </div>
  </Teleport>

  <!-- Export Dialog (trust-first: scope + preview) -->
  <Teleport to="body">
  <div
    v-if="showExportDialog"
    :class="[
      'app-modal-overlay flex items-center justify-center',
      isIos ? 'p-0' : 'p-4',
    ]"
    @click.self="closeExportDialog"
  >
    <div
      :class="[
        'relative w-full flex flex-col border shadow-2xl transition-colors duration-300',
        isIos
          ? 'max-w-none max-h-[100dvh] h-[100dvh] rounded-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
          : 'max-w-4xl max-h-[90vh] rounded-2xl',
        isDarkMode 
          ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40' 
          : 'bg-white border-gray-200 shadow-sm'
      ]"
      @click.stop
    >
      <div
        :class="[
          'flex border-b flex-shrink-0',
          isIos ? 'flex-col gap-2 p-4' : 'items-center justify-between p-6',
          isDarkMode ? 'border-gray-700' : 'border-gray-300',
        ]"
      >
        <div class="flex items-start justify-between gap-3 min-w-0">
          <div class="min-w-0 flex-1">
            <h3 :class="[isIos ? 'text-lg' : 'text-xl', 'font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
              Export Logbook
            </h3>
            <p :class="['text-sm font-quicksand mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Choose what to export and review the entries before downloading.
            </p>
          </div>
          <button
            @click="closeExportDialog"
            :class="[
              'p-1 rounded-lg transition-colors shrink-0',
              isDarkMode 
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-300'
            ]"
            aria-label="Close"
          >
            <Icon name="ri:close-line" size="24" />
          </button>
        </div>
      </div>

      <div :class="['flex-1 overflow-y-auto space-y-6 min-h-0', isIos ? 'p-4' : 'p-6']">
        <!-- Scope -->
        <div>
          <h4 :class="['text-lg font-semibold font-quicksand mb-3', isDarkMode ? 'text-white' : 'text-gray-900']">
            What to export
          </h4>
          <div class="flex flex-wrap gap-4">
            <label :class="['flex items-center gap-2 cursor-pointer', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              <input type="radio" v-model="exportScope" value="all" class="rounded" />
              <span class="font-quicksand">All entries</span>
            </label>
            <label :class="['flex items-center gap-2 cursor-pointer', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              <input type="radio" v-model="exportScope" value="month" class="rounded" />
              <span class="font-quicksand">By month</span>
            </label>
            <label :class="['flex items-center gap-2 cursor-pointer', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              <input type="radio" v-model="exportScope" value="dateRange" class="rounded" />
              <span class="font-quicksand">By date range</span>
            </label>
            <label :class="['flex items-center gap-2 cursor-pointer', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              <input type="radio" v-model="exportScope" value="aircraft" class="rounded" />
              <span class="font-quicksand">By aircraft</span>
            </label>
          </div>
          <div v-if="exportScope === 'month'" class="mt-3 flex flex-wrap items-center gap-3">
            <select
              v-model.number="exportMonth.month"
              :class="[isIos ? 'w-full' : '', 'rounded border px-2 py-1.5 text-sm font-quicksand', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
            >
              <option v-for="m in 12" :key="m" :value="m">{{ ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] }}</option>
            </select>
            <input
              v-model.number="exportMonth.year"
              type="number"
              min="1900"
              max="2100"
              :class="[isIos ? 'w-full' : 'w-24', 'rounded border px-2 py-1.5 text-sm font-quicksand', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
              placeholder="Year"
            />
          </div>
          <div v-if="exportScope === 'dateRange'" :class="['mt-3 flex flex-wrap items-center gap-3', isIos ? 'flex-col items-stretch' : '']">
            <input
              v-model="exportDateStart"
              type="date"
              :class="[isIos ? 'w-full' : '', 'rounded border px-2 py-1.5 text-sm font-quicksand', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
            />
            <span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500', isIos ? 'self-center' : '']">to</span>
            <input
              v-model="exportDateEnd"
              type="date"
              :class="[isIos ? 'w-full' : '', 'rounded border px-2 py-1.5 text-sm font-quicksand', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
            />
          </div>
          <div v-if="exportScope === 'aircraft'" class="mt-3 max-h-40 overflow-y-auto rounded-lg border p-2" :class="[isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-gray-50']">
            <div class="flex flex-wrap gap-2">
              <label
                v-for="a in uniqueAircraftForExport"
                :key="a.registration"
                :class="['inline-flex items-center gap-2 rounded border px-2 py-1 text-sm font-quicksand cursor-pointer', exportSelectedAircraft.includes(a.registration) ? (isDarkMode ? 'border-blue-500 bg-blue-900/30' : 'border-blue-500 bg-blue-50') : (isDarkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700')]"
              >
                <input type="checkbox" :value="a.registration" v-model="exportSelectedAircraft" class="rounded" />
                <span>{{ a.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <label :class="['block text-sm font-medium font-quicksand mb-2', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
            Export format
          </label>
          <select
            v-model="exportDestination"
            :class="['w-full rounded border px-3 py-2 text-sm font-quicksand', isDarkMode ? 'bg-black/20 border-white/10 text-white shadow-inner' : 'bg-white border-gray-300 text-gray-900']"
          >
            <option
              v-for="(label, key) in EXPORT_DESTINATION_LABELS"
              :key="key"
              :value="key"
            >
              {{ label }}
            </option>
          </select>
          <p
            v-if="exportDestinationHint"
            :class="['mt-2 text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']"
          >
            {{ exportDestinationHint }}
          </p>
        </div>

        <!-- Preview -->
        <div v-if="exportPreviewStatistics">
          <h4 :class="['text-lg font-semibold font-quicksand mb-4', isDarkMode ? 'text-white' : 'text-gray-900']">
            Summary
          </h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div :class="['rounded-lg border p-4', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
              <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Entries to export</div>
              <div :class="['text-2xl font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">{{ exportPreviewStatistics.totalEntries }}</div>
            </div>
            <div :class="['rounded-lg border p-4', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
              <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Total time</div>
              <div :class="['text-2xl font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">{{ exportPreviewStatistics.totalFlightTime.toFixed(1) }}h</div>
            </div>
            <div :class="['rounded-lg border p-4', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
              <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">PIC</div>
              <div :class="['text-2xl font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">{{ exportPreviewStatistics.picTime.toFixed(1) }}h</div>
            </div>
            <div :class="['rounded-lg border p-4', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
              <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Night</div>
              <div :class="['text-2xl font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">{{ exportPreviewStatistics.nightTime.toFixed(1) }}h</div>
            </div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
              <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">XC</div>
              <div :class="['text-lg font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">{{ exportPreviewStatistics.crossCountryTime.toFixed(1) }}h</div>
            </div>
            <div :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
              <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Instrument</div>
              <div :class="['text-lg font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">{{ (exportPreviewStatistics.actualInstrumentTime + exportPreviewStatistics.simulatedInstrumentTime).toFixed(1) }}h</div>
            </div>
            <div :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
              <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Landings</div>
              <div :class="['text-lg font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">{{ exportPreviewStatistics.totalLandings }}</div>
            </div>
            <div :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
              <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Approaches</div>
              <div :class="['text-lg font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">{{ exportPreviewStatistics.totalApproaches }}</div>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <h4 :class="['text-sm font-semibold font-quicksand mb-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Date range</h4>
              <div :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <span :class="['text-sm font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ exportPreviewStatistics.dateRange.earliest ? formatDisplayDate(exportPreviewStatistics.dateRange.earliest) : 'N/A' }}
                  <span :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']"> → </span>
                  {{ exportPreviewStatistics.dateRange.latest ? formatDisplayDate(exportPreviewStatistics.dateRange.latest) : 'N/A' }}
                </span>
              </div>
            </div>
            <div>
              <h4 :class="['text-sm font-semibold font-quicksand mb-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Aircraft ({{ Object.keys(exportPreviewStatistics.aircraftBreakdown).length }})</h4>
              <div :class="['rounded-lg border p-3 max-h-32 overflow-y-auto', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div v-for="(count, aircraft) in exportPreviewStatistics.aircraftBreakdown" :key="aircraft"
                     :class="['text-xs font-quicksand py-1', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                  {{ aircraft }}: {{ count }}
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4">
            <h4 :class="['text-lg font-semibold font-quicksand mb-4', isDarkMode ? 'text-white' : 'text-gray-900']">
              Entries to export ({{ exportFilteredEntries.length }})
            </h4>
            <div class="space-y-2 max-h-96 overflow-y-auto">
              <div
                v-for="entry in exportFilteredEntries"
                :key="entry.id"
                :class="[
                  'rounded-lg border p-3 cursor-pointer transition-colors',
                  isDarkMode 
                    ? 'border-gray-700 bg-gray-900/30 hover:bg-gray-900/50' 
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                ]"
                @click="toggleExportPreviewEntry(entry.id)"
              >
                <div class="flex items-center justify-between gap-2 min-w-0">
                  <div class="flex-1 min-w-0">
                    <div :class="['flex gap-2 min-w-0', isIos ? 'flex-col items-start' : 'items-center gap-3']">
                      <div :class="['text-sm font-bold font-mono shrink-0', isDarkMode ? 'text-white' : 'text-gray-900']">{{ formatDisplayDate(entry.date) }}</div>
                      <div :class="['text-sm font-quicksand shrink-0', isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ entry.registration }}</div>
                      <div :class="['text-sm font-quicksand min-w-0 truncate', isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ entry.aircraftMakeModel }}</div>
                    </div>
                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                      <div :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ formatEntryAirportCode(entry, entry.departure) }} → {{ formatEntryAirportCode(entry, entry.destination) }}</div>
                      <div :class="['text-xs font-mono', isDarkMode ? 'text-blue-400' : 'text-blue-600']">{{ (entry.flightTime.total ?? 0).toFixed(1) }}h</div>
                    </div>
                  </div>
                  <Icon 
                    :name="expandedExportPreviewEntries.has(entry.id) ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'" 
                    size="20" 
                    :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500', 'shrink-0']"
                  />
                </div>
                <div v-if="expandedExportPreviewEntries.has(entry.id)" class="mt-3 pt-3 border-t" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div><span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">Role:</span> <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ roleDisplayLabel(entry.role) }}</span></div>
                    <div><span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">PIC:</span> <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ (entry.flightTime.pic ?? 0).toFixed(1) }}h</span></div>
                    <div><span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">Night:</span> <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ (entry.flightTime.night ?? 0).toFixed(1) }}h</span></div>
                    <div><span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">XC:</span> <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ (entry.flightTime.crossCountry ?? 0).toFixed(1) }}h</span></div>
                    <div><span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">Landings:</span> <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ (entry.performance.dayLandings ?? 0) + (entry.performance.nightLandings ?? 0) }}</span></div>
                    <div><span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">Approaches:</span> <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ getTotalApproachCount(entry.performance) }}</span></div>
                    <div v-if="(entry.tags || []).length" class="col-span-2 flex flex-wrap gap-1">
                      <span v-for="t in (entry.tags || [])" :key="t" :class="['inline-block rounded px-1.5 py-0.5 text-xs', isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700']">{{ t }}</span>
                    </div>
                  </div>
                  <div v-if="entry.remarks" class="mt-2 text-xs" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-600']">{{ entry.remarks }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="rounded-lg border p-6 text-center" :class="[isDarkMode ? 'border-gray-700 bg-gray-900/30 text-gray-400' : 'border-gray-300 bg-gray-50 text-gray-600']">
          No entries match this scope. Adjust filters or choose "All entries".
        </div>
      </div>

      <div
        :class="[
          'flex flex-shrink-0 border-t',
          isIos ? 'flex-col-reverse gap-2 p-4' : 'items-center justify-end gap-3 p-6',
          isDarkMode ? 'border-gray-700' : 'border-gray-300',
        ]"
      >
        <button
          @click="closeExportDialog"
          :class="[
            'px-4 py-2 rounded-lg font-quicksand transition-colors',
            isIos ? 'w-full text-center' : '',
            isDarkMode 
              ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white shadow-sm shadow-black/20' 
              : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
          ]"
        >
          Cancel
        </button>
        <button
          :disabled="!exportPreviewStatistics || exportFilteredEntries.length === 0"
          @click="handleExportCsv(exportFilteredEntries); closeExportDialog()"
          :class="[
            'px-4 py-2 rounded-lg font-quicksand transition-colors flex items-center gap-2',
            isIos ? 'w-full justify-center' : '',
            !exportPreviewStatistics || exportFilteredEntries.length === 0
              ? (isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-400 cursor-not-allowed')
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          ]"
        >
          <Icon name="ri:file-excel-2-line" size="18" />
          Export CSV
        </button>
        <button
          :disabled="!exportPreviewStatistics || exportFilteredEntries.length === 0"
          @click="exportToJSON(exportFilteredEntries); closeExportDialog()"
          :class="[
            'px-4 py-2 rounded-lg font-quicksand transition-colors flex items-center gap-2',
            isIos ? 'w-full justify-center' : '',
            !exportPreviewStatistics || exportFilteredEntries.length === 0
              ? (isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-400 cursor-not-allowed')
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          ]"
        >
          <Icon name="ri:file-code-line" size="18" />
          Export as JSON
        </button>
      </div>
    </div>
  </div>
  </Teleport>

  <!-- Scroll to Top Button -->
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-300"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <button
      v-if="showScrollToTop && !isEntryFormOpen"
      @click="scrollToTop"
      :class="[
        'fixed z-40 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 border-none p-0',
        isIos
          ? 'left-1/2 bottom-[calc(1.5rem+env(safe-area-inset-bottom))]'
          : 'bottom-6',
        !isIos && (isSidebarCollapsed ? 'lg:left-16' : 'lg:left-44 xl:left-48')
      ]"
      style="background: transparent !important; background-color: transparent !important; appearance: none; -webkit-appearance: none; transform: translateX(-50%);"
      aria-label="Scroll to top"
    >
      <img
        :src="isDarkMode ? '/images/white-arrow.png' : '/images/black-arrow.png'"
        alt="Scroll to top"
        class="w-25 h-25"
      />
    </button>
  </Transition>
  <!-- Floating Add Entry button (bottom-right) -->
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <button
      v-if="!isEntryFormOpen"
      type="button"
      @click="toggleEntryForm"
      :class="[
        'fixed right-6 z-40 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 font-quicksand font-medium',
        isIos ? 'bottom-[calc(1.5rem+env(safe-area-inset-bottom))]' : 'bottom-6',
        isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-400' : 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-300'
      ]"
      aria-label="Add entry"
      aria-keyshortcuts="N"
    >
      <Icon name="ri:add-line" size="24" />
    </button>
  </Transition>
  <!-- End root div -->
</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, shallowRef, watch, watchEffect } from 'vue'
import {
  LOGBOOK_STORAGE_KEY,
  createEmptyFlightTime,
  createEmptyPerformance,
  createEmptyOOOI,
  getApproachesFromPerformance,
  getTotalApproachCount,
  OOOI_FIELD_ORDER,
} from '../utils/logbookTypes'
import type {
  CatalogKey,
  EditableLogEntry,
  FlightTimeBreakdown,
  FlightTimeKey,
  LogEntry,
  LogbookColumnConfig,
  LogbookColumnKey,
  OOOITimes,
  PerformanceKey,
  PerformanceMetrics
} from '../utils/logbookTypes'
import { useAircraftLookup } from '../composables/useAircraftLookup'
import type { AircraftInfo } from '../composables/useAircraftLookup'
import { aircraftEngineDisplay } from '../../shared/aircraftLookupLocal'
import { useAirportLookup } from '../composables/useAirportLookup'
import type { AirportInfo } from '../composables/useAirportLookup'
import { getPilotInitialsFromName } from '../utils/pilotProfile'
import { getDisplayedPilotInitials, shouldShowCurrencyChips } from '../utils/dashboardHydration'
import { markAppReady } from '../utils/appReady'
import {
  formatEntryAirportCode,
  getTotalTimeColorClass,
} from '../utils/entryFieldDisplay'
import { toCatalogAirportCode } from '../../shared/airportCodeCanonical'
import {
  getDisplayConditions,
  sanitizeFlightConditions,
} from '../utils/flightConditions'
import {
  validateCrossCountry,
  computeCrossCountryDistanceNm,
  parseRouteAirportCodes,
  getEntryAirportCodes,
  qualifiesForCrossCountryDistance,
  type CrossCountryAirportCoords,
  type AirportCoordinates
} from '../utils/validation'
import { useLocationLookup } from '../composables/useLocationLookup'
import { calculateNightTime } from '../utils/nightTimeCalculator'
import { DateTime } from 'luxon'
import { getAirportIanaTimezone, normalizeTimezoneToIANA } from '../../shared/airportTimezone'
import { sortEntriesByDateAndOOOI } from '../../shared/oooiSort'
import { listCatalogPersonDisplayNames } from '../../shared/catalogPersonNames'
import { calculateSectionII, calculateSectionIII } from '../utils/form8710Calculator'
import type { Form8710Data, AircraftCategory8710, ComplianceMetadata } from '../utils/form8710Types'
import { mapCategoryTo8710, isTrainingDevice } from '../utils/form8710Types'
import {
  applySimulatorImport,
  getSimTimeSum,
  inferLogbookType,
  isLikelySimulatorRow,
  normalizeSimulatorInstrumentTime,
  readSimHintsFromRawRow,
} from '../utils/importSimulator'
import {
  resolveImportNumber,
  resolveImportAircraftMakeModel,
  resolveImportRole,
  extractBaseModelName,
} from '../utils/importFieldMap'
import {
  getCatalogSimDeviceType,
  setCatalogSimDeviceType,
  mergeSimDeviceCatalog,
  getSimDeviceCatalogSnapshot,
  loadSimDeviceCatalogFromStorage,
  type SimTypeKey,
} from '../utils/simDeviceCatalog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'
import { useDataIntegrity } from '../composables/useDataIntegrity'
import { useValidation } from '../composables/useValidation'
import { useOffline } from '../composables/useOffline'
import { useToast } from '../composables/useToast'
import { useFlightSigning } from '../composables/useFlightSigning'
import { useRoster } from '../composables/useRoster'
import { requiresInstructorSignature } from '../utils/flightSigning'
import {
  buildSupersededIdSet,
  buildVoidAmendment,
  getAmendmentFor,
  isEntrySuperseded,
} from '../utils/logEntryAmendments'
import { isRosterRelationshipSignable } from '../utils/rosterRelationships'
import { withTimeout } from '../utils/promiseTimeout'
import { apiFetch } from '../utils/apiFetch'
import { useSyncQueue } from '../composables/useSyncQueue'
import { useExport } from '../composables/useExport'
import { logbookDataBridgeService } from '../../shared/logbookDataBridge'
import { downloadExport } from '../utils/logbookDownload'
import type { BridgeSource, ExportDestination } from '../../shared/logbookDataBridge/types'
import {
  EXPORT_DESTINATION_HINTS,
  EXPORT_DESTINATION_LABELS,
} from '../../shared/logbookDataBridge/types'
import { findFieldValue, mapRawRowToLogEntry } from '../../shared/logbookDataBridge/importMappers'
import { applyLogtenCrewFields } from '../utils/logbookImportEnrichments'
import { parseBridgeFile } from '../../shared/logbookDataBridge/fileParser'
import {
  enrichForeFlightEntries,
  mergeIncomingTags,
  providerKeyToBridgeSource,
  type ImportProviderKey,
} from '../../shared/import'
import {
  enrichLogtenDynamicExportRow,
  applyLogtenDynamicRoleAndTime,
  isLogtenDynamicExportHeaders,
} from '../../shared/logbookDataBridge/logtenDynamicExport'
import {
  catalogAircraftFamilyKey,
  UNKNOWN_AIRCRAFT_FAMILY,
} from '../../shared/catalogAircraftFamily'
import {
  buildAircraftTailIndex,
  buildTailCatalogFamilyMap,
  consolidateAircraftMakeModelByTail,
  effectiveCatalogFamilyKey,
  normalizeAircraftTailKey,
  resolveAircraftByTail,
} from '../../shared/aircraftTailIndex'
import { useCurrency } from '../composables/useCurrency'
import { useCapacitorPlatform, isCapacitorNative } from '../composables/useCapacitorPlatform'
import { useCatalogDrawerGestures } from '../composables/useCatalogDrawerGestures'
import { usePullToRefresh } from '../composables/usePullToRefresh'
import { useLogbookColumnConfig } from '../composables/useLogbookColumnConfig'
import { useDashboardShortcuts } from '../composables/useDashboardShortcuts'
import AuthModal from '../components/AuthModal.vue'
import AuditTrail from '../components/AuditTrail.vue'
import IntegrityStatus from '../components/IntegrityStatus.vue'
import ComplianceChecklist from '../components/ComplianceChecklist.vue'
import CurrencyDashboard from '../components/CurrencyDashboard.vue'
import DashboardSettingsModal from '../components/settings/DashboardSettingsModal.vue'
import CurrencyStatusChips from '../components/logbook/CurrencyStatusChips.vue'
import LogbookEmptyState from '../components/logbook/LogbookEmptyState.vue'
import LogEntryList from '../components/logbook/LogEntryList.vue'
import LogbookImportModal from '../components/import/LogbookImportModal.vue'
import ProductUpdateHeadline from '../components/ProductUpdateHeadline.vue'
import { useProductUpdates } from '../composables/useProductUpdates'
import type { SettingsStackFrame, SettingsTabId } from '../components/settings/settingsNav'
import { migrateLocalStorageToSupabase, hasMigrationCompleted } from '../utils/migrateLocalStorage'
import { findDuplicateEntries, checkDuplicatesWithLocalFallback } from '../utils/duplicateDetection'
import {
  buildDuplicatedDraft,
  findDuplicableLastEntry,
} from '../utils/duplicateLastFlight'
import {
  entryMatchesAviationSearch,
  parseAviationSearch,
  stripSearchToken,
} from '../utils/aviationSearch'
import {
  ACCOUNT_SCOPED_STORAGE_KEYS,
  DEVICE_GLOBAL_STORAGE_KEYS,
  getScopedItem,
  migrateAllGlobalKeysToScoped,
  setScopedItem,
  tryLocalStorageSetItem,
} from '../utils/userScopedStorage'
import {
  initIndexedDB,
  saveEntryToIndexedDB,
  saveSyncedEntryToIndexedDB,
  updateEntryInIndexedDB,
  deleteEntryFromIndexedDB,
  getEntryFromIndexedDB,
  getAllIDBLogEntriesForUser,
  getSyncQueue,
  removeQueuedOperationsForEntry,
  migrateLegacyLocalData,
  getLastSuccessfulRemoteSyncAt,
  setLastSuccessfulRemoteSyncAt,
  getRemoteSyncWatermark,
  setRemoteSyncWatermark,
} from '../utils/indexedDB'
import { mergeRemoteLogEntries } from '../../shared/logEntryMerge'
import {
  applyTombstoneDeletions,
  computeRemoteSyncWatermark,
  DELTA_FALLBACK_THRESHOLD,
  mergeWatermarks,
  type LogEntryDeletionTombstone,
} from '../../shared/logEntrySync'
import {
  fetchDeltaDeletions,
  fetchDeltaLogEntries,
  insertLogEntryTombstone,
} from '../utils/logEntryInboundSync'

// Browser check (must be defined early for watchers with immediate: true)
const isBrowser = typeof window !== 'undefined'

// Authentication setup
const { user, isAuthenticated, isLoading: authLoading, signOut: authSignOut, session } = useAuth()

// Account settings state
const accountEmail = ref(user.value?.email ?? '')
const isUpdatingEmail = ref(false)
const emailErrorMessage = ref<string | null>(null)
const emailSuccessMessage = ref<string | null>(null)

const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const isUpdatingPassword = ref(false)
const passwordErrorMessage = ref<string | null>(null)
const passwordSuccessMessage = ref<string | null>(null)
const fcvImportMessage = ref<string | null>(null)

const validateEmailFormat = (email: string) => {
  return /\S+@\S+\.\S+/.test(email)
}

const handleUpdateEmail = async () => {
  emailErrorMessage.value = null
  emailSuccessMessage.value = null

  const trimmed = accountEmail.value.trim()

  if (!currentPassword.value) {
    emailErrorMessage.value = 'Please enter your current password.'
    return
  }

  if (!trimmed) {
    emailErrorMessage.value = 'Please enter an email address.'
    return
  }

  if (!validateEmailFormat(trimmed)) {
    emailErrorMessage.value = 'Please enter a valid email address.'
    return
  }

  if (user.value?.email && user.value.email === trimmed) {
    emailErrorMessage.value = 'That is already your current email.'
    return
  }

  isUpdatingEmail.value = true

  try {
    if (user.value?.email) {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.value.email,
        password: currentPassword.value
      })

      if (reauthError) {
        const message = reauthError.message || 'Unable to verify current password.'
        const lower = message.toLowerCase()
        if (lower.includes('invalid login credentials')) {
          emailErrorMessage.value = 'Current password is incorrect.'
        } else if (lower.includes('session') || lower.includes('reauth')) {
          emailErrorMessage.value = 'Your session has expired. Please sign out and sign back in, then try again.'
        } else {
          emailErrorMessage.value = message
        }
        return
      }
    }

    const { data, error } = await supabase.auth.updateUser({ email: trimmed })

    if (error) {
      const message = error.message || 'Unable to update email.'
      const lower = message.toLowerCase()

      if (lower.includes('reauth') || lower.includes('re-auth') || lower.includes('session')) {
        emailErrorMessage.value = 'Your session has expired. Please sign out and sign back in, then try again.'
      } else if (lower.includes('invalid email')) {
        emailErrorMessage.value = 'Please enter a valid email address.'
      } else if (lower.includes('error sending email change email')) {
        emailErrorMessage.value =
          'We could not send the email change confirmation. Please try again in a moment or contact support if this continues.'
      } else {
        emailErrorMessage.value = message
      }

      return
    }

    if (data?.user) {
      user.value = data.user
    }

    emailSuccessMessage.value =
      'Email updated. If required by your provider, a verification email has been sent.'
    currentPassword.value = ''
    accountEmail.value = ''
  } catch (err: any) {
    const message = err?.message || 'Unable to update email. Please try again.'
    emailErrorMessage.value = message
  } finally {
    isUpdatingEmail.value = false
  }
}

const handleUpdatePassword = async () => {
  passwordErrorMessage.value = null
  passwordSuccessMessage.value = null

  if (!currentPassword.value) {
    passwordErrorMessage.value = 'Please enter your current password.'
    return
  }

  if (!newPassword.value) {
    passwordErrorMessage.value = 'Please enter a new password.'
    return
  }

  if (newPassword.value.length < MIN_PASSWORD_LENGTH) {
    passwordErrorMessage.value = `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    return
  }

  if (newPassword.value !== confirmNewPassword.value) {
    passwordErrorMessage.value = 'New password and confirmation do not match.'
    return
  }

  if (!user.value?.email) {
    passwordErrorMessage.value = 'You must be signed in to change your password.'
    return
  }

  isUpdatingPassword.value = true

  try {
    // Re-authenticate with current password to confirm identity
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.value.email,
      password: currentPassword.value
    })

    if (reauthError) {
      const message = reauthError.message || 'Unable to verify current password.'
      const lower = message.toLowerCase()

      if (lower.includes('invalid login credentials')) {
        passwordErrorMessage.value = 'Current password is incorrect.'
      } else if (lower.includes('session') || lower.includes('reauth')) {
        passwordErrorMessage.value =
          'Your session has expired. Please sign out and sign back in, then try again.'
      } else {
        passwordErrorMessage.value = message
      }

      return
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword.value
    })

    if (error) {
      const message = error.message || 'Unable to update password.'
      const lower = message.toLowerCase()

      if (lower.includes('weak password') || lower.includes('password should')) {
        passwordErrorMessage.value =
          'Please choose a stronger password (at least 8 characters and hard to guess).'
      } else if (lower.includes('session') || lower.includes('reauth')) {
        passwordErrorMessage.value =
          'Your session has expired. Please sign out and sign back in, then try again.'
      } else {
        passwordErrorMessage.value = message
      }

      return
    }

    if (data?.user) {
      user.value = data.user
    }

    passwordSuccessMessage.value = 'Password updated successfully.'
    currentPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
  } catch (err: any) {
    const message = err?.message || 'Unable to update password. Please try again.'
    passwordErrorMessage.value = message
  } finally {
    isUpdatingPassword.value = false
  }
}
const { validateEntry: validateEntryIntegrity } = useDataIntegrity()
const { validateEntry: validateFlightTimeEntry, validationErrors, validationWarnings, hasErrors, hasWarnings, clearValidation } = useValidation()

// Offline support
const { isOnline, connectivityReady, isSyncing, syncProgress, updateSyncProgress, checkOnlineStatus } = useOffline()
const { showToast } = useToast()
const {
  fetchSignaturesForEntries,
  signLogEntry,
  guestSignLogEntry,
  getDrawnSignatureDisplayUrl,
  markSignaturePending,
  confirmEntryPendingInCloud,
  signaturesByEntryId,
  isEntrySigned,
  isLoading: isFlightSigningLoading,
} = useFlightSigning()
const {
  creatingSession: guestQrCreating,
  sessionError: guestQrError,
  mobileUrl: guestQrMobileUrl,
  expiresAt: guestQrExpiresAt,
  qrDataUrl: guestQrDataUrl,
  completed: guestQrCompleted,
  showModal: guestQrShowModal,
  isSessionActive: guestQrSessionActive,
  createSession: createGuestSignQrSession,
  closeModal: closeGuestSignQrModal,
  copyMobileUrl: copyGuestSignQrUrl,
  reset: resetGuestSignQr,
  entryId: guestQrEntryId,
} = useGuestSignCompanion()
const { instructors: rosterInstructors, fetchInstructors } = useRoster()
const { queueLength, isProcessing, syncError, addToQueue, processQueue, startBackgroundSync, stopBackgroundSync, retryFailed, reconcileSyncQueue, setActiveUserId, refreshQueueLength } = useSyncQueue()

function getStorageUserId(): string | undefined {
  return user.value?.id
}

function readUserScopedLocal(baseKey: string, allowGlobalFallback = false): string | null {
  const userId = getStorageUserId()
  if (userId) {
    const scoped = getScopedItem(baseKey, userId)
    if (scoped != null) return scoped
  }
  if (allowGlobalFallback && isBrowser) {
    return window.localStorage.getItem(baseKey)
  }
  return null
}

function writeUserScopedLocal(baseKey: string, value: string): void {
  const userId = getStorageUserId()
  if (userId) {
    setScopedItem(baseKey, userId, value)
    return
  }
  if (isBrowser) {
    tryLocalStorageSetItem(baseKey, value)
  }
}

// Currency tracking
const {
  passengerCurrency,
  nightCurrency,
  instrumentCurrency,
  annualRequirements,
  isLoading: isLoadingCurrency,
  error: currencyError,
  calculateAllCurrency
} = useCurrency()

// Computed properties for offline UI
const syncStatusIcon = computed(() => {
  if (!connectivityReady.value) return 'ri:loader-4-line'
  if (!isOnline.value) return 'ri:wifi-off-line'
  if (isSyncing.value) return 'ri:loader-4-line'
  return 'ri:wifi-line'
})

const syncStatusText = computed(() => {
  if (!connectivityReady.value) return 'Checking…'
  if (!isOnline.value) return 'Offline'
  if (isSyncing.value) return 'Syncing'
  return 'Online'
})

const syncStatusTitle = computed(() => {
  if (!connectivityReady.value) return 'Checking connectivity…'
  if (!isOnline.value) return 'Offline'
  if (isSyncing.value) return 'Syncing...'
  return 'Online'
})

const showAuthModal = ref(false)
const {
  latestUpdate,
  showLatestBanner,
  dismissLatest,
  restoreLatestBanner,
} = useProductUpdates()
function openSettings(tab?: SettingsTabId) {
  if (isIos.value && isCatalogDrawerOpen.value) {
    closeCatalogDrawer()
  }
  refreshPilotProfileStatsCache()
  settingsStack.value = tab ? ['root', tab] : ['root']
  showSettingsModal.value = true
}

function openSettingsUpdates() {
  openSettings('updates')
}

function pushSettingsFrame(frame: SettingsStackFrame) {
  settingsStack.value = [...settingsStack.value, frame]
}

function popSettingsFrame() {
  if (settingsStack.value.length > 1) {
    settingsStack.value = settingsStack.value.slice(0, -1)
  }
}

function closeSettings() {
  showSettingsModal.value = false
  settingsStack.value = ['root']
}
const isMigrating = ref(false)
const migrationProgress = ref({ step: '', current: 0, total: 0 })
const isDashboardRefreshing = ref(false)
const isLoadEntriesRunning = ref(false)
const isBulkLoadInProgress = ref(false)
let loadEntriesInFlight: Promise<number> | null = null

type IosSyncStatus = 'idle' | 'loading' | 'success' | 'error'
const iosSyncStatus = ref<IosSyncStatus>('idle')
const iosSyncMessage = ref('')
const iosSyncBannerVisible = ref(false)
let iosSyncSuccessTimer: ReturnType<typeof setTimeout> | null = null

const ENTRIES_PAGE_SIZE = 100
const CACHE_FRESH_MS = 5 * 60 * 1000
const LOG_ENTRIES_SIDE_EFFECT_DEBOUNCE_MS = 400
const IOS_CATALOG_DEBOUNCE_MS = 400
const SEARCH_DEBOUNCE_MS = 300

type InboundSyncMode = 'auto' | 'delta' | 'full'

interface LoadEntriesOptions {
  mode?: InboundSyncMode
  /** Skip inbound sync when a recent sync completed (resume/reconnect). */
  skipIfFresh?: boolean
  /** Apply IndexedDB (and local prefs already loaded) without waiting on inbound sync. */
  localOnly?: boolean
}

let logEntriesSideEffectTimer: ReturnType<typeof setTimeout> | null = null
let iosCatalogDebounceTimer: ReturnType<typeof setTimeout> | null = null
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const visibleEntryCount = ref(ENTRIES_PAGE_SIZE)
const logEntries = ref<LogEntry[]>([])
const supersededIdSet = computed(() => buildSupersededIdSet(logEntries.value))

const aircraftTailIndex = computed(() => buildAircraftTailIndex(logEntries.value))

const tailCatalogFamilyMap = computed(() => buildTailCatalogFamilyMap(logEntries.value))
const tailCatalogFamilyByTail = computed(() => Object.fromEntries(tailCatalogFamilyMap.value))
const iosTailCatalogFamilyMap = shallowRef<Map<string, string>>(new Map())

function refreshIosTailCatalogFamilyMap(): void {
  if (!isIos.value) return
  iosTailCatalogFamilyMap.value = buildTailCatalogFamilyMap(logEntries.value)
}

function effectiveFamilyKeyForEntry(entry: {
  aircraftMakeModel?: string
  registration?: string
}): string {
  return effectiveCatalogFamilyKey(entry, tailCatalogFamilyMap.value)
}

// Logout function
const router = useRouter()

/** Header fetch CTA when FLICA is connected (see `/api/flica/status`). */
const dashboardFcvConnected = ref(false)
const showFcvFetchPanel = ref(false)

async function refreshDashboardFcvStatus(): Promise<void> {
  if (!isAuthenticated.value) {
    dashboardFcvConnected.value = false
    return
  }
  const token = session.value?.access_token
  if (!token) {
    dashboardFcvConnected.value = false
    return
  }
  try {
    const data = await apiFetch<{ connected: boolean }>('/api/flica/status', {
      headers: { Authorization: `Bearer ${token}` },
      query: { airlineCode: 'RJET' },
    })
    dashboardFcvConnected.value = Boolean(data?.connected)
  } catch {
    dashboardFcvConnected.value = false
  }
}

const { isIos } = useCapacitorPlatform()

const handleLogout = async () => {
  stopBackgroundSync()
  setActiveUserId(null)
  await authSignOut()
  logEntries.value = []
  closeSettings()
  dashboardFcvConnected.value = false
  showFcvFetchPanel.value = false
  if (isIos.value) {
    showAuthModal.value = true
    router.push('/dashboard')
  } else {
    showAuthModal.value = false
    router.push('/?from=app')
  }
}

/** After server-side account deletion — local auth already cleared. */
const handleAccountDeleted = () => {
  stopBackgroundSync()
  setActiveUserId(null)
  logEntries.value = []
  closeSettings()
  dashboardFcvConnected.value = false
  showFcvFetchPanel.value = false
  if (isIos.value) {
    showAuthModal.value = true
    router.push('/dashboard')
  } else {
    showAuthModal.value = false
    router.push('/?from=app')
  }
}

async function onUserSessionReady(userId: string): Promise<void> {
  stopBackgroundSync()
  setActiveUserId(userId)
  migrateAllGlobalKeysToScoped(userId, false)
  await migrateLegacyLocalData(userId)

  if (!hasMigrationCompleted(userId)) {
    isMigrating.value = true
    try {
      const result = await migrateLocalStorageToSupabase(
        userId,
        (step, current, total) => {
          migrationProgress.value = { step, current, total }
        }
      )

      if (result.success) {
        console.log('Migration completed:', result)
      } else {
        console.error('Migration failed:', result.error)
      }
    } catch (error) {
      console.error('Migration error:', error)
    } finally {
      isMigrating.value = false
    }
  }

  loadClockPrefs()
  loadPilotProfilePrefs()
  loadSelectedTotalsMetrics()
  loadShowCurrencyChips()
  loadColumnConfig()
  loadActiveLogbook()

  try {
    await loadEntries({ localOnly: true })
  } finally {
    void markAppReady()
  }

  maybeAutoOpenEntryFormForEmptyLogbook()
  startBackgroundSync()

  void loadEntries({ mode: 'auto' })
  void loadDeferredUserData()
}

async function loadDeferredUserData(): Promise<void> {
  try {
    await fetchEntityTags()
    await fetchUserTagPresets()
    await loadPilotProfileFromSupabase()
    await loadCrewProfiles()
  } catch (error) {
    console.error('[loadDeferredUserData]', error)
  }
}

// Watch for user changes (login, logout, account switch)
watch(
  () => user.value?.id,
  async (newUserId, oldUserId) => {
    if (newUserId) {
      if (oldUserId && oldUserId !== newUserId) {
        logEntries.value = []
        crewProfiles.value = {}
      }
      await onUserSessionReady(newUserId)
    } else {
      // At altitude the SDK may wipe tokens; keep local logbook if we still have
      // an offline identity snapshot (useAuth normally retains session — this is a safety net).
      const { readOfflineSessionSnapshot } = await import('~/utils/cachedSupabaseSession')
      const offlineSnapshot = readOfflineSessionSnapshot()
      const cloudOffline =
        !connectivityReady.value ||
        !isOnline.value ||
        (typeof navigator !== 'undefined' && navigator.onLine === false)
      if (cloudOffline && offlineSnapshot?.user?.id) {
        console.warn('[dashboard] Ignoring null auth while offline; keeping local session UX')
        return
      }

      stopBackgroundSync()
      setActiveUserId(null)
      logEntries.value = []
      showAuthModal.value = true
      dashboardFcvConnected.value = false
      showFcvFetchPanel.value = false
    }
  },
  { immediate: true }
)

watch(
  [isAuthenticated, () => session.value?.access_token],
  ([authed, token], [, prevToken]) => {
    if (authed && token) {
      void refreshDashboardFcvStatus()
    }
    // Token refresh only drains the outbound queue — inbound delta is not needed.
    if (authed && token && prevToken && token !== prevToken && user.value?.id && !isMigrating.value) {
      void reconcileSyncQueue(user.value.id)
      void processQueue({ silent: true })
    }
  },
  { immediate: true }
)

watch(isMigrating, (migrating, wasMigrating) => {
  if (wasMigrating && !migrating && isAuthenticated.value && user.value?.id) {
    void loadEntries({ mode: 'full' })
  }
})

watch(dashboardFcvConnected, (c) => {
  if (!c) {
    showFcvFetchPanel.value = false
  }
})

// Show auth modal if not authenticated after loading
watch(authLoading, (loading) => {
  if (!loading && !isAuthenticated.value) {
    showAuthModal.value = true
    void markAppReady()
  }
}, { immediate: true })

// Initialize IndexedDB and scroll handlers on mount
onMounted(async () => {
  if (!isBrowser) return

  loadSimDeviceCatalogFromStorage()
  
  try {
    await initIndexedDB()
    console.log('[App] IndexedDB initialized')

    await nextTick()
    const scrollTarget = isIos.value ? rootScrollContainerRef.value : window
    if (scrollTarget) {
      scrollTarget.addEventListener('scroll', handleScroll, { passive: true })
      handleScroll()
    }

    document.addEventListener('visibilitychange', handleAppResume)
  } catch (error) {
    console.error('[App] Failed to initialize IndexedDB:', error)
  }
})

function handleAppResume(): void {
  if (document.visibilityState !== 'visible') return
  if (!isAuthenticated.value || !user.value || isProcessing.value) return
  if (!isOnline.value) return
  void processQueue({ silent: true })
  if (!isMigrating.value) {
    void loadEntries({ mode: 'delta', skipIfFresh: true })
  }
}

// Cleanup scroll event listener on unmount
onUnmounted(() => {
  teardownEntriesLoadMoreObserver()
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  if (isBrowser) {
    const scrollTarget = isIos.value ? rootScrollContainerRef.value : window
    if (scrollTarget) {
      scrollTarget.removeEventListener('scroll', handleScroll)
    }
    document.removeEventListener('visibilitychange', handleAppResume)
    if (isIos.value) {
      setIosOverlayScrollLock(false)
      window.removeEventListener('keydown', handleIosOverlayEscape)
      document.documentElement.style.overflow = ''
      document.documentElement.style.overflowX = ''
      document.body.style.overflow = ''
      document.body.style.overflowX = ''
      if (iosSyncSuccessTimer) {
        clearTimeout(iosSyncSuccessTimer)
        iosSyncSuccessTimer = null
      }
    }
  }
})

// Reconnect: drain outbound queue and reload from Supabase when back online
watch(isOnline, (online, wasOnline) => {
  if (online && !wasOnline && isAuthenticated.value && user.value) {
    void reconcileSyncQueue(user.value.id)
    void processQueue({ silent: true })
    if (!isMigrating.value) {
      void loadEntries({ mode: 'delta' })
    }
  }
})

// Catalog entity tags (family, aircraft, person) - loaded from Supabase when authenticated
type CatalogEntityTagRow = { id: string; user_id: string; entity_type: 'family' | 'aircraft' | 'person'; entity_id: string; tag: string }
const entityTagsList = ref<CatalogEntityTagRow[]>([])

const catalogPersonNames = computed(() =>
  listCatalogPersonDisplayNames(
    entityTagsList.value.filter((r) => r.entity_type === 'person')
  )
)

async function fetchEntityTags(): Promise<void> {
  if (!isAuthenticated.value || !user.value) {
    entityTagsList.value = []
    return
  }
  try {
    const { data, error } = await (supabase
      .from('catalog_entity_tags') as any)
      .select('id, user_id, entity_type, entity_id, tag')
      .eq('user_id', user.value.id)
    if (error) {
      console.error('[fetchEntityTags]', error)
      return
    }
    entityTagsList.value = (data || []) as CatalogEntityTagRow[]
  } catch (e) {
    console.error('[fetchEntityTags]', e)
  }
}

// User tag presets (saved custom tag labels so they appear as options next time)
const userTagPresets = ref<string[]>([])

async function fetchUserTagPresets(): Promise<void> {
  if (!isAuthenticated.value || !user.value) {
    userTagPresets.value = []
    return
  }
  try {
    const { data, error } = await (supabase.from('user_tag_presets') as any)
      .select('tag')
      .eq('user_id', user.value.id)
    if (error) {
      console.error('[fetchUserTagPresets]', error)
      return
    }
    userTagPresets.value = (data || []).map((r: { tag: string }) => r.tag).sort((a: string, b: string) => a.localeCompare(b))
  } catch (e) {
    console.error('[fetchUserTagPresets]', e)
  }
}

/** All tag options to show: fixed (Checkride, Flight Review, IPC) + saved presets. */
const allTagOptions = computed(() => {
  const fixed = [...fixedTagOptions]
  const presets = userTagPresets.value.filter((p) => !fixed.includes(p as typeof fixedTagOptions[number]))
  return [...fixed, ...presets]
})

/** Presets that are in use (on at least one entity or log entry). Shown first in Add tag. */
const presetsInUse = computed(() => {
  const fixed = [...fixedTagOptions]
  const presetList = userTagPresets.value.filter((p) => !fixed.includes(p as typeof fixedTagOptions[number]))
  const used = new Set<string>()
  entityTagsList.value.forEach((r) => used.add(r.tag))
  logEntries.value.forEach((entry) => (entry.tags || []).forEach((t) => used.add(t)))
  return presetList.filter((p) => used.has(p))
})

/** Presets not used anywhere (e.g. misspelled). Shown with option to remove from presets. */
const presetsUnused = computed(() => {
  const inUse = new Set(presetsInUse.value)
  const fixed = [...fixedTagOptions]
  return userTagPresets.value.filter((p) => !fixed.includes(p as typeof fixedTagOptions[number]) && !inUse.has(p))
})

async function addTagPreset(tag: string): Promise<void> {
  const t = (tag || '').trim()
  if (!t) return
  if (fixedTagOptions.includes(t as typeof fixedTagOptions[number])) return
  if (!isAuthenticated.value || !user.value) return
  try {
    const { error } = await (supabase.from('user_tag_presets') as any).insert({
      user_id: user.value.id,
      tag: t
    })
    if (error) {
      if (error.code === '23505') return // unique, already saved
      console.error('[addTagPreset]', error)
      return
    }
    await fetchUserTagPresets()
  } catch (e) {
    console.error('[addTagPreset]', e)
  }
}

async function removeTagPreset(tag: string): Promise<void> {
  const t = (tag || '').trim()
  if (!t) return
  if (!isAuthenticated.value || !user.value) return
  try {
    await (supabase.from('user_tag_presets') as any)
      .delete()
      .eq('user_id', user.value.id)
      .eq('tag', t)
    await fetchUserTagPresets()
  } catch (e) {
    console.error('[removeTagPreset]', e)
  }
}

type EntityType = 'family' | 'aircraft' | 'person'

async function addEntityTag(entityType: EntityType, entityId: string, tag: string): Promise<void> {
  const t = (tag || '').trim()
  if (!t) return
  if (!isAuthenticated.value || !user.value) return
  const eid = entityType === 'family' ? entityId.trim() : entityType === 'person' ? entityId.trim().toLowerCase() : entityId.trim().toUpperCase()
  if (!eid) return
  try {
    const { error } = await (supabase.from('catalog_entity_tags') as any).insert({
      user_id: user.value.id,
      entity_type: entityType,
      entity_id: eid,
      tag: t
    })
    if (error) {
      if (error.code === '23505') {
        // Tag already on entity; still save as preset and refresh UI
        await fetchEntityTags()
        await addTagPreset(t)
        return
      }
      console.error('[addEntityTag]', error)
      throw error
    }
    const entryCount = await backfillEntityTagToEntries(entityType, eid, t)
    if (entityType === 'family') editFamilyLastTagEntryCount.value = entryCount
    if (entityType === 'person') crewModalLastTagEntryCount.value = entryCount
    await fetchEntityTags()
    await addTagPreset(t)
  } catch (e) {
    console.error('[addEntityTag]', e)
    throw e
  }
}

/** Remove a tag from all log entries that match this entity (reverse of backfill). */
async function removeEntityTagFromEntries(entityType: EntityType, entityId: string, tag: string): Promise<void> {
  const matches = logEntries.value.filter((entry) => {
    if (entityType === 'family') {
      return effectiveFamilyKeyForEntry(entry) === entityId
    }
    if (entityType === 'aircraft') {
      return (entry.registration || '').trim().toUpperCase() === entityId
    }
    // person (case-insensitive; entityId is already lowercase when called from removeEntityTag)
    return (entry.trainingElements || '').trim().toLowerCase() === entityId.toLowerCase()
  })
  if (matches.length === 0) return
  const t = (tag || '').trim()
  if (!t) return
  for (const entry of matches) {
    const tags = entry.tags || []
    const next = tags.filter((x) => x !== t)
    if (next.length === tags.length) continue
    entry.tags = next
  }
  if (!isAuthenticated.value || !user.value) return
  for (const entry of matches) {
    const tags = entry.tags || []
    try {
      await (supabase.from('log_entries') as any)
        .update({ tags })
        .eq('id', entry.id)
        .eq('user_id', user.value.id)
    } catch (e) {
      console.error('[removeEntityTagFromEntries]', entry.id, e)
    }
  }
}

async function removeEntityTag(entityType: EntityType, entityId: string, tag: string): Promise<void> {
  const t = (tag || '').trim()
  if (!t) return
  if (!isAuthenticated.value || !user.value) return
  const eid = entityType === 'family' ? entityId.trim() : entityType === 'person' ? entityId.trim().toLowerCase() : entityId.trim().toUpperCase()
  if (!eid) return
  try {
    const entityIdsToRemove = [eid]
    for (const id of entityIdsToRemove) {
      await (supabase.from('catalog_entity_tags') as any)
        .delete()
        .eq('user_id', user.value.id)
        .eq('entity_type', entityType)
        .eq('entity_id', id)
        .eq('tag', t)
    }
    await removeEntityTagFromEntries(entityType, eid, t)
    await removeTagPreset(t)
    await fetchEntityTags()
  } catch (e) {
    console.error('[removeEntityTag]', e)
    throw e
  }
}

async function backfillEntityTagToEntries(entityType: EntityType, entityId: string, tag: string): Promise<number> {
  const matches = logEntries.value.filter((entry) => {
    if (entityType === 'family') {
      return effectiveFamilyKeyForEntry(entry) === entityId
    }
    if (entityType === 'aircraft') {
      return (entry.registration || '').trim().toUpperCase() === entityId
    }
    // person (case-insensitive so backfill finds all matching entries)
    return (entry.trainingElements || '').trim().toLowerCase() === entityId.toLowerCase()
  })
  if (matches.length === 0) return 0
  const tagSet = new Set<string>([tag])
  for (const entry of matches) {
    const existing = entry.tags || []
    const merged = [...new Set([...existing, ...tagSet])]
    entry.tags = merged
  }
  if (!isAuthenticated.value || !user.value) return matches.length
  for (const entry of matches) {
    try {
      await (supabase.from('log_entries') as any)
        .update({ tags: entry.tags })
        .eq('id', entry.id)
        .eq('user_id', user.value.id)
    } catch (e) {
      console.error('[backfillEntityTagToEntries] update entry', entry.id, e)
    }
  }
  return matches.length
}

function normalizeEntityIdForLookup(entityType: 'family' | 'aircraft' | 'person', entityId: string): string {
  const s = (entityId || '').trim()
  if (entityType === 'family') return s
  if (entityType === 'aircraft') return s.toUpperCase()
  if (entityType === 'person') return s.toLowerCase()
  return s
}

function getEntityTags(entityType: 'family' | 'aircraft' | 'person', entityId: string): string[] {
  const key = normalizeEntityIdForLookup(entityType, entityId)
  if (!key) return []
  return entityTagsList.value
    .filter((r) => r.entity_type === entityType && normalizeEntityIdForLookup(entityType, r.entity_id) === key)
    .map((r) => r.tag)
}

/** Consolidation groups for rename: same logical family + typos (e.g. FMB-170). Used for rename and tag migration. */
const FAMILY_RENAME_GROUPS: string[][] = [
  ['EMB-170', 'ERJ-170', 'FMB-170'],
  ['EMB-175', 'ERJ-175'],
  ['EMB-190', 'ERJ-190'],
]

function getFamilyRenameGroup(familyName: string): string[] {
  const key = (familyName || '').trim().toUpperCase()
  if (!key) return []
  for (const group of FAMILY_RENAME_GROUPS) {
    if (group.some((s) => s.toUpperCase() === key)) return group
  }
  return [familyName.trim()]
}

function getLogEntriesInFamily(canonicalKey: string): LogEntry[] {
  const key = (canonicalKey || '').trim()
  if (!key) return []
  return logEntries.value.filter((entry) => effectiveFamilyKeyForEntry(entry) === key)
}

/** Merge entity-level tags (aircraft, family, person) into entry.tags for autofill. */
function mergeEntityTagsIntoEntry(entry: { tags?: string[]; registration?: string; aircraftMakeModel?: string; trainingElements?: string }): void {
  if (!entry) return
  const reg = (entry.registration || '').trim().toUpperCase()
  const family = effectiveFamilyKeyForEntry(entry)
  const person = (entry.trainingElements || '').trim()
  const aircraftTags = getEntityTags('aircraft', reg)
  const familyTags = family ? getEntityTags('family', family) : []
  const personTags = person ? getEntityTags('person', person) : []
  const toAdd = [...aircraftTags, ...familyTags, ...personTags]
  if (toAdd.length === 0) return
  const existing = entry.tags || []
  entry.tags = [...new Set([...existing, ...toAdd])]
}

const roleOptions = ['PIC', 'SIC', 'Dual Received', 'Solo', 'Safety Pilot', 'Examiner', 'Instructor'] as const

/** Display label for role (e.g. "Student" for "Dual Received") */
function roleDisplayLabel(role: string): string {
  return role === 'Dual Received' ? 'Student' : role
}
const oooiFields: (keyof OOOITimes)[] = [...OOOI_FIELD_ORDER]
const oooiFieldLabels: Record<keyof OOOITimes, string> = {
  out: 'Out',
  off: 'Off',
  on: 'On',
  in: 'In',
  isZulu: 'Zulu'
}

const entryTagOptions = ['Checkride', 'Flight Review', 'IPC'] as const

const conditionOptions = [
  { value: 'nightVfr', label: 'Night' },
  { value: 'ifr', label: 'IFR' },
  { value: 'simInstrument', label: 'Simulated Instrument' },
  { value: 'actualInstrument', label: 'Actual Instrument' },
  { value: 'crossCountry', label: 'Cross-Country' }
] as const

const nvgConditionOption = { value: 'nvg', label: 'NVG' } as const

const flightTimeFields: readonly { key: FlightTimeKey; label: string }[] = [
  { key: 'total', label: 'Total Time *' },
  { key: 'pic', label: 'Pilot in Command' },
  { key: 'sic', label: 'Second in Command' },
  { key: 'dual', label: 'Dual Received' },
  { key: 'solo', label: 'Solo' },
  { key: 'night', label: 'Night' },
  { key: 'nvg', label: 'NVG (Night Vision Goggle)' },
  { key: 'actualInstrument', label: 'Actual Instrument' },
  { key: 'dualGiven', label: 'Dual Given' },
  { key: 'crossCountry', label: 'Cross-Country' },
  { key: 'simulatedInstrument', label: 'Simulator / Training Device' },
  { key: 'ffs', label: 'FFS (Sim) hrs' },
  { key: 'ftd', label: 'FTD hrs' },
  { key: 'atd', label: 'ATD hrs' }
] as const

const simTimeFields = [
  { key: 'ffs' as const, label: 'FFS' },
  { key: 'ftd' as const, label: 'FTD' },
  { key: 'atd' as const, label: 'ATD' }
] as const

const mainTimeShortLabels: Record<string, string> = {
  total: 'Total Time', pic: 'PIC', sic: 'SIC', dual: 'Dual R', solo: 'Solo',
  night: 'Night', nvg: 'NVG', actualInstrument: 'Actual', dualGiven: 'Dual G', crossCountry: 'XC', simulatedInstrument: 'Hood'
}

// Category/Class dropdown options (Option A: aircraft row + Sim row)
const categoryClassAircraftOptions = ['ASEL', 'AMEL', 'ASES', 'AMES', 'HELI', 'GYRO', 'GLID', 'BAL', 'AIRS', 'PL', 'WSC-L', 'WSC-S'] as const
const categoryClassSimOptions = ['FFS', 'FTD', 'ATD'] as const

const performanceFields: readonly { key: PerformanceKey; label: string }[] = [
  { key: 'dayLandings', label: 'Day Landings' },
  { key: 'nightLandings', label: 'Night Landings' },
  { key: 'holdingProcedures', label: 'Holding Procedures' }
] as const

const approachTypeOptions = ['ILS', 'LOC', 'VOR', 'GPS', 'RNAV', 'LPV', 'LNAV', 'LNAV/VNAV', 'SDF', 'ASR', 'Visual', 'Other'] as const

const fixedTagOptions = ['Checkride', 'Flight Review', 'IPC'] as const

const PILOT_PROFILE_STORAGE_KEY = ACCOUNT_SCOPED_STORAGE_KEYS.PILOT_PROFILE
const CREW_PROFILES_STORAGE_KEY = ACCOUNT_SCOPED_STORAGE_KEYS.CREW_PROFILES

// Crew/Instructor profile stored locally
interface CrewProfile {
  name: string
  notes: string
  lastUpdated: string
}

interface PilotProfilePrefs {
  name: string
  callsign: string
  homeBase: string
  certificates: string
  flightGoals: string
  notes: string
  /** Show military logbook fields (e.g. NVG time + condition) */
  enableMilitaryFields: boolean
  role: 'STUDENT' | 'INSTRUCTOR' | 'DUAL'
  cfiNumber: string
  cfiExpiration: string
  // 8710 Form fields
  dateOfBirth: string
  placeOfBirth: string
  residentialAddress: string
  residentialCity: string
  residentialState: string
  residentialZip: string
  mailingAddress: string
  mailingCity: string
  mailingState: string
  mailingZip: string
  certificateNumber: string
}

interface PilotProfileStats {
  totalFlights: number
  totalHours: number
  picHours: number
  nightHours: number
  instrumentHours: number
  airportsVisited: number
  avgDuration: number
  favoriteAircraft: string | null
  favoriteRoute: string | null
  conditions: { label: string; count: number }[]
  lastFlight: LogEntry | null
  dayLandings: number
  nightLandings: number
  longestLeg: { route: string; duration: number; date: string } | null
}

const pilotProfileDefaults: PilotProfilePrefs = {
  name: '',
  callsign: '',
  homeBase: '',
  certificates: '',
  flightGoals: '',
  notes: '',
  enableMilitaryFields: false,
  role: 'STUDENT',
  cfiNumber: '',
  cfiExpiration: '',
  // 8710 Form fields
  dateOfBirth: '',
  placeOfBirth: '',
  residentialAddress: '',
  residentialCity: '',
  residentialState: '',
  residentialZip: '',
  mailingAddress: '',
  mailingCity: '',
  mailingState: '',
  mailingZip: '',
  certificateNumber: ''
}

// Available metrics for Totals Overview customization (same categories for Flight and Sim)
type TotalsMetricKey = 
  | 'totalTime'
  | 'soloTime'
  | 'picTime'
  | 'nightTime'
  | 'nvgTime'
  | 'instrumentTime'
  | 'crossCountry'
  | 'dualGiven'
  | 'sic'
  | 'dualReceived'
  | 'mostUsedAircraft'
  | 'ffs'
  | 'ftd'
  | 'atd'

type TotalsMetric = { key: TotalsMetricKey; label: string; cardLabel?: string }

const baseTotalsMetrics: readonly TotalsMetric[] = [
  { key: 'totalTime', label: 'Total Time (hrs)' },
  { key: 'soloTime', label: 'Solo Time (hrs)' },
  { key: 'picTime', label: 'PIC Time (hrs)' },
  { key: 'nightTime', label: 'Night Time (hrs)' },
  { key: 'instrumentTime', label: 'Instrument Time (hrs)', cardLabel: 'Instrument (hrs)' },
  { key: 'crossCountry', label: 'Cross Country (hrs)' },
  { key: 'dualGiven', label: 'Dual Given (hrs)' },
  { key: 'sic', label: 'SIC (hrs)' },
  { key: 'dualReceived', label: 'Dual Received (hrs)' },
  { key: 'mostUsedAircraft', label: 'Most Used Aircraft' },
  { key: 'ffs', label: 'FFS (hrs)' },
  { key: 'ftd', label: 'FTD (hrs)' },
  { key: 'atd', label: 'ATD (hrs)' }
] as const

// Default selected metrics (Total Time must always be first)
const defaultSelectedMetrics: TotalsMetricKey[] = [
  'totalTime',
  'soloTime',
  'picTime',
  'nightTime',
  'instrumentTime',
  'mostUsedAircraft'
]

// Selected metrics for Totals Overview (persisted in localStorage)
const selectedTotalsMetrics = ref<TotalsMetricKey[]>(defaultSelectedMetrics)

/** Preference: show currency chips under Totals Overview (default on). Null until local pref is read. */
const showCurrencyChips = ref<boolean | null>(null)

function loadShowCurrencyChips(): void {
  if (!isBrowser) return
  const saved = readUserScopedLocal(ACCOUNT_SCOPED_STORAGE_KEYS.SHOW_CURRENCY_CHIPS, true)
  if (saved === '0' || saved === 'false') showCurrencyChips.value = false
  else showCurrencyChips.value = true
}

function saveShowCurrencyChips(): void {
  if (!isBrowser) return
  writeUserScopedLocal(ACCOUNT_SCOPED_STORAGE_KEYS.SHOW_CURRENCY_CHIPS, showCurrencyChips.value ? '1' : '0')
}

function toggleShowCurrencyChips(): void {
  showCurrencyChips.value = showCurrencyChips.value !== true
  saveShowCurrencyChips()
}


// Load selected metrics from localStorage
function loadSelectedTotalsMetrics(): void {
  if (!isBrowser) return
  const saved = readUserScopedLocal(ACCOUNT_SCOPED_STORAGE_KEYS.TOTALS_METRICS, true)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as TotalsMetricKey[]
      // Validate that all keys are valid
      if (Array.isArray(parsed) && parsed.every(k => availableTotalsMetrics.value.some(m => m.key === k))) {
        // Ensure totalTime is always first
        const withoutTotal = parsed.filter(k => k !== 'totalTime')
        selectedTotalsMetrics.value = ['totalTime', ...withoutTotal]
      }
    } catch {
      selectedTotalsMetrics.value = defaultSelectedMetrics
    }
  }
}

// Save selected metrics to localStorage
function saveSelectedTotalsMetrics(): void {
  if (!isBrowser) return
  writeUserScopedLocal(ACCOUNT_SCOPED_STORAGE_KEYS.TOTALS_METRICS, JSON.stringify(selectedTotalsMetrics.value))
}

// Toggle a metric selection
function toggleTotalsMetric(key: TotalsMetricKey): void {
  const index = selectedTotalsMetrics.value.indexOf(key)
  if (index === -1) {
    // Add metric, but ensure totalTime stays first
    if (key === 'totalTime') {
      selectedTotalsMetrics.value.unshift(key)
    } else {
      selectedTotalsMetrics.value.push(key)
    }
  } else {
    // Don't allow removing totalTime
    if (key === 'totalTime') return
    selectedTotalsMetrics.value.splice(index, 1)
  }
  saveSelectedTotalsMetrics()
}

// Computed summaryFields based on user selection
const summaryFields = computed(() => {
  return selectedTotalsMetrics.value
    .map(key => availableTotalsMetrics.value.find(m => m.key === key))
    .filter((m): m is TotalsMetric => m !== undefined)
})

// Unified logbook column configuration (web table + iOS entry cards)
const {
  activePresetId,
  draggedColumnKey,
  visibleColumns: baseVisibleColumns,
  displayColumnConfig: baseDisplayColumnConfig,
  visibleDetailFields,
  showRemarksFooter,
  detailFieldCrowded,
  pickerFields,
  presets: logbookLayoutPresets,
  loadColumnConfig,
  toggleColumnVisibility,
  handleColumnDrop,
  moveColumn,
  resetColumnConfig,
  resetColumnWidths,
  applyPreset: applyLogbookLayoutPreset,
  startResize,
  stopResize,
  resizingColumn,
} = useLogbookColumnConfig()

const visibleColumns = computed(() =>
  baseVisibleColumns.value.filter(col => col.key !== 'nvg' || pilotProfile.enableMilitaryFields),
)

const displayColumnConfig = computed(() =>
  baseDisplayColumnConfig.value.filter(col => col.key !== 'nvg' || pilotProfile.enableMilitaryFields),
)

const showColumnSettings = ref(false)
const columnSettingsTriggerRef = ref<HTMLElement | null>(null)
const columnSettingsPosition = ref({ top: 0, left: 0 })
const COLUMN_SETTINGS_PANEL_WIDTH = 320

function updateColumnSettingsPosition(): void {
  nextTick(() => {
    const el = columnSettingsTriggerRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    columnSettingsPosition.value = {
      top: rect.bottom + 8,
      left: Math.max(8, rect.right - COLUMN_SETTINGS_PANEL_WIDTH),
    }
  })
}

watch(showColumnSettings, (open, _old, onCleanup) => {
  if (!open) return
  updateColumnSettingsPosition()
  const onReposition = () => updateColumnSettingsPosition()
  window.addEventListener('resize', onReposition)
  window.addEventListener('scroll', onReposition, true)
  onCleanup(() => {
    window.removeEventListener('resize', onReposition)
    window.removeEventListener('scroll', onReposition, true)
  })
})

function getColumnPadding(col: LogbookColumnConfig): string[] {
  switch (col.key) {
    case 'date':
    case 'total':
      return ['px-3', 'py-3']
    default:
      return ['px-2', 'py-3']
  }
}

function getHeaderTextAlign(col: LogbookColumnConfig): string {
  switch (col.key) {
    case 'total':
    case 'pic':
    case 'sic':
    case 'dualR':
    case 'solo':
    case 'night':
    case 'actual':
    case 'hood':
    case 'dualG':
    case 'xc':
    case 'dayLandings':
    case 'nightLandings':
    case 'approach':
      return 'text-right'
    default:
      return ''
  }
}

function getCellClasses(col: LogbookColumnConfig): string[] {
  const baseClasses = ['align-top']
  const padding = getColumnPadding(col)
  if (col.responsiveClass) {
    baseClasses.push(col.responsiveClass)
  }

  switch (col.key) {
    case 'date':
      return [...padding, ...baseClasses]
    case 'total':
      return [...padding, 'text-right', 'font-bold', 'font-mono', ...baseClasses]
    case 'identification':
      return [...padding, 'uppercase', 'font-mono', 'text-xs', 'tracking-wide', ...baseClasses]
    case 'flightNumber':
      return [...padding, 'uppercase', 'font-mono', 'text-xs', ...baseClasses]
    case 'remarks':
      return [...padding, 'text-sm', 'italic', ...baseClasses]
    case 'pic':
    case 'sic':
    case 'dualR':
    case 'solo':
    case 'night':
    case 'actual':
    case 'hood':
    case 'dualG':
    case 'xc':
    case 'dayLandings':
    case 'nightLandings':
    case 'approach':
      return [...padding, 'text-right', 'font-mono', 'text-sm', ...baseClasses]
    case 'pilots':
      return [...padding, 'text-sm', ...baseClasses]
    default:
      return [...padding, ...baseClasses]
  }
}

function getCellTextColor(col: LogbookColumnConfig): string {
  switch (col.key) {
    case 'total':
      return isDarkMode.value ? 'text-blue-400' : 'text-blue-600'
    case 'identification':
    case 'flightNumber':
      return isDarkMode.value ? 'text-gray-300' : 'text-gray-700'
    case 'remarks':
      return isDarkMode.value ? 'text-gray-400' : 'text-gray-500'
    case 'pic':
    case 'sic':
    case 'dualR':
    case 'solo':
    case 'night':
    case 'actual':
    case 'hood':
    case 'dualG':
    case 'xc':
    case 'dayLandings':
    case 'nightLandings':
    case 'approach':
    case 'pilots':
      return isDarkMode.value ? 'text-gray-300' : 'text-gray-700'
    default:
      return ''
  }
}

const tableHeaderRef = ref<HTMLElement | null>(null)
const tableContainerRef = ref<HTMLElement | null>(null)
const tableRef = ref<HTMLTableElement | null>(null)

function openLogbookLayoutPreferences(): void {
  openSettings('preferences')
}

function onLogbookLayoutDragStart(key: LogbookColumnKey): void {
  draggedColumnKey.value = key
}

const catalogSections = [
  {
    key: 'aircraft',
    label: 'Aircraft Library',
    icon: 'ri:plane-line'
  },
  {
    key: 'airports',
    label: 'Airports Visited',
    icon: 'ri:map-pin-2-line'
  },
  {
    key: 'pilots',
    label: 'Crew & Instructors',
    icon: 'ri:user-star-line'
  },
  {
    key: 'categoryClass',
    label: 'Category/Class',
    icon: 'ri:award-line'
  }
] as const satisfies readonly { key: CatalogKey; label: string; icon: string }[]

// Totals view and active logbook must be declared before createBlankEntry() / newEntry (they are used there)
type TotalsViewMode = 'flight' | 'sim'
const totalsViewMode = ref<TotalsViewMode>('flight')
const ACTIVE_LOGBOOK_KEY = ACCOUNT_SCOPED_STORAGE_KEYS.ACTIVE_LOGBOOK
type ActiveLogbook = 'flight' | 'simulator'
const activeLogbook = ref<ActiveLogbook>('flight')
function setActiveLogbook(logbook: ActiveLogbook): void {
  activeLogbook.value = logbook
  if (typeof window !== 'undefined' && window.localStorage) {
    writeUserScopedLocal(ACTIVE_LOGBOOK_KEY, logbook)
  }
  totalsViewMode.value = logbook === 'simulator' ? 'sim' : 'flight'
}
function loadActiveLogbook(): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  const saved = readUserScopedLocal(ACTIVE_LOGBOOK_KEY, true)
  if (saved === 'flight' || saved === 'simulator') {
    activeLogbook.value = saved
    totalsViewMode.value = saved === 'simulator' ? 'sim' : 'flight'
  }
}

const newEntry = reactive<EditableLogEntry>(createBlankEntry())
// Track if XC time was manually set by user (to prevent auto-overwrite)
const xcTimeManuallySet = ref<boolean>(false)
const setXcTimeManuallySet = (value: boolean) => {
  xcTimeManuallySet.value = value
}
const searchTerm = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const debouncedSearchTerm = ref('')
watch(searchTerm, (value) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    debouncedSearchTerm.value = value
    searchDebounceTimer = null
  }, SEARCH_DEBOUNCE_MS)
})

const knownSearchTails = computed(() => {
  const tails = new Set<string>()
  for (const logEntry of logEntries.value) {
    if (inferLogbookType(logEntry) !== activeLogbook.value) continue
    const raw = (logEntry.registration || '').trim().toUpperCase()
    if (raw) tails.add(raw)
    const normalized = raw.replace(/[^A-Z0-9]/g, '')
    if (normalized) tails.add(normalized)
  }
  return tails
})

const searchChips = computed(
  () => parseAviationSearch(searchTerm.value, { knownTails: knownSearchTails.value }).chips
)
const validationError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const duplicateWarning = ref<{ matches: LogEntry[] } | null>(null)
const saveAnyway = ref(false)
const validationWarning = ref<boolean>(false)
const saveAnywayValidation = ref(false)
const isSavingEntry = ref(false)
const isSavingInlineEdit = ref(false)
const isEntryFormOpen = ref(false)
const isCommercialMode = ref(false)

function toggleCommercialMode(): void {
  const next = !isCommercialMode.value
  if (next && !newEntry.oooi) {
    newEntry.oooi = createEmptyOOOI()
  }
  isCommercialMode.value = next
}

// Sticky header refs
const rootScrollContainerRef = ref<HTMLElement | null>(null)
const fcvFetchSectionRef = ref<HTMLElement | null>(null)
const showScrollToTop = ref(false)
const handleScroll = (): void => {
  if (!isBrowser) return
  const containerTop = rootScrollContainerRef.value?.scrollTop ?? 0
  const windowTop = window.scrollY || document.documentElement.scrollTop || 0
  showScrollToTop.value = Math.max(containerTop, windowTop) > 300
}
const scrollToTop = (): void => {
  if (!isBrowser) return
  const container = rootScrollContainerRef.value
  if (container && container.scrollHeight > container.clientHeight) {
    container.scrollTo({ top: 0, behavior: 'smooth' })
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const openFcvFetchSection = async (): Promise<void> => {
  showFcvFetchPanel.value = true
  await refreshDashboardFcvStatus()
  if (isIos.value) return
  await nextTick()
  fcvFetchSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function closeFcvFetchUi(): void {
  showFcvFetchPanel.value = false
}

function handleOpenFcvImportFromSettings(): void {
  closeSettings()
  void openFcvFetchSection()
}

function handleFlicaConnectionChanged(payload: { connected: boolean }): void {
  dashboardFcvConnected.value = !!payload?.connected
  if (payload?.connected) {
    showFcvFetchPanel.value = true
  } else {
    showFcvFetchPanel.value = false
  }
}
const isInlineCommercialMode = ref(false)
const editingEntryId = ref<string | null>(null)
const expandedEntryId = ref<string | null>(null)
const inlineEditEntry = ref<LogEntry | null>(null)
const showSignEntryModal = ref(false)
const showSignatureFinishModal = ref(false)
const signInstructorId = ref('')
const signPin = ref('')
const isSubmittingSign = ref(false)
const isMarkingSignaturePending = ref(false)
/** Intent for the in-progress save: sign immediately, mark pending, guest drawn, or normal (no dual). */
const pendingSaveSigningIntent = ref<'none' | 'sign' | 'later' | 'guest' | 'guest_qr'>('none')

/** Sentinel value for guest / fill-in instructor (not a roster UUID). */
const GUEST_SIGNER_VALUE = '__guest__'
const guestSignerName = ref('')
const guestCertificateNumber = ref('')
const guestPadHasInk = ref(false)
const inlineGuestPadRef = ref<{ toBlob: (mime?: string) => Promise<Blob | null>; clear: () => void; hasInk: { value: boolean } } | null>(null)
const addGuestPadRef = ref<{ toBlob: (mime?: string) => Promise<Blob | null>; clear: () => void; hasInk: { value: boolean } } | null>(null)
const pendingGuestSignatureBlob = ref<Blob | null>(null)
const expandedGuestSignatureUrl = ref<string | null>(null)

const isGuestSignerSelected = computed(() => signInstructorId.value === GUEST_SIGNER_VALUE)

/** UUID shape only — does NOT mean the row exists in Supabase. */
const isValidEntryUUID = (id: string | null | undefined): boolean =>
  !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

async function entryExistsInCloud(entryId: string): Promise<boolean> {
  if (!isValidEntryUUID(entryId) || !user.value?.id) return false
  const { data, error } = await (supabase.from('log_entries') as any)
    .select('id')
    .eq('id', entryId)
    .eq('user_id', user.value.id)
    .maybeSingle()
  if (error) {
    console.warn('[entryExistsInCloud]', error.message)
    return false
  }
  return !!data
}

/** True only when the entry actually exists in cloud (or IndexedDB _synced while offline). */
async function isEntryCloudSynced(entryId: string | null | undefined): Promise<boolean> {
  if (!entryId || !isValidEntryUUID(entryId)) return false
  await checkOnlineStatus()
  if (isOnline.value) {
    return entryExistsInCloud(entryId)
  }
  try {
    const local = await getEntryFromIndexedDB(entryId)
    return local?._synced === true
  } catch {
    return false
  }
}

function buildDbPayloadFromLogEntry(
  entry: LogEntry,
  userId: string,
  options?: { signaturePending?: boolean; pendingInstructorId?: string | null }
): Record<string, unknown> {
  const signaturePending =
    options?.signaturePending !== undefined
      ? options.signaturePending
      : entry.signaturePending === true
  const pendingInstructorId =
    options?.pendingInstructorId !== undefined
      ? options.pendingInstructorId
      : (entry.pendingInstructorId ?? null)

  return {
    id: entry.id,
    user_id: userId,
    date: entry.date,
    role: entry.role,
    aircraft_category_class: entry.aircraftCategoryClass,
    category_class_time: entry.categoryClassTime,
    aircraft_make_model: entry.aircraftMakeModel,
    registration: entry.registration,
    flight_number: entry.flightNumber,
    departure: entry.departure,
    destination: entry.destination,
    route: entry.route || '',
    training_elements: entry.trainingElements || null,
    training_instructor: entry.trainingInstructor || null,
    instructor_certificate: entry.instructorCertificate || null,
    pic_name: (entry.picName || '').trim() || null,
    sic_name: (entry.sicName || '').trim() || null,
    flight_conditions: entry.flightConditions,
    remarks: entry.remarks || null,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    logbook_type: entry.logbookType ?? 'flight',
    flight_time: entry.flightTime,
    performance: entry.performance,
    oooi: entry.oooi || null,
    flagged: entry.flagged ?? false,
    signature_pending: signaturePending,
    pending_instructor_id: pendingInstructorId,
    amends_entry_id: entry.amendsEntryId ?? null,
    is_void: entry.isVoid === true,
    is_imported: entry.isImported ?? false,
    import_source: entry.importSource ?? null,
    import_batch_id: entry.importBatchId ?? null,
    original_entry_date: entry.originalEntryDate ?? null,
    import_metadata: entry.importMetadata ?? null,
  }
}

const activeInstructorsForSigning = computed(() =>
  rosterInstructors.value.filter((row) => isRosterRelationshipSignable(row))
)

const mainInstructorsForSigning = computed(() =>
  activeInstructorsForSigning.value.filter((row) => row.relationship_kind === 'main')
)

const otherInstructorsForSigning = computed(() =>
  activeInstructorsForSigning.value.filter((row) => row.relationship_kind !== 'main')
)

const isExpandedEntrySigned = computed(() => isEntrySigned(expandedEntryId.value))

const canAmendExpandedEntry = computed(() => {
  const id = expandedEntryId.value
  if (!id || !isExpandedEntrySigned.value) return false
  if (isEntrySuperseded(id, logEntries.value)) return false
  if (getAmendmentFor(id, logEntries.value)) return false
  return true
})

const canVoidExpandedEntry = computed(() => canAmendExpandedEntry.value)

const isExpandedEntryPending = computed(() => {
  if (isExpandedEntrySigned.value) return false
  return inlineEditEntry.value?.signaturePending === true
    || logEntries.value.find((e) => e.id === expandedEntryId.value)?.signaturePending === true
})

const expandedEntryNeedsSignature = computed(() =>
  requiresInstructorSignature(inlineEditEntry.value) && !isExpandedEntrySigned.value
)

const newEntryNeedsSignature = computed(() =>
  requiresInstructorSignature({ flightTime: newEntry.flightTime })
)

const canSignExpandedEntry = computed(() => {
  if (!expandedEntryId.value || isExpandedEntrySigned.value) return false
  if (!isValidEntryUUID(expandedEntryId.value)) return false
  if (!expandedEntryNeedsSignature.value) return false
  return true
})

const canSaveAndSignNewEntry = computed(() => {
  if (!newEntryNeedsSignature.value) return false
  if (isGuestSignerSelected.value) {
    return guestSignerName.value.trim().length > 0 && guestPadHasInk.value
  }
  return (
    activeInstructorsForSigning.value.length > 0
    && !!signInstructorId.value
    && signPin.value.trim().length >= 4
  )
})

const canSaveAndSignInlineEntry = computed(() => {
  if (!expandedEntryNeedsSignature.value) return false
  if (isGuestSignerSelected.value) {
    return guestSignerName.value.trim().length > 0 && guestPadHasInk.value
  }
  return (
    activeInstructorsForSigning.value.length > 0
    && !!signInstructorId.value
    && signPin.value.trim().length >= 4
  )
})

const expandedSignatureMeta = computed(() => {
  const id = expandedEntryId.value
  if (!id) return null
  return signaturesByEntryId.value[id] ?? null
})

const isExpandedGuestSigned = computed(
  () => expandedSignatureMeta.value?.sign_method === 'guest_drawn'
)

watch(newEntryNeedsSignature, (needs) => {
  if (needs && isEntryFormOpen.value) ensureDefaultSignInstructor()
})

watch(isGuestSignerSelected, (guest) => {
  if (!guest) {
    guestPadHasInk.value = false
    resetGuestSignQr()
  }
})

watch(guestQrCompleted, async (done) => {
  if (!done) return
  const id = guestQrEntryId.value || expandedEntryId.value
  if (id) {
    await fetchSignaturesForEntries([id])
    setLocalSignaturePending(id, false)
    if (user.value?.id) {
      const local = logEntries.value.find((e) => e.id === id)
      if (local) {
        try {
          await updateEntryInIndexedDB(
            { ...local, signaturePending: false },
            { userId: user.value.id }
          )
        } catch {
          // ignore
        }
      }
    }
  }
  showToast('Entry signed by guest instructor', { type: 'success' })
})

async function startGuestSignOnPhone(): Promise<void> {
  pendingSaveSigningIntent.value = 'guest_qr'
  await saveInlineEdit()
}

async function startGuestSignOnPhoneFromAdd(): Promise<void> {
  pendingSaveSigningIntent.value = 'guest_qr'
  await submitEntry()
}

function shouldAwaitSyncForSigningIntent(): boolean {
  const intent = pendingSaveSigningIntent.value
  return intent === 'later' || intent === 'guest_qr'
}

watch(expandedEntryNeedsSignature, (needs) => {
  if (needs && expandedEntryId.value) ensureDefaultSignInstructor()
})

watch(
  [expandedEntryId, () => expandedSignatureMeta.value?.drawn_signature_url, () => expandedSignatureMeta.value?.sign_method],
  async () => {
    expandedGuestSignatureUrl.value = null
    const meta = expandedSignatureMeta.value
    if (meta?.sign_method !== 'guest_drawn' || !meta.drawn_signature_url) return
    expandedGuestSignatureUrl.value = await getDrawnSignatureDisplayUrl(meta.drawn_signature_url)
  }
)

function instructorDisplayName(row: { profile: { full_name: string | null } | null }): string {
  return row.profile?.full_name?.trim() || 'Instructor'
}

function closeInlineEditDrawer(): void {
  closeAuditTrailSidebar()
  closeSignEntryModal()
  showSignatureFinishModal.value = false
  expandedEntryId.value = null
  inlineEditEntry.value = null
  isInlineCommercialMode.value = false
  showInlineCustomTagInput.value = false
  customTagInputInline.value = ''
}

function setLocalSignaturePending(
  entryId: string,
  pending: boolean,
  instructorId: string | null = null
): void {
  logEntries.value = sortEntriesByDateAndOOOI(
    logEntries.value.map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            signaturePending: pending,
            pendingInstructorId: pending ? instructorId : null,
          }
        : entry
    )
  )
  if (inlineEditEntry.value?.id === entryId) {
    inlineEditEntry.value = {
      ...inlineEditEntry.value,
      signaturePending: pending,
      pendingInstructorId: pending ? instructorId : null,
    }
  }
}

async function openSignEntryModal(): Promise<void> {
  await fetchInstructors()
  ensureDefaultSignInstructor()
  if (!(await isEntryCloudSynced(expandedEntryId.value))) {
    showToast('Entry must sync to the cloud before signing', { type: 'error' })
    return
  }
  if (!requiresInstructorSignature(inlineEditEntry.value)) {
    showToast('Signing is only available when Dual Received time is greater than zero', { type: 'info' })
    return
  }
  if (!signInstructorId.value && mainInstructorsForSigning.value[0]) {
    signInstructorId.value = mainInstructorsForSigning.value[0].instructor_id
  }
  if (!signInstructorId.value && activeInstructorsForSigning.value[0]) {
    signInstructorId.value = activeInstructorsForSigning.value[0].instructor_id
  }
  if (!signInstructorId.value) {
    signInstructorId.value = GUEST_SIGNER_VALUE
  }
  signPin.value = ''
  showSignatureFinishModal.value = false
  showSignEntryModal.value = true
}

function closeSignEntryModal(): void {
  showSignEntryModal.value = false
  signPin.value = ''
}

async function submitSignEntry(): Promise<void> {
  const entryId = expandedEntryId.value
  if (!entryId || !signInstructorId.value) return
  isSubmittingSign.value = true
  try {
    const result = await signLogEntry(entryId, signInstructorId.value, signPin.value)
    if (!result.success) {
      showToast(result.error, { type: 'error' })
      return
    }
    setLocalSignaturePending(entryId, false)
    if (user.value?.id) {
      const local = logEntries.value.find((e) => e.id === entryId)
      if (local) {
        try {
          await updateEntryInIndexedDB({ ...local, signaturePending: false }, { userId: user.value.id })
        } catch {
          // ignore IDB errors
        }
      }
    }
    showToast('Entry signed — it can no longer be edited', { type: 'success' })
    closeSignEntryModal()
    closeInlineEditDrawer()
  } finally {
    isSubmittingSign.value = false
  }
}

async function sendEntryForSigning(): Promise<void> {
  const entryId = expandedEntryId.value
  if (!entryId) return
  const instructorId = signInstructorId.value
  if (!instructorId) {
    showToast('Select an instructor to send for signing', { type: 'error' })
    return
  }
  isMarkingSignaturePending.value = true
  try {
    const cloud = await ensureCloudPendingSignature(entryId, instructorId)
    if (!cloud.ok) {
      showToast(cloud.error, { type: 'error', duration: 6000 })
      return
    }
    setLocalSignaturePending(entryId, true, instructorId)
    if (user.value?.id) {
      const local = logEntries.value.find((e) => e.id === entryId)
      if (local) {
        try {
          await updateEntryInIndexedDB(
            { ...local, signaturePending: true, pendingInstructorId: instructorId },
            { userId: user.value.id }
          )
        } catch {
          // ignore
        }
      }
    }
    showToast('Sent to instructor for signature', { type: 'success' })
    showSignatureFinishModal.value = false
    closeInlineEditDrawer()
  } finally {
    isMarkingSignaturePending.value = false
  }
}

function openSignatureFinishModal(): void {
  showSignatureFinishModal.value = true
}

async function refreshFlightSignatures(): Promise<void> {
  if (!isAuthenticated.value || !user.value) return
  const ids = logEntries.value.map((entry) => entry.id).filter(isValidEntryUUID)
  if (ids.length === 0) return
  await fetchSignaturesForEntries(ids)
}

async function beginInlineEditing(entry: LogEntry): Promise<void> {
  if (expandedEntryId.value === entry.id) {
    closeInlineEditDrawer()
  } else {
    ensureIosCatalogIndex()
    // Close Add Entry form when opening inline edit
    isEntryFormOpen.value = false
    closeAuditTrailSidebar()
    showSignatureFinishModal.value = false
    expandedEntryId.value = entry.id
    // Deep copy for inline editing
    const copy = JSON.parse(JSON.stringify(entry))
    // Normalize the date for the input field
    copy.date = normalizeDateForInput(entry.date)
    if (!copy.performance.approaches?.length) {
      copy.performance.approaches = getApproachesFromPerformance(copy.performance)
    }
    if (!Array.isArray(copy.tags)) copy.tags = []
    inlineEditEntry.value = copy
    // Auto-enable commercial mode only when existing OOOI time fields are present
    const hasOOOITimes =
      !!copy.oooi &&
      !!(
        (copy.oooi.out && copy.oooi.out.trim()) ||
        (copy.oooi.off && copy.oooi.off.trim()) ||
        (copy.oooi.on && copy.oooi.on.trim()) ||
        (copy.oooi.in && copy.oooi.in.trim())
      )
    isInlineCommercialMode.value = hasOOOITimes
    if (!isEntrySigned(entry.id) && requiresInstructorSignature(entry)) {
      ensureDefaultSignInstructor()
    }
  }
}

function beginAmendSignedEntry(): void {
  const original = inlineEditEntry.value
  const originalId = expandedEntryId.value
  if (!original || !originalId) return
  if (!isEntrySigned(originalId)) {
    showToast('Only signed entries can be amended', { type: 'error' })
    return
  }
  if (isEntrySuperseded(originalId, logEntries.value)) {
    showToast('This entry has already been superseded', { type: 'error' })
    return
  }
  if (getAmendmentFor(originalId, logEntries.value)) {
    showToast('An amendment already exists — edit or delete it first', { type: 'error' })
    return
  }

  ensureIosCatalogIndex()
  closeAuditTrailSidebar()
  showSignatureFinishModal.value = false

  const newId = generateEntryId()
  const copy = JSON.parse(JSON.stringify(original)) as LogEntry
  copy.id = newId
  copy.amendsEntryId = originalId
  copy.signaturePending = false
  copy.pendingInstructorId = null
  copy.dataHash = undefined
  copy.version = undefined
  copy.createdAt = undefined
  copy.updatedAt = undefined
  copy.date = normalizeDateForInput(original.date)
  if (!copy.performance.approaches?.length) {
    copy.performance.approaches = getApproachesFromPerformance(copy.performance)
  }
  if (!Array.isArray(copy.tags)) copy.tags = []

  logEntries.value = sortEntriesByDateAndOOOI([...logEntries.value, copy])
  expandedEntryId.value = newId
  inlineEditEntry.value = copy

  const hasOOOITimes =
    !!copy.oooi &&
    !!(
      (copy.oooi.out && copy.oooi.out.trim()) ||
      (copy.oooi.off && copy.oooi.off.trim()) ||
      (copy.oooi.on && copy.oooi.on.trim()) ||
      (copy.oooi.in && copy.oooi.in.trim())
    )
  isInlineCommercialMode.value = hasOOOITimes

  if (requiresInstructorSignature(copy)) {
    ensureDefaultSignInstructor()
  }

  showToast('Amendment draft created — correct and save. History will appear in the audit trail.', { type: 'success' })
}

/** Load cloud amendment for a signed original when local state is missing it. */
async function fetchRemoteAmendmentForOriginal(originalId: string): Promise<LogEntry | null> {
  if (!isAuthenticated.value || !user.value) return null
  await checkOnlineStatus()
  if (!isOnline.value) return null
  const { data, error } = await (supabase.from('log_entries') as any)
    .select('*')
    .eq('user_id', user.value.id)
    .eq('amends_entry_id', originalId)
    .maybeSingle()
  if (error || !data) return null
  return mapSupabaseRowToLogEntry(data)
}

async function adoptEntryIntoLocalState(entry: LogEntry, replaceDraftId?: string): Promise<void> {
  if (user.value) {
    try {
      await updateEntryInIndexedDB(entry, { userId: user.value.id, synced: true })
    } catch {
      // non-fatal
    }
    if (replaceDraftId && replaceDraftId !== entry.id) {
      try {
        await deleteEntryFromIndexedDB(replaceDraftId)
      } catch {
        // ignore
      }
    }
  }
  logEntries.value = sortEntriesByDateAndOOOI([
    ...logEntries.value.filter(
      (e) =>
        e.id !== entry.id &&
        e.id !== replaceDraftId &&
        !(entry.amendsEntryId && e.amendsEntryId === entry.amendsEntryId)
    ),
    entry,
  ])
}

async function beginVoidSignedEntry(): Promise<void> {
  const original = inlineEditEntry.value
  const originalId = expandedEntryId.value
  if (!original || !originalId) return
  if (!isEntrySigned(originalId)) {
    showToast('Only signed entries can be voided', { type: 'error' })
    return
  }
  if (isEntrySuperseded(originalId, logEntries.value)) {
    showToast('This entry has already been superseded', { type: 'error' })
    return
  }
  if (getAmendmentFor(originalId, logEntries.value)) {
    showToast('An amendment already exists — edit or delete it first', { type: 'error' })
    return
  }

  // Orphan recovery: amendment exists in cloud but not in local memory
  const remoteExisting = await fetchRemoteAmendmentForOriginal(originalId)
  if (remoteExisting) {
    await adoptEntryIntoLocalState(remoteExisting)
    showToast(remoteExisting.isVoid
        ? 'This entry was already voided — restored from the cloud'
        : 'An amendment already exists — restored from the cloud', { type: 'error', duration: 5000 })
    prepareInlineEditFromEntry(remoteExisting)
    return
  }

  const reason = window.prompt(
    'Reason for voiding this signed entry (required). The original stays in history; a zero-time void row replaces it in your logbook.'
  )
  if (reason === null) return
  if (!reason.trim()) {
    showToast('A void reason is required', { type: 'error' })
    return
  }

  ensureIosCatalogIndex()
  closeAuditTrailSidebar()
  showSignatureFinishModal.value = false

  // Snapshot for rollback if cloud/IDB persist fails
  const originalSnapshot = JSON.parse(JSON.stringify(original)) as LogEntry
  const priorCommercialMode = isInlineCommercialMode.value

  const newId = generateEntryId()
  const voidEntry = buildVoidAmendment(original, newId, reason)
  voidEntry.date = normalizeDateForInput(original.date)

  // Optimistic UI — roll back if saveInlineEdit does not persist
  logEntries.value = sortEntriesByDateAndOOOI([...logEntries.value, voidEntry])
  expandedEntryId.value = newId
  inlineEditEntry.value = voidEntry
  isInlineCommercialMode.value = false

  const saved = await saveInlineEdit()
  if (saved) return

  // Race / orphan: unique constraint may mean another amendment won — adopt it
  const recovered = await fetchRemoteAmendmentForOriginal(originalId)
  if (recovered) {
    await adoptEntryIntoLocalState(recovered, newId)
    showToast(recovered.isVoid
        ? 'This entry was already voided — restored from the cloud'
        : 'An amendment already exists — restored from the cloud', { type: 'error', duration: 5000 })
    prepareInlineEditFromEntry(recovered)
    return
  }

  logEntries.value = sortEntriesByDateAndOOOI(
    logEntries.value.filter((e) => e.id !== newId)
  )
  try {
    await deleteEntryFromIndexedDB(newId)
  } catch {
    // ignore — may never have been written
  }
  expandedEntryId.value = originalId
  inlineEditEntry.value = originalSnapshot
  isInlineCommercialMode.value = priorCommercialMode
  showToast('Could not void entry — changes were not saved', { type: 'error', duration: 6000 })
}

function ensureInlineOOOI(): void {
  if (!inlineEditEntry.value) return
  if (!inlineEditEntry.value.oooi) {
    inlineEditEntry.value.oooi = createEmptyOOOI()
  }
}

function toggleInlineOOOIMode(): void {
  if (!inlineEditEntry.value) return
  const next = !isInlineCommercialMode.value
  if (next && !inlineEditEntry.value.oooi) {
    inlineEditEntry.value.oooi = createEmptyOOOI()
  }
  isInlineCommercialMode.value = next
}

async function saveInlineEdit(): Promise<boolean> {
  if (!inlineEditEntry.value || isSavingInlineEdit.value) return false
  if (isEntrySigned(inlineEditEntry.value.id) || isEntrySigned(expandedEntryId.value)) {
    showToast('Signed entries cannot be edited', { type: 'error' })
    return false
  }
  isSavingInlineEdit.value = true

  try {
  // Basic validation: date always required; aircraft/ident required only when not logging simulator time
  if (!inlineEditEntry.value.date) {
    showToast('Date is required.', { type: 'error' })
    return false
  }
  if (!isLoggingSimTime(inlineEditEntry.value) && !(inlineEditEntry.value.registration || '').trim()) {
    showToast('Aircraft Identification is required for flight entries.', { type: 'error' })
    return false
  }

  applyTailResolutionToEntry(inlineEditEntry.value)

  // Debug logging for night time
  console.log('[SaveInlineEdit] Saving entry with night time:', {
    entryId: inlineEditEntry.value.id,
    nightTime: inlineEditEntry.value.flightTime.night,
    date: inlineEditEntry.value.date,
    departure: inlineEditEntry.value.departure,
    flightTime: inlineEditEntry.value.flightTime
  })

  // Normalize the entry like submitEntry does to ensure consistent data
  const updatedEntry: LogEntry = {
    ...inlineEditEntry.value,
    aircraftCategoryClass: normalizeCategoryClassLabel((inlineEditEntry.value.aircraftCategoryClass || '').trim()),
    route: (inlineEditEntry.value.route || '').trim().toUpperCase(),
    categoryClassTime: normalizeNumber(inlineEditEntry.value.categoryClassTime),
    flightTime: flightTimeFields.reduce<FlightTimeBreakdown>((acc, field) => {
      const normalized = normalizeNumber(inlineEditEntry.value!.flightTime[field.key])
      acc[field.key] = normalized
      // Debug logging for night time
      if (field.key === 'night') {
        console.log('[SaveInlineEdit] Normalizing night time:', {
          rawValue: inlineEditEntry.value!.flightTime[field.key],
          normalizedValue: normalized
        })
      }
      return acc
    }, {} as FlightTimeBreakdown),
    performance: (() => {
      const base = { ...createEmptyPerformance() }
      performanceFields.forEach((field) => {
        (base as any)[field.key] = inlineEditEntry.value!.performance[field.key] ?? null
      })
      const formApproaches = inlineEditEntry.value!.performance.approaches
      const approaches = Array.isArray(formApproaches) && formApproaches.length > 0
        ? formApproaches.map((a) => ({ type: (a.type || '').trim() || 'Unknown', count: Math.max(0, a.count || 1) }))
        : Array.isArray(formApproaches) && formApproaches.length === 0
          ? []
          : getApproachesFromPerformance(inlineEditEntry.value!.performance)
      base.approaches = approaches
      base.approachCount = approaches.length > 0 ? getTotalApproachCount(base) || null : null
      base.approachType = approaches[0]?.type ?? null
      return base
    })(),
    flightConditions: sanitizeFlightConditions([...inlineEditEntry.value.flightConditions]),
    oooi: inlineEditEntry.value.oooi && Object.values(inlineEditEntry.value.oooi).some(v => v) ? { ...inlineEditEntry.value.oooi } : undefined,
    signaturePending:
      pendingSaveSigningIntent.value === 'later'
        ? true
        : (inlineEditEntry.value.signaturePending === true),
    pendingInstructorId:
      pendingSaveSigningIntent.value === 'later'
        ? (signInstructorId.value || null)
        : (inlineEditEntry.value.pendingInstructorId ?? null),
    amendsEntryId: inlineEditEntry.value.amendsEntryId ?? null,
    isVoid: inlineEditEntry.value.isVoid === true,
  }

  if (inferLogbookType(updatedEntry) === 'simulator') {
    normalizeSimulatorInstrumentTime(updatedEntry)
    updatedEntry.flightConditions = autoCheckFlightConditions(
      updatedEntry.flightConditions,
      updatedEntry.flightTime.night,
      updatedEntry.flightTime.actualInstrument,
      updatedEntry.flightTime.simulatedInstrument,
      updatedEntry.flightTime.crossCountry,
      updatedEntry.flightTime.nvg ?? null
    )
  }

  const targetId = inlineEditEntry.value.id

  // Save to Supabase if authenticated, otherwise save to localStorage
  if (isAuthenticated.value && user.value) {
    try {
      // Get old entry data before updating (maybeSingle: 0 rows = null, no throw)
      const { data: oldEntryData, error: fetchError } = await (supabase
        .from('log_entries') as any)
        .select('*')
        .eq('id', targetId)
        .maybeSingle()
      
      if (fetchError) {
        console.error('[SaveInlineEdit] Failed to fetch old entry data:', fetchError)
        throw fetchError
      }

      // Convert to database format (id/user_id only for queue insert, not for update body)
      const dbEntry: any = {
        date: updatedEntry.date,
        role: updatedEntry.role,
        aircraft_category_class: updatedEntry.aircraftCategoryClass,
        category_class_time: updatedEntry.categoryClassTime,
        aircraft_make_model: updatedEntry.aircraftMakeModel,
        registration: updatedEntry.registration,
        flight_number: updatedEntry.flightNumber,
        departure: updatedEntry.departure,
        destination: updatedEntry.destination,
        route: updatedEntry.route,
        training_elements: updatedEntry.trainingElements || null,
        training_instructor: updatedEntry.trainingInstructor || null,
        instructor_certificate: updatedEntry.instructorCertificate || null,
        pic_name: (updatedEntry.picName || '').trim() || null,
        sic_name: (updatedEntry.sicName || '').trim() || null,
        flight_conditions: updatedEntry.flightConditions,
        remarks: updatedEntry.remarks || null,
        tags: Array.isArray(updatedEntry.tags) ? updatedEntry.tags : [],
        logbook_type: updatedEntry.logbookType ?? oldEntryData?.logbook_type ?? 'flight',
        flight_time: updatedEntry.flightTime,
        performance: updatedEntry.performance,
        oooi: updatedEntry.oooi || null,
        flagged: oldEntryData?.flagged ?? updatedEntry.flagged ?? false,
        signature_pending:
          pendingSaveSigningIntent.value === 'later'
            ? true
            : (oldEntryData?.signature_pending ?? updatedEntry.signaturePending ?? false),
        pending_instructor_id:
          pendingSaveSigningIntent.value === 'later'
            ? (signInstructorId.value || null)
            : (oldEntryData?.pending_instructor_id ?? updatedEntry.pendingInstructorId ?? null),
        amends_entry_id:
          updatedEntry.amendsEntryId ?? oldEntryData?.amends_entry_id ?? null,
        is_void: updatedEntry.isVoid === true || oldEntryData?.is_void === true,
        is_imported: oldEntryData?.is_imported ?? false,
        import_source: oldEntryData?.import_source ?? null,
        import_batch_id: oldEntryData?.import_batch_id ?? null,
        original_entry_date: oldEntryData?.original_entry_date ?? null,
        import_metadata: oldEntryData?.import_metadata ?? null
      }

      // Entry not in Supabase yet (0 rows): insert directly when online; queue when offline
      if (!oldEntryData) {
        console.log('[SaveInlineEdit] Entry not in Supabase yet')
        const queueEntry = { ...dbEntry, id: targetId, user_id: user.value.id }
        const awaitSync = shouldAwaitSyncForSigningIntent()

        await checkOnlineStatus()
        if (isOnline.value) {
          const { data: insertResult, error: insertError } = await (supabase
            .from('log_entries') as any)
            .insert(queueEntry)
            .select()
            .maybeSingle()

          if (insertError) {
            console.error('[SaveInlineEdit] Direct insert error:', insertError)
            const msg = String(insertError.message || '')
            const details = String(insertError.details || '')
            const isAmendUniqueViolation =
              insertError.code === '23505' &&
              (msg.includes('idx_log_entries_one_amendment_per_original') ||
                details.includes('amends_entry_id'))
            if (
              insertError.code === '23505' &&
              updatedEntry.amendsEntryId
            ) {
              const { data: existingAmend } = await (supabase.from('log_entries') as any)
                .select('*')
                .eq('user_id', user.value.id)
                .eq('amends_entry_id', updatedEntry.amendsEntryId)
                .maybeSingle()
              if (existingAmend) {
                const savedEntry = mapSupabaseRowToLogEntry(existingAmend)
                await adoptEntryIntoLocalState(savedEntry, targetId)
                expandedEntryId.value = savedEntry.id
                inlineEditEntry.value = savedEntry
                afterInlineSaveSuccess(savedEntry)
                return true
              }
            }
            showToast(isAmendUniqueViolation
                ? 'An amendment for this entry already exists in the cloud'
                : (insertError.message || 'Failed to save entry to the cloud. Check your connection and try again.'), { type: 'error', duration: 6000 })
            return false
          }
          if (!insertResult) {
            showToast('Insert returned no row (possible RLS or constraint issue)', { type: 'error', duration: 6000 })
            return false
          }

          const savedEntry: LogEntry = {
            ...updatedEntry,
            dataHash: insertResult.data_hash || undefined,
            version: insertResult.version,
            signaturePending: insertResult.signature_pending === true,
            pendingInstructorId: insertResult.pending_instructor_id ?? null,
            amendsEntryId: insertResult.amends_entry_id ?? updatedEntry.amendsEntryId ?? null,
            isVoid: insertResult.is_void === true || updatedEntry.isVoid === true,
          }
          // Only mark synced when the remote row actually exists
          await updateEntryInIndexedDB(savedEntry, { userId: user.value.id, synced: true })
          const existsLocally = logEntries.value.some((e) => e.id === targetId)
          logEntries.value = sortEntriesByDateAndOOOI(
            existsLocally
              ? logEntries.value.map((e) => (e.id === targetId ? savedEntry : e))
              : [...logEntries.value, savedEntry]
          )
          afterInlineSaveSuccess(savedEntry)
          return true
        }

        await updateEntryInIndexedDB(updatedEntry, { userId: user.value.id, synced: false })
        await addToQueue('insert', targetId, queueEntry, user.value.id, { awaitSync })
        const existsLocally = logEntries.value.some((e) => e.id === targetId)
        logEntries.value = sortEntriesByDateAndOOOI(
          existsLocally
            ? logEntries.value.map((e) => (e.id === targetId ? updatedEntry : e))
            : [...logEntries.value, updatedEntry]
        )
        afterInlineSaveSuccess(updatedEntry)
        return true
      }

      console.log('[SaveInlineEdit] Updating entry in database:', targetId)
      
      // Update existing entry (maybeSingle: 0 rows = null, no throw)
      const { data: updateResult, error } = await (supabase
        .from('log_entries') as any)
        .update(dbEntry)
        .eq('id', targetId)
        .select()
        .maybeSingle()
      
      if (error) {
        console.error('[SaveInlineEdit] Update error:', error)
        throw error
      }
      
      // 0 rows updated (e.g. RLS): persist locally and queue for sync
      if (!updateResult) {
        console.log('[SaveInlineEdit] Update returned 0 rows, saving to IndexedDB and queueing for sync')
        await updateEntryInIndexedDB(updatedEntry, { userId: user.value.id, synced: false })
        const awaitSync = shouldAwaitSyncForSigningIntent()
        await addToQueue('update', targetId, dbEntry, user.value.id, { awaitSync })
        logEntries.value = sortEntriesByDateAndOOOI(
          logEntries.value.map((e) => (e.id === targetId ? updatedEntry : e))
        )
        afterInlineSaveSuccess(updatedEntry)
        return true
      }
      
      console.log('[SaveInlineEdit] Entry updated successfully in database:', updateResult)
      console.log('[SaveInlineEdit] Hash from updateResult:', updateResult.data_hash)
      console.log('[SaveInlineEdit] Version from updateResult:', updateResult.version)
      
      // Store updateResult in a const for the closure
      const savedUpdateResult = updateResult
      
      // Validate entry integrity after update commits
      // The trigger (compute_entry_hash_trigger) fires BEFORE UPDATE and computes the hash
      // The returned updateResult.data_hash contains the hash computed by the trigger
      // Validation should match this hash exactly since it uses the same build_entry_hash_text function
      // Small delay to ensure transaction is fully committed and any replication lag is accounted for
      setTimeout(async () => {
        try {
          console.log('[SaveInlineEdit] Validating entry integrity after update commit...')
          const validationResult = await validateEntryIntegrity(targetId, true, inlineEditEntry.value).catch((err: any) => {
            console.warn(`[SaveInlineEdit] Failed to validate entry ${targetId}:`, err)
            return null
          })
          
          if (validationResult) {
            if (validationResult.isValid) {
              console.log('[SaveInlineEdit] Entry validated successfully')
            } else {
              console.error('[SaveInlineEdit] Hash mismatch detected!', {
                entryId: targetId,
                storedHash: validationResult.currentHash?.substring(0, 16) + '...',
                computedHash: validationResult.computedHash?.substring(0, 16) + '...'
              })
            }
          }
          
          // Refresh audit trail if it's open for this entry
          if (showAuditTrailSidebar.value && activeAuditTrailEntryId.value === targetId) {
            auditTrailRefreshKey.value++
          }
        } catch (validationErr) {
          // Ignore validation errors - don't fail the save
          console.warn('[SaveInlineEdit] Validation error:', validationErr)
        }
      }, 200) // Small delay to ensure transaction is committed
      
      // Update local state IMMEDIATELY with the data returned from database
      const dbEntryResult = updateResult
      const entry: LogEntry = {
        id: dbEntryResult.id,
        date: dbEntryResult.date,
        role: dbEntryResult.role,
        aircraftCategoryClass: dbEntryResult.aircraft_category_class,
        categoryClassTime: dbEntryResult.category_class_time,
        aircraftMakeModel: dbEntryResult.aircraft_make_model,
        registration: dbEntryResult.registration,
        flightNumber: dbEntryResult.flight_number,
        departure: dbEntryResult.departure,
        destination: dbEntryResult.destination,
        route: dbEntryResult.route || '',
        trainingElements: dbEntryResult.training_elements || '',
        trainingInstructor: dbEntryResult.training_instructor || '',
        instructorCertificate: dbEntryResult.instructor_certificate || '',
        picName: dbEntryResult.pic_name || null,
        sicName: dbEntryResult.sic_name || null,
        flightConditions: sanitizeFlightConditions(dbEntryResult.flight_conditions || []),
        remarks: dbEntryResult.remarks || '',
        logbookType: dbEntryResult.logbook_type === 'simulator' ? 'simulator' : 'flight',
        flightTime: dbEntryResult.flight_time as FlightTimeBreakdown,
        performance: dbEntryResult.performance as PerformanceMetrics,
        oooi: dbEntryResult.oooi as OOOITimes | undefined,
        flagged: dbEntryResult.flagged || false,
        version: dbEntryResult.version, // Include version to keep frontend in sync with database
        dataHash: dbEntryResult.data_hash || undefined,
        signaturePending: dbEntryResult.signature_pending === true,
        pendingInstructorId: dbEntryResult.pending_instructor_id ?? null,
        amendsEntryId: dbEntryResult.amends_entry_id ?? null,
        isVoid: dbEntryResult.is_void === true,
        isImported: dbEntryResult.is_imported || false,
        importSource: dbEntryResult.import_source || undefined,
        importBatchId: dbEntryResult.import_batch_id || undefined,
        originalEntryDate: dbEntryResult.original_entry_date || undefined,
        importMetadata: dbEntryResult.import_metadata || undefined
      }
      
      // Normalize values
      const normalizedFlightTime: FlightTimeBreakdown = { ...createEmptyFlightTime() }
      flightTimeFields.forEach((field) => {
        normalizedFlightTime[field.key] = normalizeNumber(entry.flightTime?.[field.key])
      })
      entry.flightTime = normalizedFlightTime
      
      const normalizedPerformance: PerformanceMetrics = { ...createEmptyPerformance() }
      performanceFields.forEach((field) => {
        const rawValue = entry.performance?.[field.key]
        const val = typeof rawValue === 'string'
          ? (isNaN(parseFloat(rawValue)) ? null : parseFloat(rawValue))
          : normalizeNumber(rawValue)
        ;(normalizedPerformance as unknown as Record<string, number | string | null>)[field.key] = val
      })
      normalizedPerformance.approaches = Array.isArray(entry.performance?.approaches) ? [...entry.performance.approaches] : getApproachesFromPerformance(entry.performance)
      normalizedPerformance.approachCount = getTotalApproachCount(normalizedPerformance) || null
      normalizedPerformance.approachType = normalizedPerformance.approaches[0]?.type ?? null
      entry.performance = normalizedPerformance
      
      // Update local state immediately
      logEntries.value = sortEntriesByDateAndOOOI(
        logEntries.value.map((e) => (e.id === targetId ? entry : e))
      )
      console.log('[SaveInlineEdit] Local state updated immediately with database result')

      // Create audit log entry
      try {
        const changedFields: string[] = []
        const oldData: any = {}
        const newData: any = {}
        
        // Compare all fields
        const fieldsToCompare = [
          'date', 'role', 'aircraft_category_class', 'category_class_time',
          'aircraft_make_model', 'registration', 'flight_number', 'departure',
          'destination', 'route', 'training_elements', 'training_instructor',
          'instructor_certificate', 'pic_name', 'sic_name', 'flight_conditions', 'remarks',
          'flight_time', 'performance', 'oooi', 'flagged'
        ]
        
        fieldsToCompare.forEach(field => {
          const oldVal = oldEntryData[field]
          const newVal = dbEntry[field]
          
          // Deep comparison for objects/arrays
          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changedFields.push(field)
            oldData[field] = oldVal
            newData[field] = newVal
          }
        })
        
        if (changedFields.length > 0) {
          // Create change summary
          const summaryParts = changedFields.slice(0, 3).map(field => {
            const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
            return fieldName
          })
          const changeSummary = changedFields.length > 3
            ? `Updated ${summaryParts.join(', ')} and ${changedFields.length - 3} more field${changedFields.length - 3 > 1 ? 's' : ''}`
            : `Updated ${summaryParts.join(', ')}`
          
          console.log('[SaveInlineEdit] Creating audit log:', {
            entry_id: targetId,
            user_id: user.value.id,
            changed_fields_count: changedFields.length
          })
          
          const { data: auditData, error: auditError } = await (supabase
            .from('audit_logs') as any)
            .insert({
              entry_id: targetId,
              user_id: user.value.id,
              action: 'update',
              old_data: oldData,
              new_data: newData,
              changed_fields: changedFields,
              change_summary: changeSummary,
              is_compliance_event: false
            })
            .select()
            .single()
          
          if (auditError) {
            console.error('[SaveInlineEdit] Failed to create audit log:', auditError)
            console.error('[SaveInlineEdit] Audit error details:', JSON.stringify(auditError, null, 2))
          } else {
            console.log('[SaveInlineEdit] Audit log created successfully:', auditData)
          }
        } else {
          console.log('[SaveInlineEdit] No fields changed, skipping audit log')
        }
      } catch (auditError) {
        console.error('[SaveInlineEdit] Exception creating audit log:', auditError)
      }

      // Verification is already done - we have the data from updateResult
      // No need to reload, we already updated local state with the returned data
      console.log('[SaveInlineEdit] Save complete - entry persisted and local state updated')
      try {
        await updateEntryInIndexedDB(entry, { userId: user.value.id, synced: true })
      } catch {
        // non-fatal — cloud already has the row
      }
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string; details?: string }
      console.error('[SaveInlineEdit] Error saving entry to Supabase:', error)
      console.error('[SaveInlineEdit] Error message:', err?.message ?? String(error))
      console.error('[SaveInlineEdit] Error code:', err?.code)
      console.error('[SaveInlineEdit] Error details:', err?.details)
      console.error('[SaveInlineEdit] Full error JSON:', JSON.stringify(error, null, 2))
      const userMessage = err?.message ?? (typeof error === 'string' ? error : 'Error saving entry. Please try again.')
      showToast(userMessage, { type: 'error' })
      return false
    }
  } else {
    // Fallback to localStorage - just update local state
  logEntries.value = sortEntriesByDateAndOOOI(
    logEntries.value.map((e) => 
      e.id === targetId ? updatedEntry : e
    )
  )
  }

  console.log('[SaveInlineEdit] Entry saved. Updated night time in logEntries:', 
    logEntries.value.find(e => e.id === targetId)?.flightTime.night
  )

  const savedLocal = logEntries.value.find((e) => e.id === targetId) ?? updatedEntry
  afterInlineSaveSuccess(savedLocal)
  return true
  } finally {
    isSavingInlineEdit.value = false
  }
}

function afterInlineSaveSuccess(savedEntry: LogEntry): void {
  void finalizeSaveWithSigningIntent(savedEntry, 'edit')
}

/** After Add Entry save: apply Sign / Sign later intent or close normally. */
function afterAddEntrySaveSuccess(savedEntry: LogEntry): void {
  void finalizeSaveWithSigningIntent(savedEntry, 'add')
}

async function ensureCloudPendingSignature(
  entryId: string,
  instructorId: string | null | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!instructorId) {
    return { ok: false, error: 'Select an instructor to Save without Signing' }
  }

  const maxAttempts = 5
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (isOnline.value) {
      await processQueue({ silent: true })
      await refreshQueueLength()
    }

    if (queueLength.value === 0) {
      break
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  if (queueLength.value > 0) {
    return {
      ok: false,
      error:
        'Saved locally but sync is still pending. Open Settings → Data to retry sync so your instructor can sign.',
    }
  }

  await checkOnlineStatus()
  let inCloud = await isEntryCloudSynced(entryId)

  // Repair: local-only amendment / orphan — INSERT then mark pending (do not PATCH-only)
  if (!inCloud) {
    if (!isOnline.value) {
      return {
        ok: false,
        error:
          'Entry has not synced to the cloud yet. Stay online and retry from Settings → Data.',
      }
    }
    if (!user.value?.id) {
      return { ok: false, error: 'Not authenticated' }
    }

    const localEntry =
      logEntries.value.find((e) => e.id === entryId) ||
      (await getEntryFromIndexedDB(entryId).catch(() => null))

    if (!localEntry) {
      return {
        ok: false,
        error:
          'Entry is missing locally and is not in the cloud. Re-open the entry and Save without Signing again.',
      }
    }

    const insertPayload = buildDbPayloadFromLogEntry(localEntry as LogEntry, user.value.id, {
      signaturePending: true,
      pendingInstructorId: instructorId,
    })

    const { data: insertResult, error: insertError } = await (supabase
      .from('log_entries') as any)
      .insert(insertPayload)
      .select()
      .maybeSingle()

    if (insertError) {
      console.error('[ensureCloudPendingSignature] Repair insert failed:', insertError)
      return {
        ok: false,
        error: insertError.message || 'Failed to upload entry to the cloud for signing',
      }
    }
    if (!insertResult) {
      return {
        ok: false,
        error: 'Insert returned no row (possible RLS or constraint issue)',
      }
    }

    const repaired: LogEntry = {
      ...(localEntry as LogEntry),
      dataHash: insertResult.data_hash || undefined,
      version: insertResult.version,
      signaturePending: true,
      pendingInstructorId: instructorId,
      amendsEntryId: insertResult.amends_entry_id ?? (localEntry as LogEntry).amendsEntryId ?? null,
      isVoid: insertResult.is_void === true || (localEntry as LogEntry).isVoid === true,
    }
    try {
      await updateEntryInIndexedDB(repaired, { userId: user.value.id, synced: true })
    } catch {
      // non-fatal
    }
    logEntries.value = sortEntriesByDateAndOOOI(
      logEntries.value.map((e) => (e.id === entryId ? repaired : e))
    )
    inCloud = true
  }

  if (!inCloud) {
    return {
      ok: false,
      error:
        'Entry has not synced to the cloud yet. Stay online and retry from Settings → Data.',
    }
  }

  const markResult = await markSignaturePending(entryId, true, instructorId)
  if (!markResult.success) {
    return { ok: false, error: markResult.error }
  }

  const confirmResult = await confirmEntryPendingInCloud(entryId, instructorId)
  if (!confirmResult.success) {
    return { ok: false, error: confirmResult.error }
  }

  return { ok: true }
}

async function finalizeSaveWithSigningIntent(
  savedEntry: LogEntry,
  source: 'add' | 'edit'
): Promise<void> {
  const intent = pendingSaveSigningIntent.value
  pendingSaveSigningIntent.value = 'none'

  const needsSig =
    requiresInstructorSignature(savedEntry) && !isEntrySigned(savedEntry.id)

  if (!needsSig) {
    showToast(savedEntry.isVoid
        ? 'Entry voided — original remains in audit history'
        : source === 'edit'
          ? 'Entry updated'
          : 'Entry saved', { type: 'success', duration: 3000 })
    if (source === 'edit') closeInlineEditDrawer()
    clearFormSigningFields()
    return
  }

  if (intent === 'sign') {
    if (isGuestSignerSelected.value) {
      // Should have used 'guest' intent; fall through guard
      showToast('Use Sign with guest for fill-in instructors', { type: 'error' })
      prepareInlineEditFromEntry(savedEntry)
      return
    }
    showToast(source === 'edit' ? 'Entry updated' : 'Entry saved', { type: 'success', duration: 2000 })
    if (source === 'edit') {
      prepareInlineEditFromEntry(savedEntry)
    }
    const instructorId = signInstructorId.value
    const pin = signPin.value
    if (!instructorId || pin.trim().length < 4) {
      showToast('Instructor and PIN are required to Save & Sign', { type: 'error' })
      prepareInlineEditFromEntry(savedEntry)
      ensureDefaultSignInstructor()
      openSignatureFinishModal()
      return
    }
    isSubmittingSign.value = true
    try {
      if (isOnline.value) {
        await processQueue({ silent: true })
        // Brief wait for insert sync / data_hash when entry was just created
        await new Promise((r) => setTimeout(r, 400))
      }
      const result = await signLogEntry(savedEntry.id, instructorId, pin)
      if (!result.success) {
        showToast(result.error, { type: 'error' })
        prepareInlineEditFromEntry(savedEntry)
        openSignatureFinishModal()
        return
      }
      setLocalSignaturePending(savedEntry.id, false)
      if (user.value?.id) {
        const local = logEntries.value.find((e) => e.id === savedEntry.id)
        if (local) {
          try {
            await updateEntryInIndexedDB(
              { ...local, signaturePending: false },
              { userId: user.value.id }
            )
          } catch {
            // ignore
          }
        }
      }
      showToast('Entry saved and signed', { type: 'success' })
      clearFormSigningFields()
      closeInlineEditDrawer()
    } finally {
      isSubmittingSign.value = false
    }
    return
  }

  if (intent === 'guest_qr') {
    prepareInlineEditFromEntry(savedEntry)
    signInstructorId.value = GUEST_SIGNER_VALUE
    if (isOnline.value) {
      await processQueue({ silent: true })
      await new Promise((r) => setTimeout(r, 400))
    }
    if (!(await isEntryCloudSynced(savedEntry.id))) {
      showToast('Could not sync the entry for phone signing. Check your connection and try again.', { type: 'error', duration: 6000 })
      return
    }
    const ok = await createGuestSignQrSession(savedEntry.id)
    if (!ok) {
      showToast(guestQrError.value || 'Could not create phone signing session', { type: 'error', duration: 6000 })
    }
    return
  }

  if (intent === 'guest') {
    showToast(source === 'edit' ? 'Entry updated' : 'Entry saved', { type: 'success', duration: 2000 })
    if (source === 'edit') {
      prepareInlineEditFromEntry(savedEntry)
    }
    const blob = pendingGuestSignatureBlob.value
    pendingGuestSignatureBlob.value = null
    const name = guestSignerName.value.trim()
    if (!blob || !name) {
      showToast('Guest name and drawn signature are required', { type: 'error' })
      prepareInlineEditFromEntry(savedEntry)
      return
    }
    isSubmittingSign.value = true
    try {
      if (isOnline.value) {
        await processQueue({ silent: true })
        await new Promise((r) => setTimeout(r, 400))
      }
      const result = await guestSignLogEntry(
        savedEntry.id,
        name,
        guestCertificateNumber.value.trim() || null,
        blob
      )
      if (!result.success) {
        showToast(result.error, { type: 'error', duration: 6000 })
        prepareInlineEditFromEntry(savedEntry)
        return
      }
      setLocalSignaturePending(savedEntry.id, false)
      if (user.value?.id) {
        const local = logEntries.value.find((e) => e.id === savedEntry.id)
        if (local) {
          try {
            await updateEntryInIndexedDB(
              { ...local, signaturePending: false },
              { userId: user.value.id }
            )
          } catch {
            // ignore
          }
        }
      }
      showToast('Entry signed by guest instructor', { type: 'success' })
      clearFormSigningFields()
      closeInlineEditDrawer()
    } finally {
      isSubmittingSign.value = false
    }
    return
  }

  if (intent === 'later') {
    const instructorId = signInstructorId.value || savedEntry.pendingInstructorId
    const cloud = await ensureCloudPendingSignature(savedEntry.id, instructorId)
    if (!cloud.ok) {
      showToast(cloud.error, { type: 'error', duration: 6000 })
      prepareInlineEditFromEntry(savedEntry)
      return
    }
    showToast(source === 'edit' ? 'Entry updated — pending signature' : 'Entry saved — pending signature', { type: 'success', duration: 3000 })
    if (source === 'edit') {
      closeInlineEditDrawer()
    }
    clearFormSigningFields()
    return
  }

  // Dual entry but no intent (shouldn't happen with new buttons) — keep finish modal as fallback
  showToast(source === 'edit' ? 'Entry updated' : 'Entry saved', { type: 'success', duration: 3000 })
  prepareInlineEditFromEntry(savedEntry)
  ensureDefaultSignInstructor()
  if (isOnline.value) void processQueue({ silent: true })
  openSignatureFinishModal()
}

function clearFormSigningFields(): void {
  signPin.value = ''
  guestPadHasInk.value = false
  pendingGuestSignatureBlob.value = null
  inlineGuestPadRef.value?.clear()
  addGuestPadRef.value?.clear()
  // keep instructor / guest name selection for convenience across entries
}

async function submitEntryWithIntent(intent: 'sign' | 'later' | 'none' | 'guest'): Promise<void> {
  if (intent === 'guest') {
    if (!canSaveAndSignNewEntry.value || !isGuestSignerSelected.value) {
      showToast('Enter guest name and draw a signature to Sign with guest', { type: 'error' })
      return
    }
    const blob = await addGuestPadRef.value?.toBlob('image/png')
    if (!blob) {
      showToast('Draw a signature before signing', { type: 'error' })
      return
    }
    pendingGuestSignatureBlob.value = blob
    pendingSaveSigningIntent.value = 'guest'
    await submitEntry()
    return
  }
  if (intent === 'sign') {
    if (isGuestSignerSelected.value) {
      await submitEntryWithIntent('guest')
      return
    }
    if (!canSaveAndSignNewEntry.value) {
      if (activeInstructorsForSigning.value.length === 0) {
        showToast('Link an active instructor in Settings → Instructor Links, or choose Guest / fill-in', { type: 'error' })
      } else {
        showToast('Select an instructor and enter their PIN to Save & Sign', { type: 'error' })
      }
      return
    }
  }
  if (intent === 'later') {
    if (isGuestSignerSelected.value) {
      showToast('Guest instructors cannot use Save without Signing — use Sign with guest instead', { type: 'error' })
      return
    }
    if (activeInstructorsForSigning.value.length === 0) {
      showToast('Link an active instructor in Settings → Instructor Links first', { type: 'error' })
      return
    }
    if (!signInstructorId.value) {
      showToast('Select an instructor to Save without Signing', { type: 'error' })
      return
    }
  }
  pendingSaveSigningIntent.value = intent
  await submitEntry()
}

function onAddEntryFormSubmit(): void {
  if (newEntryNeedsSignature.value) {
    // Dual entries must use Save & Sign or Save without Signing explicitly
    return
  }
  void submitEntryWithIntent('none')
}

async function saveInlineEditWithIntent(intent: 'sign' | 'later' | 'none' | 'guest'): Promise<void> {
  if (intent === 'guest') {
    if (!canSaveAndSignInlineEntry.value || !isGuestSignerSelected.value) {
      showToast('Enter guest name and draw a signature to Sign with guest', { type: 'error' })
      return
    }
    const blob = await inlineGuestPadRef.value?.toBlob('image/png')
    if (!blob) {
      showToast('Draw a signature before signing', { type: 'error' })
      return
    }
    pendingGuestSignatureBlob.value = blob
    pendingSaveSigningIntent.value = 'guest'
    await saveInlineEdit()
    return
  }
  if (intent === 'sign') {
    if (isGuestSignerSelected.value) {
      await saveInlineEditWithIntent('guest')
      return
    }
    if (!canSaveAndSignInlineEntry.value) {
      if (activeInstructorsForSigning.value.length === 0) {
        showToast('Link an active instructor in Settings → Instructor Links, or choose Guest / fill-in', { type: 'error' })
      } else {
        showToast('Select an instructor and enter their PIN to Save & Sign', { type: 'error' })
      }
      return
    }
  }
  if (intent === 'later') {
    if (isGuestSignerSelected.value) {
      showToast('Guest instructors cannot use Save without Signing — use Sign with guest instead', { type: 'error' })
      return
    }
    if (activeInstructorsForSigning.value.length === 0) {
      showToast('Link an active instructor in Settings → Instructor Links first', { type: 'error' })
      return
    }
    if (!signInstructorId.value) {
      showToast('Select an instructor to Save without Signing', { type: 'error' })
      return
    }
  }
  pendingSaveSigningIntent.value = intent
  await saveInlineEdit()
}

function prepareInlineEditFromEntry(savedEntry: LogEntry): void {
  ensureIosCatalogIndex()
  closeAuditTrailSidebar()
  showSignEntryModal.value = false
  expandedEntryId.value = savedEntry.id
  const copy = JSON.parse(JSON.stringify(savedEntry)) as LogEntry
  copy.date = normalizeDateForInput(savedEntry.date)
  if (!copy.performance.approaches?.length) {
    copy.performance.approaches = getApproachesFromPerformance(copy.performance)
  }
  if (!Array.isArray(copy.tags)) copy.tags = []
  inlineEditEntry.value = copy
  const hasOOOITimes =
    !!copy.oooi &&
    !!(
      (copy.oooi.out && copy.oooi.out.trim()) ||
      (copy.oooi.off && copy.oooi.off.trim()) ||
      (copy.oooi.on && copy.oooi.on.trim()) ||
      (copy.oooi.in && copy.oooi.in.trim())
    )
  isInlineCommercialMode.value = hasOOOITimes
}

function cancelInlineEdit(): void {
  clearFormSigningFields()
  closeInlineEditDrawer()
}

const catalogOpenState = reactive<Record<CatalogKey, boolean>>({
  aircraft: true,
  airports: true,
  pilots: true,
  categoryClass: true
})
const isSidebarCollapsed = ref(false)
const isCatalogDrawerOpen = ref(false)
const catalogDrawerRef = ref<HTMLElement | null>(null)
const entryFormDrawerRef = ref<HTMLElement | null>(null)
const editEntryDrawerRef = ref<HTMLElement | null>(null)
const showSettingsModal = ref(false)
const settingsStack = ref<SettingsStackFrame[]>(['root'])
/** Sub-panes inside Settings → Pilot Profile (full-width each). */
const pilotProfileSubTab = ref<'profile' | 'stats'>('profile')
const show8710Fields = ref(false)

const settingsProfilePreview = computed(() => ({
  name: pilotProfile.name,
  callsign: pilotProfile.callsign,
  initials: getPilotInitialsFromName(pilotProfile.name),
}))

const settingsUpdatesBadge = computed(() => (showLatestBanner.value ? 'New' : undefined))

watch(settingsStack, (stack) => {
  const current = stack[stack.length - 1]
  if (current === 'profile') pilotProfileSubTab.value = 'profile'
})

const MIN_PASSWORD_LENGTH = 8
const showImportSection = ref(true)
const showExportSection = ref(true)
const showIdentDropdown = ref(false)
const showInlineIdentDropdown = ref(false)
const showAuditTrail = ref(false)
const auditTrailEntryId = ref<string | null>(null)
const showAuditTrailSidebar = ref(false)
const auditTrailRefreshKey = ref(0)

const activeAuditTrailEntryId = computed(() => {
  if (expandedEntryId.value) return expandedEntryId.value
  if (isEntryFormOpen.value && editingEntryId.value) return editingEntryId.value
  return null
})

const activeAuditTrailLocalEntry = computed(() => {
  const id = activeAuditTrailEntryId.value
  if (!id) return undefined
  if (expandedEntryId.value === id && inlineEditEntry.value) {
    return inlineEditEntry.value
  }
  return logEntries.value.find(e => e.id === id)
})

function closeAuditTrailSidebar(): void {
  showAuditTrailSidebar.value = false
}

function toggleAuditTrailSidebar(): void {
  if (!activeAuditTrailEntryId.value) return
  showAuditTrailSidebar.value = !showAuditTrailSidebar.value
}
const showFromDropdown = ref(false)
const showInlineFromDropdown = ref(false)
const showToDropdown = ref(false)
const showInlineToDropdown = ref(false)
const showPilotNameDropdown = ref(false)
const showInlinePilotNameDropdown = ref(false)
const tagsDropdownOpen = ref(false)
const showInlineTagsDropdown = ref(false)
const customTagInput = ref('')
const showSimSection = ref(false)
const customTagInputInline = ref('')
const showInlineCustomTagInput = ref(false)
const showNewEntryCustomTagInput = ref(false)

// Highlighted index for keyboard navigation
const highlightedIdentIndex = ref(-1)
const highlightedInlineIdentIndex = ref(-1)
const highlightedFromIndex = ref(-1)
const highlightedInlineFromIndex = ref(-1)
const highlightedToIndex = ref(-1)
const highlightedInlineToIndex = ref(-1)
const highlightedPilotIndex = ref(-1)
const highlightedInlinePilotIndex = ref(-1)
const { theme, isDark, setTheme } = useTheme()
const isDarkMode = isDark
const pilotProfile = reactive<PilotProfilePrefs>({ ...pilotProfileDefaults })

const activeConditionOptions = computed(() => {
  if (pilotProfile.enableMilitaryFields) {
    return [...conditionOptions, nvgConditionOption]
  }
  return [...conditionOptions]
})

const mainTimeFields = computed(() =>
  flightTimeFields.filter((f) => {
    if (f.key === 'ffs' || f.key === 'ftd' || f.key === 'atd') return false
    if (f.key === 'nvg' && !pilotProfile.enableMilitaryFields) return false
    return true
  })
)

const availableTotalsMetrics = computed(() => {
  if (!pilotProfile.enableMilitaryFields) return [...baseTotalsMetrics]
  const metrics: { key: TotalsMetricKey; label: string }[] = [...baseTotalsMetrics]
  const nightIdx = metrics.findIndex((m) => m.key === 'nightTime')
  metrics.splice(nightIdx + 1, 0, { key: 'nvgTime', label: 'NVG Time (hrs)' })
  return metrics
})

const simOverviewFields = computed((): { key: TotalsMetricKey; label: string }[] => {
  const fields: { key: TotalsMetricKey; label: string }[] = [
    { key: 'totalTime', label: 'Total Time (hrs)' },
    { key: 'instrumentTime', label: 'Instrument Time (hrs)' }
  ]
  if (pilotProfile.enableMilitaryFields) {
    fields.push(
      { key: 'nightTime', label: 'Night Time (hrs)' },
      { key: 'nvgTime', label: 'NVG Time (hrs)' }
    )
  }
  fields.push({ key: 'dualReceived', label: 'Dual Received (hrs)' })
  return fields
})
const pilotProfileLoaded = ref(false)
const csvFileInput = ref<HTMLInputElement | null>(null)

// Form 8710 state
const showForm8710Modal = ref(false)
const showCurrencyDashboard = ref(false)
const showDashboardImportModal = ref(false)

function openDigifiFromEmptyState(): void {
  showDashboardImportModal.value = false
  if (isIos.value) {
    void router.push('/digifi-eye')
  } else {
    void router.push({ path: '/logbook-builder', query: { digifi: 'open' } })
  }
}

function onDashboardImportProviderFile(payload: { file: File; provider: ImportProviderKey }): void {
  showDashboardImportModal.value = false
  void handleSettingsProviderImportFile(payload)
}

function onDashboardImportRequestTransfer(): void {
  showDashboardImportModal.value = false
  openSettings('data')
}
const showForm8710View = ref(false)
const form8710PreviewData = ref<Form8710Data | null>(null)
const form8710Warnings = computed<string[]>(() => {
  const warnings: string[] = []
  
  // Section I validation (pilot profile)
  if (!pilotProfile.name) warnings.push('Name is missing in Pilot Profile')
  if (!pilotProfile.dateOfBirth) warnings.push('Date of Birth is missing in Pilot Profile')
  if (!pilotProfile.placeOfBirth) warnings.push('Place of Birth is missing in Pilot Profile')
  if (!pilotProfile.residentialAddress) warnings.push('Residential Address is missing in Pilot Profile')
  
  // Data completeness validation
  if (logEntries.value.length === 0) {
    warnings.push('No logbook entries found. Form 8710 requires at least one entry.')
    return warnings
  }
  
  // Check for entries with valid flight time
  const entriesWithTime = logEntries.value.filter(e => 
    e.flightTime?.total && e.flightTime.total > 0
  )
  
  if (entriesWithTime.length === 0) {
    warnings.push('No entries with valid flight time found. All entries have zero total time.')
  }
  
  // Check for entries with missing critical fields (sim-only entries don't require aircraft/ident)
  const entriesWithMissingFields = logEntries.value.filter(e => {
    if (!e.date) return true
    if (isLoggingSimTime(e)) return false // simulator time: date (and sim type) are enough
    return !e.aircraftCategoryClass || !e.registration
  })
  
  if (entriesWithMissingFields.length > 0) {
    warnings.push(`${entriesWithMissingFields.length} entr${entriesWithMissingFields.length === 1 ? 'y' : 'ies'} missing critical fields (date, category/class, or registration)`)
  }
  
  // Check for entries that couldn't be mapped to 8710 categories
  const unmappedEntries = logEntries.value.filter(e => {
    if (isTrainingDevice(e)) return false // Training devices are handled separately
    const category = mapCategoryTo8710(e.aircraftCategoryClass)
    return !category
  })
  
  if (unmappedEntries.length > 0) {
    warnings.push(`${unmappedEntries.length} entr${unmappedEntries.length === 1 ? 'y' : 'ies'} could not be mapped to Form 8710 categories`)
  }
  
  // Check date range issues
  const dates = logEntries.value
    .map(e => e.date)
    .filter(d => d)
    .map(d => new Date(d))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())
  
  if (dates.length > 0) {
    const now = new Date()
    const futureDates = dates.filter(d => d > now)
    if (futureDates.length > 0) {
      warnings.push(`${futureDates.length} entr${futureDates.length === 1 ? 'y has' : 'ies have'} future dates`)
    }
    
    // Check for unreasonable date ranges (more than 100 years)
    const oldestDate = dates[0]!
    const newestDate = dates[dates.length - 1]!
    const yearsDiff = (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    if (yearsDiff > 100) {
      warnings.push(`Date range spans ${yearsDiff.toFixed(1)} years, which may indicate data quality issues`)
    }
  }
  
  return warnings
})
const jsonFileInput = ref<HTMLInputElement | null>(null)
const isDragOverImport = ref(false)

// Import preview state
interface ImportStatistics {
  totalEntries: number
  duplicates: number
  errors: number
  totalFlightTime: number
  picTime: number
  sicTime: number
  nightTime: number
  nvgTime: number
  crossCountryTime: number
  actualInstrumentTime: number
  simulatedInstrumentTime: number
  dualReceivedTime: number
  dualGivenTime: number
  soloTime: number
  ffsTime: number
  ftdTime: number
  atdTime: number
  totalLandings: number
  dayLandings: number
  nightLandings: number
  totalApproaches: number
  aircraftBreakdown: Record<string, number>
  dateRange: { earliest: string | null; latest: string | null }
  errorMessages: string[]
  duplicateEntries: Array<{ entry: LogEntry; matches: LogEntry[] }>
}

interface ImportMetadata {
  fileName: string
  fileType: 'CSV' | 'TSV' | 'JSON'
  importedAt: string
  detectedSource?: string
  selectedProvider?: string | null
  bridgeWarnings?: string[]
}

interface ExportStatistics {
  totalEntries: number
  totalFlightTime: number
  picTime: number
  sicTime: number
  nightTime: number
  crossCountryTime: number
  actualInstrumentTime: number
  simulatedInstrumentTime: number
  dualReceivedTime: number
  dualGivenTime: number
  soloTime: number
  totalLandings: number
  dayLandings: number
  nightLandings: number
  totalApproaches: number
  aircraftBreakdown: Record<string, number>
  dateRange: { earliest: string | null; latest: string | null }
}

function calculateExportStatistics(entries: LogEntry[]): ExportStatistics {
  const aircraftBreakdown: Record<string, number> = {}
  let totalFlightTime = 0
  let picTime = 0
  let sicTime = 0
  let nightTime = 0
  let crossCountryTime = 0
  let actualInstrumentTime = 0
  let simulatedInstrumentTime = 0
  let dualReceivedTime = 0
  let dualGivenTime = 0
  let soloTime = 0
  let totalLandings = 0
  let dayLandings = 0
  let nightLandings = 0
  let totalApproaches = 0
  const dates: string[] = []
  for (const entry of entries) {
    dates.push(entry.date || '')
    totalFlightTime += entry.flightTime.total ?? 0
    picTime += entry.flightTime.pic ?? 0
    sicTime += entry.flightTime.sic ?? 0
    nightTime += entry.flightTime.night ?? 0
    crossCountryTime += entry.flightTime.crossCountry ?? 0
    actualInstrumentTime += entry.flightTime.actualInstrument ?? 0
    simulatedInstrumentTime += entry.flightTime.simulatedInstrument ?? 0
    dualReceivedTime += entry.flightTime.dual ?? 0
    dualGivenTime += entry.flightTime.dualGiven ?? 0
    soloTime += entry.flightTime.solo ?? 0
    dayLandings += entry.performance.dayLandings ?? 0
    nightLandings += entry.performance.nightLandings ?? 0
    totalLandings += (entry.performance.dayLandings ?? 0) + (entry.performance.nightLandings ?? 0)
    totalApproaches += getTotalApproachCount(entry.performance)
    const aircraftKey = `${entry.aircraftMakeModel || 'Unknown'} (${entry.registration || ''})`
    aircraftBreakdown[aircraftKey] = (aircraftBreakdown[aircraftKey] || 0) + 1
  }
  dates.sort()
  const earliest = dates.length > 0 ? (dates[0] || null) : null
  const latest = dates.length > 0 ? (dates[dates.length - 1] || null) : null
  return {
    totalEntries: entries.length,
    totalFlightTime,
    picTime,
    sicTime,
    nightTime,
    crossCountryTime,
    actualInstrumentTime,
    simulatedInstrumentTime,
    dualReceivedTime,
    dualGivenTime,
    soloTime,
    totalLandings,
    dayLandings,
    nightLandings,
    totalApproaches,
    aircraftBreakdown,
    dateRange: { earliest, latest }
  }
}

type ImportPreviewStatsKey =
  | 'totalFlightTime'
  | 'picTime'
  | 'sicTime'
  | 'dualReceivedTime'
  | 'soloTime'
  | 'nightTime'
  | 'nvgTime'
  | 'actualInstrumentTime'
  | 'simulatedInstrumentTime'
  | 'dualGivenTime'
  | 'crossCountryTime'
  | 'ffsTime'
  | 'ftdTime'
  | 'atdTime'

const importPreviewTimeFields: { key: FlightTimeKey; label: string; statsKey: ImportPreviewStatsKey }[] = [
  { key: 'total', label: 'Total', statsKey: 'totalFlightTime' },
  { key: 'pic', label: 'PIC', statsKey: 'picTime' },
  { key: 'sic', label: 'SIC', statsKey: 'sicTime' },
  { key: 'dual', label: 'Dual Received', statsKey: 'dualReceivedTime' },
  { key: 'solo', label: 'Solo', statsKey: 'soloTime' },
  { key: 'night', label: 'Night', statsKey: 'nightTime' },
  { key: 'nvg', label: 'NVG', statsKey: 'nvgTime' },
  { key: 'actualInstrument', label: 'Actual', statsKey: 'actualInstrumentTime' },
  { key: 'simulatedInstrument', label: 'Hood', statsKey: 'simulatedInstrumentTime' },
  { key: 'dualGiven', label: 'Dual Given', statsKey: 'dualGivenTime' },
  { key: 'crossCountry', label: 'XC', statsKey: 'crossCountryTime' },
  { key: 'ffs', label: 'FFS', statsKey: 'ffsTime' },
  { key: 'ftd', label: 'FTD', statsKey: 'ftdTime' },
  { key: 'atd', label: 'ATD', statsKey: 'atdTime' },
]

const showImportPreview = ref(false)
/** Every normalized row from the file — used for Import All. */
const importPreviewAllEntries = ref<LogEntry[]>([])
/** Non-duplicate rows (+ error rows) for legacy list helpers. */
const importPreviewEntries = ref<LogEntry[]>([])
const importPreviewStatistics = ref<ImportStatistics | null>(null)
const importPreviewMetadata = ref<ImportMetadata | null>(null)
/** Validation errors from preview, keyed by entry id — used on commit without re-validating. */
const importPreviewValidationErrors = ref<Map<string, string>>(new Map())
/** True while parsing a file or committing an import (blocks UI; shows overlay). */
const importBusy = ref(false)
const importBusyLabel = ref('Importing…')

const IMPORT_UI_YIELD_EVERY = 50
const IMPORT_INSERT_BATCH = 100

async function yieldToImportUi(): Promise<void> {
  await new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
    } else {
      setTimeout(resolve, 0)
    }
  })
}

function setImportBusy(label: string): void {
  importBusy.value = true
  importBusyLabel.value = label
}

function clearImportBusy(): void {
  importBusy.value = false
  importBusyLabel.value = 'Importing…'
}

const importPreviewTimeCards = computed(() => {
  const stats = importPreviewStatistics.value
  if (!stats) return []
  return importPreviewTimeFields
    .map(f => ({ label: f.label, hours: stats[f.statsKey] ?? 0 }))
    .filter(c => c.hours > 0)
})

const importPreviewToImportCount = computed(() => {
  const stats = importPreviewStatistics.value
  if (!stats) return 0
  return stats.totalEntries - stats.duplicates - stats.errors
})

const importPreviewListItems = computed(() => {
  const stats = importPreviewStatistics.value
  if (!stats) return []
  const items: { entry: LogEntry; status: 'new' | 'duplicate' }[] = importPreviewEntries.value.map(
    entry => ({ entry, status: 'new' as const })
  )
  for (const dup of stats.duplicateEntries) {
    items.push({ entry: dup.entry, status: 'duplicate' })
  }
  return items
})

function entryNonZeroTimeFields(entry: LogEntry): { label: string; hours: number }[] {
  return importPreviewTimeFields
    .map(f => ({ label: f.label, hours: entry.flightTime[f.key] ?? 0 }))
    .filter(t => t.hours > 0)
}
const expandedPreviewEntries = ref<Set<string>>(new Set())
const importDuplicatesFlagged = ref(false)
const importWithErrors = ref(false)
const importSimTypeOverrides = ref<Record<string, SimTypeKey>>({})
const importSimRememberDevice = ref<Record<string, boolean>>({})

function importPreviewSimDeviceKey(entry: LogEntry): string {
  return `${normalizeAircraftFamily(entry.aircraftMakeModel)}|${(entry.registration || '').toUpperCase()}`
}

const importPreviewSimDevices = computed(() => {
  const devices: Array<{ key: string; makeModel: string; registration: string }> = []
  const seen = new Set<string>()
  for (const entry of importPreviewAllEntries.value) {
    if (inferLogbookType(entry) !== 'simulator') continue
    const key = importPreviewSimDeviceKey(entry)
    if (seen.has(key)) continue
    seen.add(key)
    devices.push({
      key,
      makeModel: entry.aircraftMakeModel,
      registration: entry.registration,
    })
  }
  return devices
})

function initImportSimTypeOverrides(): void {
  const overrides: Record<string, SimTypeKey> = {}
  const remember: Record<string, boolean> = {}
  for (const device of importPreviewSimDevices.value) {
    overrides[device.key] = getCatalogSimDeviceType(device.makeModel) ?? 'ATD'
    remember[device.key] = true
  }
  importSimTypeOverrides.value = overrides
  importSimRememberDevice.value = remember
}
const showDuplicateOverrideDialog = ref(false)

// Export dialog state (trust-first export: scope + preview)
const showExportDialog = ref(false)
type ExportScopeType = 'all' | 'month' | 'dateRange' | 'aircraft'
const exportScope = ref<ExportScopeType>('all')
const exportNow = new Date()
const exportMonth = ref({ year: exportNow.getFullYear(), month: exportNow.getMonth() + 1 })
const exportDateStart = ref('')
const exportDateEnd = ref('')
const exportSelectedAircraft = ref<string[]>([])
const expandedExportPreviewEntries = ref<Set<string>>(new Set())
const exportDestination = ref<ExportDestination>('logifi-native')

const exportDestinationHint = computed(
  () => EXPORT_DESTINATION_HINTS[exportDestination.value]
)

function applyExportScope(
  entries: LogEntry[],
  scope: ExportScopeType,
  month: { year: number; month: number },
  dateStart: string,
  dateEnd: string,
  selectedAircraft: string[]
): LogEntry[] {
  if (scope === 'all') return entries
  if (scope === 'month') {
    const [y, m] = [month.year, month.month]
    return entries.filter((e) => {
      const match = (e.date || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
      if (!match) return false
      const ey = parseInt(match[1]!, 10)
      const em = parseInt(match[2]!, 10)
      return ey === y && em === m
    })
  }
  if (scope === 'dateRange') {
    const start = (dateStart || '').trim()
    const end = (dateEnd || '').trim()
    if (!start || !end) return []
    return entries.filter((e) => {
      const d = (e.date || '').trim()
      return d >= start && d <= end
    })
  }
  if (scope === 'aircraft') {
    if (selectedAircraft.length === 0) return []
    const set = new Set(selectedAircraft.map((r) => (r || '').trim().toUpperCase()))
    return entries.filter((e) => set.has((e.registration || '').trim().toUpperCase()))
  }
  return entries
}

const uniqueAircraftForExport = computed(() => {
  const seen = new Set<string>()
  const list: { registration: string; label: string }[] = []
  for (const e of logEntries.value) {
    const reg = (e.registration || '').trim().toUpperCase()
    if (!reg || seen.has(reg)) continue
    seen.add(reg)
    list.push({
      registration: reg,
      label: `${e.aircraftMakeModel || 'Unknown'} (${reg})`
    })
  }
  list.sort((a, b) => a.label.localeCompare(b.label))
  return list
})

const exportFilteredEntries = computed(() =>
  applyExportScope(
    logEntries.value,
    exportScope.value,
    exportMonth.value,
    exportDateStart.value,
    exportDateEnd.value,
    exportSelectedAircraft.value
  )
)

const exportPreviewStatistics = computed<ExportStatistics | null>(() => {
  const entries = exportFilteredEntries.value
  if (entries.length === 0) return null
  return calculateExportStatistics(entries)
})

function toggleExportPreviewEntry(id: string) {
  const set = new Set(expandedExportPreviewEntries.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  expandedExportPreviewEntries.value = set
}

function openExportDialog() {
  exportScope.value = 'all'
  const n = new Date()
  exportMonth.value = { year: n.getFullYear(), month: n.getMonth() + 1 }
  exportDateStart.value = ''
  exportDateEnd.value = ''
  exportSelectedAircraft.value = []
  expandedExportPreviewEntries.value = new Set()
  exportDestination.value = 'logifi-native'
  showExportDialog.value = true
}

function closeExportDialog() {
  showExportDialog.value = false
}

function getExportFilenameSegment(): string {
  const scope = exportScope.value
  if (scope === 'all') return ''
  if (scope === 'month') {
    const { year, month } = exportMonth.value
    return `-${year}-${String(month).padStart(2, '0')}`
  }
  if (scope === 'dateRange' && exportDateStart.value && exportDateEnd.value) {
    return `-${exportDateStart.value}-to-${exportDateEnd.value}`
  }
  if (scope === 'aircraft' && exportSelectedAircraft.value.length > 0) {
    const regs = exportSelectedAircraft.value
    if (regs.length === 1) return `-${regs[0]}`
    return '-filtered'
  }
  return ''
}

const pilotInitials = computed(() =>
  getDisplayedPilotInitials(pilotProfile.name, pilotProfileLoaded.value)
)
// Catalog filters
const selectedFilters = reactive({
  aircraft: {} as Record<string, boolean>, // key: tail (e.g., N123AB)
  airports: {} as Record<string, boolean>, // key: code (e.g., KPAO)
  pilots: {} as Record<string, boolean>,   // key: name string
  conditions: {} as Record<string, boolean>, // key: condition value (e.g., 'ifr', 'nightVfr')
  families: {} as Record<string, boolean>, // key: normalized aircraft family (e.g., 'C172', 'PA-28')
  categoryClass: {} as Record<string, boolean>, // key: category/class (e.g., 'ASEL', 'AMEL')
  flagged: false, // filter for flagged entries
  tags: {} as Record<string, boolean> // key: tag label (e.g., 'Checkride', 'IPC')
})

const activeCatalogFilterCount = computed(() => (
  Object.values(selectedFilters.aircraft).filter(Boolean).length +
  Object.values(selectedFilters.airports).filter(Boolean).length +
  Object.values(selectedFilters.pilots).filter(Boolean).length +
  Object.values(selectedFilters.conditions).filter(Boolean).length +
  Object.values(selectedFilters.families).filter(Boolean).length +
  Object.values(selectedFilters.categoryClass).filter(Boolean).length +
  Object.values(selectedFilters.tags).filter(Boolean).length +
  (selectedFilters.flagged ? 1 : 0)
))

const catalogSearchTerms = reactive<Record<CatalogKey, string>>({
  aircraft: '',
  airports: '',
  pilots: '',
  categoryClass: '',
})
// Aircraft family section open/closed state
const familyOpenState = reactive<Record<string, boolean>>({})
// Totals time filter
type TotalsTimeMode = 'all' | '30' | '60' | 'custom'
const totalsTimeMode = ref<TotalsTimeMode>('all')
const totalsCustomStart = ref<string>('')
const totalsCustomEnd = ref<string>('')

type TotalsDateRange = { start: Date | null; end: Date | null }

/** Date window from Totals Overview controls; null means no date filter (all time). */
function getTotalsDateRange(): TotalsDateRange | null {
  const mode = totalsTimeMode.value
  const nowDate = new Date()
  if (mode === '30') {
    return {
      start: new Date(nowDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      end: nowDate,
    }
  }
  if (mode === '60') {
    return {
      start: new Date(nowDate.getTime() - 60 * 24 * 60 * 60 * 1000),
      end: nowDate,
    }
  }
  if (mode === 'custom') {
    let start: Date | null = null
    let end: Date | null = null
    if (totalsCustomStart.value) {
      start = new Date(totalsCustomStart.value)
    }
    if (totalsCustomEnd.value) {
      end = new Date(totalsCustomEnd.value)
      end.setHours(23, 59, 59, 999)
    }
    if (!start && !end) return null
    return { start, end }
  }
  return null
}

function entryMatchesTotalsDateRange(entry: LogEntry, range: TotalsDateRange): boolean {
  const d = new Date(entry.date)
  if (Number.isNaN(d.getTime())) return false
  if (range.start && d < range.start) return false
  if (range.end && d > range.end) return false
  return true
}

const dateRangeFilterSummary = computed(() => {
  const mode = totalsTimeMode.value
  if (mode === '30') return 'Last 30 days'
  if (mode === '60') return 'Last 60 days'
  if (mode !== 'custom') return null
  const start = totalsCustomStart.value
  const end = totalsCustomEnd.value
  if (!start && !end) return null
  if (start && end) return `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`
  if (start) return `From ${formatDisplayDate(start)}`
  return `Through ${formatDisplayDate(end)}`
})

// Clock
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

function setClockFormat(fmt: ClockFormat): void {
  clockFormat.value = fmt
  if (isBrowser) {
    window.localStorage.setItem('logifi-clock-format', fmt)
  }
}

function setClockZone(zone: ClockZone): void {
  clockZone.value = zone
  if (isBrowser) {
    window.localStorage.setItem('logifi-clock-zone', zone)
  }
}

function loadClockPrefs(): void {
  if (!isBrowser) return
  const savedFmt = window.localStorage.getItem('logifi-clock-format')
  const savedZone = window.localStorage.getItem('logifi-clock-zone')
  if (savedFmt === '12' || savedFmt === '24') {
    clockFormat.value = savedFmt
  }
  if (savedZone === 'UTC' || savedZone === 'Local') {
    clockZone.value = savedZone
  }
}

function handleExportCsv(entries?: LogEntry[]): void {
  const list = entries ?? logEntries.value
  if (list.length === 0) return

  const baseDate = new Date().toISOString().split('T')[0] ?? ''
  const segment = entries != null ? getExportFilenameSegment() : ''
  const options = { baseDate, filenameSegment: segment }

  let result
  switch (exportDestination.value) {
    case 'foreflight':
      result = logbookDataBridgeService.exportToForeFlight(list, options)
      break
    case 'myflightbook':
      result = logbookDataBridgeService.exportToMyFlightbook(list, options)
      break
    case 'logten':
      result = logbookDataBridgeService.exportToLogTenPro(list, options)
      break
    case 'generic':
      result = logbookDataBridgeService.exportToGenericCSV(list, options)
      break
    default:
      result = logbookDataBridgeService.exportToLogifiNative(list, options)
      break
  }

  downloadExport(result)
}

async function exportToJSON(entries?: LogEntry[]): Promise<void> {
  const list = entries ?? logEntries.value
  if (list.length === 0) return

  const baseDate = new Date().toISOString().split('T')[0]
  const segment = entries != null ? getExportFilenameSegment() : ''
  const filename = `logifi-logbook-${baseDate}${segment}.json`

  // Use the export composable to prepare entries with audit trail
  const { prepareEntriesForExport } = useExport()

  try {
    // Prepare entries with audit trail
    const preparedEntries = await prepareEntriesForExport(
      list,
      true // include audit trail
    )
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.1',
      pilotProfile: pilotProfileLoaded.value ? { ...pilotProfile } : null,
      entries: preparedEntries
    }
    
    const jsonContent = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting JSON:', error)
    // Fallback: export without audit trail if there's an error
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.1',
      pilotProfile: pilotProfileLoaded.value ? { ...pilotProfile } : null,
      entries: list.map((entry) => {
        const baseEntry: any = {
          id: entry.id,
          date: entry.date,
          role: entry.role,
          aircraftCategoryClass: entry.aircraftCategoryClass,
          aircraftMakeModel: entry.aircraftMakeModel,
          registration: entry.registration,
          departure: entry.departure,
          destination: entry.destination,
          route: entry.route,
          trainingElements: entry.trainingElements,
          trainingInstructor: entry.trainingInstructor,
          instructorCertificate: entry.instructorCertificate,
          picName: entry.picName ?? null,
          sicName: entry.sicName ?? null,
          flightConditions: entry.flightConditions,
          remarks: entry.remarks,
          flightTime: entry.flightTime,
          performance: entry.performance,
          oooi: entry.oooi,
          flagged: entry.flagged
        }
        
        // Add metadata if available
        if (entry.isImported !== undefined || entry.importSource || entry.importBatchId || entry.originalEntryDate || entry.importMetadata) {
          baseEntry.metadata = {
            isImported: entry.isImported || false,
            importSource: entry.importSource || null,
            importBatchId: entry.importBatchId || null,
            originalEntryDate: entry.originalEntryDate || null,
            importMetadata: entry.importMetadata || null
          }
        }
        
        // Add integrity fields if available
        if (entry.version !== undefined || entry.dataHash || entry.createdAt || entry.updatedAt) {
          baseEntry.integrity = {
            version: entry.version || null,
            dataHash: entry.dataHash || null,
            createdAt: entry.createdAt || null,
            updatedAt: entry.updatedAt || null
          }
        }
        
        baseEntry.auditTrail = []
        
        return baseEntry
      })
    }
    
    const jsonContent = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

// Form 8710 generation functions
function prepareForm8710Data(): Form8710Data | null {
  try {
    // Calculate sections
    const sectionII = calculateSectionII(logEntries.value)
    const sectionIII = calculateSectionIII(logEntries.value)

    // Build Section I from pilot profile
    const sectionI = {
      name: pilotProfile.name || '',
      dateOfBirth: pilotProfile.dateOfBirth || '',
      placeOfBirth: pilotProfile.placeOfBirth || '',
      residentialAddress: pilotProfile.residentialAddress || '',
      residentialCity: pilotProfile.residentialCity || '',
      residentialState: pilotProfile.residentialState || '',
      residentialZip: pilotProfile.residentialZip || '',
      mailingAddress: pilotProfile.mailingAddress || undefined,
      mailingCity: pilotProfile.mailingCity || undefined,
      mailingState: pilotProfile.mailingState || undefined,
      mailingZip: pilotProfile.mailingZip || undefined,
      certificateNumber: pilotProfile.certificateNumber || undefined
    }

    // Collect compliance metadata: verify imported entries and gather import batch info
    const totalEntries = logEntries.value.length
    const importedEntries = logEntries.value.filter(e => e.isImported).length
    const manualEntries = totalEntries - importedEntries

    // Group entries by import batch
    const batchMap = new Map<string, {
      batchId?: string
      sourceType: string
      entries: typeof logEntries.value
    }>()

    // Group imported entries by batch
    logEntries.value.forEach(entry => {
      if (entry.isImported && entry.importSource) {
        const batchKey = entry.importBatchId || `manual-${entry.importSource}`
        if (!batchMap.has(batchKey)) {
          batchMap.set(batchKey, {
            batchId: entry.importBatchId,
            sourceType: entry.importSource,
            entries: []
          })
        }
        batchMap.get(batchKey)!.entries.push(entry)
      }
    })

    // Build import batches array with date ranges
    const importBatches: ComplianceMetadata['importBatches'] = Array.from(batchMap.values()).map(batch => {
      const dates = batch.entries
        .map(e => e.date)
        .filter(d => d)
        .sort()
      
      const dateRange = dates.length > 0 ? {
        start: dates[0]!,
        end: dates[dates.length - 1]!
      } : undefined

      // Try to get import date from metadata
      const firstEntry = batch.entries[0]
      const importedAt = firstEntry?.importMetadata?.importedAt || 
                        firstEntry?.importMetadata?.importDate ||
                        undefined

      return {
        batchId: batch.batchId,
        sourceType: batch.sourceType,
        entryCount: batch.entries.length,
        dateRange,
        importedAt
      }
    })

    // If there are manual entries, add them as a separate "batch"
    if (manualEntries > 0) {
      const manualDates = logEntries.value
        .filter(e => !e.isImported)
        .map(e => e.date)
        .filter(d => d)
        .sort()
      
      if (manualDates.length > 0) {
        importBatches.push({
          sourceType: 'manual',
          entryCount: manualEntries,
          dateRange: {
            start: manualDates[0]!,
            end: manualDates[manualDates.length - 1]!
          }
        })
      } else {
        importBatches.push({
          sourceType: 'manual',
          entryCount: manualEntries
        })
      }
    }

    const complianceMetadata: ComplianceMetadata = {
      totalEntries,
      importedEntries,
      manualEntries,
      importBatches
    }

    return {
      sectionI,
      sectionII,
      sectionIII,
      complianceMetadata
    }
  } catch (error) {
    console.error('Error preparing 8710 form data:', error)
    return null
  }
}

// Helper functions for form display
const recentExperiencePeriods = computed<Array<{ key: 'last6Months' | 'last12Months' | 'last24Months' | 'allTime'; label: string }>>(() => [
  { key: 'last6Months', label: 'Last 6 Months' },
  { key: 'last12Months', label: 'Last 12 Months' },
  { key: 'last24Months', label: 'Last 24 Months' },
  { key: 'allTime', label: 'All Time' }
])

function formatTime(hours: number): string {
  if (hours === 0) return '—'
  return hours.toFixed(1)
}

function buildAddress(sectionI: Form8710Data['sectionI'] | undefined, type: 'residential' | 'mailing'): string {
  if (!sectionI) return ''
  
  if (type === 'residential') {
    const parts = [
      sectionI.residentialAddress,
      sectionI.residentialCity,
      sectionI.residentialState,
      sectionI.residentialZip
    ].filter(Boolean)
    return parts.join(', ')
  } else {
    const parts = [
      sectionI.mailingAddress,
      sectionI.mailingCity,
      sectionI.mailingState,
      sectionI.mailingZip
    ].filter(Boolean)
    return parts.join(', ')
  }
}

function hasMailingAddress(sectionI: Form8710Data['sectionI'] | undefined): boolean {
  if (!sectionI) return false
  return !!(sectionI.mailingAddress || sectionI.mailingCity || sectionI.mailingState || sectionI.mailingZip)
}

function printForm8710(): void {
  window.print()
}

function getCategoryDisplayName(category: AircraftCategory8710): string {
  const labels: Record<AircraftCategory8710, string> = {
    'airplane-sel': 'Airplane SEL',
    'airplane-mel': 'Airplane MEL',
    'airplane-ses': 'Airplane SES',
    'airplane-mes': 'Airplane MES',
    'rotorcraft-heli': 'Rotorcraft Helicopter',
    'rotorcraft-gyro': 'Rotorcraft Gyroplane',
    'glider': 'Glider',
    'lta-balloon': 'LTA Balloon',
    'lta-airship': 'LTA Airship',
    'powered-lift': 'Powered Lift',
    'ffs': 'Full Flight Simulator',
    'ftd': 'Flight Training Device',
    'atd': 'Aviation Training Device'
  }
  return labels[category] || category
}

// Watch for modal open to calculate preview data
watch(showForm8710Modal, (isOpen) => {
  if (isOpen) {
    const formData = prepareForm8710Data()
    form8710PreviewData.value = formData
  }
})

// Import functions — CSV parsing delegated to logbookDataBridge

// Convert a name string to proper title case (e.g., "CHASE ALBRIGHT" -> "Chase Albright")
function toTitleCase(str: string): string {
  if (!str || !str.trim()) return str
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Helper function to check if a name matches the logged-in user
function isUserName(name: string): boolean {
  if (!name || !name.trim()) return false
  const userName = (pilotProfile.name || '').trim()
  if (!userName) return false
  return name.trim().toLowerCase() === userName.toLowerCase()
}

// Extract base aircraft model name from full model string
// Examples: "C-172 S G-1000, Cessna Skyhawk SP" -> "C-172"
//           "PA-28-181 Archer II" -> "PA-28"
//           "SR-22T G6" -> "SR-22"
function extractBaseModelName(model: string): string {
  if (!model || !model.trim()) return ''
  
  const trimmed = model.trim()
  
  // Common aircraft model patterns: [Letter(s)]-[Number(s)]
  // Match patterns like: C-172, PA-28, SR-22, BE-58, DA-42, etc.
  const modelPattern = /^([A-Z]{1,3})-(\d{2,4})/i
  
  const match = trimmed.match(modelPattern)
  if (match && match[1] && match[2]) {
    // Found pattern like C-172, PA-28, etc.
    return `${match[1].toUpperCase()}-${match[2]}`
  }
  
  // Fallback: take everything before the first comma
  const commaIndex = trimmed.indexOf(',')
  if (commaIndex > 0) {
    const beforeComma = trimmed.substring(0, commaIndex).trim()
    // Try to extract base model from this part
    const fallbackMatch = beforeComma.match(modelPattern)
    if (fallbackMatch && fallbackMatch[1] && fallbackMatch[2]) {
      return `${fallbackMatch[1].toUpperCase()}-${fallbackMatch[2]}`
    }
    // If no pattern found, return first part before comma (but limit length)
    const parts = beforeComma.split(/\s+/)
    if (parts.length > 0 && parts[0] && parts[0].length <= 20) {
      return parts[0]
    }
  }
  
  // Last resort: return first word if it looks like a model (has dash or is short)
  const words = trimmed.split(/\s+/)
  const firstWord = words[0]
  if (firstWord && (firstWord.includes('-') || firstWord.length <= 10)) {
    return firstWord
  }
  
  return trimmed
}

function getImporterPilotName(): string {
  const fromProfile = (pilotProfile.name || '').trim()
  if (fromProfile) return fromProfile
  const meta = user.value?.user_metadata as Record<string, unknown> | undefined
  const fromMeta = typeof meta?.full_name === 'string' ? meta.full_name.trim() : ''
  return fromMeta
}

async function normalizeImportedEntry(
  rawEntry: Record<string, any>,
  source?: BridgeSource
): Promise<LogEntry | null> {
  try {
    const entry = mapRawRowToLogEntry(rawEntry, { generateId: generateEntryId, source })
    if (!entry) return null

    const isLogtenDynamic = isLogtenDynamicExportHeaders(Object.keys(rawEntry))
    const importerName = getImporterPilotName()

    if (isLogtenDynamic) {
      enrichLogtenDynamicExportRow(entry, rawEntry, importerName)
    }

    // Reset total for LogTen OOOI-derived block time (calculated below)
    const hasLogtenNativeKeys = !!findFieldValue(rawEntry, [
      'flight_flightDate',
      'flight_flightdate',
    ])
    const hasLogtenOOOI = !!(
      findFieldValue(rawEntry, ['flight_actualDepartureTime']) ||
      findFieldValue(rawEntry, ['flight_actualArrivalTime'])
    )
    if (hasLogtenOOOI) {
      entry.flightTime.total = null
    }

    // Parse flight conditions
    const conditionsStr = rawEntry['Flight Conditions'] || rawEntry.flightConditions || ''
    if (conditionsStr) {
      entry.flightConditions = sanitizeFlightConditions(
        conditionsStr.split(';').map((c: string) => c.trim()).filter((c: string) => c)
      )
    }
    
    // Parse OOOI times — native LogTen keys, Dynamic Export columns, or generic Out/In
    const logtenOut = findFieldValue(rawEntry, ['flight_actualDepartureTime'])
    const logtenIn = findFieldValue(rawEntry, ['flight_actualArrivalTime'])
    const isLogtenImport = !!(logtenOut || logtenIn || hasLogtenNativeKeys)
    
    const out =
      logtenOut ||
      findFieldValue(rawEntry, ['Out', 'out']) ||
      rawEntry.Out ||
      rawEntry.oooi?.out ||
      null

    let off: string | null = null
    let on: string | null = null
    if (isLogtenDynamic) {
      off = findFieldValue(rawEntry, ['Off', 'off']) || null
      on = findFieldValue(rawEntry, ['On', 'on']) || null
    } else if (isLogtenImport) {
      off =
        findFieldValue(rawEntry, ['flight_takeoffTime', 'flight_taxiOutTime']) ||
        rawEntry.Off ||
        rawEntry.oooi?.off ||
        null
      on =
        findFieldValue(rawEntry, ['flight_landingTime', 'flight_taxiInTime']) ||
        rawEntry.On ||
        rawEntry.oooi?.on ||
        null
    } else {
      off = rawEntry.Off || rawEntry.oooi?.off || null
      on = rawEntry.On || rawEntry.oooi?.on || null
    }

    const inTime =
      logtenIn ||
      findFieldValue(rawEntry, ['In', 'in']) ||
      rawEntry.In ||
      rawEntry.oooi?.in ||
      null
    
    // Determine if times are in Zulu (UTC)
    // LogTen exports times in Zulu/UTC by default
    // Check for explicit timezone indicators in the export
    let isZulu: boolean
    if (isLogtenImport) {
      // Check for timezone indicators in LogTen export
      const timezoneField = findFieldValue(rawEntry, ['timezone', 'Timezone', 'TIMEZONE', 'isZulu', 'Is Zulu', 'is_zulu'])
      const timezoneLower = timezoneField.toLowerCase()
      
      // Check for Zulu/UTC indicators
      const hasZuluIndicator = timezoneLower.includes('zulu') || 
                               timezoneLower.includes('utc') ||
                               timezoneLower === 'z' ||
                               rawEntry.isZulu === true ||
                               rawEntry['Is Zulu'] === true
      
      // Check for local time indicator
      const hasLocalIndicator = timezoneLower.includes('local') ||
                                rawEntry.isZulu === false ||
                                rawEntry['Is Zulu'] === false
      
      // Default to Zulu (true) for LogTen imports unless explicitly marked as local
      isZulu = hasLocalIndicator ? false : (hasZuluIndicator ? true : true) // Default to true (Zulu)
    } else {
      // For non-LogTen imports, check explicit field or default to Zulu
      isZulu = rawEntry['Is Zulu'] !== undefined ? rawEntry['Is Zulu'] : (rawEntry.oooi?.isZulu !== undefined ? rawEntry.oooi.isZulu : true)
    }
    
    // If we have OOOI times, calculate block time from out to in (gate out to gate in)
    // For Logten imports, this will override the null initial value
    // Fall back to off/on if out/in don't exist
    // Zulu times need no airport timezone lookup (duration is UTC-to-UTC).
    if (out && inTime) {
      const startTimezone = isZulu
        ? null
        : entry.departure
          ? await getAirportTimezone(entry.departure)
          : null
      const endTimezone = isZulu
        ? null
        : entry.destination
          ? await getAirportTimezone(entry.destination)
          : null

      const calculatedTime = await calculateDuration(out, inTime, entry.date, startTimezone, endTimezone, isZulu)
      if (calculatedTime !== null && calculatedTime > 0) {
        entry.flightTime.total = calculatedTime
      }
    } else if (off && on) {
      const startTimezone = isZulu
        ? null
        : entry.departure
          ? await getAirportTimezone(entry.departure)
          : null
      const endTimezone = isZulu
        ? null
        : entry.destination
          ? await getAirportTimezone(entry.destination)
          : null

      const calculatedTime = await calculateDuration(off, on, entry.date, startTimezone, endTimezone, isZulu)
      if (calculatedTime !== null && calculatedTime > 0) {
        entry.flightTime.total = calculatedTime
      }
    }
    
    // For imports, rely solely on exported night time values
    // No calculation during import - use what was exported from the source system
    
    // For Logten imports without OOOI times, fall back to flight_totalTime
    if (isLogtenImport && !entry.flightTime.total) {
      const fallbackTotal = normalizeNumber(rawEntry.flight_totalTime)
      if (fallbackTotal !== null && fallbackTotal > 0) {
        entry.flightTime.total = fallbackTotal
      }
    }
    
    // For Logten imports, if flight is marked as cross-country (flight_crossCountry > 0),
    // set cross-country time to match total time
    if (isLogtenImport && entry.flightTime.total) {
      const logtenXCTime = normalizeNumber(rawEntry.flight_crossCountry)
      if (logtenXCTime !== null && logtenXCTime > 0) {
        // Logten marked it as cross-country, so XC time should equal total time
        entry.flightTime.crossCountry = entry.flightTime.total
      }
    }
    
    if (out || off || on || inTime) {
      entry.oooi = {
        out: out,
        off: off,
        on: on,
        in: inTime,
        isZulu: Boolean(isZulu)
      }
    }
    
    // Auto-detect IFR if flight number exists (only add condition, don't auto-set actualInstrument)
    if (entry.flightNumber && entry.flightNumber.trim() !== '') {
      const conditionSet = new Set(entry.flightConditions)
      conditionSet.add('ifr')
      entry.flightConditions = Array.from(conditionSet)
    }
    
    if (isLogtenDynamic) {
      applyLogtenDynamicRoleAndTime(entry, rawEntry, importerName)
    }

    applyLogtenCrewFields(entry, rawEntry, importerName)
    
    const simHints = readSimHintsFromRawRow(rawEntry)
    applySimulatorImport(entry, simHints)
    entry.logbookType = inferLogbookType(entry)

    // Auto-check flight conditions after simulator normalization (actual → simulated)
    entry.flightConditions = autoCheckFlightConditions(
      entry.flightConditions,
      entry.flightTime.night,
      entry.flightTime.actualInstrument,
      entry.flightTime.simulatedInstrument,
      entry.flightTime.crossCountry,
      entry.flightTime.nvg ?? null
    )
    
    return entry
  } catch (error) {
    console.error('Error normalizing imported entry:', error, rawEntry)
    return null
  }
}

async function calculateImportStatistics(entries: LogEntry[]): Promise<{ statistics: ImportStatistics; validEntries: LogEntry[]; duplicates: LogEntry[]; errors: { entry: LogEntry; message: string }[] }> {
  const validEntries: LogEntry[] = []
  const duplicates: LogEntry[] = []
  const duplicateEntries: Array<{ entry: LogEntry; matches: LogEntry[] }> = []
  const errors: { entry: LogEntry; message: string }[] = []
  const aircraftBreakdown: Record<string, number> = {}
  
  let totalFlightTime = 0
  let picTime = 0
  let sicTime = 0
  let nightTime = 0
  let nvgTime = 0
  let crossCountryTime = 0
  let actualInstrumentTime = 0
  let simulatedInstrumentTime = 0
  let dualReceivedTime = 0
  let dualGivenTime = 0
  let soloTime = 0
  let ffsTime = 0
  let ftdTime = 0
  let atdTime = 0
  let totalLandings = 0
  let dayLandings = 0
  let nightLandings = 0
  let totalApproaches = 0
  
  const dates: string[] = []
  const errorMessages: string[] = []
  /** Entries accepted in this import batch so far — mirrors importEntries growing logEntries. */
  const batchAccepted: LogEntry[] = []
  const previewErrors = new Map<string, string>()
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!
    if (!entry.departure.trim()) {
      entry.departure = 'UNKNOWN'
    }
    if (!entry.destination.trim()) {
      entry.destination = 'UNKNOWN'
    }
    if (!entry.aircraftMakeModel.trim()) {
      entry.aircraftMakeModel = 'Unknown'
    }
    
    const validationError = await validateEntryForImport(entry)
    if (validationError) {
      previewErrors.set(entry.id, validationError)
      errors.push({ entry, message: validationError })
      errorMessages.push(`Entry ${entry.date} ${entry.registration}: ${validationError}`)
      if ((i + 1) % IMPORT_UI_YIELD_EVERY === 0) {
        setImportBusy(`Checking ${i + 1} / ${entries.length}`)
        await yieldToImportUi()
      }
      continue
    }

    dates.push(entry.date)
    totalFlightTime += entry.flightTime.total ?? 0
    picTime += entry.flightTime.pic ?? 0
    sicTime += entry.flightTime.sic ?? 0
    nightTime += entry.flightTime.night ?? 0
    nvgTime += entry.flightTime.nvg ?? 0
    crossCountryTime += entry.flightTime.crossCountry ?? 0
    actualInstrumentTime += entry.flightTime.actualInstrument ?? 0
    simulatedInstrumentTime += entry.flightTime.simulatedInstrument ?? 0
    dualReceivedTime += entry.flightTime.dual ?? 0
    dualGivenTime += entry.flightTime.dualGiven ?? 0
    soloTime += entry.flightTime.solo ?? 0
    ffsTime += entry.flightTime.ffs ?? 0
    ftdTime += entry.flightTime.ftd ?? 0
    atdTime += entry.flightTime.atd ?? 0
    dayLandings += entry.performance.dayLandings ?? 0
    nightLandings += entry.performance.nightLandings ?? 0
    totalLandings += (entry.performance.dayLandings ?? 0) + (entry.performance.nightLandings ?? 0)
    totalApproaches += getTotalApproachCount(entry.performance)
    const aircraftKey = `${entry.aircraftMakeModel} (${entry.registration})`
    aircraftBreakdown[aircraftKey] = (aircraftBreakdown[aircraftKey] || 0) + 1
    
    const logbookMatches = findDuplicateEntries(entry, logEntries.value)
    const batchMatches = findDuplicateEntries(entry, batchAccepted)
    const matches = [...logbookMatches, ...batchMatches]
    if (matches.length > 0) {
      duplicates.push(entry)
      duplicateEntries.push({ entry, matches })
      if ((i + 1) % IMPORT_UI_YIELD_EVERY === 0) {
        setImportBusy(`Checking ${i + 1} / ${entries.length}`)
        await yieldToImportUi()
      }
      continue
    }
    
    validEntries.push(entry)
    batchAccepted.push(entry)

    if ((i + 1) % IMPORT_UI_YIELD_EVERY === 0) {
      setImportBusy(`Checking ${i + 1} / ${entries.length}`)
      await yieldToImportUi()
    }
  }

  // Calculate date range
  dates.sort()
  const earliestDate: string | null = dates.length > 0 ? (dates[0] ?? null) : null
  const latestDate: string | null = dates.length > 0 ? (dates[dates.length - 1] ?? null) : null
  const dateRange: { earliest: string | null; latest: string | null } = {
    earliest: earliestDate,
    latest: latestDate
  }
  
  const statistics: ImportStatistics = {
    totalEntries: entries.length,
    duplicates: duplicates.length,
    errors: errors.length,
    totalFlightTime,
    picTime,
    sicTime,
    nightTime,
    nvgTime,
    crossCountryTime,
    actualInstrumentTime,
    simulatedInstrumentTime,
    dualReceivedTime,
    dualGivenTime,
    soloTime,
    ffsTime,
    ftdTime,
    atdTime,
    totalLandings,
    dayLandings,
    nightLandings,
    totalApproaches,
    aircraftBreakdown,
    dateRange,
    errorMessages,
    duplicateEntries
  }
  
  importPreviewValidationErrors.value = previewErrors
  return { statistics, validEntries, duplicates, errors }
}

async function persistImportedEntryTags(entry: LogEntry, tags: string[]): Promise<void> {
  entry.tags = tags
  if (!isAuthenticated.value || !user.value) return
  try {
    const { error } = await (supabase.from('log_entries') as any)
      .update({ tags })
      .eq('id', entry.id)
      .eq('user_id', user.value.id)
    if (error) {
      console.error('[importEntries] Failed to persist tags:', entry.id, error)
    }
  } catch (err) {
    console.error('[importEntries] Failed to persist tags:', entry.id, err)
  }
  try {
    await updateEntryInIndexedDB(entry, { synced: true, userId: user.value.id })
  } catch (idbErr) {
    console.warn('[importEntries] IndexedDB tag update failed:', idbErr)
  }
}

async function importEntries(entries: LogEntry[], importDuplicates: boolean = false, importWithErrorsFlag: boolean = false): Promise<{ imported: number; skipped: number; flaggedDuplicates: number; tagsUpdated: number; errors: string[] }> {
  const result = { imported: 0, skipped: 0, flaggedDuplicates: 0, tagsUpdated: 0, errors: [] as string[] }
  const importedTagPresets = new Set<string>()
  
  // Determine import source from metadata
  const importSource = importPreviewMetadata.value?.fileType?.toLowerCase() || 'unknown'
  const fileName = importPreviewMetadata.value?.fileName || 'unknown'
  
  // Create import batch if authenticated
  let importBatchId: string | null = null
  if (isAuthenticated.value && user.value) {
    try {
      // Calculate statistics for the batch
      const totalEntries = entries.length
      let dateRange = { earliest: null as string | null, latest: null as string | null }
      if (entries.length > 0) {
        const firstEntry = entries[0]
        if (firstEntry) {
          dateRange = {
            earliest: entries.reduce((earliest, e) => !earliest || e.date < earliest ? e.date : earliest, firstEntry.date),
            latest: entries.reduce((latest, e) => !latest || e.date > latest ? e.date : latest, firstEntry.date)
          }
        }
      }
      
      const aircraftList = [...new Set(entries.map(e => e.registration))].sort()
      
      const batchMetadata = {
        fileName,
        fileType: importPreviewMetadata.value?.fileType,
        dateRange,
        aircraftList,
        importedAt: new Date().toISOString()
      }
      
      const { data: batch, error: batchError } = await (supabase
        .from('import_batches') as any)
        .insert({
          user_id: user.value.id,
          source_type: importSource,
          file_name: fileName,
          file_size: null, // Could calculate if needed
          total_entries: totalEntries,
          successful_imports: 0, // Will update after import
          duplicates_skipped: 0, // Will update after import
          errors: 0, // Will update after import
          import_metadata: batchMetadata
        })
        .select()
        .single()
      
      if (batchError) {
        console.error('Error creating import batch:', batchError)
        result.errors.push(`Failed to create import batch: ${batchError.message}`)
      } else {
        importBatchId = (batch as any).id
      }
    } catch (error) {
      console.error('Error creating import batch:', error)
      result.errors.push(`Failed to create import batch: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  // Classify rows (no second full validation — preview already classified errors)
  const toInsert: LogEntry[] = []
  const importedAt = new Date().toISOString()

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!
    if (!entry.departure.trim()) entry.departure = 'UNKNOWN'
    if (!entry.destination.trim()) entry.destination = 'UNKNOWN'
    if (!entry.aircraftMakeModel.trim()) entry.aircraftMakeModel = 'Unknown'

    const previewError = importPreviewValidationErrors.value.get(entry.id)
    if (previewError) {
      if (importWithErrorsFlag) {
        entry.flagged = true
        const errorNote = `\n\n[Import Error: ${previewError}]`
        entry.remarks = (entry.remarks || '') + errorNote
      } else {
        result.errors.push(`Entry ${entry.date} ${entry.registration}: ${previewError}`)
        continue
      }
    }

    const matches = findDuplicateEntries(entry, logEntries.value)
    if (matches.length > 0 && !importDuplicates) {
      const incomingTags = Array.isArray(entry.tags) ? entry.tags : []
      if (incomingTags.length > 0) {
        for (const match of matches) {
          const merged = mergeIncomingTags(match.tags, incomingTags)
          if (merged.length === (match.tags || []).filter(Boolean).length) continue
          await persistImportedEntryTags(match, merged)
          result.tagsUpdated++
          for (const tag of incomingTags) {
            const trimmed = tag.trim()
            if (trimmed) importedTagPresets.add(trimmed)
          }
        }
      }
      result.skipped++
      continue
    }
    if (matches.length > 0 && importDuplicates) {
      const match = matches[0]!
      entry.flagged = true
      result.flaggedDuplicates++
      const dupNote = `[Import Duplicate: matches ${match.date} ${match.registration}]`
      entry.remarks = (entry.remarks || '') + (entry.remarks ? '\n\n' : '') + dupNote
    }

    entry.isImported = true
    entry.importSource = importSource
    entry.importBatchId = importBatchId || undefined
    entry.originalEntryDate = entry.date
    entry.importMetadata = {
      fileName,
      fileType: importPreviewMetadata.value?.fileType,
      importedAt,
    }
    if (!entry.id) entry.id = generateEntryId()
    toInsert.push(entry)

    if ((i + 1) % IMPORT_UI_YIELD_EVERY === 0) {
      setImportBusy(`Preparing ${i + 1} / ${entries.length}`)
      await yieldToImportUi()
    }
  }

  const storedEntries: LogEntry[] = []

  function buildImportDbRow(entry: LogEntry, userId: string): Record<string, unknown> {
    return {
      id: entry.id,
      user_id: userId,
      date: entry.date,
      role: entry.role,
      aircraft_category_class: entry.aircraftCategoryClass,
      category_class_time: entry.categoryClassTime,
      aircraft_make_model: entry.aircraftMakeModel,
      registration: entry.registration,
      flight_number: entry.flightNumber || null,
      departure: entry.departure,
      destination: entry.destination,
      route: entry.route || null,
      training_elements: entry.trainingElements || null,
      training_instructor: entry.trainingInstructor || null,
      instructor_certificate: entry.instructorCertificate || null,
      pic_name: (entry.picName || '').trim() || null,
      sic_name: (entry.sicName || '').trim() || null,
      flight_conditions: entry.flightConditions || [],
      remarks: entry.remarks || null,
      tags: Array.isArray(entry.tags) ? entry.tags.filter(Boolean) : [],
      logbook_type: entry.logbookType ?? 'flight',
      flight_time: entry.flightTime,
      performance: entry.performance,
      oooi: entry.oooi || null,
      flagged: entry.flagged || false,
      is_imported: true,
      import_source: importSource,
      import_batch_id: importBatchId,
      original_entry_date: entry.date ? new Date(entry.date).toISOString() : null,
      import_metadata: entry.importMetadata ?? {
        fileName,
        fileType: importPreviewMetadata.value?.fileType,
        importedAt,
      },
    }
  }

  function mapInsertedRowToLogEntry(entry: LogEntry, data: Record<string, any>): LogEntry {
    return {
      ...entry,
      id: data.id ?? entry.id,
      isImported: true,
      importSource,
      importBatchId: importBatchId || undefined,
      originalEntryDate: entry.date,
      importMetadata: entry.importMetadata,
      version: data.version ?? entry.version,
      dataHash: data.data_hash ?? entry.dataHash,
      createdAt: data.created_at ?? entry.createdAt,
      updatedAt: data.updated_at ?? entry.updatedAt,
    }
  }

  async function insertImportRowsOneByOne(
    chunk: LogEntry[],
    userId: string
  ): Promise<LogEntry[]> {
    const saved: LogEntry[] = []
    for (const entry of chunk) {
      try {
        const { data, error } = await (supabase.from('log_entries') as any)
          .insert(buildImportDbRow(entry, userId))
          .select()
          .single()
        if (error) throw error
        saved.push(mapInsertedRowToLogEntry(entry, data as any))
        for (const tag of entry.tags || []) {
          const trimmed = tag.trim()
          if (trimmed) importedTagPresets.add(trimmed)
        }
      } catch (error) {
        console.error('Error saving imported entry:', error)
        result.errors.push(
          `Entry ${entry.date} ${entry.registration}: ${error instanceof Error ? error.message : 'Failed to save'}`
        )
      }
    }
    return saved
  }

  isBulkLoadInProgress.value = true
  try {
    if (isAuthenticated.value && user.value) {
      const userId = user.value.id
      for (let i = 0; i < toInsert.length; i += IMPORT_INSERT_BATCH) {
        const chunk = toInsert.slice(i, i + IMPORT_INSERT_BATCH)
        setImportBusy(`Importing ${Math.min(i + chunk.length, toInsert.length)} / ${toInsert.length}`)
        await yieldToImportUi()

        const dbRows = chunk.map((entry) => buildImportDbRow(entry, userId))
        try {
          const { data, error } = await (supabase.from('log_entries') as any)
            .insert(dbRows)
            .select()

          if (error) throw error

          const rows = (data || []) as any[]
          const byId = new Map(rows.map((row) => [row.id as string, row]))
          let matchedAll = true
          const chunkSaved: LogEntry[] = []
          for (const entry of chunk) {
            const row = byId.get(entry.id)
            if (!row) {
              matchedAll = false
              break
            }
            chunkSaved.push(mapInsertedRowToLogEntry(entry, row))
            for (const tag of entry.tags || []) {
              const trimmed = tag.trim()
              if (trimmed) importedTagPresets.add(trimmed)
            }
          }
          if (!matchedAll || chunkSaved.length !== chunk.length) {
            console.warn('[importEntries] Batch insert id match failed; retrying one-by-one')
            storedEntries.push(...(await insertImportRowsOneByOne(chunk, userId)))
          } else {
            storedEntries.push(...chunkSaved)
          }
        } catch (chunkError) {
          console.warn('[importEntries] Batch insert failed; retrying one-by-one:', chunkError)
          storedEntries.push(...(await insertImportRowsOneByOne(chunk, userId)))
        }
      }

      result.imported = storedEntries.length

      if (storedEntries.length > 0) {
        try {
          const remoteIds = new Set(storedEntries.map((e) => e.id))
          await persistSyncedEntriesToIndexedDB(storedEntries, remoteIds, userId)
        } catch (idbErr) {
          console.warn('[importEntries] IndexedDB batch save failed:', idbErr)
        }
        logEntries.value = sortEntriesByDateAndOOOI([...logEntries.value, ...storedEntries])
      }
    } else {
      for (let i = 0; i < toInsert.length; i++) {
        const entry = toInsert[i]!
        storedEntries.push({
          ...entry,
          id: entry.id || generateEntryId(),
          isImported: true,
          importSource,
          importBatchId: importBatchId || undefined,
          originalEntryDate: entry.date,
          importMetadata: entry.importMetadata,
        })
        for (const tag of entry.tags || []) {
          const trimmed = tag.trim()
          if (trimmed) importedTagPresets.add(trimmed)
        }
        if ((i + 1) % IMPORT_UI_YIELD_EVERY === 0) {
          setImportBusy(`Importing ${i + 1} / ${toInsert.length}`)
          await yieldToImportUi()
        }
      }
      result.imported = storedEntries.length
      if (storedEntries.length > 0) {
        logEntries.value = sortEntriesByDateAndOOOI([...logEntries.value, ...storedEntries])
      }
    }
  } finally {
    finalizeBulkLoadSideEffects()
  }

  for (const tag of importedTagPresets) {
    await addTagPreset(tag)
  }
  
  if (importBatchId && isAuthenticated.value && user.value) {
    try {
      await (supabase
        .from('import_batches') as any)
        .update({
          successful_imports: result.imported,
          duplicates_skipped: result.skipped,
          errors: result.errors.length
        })
        .eq('id', importBatchId)
    } catch (error) {
      console.error('Error updating import batch statistics:', error)
    }
  }
  
  return result
}

async function proceedWithImport(includeDuplicates: boolean): Promise<void> {
  if (!importPreviewStatistics.value?.totalEntries || !importPreviewAllEntries.value.length) {
    return
  }
  if (importBusy.value) return

  applyImportSimTypeOverrides()
  setImportBusy(`Importing 0 / ${importPreviewAllEntries.value.length}`)

  try {
    const result = await importEntries(
      importPreviewAllEntries.value,
      includeDuplicates,
      importWithErrors.value
    )

    clearImportBusy()

    if (result.imported === 0 && result.tagsUpdated === 0 && result.errors.length === 0) {
      const total = importPreviewStatistics.value.totalEntries
      showToast(`Nothing new to import. Check "Import duplicate entries and flag them for review" to add all ${total} rows (duplicates will be flagged).`, { type: 'info' })
      cancelImport()
      return
    }

    let message = `Import complete!\n\nImported: ${result.imported} ${result.imported === 1 ? 'entry' : 'entries'}`
    if (result.flaggedDuplicates > 0) {
      message += ` (${result.flaggedDuplicates} flagged as duplicates)`
    }
    if (result.tagsUpdated > 0) {
      message += `\nUpdated tags on ${result.tagsUpdated} existing ${result.tagsUpdated === 1 ? 'entry' : 'entries'}`
    }
    if (result.skipped > 0) {
      message += `\nSkipped (duplicates): ${result.skipped} ${result.skipped === 1 ? 'entry' : 'entries'}`
    }
    if (result.errors.length > 0) {
      message += `\n\nErrors (${result.errors.length}):\n${result.errors.slice(0, 5).join('\n')}`
      if (result.errors.length > 5) {
        message += `\n... and ${result.errors.length - 5} more`
      }
    }
    showToast(message, { type: result.errors.length > 0 ? 'error' : 'success' })

    cancelImport()
  } catch (error) {
    console.error('Import commit failed:', error)
    showToast(
      `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { type: 'error' }
    )
  } finally {
    clearImportBusy()
  }
}

async function handleSkipDuplicatesImport(): Promise<void> {
  if (!importPreviewStatistics.value) return
  await proceedWithImport(false)
}

async function handleImportAllWithDuplicates(): Promise<void> {
  if (!importDuplicatesFlagged.value) return
  await proceedWithImport(true)
}

function cancelImport(): void {
  if (importBusy.value) return
  showImportPreview.value = false
  importPreviewAllEntries.value = []
  importPreviewEntries.value = []
  importPreviewStatistics.value = null
  importPreviewMetadata.value = null
  importPreviewValidationErrors.value = new Map()
  expandedPreviewEntries.value = new Set()
  importDuplicatesFlagged.value = false
  importWithErrors.value = false
  importSimTypeOverrides.value = {}
  importSimRememberDevice.value = {}
}

function togglePreviewEntry(entryId: string): void {
  if (expandedPreviewEntries.value.has(entryId)) {
    expandedPreviewEntries.value.delete(entryId)
  } else {
    expandedPreviewEntries.value.add(entryId)
  }
}

async function handleCSVImport(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  
  await processCSVFile(file)
  
  // Reset file input
  if (input && input.value) {
    input.value = ''
  }
}

async function processCSVFile(file: File, provider?: ImportProviderKey): Promise<void> {
  setImportBusy('Reading file…')
  try {
    const text = await file.text()
    const sourceOverride = provider ? providerKeyToBridgeSource(provider) : undefined
    const parsed = parseBridgeFile(text, sourceOverride)

    console.log('Parsed CSV rows:', parsed.rows.length, 'source:', parsed.source, 'provider:', provider ?? 'auto')
    if (parsed.rows.length > 0 && parsed.rows[0]) {
      console.log('First row headers:', Object.keys(parsed.rows[0]))
      console.log('First row sample:', parsed.rows[0])
    }

    if (parsed.rows.length === 0) {
      showToast('Import file is empty or could not be parsed.', { type: 'error' })
      return
    }

    const entries: LogEntry[] = []
    const acceptedRawRows: Record<string, string>[] = []
    const rejectedRows: { row: any; reason: string }[] = []

    setImportBusy(`Reading 0 / ${parsed.rows.length}`)
    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i]
      if (!row) continue

      const entry = await normalizeImportedEntry(row, parsed.source)
      if (entry) {
        entry.importSource = parsed.source
        entries.push(entry)
        acceptedRawRows.push(row)
      } else {
        let reason = 'Unknown reason'
        const dateValue = findFieldValue(row, [
          'flight_flightDate',
          'Flight_Date',
          'FlightDate',
          'Date',
          'date',
          'DATE',
          'Flight Date',
          'flight date',
        ])
        const regValue = findFieldValue(row, [
          'aircraft_aircraftID',
          'Aircraft_Registration',
          'Aircraft Registration',
          'flight_aircraft',
          'Tail Number',
          'Registration',
          'AircraftID',
          'aircraftID',
        ])

        if (!dateValue) {
          reason = 'Missing date field'
        } else if (!regValue) {
          reason =
            'Missing registration field (tried: Registration, Aircraft ID, Tail Number, N-Number, Ident, etc.)'
        } else {
          reason = 'Invalid date format or other validation error'
        }
        rejectedRows.push({ row, reason })
        if (i === 0 && row) {
          console.log('First row rejected:', reason, row)
          console.log('Available columns:', Object.keys(row))
        }
      }

      if ((i + 1) % IMPORT_UI_YIELD_EVERY === 0) {
        setImportBusy(`Reading ${i + 1} / ${parsed.rows.length}`)
        await yieldToImportUi()
      }
    }

    // WHY: ForeFlight flight rows often omit type/class; join Aircraft Table by AircraftID.
    // Custom hour tags / FAA flags also live in enrich — run even without hangar rows.
    if (provider === 'foreflight' || parsed.source === 'foreflight') {
      enrichForeFlightEntries(entries, acceptedRawRows, {
        aircraftRows: parsed.aircraftRows,
        headers: parsed.headers,
      })
    }

    console.log(`Processed ${parsed.rows.length} rows: ${entries.length} valid, ${rejectedRows.length} rejected`)

    if (entries.length === 0) {
      let errorMsg = 'No valid entries found in import file.\n\n'
      if (rejectedRows.length > 0) {
        errorMsg += `Reasons:\n${rejectedRows.slice(0, 3).map((r) => `- ${r.reason}`).join('\n')}`
        if (rejectedRows.length > 3) {
          errorMsg += `\n... and ${rejectedRows.length - 3} more`
        }
        errorMsg += '\n\nCheck console for details.'
      }
      showToast(errorMsg, { type: 'error' })
      return
    }

    setImportBusy(`Checking 0 / ${entries.length}`)
    const { statistics, validEntries, errors } = await calculateImportStatistics(entries)
    importPreviewAllEntries.value = entries
    importPreviewEntries.value = [...validEntries, ...errors.map((e) => e.entry)]
    importPreviewStatistics.value = statistics
    importPreviewMetadata.value = {
      fileName: file.name,
      fileType: parsed.delimiter === '\t' ? 'TSV' : 'CSV',
      importedAt: new Date().toISOString(),
      detectedSource: parsed.source,
      selectedProvider: provider ?? null,
      bridgeWarnings: [
        ...(parsed.skippedAircraftRows > 0
          ? [`Skipped ${parsed.skippedAircraftRows} aircraft table row(s)`]
          : []),
        ...(provider ? [`Provider forced: ${provider}`] : []),
      ],
    }
    importDuplicatesFlagged.value = false
    showImportPreview.value = true
    initImportSimTypeOverrides()
  } catch (error) {
    console.error('Error importing file:', error)
    showToast(`Error importing file: ${error instanceof Error ? error.message : 'Unknown error'}`, { type: 'error' })
  } finally {
    clearImportBusy()
  }
}

async function handleJSONImport(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  
  await processJSONFile(file)
  
  // Reset file input
  if (input && input.value) {
    input.value = ''
  }
}

async function processJSONFile(file: File): Promise<void> {
  setImportBusy('Reading file…')
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    
    // Handle both direct array and wrapped format
    let entries: any[] = []
    if (Array.isArray(data)) {
      entries = data
    } else if (data.entries && Array.isArray(data.entries)) {
      entries = data.entries
    } else {
      showToast('JSON file format not recognized. Expected an array of entries or an object with an "entries" property.', { type: 'error' })
      return
    }
    
    if (entries.length === 0) {
      showToast('No entries found in JSON file.', { type: 'error' })
      return
    }
    
    // Normalize entries
    const normalizedEntries: LogEntry[] = []
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const normalized = await normalizeImportedEntry(entry)
      if (normalized) {
        normalizedEntries.push(normalized)
      }
      if ((i + 1) % IMPORT_UI_YIELD_EVERY === 0) {
        setImportBusy(`Reading ${i + 1} / ${entries.length}`)
        await yieldToImportUi()
      }
    }
    
    if (normalizedEntries.length === 0) {
      showToast('No valid entries found in JSON file.', { type: 'error' })
      return
    }
    
    // Calculate statistics and show preview
    setImportBusy(`Checking 0 / ${normalizedEntries.length}`)
    const { statistics, validEntries, errors } = await calculateImportStatistics(normalizedEntries)
    importPreviewAllEntries.value = normalizedEntries
    importPreviewEntries.value = [...validEntries, ...errors.map(e => e.entry)]
    importPreviewStatistics.value = statistics
    importPreviewMetadata.value = {
      fileName: file.name,
      fileType: 'JSON',
      importedAt: new Date().toISOString()
    }
    importDuplicatesFlagged.value = false
    showImportPreview.value = true
    initImportSimTypeOverrides()
  } catch (error) {
    console.error('Error importing JSON:', error)
    showToast(`Error importing JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`, { type: 'error' })
  } finally {
    clearImportBusy()
  }
}

// Drag and drop handlers for import
let dragEnterCount = 0

function handleImportDragEnter(event: DragEvent): void {
  // Only handle file drags
  if (event.dataTransfer?.types.includes('Files')) {
    event.preventDefault()
    // Don't stop propagation - we need to count all dragenter events from child elements
    dragEnterCount++
    console.log('Drag enter (file), count:', dragEnterCount)
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
    isDragOverImport.value = true
  }
}

function handleImportDragOver(event: DragEvent): void {
  // Only handle file drags
  if (event.dataTransfer?.types.includes('Files')) {
    event.preventDefault()
    // Don't stop propagation - let it bubble
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
  }
}

function handleImportDragLeave(event: DragEvent): void {
  event.preventDefault()
  // Don't stop propagation - we need to count all dragleave events
  dragEnterCount--
  console.log('Drag leave, count:', dragEnterCount)
  // Only clear the drag state when we've actually left the drop zone
  if (dragEnterCount <= 0) {
    dragEnterCount = 0
    isDragOverImport.value = false
  }
}

async function handleImportDrop(event: DragEvent): Promise<void> {
  event.preventDefault()
  event.stopPropagation() // Stop propagation on drop to prevent other handlers
  dragEnterCount = 0
  isDragOverImport.value = false
  
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) {
    console.log('No files in drop event')
    return
  }
  
  const file = files[0]
  if (!file) {
    console.log('File is undefined')
    return
  }
  
  const fileName = file.name.toLowerCase()
  
  console.log('File dropped:', fileName, 'Type:', file.type)
  
  // Determine file type and route to appropriate handler
  if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileName.endsWith('.tsv') || file.type === 'text/csv' || file.type === 'text/plain') {
    console.log('Processing as CSV/Tab-delimited')
    await processCSVFile(file)
  } else if (fileName.endsWith('.json') || file.type === 'application/json') {
    console.log('Processing as JSON')
    await processJSONFile(file)
  } else {
    showToast(`Please drop a CSV, TSV, TXT, or JSON file. Received: ${file.type || 'unknown type'}`, { type: 'error' })
  }
}

async function handleSettingsImportFile(file: File): Promise<void> {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileName.endsWith('.tsv') || file.type === 'text/csv' || file.type === 'text/plain') {
    await processCSVFile(file)
  } else if (fileName.endsWith('.json') || file.type === 'application/json') {
    await processJSONFile(file)
  } else {
    showToast(`Please choose a CSV, TSV, TXT, or JSON file. Received: ${file.type || 'unknown type'}`, { type: 'error' })
  }
}

async function handleSettingsProviderImportFile(payload: {
  file: File
  provider: ImportProviderKey
}): Promise<void> {
  const { file, provider } = payload
  const fileName = file.name.toLowerCase()

  if (
    fileName.endsWith('.csv') ||
    fileName.endsWith('.txt') ||
    fileName.endsWith('.tsv') ||
    file.type === 'text/csv' ||
    file.type === 'text/plain' ||
    file.type === 'text/tab-separated-values'
  ) {
    await processCSVFile(file, provider)
  } else {
    showToast(`Please choose a CSV, TSV, or TXT file for provider import. Received: ${file.type || 'unknown type'}`, { type: 'error' })
  }
}

function loadPilotProfilePrefs(): void {
  if (!isBrowser) return
  try {
    const stored = readUserScopedLocal(PILOT_PROFILE_STORAGE_KEY, true)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<PilotProfilePrefs>
      Object.assign(pilotProfile, pilotProfileDefaults, parsed)
    } else {
      Object.assign(pilotProfile, pilotProfileDefaults)
    }
  } catch (err) {
    console.error('Unable to load pilot profile', err)
    Object.assign(pilotProfile, pilotProfileDefaults)
  } finally {
    pilotProfileLoaded.value = true
  }
}

function savePilotProfilePrefs(): void {
  if (!isBrowser || !pilotProfileLoaded.value) return
  const payload: PilotProfilePrefs = { ...pilotProfile }
  writeUserScopedLocal(PILOT_PROFILE_STORAGE_KEY, JSON.stringify(payload))
}

/** Load pilot profile from Supabase user_profiles and merge into pilotProfile (Supabase wins when present). */
async function loadPilotProfileFromSupabase(): Promise<void> {
  if (!user.value?.id || !isBrowser) return
  try {
    const { data, error } = await (supabase
      .from('user_profiles') as any)
      .select('full_name, certificate_number, date_of_birth, place_of_birth, residential_address, mailing_address, preferences, role, cfi_number, cfi_expiration')
      .eq('id', user.value.id)
      .maybeSingle()
    if (error) {
      console.warn('[LoadPilotProfile] Supabase error:', error)
      return
    }
    if (!data) return
    const prefs: Partial<PilotProfilePrefs> = {}
    if (data.full_name != null) prefs.name = data.full_name
    if (data.certificate_number != null) prefs.certificateNumber = data.certificate_number
    if (data.date_of_birth != null) prefs.dateOfBirth = data.date_of_birth
    if (data.place_of_birth != null) prefs.placeOfBirth = data.place_of_birth
    if (data.role === 'STUDENT' || data.role === 'INSTRUCTOR' || data.role === 'DUAL') {
      prefs.role = data.role
    }
    if (data.cfi_number != null) prefs.cfiNumber = data.cfi_number
    if (data.cfi_expiration != null) prefs.cfiExpiration = data.cfi_expiration
    const res = data.residential_address as { street?: string; city?: string; state?: string; zip?: string } | null
    if (res) {
      prefs.residentialAddress = res.street ?? ''
      prefs.residentialCity = res.city ?? ''
      prefs.residentialState = res.state ?? ''
      prefs.residentialZip = res.zip ?? ''
    }
    const mail = data.mailing_address as { street?: string; city?: string; state?: string; zip?: string } | null
    if (mail) {
      prefs.mailingAddress = mail.street ?? ''
      prefs.mailingCity = mail.city ?? ''
      prefs.mailingState = mail.state ?? ''
      prefs.mailingZip = mail.zip ?? ''
    }
    const pref = data.preferences as Record<string, unknown> | null
    if (pref) {
      prefs.callsign = (pref.callsign as string) ?? ''
      prefs.homeBase = (pref.homeBase as string) ?? ''
      prefs.certificates = (pref.certificates as string) ?? ''
      prefs.flightGoals = (pref.flightGoals as string) ?? ''
      prefs.notes = (pref.notes as string) ?? ''
      if (pref.enableMilitaryFields != null) {
        prefs.enableMilitaryFields = pref.enableMilitaryFields === true || pref.enableMilitaryFields === 'true'
      }
      const simTypes = pref.simDeviceTypes as Record<string, SimTypeKey> | undefined
      if (simTypes && typeof simTypes === 'object') {
        mergeSimDeviceCatalog(simTypes)
      }
    }
    Object.assign(pilotProfile, pilotProfileDefaults, prefs)
    savePilotProfilePrefs() // persist merged result to localStorage
  } catch (err) {
    console.warn('[LoadPilotProfile] Error loading from Supabase:', err)
  }
}

let pilotProfileSupabaseSaveTimeout: ReturnType<typeof setTimeout> | null = null
/** Save pilot profile to Supabase user_profiles (debounced). */
function savePilotProfileToSupabase(): void {
  const userId = user.value?.id
  if (!userId || !isAuthenticated.value || !isBrowser) return
  if (pilotProfileSupabaseSaveTimeout) clearTimeout(pilotProfileSupabaseSaveTimeout)
  pilotProfileSupabaseSaveTimeout = setTimeout(async () => {
    pilotProfileSupabaseSaveTimeout = null
    try {
      const updateData: Record<string, unknown> = {
        full_name: pilotProfile.name || null,
        certificate_number: pilotProfile.certificateNumber || null,
        date_of_birth: pilotProfile.dateOfBirth || null,
        place_of_birth: pilotProfile.placeOfBirth || null,
        role: pilotProfile.role || 'STUDENT',
        cfi_number: pilotProfile.cfiNumber || null,
        cfi_expiration: pilotProfile.cfiExpiration || null,
        updated_at: new Date().toISOString()
      }
      if (pilotProfile.residentialAddress || pilotProfile.residentialCity || pilotProfile.residentialState || pilotProfile.residentialZip) {
        updateData.residential_address = {
          street: pilotProfile.residentialAddress || '',
          city: pilotProfile.residentialCity || '',
          state: pilotProfile.residentialState || '',
          zip: pilotProfile.residentialZip || ''
        }
      }
      if (pilotProfile.mailingAddress || pilotProfile.mailingCity || pilotProfile.mailingState || pilotProfile.mailingZip) {
        updateData.mailing_address = {
          street: pilotProfile.mailingAddress || '',
          city: pilotProfile.mailingCity || '',
          state: pilotProfile.mailingState || '',
          zip: pilotProfile.mailingZip || ''
        }
      }
      const preferences: Record<string, unknown> = {}
      if (pilotProfile.callsign) preferences.callsign = pilotProfile.callsign
      if (pilotProfile.homeBase) preferences.homeBase = pilotProfile.homeBase
      if (pilotProfile.certificates) preferences.certificates = pilotProfile.certificates
      if (pilotProfile.flightGoals) preferences.flightGoals = pilotProfile.flightGoals
      if (pilotProfile.notes) preferences.notes = pilotProfile.notes
      preferences.enableMilitaryFields = pilotProfile.enableMilitaryFields
      const simCatalog = getSimDeviceCatalogSnapshot()
      if (Object.keys(simCatalog).length > 0) {
        preferences.simDeviceTypes = simCatalog
      }
      updateData.preferences = preferences
      const { error } = await (supabase.from('user_profiles') as any)
        .upsert({ id: userId, ...updateData }, { onConflict: 'id' })
      if (error) console.warn('[SavePilotProfile] Supabase error:', error)
    } catch (err) {
      console.warn('[SavePilotProfile] Error saving to Supabase:', err)
    }
  }, 800)
}

// Aircraft lookup
const { lookupAircraft, lookupAircraftDetails } = useAircraftLookup()
const showAircraftModal = ref(false)
const currentAircraftInfo = ref<AircraftInfo | null>(null)
const aircraftModalNewTagInput = ref('')
const aircraftModalShowAddTag = ref(false)
const loadingAircraftInfo = ref(false)
const aircraftInfoError = ref<string | null>(null)
/** Family name for the aircraft currently shown in the Aircraft Information modal. Prefer catalog family from log entries (so renames are reflected); else from make/model. */
const currentAircraftFamilyName = computed(() => {
  const info = currentAircraftInfo.value
  if (!info) return ''
  const reg = (info.registration || '').trim().toUpperCase()
  if (reg) {
    const entryWithReg = logEntries.value.find(
      (e) => (e.registration || '').trim().toUpperCase() === reg
    )
    if (entryWithReg?.aircraftMakeModel)
      return effectiveFamilyKeyForEntry(entryWithReg)
  }
  const makeModel = [info.make, info.model].filter(Boolean).join(' ')
  return catalogAircraftFamilyKey(makeModel)
})

// Airport lookup
const { lookupAirport } = useAirportLookup()
const { lookupLocationCoords, getLocationCoordsFromCache } = useLocationLookup()

const locationClassificationCache = ref<Record<string, 'airport' | 'navaid' | 'unknown'>>({})
const classifiedRouteAirportSet = computed(() => {
  const set = new Set<string>()
  for (const [code, kind] of Object.entries(locationClassificationCache.value)) {
    if (kind === 'airport') set.add(code)
  }
  return set
})
const showAirportModal = ref(false)
const currentAirportInfo = ref<AirportInfo | null>(null)
const loadingAirportInfo = ref(false)
const airportInfoError = ref<string | null>(null)

// Airport names cache for display in catalog
const airportNames = ref<Record<string, string>>({})

const AIRPORT_HYDRATE_CONCURRENCY = 5
const airportHydratePendingNames: Record<string, string> = {}
let airportHydrateFlushScheduled = false
const airportHydrateInFlight = new Set<string>()
const airportHydrateQueued = new Set<string>()
let airportHydrateQueue: string[] = []

function flushPendingAirportNames(): void {
  airportHydrateFlushScheduled = false
  const keys = Object.keys(airportHydratePendingNames)
  if (keys.length === 0) return
  airportNames.value = { ...airportNames.value, ...airportHydratePendingNames }
  for (const key of keys) {
    delete airportHydratePendingNames[key]
  }
}

function scheduleAirportNamesFlush(): void {
  if (airportHydrateFlushScheduled) return
  airportHydrateFlushScheduled = true
  setTimeout(flushPendingAirportNames, 50)
}

function pumpAirportHydrateQueue(): void {
  while (
    airportHydrateInFlight.size < AIRPORT_HYDRATE_CONCURRENCY &&
    airportHydrateQueue.length > 0
  ) {
    const code = airportHydrateQueue.shift()!
    airportHydrateQueued.delete(code)
    void loadAirportNameIntoBatch(code)
  }
}

async function loadAirportNameIntoBatch(code: string): Promise<void> {
  const normalized = code.trim().toUpperCase()
  if (!normalized || airportNames.value[normalized] !== undefined) return

  airportHydrateInFlight.add(normalized)
  try {
    const info = await lookupAirport(normalized)
    airportHydratePendingNames[normalized] = info?.name ?? ''
    scheduleAirportNamesFlush()
  } catch (error) {
    airportHydratePendingNames[normalized] = ''
    scheduleAirportNamesFlush()
    console.warn(`Failed to load airport name for ${normalized}:`, error)
  } finally {
    airportHydrateInFlight.delete(normalized)
    pumpAirportHydrateQueue()
  }
}

function enqueueAirportNamesForHydration(codes: string[]): void {
  for (const code of codes) {
    const normalized = code.trim().toUpperCase()
    if (!normalized) continue
    if (airportNames.value[normalized] !== undefined) continue
    if (airportHydrateQueued.has(normalized) || airportHydrateInFlight.has(normalized)) continue
    airportHydrateQueued.add(normalized)
    airportHydrateQueue.push(normalized)
  }
  pumpAirportHydrateQueue()
}

// Format airport display text: "CODE - Name" or just "CODE" if name not loaded
function getAirportDisplayText(code: string): string {
  const name = airportNames.value[code]
  if (name) {
    return `${code} - ${name}`
  }
  return code
}

// Crew/Instructor profile modal
const showCrewProfileModal = ref(false)
const currentCrewName = ref<string>('')
const crewProfiles = ref<Record<string, CrewProfile>>({})
const isEditingCrewName = ref(false)
const editingCrewName = ref<string>('')
const crewModalNewTagInput = ref('')
const crewModalShowAddTag = ref(false)
/** After adding a person tag, number of log entries it was applied to (for Crew modal). */
const crewModalLastTagEntryCount = ref<number | null>(null)

// Aircraft family rename modal
const showRenameFamilyModal = ref(false)

const isDashboardShortcutBlocked = computed(
  () =>
    showSettingsModal.value ||
    showAuthModal.value ||
    showSignEntryModal.value ||
    showSignatureFinishModal.value ||
    showForm8710Modal.value ||
    showForm8710View.value ||
    showCurrencyDashboard.value ||
    showDashboardImportModal.value ||
    showExportDialog.value ||
    showDuplicateOverrideDialog.value ||
    showAircraftModal.value ||
    showAirportModal.value ||
    showCrewProfileModal.value ||
    showRenameFamilyModal.value ||
    showAuditTrail.value ||
    showAuditTrailSidebar.value ||
    expandedEntryId.value !== null ||
    (isIos.value && isCatalogDrawerOpen.value)
)

useDashboardShortcuts({
  isBlocked: isDashboardShortcutBlocked,
  onNewEntry: () => {
    if (!isEntryFormOpen.value) toggleEntryForm()
  },
  onFocusSearch: () => {
    searchInputRef.value?.focus()
  },
})

const renameFamilyOldName = ref<string>('')
const renameFamilyCanonicalKey = ref<string>('')
const renameFamilyNewName = ref<string>('')
const renameFamilySimType = ref<'' | SimTypeKey>('')

const renameFamilyShowSimType = computed(() => {
  const name = renameFamilyOldName.value
  if (!name) return false
  if (activeLogbook.value === 'simulator') return true
  return isTrainingDevice({
    aircraftMakeModel: name,
    aircraftCategoryClass: '',
    trainingElements: '',
  })
})
const editFamilyNewTagInput = ref('')
const editFamilyShowAddTag = ref(false)
/** After adding a family tag, number of log entries it was applied to (for Edit Family modal). */
const editFamilyLastTagEntryCount = ref<number | null>(null)
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuFamilyName = ref<string>('')

// Load crew profiles from Supabase (when authenticated) or localStorage (fallback)
async function loadCrewProfiles(): Promise<void> {
  if (!isBrowser) return
  
  // If authenticated, load from Supabase
  if (isAuthenticated.value && user.value) {
    try {
      const { data, error } = await (supabase
        .from('crew_profiles') as any)
        .select('*')
        .eq('user_id', user.value.id)
        .order('name')
      
      if (error) {
        console.error('Error loading crew profiles from Supabase:', error)
        // Fallback to localStorage
        loadCrewProfilesFromLocalStorage()
        return
      }
      
      if (data && data.length > 0) {
        // Convert Supabase format to localStorage format
        const profiles: Record<string, CrewProfile> = {}
        data.forEach((dbProfile: any) => {
          profiles[dbProfile.name] = {
            name: dbProfile.name,
            notes: dbProfile.notes || '',
            lastUpdated: dbProfile.updated_at || dbProfile.created_at || new Date().toISOString()
          }
        })
        crewProfiles.value = profiles
        console.log('[LoadCrewProfiles] Loaded', Object.keys(profiles).length, 'crew profiles from Supabase.')
        return
      } else {
        // No crew profiles in Supabase yet
        console.log('[LoadCrewProfiles] No crew profiles in Supabase yet.')
        return
      }
    } catch (err) {
      console.error('Error loading crew profiles from Supabase:', err)
      // Fallback to localStorage
      loadCrewProfilesFromLocalStorage()
      return
    }
  }
  
  // Not authenticated - load from localStorage
  loadCrewProfilesFromLocalStorage()
}

// Helper function to load from localStorage
function loadCrewProfilesFromLocalStorage(): void {
  if (!isBrowser) return
  try {
    const stored = readUserScopedLocal(CREW_PROFILES_STORAGE_KEY, true)
    if (stored) {
      crewProfiles.value = JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
}

// Save crew profiles to Supabase (when authenticated) or localStorage (fallback)
async function saveCrewProfiles(): Promise<void> {
  if (!isBrowser) return
  
  // If authenticated, save to Supabase
  if (isAuthenticated.value && user.value) {
    try {
      // Convert localStorage format to Supabase format
      const profilesToSave = Object.entries(crewProfiles.value).map(([name, profile]) => ({
        user_id: user.value!.id,
        name: profile.name || name,
        certificate_number: null, // Not stored in localStorage format
        certificate_type: null, // Not stored in localStorage format
        notes: profile.notes || null
      }))
      
      // Upsert all crew profiles
      const { error } = await (supabase
        .from('crew_profiles') as any)
        .upsert(profilesToSave, { onConflict: 'user_id,name' })
      
      if (error) {
        console.error('Error saving crew profiles to Supabase:', error)
        // Fallback to localStorage
        saveCrewProfilesToLocalStorage()
        return
      }
      
      console.log('[SaveCrewProfiles] Saved', profilesToSave.length, 'crew profiles to Supabase.')
      return
    } catch (error) {
      console.error('Error saving crew profiles to Supabase:', error)
      // Fallback to localStorage
      saveCrewProfilesToLocalStorage()
      return
    }
  }
  
  // Not authenticated - save to localStorage
  saveCrewProfilesToLocalStorage()
}

// Helper function to save to localStorage
function saveCrewProfilesToLocalStorage(): void {
  if (!isBrowser) return
  try {
    writeUserScopedLocal(CREW_PROFILES_STORAGE_KEY, JSON.stringify(crewProfiles.value))
  } catch {
    // Ignore save errors
  }
}

// Get or create a crew profile
function getCrewProfile(name: string): CrewProfile {
  if (!crewProfiles.value[name]) {
    crewProfiles.value[name] = {
      name,
      notes: '',
      lastUpdated: new Date().toISOString()
    }
  }
  return crewProfiles.value[name]
}

// Update crew profile notes
function updateCrewNotes(name: string, notes: string): void {
  if (!crewProfiles.value[name]) {
    crewProfiles.value[name] = { name, notes: '', lastUpdated: '' }
  }
  crewProfiles.value[name].notes = notes
  crewProfiles.value[name].lastUpdated = new Date().toISOString()
  saveCrewProfiles()
}

// Rename crew member
async function renameCrewMember(oldName: string, newName: string): Promise<void> {
  if (!oldName || !newName || oldName.trim() === newName.trim()) {
    return
  }
  
  const trimmedNewName = newName.trim()
  if (!trimmedNewName) {
    return
  }
  
  const oldNameLower = oldName.toLowerCase()
  
  // Update log entries in Supabase if authenticated
  if (isAuthenticated.value && user.value) {
    try {
      // Fetch all entries that need to be updated
      const { data: entriesToUpdate, error: fetchError } = await (supabase
        .from('log_entries') as any)
        .select('id, training_elements')
        .eq('user_id', user.value.id)
        .ilike('training_elements', oldName)
      
      if (fetchError) {
        console.error('[RenameCrewMember] Error fetching entries to update:', fetchError)
        // Continue with local updates even if database fetch fails
      } else if (entriesToUpdate && entriesToUpdate.length > 0) {
        // Update each entry in the database
        let successCount = 0
        let failCount = 0
        
        for (const entry of entriesToUpdate) {
          const { error: updateError } = await (supabase
            .from('log_entries') as any)
            .update({ training_elements: trimmedNewName })
            .eq('id', entry.id)
          
          if (updateError) {
            console.error(`[RenameCrewMember] Error updating entry ${entry.id}:`, updateError)
            failCount++
          } else {
            successCount++
          }
        }
        
        console.log(`[RenameCrewMember] Updated ${successCount} log entries in Supabase${failCount > 0 ? ` (${failCount} failed)` : ''}`)
      }
    } catch (error) {
      console.error('[RenameCrewMember] Exception updating entries in Supabase:', error)
      // Continue with local updates even if database update fails
    }
  }
  
  // Update all matching entries in local state
  logEntries.value = logEntries.value.map(entry => {
    if (entry.trainingElements && entry.trainingElements.toLowerCase() === oldNameLower) {
      return {
        ...entry,
        trainingElements: trimmedNewName
      }
    }
    return entry
  })
  
  // Migrate person tags to the new name so Crew modal still shows them (same as family rename)
  if (isAuthenticated.value && user.value) {
    const oldId = (oldName || '').trim()
    const newId = trimmedNewName
    if (oldId && newId && oldId !== newId) {
      try {
        const { error } = await (supabase.from('catalog_entity_tags') as any)
          .update({ entity_id: newId })
          .eq('user_id', user.value.id)
          .eq('entity_type', 'person')
          .eq('entity_id', oldId)
        if (error) console.error('[renameCrewMember] catalog_entity_tags', error)
        else await fetchEntityTags()
      } catch (e) {
        console.error('[renameCrewMember]', e)
      }
    }
  }

  // Update the crew profile key (move profile from old name to new name)
  // Find profile by case-insensitive key match
  const profileKey = Object.keys(crewProfiles.value).find(
    key => key.toLowerCase() === oldNameLower
  )

  if (profileKey && crewProfiles.value[profileKey]) {
    const profile = crewProfiles.value[profileKey]
    crewProfiles.value[trimmedNewName] = {
      ...profile,
      name: trimmedNewName,
      lastUpdated: new Date().toISOString()
    }
    delete crewProfiles.value[profileKey]
    saveCrewProfiles()
  }

  // Update currentCrewName if it matches the old name
  if (currentCrewName.value.toLowerCase() === oldNameLower) {
    currentCrewName.value = trimmedNewName
  }
}

// Show aircraft category as acronym (ASEL, AMEL) in the aircraft modal instead of raw "Fixed wing..."
function derivedAircraftCategoryDisplay(info: { category?: string; make?: string; model?: string } | null): string {
  if (!info) return ''
  const derived = deriveCategoryFromInfoShort(info, '')
  return derived || ''
}

function aircraftOwnerCheckedLabel(ownerCheckedAt: string): string {
  const checked = ownerCheckedAt.slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  return checked === today ? 'Owner checked today' : `Owner checked ${checked}`
}

function aircraftEngineTypeLabel(info: AircraftInfo | null): string {
  const display = aircraftEngineDisplay(info)
  return display.model || display.type || ''
}

function aircraftEngineClassLabel(info: AircraftInfo | null): string {
  const display = aircraftEngineDisplay(info)
  return display.model && display.type ? display.type : ''
}

// Category/Class normalization and autofill helpers
function normalizeCategoryClassLabel(value: string): string {
  if (!value) return ''
  const v = value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (/(^| )asel( |$)/.test(v) || v.includes('airplane sel') || (v.includes('single') && v.includes('engine') && v.includes('land'))) {
    return 'ASEL'
  }
  if (/(^| )amel( |$)/.test(v) || v.includes('airplane mel') || (v.includes('multi') && v.includes('engine') && v.includes('land'))) {
    return 'AMEL'
  }
  if (/(^| )ases( |$)/.test(v) || v.includes('airplane ses') || (v.includes('single') && v.includes('engine') && (v.includes('sea') || v.includes('seaplane') || v.includes('amphib')))) {
    return 'ASES'
  }
  if (/(^| )ames( |$)/.test(v) || v.includes('airplane mes') || (v.includes('multi') && v.includes('engine') && (v.includes('sea') || v.includes('seaplane') || v.includes('amphib')))) {
    return 'AMES'
  }
  // Rotorcraft
  if (v.includes('rotor') || v.includes('helicopter') || (` ${v} `).includes(' heli ')) {
    return 'HELI'
  }
  if (v.includes('gyro') || v.includes('autogyro') || v.includes('gyroplane')) {
    return 'GYRO'
  }
  // Glider
  if (v.includes('glider') || v.includes('sailplane')) {
    return 'GLID'
  }
  // Lighter-than-air
  if (v.includes('balloon')) {
    return 'BAL'
  }
  if (v.includes('airship') || v.includes('blimp') || v.includes('dirigible')) {
    return 'AIRS'
  }
  // Powered-lift
  if (v.includes('powered lift') || v.includes('tiltrotor') || v.includes('tilt rotor') || v.includes('vtol')) {
    return 'PL'
  }
  // Weight-shift
  if (v.includes('weight shift') || v.includes('weight-shift') || v.includes('trike')) {
    if (v.includes('sea') || v.includes('seaplane') || v.includes('amphib') || v.includes('float')) return 'WSC-S'
    return 'WSC-L'
  }
  if (/(cessna|piper|beech|diamond|cirrus|mooney)/.test(v)) {
    return 'ASEL'
  }
  return (value.trim() || '').toUpperCase()
}

function deriveCategoryFromTextShort(text: string): string {
  const t = (text || '').toLowerCase()
  const multiHints = [
    'pa-44', 'pa44', 'seminole',
    'pa-34', 'pa34', 'seneca',
    'pa-23', 'pa23', 'apache', 'aztec',
    'pa-31', 'pa31', 'navajo', 'chieftain',
    'da42', 'da62', 'diamond 42', 'diamond 62',
    'be-58', 'be58', 'baron',
    'be-76', 'be76', 'duchess',
    'be-55', 'be55', 'be-95', 'be95', 'travel air',
    'be-200', 'be200', 'king air', 'beech 200', 'beech 300', 'beech 350',
    'c310', '310r', 'cessna 310',
    'c340', 'cessna 340',
    'c402', 'cessna 402',
    'c414', 'cessna 414',
    'c421', 'cessna 421',
    'twin', 'multi', 'multi-engine',
    'p-68', 'partenavia', 'islander',
    'tecnam p2006t',
    'piper apache', 'piper aztec', 'piper seneca', 'piper seminole', 'piper navajo',
    'beechcraft baron', 'beechcraft duchess', 'beechcraft king air',
    'cessna 310', 'cessna 340', 'cessna 402', 'cessna 414', 'cessna 421'
  ]
  const seaHints = ['seaplane', 'float', 'amphib', 'sea']
  const heliHints = ['helicopter', 'rotor', 'r22', 'r44', 'r66', 'as350', 'bell', 'h125', 'ec135', 'uh 1', 's 76', 'aw139', 'aw 139']
  const gyroHints = ['gyro', 'autogyro', 'gyroplane', 'mto', 'calidus', 'cavalon']
  const gliderHints = ['glider', 'sailplane', 'schleicher', 'dg-100', 'ask', 'ls8', 'duo discus']
  const balloonHints = ['balloon', 'cameron', 'ultramagic']
  const airshipHints = ['airship', 'blimp', 'dirigible']
  const poweredLiftHints = ['tiltrotor', 'tilt rotor', 'vtol', 'v 22', 'v-22']
  const weightShiftHints = ['weight shift', 'weight-shift', 'trike']
  const isMulti = multiHints.some(h => t.includes(h))
  const isSea = seaHints.some(h => t.includes(h))
  if (heliHints.some(h => t.includes(h))) return 'HELI'
  if (gyroHints.some(h => t.includes(h))) return 'GYRO'
  if (gliderHints.some(h => t.includes(h))) return 'GLID'
  if (balloonHints.some(h => t.includes(h))) return 'BAL'
  if (airshipHints.some(h => t.includes(h))) return 'AIRS'
  if (poweredLiftHints.some(h => t.includes(h))) return 'PL'
  if (weightShiftHints.some(h => t.includes(h))) return isSea ? 'WSC-S' : 'WSC-L'
  if (isMulti && isSea) return 'AMES'
  if (isMulti) return 'AMEL'
  if (isSea) return 'ASES'
  return 'ASEL'
}

function deriveCategoryFromInfoShort(info: any, fallbackMakeModel: string): string {
  const category = (info?.category || '').toLowerCase()

  if (category.includes('single') && (category.includes('land') || category.includes('fixed'))) return 'ASEL'
  if (category.includes('single') && (category.includes('sea') || category.includes('amphib'))) return 'ASES'
  if (category.includes('multi') && (category.includes('land') || category.includes('fixed'))) return 'AMEL'
  if (category.includes('multi') && (category.includes('sea') || category.includes('amphib'))) return 'AMES'
  if (category.includes('rotor') || category.includes('helicopter')) return 'HELI'
  if (category.includes('gyro') || category.includes('autogyro')) return 'GYRO'
  if (category.includes('glider') || category.includes('sailplane')) return 'GLID'
  if (category.includes('balloon')) return 'BAL'
  if (category.includes('airship') || category.includes('blimp')) return 'AIRS'
  if (category.includes('powered lift') || category.includes('tiltrotor') || category.includes('vtol')) return 'PL'
  if (category.includes('weight shift')) {
    if (category.includes('sea') || category.includes('amphib')) return 'WSC-S'
    return 'WSC-L'
  }

  return deriveCategoryFromTextShort(`${info?.make || ''} ${info?.model || ''} ${fallbackMakeModel || ''}`)
}

function normalizeAndAutofillCategories(): void {
  const cacheRaw = isBrowser ? window.localStorage.getItem(DEVICE_GLOBAL_STORAGE_KEYS.AIRCRAFT_CACHE) : null
  let cache: Record<string, any> = {}
  if (cacheRaw) {
    try { cache = JSON.parse(cacheRaw) as Record<string, any> } catch { cache = {} }
  }
  const updated = logEntries.value.map((entry) => {
    let aircraftCategoryClass = normalizeCategoryClassLabel(entry.aircraftCategoryClass || '')
    if (!aircraftCategoryClass) {
      const reg = (entry.registration || '').toUpperCase().trim()
      if (reg && cache[reg]) {
        aircraftCategoryClass = deriveCategoryFromInfoShort(cache[reg], entry.aircraftMakeModel || '')
      }
      if (!aircraftCategoryClass && entry.aircraftMakeModel) {
        aircraftCategoryClass = deriveCategoryFromTextShort(entry.aircraftMakeModel)
      }
    }
    if (!aircraftCategoryClass) {
      return entry
    }
    return { ...entry, aircraftCategoryClass }
  })
  logEntries.value = updated
}


function fillFieldWithTotalTime(fieldKey: FlightTimeKey, totalTime: number | null, isInline: boolean): void {
  // Only fill if total time has a value and field is not 'total'
  if (fieldKey === 'total' || totalTime === null || totalTime === undefined) {
    return
  }
  
  if (isInline && inlineEditEntry.value) {
    inlineEditEntry.value.flightTime[fieldKey] = totalTime
  } else {
    newEntry.flightTime[fieldKey] = totalTime
  }
}

function getSelectedSimType(entry: { flightTime: { ffs?: number | null; ftd?: number | null; atd?: number | null } } | null): '' | SimTypeKey {
  if (!entry?.flightTime) return ''
  const ft = entry.flightTime
  // Treat as selected if the key is set (including 0), so the time input is enabled after picking a type
  if (ft.ffs != null) return 'FFS'
  if (ft.ftd != null) return 'FTD'
  if (ft.atd != null) return 'ATD'
  return ''
}

/** True when the entry is logging simulator time (FFS/FTD/ATD). Aircraft and Ident are optional in that case. */
function isLoggingSimTime(entry: { flightTime?: { ffs?: number | null; ftd?: number | null; atd?: number | null } }): boolean {
  const ft = entry?.flightTime ?? {}
  return ft.ffs != null || ft.ftd != null || ft.atd != null
}

function setSimType(entry: { flightTime: { ffs?: number | null; ftd?: number | null; atd?: number | null }; aircraftCategoryClass?: string }, type: '' | SimTypeKey): void {
  const ft = entry.flightTime
  if (type === '') {
    ft.ffs = null
    ft.ftd = null
    ft.atd = null
    return
  }
  const key = type.toLowerCase() as 'ffs' | 'ftd' | 'atd'
  const current = ft[key] ?? 0
  ft.ffs = type === 'FFS' ? current : null
  ft.ftd = type === 'FTD' ? current : null
  ft.atd = type === 'ATD' ? current : null
  // So sim-only entries display correctly, set aircraftCategoryClass when it's empty or already a sim type
  const cc = (entry.aircraftCategoryClass || '').toUpperCase()
  if (!cc || cc === 'FFS' || cc === 'FTD' || cc === 'ATD') {
    entry.aircraftCategoryClass = type
  }
}

function formatEntryTimeDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return Number(value).toFixed(1)
}

function applySimTypeToEntry(entry: LogEntry, type: SimTypeKey): void {
  const ft = entry.flightTime
  const time = (ft.ffs ?? 0) || (ft.ftd ?? 0) || (ft.atd ?? 0) || (ft.total ?? 0) || 0
  setSimType(entry, type)
  if (time > 0) {
    entry.flightTime[type.toLowerCase() as 'ffs' | 'ftd' | 'atd'] = time
  }
  entry.logbookType = 'simulator'
}

function applyImportSimTypeOverrides(): void {
  for (const entry of importPreviewAllEntries.value) {
    if (inferLogbookType(entry) !== 'simulator') continue
    const key = importPreviewSimDeviceKey(entry)
    const type = importSimTypeOverrides.value[key]
    if (!type) continue
    applySimTypeToEntry(entry, type)
    if (importSimRememberDevice.value[key]) {
      setCatalogSimDeviceType(entry.aircraftMakeModel, type)
    }
  }
  persistSimDeviceCatalog()
}

function persistSimDeviceCatalog(): void {
  savePilotProfilePrefs()
  savePilotProfileToSupabase()
}

function getSimTimeDisplayValue(entry: { flightTime: { ffs?: number | null; ftd?: number | null; atd?: number | null } }): string {
  const sel = getSelectedSimType(entry)
  if (!sel) return ''
  const v = entry.flightTime[sel.toLowerCase() as 'ffs' | 'ftd' | 'atd']
  return formatEntryTimeDisplay(v)
}

/** Distribute sim session time into pic/sic/dual/solo based on role. */
function syncSimRoleTime(entry: { role: string; flightTime: FlightTimeBreakdown }): void {
  const ft = entry.flightTime
  const simTime = getSimTimeSum(entry as LogEntry)
  ft.pic = null
  ft.sic = null
  ft.dual = null
  ft.solo = null
  if (simTime <= 0) return
  if (entry.role === 'PIC') {
    ft.pic = simTime
  } else if (entry.role === 'SIC') {
    ft.sic = simTime
  } else if (entry.role === 'Dual Received') {
    ft.dual = simTime
  } else if (entry.role === 'Solo') {
    ft.solo = simTime
    ft.pic = simTime
  }
}

function toggleFixedTag(entry: { tags?: string[] }, tag: string): void {
  const tags = entry.tags || (entry.tags = [])
  const i = tags.indexOf(tag)
  if (i >= 0) tags.splice(i, 1)
  else tags.push(tag)
}

function addCustomTag(entry: { tags?: string[] }, label: string): void {
  const t = (label || '').trim()
  if (!t) return
  const tags = entry.tags || (entry.tags = [])
  if (!tags.includes(t)) tags.push(t)
  addTagPreset(t)
}

function removeTag(entry: { tags?: string[] }, tag: string): void {
  const tags = entry.tags
  if (!tags) return
  const i = tags.indexOf(tag)
  if (i >= 0) tags.splice(i, 1)
}

/** Tags on entry that are not in the preset list (one-off customs). */
function customTagsFor(entry: { tags?: string[] }): string[] {
  const tags = entry.tags || []
  return tags.filter((t) => !allTagOptions.value.includes(t))
}

function createBlankEntry(): EditableLogEntry {
  return {
    date: '',
    role: activeLogbook.value === 'simulator' ? 'Dual Received' : roleOptions[0],
    aircraftCategoryClass: '',
    categoryClassTime: null,
    aircraftMakeModel: '',
    registration: '',
    flightNumber: null,
    departure: '',
    destination: '',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    picName: null,
    sicName: null,
    flightConditions: [],
    remarks: '',
    tags: [],
    logbookType: activeLogbook.value,
    flightTime: createEmptyFlightTime(),
    performance: createEmptyPerformance(),
    oooi: createEmptyOOOI(),
    flagged: false
  }
}

function generateEntryId(): string {
  // Use crypto.randomUUID() for proper UUID v4 generation
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers (shouldn't be needed in modern browsers)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function resetForm(): void {
  duplicateWarning.value = null
  saveAnyway.value = false
  validationWarning.value = false
  saveAnywayValidation.value = false
  clearValidation()
  successMessage.value = null
  Object.assign(newEntry, createBlankEntry())
  editingEntryId.value = null
  // Reset manual XC time tracking when form is reset
  xcTimeManuallySet.value = false
  lastKnownXcTime.value = null
}

function maybeAutoOpenEntryFormForEmptyLogbook(): void {
  if (isIos.value) return
  if (logEntries.value.length === 0 && isAuthenticated.value) {
    expandedEntryId.value = null
    inlineEditEntry.value = null
    isInlineCommercialMode.value = false
    isEntryFormOpen.value = true
  }
}

function ensureDefaultSignInstructor(): void {
  void fetchInstructors().then(() => {
    if (signInstructorId.value) return
    if (mainInstructorsForSigning.value[0]) {
      signInstructorId.value = mainInstructorsForSigning.value[0].instructor_id
      return
    }
    if (activeInstructorsForSigning.value[0]) {
      signInstructorId.value = activeInstructorsForSigning.value[0].instructor_id
      return
    }
    signInstructorId.value = GUEST_SIGNER_VALUE
  })
}

function openNewEntryForm(draft?: EditableLogEntry): void {
  closeAuditTrailSidebar()
  expandedEntryId.value = null
  inlineEditEntry.value = null
  isInlineCommercialMode.value = false
  successMessage.value = null
  editingEntryId.value = null
  isCommercialMode.value = false
  Object.assign(newEntry, createBlankEntry(), draft ?? {})
  showSimSection.value = (draft?.logbookType ?? activeLogbook.value) === 'simulator'
  isEntryFormOpen.value = true
  ensureDefaultSignInstructor()
}

function toggleEntryForm(): void {
  if (isEntryFormOpen.value) {
    isEntryFormOpen.value = false
    closeAuditTrailSidebar()
    if (!editingEntryId.value) {
      resetForm()
    }
    return
  }
  openNewEntryForm()
}

const duplicableLastEntry = computed(() =>
  findDuplicableLastEntry(logEntries.value, activeLogbook.value, supersededIdSet.value)
)

function duplicateLastFlight(): void {
  const source = duplicableLastEntry.value
  if (!source) return
  openNewEntryForm(buildDuplicatedDraft(source))
}

function toggleCatalogSection(key: CatalogKey): void {
  catalogOpenState[key] = !catalogOpenState[key]
}

function sortAirportCatalogCodes(a: string, b: string): number {
  const aStartsWithNumber = /^\d/.test(a)
  const bStartsWithNumber = /^\d/.test(b)
  if (aStartsWithNumber !== bStartsWithNumber) {
    return aStartsWithNumber ? 1 : -1
  }
  return a.localeCompare(b)
}

function normalizedCatalogSearch(key: CatalogKey): string {
  return (catalogSearchTerms[key] || '').trim().toLowerCase()
}

function getFilteredCatalogItems(key: Exclude<CatalogKey, 'aircraft'>): string[] {
  const items = catalogs.value[key] || []
  const query = normalizedCatalogSearch(key)
  if (!query) return items
  if (key === 'airports') {
    const queryCanon = toCatalogAirportCode(query.toUpperCase())
    return items.filter((code) => {
      if (code.toLowerCase().includes(query)) return true
      if (queryCanon && code === queryCanon) return true
      const name = airportNames.value[code]
      return name ? name.toLowerCase().includes(query) : false
    })
  }
  return items.filter((item) => item.toLowerCase().includes(query))
}

const filteredCatalogItemsBySection = computed(() => {
  const airports = getFilteredCatalogItems('airports')
  const pilots = getFilteredCatalogItems('pilots')
  const categoryClass = getFilteredCatalogItems('categoryClass')
  return {
    aircraft: [] as string[],
    airports,
    pilots,
    categoryClass,
  } satisfies Record<CatalogKey, string[]>
})

const filteredAircraftFamiliesList = computed(() => {
  const families = catalogs.value.families || []
  const query = normalizedCatalogSearch('aircraft')
  if (!query) return families
  return families.filter((fam) => {
    const display = (catalogs.value.familyDisplayName?.[fam] ?? fam).toLowerCase()
    if (display.includes(query) || fam.toLowerCase().includes(query)) return true
    const items = catalogs.value.familyToItems?.[fam] || []
    return items.some((item) => item.toLowerCase().includes(query))
  })
})

const filteredAircraftItemsByFamily = computed(() => {
  const query = normalizedCatalogSearch('aircraft')
  const map: Record<string, string[]> = {}
  const families = catalogs.value.families || []
  for (const fam of families) {
    const items = catalogs.value.familyToItems?.[fam] || []
    if (!query) {
      map[fam] = items
      continue
    }
    const display = (catalogs.value.familyDisplayName?.[fam] ?? fam).toLowerCase()
    if (display.includes(query) || fam.toLowerCase().includes(query)) {
      map[fam] = items
    } else {
      map[fam] = items.filter((item) => item.toLowerCase().includes(query))
    }
  }
  return map
})

function formatOOOIInput(value: string): string {
  // Remove non-digits and limit to 4 characters
  return value.replace(/\D/g, '').slice(0, 4)
}

/**
 * Convert OOOI time format from "HHMM" to "HH:MM"
 * @param time Time string in HHMM format (e.g., "1430") or null
 * @returns Time string in HH:MM format (e.g., "14:30") or null if invalid
 */
function convertOOOITimeToHHMM(time: string | null): string | null {
  if (!time || time.length === 0) return null
  
  // Remove non-digits
  let digits = time.replace(/\D/g, '')
  
  // Handle 3-digit times (e.g., "083" -> "0803" for 8:03 AM)
  if (digits.length === 3) {
    digits = '0' + digits // Prepend 0 to make it 4 digits
  }
  
  // Pad to 4 characters if less than 4 (handles 1-2 digit times)
  digits = digits.padStart(4, '0')
  
  if (digits.length !== 4) return null
  
  const hours = parseInt(digits.slice(0, 2), 10)
  const minutes = parseInt(digits.slice(2, 4), 10)
  
  // Validate hours and minutes
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }
  
  // Format as HH:MM
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

function autoCheckFlightConditions(
  conditions: string[], 
  nightTime: number | null, 
  actualInstrumentTime: number | null, 
  simulatedInstrumentTime: number | null, 
  xcTime: number | null,
  nvgTime: number | null = null
): string[] {
  const conditionSet = new Set(conditions)
  
  // Auto-check Night if night time > 0.
  // Do not auto-uncheck: users may intentionally mark a leg as night
  // even when night time is not captured yet.
  if (nightTime && nightTime > 0) {
    conditionSet.add('nightVfr')
  }

  // Auto-check NVG when NVG time > 0; do not auto-uncheck when cleared (matches night)
  if (nvgTime && nvgTime > 0) {
    conditionSet.add('nvg')
  }
  
  // Auto-check IFR AND Actual Instrument if actual instrument time > 0
  if (actualInstrumentTime && actualInstrumentTime > 0) {
    conditionSet.add('ifr')
    conditionSet.add('actualInstrument')
  } else {
    // Only auto-uncheck Actual Instrument when time is 0
    // Keep IFR checked (can be flown in VMC without actual instrument time)
    conditionSet.delete('actualInstrument')
  }
  
  // Auto-check Simulated Instrument if hood/simulator time > 0
  if (simulatedInstrumentTime && simulatedInstrumentTime > 0) {
    conditionSet.add('simInstrument')
  } else {
    conditionSet.delete('simInstrument')
  }
  
  // Auto-check Cross-Country if XC time > 0
  if (xcTime && xcTime > 0) {
    conditionSet.add('crossCountry')
  } else {
    conditionSet.delete('crossCountry')
  }
  
  return Array.from(conditionSet)
}

function toggleSidebar(): void {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

interface CatalogsValue {
  aircraft: string[]
  airports: string[]
  pilots: string[]
  categoryClass: string[]
  families: string[]
  familyToItems: Record<string, string[]>
  familyDisplayName: Record<string, string>
  totalAircraftItems: number
}

const EMPTY_CATALOGS: CatalogsValue = {
  aircraft: [],
  airports: [],
  pilots: [],
  categoryClass: [],
  families: [],
  familyToItems: {},
  familyDisplayName: {},
  totalAircraftItems: 0,
}

const iosCatalogCache = shallowRef<CatalogsValue>({ ...EMPTY_CATALOGS })
const iosCatalogBuilt = ref(false)
const iosCatalogBuilding = ref(false)
const IOS_CATALOG_BATCH_SIZE = 100
let iosCatalogBuildGeneration = 0

function initFamilyOpenStateForCatalog(families: string[]): void {
  const defaultExpandFamilies = families.length <= 3
  families.forEach((fam) => {
    if (familyOpenState[fam] === undefined) {
      familyOpenState[fam] = defaultExpandFamilies
    }
  })
}

interface CatalogBuildAccumulator {
  aircraft: Set<string>
  airports: Set<string>
  pilots: Set<string>
  categoryClass: Set<string>
  familiesSet: Set<string>
  familyMakeModelCounts: Record<string, Record<string, number>>
  familyToItemsMap: Record<string, Set<string>>
  seenTails: Set<string>
}

function createCatalogBuildAccumulator(): CatalogBuildAccumulator {
  return {
    aircraft: new Set<string>(),
    airports: new Set<string>(),
    pilots: new Set<string>(),
    categoryClass: new Set<string>(),
    familiesSet: new Set<string>(),
    familyMakeModelCounts: {},
    familyToItemsMap: {},
    seenTails: new Set<string>(),
  }
}

function processCatalogEntryIntoAccumulator(
  acc: CatalogBuildAccumulator,
  entry: LogEntry,
  tailFamilyMap: Map<string, string>,
  airportSet: Set<string>
): void {
  const makeModel = entry.aircraftMakeModel.trim()
  const tail = entry.registration.trim().toUpperCase()
  const fam = effectiveCatalogFamilyKey(entry, tailFamilyMap)

  if (makeModel || tail) {
    acc.aircraft.add(tail ? `${makeModel || 'Airframe'} · ${tail}` : makeModel)
  }
  if (fam && makeModel) {
    if (!acc.familyMakeModelCounts[fam]) acc.familyMakeModelCounts[fam] = {}
    acc.familyMakeModelCounts[fam][makeModel] = (acc.familyMakeModelCounts[fam][makeModel] || 0) + 1
  }
  getEntryAirportCodes(entry, airportSet).forEach((code) => acc.airports.add(code))
  if (entry.trainingElements.trim()) {
    acc.pilots.add(entry.trainingElements.trim())
  }
  if (entry.aircraftCategoryClass.trim()) {
    acc.categoryClass.add(entry.aircraftCategoryClass.trim().toUpperCase())
  }

  if (!fam) return
  const tailKey = normalizeAircraftTailKey(entry.registration)
  const tailDisplay = entry.registration.trim().toUpperCase()
  if (tailKey) {
    if (acc.seenTails.has(tailKey)) return
    acc.seenTails.add(tailKey)
    acc.familiesSet.add(fam)
    if (!acc.familyToItemsMap[fam]) acc.familyToItemsMap[fam] = new Set<string>()
    acc.familyToItemsMap[fam]!.add(tailDisplay)
  } else if (makeModel) {
    acc.familiesSet.add(fam)
    if (!acc.familyToItemsMap[fam]) acc.familyToItemsMap[fam] = new Set<string>()
    acc.familyToItemsMap[fam]!.add(makeModel)
  }
}

function finalizeCatalogAccumulator(acc: CatalogBuildAccumulator): CatalogsValue {
  const familyDisplayName: Record<string, string> = {}
  for (const fam of acc.familiesSet) {
    const counts = acc.familyMakeModelCounts[fam] ?? {}
    const entries = Object.entries(counts)
    const mode = entries.length ? entries.sort((a, b) => b[1] - a[1])[0]![0] : fam
    familyDisplayName[fam] = mode
  }

  const familyToItems: Record<string, string[]> = {}
  const families = Array.from(acc.familiesSet).sort((a, b) => a.localeCompare(b))
  families.forEach((fam) => {
    familyToItems[fam] = Array.from(acc.familyToItemsMap[fam] || []).sort((a, b) => a.localeCompare(b))
  })

  const totalAircraftItems = families.reduce(
    (sum, fam) => sum + (familyToItems[fam]?.length || 0),
    0
  )

  return {
    aircraft: Array.from(acc.aircraft).sort((a, b) => a.localeCompare(b)),
    airports: Array.from(acc.airports).sort(sortAirportCatalogCodes),
    pilots: Array.from(acc.pilots).sort((a, b) => a.localeCompare(b)),
    categoryClass: Array.from(acc.categoryClass).sort((a, b) => a.localeCompare(b)),
    families,
    familyToItems,
    familyDisplayName,
    totalAircraftItems,
  }
}

function getCatalogTailFamilyMap(): Map<string, string> {
  if (isIos.value) {
    if (iosTailCatalogFamilyMap.value.size === 0 && logEntries.value.length > 0) {
      refreshIosTailCatalogFamilyMap()
    }
    return iosTailCatalogFamilyMap.value
  }
  return tailCatalogFamilyMap.value
}

function buildCatalogsFromEntries(): CatalogsValue {
  const acc = createCatalogBuildAccumulator()
  const tailFamilyMap = getCatalogTailFamilyMap()
  const airportSet = classifiedRouteAirportSet.value
  const entriesForActiveCatalog = logEntries.value.filter(
    (entry) => inferLogbookType(entry) === activeLogbook.value
  )
  for (const entry of entriesForActiveCatalog) {
    processCatalogEntryIntoAccumulator(acc, entry, tailFamilyMap, airportSet)
  }
  return finalizeCatalogAccumulator(acc)
}

async function scheduleIosCatalogBuild(): Promise<void> {
  if (!isIos.value) return

  iosCatalogBuilding.value = true
  iosCatalogBuilt.value = false
  const generation = ++iosCatalogBuildGeneration

  const tailFamilyMap = getCatalogTailFamilyMap()
  const airportSet = classifiedRouteAirportSet.value
  const entriesForActiveCatalog = logEntries.value.filter(
    (entry) => inferLogbookType(entry) === activeLogbook.value
  )
  const acc = createCatalogBuildAccumulator()

  for (let i = 0; i < entriesForActiveCatalog.length; i += IOS_CATALOG_BATCH_SIZE) {
    if (generation !== iosCatalogBuildGeneration) return
    if (!isCatalogDrawerOpen.value) {
      iosCatalogBuilding.value = false
      return
    }

    const batch = entriesForActiveCatalog.slice(i, i + IOS_CATALOG_BATCH_SIZE)
    for (const entry of batch) {
      processCatalogEntryIntoAccumulator(acc, entry, tailFamilyMap, airportSet)
    }

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }

  if (generation !== iosCatalogBuildGeneration || !isCatalogDrawerOpen.value) {
    iosCatalogBuilding.value = false
    return
  }

  const built = finalizeCatalogAccumulator(acc)
  initFamilyOpenStateForCatalog(built.families)
  iosCatalogCache.value = built
  iosCatalogBuilt.value = true
  iosCatalogBuilding.value = false
}

function buildIosCatalogIndex(): void {
  if (!isIos.value) return
  const built = buildCatalogsFromEntries()
  initFamilyOpenStateForCatalog(built.families)
  iosCatalogCache.value = built
  iosCatalogBuilt.value = true
  iosCatalogBuilding.value = false
}

function invalidateIosCatalogCache(): void {
  if (!isIos.value) return
  iosCatalogBuildGeneration++
  iosCatalogBuilt.value = false
  iosCatalogBuilding.value = false
  iosCatalogCache.value = {
    aircraft: [],
    airports: [],
    pilots: [],
    categoryClass: [],
    families: [],
    familyToItems: {},
    familyDisplayName: {},
    totalAircraftItems: 0,
  }
}

function ensureIosCatalogIndex(): void {
  if (!isIos.value || iosCatalogBuilt.value || iosCatalogBuilding.value) return
  void scheduleIosCatalogBuild()
}

const catalogs = computed<CatalogsValue>(() => {
  if (isIos.value) {
    return iosCatalogBuilt.value ? iosCatalogCache.value : EMPTY_CATALOGS
  }
  const built = buildCatalogsFromEntries()
  initFamilyOpenStateForCatalog(built.families)
  return built
})

watch(() => logEntries.value.length, () => {
  if (!isIos.value) return
  if (iosCatalogDebounceTimer) clearTimeout(iosCatalogDebounceTimer)
  iosCatalogDebounceTimer = setTimeout(() => {
    refreshIosTailCatalogFamilyMap()
    invalidateIosCatalogCache()
    if (isCatalogDrawerOpen.value) {
      void scheduleIosCatalogBuild()
    }
  }, IOS_CATALOG_DEBOUNCE_MS)
})

watch(activeLogbook, () => {
  if (isIos.value) {
    invalidateIosCatalogCache()
    if (isCatalogDrawerOpen.value) {
      void scheduleIosCatalogBuild()
    }
  }
})

function openCatalogDrawer(): void {
  if (isIos.value) {
    isCatalogDrawerOpen.value = true
    void scheduleIosCatalogBuild()
    return
  }
  isCatalogDrawerOpen.value = true
}

function closeCatalogDrawer(): void {
  iosCatalogBuildGeneration++
  iosCatalogBuilding.value = false
  isCatalogDrawerOpen.value = false
}

function handleIosOverlayEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (showCrewProfileModal.value) {
    closeCrewProfileModal()
  } else if (isCatalogDrawerOpen.value) {
    closeCatalogDrawer()
  } else if (isEntryFormOpen.value) {
    toggleEntryForm()
  } else if (expandedEntryId.value !== null) {
    cancelInlineEdit()
  }
}

const isIosOverlayOpen = computed(
  () =>
    isCatalogDrawerOpen.value ||
    isEntryFormOpen.value ||
    expandedEntryId.value !== null ||
    showCrewProfileModal.value
)

function setIosOverlayScrollLock(open: boolean): void {
  if (!isBrowser || !isIos.value) return
  document.documentElement.style.overflow = open ? 'hidden' : ''
  document.documentElement.style.overflowX = open ? 'hidden' : ''
  document.body.style.overflowX = open ? 'hidden' : ''
  document.body.style.overflow = open ? 'hidden' : ''
}

watch(isIosOverlayOpen, (open) => {
  if (!isBrowser || !isIos.value) return
  setIosOverlayScrollLock(open)
  if (open) {
    window.addEventListener('keydown', handleIosOverlayEscape)
  } else {
    window.removeEventListener('keydown', handleIosOverlayEscape)
  }
})

useCatalogDrawerGestures({
  isOpen: isCatalogDrawerOpen,
  drawerEl: catalogDrawerRef,
  onOpen: () => {
    if (!isEntryFormOpen.value && expandedEntryId.value === null) {
      openCatalogDrawer()
    }
  },
  onClose: closeCatalogDrawer,
})

const pullToRefreshDisabled = computed(
  () =>
    showSettingsModal.value ||
    isEntryFormOpen.value ||
    isCatalogDrawerOpen.value ||
    expandedEntryId.value !== null ||
    showCrewProfileModal.value ||
    showAuthModal.value ||
    isDashboardRefreshing.value ||
    isLoadEntriesRunning.value
)

const { pullDistance, isPulling, isRefreshing: isPullRefreshing } = usePullToRefresh({
  onRefresh: refreshDashboardData,
  disabled: pullToRefreshDisabled,
  scrollContainerRef: rootScrollContainerRef,
})

const pullTransformStyle = computed(() => {
  if (!isIos.value) return {}
  const y = isPullRefreshing.value ? 100 : pullDistance.value
  const transition = isPulling.value ? 'none' : 'transform 0.25s ease-out'
  return { transform: `translateY(${y}px)`, transition }
})

// Helpers to extract keys for filters
function extractTailFromCatalogItem(item: string): string | null {
  const text = (item || '').trim()
  const seps = ['·', '•', '-', '|', '–', '—']
  for (const s of seps) {
    if (text.includes(s)) {
      const parts = text.split(s).map((p) => p.trim()).filter(Boolean)
      // Catalog items are "Family · Registration" — use the part after the separator (any tail, not only N-numbers)
      if (parts.length >= 2) {
        const tail = parts[parts.length - 1]
        return tail ? tail.toUpperCase() : null
      }
    }
  }
  // No separator: catalog child items are tail-only
  return text ? text.toUpperCase() : null
}

function getActiveFilterKeys<T extends string>(record: Record<T, boolean>): T[] {
  return Object.keys(record).filter((k) => record[k as T]) as T[]
}

function clearAllFilters(): void {
  selectedFilters.aircraft = {}
  selectedFilters.airports = {}
  selectedFilters.pilots = {}
  selectedFilters.conditions = {}
  selectedFilters.families = {}
  selectedFilters.categoryClass = {}
  selectedFilters.flagged = false
  selectedFilters.tags = {}
  catalogSearchTerms.aircraft = ''
  catalogSearchTerms.airports = ''
  catalogSearchTerms.pilots = ''
  catalogSearchTerms.categoryClass = ''
}

// Aircraft family normalization (maps model variants to a base family)
function normalizeAircraftFamily(makeModel: string): string {
  if (!makeModel) return ''
  const s = makeModel.toUpperCase().replace(/\s+/g, ' ').trim()
  // Common families
  // Cessna: C150/C152/C172/C182/C206/C210/etc with optional suffix letters
  const cMatch = s.match(/\bC(\d{3})([A-Z]*)\b/)
  if (cMatch) {
    const base = `C${cMatch[1]}`
    return base
  }
  if (s.includes('CESSNA 172')) return 'C172'
  if (s.includes('CESSNA 182')) return 'C182'
  if (s.includes('CESSNA 150')) return 'C150'
  if (s.includes('CESSNA 152')) return 'C152'
  if (s.includes('CESSNA 206')) return 'C206'
  if (s.includes('CESSNA 210')) return 'C210'
  // Piper: PA-xx with optional dash/space and suffixes
  const pa = s.match(/\bPA[-\s]?(\d{2})\b/)
  if (pa) {
    return `PA-${pa[1]}`
  }
  if (s.includes('PIPER ARCHER') || s.includes('PA-28')) return 'PA-28'
  if (s.includes('PA-18')) return 'PA-18'
  if (s.includes('PA-32')) return 'PA-32'
  if (s.includes('PA-34')) return 'PA-34'
  // Cirrus
  if (s.includes('SR20')) return 'SR20'
  if (s.includes('SR22')) return 'SR22'
  // Diamond
  if (s.includes('DA40')) return 'DA40'
  if (s.includes('DA42')) return 'DA42'
  if (s.includes('DA20')) return 'DA20'
  // Beechcraft Baron/Bonanza
  if (s.includes('BE58') || s.includes('BARON')) return 'BE-58'
  if (s.includes('BE36') || s.includes('BONANZA')) return 'BE-36'
  // Embraer ERJ 170/175/190: single canonical key per family so renames don't create duplicate parents
  if (s.includes('ERJ 170') || s.includes('ERJ170') || s.includes('EMB-170') || s.includes('ERJ-170') || s.includes('FMB-170')) return 'ERJ-170'
  if (s.includes('ERJ 175') || s.includes('ERJ175') || s.includes('EMB-175') || s.includes('ERJ-175')) return 'ERJ-175'
  if (s.includes('ERJ 190') || s.includes('ERJ190') || s.includes('EMB-190') || s.includes('ERJ-190')) return 'ERJ-190'
  // Fallback: take first token with letters+digits (e.g., 'C172S' -> 'C172S'), then strip trailing letters to form family
  const token = (s.match(/\b[A-Z]+\d+[A-Z]*\b/) || [])[0]
  if (token) {
    const m = token.match(/^([A-Z]+\d+)/)
    if (m && m[1]) return m[1]
    return token
  }
  return s
}

async function showAircraftInfo(registration: string): Promise<void> {
  showAircraftModal.value = true
  loadingAircraftInfo.value = true
  aircraftInfoError.value = null
  currentAircraftInfo.value = null

  // Extract just the N-number from the catalog item
  // Catalog items might be formatted like "C172 · N653PA" or just "N653PA"
  let cleanRegistration = registration.trim()
  
  // If it contains a separator (· or - or |), extract the N-number part
  const separators = ['·', '•', '-', '|', '–', '—']
  for (const sep of separators) {
    if (cleanRegistration.includes(sep)) {
      const parts = cleanRegistration.split(sep).map(p => p.trim())
      // Find the part that starts with N
      const nNumberPart = parts.find(p => p.toUpperCase().startsWith('N'))
      if (nNumberPart) {
        cleanRegistration = nNumberPart
        break
      }
    }
  }
  
  // Extract N-number pattern (N followed by numbers/letters)
  const nNumberMatch = cleanRegistration.match(/N[A-Z0-9]+/i)
  if (nNumberMatch) {
    cleanRegistration = nNumberMatch[0].toUpperCase()
  }

  console.log('Looking up aircraft:', registration, '-> cleaned:', cleanRegistration)

  try {
    const info = await lookupAircraftDetails(cleanRegistration)
    console.log('Aircraft lookup result:', info)
    if (info) {
      currentAircraftInfo.value = info
    } else {
      console.warn('No aircraft info returned for:', cleanRegistration)
      aircraftInfoError.value = 'Aircraft information not found in FAA Registry.'
    }
  } catch (error) {
    console.error('Failed to lookup aircraft:', error)
    aircraftInfoError.value = `Failed to load aircraft information: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the browser console for details.`
  } finally {
    loadingAircraftInfo.value = false
  }
}

function closeAircraftModal(): void {
  showAircraftModal.value = false
  currentAircraftInfo.value = null
  aircraftInfoError.value = null
  aircraftModalShowAddTag.value = false
  aircraftModalNewTagInput.value = ''
}

// Aircraft family rename functions
const FAMILY_LONG_PRESS_MS = 500
const FAMILY_LONG_PRESS_MOVE_PX = 10

let familyLongPressTimer: ReturnType<typeof setTimeout> | null = null
let familyLongPressTriggered = false
let familyLongPressStartX = 0
let familyLongPressStartY = 0

function clearFamilyLongPressTimer(): void {
  if (familyLongPressTimer != null) {
    clearTimeout(familyLongPressTimer)
    familyLongPressTimer = null
  }
}

/** Touch/pen press-and-hold opens Edit Family (desktop keeps right-click). */
function onFamilyLongPressStart(event: PointerEvent, familyName: string): void {
  if (event.pointerType === 'mouse') return
  clearFamilyLongPressTimer()
  familyLongPressTriggered = false
  familyLongPressStartX = event.clientX
  familyLongPressStartY = event.clientY
  familyLongPressTimer = setTimeout(() => {
    familyLongPressTimer = null
    familyLongPressTriggered = true
    openRenameFamilyModalFor(familyName)
  }, FAMILY_LONG_PRESS_MS)
}

function onFamilyLongPressMove(event: PointerEvent): void {
  if (familyLongPressTimer == null) return
  const dx = event.clientX - familyLongPressStartX
  const dy = event.clientY - familyLongPressStartY
  if (dx * dx + dy * dy > FAMILY_LONG_PRESS_MOVE_PX * FAMILY_LONG_PRESS_MOVE_PX) {
    clearFamilyLongPressTimer()
  }
}

function onFamilyLongPressEnd(): void {
  clearFamilyLongPressTimer()
}

function onFamilyLongPressCancel(): void {
  clearFamilyLongPressTimer()
  familyLongPressTriggered = false
}

function onFamilyNameClick(familyName: string): void {
  if (familyLongPressTriggered) {
    familyLongPressTriggered = false
    return
  }
  familyOpenState[familyName] = !familyOpenState[familyName]
}

function showRenameFamilyContextMenu(event: MouseEvent, familyName: string): void {
  event.preventDefault()
  event.stopPropagation()
  // Long-press already opened the edit modal; ignore the follow-up contextmenu on iOS.
  if (familyLongPressTriggered) return
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuFamilyName.value = familyName
  contextMenuVisible.value = true
}

function closeContextMenu(): void {
  contextMenuVisible.value = false
  contextMenuFamilyName.value = ''
}

function openRenameFamilyModalFor(familyName: string): void {
  renameFamilyCanonicalKey.value = familyName
  renameFamilyOldName.value = catalogs.value.familyDisplayName?.[familyName] ?? familyName
  renameFamilyNewName.value = renameFamilyOldName.value
  renameFamilySimType.value = getCatalogSimDeviceType(familyName) ?? ''
  closeContextMenu()
  showRenameFamilyModal.value = true
}

function openRenameFamilyModal(): void {
  openRenameFamilyModalFor(contextMenuFamilyName.value)
}

function closeRenameFamilyModal(): void {
  showRenameFamilyModal.value = false
  renameFamilyOldName.value = ''
  renameFamilyCanonicalKey.value = ''
  renameFamilyNewName.value = ''
  renameFamilySimType.value = ''
  editFamilyShowAddTag.value = false
  editFamilyNewTagInput.value = ''
  editFamilyLastTagEntryCount.value = null
}

async function backfillFamilySimType(familyName: string, type: SimTypeKey | null): Promise<void> {
  const group = getFamilyRenameGroup(familyName)
  const groupSet = new Set(group.map((s) => s.toUpperCase()))
  const entriesToUpdate = logEntries.value.filter((entry) => {
    const normalized = normalizeAircraftFamily(entry.aircraftMakeModel)
    return (
      normalized &&
      groupSet.has(normalized.toUpperCase()) &&
      inferLogbookType(entry) === 'simulator'
    )
  })
  if (!entriesToUpdate.length) return

  for (const entry of entriesToUpdate) {
    if (type) {
      applySimTypeToEntry(entry, type)
    }
  }

  if (isAuthenticated.value && user.value) {
    for (const entry of entriesToUpdate) {
      try {
        await (supabase.from('log_entries') as any)
          .update({
            aircraft_category_class: entry.aircraftCategoryClass,
            flight_time: entry.flightTime,
            logbook_type: entry.logbookType,
          })
          .eq('id', entry.id)
          .eq('user_id', user.value.id)
        await updateEntryInIndexedDB(entry)
      } catch (e) {
        console.warn('[backfillFamilySimType] update failed for', entry.id, e)
      }
    }
  }
}

async function saveFamilySimTypeSetting(familyName: string, type: '' | SimTypeKey): Promise<void> {
  setCatalogSimDeviceType(familyName, type || null)
  persistSimDeviceCatalog()
  if (type) {
    await backfillFamilySimType(familyName, type)
  }
}

async function renameAircraftFamily(canonicalFamilyKey: string, newFamilyName: string): Promise<void> {
  const trimmedNewName = newFamilyName.trim()
  if (!canonicalFamilyKey.trim() || !trimmedNewName) {
    showToast('Enter a new family name', { type: 'error' })
    return
  }

  const catalogSimType = getCatalogSimDeviceType(canonicalFamilyKey)
  if (catalogSimType) {
    setCatalogSimDeviceType(trimmedNewName, catalogSimType)
    setCatalogSimDeviceType(canonicalFamilyKey, null)
    persistSimDeviceCatalog()
  }

  const group = getFamilyRenameGroup(canonicalFamilyKey)
  const entriesToUpdate = getLogEntriesInFamily(canonicalFamilyKey)

  if (entriesToUpdate.length === 0) {
    showToast('No log entries found for this family', { type: 'error' })
    return
  }

  const entryIdList = entriesToUpdate.map((e) => e.id).filter(Boolean)
  const entryIds = new Set(entryIdList)

  // Immediate UI update
  logEntries.value = logEntries.value.map((entry) => {
    if (entryIds.has(entry.id)) {
      return { ...entry, aircraftMakeModel: trimmedNewName }
    }
    return entry
  })

  let supabaseOk = true

  // Persist to Supabase by entry id (make/model strings vary; canonical group keys do not match DB values)
  if (isAuthenticated.value && user.value && entryIdList.length > 0) {
    try {
      const BATCH_SIZE = 100
      for (let i = 0; i < entryIdList.length; i += BATCH_SIZE) {
        const batchIds = entryIdList.slice(i, i + BATCH_SIZE)
        const { error } = await (supabase.from('log_entries') as any)
          .update({ aircraft_make_model: trimmedNewName })
          .eq('user_id', user.value.id)
          .in('id', batchIds)
        if (error) {
          console.error('[renameAircraftFamily] log_entries', error)
          supabaseOk = false
        }
      }

      const { data: updatedRows, error: fetchError } = await (supabase.from('log_entries') as any)
        .select('id, version, data_hash, updated_at, created_at, aircraft_make_model')
        .eq('user_id', user.value.id)
        .in('id', entryIdList)
      if (fetchError) {
        console.error('[renameAircraftFamily] fetch updated rows', fetchError)
      } else if (updatedRows?.length) {
        const rowById = new Map(
          (updatedRows as Array<Record<string, unknown>>).map((row) => [String(row.id), row])
        )
        const idSet = new Set(entryIds)
        logEntries.value = logEntries.value.map((entry) => {
          if (!idSet.has(entry.id)) return entry
          const row = rowById.get(entry.id)
          return {
            ...entry,
            aircraftMakeModel: trimmedNewName,
            version: (row?.version as number | undefined) ?? entry.version,
            dataHash: (row?.data_hash as string | undefined) ?? entry.dataHash,
            updatedAt: (row?.updated_at as string | undefined) ?? entry.updatedAt,
            createdAt: (row?.created_at as string | undefined) ?? entry.createdAt,
          }
        })
        for (const entry of logEntries.value) {
          if (idSet.has(entry.id)) {
            try {
              await saveSyncedEntryToIndexedDB(entry, user.value.id)
            } catch (e) {
              console.warn('[renameAircraftFamily] IndexedDB save failed for', entry.id, e)
            }
          }
        }
      } else if (!fetchError) {
        const idSet = new Set(entryIds)
        for (const entry of logEntries.value) {
          if (idSet.has(entry.id)) {
            try {
              await saveSyncedEntryToIndexedDB(entry, user.value.id)
            } catch (e) {
              console.warn('[renameAircraftFamily] IndexedDB save failed for', entry.id, e)
            }
          }
        }
      }
    } catch (e) {
      console.error('[renameAircraftFamily] log_entries', e)
      supabaseOk = false
    }
  }

  // Fallback IndexedDB write when offline / unauthenticated
  if (!isAuthenticated.value || !user.value) {
    const idSet = new Set(entriesToUpdate.map((e) => e.id))
    for (const entry of logEntries.value) {
      if (idSet.has(entry.id)) {
        try {
          await updateEntryInIndexedDB(entry, { userId: getStorageUserId() })
        } catch (e) {
          console.warn('[renameAircraftFamily] IndexedDB update failed for', entry.id, e)
        }
      }
    }
  }

  // Migrate all family tags (every entity_id in group) to the new canonical key, then dedupe
  const newId = trimmedNewName.trim()
  if (isAuthenticated.value && user.value && newId) {
    try {
      for (const oldId of group) {
        const id = (oldId || '').trim()
        if (!id || id === newId) continue
        const { error } = await (supabase.from('catalog_entity_tags') as any)
          .update({ entity_id: newId })
          .eq('user_id', user.value.id)
          .eq('entity_type', 'family')
          .eq('entity_id', id)
        if (error) console.error('[renameAircraftFamily] catalog_entity_tags', id, error)
      }
      // Dedupe: after merging, same (user, family, newId, tag) may appear multiple times; keep one per tag
      const { data: rows } = await (supabase.from('catalog_entity_tags') as any)
        .select('id, tag')
        .eq('user_id', user.value.id)
        .eq('entity_type', 'family')
        .eq('entity_id', newId)
      if (rows && rows.length > 1) {
        const byTag: Record<string, string[]> = {}
        for (const r of rows as { id: string; tag: string }[]) {
          if (!r.tag) continue
          if (!byTag[r.tag]) byTag[r.tag] = []
          byTag[r.tag]!.push(r.id)
        }
        for (const tag of Object.keys(byTag)) {
          const ids = byTag[tag]!
          if (ids.length > 1) {
            const [, ...toRemove] = ids
            for (const id of toRemove) {
              await (supabase.from('catalog_entity_tags') as any).delete().eq('id', id)
            }
          }
        }
      }
      await fetchEntityTags()
    } catch (e) {
      console.error('[renameAircraftFamily] catalog_entity_tags', e)
    }
  }

  closeRenameFamilyModal()

  if (!isAuthenticated.value || !user.value) {
    showToast(`Updated ${entriesToUpdate.length} ${entriesToUpdate.length === 1 ? 'entry' : 'entries'} locally`, { type: 'success' })
  } else if (!supabaseOk) {
    showToast('Name updated locally — sync may be needed', { type: 'success' })
  } else {
    showToast(`Renamed family on ${entriesToUpdate.length} ${entriesToUpdate.length === 1 ? 'entry' : 'entries'}`, { type: 'success' })
  }
}

async function confirmRenameFamily(): Promise<void> {
  if (!renameFamilyOldName.value || !renameFamilyNewName.value) {
    return
  }

  const trimmedNewName = renameFamilyNewName.value.trim()
  if (!trimmedNewName) {
    return
  }

  const nameChanged = trimmedNewName !== renameFamilyOldName.value
  const simTypeToSave = renameFamilyShowSimType.value ? renameFamilySimType.value : ''

  if (!nameChanged) {
    if (simTypeToSave) {
      await saveFamilySimTypeSetting(renameFamilyOldName.value, simTypeToSave)
    }
    closeRenameFamilyModal()
    return
  }

  const oldKey = (renameFamilyCanonicalKey.value || renameFamilyOldName.value).trim()
  const wouldCreateNewFamily = trimmedNewName !== oldKey && !catalogs.value.families?.includes(trimmedNewName)
  if (wouldCreateNewFamily && !window.confirm('This will create a new family group. Continue?')) {
    return
  }

  if (!renameFamilyCanonicalKey.value) {
    showToast('Could not determine aircraft family — close and try again', { type: 'error' })
    return
  }

  await renameAircraftFamily(renameFamilyCanonicalKey.value, trimmedNewName)
  if (simTypeToSave) {
    await saveFamilySimTypeSetting(trimmedNewName, simTypeToSave)
  }
}

// Computed: count of entries that will be renamed (full consolidation group, including typos)
const entriesToRenameCount = computed(() => {
  if (!renameFamilyCanonicalKey.value) return 0
  return getLogEntriesInFamily(renameFamilyCanonicalKey.value).length
})

async function showAirportInfo(airportCode: string): Promise<void> {
  showAirportModal.value = true
  loadingAirportInfo.value = true
  airportInfoError.value = null
  currentAirportInfo.value = null

  // Clean the airport code (remove any extra formatting)
  let cleanCode = airportCode.trim().toUpperCase().replace(/\s+/g, '')
  
  // Extract just the airport code if it's formatted with other text
  const codeMatch = cleanCode.match(/[A-Z]{3,4}/)
  if (codeMatch) {
    cleanCode = codeMatch[0]
  }

  console.log('Looking up airport:', airportCode, '-> cleaned:', cleanCode)

  try {
    const info = await lookupAirport(cleanCode)
    console.log('Airport lookup result:', info)
    if (info) {
      currentAirportInfo.value = info
    } else {
      console.warn('No airport info returned for:', cleanCode)
      airportInfoError.value = 'Airport information not found.'
    }
  } catch (error) {
    console.error('Failed to lookup airport:', error)
    airportInfoError.value = `Failed to load airport information: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the browser console for details.`
  } finally {
    loadingAirportInfo.value = false
  }
}

function closeAirportModal(): void {
  showAirportModal.value = false
  currentAirportInfo.value = null
  airportInfoError.value = null
}

// Crew/Instructor profile functions
function showCrewProfile(name: string): void {
  if (isIos.value) {
    closeCatalogDrawer()
  }
  currentCrewName.value = name
  showCrewProfileModal.value = true
}

function closeCrewProfileModal(): void {
  showCrewProfileModal.value = false
  currentCrewName.value = ''
  isEditingCrewName.value = false
  editingCrewName.value = ''
  crewModalShowAddTag.value = false
  crewModalNewTagInput.value = ''
  crewModalLastTagEntryCount.value = null
}

// Start editing crew name
function startEditingCrewName(): void {
  isEditingCrewName.value = true
  editingCrewName.value = currentCrewName.value
}

// Save crew name changes
async function saveCrewNameEdit(): Promise<void> {
  if (!editingCrewName.value.trim()) {
    // Prevent empty names, cancel edit instead
    cancelCrewNameEdit()
    return
  }
  
  const trimmedNewName = editingCrewName.value.trim()
  if (trimmedNewName !== currentCrewName.value) {
    await renameCrewMember(currentCrewName.value, trimmedNewName)
  }
  
  isEditingCrewName.value = false
  editingCrewName.value = ''
}

// Cancel crew name editing
function cancelCrewNameEdit(): void {
  isEditingCrewName.value = false
  editingCrewName.value = ''
}

// Computed: Flights with the current crew member
const crewRecentFlights = computed(() => {
  if (!currentCrewName.value) return []
  const name = currentCrewName.value.toLowerCase()
  return sortEntriesByDateAndOOOI(
    logEntries.value.filter(entry => entry.trainingElements.toLowerCase() === name)
  )
})

// Computed: Statistics for the current crew member
const crewStats = computed(() => {
  if (!currentCrewName.value) return null
  
  const flights = crewRecentFlights.value
  if (flights.length === 0) return null
  
  const totalFlights = flights.length
  const totalHours = flights.reduce((sum, f) => sum + (f.flightTime.total ?? 0), 0)
  
  // Get first and last flight dates
  const sortedByDate = [...flights].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const firstFlight = sortedByDate[0]?.date || null
  const lastFlight = sortedByDate[sortedByDate.length - 1]?.date || null
  
  return {
    totalFlights,
    totalHours,
    firstFlight,
    lastFlight
  }
})

async function beginEditing(entry: LogEntry): Promise<void> {
  editingEntryId.value = entry.id
  newEntry.date = normalizeDateForInput(entry.date)
  newEntry.role = entry.role
  newEntry.aircraftCategoryClass = entry.aircraftCategoryClass ? normalizeCategoryClassLabel(entry.aircraftCategoryClass) : ''
  newEntry.categoryClassTime = entry.categoryClassTime
  newEntry.aircraftMakeModel = entry.aircraftMakeModel
  newEntry.registration = entry.registration
  newEntry.departure = entry.departure
  newEntry.destination = entry.destination
  newEntry.route = entry.route
  newEntry.trainingElements = entry.trainingElements
  newEntry.trainingInstructor = entry.trainingInstructor
  newEntry.instructorCertificate = entry.instructorCertificate
  newEntry.picName = entry.picName ?? null
  newEntry.sicName = entry.sicName ?? null
  newEntry.flightConditions = sanitizeFlightConditions(entry.flightConditions || [])
  newEntry.remarks = entry.remarks
  Object.assign(newEntry.flightTime, entry.flightTime)
  Object.assign(newEntry.performance, entry.performance)
  // Reset manual XC time tracking when editing (assume existing values are intentional)
  xcTimeManuallySet.value = entry.flightTime.crossCountry ? true : false
  lastKnownXcTime.value = entry.flightTime.crossCountry ?? null
  if (entry.oooi) {
    newEntry.oooi = { ...entry.oooi }
    const hasOOOITimes =
      !!(
        (entry.oooi.out && entry.oooi.out.trim()) ||
        (entry.oooi.off && entry.oooi.off.trim()) ||
        (entry.oooi.on && entry.oooi.on.trim()) ||
        (entry.oooi.in && entry.oooi.in.trim())
      )
    isCommercialMode.value = hasOOOITimes
  } else {
    newEntry.oooi = createEmptyOOOI()
    isCommercialMode.value = false
  }
  validationError.value = null
  successMessage.value = null
  isEntryFormOpen.value = false

  // If category/class is missing, try to populate from aircraft lookup
  if (!newEntry.aircraftCategoryClass && newEntry.registration) {
    tryPopulateAircraftCategory(newEntry.registration)
  }
}

function deriveCategoryFromText(text: string): string {
  const t = (text || '').toLowerCase()
  const multiHints = [
    'pa-44', 'pa44', 'seminole',
    'pa-34', 'pa34', 'seneca',
    'pa-23', 'pa23', 'apache', 'aztec',
    'pa-31', 'pa31', 'navajo', 'chieftain',
    'da42', 'da62', 'diamond 42', 'diamond 62',
    'be-58', 'be58', 'baron',
    'be-76', 'be76', 'duchess',
    'be-55', 'be55', 'be-95', 'be95', 'travel air',
    'be-200', 'be200', 'king air', 'beech 200', 'beech 300', 'beech 350',
    'c310', '310r', 'cessna 310',
    'c340', 'cessna 340',
    'c402', 'cessna 402',
    'c414', 'cessna 414',
    'c421', 'cessna 421',
    'twin', 'multi', 'multi-engine',
    'p-68', 'partenavia', 'islander',
    'tecnam p2006t',
    'piper apache', 'piper aztec', 'piper seneca', 'piper seminole', 'piper navajo',
    'beechcraft baron', 'beechcraft duchess', 'beechcraft king air',
    'cessna 310', 'cessna 340', 'cessna 402', 'cessna 414', 'cessna 421'
  ]
  const seaHints = ['seaplane', 'float', 'amphib', 'sea']
  const isMulti = multiHints.some(h => t.includes(h))
  const isSea = seaHints.some(h => t.includes(h))
  if (isMulti && isSea) return 'Airplane MES'
  if (isMulti) return 'Airplane MEL'
  if (isSea) return 'Airplane SES'
  return 'Airplane SEL'
}

function deriveCategoryFromInfo(info: any, fallbackMakeModel: string): string {
  const category = (info?.category || '').toLowerCase()

  if (category.includes('single') && (category.includes('land') || category.includes('fixed'))) return 'Airplane SEL'
  if (category.includes('single') && (category.includes('sea') || category.includes('amphib'))) return 'Airplane SES'
  if (category.includes('multi') && (category.includes('land') || category.includes('fixed'))) return 'Airplane MEL'
  if (category.includes('multi') && (category.includes('sea') || category.includes('amphib'))) return 'Airplane MES'

  return deriveCategoryFromText(`${info?.make || ''} ${info?.model || ''} ${fallbackMakeModel || ''}`)
}

async function tryPopulateAircraftCategory(registration: string): Promise<void> {
  try {
    const reg = (registration || '').toUpperCase().trim()
    if (!reg) return
    // 1) Try local aircraft cache created during exports
    let derived = ''
    if (isBrowser) {
      const cacheRaw = window.localStorage.getItem(DEVICE_GLOBAL_STORAGE_KEYS.AIRCRAFT_CACHE)
      if (cacheRaw) {
        try {
          const cache = JSON.parse(cacheRaw) as Record<string, any>
          const cachedInfo = cache[reg]
          if (cachedInfo) {
            derived = deriveCategoryFromInfoShort(cachedInfo, newEntry.aircraftMakeModel)
          }
        } catch {
          // ignore cache parse errors
        }
      }
    }
    // 2) If still empty, try live lookup
    if (!derived) {
      const info = await lookupAircraft(reg)
      if (info) {
        derived = deriveCategoryFromInfoShort(info, newEntry.aircraftMakeModel)
      }
    }
    // 3) If still empty but we have a make/model string, derive from it
    if (!derived && newEntry.aircraftMakeModel) {
      derived = deriveCategoryFromTextShort(newEntry.aircraftMakeModel)
    }
    if (derived) {
      newEntry.aircraftCategoryClass = normalizeCategoryClassLabel(derived)
    }
  } catch {
    // Silent fail; leave as-is if lookup fails
  }
}

async function tryPopulateAircraftCategoryForInline(registration: string): Promise<void> {
  if (!inlineEditEntry.value) return
  try {
    const reg = (registration || '').toUpperCase().trim()
    if (!reg) return
    let derived = ''
    if (isBrowser) {
      const cacheRaw = window.localStorage.getItem(DEVICE_GLOBAL_STORAGE_KEYS.AIRCRAFT_CACHE)
      if (cacheRaw) {
        try {
          const cache = JSON.parse(cacheRaw) as Record<string, any>
          const cachedInfo = cache[reg]
          if (cachedInfo) {
            derived = deriveCategoryFromInfoShort(cachedInfo, inlineEditEntry.value.aircraftMakeModel)
          }
        } catch {
          // ignore
        }
      }
    }
    if (!derived) {
      const info = await lookupAircraft(reg)
      if (info) {
        derived = deriveCategoryFromInfoShort(info, inlineEditEntry.value.aircraftMakeModel)
      }
    }
    if (!derived && inlineEditEntry.value.aircraftMakeModel) {
      derived = deriveCategoryFromTextShort(inlineEditEntry.value.aircraftMakeModel)
    }
    if (derived && inlineEditEntry.value) {
      inlineEditEntry.value.aircraftCategoryClass = normalizeCategoryClassLabel(derived)
    }
  } catch {
    // Silent fail
  }
}

function cancelEditing(): void {
  showDuplicateOverrideDialog.value = false
  resetForm()
  validationError.value = null
  successMessage.value = null
}

async function toggleEntryFlag(entry: LogEntry): Promise<void> {
  const newFlaggedValue = !entry.flagged
  entry.flagged = newFlaggedValue
  
  // Save to Supabase if authenticated
  if (isAuthenticated.value && user.value) {
    try {
      const { data, error } = await (supabase
        .from('log_entries') as any)
        .update({ flagged: newFlaggedValue })
        .eq('id', entry.id)
        .select()
      
      if (error) {
        console.error('Error updating flagged status:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        // Revert the change if save failed
        entry.flagged = !newFlaggedValue
        showToast(`Failed to save flagged status: ${error.message}\n\nCheck console for details.`, { type: 'error' })
        return
      }
      
      // Success - the update worked
      console.log('Flagged status updated successfully:', newFlaggedValue)
    } catch (error) {
      console.error('Error updating flagged status:', error)
      // Revert the change if save failed
      entry.flagged = !newFlaggedValue
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      showToast(`Failed to save flagged status: ${errorMessage}\n\nCheck console for details.`, { type: 'error' })
      return
    }
  }
  
  // If not authenticated, the watch on logEntries will save to localStorage
}

// Helper function for import validation - returns first error message if any
// Uses the composable validation but returns a simple string for import compatibility
async function validateEntryForImport(entry: LogEntry): Promise<string | null> {
  const results = await validateFlightTimeEntry(entry, undefined, { localAirportsOnly: true })
  const firstError = results.find(r => r.type === 'error')
  return firstError ? firstError.message : null
}

function normalizeNumber(value: number | null | string | undefined): number | null {
  // Handle string values (convert to number)
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (isNaN(parsed) || !isFinite(parsed)) {
      return null
    }
    value = parsed
  }
  
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null
  }
  
  // Ensure it's a number
  const num = typeof value === 'number' ? value : Number(value)
  if (isNaN(num) || !isFinite(num)) {
    return null
  }
  
  const rounded = Math.round(num * 10) / 10
  return rounded >= 0 ? rounded : null
}

/**
 * Helper to parse time string (HH:mm or HHmm) to minutes since midnight
 */
function parseTimeToMinutes(time: string | null): number | null {
  if (!time) return null
  
  const t = time.replace(':', '').trim()
  if (t.length < 3) return null
  const normalized = t.length === 3 ? '0' + t : t
  if (normalized.length !== 4) return null
  
  const h = parseInt(normalized.substring(0, 2))
  const m = parseInt(normalized.substring(2, 4))
  if (isNaN(h) || isNaN(m)) return null
  
  return h * 60 + m
}

// Cache for airport timezone lookups
const airportTimezoneCache = new Map<string, string | null>()

/**
 * Get IANA timezone for an airport code
 * Uses cached airport lookup data and converts to IANA format
 */
async function getAirportTimezone(airportCode: string | null | undefined): Promise<string | null> {
  if (!airportCode) return null
  
  const normalizedCode = airportCode.trim().toUpperCase()
  
  // Check cache first
  if (airportTimezoneCache.has(normalizedCode)) {
    const cached = airportTimezoneCache.get(normalizedCode)
    console.log(`[Timezone] Cache hit for ${normalizedCode}:`, cached)
    return cached || null
  }

  const staticTz = getAirportIanaTimezone(normalizedCode)
  if (staticTz) {
    airportTimezoneCache.set(normalizedCode, staticTz)
    return staticTz
  }
  
  try {
    console.log(`[Timezone] Looking up timezone for ${normalizedCode}...`)
    const airportInfo = await lookupAirport(normalizedCode)
    console.log(`[Timezone] Airport info for ${normalizedCode}:`, airportInfo)
    if (airportInfo?.timezone) {
      const ianaTimezone = normalizeTimezoneToIANA(airportInfo.timezone)
      console.log(`[Timezone] Normalized timezone for ${normalizedCode}: ${airportInfo.timezone} -> ${ianaTimezone}`)
      airportTimezoneCache.set(normalizedCode, ianaTimezone)
      return ianaTimezone
    } else {
      console.warn(`[Timezone] No timezone found for airport ${normalizedCode}`)
    }
  } catch (error) {
    console.warn(`[Timezone] Failed to lookup timezone for airport ${normalizedCode}:`, error)
  }
  
  airportTimezoneCache.set(normalizedCode, null)
  return null
}

/**
 * Calculate duration between two times, accounting for timezone differences
 * @param start - Start time string (HH:mm or HHmm format)
 * @param end - End time string (HH:mm or HHmm format)
 * @param date - Date string (YYYY-MM-DD format) for DST calculations
 * @param startTimezone - IANA timezone for start time (e.g., "America/Chicago")
 * @param endTimezone - IANA timezone for end time (e.g., "America/New_York")
 * @param isZulu - Whether times are already in UTC
 */
async function calculateDuration(
  start: string | null,
  end: string | null,
  date?: string | null,
  startTimezone?: string | null,
  endTimezone?: string | null,
  isZulu?: boolean
): Promise<number | null> {
  if (!start || !end) return null
  
  // If times are in UTC or no timezone info, use simple calculation
  if (isZulu || (!startTimezone && !endTimezone)) {
    console.log('[CalculateDuration] Using simple calculation:', { isZulu, startTimezone, endTimezone })
    const s = parseTimeToMinutes(start)
    const e = parseTimeToMinutes(end)
    
    if (s === null || e === null) return null
    
    let diff = e - s
    if (diff < 0) diff += 24 * 60 // wrap around midnight
    
    const result = Math.round((diff / 60) * 10) / 10
    console.log('[CalculateDuration] Simple calculation result:', result)
    return result
  }
  
  // If both timezones are the same, use simple calculation
  if (startTimezone && endTimezone && startTimezone === endTimezone) {
    console.log('[CalculateDuration] Same timezone, using simple calculation:', startTimezone)
    const s = parseTimeToMinutes(start)
    const e = parseTimeToMinutes(end)
    
    if (s === null || e === null) return null
    
    let diff = e - s
    if (diff < 0) diff += 24 * 60 // wrap around midnight
    
    const result = Math.round((diff / 60) * 10) / 10
    console.log('[CalculateDuration] Same timezone calculation result:', result)
    return result
  }
  
  // Need date for timezone conversion (for DST handling)
  const flightDate = date || new Date().toISOString().split('T')[0]
  
  console.log('[CalculateDuration] Using timezone-aware calculation:', {
    start,
    end,
    date: flightDate,
    startTimezone,
    endTimezone
  })
  
  // Validate flightDate format
  if (!flightDate || !/^\d{4}-\d{2}-\d{2}$/.test(flightDate)) {
    // Fallback to simple calculation if date is invalid
    const s = parseTimeToMinutes(start)
    const e = parseTimeToMinutes(end)
    if (s === null || e === null) return null
    let diff = e - s
    if (diff < 0) diff += 24 * 60
    return Math.round((diff / 60) * 10) / 10
  }
  
  try {
    // Parse time strings
    const startTimeStr = start.replace(':', '').trim()
    const endTimeStr = end.replace(':', '').trim()
    
    const startNormalized = startTimeStr.length === 3 ? '0' + startTimeStr : startTimeStr
    const endNormalized = endTimeStr.length === 3 ? '0' + endTimeStr : endTimeStr
    
    if (startNormalized.length !== 4 || endNormalized.length !== 4) {
      // Fallback to simple calculation
      const s = parseTimeToMinutes(start)
      const e = parseTimeToMinutes(end)
      if (s === null || e === null) return null
      let diff = e - s
      if (diff < 0) diff += 24 * 60
      return Math.round((diff / 60) * 10) / 10
    }
    
    // Parse date components
    const dateParts = flightDate.split('-')
    if (dateParts.length !== 3) {
      // Fallback to simple calculation
      const s = parseTimeToMinutes(start)
      const e = parseTimeToMinutes(end)
      if (s === null || e === null) return null
      let diff = e - s
      if (diff < 0) diff += 24 * 60
      return Math.round((diff / 60) * 10) / 10
    }
    
    const yearStr = dateParts[0]
    const monthStr = dateParts[1]
    const dayStr = dateParts[2]
    
    if (!yearStr || !monthStr || !dayStr) {
      // Fallback to simple calculation
      const s = parseTimeToMinutes(start)
      const e = parseTimeToMinutes(end)
      if (s === null || e === null) return null
      let diff = e - s
      if (diff < 0) diff += 24 * 60
      return Math.round((diff / 60) * 10) / 10
    }
    
    const year = parseInt(yearStr)
    const month = parseInt(monthStr)
    const day = parseInt(dayStr)
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      // Fallback to simple calculation
      const s = parseTimeToMinutes(start)
      const e = parseTimeToMinutes(end)
      if (s === null || e === null) return null
      let diff = e - s
      if (diff < 0) diff += 24 * 60
      return Math.round((diff / 60) * 10) / 10
    }
    
    // Create DateTime objects with timezone context
    const startHour = parseInt(startNormalized.substring(0, 2))
    const startMin = parseInt(startNormalized.substring(2, 4))
    const endHour = parseInt(endNormalized.substring(0, 2))
    const endMin = parseInt(endNormalized.substring(2, 4))
    
    // Create DateTime in respective timezones
    const startDT = startTimezone
      ? DateTime.fromObject(
          {
            year,
            month,
            day,
            hour: startHour,
            minute: startMin
          },
          { zone: startTimezone }
        )
      : DateTime.fromObject(
          {
            year,
            month,
            day,
            hour: startHour,
            minute: startMin
          }
        )
    
    const endDT = endTimezone
      ? DateTime.fromObject(
          {
            year,
            month,
            day,
            hour: endHour,
            minute: endMin
          },
          { zone: endTimezone }
        )
      : DateTime.fromObject(
          {
            year,
            month,
            day,
            hour: endHour,
            minute: endMin
          }
        )
    
    if (!startDT.isValid || !endDT.isValid) {
      // Fallback to simple calculation
      const s = parseTimeToMinutes(start)
      const e = parseTimeToMinutes(end)
      if (s === null || e === null) return null
      let diff = e - s
      if (diff < 0) diff += 24 * 60
      return Math.round((diff / 60) * 10) / 10
    }
    
    // Convert both to UTC for accurate comparison
    const startUTC = startDT.toUTC()
    const endUTC = endDT.toUTC()
    
    // Calculate difference in minutes
    const diffMs = endUTC.toMillis() - startUTC.toMillis()
    const diffMinutes = diffMs / (1000 * 60)
    
    // Handle negative differences (crossing midnight)
    let finalDiff = diffMinutes
    if (finalDiff < 0) {
      // If negative and less than -12 hours, assume next day
      if (finalDiff < -12 * 60) {
        finalDiff += 24 * 60
      } else {
        // Otherwise, might be same day but timezone difference makes it appear negative
        // Try adding 24 hours
        finalDiff += 24 * 60
      }
    }
    
    // Convert to hours and round to 1 decimal
    const result = Math.round((finalDiff / 60) * 10) / 10
    console.log('[CalculateDuration] Timezone-aware calculation result:', result, {
      startUTC: startUTC.toISO(),
      endUTC: endUTC.toISO(),
      diffMinutes: finalDiff
    })
    return result
  } catch (error) {
    console.warn('[CalculateDuration] Error calculating timezone-aware duration, falling back to simple calculation:', error)
    // Fallback to simple calculation
    const s = parseTimeToMinutes(start)
    const e = parseTimeToMinutes(end)
    if (s === null || e === null) return null
    let diff = e - s
    if (diff < 0) diff += 24 * 60
    return Math.round((diff / 60) * 10) / 10
  }
}

// Watcher to auto-calculate total time and flight time
watch(() => [newEntry.oooi?.out, newEntry.oooi?.off, newEntry.oooi?.on, newEntry.oooi?.in, newEntry.role, newEntry.departure, newEntry.destination, newEntry.date], async () => {
  if (!isCommercialMode.value || !newEntry.oooi) return
  
  if (newEntry.oooi.out && newEntry.oooi.in) {
     // Get timezones for departure and destination airports
     const startTimezone = newEntry.oooi.off && newEntry.departure
       ? await getAirportTimezone(newEntry.departure)
       : newEntry.departure
         ? await getAirportTimezone(newEntry.departure)
         : null
     const endTimezone = newEntry.destination
       ? await getAirportTimezone(newEntry.destination)
       : null
     
     // Debug logging
     console.log('[FlightTime] Calculating duration:', {
       out: newEntry.oooi.out,
       in: newEntry.oooi.in,
       date: newEntry.date,
       departure: newEntry.departure,
       destination: newEntry.destination,
       startTimezone,
       endTimezone,
       isZulu: newEntry.oooi.isZulu
     })
     
     const block = await calculateDuration(
       newEntry.oooi.out,
       newEntry.oooi.in,
       newEntry.date,
       startTimezone,
       endTimezone,
       newEntry.oooi.isZulu
     )
     
     console.log('[FlightTime] Calculated block time:', block)
     if (block !== null) {
       newEntry.flightTime.total = block
       
       // Auto-distribute based on Role
       if (newEntry.role === 'PIC') {
         newEntry.flightTime.pic = block
         newEntry.flightTime.sic = null
       } else if (newEntry.role === 'SIC') {
         newEntry.flightTime.sic = block
         newEntry.flightTime.pic = null
       } else if (newEntry.role === 'Dual Received') {
          newEntry.flightTime.dual = block
       } else if (newEntry.role === 'Solo') {
          newEntry.flightTime.solo = block
          newEntry.flightTime.pic = block // Solo is also PIC usually
       }
     }
  } else if (newEntry.oooi.off && newEntry.oooi.on) {
     // Calculate from OFF to ON (air time)
     const startTimezone = newEntry.departure
       ? await getAirportTimezone(newEntry.departure)
       : null
     const endTimezone = newEntry.destination
       ? await getAirportTimezone(newEntry.destination)
       : null
     
     const block = await calculateDuration(
       newEntry.oooi.off,
       newEntry.oooi.on,
       newEntry.date,
       startTimezone,
       endTimezone,
       newEntry.oooi.isZulu
     )
     if (block !== null) {
       newEntry.flightTime.total = block
       
       // Auto-distribute based on Role
       if (newEntry.role === 'PIC') {
         newEntry.flightTime.pic = block
         newEntry.flightTime.sic = null
       } else if (newEntry.role === 'SIC') {
         newEntry.flightTime.sic = block
         newEntry.flightTime.pic = null
       } else if (newEntry.role === 'Dual Received') {
          newEntry.flightTime.dual = block
       } else if (newEntry.role === 'Solo') {
          newEntry.flightTime.solo = block
          newEntry.flightTime.pic = block // Solo is also PIC usually
       }
     }
  }
  
  // Sometimes 'Air Time' (Off to On) is tracked separately.
  // For now, let's just map Out-In to Total Time.
}, { deep: true })

// Watch for airport changes to trigger cross-country auto-logging (without validation)
// Validation will only run when Save Entry button is pressed
const validationTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
// Track last known XC time to detect manual changes
const lastKnownXcTime = ref<number | null>(null)

/** Clear cross-country time and remove cross-country condition from an entry (strict rule: else XC = null). */
function clearCrossCountryFromEntry(entry: { flightTime?: { crossCountry?: number | null }; flightConditions?: string[] }): void {
  if (!entry?.flightTime) return
  entry.flightTime.crossCountry = null
  const conditions = entry.flightConditions || []
  const idxCc = conditions.indexOf('crossCountry')
  const idxLabel = conditions.indexOf('Cross-Country')
  if (idxLabel > idxCc) {
    if (idxLabel > -1) conditions.splice(idxLabel, 1)
    if (idxCc > -1) conditions.splice(idxCc, 1)
  } else {
    if (idxCc > -1) conditions.splice(idxCc, 1)
    if (idxLabel > -1) conditions.splice(idxLabel, 1)
  }
}

watch(() => [newEntry.departure, newEntry.destination, newEntry.route, newEntry.flightTime.crossCountry, newEntry.date, newEntry.flightTime.total, newEntry.oooi?.out, newEntry.oooi?.in], async () => {
  if (!newEntry.departure || !newEntry.destination || newEntry.departure === 'UNKNOWN' || newEntry.destination === 'UNKNOWN') {
    clearCrossCountryFromEntry(newEntry)
    return
  }
  
  // All time calculations use OUT and IN (block time) if available, as that's the most accurate
  // For cross-country calculation, wait for IN time when OUT is present
  // This ensures we use block time (OUT→IN) rather than air time (OFF→ON)
  if (newEntry.oooi && newEntry.oooi.out && !newEntry.oooi.in) {
    // If OUT is present, wait for IN to get accurate block time
    // This prevents calculating XC from air time (OFF→ON) when block time (OUT→IN) will be available
    return
  }
  
  // Only run XC check when we have a valid total time (avoids running before total is in)
  const totalTimeForWatch = newEntry.flightTime.total ?? 0
  if (totalTimeForWatch <= 0 || totalTimeForWatch > 24) {
    clearCrossCountryFromEntry(newEntry)
    return
  }
  
  const currentXcTime = newEntry.flightTime.crossCountry ?? 0
  lastKnownXcTime.value = currentXcTime

  const distanceNm = getCrossCountryDistanceFromCache(newEntry)
  if (distanceNm !== null) {
    if (qualifiesForCrossCountryDistance(distanceNm) && !xcTimeManuallySet.value) {
      const xcValue = Math.round(totalTimeForWatch * 10) / 10
      setCrossCountryOnEntry(newEntry, xcValue)
    } else if (!qualifiesForCrossCountryDistance(distanceNm)) {
      clearCrossCountryFromEntry(newEntry)
    }
  } else {
    // Departure present but not enough cached coords: clear stale XC; async lookup will set if qualified
    clearCrossCountryFromEntry(newEntry)
  }
  
  // Clear existing timeout
  if (validationTimeout.value) {
    clearTimeout(validationTimeout.value)
  }
  
  // Debounce cross-country check to avoid too many API calls (increased to 500ms for better stability)
  // Note: This only checks cross-country distance, not full validation
  validationTimeout.value = setTimeout(async () => {
    await checkAndAutoLogCrossCountry()
  }, 500)
})

watch(() => [inlineEditEntry.value?.oooi?.out, inlineEditEntry.value?.oooi?.off, inlineEditEntry.value?.oooi?.on, inlineEditEntry.value?.oooi?.in, inlineEditEntry.value?.role, inlineEditEntry.value?.departure, inlineEditEntry.value?.destination, inlineEditEntry.value?.date], async () => {
  if (!isInlineCommercialMode.value || !inlineEditEntry.value?.oooi) return
  
  if (inlineEditEntry.value.oooi.out && inlineEditEntry.value.oooi.in) {
     // Get timezones for departure and destination airports
     const startTimezone = inlineEditEntry.value.oooi.off && inlineEditEntry.value.departure
       ? await getAirportTimezone(inlineEditEntry.value.departure)
       : inlineEditEntry.value.departure
         ? await getAirportTimezone(inlineEditEntry.value.departure)
         : null
     const endTimezone = inlineEditEntry.value.destination
       ? await getAirportTimezone(inlineEditEntry.value.destination)
       : null
     
     // Debug logging
     console.log('[FlightTime Inline] Calculating duration:', {
       out: inlineEditEntry.value.oooi.out,
       in: inlineEditEntry.value.oooi.in,
       date: inlineEditEntry.value.date,
       departure: inlineEditEntry.value.departure,
       destination: inlineEditEntry.value.destination,
       startTimezone,
       endTimezone,
       isZulu: inlineEditEntry.value.oooi.isZulu
     })
     
     const block = await calculateDuration(
       inlineEditEntry.value.oooi.out,
       inlineEditEntry.value.oooi.in,
       inlineEditEntry.value.date,
       startTimezone,
       endTimezone,
       inlineEditEntry.value.oooi.isZulu
     )
     
     console.log('[FlightTime Inline] Calculated block time:', block)
     if (block !== null) {
       inlineEditEntry.value.flightTime.total = block
       
       // Auto-distribute based on Role
       const role = inlineEditEntry.value.role
       if (role === 'PIC') {
         inlineEditEntry.value.flightTime.pic = block
         inlineEditEntry.value.flightTime.sic = null
       } else if (role === 'SIC') {
         inlineEditEntry.value.flightTime.sic = block
         inlineEditEntry.value.flightTime.pic = null
       } else if (role === 'Dual Received') {
          inlineEditEntry.value.flightTime.dual = block
       } else if (role === 'Solo') {
          inlineEditEntry.value.flightTime.solo = block
          inlineEditEntry.value.flightTime.pic = block
       }
       syncCrossCountryWithCommercialOooiTotal(inlineEditEntry.value, block)
     }
  } else if (inlineEditEntry.value.oooi.off && inlineEditEntry.value.oooi.on) {
     // Calculate from OFF to ON (air time)
     const startTimezone = inlineEditEntry.value.departure
       ? await getAirportTimezone(inlineEditEntry.value.departure)
       : null
     const endTimezone = inlineEditEntry.value.destination
       ? await getAirportTimezone(inlineEditEntry.value.destination)
       : null
     
     const block = await calculateDuration(
       inlineEditEntry.value.oooi.off,
       inlineEditEntry.value.oooi.on,
       inlineEditEntry.value.date,
       startTimezone,
       endTimezone,
       inlineEditEntry.value.oooi.isZulu
     )
     if (block !== null) {
       inlineEditEntry.value.flightTime.total = block
       
       // Auto-distribute based on Role
       const role = inlineEditEntry.value.role
       if (role === 'PIC') {
         inlineEditEntry.value.flightTime.pic = block
         inlineEditEntry.value.flightTime.sic = null
       } else if (role === 'SIC') {
         inlineEditEntry.value.flightTime.sic = block
         inlineEditEntry.value.flightTime.pic = null
       } else if (role === 'Dual Received') {
          inlineEditEntry.value.flightTime.dual = block
       } else if (role === 'Solo') {
          inlineEditEntry.value.flightTime.solo = block
          inlineEditEntry.value.flightTime.pic = block
       }
       syncCrossCountryWithCommercialOooiTotal(inlineEditEntry.value, block)
     }
  }
}, { deep: true })

// Helper to get airport coordinates from cache
const AIRPORT_CACHE_KEY = 'logifi://airport-cache'

function getAirportCoordsFromCache(code: string): { lat: number; lon: number } | null {
  if (!isBrowser || !code) return null
  
  try {
    const cache = JSON.parse(window.localStorage.getItem(AIRPORT_CACHE_KEY) || '{}')
    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '')
    const cached = cache[normalizedCode]
    
    if (cached && typeof cached.latitude === 'number' && typeof cached.longitude === 'number') {
      return { lat: cached.latitude, lon: cached.longitude }
    }
  } catch {
    // Ignore cache errors
  }
  
  return null
}

function buildCrossCountryCoordsFromCache(entry: {
  departure?: string
  destination?: string
  route?: string
}): CrossCountryAirportCoords | null {
  const depCoords = getAirportCoordsFromCache(entry.departure || '')
  if (!depCoords) return null

  const airportCoords: CrossCountryAirportCoords = {
    departure: { latitude: depCoords.lat, longitude: depCoords.lon }
  }

  const destCoords = getAirportCoordsFromCache(entry.destination || '')
  if (destCoords) {
    airportCoords.destination = { latitude: destCoords.lat, longitude: destCoords.lon }
  }

  const routeCoords: AirportCoordinates[] = []
  for (const code of parseRouteAirportCodes(entry.route || '')) {
    const cached = getLocationCoordsFromCache(code) ?? getAirportCoordsFromCache(code)
    if (cached) {
      routeCoords.push({ latitude: cached.lat, longitude: cached.lon })
    }
  }
  if (routeCoords.length > 0) {
    airportCoords.route = routeCoords
  }

  if (!airportCoords.destination && (!airportCoords.route || airportCoords.route.length === 0)) {
    return null
  }

  return airportCoords
}

function getCrossCountryDistanceFromCache(entry: {
  departure?: string
  destination?: string
  route?: string
}): number | null {
  const coords = buildCrossCountryCoordsFromCache(entry)
  if (!coords?.departure) return null
  return computeCrossCountryDistanceNm(coords.departure, coords.destination, coords.route)
}

async function buildCrossCountryCoordsWithLookup(entry: {
  departure?: string
  destination?: string
  route?: string
}): Promise<CrossCountryAirportCoords | null> {
  const departure = (entry.departure || '').trim()
  const destination = (entry.destination || '').trim()
  if (!departure || !destination || departure === 'UNKNOWN' || destination === 'UNKNOWN') {
    return null
  }

  const routeCodes = [...new Set(parseRouteAirportCodes(entry.route || ''))]
  const [depInfo, destInfo, ...routeInfos] = await Promise.all([
    lookupAirport(departure),
    lookupAirport(destination),
    ...routeCodes.map((code) => lookupLocationCoords(code))
  ])

  const airportCoords: CrossCountryAirportCoords = {}

  if (depInfo?.latitude !== undefined && depInfo?.longitude !== undefined) {
    airportCoords.departure = {
      latitude: depInfo.latitude,
      longitude: depInfo.longitude
    }
  }

  if (destInfo?.latitude !== undefined && destInfo?.longitude !== undefined) {
    airportCoords.destination = {
      latitude: destInfo.latitude,
      longitude: destInfo.longitude
    }
  }

  const routeCoords: AirportCoordinates[] = []
  routeInfos.forEach((info) => {
    if (info?.latitude != null && info?.longitude != null) {
      routeCoords.push({
        latitude: info.latitude,
        longitude: info.longitude
      })
    }
  })
  if (routeCoords.length > 0) {
    airportCoords.route = routeCoords
  }

  if (
    !airportCoords.departure ||
    (!airportCoords.destination && (!airportCoords.route || airportCoords.route.length === 0))
  ) {
    return null
  }

  return airportCoords
}

function setCrossCountryOnEntry(
  entry: { flightTime?: { crossCountry?: number | null }; flightConditions?: string[] },
  xcValue: number
): void {
  if (!entry?.flightTime) return
  entry.flightTime.crossCountry = xcValue
  lastKnownXcTime.value = xcValue
  const indexCrossCountryLabel = (entry.flightConditions || []).indexOf('Cross-Country')
  if (indexCrossCountryLabel > -1) {
    entry.flightConditions!.splice(indexCrossCountryLabel, 1)
  }
  if (!(entry.flightConditions || []).includes('crossCountry')) {
    entry.flightConditions = entry.flightConditions || []
    entry.flightConditions.push('crossCountry')
  }
}

/** Align XC with OOOI-derived block when inline commercial edit recalculates total (parity with add-entry flow). */
function syncCrossCountryWithCommercialOooiTotal(entry: LogEntry, blockHours: number): void {
  if (!entry.departure?.trim() || !entry.destination?.trim()) return
  if (entry.departure === 'UNKNOWN' || entry.destination === 'UNKNOWN') return

  const xcValue = Math.round(blockHours * 10) / 10
  const hasCcCondition = (entry.flightConditions || []).includes('crossCountry')
  const distanceNm = getCrossCountryDistanceFromCache(entry)

  if (distanceNm !== null) {
    if (qualifiesForCrossCountryDistance(distanceNm)) {
      setCrossCountryOnEntry(entry, xcValue)
    } else {
      clearCrossCountryFromEntry(entry)
    }
    return
  }

  if (hasCcCondition) {
    entry.flightTime.crossCountry = xcValue
  }
}

// Auto-calculate night time based on OOOI and airport location
async function autoCalculateNightTime(
  date: string,
  departure: string,
  destination: string,
  outTime: string | null,
  inTime: string | null,
  isZulu: boolean = true
): Promise<number | null> {
  console.log('[NightTime] Starting calculation:', { date, departure, destination, outTime, inTime, isZulu })
  
  if (!date || !departure || !outTime || !inTime) {
    console.warn('[NightTime] Missing required parameters:', { date, departure, outTime, inTime })
    return null
  }
  
  // Get departure airport coordinates from cache, or try to look them up
  let depCoords = getAirportCoordsFromCache(departure)
  console.log('[NightTime] Departure coords from cache:', depCoords)
  
  if (!depCoords) {
    console.log('[NightTime] Looking up departure airport:', departure)
    // Try to look up the airport
    const depInfo = await lookupAirport(departure)
    console.log('[NightTime] Departure airport lookup result:', depInfo)
    if (depInfo?.latitude && depInfo?.longitude) {
      depCoords = { lat: depInfo.latitude, lon: depInfo.longitude }
      console.log('[NightTime] Using departure coords from lookup:', depCoords)
    }
  }
  
  if (!depCoords) {
    console.error('[NightTime] Failed to get departure airport coordinates for:', departure)
    return null
  }

  // Night time uses departure only (single location) to match common logbook behavior
  // Normalize date to YYYY-MM-DD format
  // Date inputs use YYYY-MM-DD, but we might also receive MM/DD/YYYY
  let normalizedDate = date
  if (date.includes('/')) {
    // Handle MM/DD/YYYY format
    const parts = date.split('/')
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const mm = parts[0]
      const dd = parts[1]
      const yyyy = parts[2]
      normalizedDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
      console.log('[NightTime] Converted date from MM/DD/YYYY:', date, 'to:', normalizedDate)
    }
  } else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Already in YYYY-MM-DD format (from date input)
    normalizedDate = date
    console.log('[NightTime] Date already in YYYY-MM-DD format:', normalizedDate)
  } else {
    console.warn('[NightTime] Unexpected date format:', date)
  }
  
  // Convert OOOI times from "HHMM" to "HH:MM" format
  const outTimeFormatted = convertOOOITimeToHHMM(outTime)
  const inTimeFormatted = convertOOOITimeToHHMM(inTime)
  console.log('[NightTime] Time conversion:', { 
    outTime, 
    outTimeFormatted, 
    inTime, 
    inTimeFormatted 
  })
  
  if (!outTimeFormatted || !inTimeFormatted) {
    console.error('[NightTime] Failed to convert time formats:', { outTime, inTime })
    return null
  }
  
  const depLat = typeof depCoords.lat === 'number' ? depCoords.lat : parseFloat(String(depCoords.lat))
  const depLon = typeof depCoords.lon === 'number' ? depCoords.lon : parseFloat(String(depCoords.lon))

  // Use departure-only (single location) for night time so results align with common logbooks
  console.log('[NightTime] Calling calculateNightTime (departure only):', {
    date: normalizedDate,
    depLatitude: depLat,
    depLongitude: depLon,
    outTime: outTimeFormatted,
    inTime: inTimeFormatted,
    isZulu
  })

  const result = calculateNightTime({
    date: normalizedDate,
    depLatitude: depLat,
    depLongitude: depLon,
    outTime: outTimeFormatted,
    inTime: inTimeFormatted,
    isZulu
  })
  
  console.log('[NightTime] Calculation result:', result)
  
  // Return night time if calculation succeeded (including 0 to clear incorrect values)
  if (result.success) {
    console.log('[NightTime] Success! Night time:', result.nightHours, 'hours')
    return result.nightHours
  }
  
  console.error('[NightTime] Calculation failed:', result.error)
  return null
}

// Watcher to auto-calculate night time for New Entry form
watch(
  () => [
    newEntry.date,
    newEntry.departure,
    newEntry.destination,
    newEntry.oooi?.out,
    newEntry.oooi?.in,
    newEntry.oooi?.isZulu
  ],
  async () => {
    console.log('[NightTime Watcher] Triggered with:', {
      isCommercialMode: isCommercialMode.value,
      hasOOOI: !!newEntry.oooi,
      date: newEntry.date,
      departure: newEntry.departure,
      destination: newEntry.destination,
      out: newEntry.oooi?.out,
      in: newEntry.oooi?.in,
      isZulu: newEntry.oooi?.isZulu
    })
    
    if (!isCommercialMode.value || !newEntry.oooi) {
      console.log('[NightTime Watcher] Skipping - OOOI mode not active or no OOOI data')
      return
    }
    
    if (!newEntry.date || !newEntry.departure || !newEntry.oooi.out || !newEntry.oooi.in) {
      console.log('[NightTime Watcher] Skipping - missing required fields')
      return
    }
    
    console.log('[NightTime Watcher] Calling autoCalculateNightTime...')
    const nightTime = await autoCalculateNightTime(
      newEntry.date,
      newEntry.departure,
      newEntry.destination,
      newEntry.oooi.out,
      newEntry.oooi.in,
      newEntry.oooi.isZulu
    )
    
    if (nightTime !== null) {
      // Always update night time, even if 0 (to clear incorrect values)
      newEntry.flightTime.night = nightTime
      console.log(`[NightTime Watcher] Updated night time to: ${nightTime} hours`)
    } else {
      console.warn('[NightTime Watcher] Calculation returned null - night time not updated')
    }
  },
  { deep: true }
)

// Watcher to auto-calculate night time for Inline Edit form
watch(
  () => [
    inlineEditEntry.value?.date,
    inlineEditEntry.value?.departure,
    inlineEditEntry.value?.destination,
    inlineEditEntry.value?.oooi?.out,
    inlineEditEntry.value?.oooi?.in,
    inlineEditEntry.value?.oooi?.isZulu
  ],
  async () => {
    console.log('[NightTime Inline Watcher] Triggered with:', {
      isInlineCommercialMode: isInlineCommercialMode.value,
      hasOOOI: !!inlineEditEntry.value?.oooi,
      date: inlineEditEntry.value?.date,
      departure: inlineEditEntry.value?.departure,
      destination: inlineEditEntry.value?.destination,
      out: inlineEditEntry.value?.oooi?.out,
      in: inlineEditEntry.value?.oooi?.in,
      isZulu: inlineEditEntry.value?.oooi?.isZulu
    })
    
    if (!isInlineCommercialMode.value || !inlineEditEntry.value?.oooi) {
      console.log('[NightTime Inline Watcher] Skipping - OOOI mode not active or no OOOI data')
      return
    }
    
    if (!inlineEditEntry.value.date || !inlineEditEntry.value.departure || 
        !inlineEditEntry.value.oooi.out || !inlineEditEntry.value.oooi.in) {
      console.log('[NightTime Inline Watcher] Skipping - missing required fields')
      return
    }
    
    console.log('[NightTime Inline Watcher] Calling autoCalculateNightTime...')
    const nightTime = await autoCalculateNightTime(
      inlineEditEntry.value.date,
      inlineEditEntry.value.departure,
      inlineEditEntry.value.destination,
      inlineEditEntry.value.oooi.out,
      inlineEditEntry.value.oooi.in,
      inlineEditEntry.value.oooi.isZulu
    )
    
    if (nightTime !== null && inlineEditEntry.value) {
      // Ensure it's a number, not a string
      inlineEditEntry.value.flightTime.night = typeof nightTime === 'number' ? nightTime : parseFloat(String(nightTime))
      console.log(`[NightTime Inline Watcher] Updated night time to: ${inlineEditEntry.value.flightTime.night} hours (type: ${typeof inlineEditEntry.value.flightTime.night})`)
    } else {
      console.warn('[NightTime Inline Watcher] Calculation returned null - night time not updated')
    }
  },
  { deep: true }
)

// Watcher to auto-check flight conditions based on time entries (Add Entry form)
watch(
  () => [
    newEntry.flightTime.night,
    newEntry.flightTime.nvg,
    newEntry.flightTime.actualInstrument,
    newEntry.flightTime.simulatedInstrument,
    newEntry.flightTime.crossCountry
  ],
  () => {
    newEntry.flightConditions = autoCheckFlightConditions(
      newEntry.flightConditions,
      newEntry.flightTime.night,
      newEntry.flightTime.actualInstrument,
      newEntry.flightTime.simulatedInstrument,
      newEntry.flightTime.crossCountry,
      newEntry.flightTime.nvg ?? null
    )
  },
  { deep: true }
)

// Watcher to auto-check flight conditions based on time entries (Edit Entry form)
watch(
  () => [
    inlineEditEntry.value?.flightTime.night,
    inlineEditEntry.value?.flightTime.nvg,
    inlineEditEntry.value?.flightTime.actualInstrument,
    inlineEditEntry.value?.flightTime.simulatedInstrument,
    inlineEditEntry.value?.flightTime.crossCountry
  ],
  () => {
    if (!inlineEditEntry.value) return
    inlineEditEntry.value.flightConditions = autoCheckFlightConditions(
      inlineEditEntry.value.flightConditions,
      inlineEditEntry.value.flightTime.night,
      inlineEditEntry.value.flightTime.actualInstrument,
      inlineEditEntry.value.flightTime.simulatedInstrument,
      inlineEditEntry.value.flightTime.crossCountry,
      inlineEditEntry.value.flightTime.nvg ?? null
    )
  },
  { deep: true }
)

// Watcher to sync Category/Class Time with Total Time (Add Entry form) — only when NOT logging simulator time (sim is a separate logbook)
watch(
  () => newEntry.categoryClassTime,
  (newVal) => {
    if (isLoggingSimTime(newEntry)) return
    if (newVal !== null && newVal !== undefined && newVal !== newEntry.flightTime.total) {
      newEntry.flightTime.total = newVal
    }
  }
)

watch(
  () => newEntry.flightTime.total,
  (newVal) => {
    if (isLoggingSimTime(newEntry)) return
    if (newVal !== null && newVal !== undefined && newVal !== newEntry.categoryClassTime) {
      newEntry.categoryClassTime = newVal
    }
  }
)

// Watcher to sync Category/Class Time with Total Time (Inline Edit form) — only when NOT logging simulator time
watch(
  () => inlineEditEntry.value?.categoryClassTime,
  (newVal) => {
    if (!inlineEditEntry.value || isLoggingSimTime(inlineEditEntry.value)) return
    if (newVal !== null && newVal !== undefined && newVal !== inlineEditEntry.value.flightTime.total) {
      inlineEditEntry.value.flightTime.total = newVal
    }
  }
)

watch(
  () => inlineEditEntry.value?.flightTime.total,
  (newVal) => {
    if (!inlineEditEntry.value || isLoggingSimTime(inlineEditEntry.value)) return
    if (newVal !== null && newVal !== undefined && newVal !== inlineEditEntry.value.categoryClassTime) {
      inlineEditEntry.value.categoryClassTime = newVal
    }
  }
)

async function submitEntry(): Promise<void> {
  if (isSavingEntry.value) return
  isSavingEntry.value = true

  try {
  validationError.value = null
  successMessage.value = null
  duplicateWarning.value = null
  applyTailResolutionToEntry(newEntry)
  // Don't reset validationWarning or saveAnywayValidation here - they need to persist
  // so that "Save Anyway" can work. They'll be cleared after successful save.
  
  const baseEntry: Omit<LogEntry, 'id'> = {
    date: newEntry.date,
    role: newEntry.role,
    aircraftCategoryClass: normalizeCategoryClassLabel((newEntry.aircraftCategoryClass || '').trim()),
    categoryClassTime: normalizeNumber(newEntry.categoryClassTime),
    aircraftMakeModel: newEntry.aircraftMakeModel.trim(),
    registration: newEntry.registration.trim(),
    flightNumber: newEntry.flightNumber?.trim() || null,
    departure: (activeLogbook.value === 'simulator' && !newEntry.departure.trim()) ? '—' : newEntry.departure.trim(),
    destination: (activeLogbook.value === 'simulator' && !newEntry.destination.trim()) ? '—' : newEntry.destination.trim(),
    route: (newEntry.route || '').trim().toUpperCase(),
    trainingElements: newEntry.trainingElements.trim(),
    trainingInstructor: newEntry.trainingInstructor.trim(),
    instructorCertificate: newEntry.instructorCertificate.trim(),
    picName: (newEntry.picName || '').trim() || null,
    sicName: (newEntry.sicName || '').trim() || null,
    flightConditions: sanitizeFlightConditions([...newEntry.flightConditions]),
    remarks: newEntry.remarks.trim(),
    tags: Array.isArray(newEntry.tags) ? [...newEntry.tags].filter(Boolean) : [],
    logbookType: activeLogbook.value,
    flightTime: flightTimeFields.reduce<FlightTimeBreakdown>((acc, field) => {
      const normalized = normalizeNumber(newEntry.flightTime[field.key])
      acc[field.key] = normalized
      // Debug logging for night time
      if (field.key === 'night') {
        console.log('[SaveEntry] Saving night time:', {
          rawValue: newEntry.flightTime[field.key],
          normalizedValue: normalized,
          entryDate: newEntry.date,
          departure: newEntry.departure
        })
      }
      return acc
    }, {} as FlightTimeBreakdown),
    performance: (() => {
      const base = { ...createEmptyPerformance() }
      performanceFields.forEach((field) => {
        const v = newEntry.performance[field.key]
        ;(base as any)[field.key] = v ?? null
      })
      const approaches = (newEntry.performance.approaches && newEntry.performance.approaches.length > 0)
        ? newEntry.performance.approaches.map((a) => ({ type: (a.type || '').trim() || 'Unknown', count: Math.max(0, a.count || 1) }))
        : []
      base.approaches = approaches
      base.approachCount = approaches.reduce((s, a) => s + a.count, 0) || null
      base.approachType = approaches[0]?.type ?? null
      return base
    })(),
    oooi: (() => {
      if (!newEntry.oooi) return undefined
      const hasOOOITimes =
        (newEntry.oooi.out && newEntry.oooi.out.trim()) ||
        (newEntry.oooi.off && newEntry.oooi.off.trim()) ||
        (newEntry.oooi.on && newEntry.oooi.on.trim()) ||
        (newEntry.oooi.in && newEntry.oooi.in.trim())
      return hasOOOITimes ? { ...newEntry.oooi } : undefined
    })()
  }

  if (inferLogbookType(baseEntry) === 'simulator') {
    normalizeSimulatorInstrumentTime(baseEntry)
    baseEntry.flightConditions = autoCheckFlightConditions(
      baseEntry.flightConditions,
      baseEntry.flightTime.night,
      baseEntry.flightTime.actualInstrument,
      baseEntry.flightTime.simulatedInstrument,
      baseEntry.flightTime.crossCountry,
      baseEntry.flightTime.nvg ?? null
    )
  }

  // Debug: Log the flightTime object being saved
  console.log('[SaveEntry] FlightTime being saved:', baseEntry.flightTime)
  console.log('[SaveEntry] Night time value:', baseEntry.flightTime.night)

  // Defensive logging for unreplicated save errors (Phase 1)
  const savePayloadSummary = {
    editingEntryId: editingEntryId.value,
    date: baseEntry.date,
    totalTime: baseEntry.flightTime?.total,
    departure: baseEntry.departure,
    destination: baseEntry.destination,
    registration: baseEntry.registration
  }
  console.log('[SaveEntry] Payload summary:', savePayloadSummary)

  // Check for duplicates and validate in parallel (local-first duplicate detection)
  const entryToCheck: LogEntry = {
    ...baseEntry,
    id: editingEntryId.value || 'temp',
  }

  const entryToValidate: LogEntry = {
    ...baseEntry,
    id: editingEntryId.value || 'temp',
  }

  const duplicatePromise =
    isAuthenticated.value && user.value
      ? checkDuplicatesWithLocalFallback(
          entryToCheck,
          user.value.id,
          logEntries.value,
          editingEntryId.value || undefined
        )
      : Promise.resolve(
          findDuplicateEntries(
            entryToCheck,
            logEntries.value.filter((e) => e.id !== editingEntryId.value)
          )
        )

  const [duplicates] = await Promise.all([
    duplicatePromise,
    validateFlightTimeEntry(entryToValidate, logEntries.value),
  ])

  if (duplicates.length > 0 && !saveAnyway.value) {
    duplicateWarning.value = { matches: duplicates }
    return
  }

  // Check if validation now passes (user may have fixed errors)
  const validationNowPasses = !hasErrors.value && !hasWarnings.value
  
  // If validation now passes, reset the "save anyway" flag and clear validation state
  if (validationNowPasses) {
    saveAnywayValidation.value = false
    validationWarning.value = false
    clearValidation()
  } else {
    // Show validation warnings if there are issues
    validationWarning.value = true
    
    // If user has explicitly chosen to save anyway, proceed (but keep validation visible)
    if (saveAnywayValidation.value) {
      // User has chosen to proceed, so we'll save despite validation issues
      // Validation results will be cleared after successful save
      console.log('[SaveEntry] Proceeding with save despite validation issues (saveAnywayValidation = true)')
    } else {
      // Block save if there are errors (unless user explicitly overrides)
      if (hasErrors.value) {
        console.log('[SaveEntry] Blocking save due to validation errors')
        return
      }
      
      // Show warning if there are warnings (but allow save)
      if (hasWarnings.value) {
        console.log('[SaveEntry] Blocking save due to validation warnings')
        return
      }
    }
  }

  // Past date alone is not a flaggable offense: only set flagged when save-anyway and issues are not solely past-date
  const allValidationResults = [...validationErrors.value, ...validationWarnings.value]
  const onlyPastDateIssues = allValidationResults.length > 0 && allValidationResults.every(
    (r) => r.field === 'date' && (
      (r.message || '').includes('before 1900') ||
      (r.message || '').includes('more than 100 years')
    )
  )
  const shouldFlag = saveAnywayValidation.value && !onlyPastDateIssues

  // LOCAL-FIRST: Always save to IndexedDB first, then queue for sync
    // Generate entry ID if new entry
    const entryId = editingEntryId.value || generateEntryId()
    
    // Create LogEntry for IndexedDB
    const entryToSave: LogEntry = {
      ...baseEntry,
      id: entryId,
      flagged: shouldFlag,
      isImported: false,
      signaturePending: pendingSaveSigningIntent.value === 'later',
      pendingInstructorId:
        pendingSaveSigningIntent.value === 'later'
          ? (signInstructorId.value || null)
          : null,
      amendsEntryId: baseEntry.amendsEntryId ?? null,
      isVoid: baseEntry.isVoid === true,
    }

    const userId = user.value?.id
    if (!userId) {
      throw new Error('Cannot save entry without an authenticated user')
    }

    // Save to IndexedDB first (immediate, works offline)
    if (editingEntryId.value) {
      await updateEntryInIndexedDB(entryToSave, { userId })
    } else {
      await saveEntryToIndexedDB(entryToSave, userId)
    }

    // Update local state immediately from IndexedDB
    if (editingEntryId.value) {
      logEntries.value = sortEntriesByDateAndOOOI(
        logEntries.value.map((e) => (e.id === entryId ? entryToSave : e))
      )
    } else {
      logEntries.value = sortEntriesByDateAndOOOI([...logEntries.value, entryToSave])
    }

    // Prepare database entry format for sync queue
    const dbEntry: any = {
      id: entryId, // Include UUID for both new entries and updates
      user_id: user.value?.id,
      date: baseEntry.date,
      role: baseEntry.role,
      aircraft_category_class: baseEntry.aircraftCategoryClass,
      category_class_time: baseEntry.categoryClassTime,
      aircraft_make_model: baseEntry.aircraftMakeModel,
      registration: baseEntry.registration,
      flight_number: baseEntry.flightNumber,
      departure: baseEntry.departure,
      destination: baseEntry.destination,
      route: baseEntry.route,
      training_elements: baseEntry.trainingElements || null,
      training_instructor: baseEntry.trainingInstructor || null,
      instructor_certificate: baseEntry.instructorCertificate || null,
      pic_name: (baseEntry.picName || '').trim() || null,
      sic_name: (baseEntry.sicName || '').trim() || null,
      flight_conditions: baseEntry.flightConditions,
      remarks: baseEntry.remarks || null,
      tags: baseEntry.tags && baseEntry.tags.length > 0 ? baseEntry.tags : [],
      logbook_type: baseEntry.logbookType ?? 'flight',
      flight_time: baseEntry.flightTime,
      performance: baseEntry.performance,
      oooi: baseEntry.oooi || null,
      flagged: shouldFlag,
      is_imported: false,
      signature_pending: pendingSaveSigningIntent.value === 'later',
      pending_instructor_id:
        pendingSaveSigningIntent.value === 'later'
          ? (signInstructorId.value || null)
          : null,
      amends_entry_id: entryToSave.amendsEntryId ?? null,
      is_void: entryToSave.isVoid === true,
    }

    // Add to sync queue (will sync to Supabase when online)
    if (isAuthenticated.value && user.value) {
      const awaitSync = shouldAwaitSyncForSigningIntent()
      if (editingEntryId.value) {
        await addToQueue('update', entryId, dbEntry, userId, { awaitSync })
      } else {
        await addToQueue('insert', entryId, dbEntry, userId, { awaitSync })
      }
    }

    // Show success and close Add Entry form; for dual entries open finish signing flow
    const wasEditingExisting = !!editingEntryId.value
    duplicateWarning.value = null
    saveAnyway.value = false
    validationWarning.value = false
    saveAnywayValidation.value = false
    clearValidation()
    const savedEntry = logEntries.value.find((e) => e.id === entryId) ?? entryToSave
    resetForm()
    isEntryFormOpen.value = false

    if (wasEditingExisting) {
      // Add form used for edit of existing id — treat like inline finish when dual
      if (
        requiresInstructorSignature(savedEntry)
        && !isEntrySigned(savedEntry.id)
      ) {
        afterAddEntrySaveSuccess(savedEntry)
      } else {
        showToast('Entry updated', { type: 'success', duration: 3000 })
      }
    } else {
      afterAddEntrySaveSuccess(savedEntry)
    }

  } catch (error) {
    console.error('[SaveEntry] Error saving entry:', error)
    console.error('[SaveEntry] Payload summary at error:', savePayloadSummary)
    if (error instanceof Error) {
      console.error('[SaveEntry] Error message:', error.message)
      console.error('[SaveEntry] Error stack:', error.stack)
    }
    successMessage.value = 'Error saving entry. Please try again.'
    validationError.value = error instanceof Error ? error.message : 'Failed to save entry'
  } finally {
    isSavingEntry.value = false
  }
}

// Helper function to check if a string is a valid UUID
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

async function removeEntry(id: string): Promise<void> {
  const userId = user.value?.id
  const localEntry = logEntries.value.find((entry) => entry.id === id)

  const clearQueuedOps = async (...entryIds: string[]): Promise<void> => {
    for (const entryId of new Set(entryIds.filter(Boolean))) {
      await removeQueuedOperationsForEntry(entryId, userId)
    }
  }

  const removeLocal = async (): Promise<void> => {
    logEntries.value = logEntries.value.filter((entry) => entry.id !== id)
    await clearQueuedOps(id)
    await deleteEntryFromIndexedDB(id)
  }

  if (!isAuthenticated.value || !userId) {
    await removeLocal()
    return
  }

  let supabaseId = id
  let entryData: Record<string, unknown> | null = null
  let existsOnServer = isValidUUID(id)

  if (!isValidUUID(id) && localEntry) {
    await checkOnlineStatus()
    const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    if (isOnline.value || browserOnline) {
      const { data: matchingEntries, error: findError } = await (supabase
        .from('log_entries') as any)
        .select('id, date, registration, departure, destination')
        .eq('date', localEntry.date)
        .eq('registration', localEntry.registration)
        .eq('departure', localEntry.departure)
        .eq('destination', localEntry.destination)
        .limit(1)

      if (!findError && matchingEntries && matchingEntries.length > 0) {
        supabaseId = matchingEntries[0].id
        existsOnServer = true
      } else {
        existsOnServer = false
      }
    } else {
      existsOnServer = false
    }
  }

  await removeLocal()

  if (!existsOnServer) {
    return
  }

  await checkOnlineStatus()
  const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  if (!isOnline.value && !browserOnline) {
    await addToQueue('delete', supabaseId, undefined, userId)
    return
  }

  try {
    try {
      const { data } = await (supabase
        .from('log_entries') as any)
        .select('*')
        .eq('id', supabaseId)
        .single()
      entryData = data
    } catch (err) {
      console.warn('Could not fetch entry data for audit log:', err)
    }

    const { error } = await (supabase
      .from('log_entries') as any)
      .delete()
      .eq('id', supabaseId)

    if (!error) {
      await insertLogEntryTombstone(userId, supabaseId)
    }

    if (error) {
      if (error.message?.includes('invalid input syntax for type uuid') && !isValidUUID(id)) {
        return
      }
      console.warn('[RemoveEntry] Supabase delete failed; queueing for retry:', error)
      await addToQueue('delete', supabaseId, undefined, userId)
      return
    }

    if (entryData) {
      try {
        await (supabase
          .from('audit_logs') as any)
          .insert({
            entry_id: supabaseId,
            user_id: userId,
            action: 'delete',
            old_data: entryData,
            new_data: null,
            changed_fields: [],
            change_summary: `Deleted log entry for ${entryData.date}`,
            is_compliance_event: false,
          })
      } catch (auditError) {
        console.warn('Failed to create audit log for deletion:', auditError)
      }
    }
  } catch (error) {
    console.warn('[RemoveEntry] Delete failed; queueing for retry:', error)
    await addToQueue('delete', supabaseId, undefined, userId)
  }
}

async function confirmAndDeleteEditing(): Promise<void> {
  if (!editingEntryId.value) return
  if (isEntrySigned(editingEntryId.value)) {
    showToast('Signed entries cannot be deleted', { type: 'error' })
    return
  }
  const proceed = window.confirm('Delete this entry? This action cannot be undone.')
  if (!proceed) return
  await removeEntry(editingEntryId.value)
  resetForm()
  successMessage.value = null
  validationError.value = null
}

async function confirmAndDeleteEntry(id: string): Promise<void> {
  if (isEntrySigned(id)) {
    showToast('Signed entries cannot be deleted', { type: 'error' })
    return
  }
  const proceed = window.confirm('Delete this entry? This action cannot be undone.')
  if (!proceed) return
  await removeEntry(id)
  // If we're editing this entry, cancel editing
  if (editingEntryId.value === id) {
    resetForm()
    successMessage.value = null
    validationError.value = null
  }
  if (expandedEntryId.value === id) {
    expandedEntryId.value = null
    inlineEditEntry.value = null
  }
}

// Audit Trail handlers
function openAuditTrail(entryId: string) {
  auditTrailEntryId.value = entryId
  showAuditTrail.value = true
}

async function handleEntryRestored(entryId: string) {
  // Reload the entry from Supabase to get updated data
  await loadEntries({ mode: 'delta' })
  // If we're currently editing this entry, refresh the form
  if (editingEntryId.value === entryId) {
    const updatedEntry = logEntries.value.find(e => e.id === entryId)
    if (updatedEntry) {
      // Re-populate form with updated entry - just reload entries, the form should update
      // The editingEntryId is still set, so the form will show the updated data
    }
  }
  // If this entry is expanded, refresh it
  if (expandedEntryId.value === entryId) {
    const updatedEntry = logEntries.value.find(e => e.id === entryId)
    if (updatedEntry) {
      inlineEditEntry.value = { ...updatedEntry }
    }
  }
}
function normalizeLogEntryForDisplay(entry: LogEntry): LogEntry {
  const normalizedFlightTime: FlightTimeBreakdown = {
    ...createEmptyFlightTime(),
  }
  flightTimeFields.forEach((field) => {
    normalizedFlightTime[field.key] = normalizeNumber(entry.flightTime?.[field.key])
  })

  const normalizedPerformance: PerformanceMetrics = { ...createEmptyPerformance() }
  performanceFields.forEach((field) => {
    const rawValue = entry.performance?.[field.key]
    const val =
      typeof rawValue === 'string'
        ? isNaN(parseFloat(rawValue))
          ? null
          : parseFloat(rawValue)
        : normalizeNumber(rawValue)
    ;(normalizedPerformance as unknown as Record<string, number | string | null>)[field.key] = val
  })
  normalizedPerformance.approaches = Array.isArray(entry.performance?.approaches)
    ? [...entry.performance.approaches]
    : getApproachesFromPerformance(entry.performance)
  normalizedPerformance.approachCount = getTotalApproachCount(normalizedPerformance) || null
  normalizedPerformance.approachType = normalizedPerformance.approaches[0]?.type ?? null

  return {
    ...entry,
    flightTime: normalizedFlightTime,
    performance: normalizedPerformance,
    logbookType: entry.logbookType === undefined ? getEntryLogbookType(entry) : entry.logbookType,
  }
}

function mapSupabaseRowToLogEntry(dbEntry: any): LogEntry {
  const entry: LogEntry = {
    id: dbEntry.id,
    date: dbEntry.date,
    role: dbEntry.role,
    aircraftCategoryClass: dbEntry.aircraft_category_class,
    categoryClassTime: dbEntry.category_class_time,
    aircraftMakeModel: dbEntry.aircraft_make_model,
    registration: dbEntry.registration,
    flightNumber: dbEntry.flight_number,
    departure: dbEntry.departure,
    destination: dbEntry.destination,
    route: dbEntry.route || '',
    trainingElements: dbEntry.training_elements || '',
    trainingInstructor: dbEntry.training_instructor || '',
    instructorCertificate: dbEntry.instructor_certificate || '',
    picName: dbEntry.pic_name || null,
    sicName: dbEntry.sic_name || null,
    flightConditions: sanitizeFlightConditions(dbEntry.flight_conditions || []),
    remarks: dbEntry.remarks || '',
    tags: Array.isArray(dbEntry.tags) ? [...dbEntry.tags] : [],
    logbookType: dbEntry.logbook_type === 'simulator' ? 'simulator' : 'flight',
    flightTime: dbEntry.flight_time as FlightTimeBreakdown,
    performance: dbEntry.performance as PerformanceMetrics,
    oooi: dbEntry.oooi as OOOITimes | undefined,
    flagged: dbEntry.flagged || false,
    version: dbEntry.version,
    dataHash: dbEntry.data_hash || undefined,
    createdAt: dbEntry.created_at || undefined,
    updatedAt: dbEntry.updated_at || undefined,
    signaturePending: dbEntry.signature_pending === true,
    pendingInstructorId: dbEntry.pending_instructor_id ?? null,
    amendsEntryId: dbEntry.amends_entry_id ?? null,
    isVoid: dbEntry.is_void === true,
    isImported: dbEntry.is_imported || false,
    importSource: dbEntry.import_source || undefined,
    importBatchId: dbEntry.import_batch_id || undefined,
    originalEntryDate: dbEntry.original_entry_date || undefined,
    importMetadata: dbEntry.import_metadata || undefined,
  }

  return normalizeLogEntryForDisplay(entry)
}

const IDB_PERSIST_BATCH = 50
const PROGRESSIVE_FIRST_BATCH = 100
const SUPABASE_BATCH_SIZE = 1000

function updateIosSyncBanner(status: Exclude<IosSyncStatus, 'idle'>, message: string): void {
  if (!isIos.value) return
  if (iosSyncSuccessTimer) {
    clearTimeout(iosSyncSuccessTimer)
    iosSyncSuccessTimer = null
  }
  iosSyncStatus.value = status
  iosSyncMessage.value = message
  iosSyncBannerVisible.value = true
  if (status === 'success') {
    iosSyncSuccessTimer = setTimeout(() => {
      iosSyncBannerVisible.value = false
      iosSyncStatus.value = 'idle'
      iosSyncSuccessTimer = null
    }, 3000)
  }
}

function retryIosSync(): void {
  void loadEntries({ mode: 'delta' })
}

function finalizeBulkLoadSideEffects(): void {
  isBulkLoadInProgress.value = false
  if (!isBrowser || logEntries.value.length === 0) return
  if (!(isIos.value && (isCatalogDrawerOpen.value || showSettingsModal.value))) {
    calculateAllCurrency(logEntries.value)
  }
}

function hasUsableAuthSession(): boolean {
  return !!(session.value?.access_token && user.value?.id)
}

async function ensureSupabaseClientSession(): Promise<boolean> {
  if (!hasUsableAuthSession()) return false

  const { data: { session: sbSession } } = await supabase.auth.getSession()
  if (sbSession?.access_token) return true

  const authSession = session.value
  if (!authSession?.access_token) return false

  const { error } = await supabase.auth.setSession({
    access_token: authSession.access_token,
    refresh_token: authSession.refresh_token ?? '',
  })
  if (error) {
    console.warn('[LoadEntries] setSession failed:', error.message)
    return false
  }
  return true
}

async function fetchSupabaseLogEntriesRange(
  userId: string,
  from: number,
  to: number
): Promise<LogEntry[]> {
  const { data: batch, error } = await (supabase
    .from('log_entries') as any)
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .range(from, to)
  if (error) {
    console.error('[LoadEntries] Error loading entries from Supabase:', error)
    throw error
  }
  if (!batch?.length) return []
  return batch.map(mapSupabaseRowToLogEntry)
}

async function fetchRemainingSupabaseLogEntries(
  userId: string,
  startFrom: number,
  onProgress?: (loaded: number) => void
): Promise<LogEntry[]> {
  let allEntries: LogEntry[] = []
  let from = startFrom
  let hasMore = true

  while (hasMore) {
    const to = from + SUPABASE_BATCH_SIZE - 1
    const batch = await fetchSupabaseLogEntriesRange(userId, from, to)
    if (!batch.length) break
    allEntries = allEntries.concat(batch)
    onProgress?.(startFrom + allEntries.length)
    hasMore = batch.length >= SUPABASE_BATCH_SIZE
    from += SUPABASE_BATCH_SIZE
  }

  return allEntries
}

const deferredLogEntries = shallowRef<LogEntry[] | null>(null)

function assignLogEntries(entries: LogEntry[]): void {
  const sorted = sortEntriesByDateAndOOOI(entries)
  if (isIos.value && (isCatalogDrawerOpen.value || showSettingsModal.value)) {
    deferredLogEntries.value = sorted
    return
  }
  deferredLogEntries.value = null
  logEntries.value = sorted
}

function flushDeferredLogEntries(): void {
  if (!deferredLogEntries.value) return
  logEntries.value = deferredLogEntries.value
  deferredLogEntries.value = null
  if (logEntries.value.length > 0) {
    calculateAllCurrency(logEntries.value)
  }
}

watch([isCatalogDrawerOpen, showSettingsModal], () => {
  if (!isIos.value) return
  if (!isCatalogDrawerOpen.value && !showSettingsModal.value) {
    flushDeferredLogEntries()
  }
})

async function advanceSyncWatermarks(
  entries: LogEntry[],
  tombstones: LogEntryDeletionTombstone[] = []
): Promise<void> {
  const incoming = computeRemoteSyncWatermark(entries, tombstones)
  const existing = await getRemoteSyncWatermark()
  const merged = mergeWatermarks(existing, incoming)
  if (merged) {
    await setRemoteSyncWatermark(merged)
  }
  await setLastSuccessfulRemoteSyncAt(Date.now())
}

async function applyRemoteSync(
  supabaseEntries: LogEntry[],
  idbEntries: Awaited<ReturnType<typeof getAllIDBLogEntriesForUser>>,
  userId: string,
  options: {
    reconcileRemoteDeletes?: boolean
    awaitIdbPersist?: boolean
    tombstones?: LogEntryDeletionTombstone[]
    reconcileQueue?: boolean
  } = {}
): Promise<number> {
  const reconcileRemoteDeletes = options.reconcileRemoteDeletes ?? true
  const syncQueue = await getSyncQueue(userId)
  const localWithSync = idbEntries.map((entry) => ({
    entry: mapIdbEntryToLogEntry(entry),
    synced: entry._synced,
  }))

  const { mergedEntries, removedEntryIds } = mergeRemoteLogEntries({
    localEntries: localWithSync,
    remoteEntries: supabaseEntries,
    syncQueue,
    reconcileRemoteDeletes,
  })

  const tombstoneIds = (options.tombstones ?? []).map((t) => t.entryId)
  const afterTombstones = applyTombstoneDeletions(mergedEntries, tombstoneIds, syncQueue)
  const allRemovedIds = [...new Set([...removedEntryIds, ...afterTombstones.removedEntryIds])]

  if (allRemovedIds.length > 0) {
    await Promise.all(
      allRemovedIds.map(async (removedId) => {
        await deleteEntryFromIndexedDB(removedId)
        await removeQueuedOperationsForEntry(removedId, userId)
      })
    )
  }

  assignLogEntries(afterTombstones.mergedEntries)
  await advanceSyncWatermarks(supabaseEntries, options.tombstones ?? [])

  if (options.reconcileQueue !== false && reconcileRemoteDeletes) {
    await reconcileSyncQueue(userId, {
      remoteEntryIds: supabaseEntries.map((entry) => entry.id),
    })
  } else if (options.reconcileQueue !== false) {
    await reconcileSyncQueue(userId)
  }

  console.log(
    '[LoadEntries] Merged entries:',
    logEntries.value.length,
    'entries;',
    allRemovedIds.length,
    'removed remotely'
  )

  const remoteIds = new Set(supabaseEntries.map((entry) => entry.id))
  if (options.awaitIdbPersist) {
    await persistSyncedEntriesToIndexedDB(supabaseEntries, remoteIds, userId)
  } else if (supabaseEntries.length > 0) {
    void persistSyncedEntriesToIndexedDB(supabaseEntries, remoteIds, userId).catch((err) => {
      console.warn('[LoadEntries] Background IndexedDB persist failed:', err)
    })
  }

  return allRemovedIds.length
}

async function applyDeltaRemoteSync(
  changedEntries: LogEntry[],
  tombstones: LogEntryDeletionTombstone[],
  idbEntries: Awaited<ReturnType<typeof getAllIDBLogEntriesForUser>>,
  userId: string
): Promise<number> {
  if (changedEntries.length === 0 && tombstones.length === 0) {
    await setLastSuccessfulRemoteSyncAt(Date.now())
    return 0
  }

  return applyRemoteSync(changedEntries, idbEntries, userId, {
    reconcileRemoteDeletes: false,
    awaitIdbPersist: true,
    tombstones,
    reconcileQueue: true,
  })
}

async function backgroundFullRemoteSync(userId: string): Promise<number> {
  const allRemote = await fetchRemainingSupabaseLogEntries(userId, 0, (loaded) => {
    updateIosSyncBanner('loading', `Loading logbook… ${loaded} entries`)
  })
  const freshIdb = await getAllIDBLogEntriesForUser(userId)
  return applyRemoteSync(allRemote, freshIdb, userId, {
    reconcileRemoteDeletes: true,
    awaitIdbPersist: true,
    reconcileQueue: true,
  })
}

async function backgroundDeltaRemoteSync(
  userId: string,
  idbEntries: Awaited<ReturnType<typeof getAllIDBLogEntriesForUser>>
): Promise<number> {
  const watermark = await getRemoteSyncWatermark()
  if (!watermark) {
    return backgroundFullRemoteSync(userId)
  }

  const [changedEntries, tombstones] = await Promise.all([
    fetchDeltaLogEntries(userId, watermark, mapSupabaseRowToLogEntry),
    fetchDeltaDeletions(userId, watermark),
  ])

  if (changedEntries.length >= DELTA_FALLBACK_THRESHOLD) {
    console.warn(
      '[LoadEntries] Delta batch exceeded threshold; falling back to full sync:',
      changedEntries.length
    )
    return backgroundFullRemoteSync(userId)
  }

  const freshIdb = idbEntries.length > 0 ? idbEntries : await getAllIDBLogEntriesForUser(userId)
  return applyDeltaRemoteSync(changedEntries, tombstones, freshIdb, userId)
}

async function syncInbound(
  userId: string,
  idbEntries: Awaited<ReturnType<typeof getAllIDBLogEntriesForUser>>,
  cachedEntryCount: number,
  options: { mode: InboundSyncMode; skipIfFresh?: boolean }
): Promise<number> {
  const mode = options.mode === 'auto'
    ? (cachedEntryCount > 0 ? 'delta' : 'full')
    : options.mode

  if (options.skipIfFresh && mode === 'delta') {
    const lastSyncAt = await getLastSuccessfulRemoteSyncAt()
    if (lastSyncAt != null && Date.now() - lastSyncAt < CACHE_FRESH_MS) {
      return 0
    }
  }

  isBulkLoadInProgress.value = true

  if (mode === 'delta') {
    if (cachedEntryCount > 0) {
      updateIosSyncBanner('loading', `Showing ${cachedEntryCount} cached entries`)
    }

    try {
      const removed = await backgroundDeltaRemoteSync(userId, idbEntries)
      if (cachedEntryCount > 0) {
        updateIosSyncBanner('success', `${logEntries.value.length} entries loaded`)
      }
      return removed
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed'
      console.error('[LoadEntries] Delta sync failed:', err)
      if (cachedEntryCount > 0) {
        updateIosSyncBanner('error', `Sync failed: ${message}`)
      }
      throw err
    } finally {
      finalizeBulkLoadSideEffects()
    }
  }

  const lastSyncAt = await getLastSuccessfulRemoteSyncAt()
  const cacheFresh =
    cachedEntryCount > 0 &&
    lastSyncAt != null &&
    Date.now() - lastSyncAt < CACHE_FRESH_MS

  if (cachedEntryCount > 0) {
    updateIosSyncBanner(
      'loading',
      cacheFresh
        ? `Showing ${cachedEntryCount} cached entries`
        : `Showing ${cachedEntryCount} cached entries — updating…`
    )

    try {
      const removed = await backgroundFullRemoteSync(userId)
      updateIosSyncBanner('success', `${logEntries.value.length} entries loaded`)
      return removed
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed'
      console.error('[LoadEntries] Error syncing with Supabase:', err)
      updateIosSyncBanner('error', `Sync failed: ${message}`)
      throw err
    } finally {
      finalizeBulkLoadSideEffects()
    }
  }

  updateIosSyncBanner('loading', 'Syncing… fetching entries')
  const fetchTimeout = syncTimeoutMs(Math.max(idbEntries.length, logEntries.value.length, 500))

  try {
    const firstBatch = await withTimeout(
      fetchSupabaseLogEntriesRange(userId, 0, PROGRESSIVE_FIRST_BATCH - 1),
      fetchTimeout,
      'Fetch first log entries from Supabase'
    )

    let inboundRemovedCount = 0
    if (firstBatch.length > 0) {
      inboundRemovedCount = await applyRemoteSync(firstBatch, idbEntries, userId, {
        reconcileRemoteDeletes: false,
        reconcileQueue: false,
      })
      calculateAllCurrency(logEntries.value)
      updateIosSyncBanner('loading', `Loading logbook… ${firstBatch.length} entries`)
    }

    if (firstBatch.length < PROGRESSIVE_FIRST_BATCH) {
      finalizeBulkLoadSideEffects()
      updateIosSyncBanner('success', `${logEntries.value.length} entries loaded`)
      return inboundRemovedCount
    }

    void (async () => {
      try {
        const removed = await backgroundFullRemoteSync(userId)
        updateIosSyncBanner('success', `${logEntries.value.length} entries loaded`)
        void removed
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sync failed'
        console.error('[LoadEntries] Background full sync failed:', err)
        updateIosSyncBanner('error', `Sync failed: ${message}`)
      } finally {
        finalizeBulkLoadSideEffects()
      }
    })()

    return inboundRemovedCount
  } catch (err) {
    finalizeBulkLoadSideEffects()
    const message = err instanceof Error ? err.message : 'Sync failed'
    console.error('[LoadEntries] Error syncing with Supabase:', err)
    updateIosSyncBanner('error', `Sync failed: ${message}`)
    throw err
  }
}

function mapIdbEntryToLogEntry(
  entry: Awaited<ReturnType<typeof getAllIDBLogEntriesForUser>>[number]
): LogEntry {
  return normalizeLogEntryForDisplay({
    id: entry.id,
    date: entry.date,
    role: entry.role,
    aircraftCategoryClass: entry.aircraftCategoryClass,
    categoryClassTime: entry.categoryClassTime,
    aircraftMakeModel: entry.aircraftMakeModel,
    registration: entry.registration,
    flightNumber: entry.flightNumber,
    departure: entry.departure,
    destination: entry.destination,
    route: entry.route,
    trainingElements: entry.trainingElements,
    trainingInstructor: entry.trainingInstructor,
    instructorCertificate: entry.instructorCertificate,
    picName: entry.picName ?? null,
    sicName: entry.sicName ?? null,
    flightConditions: entry.flightConditions,
    remarks: entry.remarks,
    tags: entry.tags,
    logbookType: entry.logbookType,
    flightTime: entry.flightTime,
    performance: entry.performance,
    oooi: entry.oooi,
    flagged: entry.flagged,
    version: entry.version,
    dataHash: entry.dataHash,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    signaturePending: entry.signaturePending === true,
    pendingInstructorId: entry.pendingInstructorId ?? null,
    amendsEntryId: entry.amendsEntryId ?? null,
    isVoid: entry.isVoid === true,
    isImported: entry.isImported,
    importSource: entry.importSource,
    importBatchId: entry.importBatchId,
    originalEntryDate: entry.originalEntryDate,
    importMetadata: entry.importMetadata,
  })
}

function syncTimeoutMs(estimatedEntryCount: number): number {
  return Math.max(30000, estimatedEntryCount * 20)
}

async function persistSyncedEntriesToIndexedDB(
  entries: LogEntry[],
  remoteIds: Set<string>,
  userId: string
): Promise<void> {
  const toPersist = entries.filter((entry) => remoteIds.has(entry.id))
  for (let i = 0; i < toPersist.length; i += IDB_PERSIST_BATCH) {
    const batch = toPersist.slice(i, i + IDB_PERSIST_BATCH)
    await Promise.all(batch.map((entry) => saveSyncedEntryToIndexedDB(entry, userId)))
  }
  console.log('[LoadEntries] IndexedDB persist complete:', toPersist.length, 'entries')
}

async function runDeferredPostLoadWork(): Promise<void> {
  try {
    await migrateSimulatorInstrumentOnLoad()
    void enrichFcvNightDataForDisplay()
    await maybeConsolidateAircraftByTail()
    void refreshFlightSignatures()
  } catch (err) {
    console.warn('[LoadEntries] Deferred post-load work failed:', err)
  }
}

// Load entries from Supabase (when authenticated) or localStorage (fallback)
async function loadEntriesInternal(options: LoadEntriesOptions = {}): Promise<number> {
  if (!isBrowser) return 0

  isLoadEntriesRunning.value = true
  let inboundRemovedCount = 0

  try {
    try {
      await initIndexedDB()
      console.log('[LoadEntries] IndexedDB initialized')
    } catch (error) {
      console.error('[LoadEntries] Failed to initialize IndexedDB:', error)
    }

    const scopedUserId = user.value?.id
    let idbEntries: Awaited<ReturnType<typeof getAllIDBLogEntriesForUser>> = []
    try {
      if (scopedUserId) {
        idbEntries = await getAllIDBLogEntriesForUser(scopedUserId)
        logEntries.value = idbEntries.map(mapIdbEntryToLogEntry)
        console.log('[LoadEntries] Loaded', logEntries.value.length, 'entries from IndexedDB')
        if (logEntries.value.length > 0) {
          calculateAllCurrency(logEntries.value)
          refreshPilotProfileStatsCache()
          if (isIos.value) {
            refreshIosTailCatalogFamilyMap()
          }
        }
      }
    } catch (error) {
      console.error('[LoadEntries] Error loading from IndexedDB:', error)
    }

    if (options.localOnly) {
      return inboundRemovedCount
    }

    if (isAuthenticated.value && user.value) {
      await checkOnlineStatus()
      const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
      const canSyncRemote = hasUsableAuthSession() && (isOnline.value || browserOnline)

      if (!canSyncRemote) {
        if (isIos.value && hasUsableAuthSession()) {
          updateIosSyncBanner('error', 'Sync skipped: offline or no session')
        }
      } else {
        const sessionReady = await ensureSupabaseClientSession()
        if (!sessionReady) {
          console.warn('[LoadEntries] Supabase client session unavailable')
          if (isIos.value) {
            updateIosSyncBanner('error', 'Sync failed: session unavailable')
          }
        } else {
          try {
            inboundRemovedCount = await syncInbound(
              user.value.id,
              idbEntries,
              idbEntries.length,
              {
                mode: options.mode ?? 'auto',
                skipIfFresh: options.skipIfFresh,
              }
            )
          } catch {
            // Error already logged and banner updated in syncInbound
          }
        }
      }
    } else if (!isAuthenticated.value) {
      loadPersistedEntries()
    }

    if (isAuthenticated.value && user.value) {
      startBackgroundSync()
    }

    void runDeferredPostLoadWork()
    return inboundRemovedCount
  } finally {
    isLoadEntriesRunning.value = false
  }
}

async function loadEntries(options: LoadEntriesOptions = {}): Promise<number> {
  if (loadEntriesInFlight) return loadEntriesInFlight
  loadEntriesInFlight = loadEntriesInternal(options)
  try {
    return await loadEntriesInFlight
  } finally {
    loadEntriesInFlight = null
  }
}

async function maybeConsolidateAircraftByTail(): Promise<void> {
  const userId = user.value?.id ?? getStorageUserId()
  if (!userId || logEntries.value.length === 0) return
  if (getScopedItem(ACCOUNT_SCOPED_STORAGE_KEYS.AIRCRAFT_TAIL_CONSOLIDATION, userId)) return

  const before = new Map(logEntries.value.map((entry) => [entry.id, entry.aircraftMakeModel]))
  const { entries: consolidated, updatedCount } = consolidateAircraftMakeModelByTail(logEntries.value)
  setScopedItem(ACCOUNT_SCOPED_STORAGE_KEYS.AIRCRAFT_TAIL_CONSOLIDATION, userId, 'done')

  if (updatedCount === 0) return

  logEntries.value = consolidated
  const changedEntries = consolidated.filter((entry) => before.get(entry.id) !== entry.aircraftMakeModel)
  console.log('[ConsolidateAircraft] Updated', updatedCount, 'entries across', changedEntries.length, 'rows')

  for (const entry of changedEntries) {
    try {
      if (isAuthenticated.value && user.value) {
        const { error } = await (supabase.from('log_entries') as any)
          .update({
            aircraft_make_model: entry.aircraftMakeModel,
            aircraft_category_class: entry.aircraftCategoryClass || null,
          })
          .eq('user_id', user.value.id)
          .eq('id', entry.id)
        if (error) {
          console.warn('[ConsolidateAircraft] Supabase update failed for', entry.id, error)
          continue
        }
        await saveSyncedEntryToIndexedDB(entry, user.value.id)
      } else {
        await updateEntryInIndexedDB(entry, { userId })
      }
    } catch (error) {
      console.warn('[ConsolidateAircraft] Persist failed for', entry.id, error)
    }
  }
}

async function refreshDashboardData(options?: { forceFull?: boolean }): Promise<void> {
  if (isDashboardRefreshing.value) return
  isDashboardRefreshing.value = true

  try {
    await checkOnlineStatus()

    if (!isAuthenticated.value || !user.value) {
      showToast('Sign in to sync', { type: 'error' })
      return
    }

    if (!isOnline.value) {
      showToast('Offline — showing local data', { type: 'error' })
      return
    }

    await refreshQueueLength()
    const queueBefore = queueLength.value
    const countBefore = logEntries.value.length

    const removed = await loadEntries({
      mode: options?.forceFull ? 'full' : 'delta',
    })
    await reconcileSyncQueue(user.value.id)
    await processQueue()
    await refreshQueueLength()
    await fetchEntityTags()
    await fetchUserTagPresets()
    await loadPilotProfileFromSupabase()
    await loadCrewProfiles()

    if (logEntries.value.length > 0) {
      calculateAllCurrency(logEntries.value)
    }

    const added = logEntries.value.length - countBefore
    const queueCleared = queueBefore > 0 && queueLength.value === 0
    if (removed > 0) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      showToast(
        `Removed ${removed} ${removed === 1 ? 'entry' : 'entries'} deleted elsewhere`,
        { type: 'info' }
      )
    } else if (added > 0) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      showToast(`Synced — ${added} new ${added === 1 ? 'entry' : 'entries'}`, { type: 'success' })
    } else if (queueCleared) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      showToast('Synced', { type: 'success' })
    } else if (options?.forceFull) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      showToast('Full sync complete', { type: 'success' })
    }
  } catch (err) {
    console.error('[refreshDashboardData]', err)
    showToast('Sync failed', { type: 'error' })
  } finally {
    isDashboardRefreshing.value = false
  }
}

async function forceFullDashboardSync(): Promise<void> {
  await refreshDashboardData({ forceFull: true })
}

async function prepareLogbookForFcvImport(): Promise<void> {
  if (isAuthenticated.value && user.value) {
    await processQueue({ silent: true })
  }
  await loadEntries({ mode: 'full' })
}

/** One-time-style migration: simulator entries cannot have actual instrument time. */
async function migrateSimulatorInstrumentOnLoad(): Promise<void> {
  const migrated: LogEntry[] = []

  logEntries.value = logEntries.value.map((entry) => {
    if (inferLogbookType(entry) !== 'simulator') return entry
    if ((entry.flightTime.actualInstrument ?? 0) <= 0) return entry

    const updated: LogEntry = {
      ...entry,
      flightTime: { ...entry.flightTime },
      flightConditions: [...(entry.flightConditions || [])],
    }
    normalizeSimulatorInstrumentTime(updated)
    updated.flightConditions = autoCheckFlightConditions(
      updated.flightConditions,
      updated.flightTime.night,
      updated.flightTime.actualInstrument,
      updated.flightTime.simulatedInstrument,
      updated.flightTime.crossCountry,
      updated.flightTime.nvg ?? null
    )
    migrated.push(updated)
    return updated
  })

  if (migrated.length === 0) return

  console.log('[MigrateSimInstrument] Normalized', migrated.length, 'simulator entries')

  await Promise.all(
    migrated.map((entry) =>
      updateEntryInIndexedDB(entry).catch((err) => {
        console.warn('[MigrateSimInstrument] Failed to update IndexedDB:', entry.id, err)
      })
    )
  )

  if (isAuthenticated.value && user.value) {
    for (const entry of migrated) {
      const dbEntry: any = {
        id: entry.id,
        user_id: user.value.id,
        date: entry.date,
        role: entry.role,
        aircraft_category_class: entry.aircraftCategoryClass,
        category_class_time: entry.categoryClassTime,
        aircraft_make_model: entry.aircraftMakeModel,
        registration: entry.registration,
        flight_number: entry.flightNumber,
        departure: entry.departure,
        destination: entry.destination,
        route: entry.route,
        training_elements: entry.trainingElements || null,
        training_instructor: entry.trainingInstructor || null,
        instructor_certificate: entry.instructorCertificate || null,
        pic_name: (entry.picName || '').trim() || null,
        sic_name: (entry.sicName || '').trim() || null,
        flight_conditions: entry.flightConditions,
        remarks: entry.remarks || null,
        tags: Array.isArray(entry.tags) ? entry.tags : [],
        logbook_type: entry.logbookType ?? 'simulator',
        flight_time: entry.flightTime,
        performance: entry.performance,
        oooi: entry.oooi || null,
        flagged: entry.flagged ?? false,
        is_imported: entry.isImported ?? false,
        import_source: entry.importSource ?? null,
        import_batch_id: entry.importBatchId ?? null,
        original_entry_date: entry.originalEntryDate ?? null,
        import_metadata: entry.importMetadata ?? null,
      }
      await addToQueue('update', entry.id, dbEntry)
    }
    if (isOnline.value) {
      processQueue()
    }
  }
}

async function handleFcvImported(payload: {
  imported: number
  linked: number
  skipped: number
  importBatchId?: string
}): Promise<void> {
  closeFcvFetchUi()
  await nextTick()
  await loadEntries({ mode: 'full' })
  flushDeferredLogEntries()
  const parts: string[] = []
  if (payload.imported > 0) {
    parts.push(`${payload.imported} ${payload.imported === 1 ? 'entry' : 'entries'} added`)
  }
  if (payload.linked > 0) {
    parts.push(`${payload.linked} ${payload.linked === 1 ? 'entry' : 'entries'} linked`)
  }
  if (payload.skipped > 0) {
    parts.push(`${payload.skipped} ${payload.skipped === 1 ? 'entry' : 'entries'} skipped`)
  }
  const summary =
    parts.length > 0
      ? `Schedule import complete: ${parts.join(', ')}.`
      : 'Schedule import complete.'
  fcvImportMessage.value = summary
  if (isIos.value) {
    showToast(summary, { type: 'success', duration: 5000 })
  }
}

async function enrichFcvNightDataForDisplay(): Promise<void> {
  const candidates = logEntries.value.filter((entry) => {
    if (entry.importSource !== 'fc_view') return false
    if (!entry.date || !entry.departure) return false
    if (!entry.oooi?.out || !entry.oooi?.in) return false
    const currentNight = normalizeNumber(entry.flightTime?.night) ?? 0
    return currentNight <= 0
  })

  if (candidates.length === 0) return

  const computed = await Promise.all(
    candidates.map(async (entry) => {
      const night = await autoCalculateNightTime(
        entry.date,
        entry.departure,
        entry.destination || '',
        entry.oooi?.out ?? null,
        entry.oooi?.in ?? null,
        entry.oooi?.isZulu ?? true
      )
      if (night === null) return null

      const existingConditions = sanitizeFlightConditions(entry.flightConditions || [])
      const nextConditions = autoCheckFlightConditions(
        existingConditions,
        night,
        normalizeNumber(entry.flightTime?.actualInstrument),
        normalizeNumber(entry.flightTime?.simulatedInstrument),
        normalizeNumber(entry.flightTime?.crossCountry),
        normalizeNumber(entry.flightTime?.nvg)
      )

      return {
        id: entry.id,
        night,
        flightConditions: nextConditions,
      }
    })
  )

  const updates = new Map(
    computed
      .filter((v): v is { id: string; night: number; flightConditions: string[] } => !!v)
      .map((v) => [v.id, v])
  )
  if (updates.size === 0) return

  logEntries.value = sortEntriesByDateAndOOOI(
    logEntries.value.map((entry) => {
      const update = updates.get(entry.id)
      if (!update) return entry
      return {
        ...entry,
        flightTime: {
          ...entry.flightTime,
          night: update.night,
        },
        flightConditions: update.flightConditions,
      }
    })
  )
}

function loadPersistedEntries(): void {
  if (!isBrowser) {
    return
  }
  const stored = readUserScopedLocal(LOGBOOK_STORAGE_KEY, true)
  if (!stored) {
    return
  }
  try {
    const parsed: LogEntry[] = JSON.parse(stored)
    if (Array.isArray(parsed)) {
      logEntries.value = parsed.map((entry) => {
        // Migration: rename instrument -> dualGiven
        const flightTimeRaw = entry.flightTime as unknown as Record<string, unknown>
        if ('instrument' in flightTimeRaw && !('dualGiven' in flightTimeRaw)) {
          flightTimeRaw.dualGiven = flightTimeRaw.instrument
          delete flightTimeRaw.instrument
        }
        
        // Normalize all flightTime values to ensure they're numbers, not strings
        const normalizedFlightTime: FlightTimeBreakdown = {
          ...createEmptyFlightTime()
        }
        flightTimeFields.forEach((field) => {
          const rawValue = entry.flightTime?.[field.key]
          normalizedFlightTime[field.key] = normalizeNumber(rawValue)
        })
        
        // Normalize performance values too
        const normalizedPerformance: PerformanceMetrics = { ...createEmptyPerformance() }
        performanceFields.forEach((field) => {
          const rawValue = entry.performance?.[field.key]
          const val = typeof rawValue === 'string'
            ? (isNaN(parseFloat(rawValue)) ? null : parseFloat(rawValue))
            : (rawValue ?? null)
          ;(normalizedPerformance as unknown as Record<string, number | string | null>)[field.key] = val
        })
        normalizedPerformance.approaches = Array.isArray(entry.performance?.approaches) ? [...entry.performance.approaches] : getApproachesFromPerformance(entry.performance)
        normalizedPerformance.approachCount = getTotalApproachCount(normalizedPerformance) || null
        normalizedPerformance.approachType = normalizedPerformance.approaches[0]?.type ?? null
        
        return {
          ...entry,
          flightNumber: entry.flightNumber ?? null,
          flightConditions: sanitizeFlightConditions(entry.flightConditions || []),
          flightTime: normalizedFlightTime,
          performance: normalizedPerformance,
          flagged: entry.flagged ?? false
        }
      })
      
      console.log('[LoadEntries] Loaded', logEntries.value.length, 'entries. Normalized flightTime values.')
    }
  } catch (err) {
    console.error('Unable to load stored logbook entries', err)
  }
}

// Test Supabase connection (can be called from browser console: window.testSupabase())
async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...')
    console.log('Supabase client:', supabase)
    
    // Test connection by querying log_entries table
    const { data, error, count } = await supabase
      .from('log_entries')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Supabase connection failed:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      showToast(`Connection failed: ${error.message}\n\nCheck console for details.`, { type: 'error' })
      return { success: false, error }
    }
    
    console.log('✅ Supabase connection successful!')
    console.log('Table exists, row count:', count)
    showToast(`Supabase connection successful!\n\nTable accessible. Row count: ${count ?? 0}`, { type: 'success' })
    return { success: true, data, count }
  } catch (err) {
    console.error('❌ Supabase test error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    showToast(`Test error: ${errorMessage}\n\nCheck console for details.`, { type: 'error' })
    return { success: false, error: err }
  }
}

// Expose test function to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).testSupabase = testSupabaseConnection
  
  // Expose migration reset function for cleanup
  ;(window as any).resetMigration = async () => {
    if (!isAuthenticated.value || !user.value) {
      console.error('You must be logged in to reset migration')
      return
    }
    const { resetMigration } = await import('../utils/migrateLocalStorage')
    const result = await resetMigration(user.value.id)
    if (result.success) {
      showToast('Migration reset complete! Refreshing page...', { type: 'success' })
      window.location.reload()
    } else {
      showToast(`Error: ${result.error}`, { type: 'error' })
    }
  }
  
  // Expose crew profile re-migration function
  ;(window as any).remigrateCrewProfiles = async () => {
    if (!isAuthenticated.value || !user.value) {
      console.error('You must be logged in to re-migrate crew profiles')
      return
    }
    const { remigrateCrewProfiles } = await import('../utils/migrateLocalStorage')
    const result = await remigrateCrewProfiles(user.value.id)
    if (result.success) {
      showToast(`Re-migrated ${result.migrated} crew profiles! Refreshing page...`, { type: 'success' })
      await loadCrewProfiles() // Reload from Supabase
      window.location.reload()
    } else {
      showToast(`Error: ${result.error}`, { type: 'error' })
    }
  }
  
  // Expose function to migrate crew names from log entries
  ;(window as any).migrateCrewFromEntries = async () => {
    if (!isAuthenticated.value || !user.value) {
      console.error('You must be logged in to migrate crew from entries')
      return
    }
    const { migrateCrewFromLogEntries } = await import('../utils/migrateLocalStorage')
    const result = await migrateCrewFromLogEntries(user.value.id, logEntries.value)
    if (result.success) {
      showToast(`Migrated ${result.migrated} crew profiles from log entries! Refreshing page...`, { type: 'success' })
      await loadCrewProfiles() // Reload from Supabase
      window.location.reload()
    } else {
      showToast(`Error: ${result.error}`, { type: 'error' })
    }
  }
  
  // Expose function to find duplicate crew profiles
  ;(window as any).findDuplicateCrew = async () => {
    if (!isAuthenticated.value || !user.value) {
      console.error('You must be logged in to find duplicates')
      return
    }
    const { findDuplicateCrewProfiles } = await import('../utils/migrateLocalStorage')
    const result = await findDuplicateCrewProfiles(user.value.id)
    if (result.duplicates.length > 0) {
      console.log('Duplicate crew profiles found:', result.duplicates)
      showToast(`Found ${result.duplicates.length} duplicate(s):\n${result.duplicates.map(d => d.names.join(' / ')).join('\n')}`, { type: 'info' })
    } else {
      showToast('No duplicate crew profiles found!', { type: 'info' })
    }
    return result
  }
  
  // Expose function to merge duplicate crew profiles
  ;(window as any).mergeCrewProfiles = async (canonicalName: string, duplicateName: string) => {
    if (!isAuthenticated.value || !user.value) {
      console.error('You must be logged in to merge crew profiles')
      return
    }
    if (!canonicalName || !duplicateName) {
      showToast('Usage: mergeCrewProfiles("Canonical Name", "Duplicate Name")', { type: 'info' })
      return
    }
    
    const { mergeDuplicateCrewProfiles } = await import('../utils/migrateLocalStorage')
    
    // Create update function that updates log entries in Supabase
    const updateLogEntries = async (oldName: string, newName: string) => {
      // Update log entries in Supabase
      const { data: entriesToUpdate, error: fetchError } = await (supabase
        .from('log_entries') as any)
        .select('id, training_elements')
        .eq('user_id', user.value!.id)
        .ilike('training_elements', oldName)
      
      if (fetchError) {
        console.error('Error fetching entries to update:', fetchError)
        return
      }
      
      if (!entriesToUpdate || entriesToUpdate.length === 0) {
        console.log('No entries found to update')
        return
      }
      
      // Update each entry
      for (const entry of entriesToUpdate) {
        const { error: updateError } = await (supabase
          .from('log_entries') as any)
          .update({ training_elements: newName })
          .eq('id', entry.id)
        
        if (updateError) {
          console.error(`Error updating entry ${entry.id}:`, updateError)
        }
      }
      
      // Also update local state
      logEntries.value = logEntries.value.map(entry => {
        if (entry.trainingElements && entry.trainingElements.toLowerCase() === oldName.toLowerCase()) {
          return { ...entry, trainingElements: newName }
        }
        return entry
      })
      
      console.log(`Updated ${entriesToUpdate.length} log entries`)
    }
    
    const result = await mergeDuplicateCrewProfiles(user.value.id, canonicalName, duplicateName, updateLogEntries)
    if (result.success) {
      showToast(`Merged "${duplicateName}" into "${canonicalName}"! Refreshing page...`, { type: 'success' })
      await loadCrewProfiles() // Reload from Supabase
      await loadEntries({ mode: 'full' }) // Reload entries
      window.location.reload()
    } else {
      showToast(`Error: ${result.error}`, { type: 'error' })
    }
    return result
  }
}

onMounted(async () => {
  loadClockPrefs()
  normalizeAndAutofillCategories()

  // Close settings when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement

    if (
      showColumnSettings.value
      && !target.closest('.column-settings-container')
      && !target.closest('.column-settings-panel')
    ) {
      showColumnSettings.value = false
    }

    // Close context menu when clicking outside
    if (contextMenuVisible.value && !target.closest('.context-menu-container')) {
      closeContextMenu()
    }
  }
  document.addEventListener('click', handleClickOutside)
  
  // Handle Escape key to close edit panel or add entry panel
  const handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (expandedEntryId.value !== null) {
        cancelInlineEdit()
      } else if (isEntryFormOpen.value) {
        toggleEntryForm()
      }
    }
  }
  document.addEventListener('keydown', handleEscapeKey)
  clockTimer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
  
  return () => {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleEscapeKey)
    if (clockTimer !== null) {
      clearInterval(clockTimer)
      clockTimer = null
    }
    // Clean up resize listeners if still active
    if (resizingColumn.value) {
      stopResize()
    }
  }
})

watch(
  logEntries,
  (entries) => {
    if (!isBrowser) {
      return
    }
    if (isBulkLoadInProgress.value) {
      return
    }
    if (logEntriesSideEffectTimer) {
      clearTimeout(logEntriesSideEffectTimer)
    }
    logEntriesSideEffectTimer = setTimeout(() => {
      if (!isAuthenticated.value) {
        tryLocalStorageSetItem(LOGBOOK_STORAGE_KEY, JSON.stringify(entries))
      }
      if (entries.length > 0 && !(isIos.value && (isCatalogDrawerOpen.value || showSettingsModal.value))) {
        calculateAllCurrency(entries)
      }
    }, LOG_ENTRIES_SIDE_EFFECT_DEBOUNCE_MS)
  },
  { deep: true }
)

watch(
  pilotProfile,
  () => {
    savePilotProfilePrefs()
    savePilotProfileToSupabase()
  },
  { deep: true }
)

// Auto-focus first input when edit panel opens
watch(
  expandedEntryId,
  (newId) => {
    if (newId !== null && inlineEditEntry.value && !isIos.value) {
      // Use nextTick to ensure DOM is updated
      setTimeout(() => {
        const firstInput = document.querySelector('[data-edit-panel] input[type="date"], [data-edit-panel] input[type="text"]') as HTMLInputElement
        if (firstInput) {
          firstInput.focus()
        }
      }, 100)
    }
  }
)

// Auto-focus first input when add entry panel opens
watch(
  isEntryFormOpen,
  (isOpen) => {
    if (isOpen && !isIos.value) {
      // Use nextTick to ensure DOM is updated
      setTimeout(() => {
        const firstInput = document.querySelector('[data-add-entry-panel] input[type="date"], [data-add-entry-panel] input[type="text"]') as HTMLInputElement
        if (firstInput) {
          firstInput.focus()
        }
      }, 100)
    }
  }
)

function getEntryLogbookType(entry: LogEntry): 'flight' | 'simulator' {
  if (entry.logbookType === 'flight' || entry.logbookType === 'simulator') return entry.logbookType
  const ft = entry.flightTime ?? {}
  const simTime = (ft.ffs ?? 0) + (ft.ftd ?? 0) + (ft.atd ?? 0)
  const airplaneTotal = Math.max(0, (ft.total ?? 0) - simTime)
  return simTime > 0 && airplaneTotal === 0 ? 'simulator' : 'flight'
}

interface CatalogFilterContext {
  parsedSearch: ReturnType<typeof parseAviationSearch>
  activeAircraft: Set<string>
  activeAirports: Set<string>
  activePilots: Set<string>
  activeConditions: Set<string>
  activeFamilies: Set<string>
  activeCategoryClass: Set<string>
  activeTags: string[]
  flagged: boolean
  activeLogbookType: 'flight' | 'simulator'
  classifiedAirports: Set<string>
}

function buildCatalogFilterContext(): CatalogFilterContext {
  return {
    parsedSearch: parseAviationSearch(debouncedSearchTerm.value, {
      knownTails: knownSearchTails.value,
    }),
    activeAircraft: new Set(getActiveFilterKeys(selectedFilters.aircraft).map((k) => k.toUpperCase())),
    activeAirports: new Set(getActiveFilterKeys(selectedFilters.airports).map((k) => k.toUpperCase())),
    activePilots: new Set(getActiveFilterKeys(selectedFilters.pilots)),
    activeConditions: new Set(getActiveFilterKeys(selectedFilters.conditions)),
    activeFamilies: new Set(getActiveFilterKeys(selectedFilters.families)),
    activeCategoryClass: new Set(
      getActiveFilterKeys(selectedFilters.categoryClass).map((k) => k.toUpperCase())
    ),
    activeTags: getActiveFilterKeys(selectedFilters.tags),
    flagged: selectedFilters.flagged,
    activeLogbookType: activeLogbook.value,
    classifiedAirports: classifiedRouteAirportSet.value,
  }
}

function entryPassesCatalogAndSearchFilters(
  entry: LogEntry,
  ctx: CatalogFilterContext
): boolean {
  if (getEntryLogbookType(entry) !== ctx.activeLogbookType) return false

  if (!entryMatchesAviationSearch(entry, ctx.parsedSearch, ctx.classifiedAirports)) {
    return false
  }

  if (ctx.activeAircraft.size > 0) {
    const reg = (entry.registration || '').toUpperCase()
    if (!ctx.activeAircraft.has(reg)) return false
  }

  if (ctx.activeAirports.size > 0) {
    const entryCodes = getEntryAirportCodes(entry, ctx.classifiedAirports)
    if (!entryCodes.some((code) => ctx.activeAirports.has(code))) return false
  }

  if (ctx.activePilots.size > 0) {
    const pilotName = entry.trainingElements || ''
    if (!ctx.activePilots.has(pilotName)) return false
  }

  if (ctx.activeConditions.size > 0) {
    const entryConds = new Set((entry.flightConditions || []) as string[])
    for (const cond of ctx.activeConditions) {
      if (!entryConds.has(cond)) return false
    }
  }

  if (ctx.activeFamilies.size > 0) {
    const fam = effectiveFamilyKeyForEntry(entry)
    if (!fam || !ctx.activeFamilies.has(fam)) return false
  }

  if (ctx.activeCategoryClass.size > 0) {
    const catClass = (entry.aircraftCategoryClass || '').trim().toUpperCase()
    if (!ctx.activeCategoryClass.has(catClass)) return false
  }

  if (ctx.flagged && !entry.flagged) return false

  if (ctx.activeTags.length > 0) {
    const entryTagSet = new Set(entry.tags || [])
    if (!ctx.activeTags.every((tag) => entryTagSet.has(tag))) return false
  }

  return true
}

function passesCatalogAndSearchFilters(entry: LogEntry): boolean {
  return entryPassesCatalogAndSearchFilters(entry, buildCatalogFilterContext())
}

const filteredEntries = computed(() => {
  const dateRange = getTotalsDateRange()
  const ctx = buildCatalogFilterContext()
  const superseded = supersededIdSet.value
  const result = logEntries.value.filter((entry) => {
    if (superseded.has(entry.id)) return false
    if (!entryPassesCatalogAndSearchFilters(entry, ctx)) return false
    if (dateRange && !entryMatchesTotalsDateRange(entry, dateRange)) return false
    return true
  })
  return sortEntriesByDateAndOOOI(result)
})

const displayedEntries = computed(() =>
  filteredEntries.value.slice(0, visibleEntryCount.value)
)

const entriesLoadMoreSentinelRef = ref<HTMLElement | null>(null)
let entriesLoadMoreObserver: IntersectionObserver | undefined

function loadMoreDisplayedEntries(): void {
  if (visibleEntryCount.value >= filteredEntries.value.length) return
  visibleEntryCount.value += ENTRIES_PAGE_SIZE
}

function teardownEntriesLoadMoreObserver(): void {
  entriesLoadMoreObserver?.disconnect()
  entriesLoadMoreObserver = undefined
}

function setupEntriesLoadMoreObserver(): void {
  teardownEntriesLoadMoreObserver()
  if (typeof IntersectionObserver === 'undefined') return
  const sentinel = entriesLoadMoreSentinelRef.value
  if (!sentinel) return
  const root = isIos.value ? rootScrollContainerRef.value : null
  if (isIos.value && !root) return

  entriesLoadMoreObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      if (visibleEntryCount.value >= filteredEntries.value.length) return
      loadMoreDisplayedEntries()
      nextTick(() => setupEntriesLoadMoreObserver())
    },
    { root, rootMargin: '160px 0px', threshold: 0 }
  )
  entriesLoadMoreObserver.observe(sentinel)
}

watch(entriesLoadMoreSentinelRef, (el) => {
  if (el) setupEntriesLoadMoreObserver()
  else teardownEntriesLoadMoreObserver()
})

watch(
  [debouncedSearchTerm, activeLogbook, totalsTimeMode, totalsCustomStart, totalsCustomEnd, selectedFilters],
  () => {
    visibleEntryCount.value = ENTRIES_PAGE_SIZE
    if (isIos.value) {
      rootScrollContainerRef.value?.scrollTo({ top: 0 })
    }
  },
  { deep: true }
)

const entriesHiddenOnlyByDateRange = computed(() => {
  const dateRange = getTotalsDateRange()
  if (!dateRange || filteredEntries.value.length > 0) return false
  return logEntries.value.some(passesCatalogAndSearchFilters)
})

const hasAnyEntriesForActiveLogbook = computed(() =>
  logEntries.value.some((entry) => getEntryLogbookType(entry) === activeLogbook.value)
)

/** Superseded originals are hidden from the list; filtered entries drive totals. */
const entriesForTotals = computed(() => filteredEntries.value)

const totals = computed(() => {
  const timeAccumulator = flightTimeFields.reduce<Record<FlightTimeKey, number>>((acc, field) => {
    acc[field.key] = 0
    return acc
  }, {} as Record<FlightTimeKey, number>)

  const performanceAccumulator = performanceFields.reduce<Record<PerformanceKey, any>>(
    (acc, field) => {
      acc[field.key] = 0
      return acc
    },
    { approachCount: 0, approachType: null } as Record<PerformanceKey, any>
  )

  const simOnlyKeys = new Set(['ffs', 'ftd', 'atd'])
  const simTimeAccumulator = flightTimeFields.reduce<Record<FlightTimeKey, number>>((acc, field) => {
    acc[field.key] = 0
    return acc
  }, {} as Record<FlightTimeKey, number>)

  entriesForTotals.value.forEach((entry) => {
    const ft = entry.flightTime ?? {}
    const simTime = (ft.ffs ?? 0) + (ft.ftd ?? 0) + (ft.atd ?? 0)
    const hasSimTime = simTime > 0
    const entryTotal = ft.total ?? 0
    const airplaneTotal = Math.max(0, entryTotal - simTime)
    const ratio = entryTotal > 0 ? airplaneTotal / entryTotal : 0

    if (hasSimTime) {
      simTimeAccumulator.total += simTime
      simTimeAccumulator.ffs += ft.ffs ?? 0
      simTimeAccumulator.ftd += ft.ftd ?? 0
      simTimeAccumulator.atd += ft.atd ?? 0
      simTimeAccumulator.pic += ft.pic ?? 0
      simTimeAccumulator.sic += ft.sic ?? 0
      simTimeAccumulator.dual += ft.dual ?? 0
      simTimeAccumulator.solo += ft.solo ?? 0
      simTimeAccumulator.night += ft.night ?? 0
      simTimeAccumulator.nvg += ft.nvg ?? 0
      simTimeAccumulator.actualInstrument += ft.actualInstrument ?? 0
      simTimeAccumulator.simulatedInstrument += ft.simulatedInstrument ?? 0
      simTimeAccumulator.crossCountry += ft.crossCountry ?? 0
      simTimeAccumulator.dualGiven += ft.dualGiven ?? 0
    }

    flightTimeFields.forEach((field) => {
      if (simOnlyKeys.has(field.key)) {
        timeAccumulator[field.key] += (ft[field.key] ?? 0)
        return
      }
      if (hasSimTime) {
        if (field.key === 'total') {
          timeAccumulator.total += airplaneTotal
        } else {
          timeAccumulator[field.key] += ((ft[field.key] ?? 0) * ratio)
        }
        return
      }
      const rawValue = ft[field.key]
      const value = rawValue ?? 0
      timeAccumulator[field.key] += value
    })
    performanceFields.forEach((field) => {
      performanceAccumulator[field.key] += (entry.performance[field.key] as number) ?? 0
    })
    performanceAccumulator.approachCount += getTotalApproachCount(entry.performance)
  })

  return {
    time: timeAccumulator,
    simTime: simTimeAccumulator,
    performance: performanceAccumulator,
    count: entriesForTotals.value.length
  }
})

// Tags that appear in the logbook (for sidebar filter)
const catalogTags = computed(() => {
  const set = new Set<string>()
  logEntries.value.forEach((entry) => {
    ;(entry.tags || []).forEach((t) => {
      if (t?.trim()) set.add(t.trim())
    })
  })
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

// Classify route tokens (navaid vs airport) for catalog and filtering
watchEffect(() => {
  if (isCapacitorNative()) return

  const routeTokens = new Set<string>()
  logEntries.value
    .filter((entry) => inferLogbookType(entry) === activeLogbook.value)
    .forEach((entry) => {
      parseRouteAirportCodes(entry.route || '').forEach((token) => routeTokens.add(token))
    })

  const uncached = [...routeTokens].filter((token) => locationClassificationCache.value[token] === undefined)
  if (uncached.length === 0) return

  void (async () => {
    for (let i = 0; i < uncached.length; i += 100) {
      const chunk = uncached.slice(i, i + 100)
      try {
        const response = await $fetch<{
          success: boolean
          results?: Record<string, 'airport' | 'navaid' | 'unknown'>
        }>('/api/classify-locations', {
          method: 'POST',
          body: { codes: chunk }
        })
        if (response.success && response.results) {
          locationClassificationCache.value = {
            ...locationClassificationCache.value,
            ...response.results
          }
        }
      } catch (error) {
        console.warn('Failed to classify route locations:', error)
      }
    }
  })()
})

// Hydrate airport names for display in catalog
watch(
  [
    isCatalogDrawerOpen,
    iosCatalogBuilt,
    iosCatalogBuilding,
    () => catalogSearchTerms.airports,
    () => catalogs.value.airports.length,
  ],
  () => {
    if (isCapacitorNative()) {
      if (!isCatalogDrawerOpen.value || !iosCatalogBuilt.value || iosCatalogBuilding.value) return
      enqueueAirportNamesForHydration(getFilteredCatalogItems('airports'))
      return
    }

    enqueueAirportNamesForHydration(catalogs.value.airports)
  }
)

// Aircraft registry for Ident dropdown - unique registrations with their make/model
function applyTailResolutionToEntry(entry: {
  registration?: string
  aircraftMakeModel?: string
  aircraftCategoryClass?: string
}): void {
  const tail = (entry.registration || '').trim()
  if (!tail) return
  const resolved = resolveAircraftByTail(tail, entry.aircraftMakeModel || '', aircraftTailIndex.value)
  if (!resolved.fromTail) return
  entry.aircraftMakeModel = resolved.aircraftMakeModel
  if (resolved.aircraftCategoryClass && !(entry.aircraftCategoryClass || '').trim()) {
    entry.aircraftCategoryClass = resolved.aircraftCategoryClass
  }
}

const aircraftRegistry = computed(() => {
  const index = aircraftTailIndex.value
  const sortedEntries = [...logEntries.value].sort((a, b) =>
    (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
  )
  const displayRegByKey = new Map<string, string>()
  for (const entry of sortedEntries) {
    const key = normalizeAircraftTailKey(entry.registration)
    if (key && !displayRegByKey.has(key)) {
      displayRegByKey.set(key, entry.registration.trim().toUpperCase())
    }
  }

  const registry: { registration: string; makeModel: string }[] = []
  for (const [key, identity] of index) {
    registry.push({
      registration: displayRegByKey.get(key) || key,
      makeModel: identity.aircraftMakeModel?.trim() || '',
    })
  }
  return registry.sort((a, b) => a.registration.localeCompare(b.registration))
})

// Filtered aircraft for New Entry form dropdown
const filteredAircraftForNewEntry = computed(() => {
  const search = newEntry.registration.trim().toUpperCase()
  if (!search) return aircraftRegistry.value
  return aircraftRegistry.value.filter(a => 
    a.registration.includes(search) || a.makeModel.toUpperCase().includes(search)
  )
})

// Filtered aircraft for Inline Edit form dropdown
const filteredAircraftForInlineEdit = computed(() => {
  if (!inlineEditEntry.value) return aircraftRegistry.value
  const search = inlineEditEntry.value.registration.trim().toUpperCase()
  if (!search) return aircraftRegistry.value
  return aircraftRegistry.value.filter(a => 
    a.registration.includes(search) || a.makeModel.toUpperCase().includes(search)
  )
})

// Selection handlers for Ident dropdown
function handleDropdownKeydown<T>(
  event: KeyboardEvent,
  dropdownType: 'ident' | 'inlineIdent' | 'from' | 'inlineFrom' | 'to' | 'inlineTo' | 'pilot' | 'inlinePilot',
  items: T[],
  selectFn: (item: T) => void
): void {
  if (items.length === 0) return

  const indexMap = {
    ident: highlightedIdentIndex,
    inlineIdent: highlightedInlineIdentIndex,
    from: highlightedFromIndex,
    inlineFrom: highlightedInlineFromIndex,
    to: highlightedToIndex,
    inlineTo: highlightedInlineToIndex,
    pilot: highlightedPilotIndex,
    inlinePilot: highlightedInlinePilotIndex
  }

  const highlightedIndex = indexMap[dropdownType]

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    highlightedIndex.value = highlightedIndex.value < items.length - 1 ? highlightedIndex.value + 1 : 0
    scrollToHighlighted(dropdownType)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    highlightedIndex.value = highlightedIndex.value > 0 ? highlightedIndex.value - 1 : items.length - 1
    scrollToHighlighted(dropdownType)
  } else if (event.key === 'Enter' && highlightedIndex.value >= 0 && highlightedIndex.value < items.length) {
    event.preventDefault()
    const index = highlightedIndex.value
    const selectedItem = items[index]
    if (selectedItem !== undefined) {
      selectFn(selectedItem)
    }
  } else if (event.key === 'Escape') {
    event.preventDefault()
    highlightedIndex.value = -1
    if (dropdownType === 'ident') showIdentDropdown.value = false
    else if (dropdownType === 'inlineIdent') showInlineIdentDropdown.value = false
    else if (dropdownType === 'from') showFromDropdown.value = false
    else if (dropdownType === 'inlineFrom') showInlineFromDropdown.value = false
    else if (dropdownType === 'to') showToDropdown.value = false
    else if (dropdownType === 'inlineTo') showInlineToDropdown.value = false
    else if (dropdownType === 'pilot') showPilotNameDropdown.value = false
    else if (dropdownType === 'inlinePilot') showInlinePilotNameDropdown.value = false
  }
}

function scrollToHighlighted(dropdownType: string): void {
  // Use nextTick to ensure DOM is updated
  setTimeout(() => {
    const selector = `[data-dropdown="${dropdownType}"] [data-index="${getHighlightedIndex(dropdownType)}"]`
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, 0)
}

function getHighlightedIndex(dropdownType: string): number {
  if (dropdownType === 'ident') return highlightedIdentIndex.value
  if (dropdownType === 'inlineIdent') return highlightedInlineIdentIndex.value
  if (dropdownType === 'from') return highlightedFromIndex.value
  if (dropdownType === 'inlineFrom') return highlightedInlineFromIndex.value
  if (dropdownType === 'to') return highlightedToIndex.value
  if (dropdownType === 'inlineTo') return highlightedInlineToIndex.value
  if (dropdownType === 'pilot') return highlightedPilotIndex.value
  if (dropdownType === 'inlinePilot') return highlightedInlinePilotIndex.value
  return -1
}

function selectAircraftForNewEntry(aircraft: { registration: string; makeModel: string }): void {
  newEntry.registration = aircraft.registration.toUpperCase()
  newEntry.aircraftMakeModel = aircraft.makeModel
  showIdentDropdown.value = false
  highlightedIdentIndex.value = -1
  if (!(newEntry.aircraftCategoryClass || '').trim()) {
    tryPopulateAircraftCategory(newEntry.registration)
  }
  mergeEntityTagsIntoEntry(newEntry)
}

function selectAircraftForInlineEdit(aircraft: { registration: string; makeModel: string }): void {
  if (!inlineEditEntry.value) return
  inlineEditEntry.value.registration = aircraft.registration.toUpperCase()
  inlineEditEntry.value.aircraftMakeModel = aircraft.makeModel
  showInlineIdentDropdown.value = false
  highlightedInlineIdentIndex.value = -1
  if (!(inlineEditEntry.value.aircraftCategoryClass || '').trim()) {
    tryPopulateAircraftCategoryForInline(inlineEditEntry.value.registration)
  }
  mergeEntityTagsIntoEntry(inlineEditEntry.value)
}

// Blur handlers for Ident dropdowns (with delay to allow click to register)
function handleIdentBlur(): void {
  window.setTimeout(() => {
    showIdentDropdown.value = false
    highlightedIdentIndex.value = -1
    if (!(newEntry.aircraftCategoryClass || '').trim() && (newEntry.registration || '').trim()) {
      tryPopulateAircraftCategory(newEntry.registration)
    }
    applyTailResolutionToEntry(newEntry)
  }, 150)
}

function handleInlineIdentBlur(): void {
  window.setTimeout(() => {
    showInlineIdentDropdown.value = false
    highlightedInlineIdentIndex.value = -1
    if (inlineEditEntry.value && !(inlineEditEntry.value.aircraftCategoryClass || '').trim() && (inlineEditEntry.value.registration || '').trim()) {
      tryPopulateAircraftCategoryForInline(inlineEditEntry.value.registration)
    }
    if (inlineEditEntry.value) {
      applyTailResolutionToEntry(inlineEditEntry.value)
    }
  }, 150)
}

// Filtered airports for FROM dropdown
const filteredAirportsForFrom = computed(() => {
  const search = newEntry.departure.trim().toUpperCase()
  if (!search) return catalogs.value.airports
  return catalogs.value.airports.filter(a => a.includes(search))
})

const filteredAirportsForInlineFrom = computed(() => {
  if (!inlineEditEntry.value) return catalogs.value.airports
  const search = inlineEditEntry.value.departure.trim().toUpperCase()
  if (!search) return catalogs.value.airports
  return catalogs.value.airports.filter(a => a.includes(search))
})

// Filtered airports for TO dropdown
const filteredAirportsForTo = computed(() => {
  const search = newEntry.destination.trim().toUpperCase()
  if (!search) return catalogs.value.airports
  return catalogs.value.airports.filter(a => a.includes(search))
})

const filteredAirportsForInlineTo = computed(() => {
  if (!inlineEditEntry.value) return catalogs.value.airports
  const search = inlineEditEntry.value.destination.trim().toUpperCase()
  if (!search) return catalogs.value.airports
  return catalogs.value.airports.filter(a => a.includes(search))
})

// Filtered pilots for Name dropdown
const filteredPilots = computed(() => {
  const search = newEntry.trainingElements.trim().toLowerCase()
  if (!search) return catalogs.value.pilots
  return catalogs.value.pilots.filter(p => p.toLowerCase().includes(search))
})

const filteredPilotsForInline = computed(() => {
  if (!inlineEditEntry.value) return catalogs.value.pilots
  const search = inlineEditEntry.value.trainingElements.trim().toLowerCase()
  if (!search) return catalogs.value.pilots
  return catalogs.value.pilots.filter(p => p.toLowerCase().includes(search))
})

// Preemptively fetch and cache airport coordinates for night time calculation
async function prefetchAirportCoords(airportCode: string): Promise<void> {
  if (!airportCode) return
  const coords = getAirportCoordsFromCache(airportCode)
  if (!coords) {
    // Fetch and cache in background (don't await)
    lookupAirport(airportCode).catch(() => {
      // Silently fail - not critical
    })
  }
}

// Helper function to check and auto-log cross-country time
// This function only handles cross-country auto-logging, NOT validation
// Validation will only run when Save Entry button is pressed
async function checkAndAutoLogCrossCountry(): Promise<void> {
  // Only require airports - date is not needed for cross-country distance calculation
  if (!newEntry.departure || !newEntry.destination ||
      newEntry.departure === 'UNKNOWN' || newEntry.destination === 'UNKNOWN') {
    clearCrossCountryFromEntry(newEntry)
    return
  }

  const entryToValidate: LogEntry = {
    ...newEntry,
    id: 'temp'
  }

  try {
    const airportCoords = await buildCrossCountryCoordsWithLookup(newEntry)

    if (airportCoords) {
      const results = validateCrossCountry(entryToValidate, airportCoords)

      const crossCountryResult = results.find(r => r.field === 'crossCountry' && r.autoFix)
      const crossCountryWarning = results.find(r => r.field === 'crossCountry' && r.type === 'warning' && r.message?.includes('distance is only'))

      const getNumValue = (val: number | null | undefined): number => {
        return val === null || val === undefined || isNaN(val) ? 0 : val
      }

      if (crossCountryWarning) {
        clearCrossCountryFromEntry(newEntry)
      } else if (crossCountryResult?.autoFix && crossCountryResult.autoFix.field === 'crossCountry') {
        const currentTotalTime = getNumValue(newEntry.flightTime.total)
        const totalValid = currentTotalTime > 0 && currentTotalTime <= 24
        const shouldSetXc = totalValid && !xcTimeManuallySet.value
        if (shouldSetXc) {
          const xcValue = Math.round(currentTotalTime * 10) / 10
          setCrossCountryOnEntry(newEntry, xcValue)
        }
      }
    } else {
      clearCrossCountryFromEntry(newEntry)
    }
  } catch (error) {
    console.warn('Failed to check and auto-log cross-country:', error)
  }
}

// Selection handlers for FROM dropdown
function selectAirportForFrom(airport: string): void {
  newEntry.departure = airport.toUpperCase()
  showFromDropdown.value = false
  highlightedFromIndex.value = -1
  // Prefetch coordinates for night time calculation
  prefetchAirportCoords(airport)
  // Immediately check and auto-log cross-country if both airports are set
  checkAndAutoLogCrossCountry()
}

function selectAirportForInlineFrom(airport: string): void {
  if (!inlineEditEntry.value) return
  inlineEditEntry.value.departure = airport.toUpperCase()
  showInlineFromDropdown.value = false
  highlightedInlineFromIndex.value = -1
  prefetchAirportCoords(airport)
}

// Selection handlers for TO dropdown
function selectAirportForTo(airport: string): void {
  newEntry.destination = airport.toUpperCase()
  showToDropdown.value = false
  highlightedToIndex.value = -1
  prefetchAirportCoords(airport)
  // Immediately check and auto-log cross-country if both airports are set
  checkAndAutoLogCrossCountry()
}

function selectAirportForInlineTo(airport: string): void {
  if (!inlineEditEntry.value) return
  inlineEditEntry.value.destination = airport.toUpperCase()
  showInlineToDropdown.value = false
  highlightedInlineToIndex.value = -1
  prefetchAirportCoords(airport)
}

// Selection handlers for Pilot Name dropdown
function selectPilotName(pilot: string): void {
  newEntry.trainingElements = pilot
  showPilotNameDropdown.value = false
  highlightedPilotIndex.value = -1
  mergeEntityTagsIntoEntry(newEntry)
}

function selectPilotNameForInline(pilot: string): void {
  if (!inlineEditEntry.value) return
  inlineEditEntry.value.trainingElements = pilot
  showInlinePilotNameDropdown.value = false
  highlightedInlinePilotIndex.value = -1
  mergeEntityTagsIntoEntry(inlineEditEntry.value)
}

// Blur handlers for airport and pilot dropdowns
function handleFromBlur(): void {
  window.setTimeout(() => { 
    showFromDropdown.value = false
    highlightedFromIndex.value = -1
  }, 150)
  // Trigger cross-country validation when user tabs out
  checkAndAutoLogCrossCountry()
}

function handleInlineFromBlur(): void {
  window.setTimeout(() => { 
    showInlineFromDropdown.value = false
    highlightedInlineFromIndex.value = -1
  }, 150)
}

function handleToBlur(): void {
  window.setTimeout(() => { 
    showToDropdown.value = false
    highlightedToIndex.value = -1
  }, 150)
  // Trigger cross-country validation when user tabs out
  checkAndAutoLogCrossCountry()
}

function handleInlineToBlur(): void {
  window.setTimeout(() => { 
    showInlineToDropdown.value = false
    highlightedInlineToIndex.value = -1
  }, 150)
}

function handlePilotNameBlur(): void {
  window.setTimeout(() => { 
    showPilotNameDropdown.value = false
    highlightedPilotIndex.value = -1
  }, 150)
}

function handleInlinePilotNameBlur(): void {
  window.setTimeout(() => { 
    showInlinePilotNameDropdown.value = false
    highlightedInlinePilotIndex.value = -1
  }, 150)
}

function coerceNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function buildRouteLabel(entry: LogEntry): string {
  const dep = (entry.departure || '').trim().toUpperCase() || '—'
  const dst = (entry.destination || '').trim().toUpperCase() || '—'
  return `${dep} → ${dst}`
}

function getTopKey(record: Record<string, number>): string | null {
  const entries = Object.entries(record)
  if (entries.length === 0) return null
  entries.sort((a, b) => b[1] - a[1])
  return entries[0]?.[0] ?? null
}

function createEmptyPilotProfileStats(): PilotProfileStats {
  return {
    totalFlights: 0,
    totalHours: 0,
    picHours: 0,
    nightHours: 0,
    instrumentHours: 0,
    airportsVisited: 0,
    avgDuration: 0,
    favoriteAircraft: null,
    favoriteRoute: null,
    conditions: [],
    lastFlight: null,
    dayLandings: 0,
    nightLandings: 0,
    longestLeg: null,
  }
}

const cachedPilotProfileStats = shallowRef<PilotProfileStats>(createEmptyPilotProfileStats())

function computePilotProfileStats(): PilotProfileStats {
  const stats: PilotProfileStats = {
    totalFlights: logEntries.value.length,
    totalHours: 0,
    picHours: 0,
    nightHours: 0,
    instrumentHours: 0,
    airportsVisited: 0,
    avgDuration: 0,
    favoriteAircraft: null,
    favoriteRoute: null,
    conditions: [],
    lastFlight: null,
    dayLandings: 0,
    nightLandings: 0,
    longestLeg: null,
  }

  if (logEntries.value.length === 0) {
    return stats
  }

  const airports = new Set<string>()
  const familyCounts: Record<string, number> = {}
  const routeCounts: Record<string, number> = {}
  const conditionCounts: Record<string, number> = {}
  let latestTimestamp = -Infinity

  logEntries.value.forEach((entry) => {
    const total = coerceNumber(entry.flightTime.total)
    const pic = coerceNumber(entry.flightTime.pic)
    const night = coerceNumber(entry.flightTime.night)
    const instrument = coerceNumber(entry.flightTime.actualInstrument) + coerceNumber(entry.flightTime.simulatedInstrument)

    stats.totalHours += total
    stats.picHours += pic
    stats.nightHours += night
    stats.instrumentHours += instrument
    stats.dayLandings += coerceNumber(entry.performance.dayLandings)
    stats.nightLandings += coerceNumber(entry.performance.nightLandings)

    getEntryAirportCodes(entry, classifiedRouteAirportSet.value).forEach((code) => airports.add(code))

    const routeLabel = buildRouteLabel(entry)
    routeCounts[routeLabel] = (routeCounts[routeLabel] || 0) + 1

    const family = effectiveFamilyKeyForEntry(entry)
    if (family) {
      familyCounts[family] = (familyCounts[family] || 0) + 1
    }

    (entry.flightConditions || []).forEach((condition) => {
      const rawValue = condition?.trim() || ''
      const label = activeConditionOptions.value.find((opt) => opt.value === rawValue)?.label || rawValue
      if (label) {
        conditionCounts[label] = (conditionCounts[label] || 0) + 1
      }
    })

    const timestamp = new Date(entry.date).getTime()
    if (!Number.isNaN(timestamp) && timestamp > latestTimestamp) {
      latestTimestamp = timestamp
      stats.lastFlight = entry
    }

    if (!stats.longestLeg || total > stats.longestLeg.duration) {
      stats.longestLeg = {
        route: routeLabel,
        duration: total,
        date: entry.date,
      }
    }
  })

  stats.airportsVisited = airports.size
  stats.avgDuration = stats.totalFlights > 0 ? stats.totalHours / stats.totalFlights : 0
  stats.favoriteAircraft = getTopKey(familyCounts)
  stats.favoriteRoute = getTopKey(routeCounts)
  const conditionOrderMap = new Map<string, number>(
    activeConditionOptions.value.map((opt, index) => [opt.label, index])
  )

  stats.conditions = Object.entries(conditionCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => {
      const orderA = conditionOrderMap.get(a[0]) ?? Infinity
      const orderB = conditionOrderMap.get(b[0]) ?? Infinity
      return orderA - orderB
    })
    .map(([label, count]) => ({ label, count }))

  return stats
}

function refreshPilotProfileStatsCache(): void {
  cachedPilotProfileStats.value = computePilotProfileStats()
}

const pilotProfileStats = computed(() => cachedPilotProfileStats.value)

watch(isBulkLoadInProgress, (inProgress, wasInProgress) => {
  if (wasInProgress && !inProgress) {
    refreshPilotProfileStatsCache()
  }
})

const pilotStatCards = computed(() => {
  const stats = pilotProfileStats.value
  return [
    {
      key: 'flights',
      label: 'Total Flights',
      value: stats.totalFlights.toLocaleString(),
      helper: 'Entries logged'
    },
    {
      key: 'totalHours',
      label: 'Total Time',
      value: stats.totalHours.toFixed(1),
      helper: 'Hours logged'
    },
    {
      key: 'picHours',
      label: 'PIC Time',
      value: stats.picHours.toFixed(1),
      helper: 'Hours PIC'
    },
    {
      key: 'nightHours',
      label: 'Night Time',
      value: stats.nightHours.toFixed(1),
      helper: 'Hours at night'
    },
    {
      key: 'instrumentHours',
      label: 'Instrument Time',
      value: stats.instrumentHours.toFixed(1),
      helper: 'Actual + Sim'
    },
    {
      key: 'airports',
      label: 'Airports Visited',
      value: stats.airportsVisited.toLocaleString(),
      helper: 'Unique fields'
    }
  ]
})

const pilotConditionChips = computed(() => pilotProfileStats.value.conditions.slice(0, 3))

const pilotRecentFlights = computed(() => {
  return sortEntriesByDateAndOOOI(
    [...logEntries.value].filter((entry) => {
      const timestamp = new Date(entry.date).getTime()
      return !Number.isNaN(timestamp)
    })
  ).slice(0, 3)
})

const settingsProfileStats = computed(() => ({
  favoriteAircraft: pilotProfileStats.value.favoriteAircraft,
  favoriteRoute: pilotProfileStats.value.favoriteRoute,
}))

const settingsCurrencySummary = computed(() => [
  {
    label: '90-day passenger',
    current: passengerCurrency.value?.isCurrent ?? false,
    detail: `${passengerCurrency.value?.takeoffs || 0}/3 takeoffs`,
  },
  {
    label: '90-day night',
    current: nightCurrency.value?.isCurrent ?? false,
    detail: `${nightCurrency.value?.landings || 0}/3 landings`,
  },
  {
    label: '6-month instrument',
    current: instrumentCurrency.value?.isCurrent ?? false,
    detail: `${instrumentCurrency.value?.approaches || 0}/6 approaches`,
  },
])

const settingsRecentFlights = computed(() =>
  pilotRecentFlights.value.map((flight) => ({
    id: flight.id,
    date: flight.date,
    route: buildRouteLabel(flight),
    aircraft: flight.aircraftMakeModel || '—',
    hours: coerceNumber(flight.flightTime.total).toFixed(1),
  }))
)

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }
  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return '—'
  }
  if (num === 0 || Math.abs(num) < 0.05) {
    return '—'
  }
  return num.toFixed(1)
}

function formatDisplayDate(date: string): string {
  if (!date) return '—'
  
  // Try to parse as ISO format (yyyy-mm-dd) first
  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const yyyy = isoMatch[1]
    const mm = isoMatch[2]
    const dd = isoMatch[3]
    return `${mm}/${dd}/${yyyy}`
  }
  
  // Try to parse as mm/dd/yyyy
  const mdyMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdyMatch && mdyMatch[1] && mdyMatch[2] && mdyMatch[3]) {
    const mm = mdyMatch[1].padStart(2, '0')
    const dd = mdyMatch[2].padStart(2, '0')
    const yyyy = mdyMatch[3]
    return `${mm}/${dd}/${yyyy}`
  }
  
  // Fallback to Date parsing (but avoid timezone issues)
  const d = new Date(date + 'T00:00:00')
  if (!Number.isNaN(d.getTime())) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${dd}/${yyyy}`
  }
  
  return '—'
}

function normalizeDateForInput(date: string): string {
  if (!date) return ''
  
  // Already ISO (yyyy-mm-dd)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date
  }
  
  // Convert mm/dd/yyyy -> yyyy-mm-dd
  const mdY = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdY && mdY.length === 4) {
    const mmPart = mdY[1] as string
    const ddPart = mdY[2] as string
    const yyyyPart = mdY[3] as string
    const m = mmPart.padStart(2, '0')
    const d = ddPart.padStart(2, '0')
    const y = yyyyPart
    return `${y}-${m}-${d}`
  }
  
  // Fallback: try Date parsing with time component to avoid timezone shifts
  const dateWithTime = date.includes('T') ? date : date + 'T00:00:00'
  const d = new Date(dateWithTime)
  if (!Number.isNaN(d.getTime())) {
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const y = d.getFullYear()
    return `${y}-${m}-${day}`
  }
  
  return ''
}

// Computed property for most used aircraft (catalog family label, same as Aircraft catalog)
const mostUsedAircraft = computed(() => {
  const familyCounts: Record<string, number> = {}
  entriesForTotals.value.forEach((entry) => {
    const family = effectiveFamilyKeyForEntry(entry)
    if (family) {
      familyCounts[family] = (familyCounts[family] || 0) + 1
    }
  })
  if (Object.keys(familyCounts).length === 0) return null
  const sorted = Object.entries(familyCounts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || null
})

function formatTotalValue(key: TotalsMetricKey): string {
  // Helper to safely convert to number
  const safeNumber = (val: any): number => {
    const num = typeof val === 'number' ? val : Number(val) ?? 0
    return isNaN(num) || !isFinite(num) ? 0 : num
  }
  
  if (key === 'totalTime') {
    return safeNumber(totals.value.time.total).toFixed(1)
  }
  if (key === 'soloTime') {
    return safeNumber(totals.value.time.solo).toFixed(1)
  }
  if (key === 'picTime') {
    return safeNumber(totals.value.time.pic).toFixed(1)
  }
  if (key === 'nightTime') {
    return safeNumber(totals.value.time.night).toFixed(1)
  }
  if (key === 'nvgTime') {
    return safeNumber(totals.value.time.nvg).toFixed(1)
  }
  if (key === 'instrumentTime') {
    const simulated = safeNumber(totals.value.time.simulatedInstrument)
    const actual = safeNumber(totals.value.time.actualInstrument)
    return (simulated + actual).toFixed(1)
  }
  if (key === 'crossCountry') {
    return safeNumber(totals.value.time.crossCountry).toFixed(1)
  }
  if (key === 'sic') {
    return safeNumber(totals.value.time.sic).toFixed(1)
  }
  if (key === 'dualReceived') {
    return safeNumber(totals.value.time.dual).toFixed(1)
  }
  if (key === 'dualGiven') {
    return safeNumber(totals.value.time.dualGiven).toFixed(1)
  }
  if (key === 'mostUsedAircraft') {
    return mostUsedAircraft.value || '—'
  }
  if (key === 'ffs') {
    return safeNumber(totals.value.time.ffs).toFixed(1)
  }
  if (key === 'ftd') {
    return safeNumber(totals.value.time.ftd).toFixed(1)
  }
  if (key === 'atd') {
    return safeNumber(totals.value.time.atd).toFixed(1)
  }
  return '—'
}

/** Value for a totals metric when viewing Sim (from simulator entries: dual, instrument, pic, etc. included) */
function formatSimTotalValue(key: TotalsMetricKey): string {
  const safeNumber = (val: any): number => {
    const num = typeof val === 'number' ? val : Number(val) ?? 0
    return isNaN(num) || !isFinite(num) ? 0 : num
  }
  const sim = totals.value.simTime ?? totals.value.time
  const t = totals.value.time
  if (key === 'totalTime') return safeNumber(sim.total).toFixed(1)
  if (key === 'ffs') return safeNumber(sim.ffs ?? t.ffs).toFixed(1)
  if (key === 'ftd') return safeNumber(sim.ftd ?? t.ftd).toFixed(1)
  if (key === 'atd') return safeNumber(sim.atd ?? t.atd).toFixed(1)
  if (key === 'soloTime') return safeNumber(sim.solo).toFixed(1)
  if (key === 'picTime') return safeNumber(sim.pic).toFixed(1)
  if (key === 'nightTime') return safeNumber(sim.night).toFixed(1)
  if (key === 'nvgTime') return safeNumber(sim.nvg).toFixed(1)
  if (key === 'instrumentTime') {
    const inst = safeNumber(sim.actualInstrument) + safeNumber(sim.simulatedInstrument)
    return inst.toFixed(1)
  }
  if (key === 'crossCountry') return safeNumber(sim.crossCountry).toFixed(1)
  if (key === 'dualGiven') return safeNumber(sim.dualGiven).toFixed(1)
  if (key === 'sic') return safeNumber(sim.sic).toFixed(1)
  if (key === 'dualReceived') return safeNumber(sim.dual).toFixed(1)
  if (key === 'mostUsedAircraft') return '—'
  return '0.0'
}
</script>

<style scoped>
[data-add-entry-panel],
[data-edit-panel] {
  min-width: 0;
}

[data-add-entry-panel] .grid,
[data-edit-panel] .grid {
  min-width: 0;
}

.catalog-drawer-ios {
  overflow-x: hidden;
  min-width: 0;
  max-width: 100%;
}

.catalog-drawer-ios-scroll,
.catalog-section-scroll,
.audit-trail-ios-scroll {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: auto;
}

.audit-trail-ios-scroll {
  min-width: 0;
  max-width: 100%;
}

.catalog-drawer-ios input[type='text'] {
  font-size: 16px;
  min-width: 0;
  max-width: 100%;
}

.catalog-modal-ios input:not([type='checkbox']):not([type='radio']),
.catalog-modal-ios textarea {
  font-size: 16px;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.entry-panel-ios,
.entry-panel-ios form,
.entry-panel-ios .grid,
.entry-panel-ios .rounded-lg {
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.entry-panel-ios .flex,
.entry-panel-ios .inline-flex {
  min-width: 0;
  max-width: 100%;
}

.entry-panel-ios .flex:not(.flex-col) {
  flex-wrap: wrap;
}

[data-add-entry-panel].entry-panel-ios,
[data-edit-panel].entry-panel-ios {
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  touch-action: pan-y;
  overflow-x: hidden;
}

.entry-panel-ios .rounded-lg.border {
  padding: 0.75rem;
}

.entry-panel-ios .entry-grid-ios-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.entry-panel-ios .entry-grid-ios-1 {
  grid-template-columns: minmax(0, 1fr);
}

.entry-grid-route-row {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.1fr) minmax(5.5rem, 6rem) minmax(0, 1.3fr);
}

.entry-grid-route-row .entry-grid-time-col {
  min-width: 5.5rem;
}

.entry-panel-ios label.block.uppercase.font-bold {
  font-size: 11px;
}

.entry-panel-ios div.uppercase.font-bold {
  font-size: 11px;
}

.entry-panel-ios div.uppercase.font-bold.mb-1.text-center {
  font-size: 10px;
}

.entry-panel-ios input:not([type='checkbox']):not([type='radio']),
.entry-panel-ios select,
.entry-panel-ios textarea {
  min-width: 0;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  font-size: 16px;
}

.entry-panel-ios input[type='checkbox'] {
  width: 1.125rem;
  height: 1.125rem;
  min-width: 1.125rem;
  max-width: 1.125rem;
  flex-shrink: 0;
  margin: 0;
  font-size: inherit;
}

.entry-panel-ios input[type='date'],
.entry-panel-ios select {
  -webkit-appearance: none;
  appearance: none;
  min-height: 2.125rem;
  line-height: 1.25rem;
}

.entry-panel-ios input[type='date']::-webkit-date-and-time-value {
  text-align: left;
}

.entry-panel-ios select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 0.75rem;
  padding-right: 1.75rem;
}

.entry-panel-ios .entry-chip-ios {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  min-height: 2.25rem;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
}

.entry-panel-actions-ios {
  width: 100%;
}

.entry-panel-actions-ios button {
  width: 100%;
  max-width: 100%;
}

/* Fade transition for backdrop */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-leave-active {
  pointer-events: none;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide right transition for panel */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease-in-out;
}

.slide-right-enter-from {
  transform: translateX(100%);
}

.slide-right-leave-to {
  transform: translateX(100%);
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s ease-in-out;
}

.slide-left-enter-from {
  transform: translateX(-100%);
}

.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>

<style>
/* Override browser autofill styles to maintain consistent appearance */
/* Using box-shadow trick to override autofill background color */
/* Light mode - default */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active,
textarea:-webkit-autofill,
textarea:-webkit-autofill:hover,
textarea:-webkit-autofill:focus,
textarea:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px rgb(243 244 246) inset !important;
  -webkit-text-fill-color: rgb(17 24 39) !important;
  transition: background-color 5000s ease-in-out 0s, color 5000s ease-in-out 0s;
  box-shadow: 0 0 0 1000px rgb(243 244 246) inset !important;
}

/* Dark mode autofill override - target inputs inside dark mode containers */
.bg-gray-950 input:-webkit-autofill,
.bg-gray-950 input:-webkit-autofill:hover,
.bg-gray-950 input:-webkit-autofill:focus,
.bg-gray-950 input:-webkit-autofill:active,
.bg-gray-950 textarea:-webkit-autofill,
.bg-gray-950 textarea:-webkit-autofill:hover,
.bg-gray-950 textarea:-webkit-autofill:focus,
.bg-gray-950 textarea:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px rgb(31 41 55) inset !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  box-shadow: 0 0 0 1000px rgb(31 41 55) inset !important;
}

/* Also handle inputs with dark mode background classes directly */
input.bg-black\/20:-webkit-autofill,
input.bg-black\/20:-webkit-autofill:hover,
input.bg-black\/20:-webkit-autofill:focus,
input.bg-black\/20:-webkit-autofill:active,
textarea.bg-black\/20:-webkit-autofill,
textarea.bg-black\/20:-webkit-autofill:hover,
textarea.bg-black\/20:-webkit-autofill:focus,
textarea.bg-black\/20:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px rgb(31 41 55) inset !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  box-shadow: 0 0 0 1000px rgb(31 41 55) inset !important;
}

/* Print styles for Form 8710 */
@media print {
  /* Hide non-essential UI elements */
  .print\\:hidden {
    display: none !important;
  }
  
  /* Page setup */
  @page {
    size: letter;
    margin: 0.5in;
  }
  
  /* Ensure form content is visible and properly formatted */
  body {
    background: white !important;
    color: black !important;
  }
  
  /* Form 8710 specific styling */
  #form8710-content {
    background: white !important;
    color: black !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;
  }
  
  /* Section headers */
  h1, h2, h3 {
    color: black !important;
    page-break-after: avoid;
  }
  
  /* Prevent page breaks inside sections */
  .space-y-4 > *,
  .space-y-6 > *,
  .space-y-8 > * {
    page-break-inside: avoid;
  }
  
  /* Tables */
  table {
    page-break-inside: avoid;
    border-collapse: collapse;
  }
  
  tr {
    page-break-inside: avoid;
  }
  
  /* Ensure borders are visible in print */
  .border,
  td.border,
  th.border {
    border-color: #000 !important;
    border-width: 1px !important;
  }
  
  /* Text colors for print */
  .print\\:text-black {
    color: black !important;
  }
  
  .print\\:bg-white {
    background: white !important;
  }
  
  .print\\:border-gray-400 {
    border-color: #9ca3af !important;
  }
  
  /* Ensure proper spacing */
  .print\\:p-0 {
    padding: 0 !important;
  }
  
  .print\\:border-0 {
    border: 0 !important;
  }
  
  .print\\:rounded-none {
    border-radius: 0 !important;
  }
  
  .print\\:shadow-none {
    box-shadow: none !important;
  }
  
  /* Grid columns for print */
  .print\\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
  
  /* Font sizes optimized for print */
  .text-xs {
    font-size: 10pt !important;
  }
  
  .text-sm {
    font-size: 11pt !important;
  }
  
  .text-base {
    font-size: 12pt !important;
  }
  
  .text-lg {
    font-size: 14pt !important;
  }
  
  .text-xl {
    font-size: 16pt !important;
  }
  
  .text-2xl {
    font-size: 18pt !important;
  }
  
  .text-3xl {
    font-size: 24pt !important;
  }
  
  /* Ensure proper margins */
  .mt-8 {
    margin-top: 1.5rem !important;
  }
  
  .pt-6 {
    padding-top: 1.5rem !important;
  }
  
  /* Page breaks */
  .page-break-before {
    page-break-before: always;
  }
  
  .page-break-after {
    page-break-after: always;
  }
  
  .page-break-inside-avoid {
    page-break-inside: avoid;
  }
}
</style>



