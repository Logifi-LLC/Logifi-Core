<template>
<div
  :class="[
    'min-h-screen overflow-y-auto transition-colors duration-300 font-quicksand',
    isDarkMode ? 'bg-gray-900' : 'bg-gray-200'
  ]"
>
      <header>
      <div
        :class="[
          'fixed top-0 left-0 right-0 z-30 transition-colors duration-300',
          isDarkMode 
            ? 'border-gray-700/50' 
            : 'border-gray-400/50'
        ]"
      >
        <div class="mr-auto px-6 sm:px-8 py-4 flex items-center justify-between relative">
        <a class="left" href="/">
            <img
              src="/images/logifi-logo.png"
              alt="logifi"
              :class="[
                'h-20 sm:h-24 lg:h-28 w-auto transition-all duration-300',
                isDarkMode ? '' : 'brightness-[0.2]'
              ]"
            />
          </a>
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
        <nav class="flex items-center gap-3">
          <button
            type="button"
            @click="showPilotProfile = true"
            :class="[
              'inline-flex items-center px-5 py-2 rounded-lg text-sm sm:text-base font-quicksand font-medium transition-all duration-200',
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            ]"
            aria-label="Pilot profile"
          >
            <Icon name="ri:user-star-line" size="18" class="mr-2" />
            Pilot Profile
          </button>
          <div class="relative settings-container">
            <button
              type="button"
              @click="showHeaderSettings = !showHeaderSettings"
            :class="[
              'inline-flex items-center px-5 py-2 rounded-lg text-sm sm:text-base font-quicksand font-medium transition-all duration-200',
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            ]"
              aria-label="Settings"
            >
              <Icon name="ri:settings-3-line" size="18" class="mr-2" />
              Settings
            </button>
            <div
              v-if="showHeaderSettings"
              :class="[
                'absolute right-0 top-full mt-2 w-64 rounded-xl border shadow-2xl p-4 z-10',
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-300'
              ]"
            >
              <div class="flex items-center justify-between mb-4">
                <h3 :class="['font-semibold font-quicksand text-sm', isDarkMode ? 'text-white' : 'text-gray-900']">
                  Settings
                </h3>
                <button
                  @click="showHeaderSettings = false"
                  :class="['hover:opacity-70 transition-opacity', isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700']"
                  aria-label="Close settings"
                >
                  <Icon name="ri:close-line" size="20" />
                </button>
              </div>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <label :class="['font-quicksand text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                    {{ isDarkMode ? 'Dark Mode' : 'Light Mode' }}
                  </label>
                  <button
                    @click="toggleTheme"
                    :class="[
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                      isDarkMode 
                        ? 'bg-blue-600 focus:ring-blue-500' 
                        : 'bg-gray-300 focus:ring-gray-400'
                    ]"
                    role="switch"
                    :aria-checked="isDarkMode"
                  >
                    <span
                      :class="[
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
                        isDarkMode ? 'translate-x-6' : 'translate-x-1'
                      ]"
                    />
                  </button>
                </div>
                <div class="space-y-2 pt-2">
                  <div :class="['font-quicksand text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Clock Format</div>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      @click="setClockFormat('24')"
                      :class="[
                        'px-3 py-1 rounded-md text-sm font-quicksand',
                        clockFormat === '24'
                          ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800')
                      ]"
                    >
                      24h
                    </button>
                    <button
                      type="button"
                      @click="setClockFormat('12')"
                      :class="[
                        'px-3 py-1 rounded-md text-sm font-quicksand',
                        clockFormat === '12'
                          ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800')
                      ]"
                    >
                      12h
                    </button>
                  </div>
                </div>
                <div class="space-y-2">
                  <div :class="['font-quicksand text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Clock Timezone</div>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      @click="setClockZone('UTC')"
                      :class="[
                        'px-3 py-1 rounded-md text-sm font-quicksand',
                        clockZone === 'UTC'
                          ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800')
                      ]"
                    >
                      UTC
                    </button>
                    <button
                      type="button"
                      @click="setClockZone('Local')"
                      :class="[
                        'px-3 py-1 rounded-md text-sm font-quicksand',
                        clockZone === 'Local'
                          ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800')
                      ]"
                    >
                      Local
                    </button>
                  </div>
                </div>
                <div class="space-y-3 pt-2 border-t" :class="isDarkMode ? 'border-gray-700' : 'border-gray-300'">
                  <div :class="['font-quicksand text-sm font-semibold', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                    Customize Totals Overview
                  </div>
                  <div class="space-y-2 max-h-64 overflow-y-auto">
                    <label
                      v-for="metric in availableTotalsMetrics"
                      :key="metric.key"
                      class="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        :checked="selectedTotalsMetrics.includes(metric.key)"
                        @change="toggleTotalsMetric(metric.key)"
                        :disabled="metric.key === 'totalTime'"
                        :class="[
                          'rounded border-gray-300 text-blue-600 focus:ring-blue-500',
                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white'
                        ]"
                      />
                      <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                        {{ metric.label }}
                      </span>
                    </label>
                  </div>
                </div>
                <div class="space-y-3 pt-2 border-t" :class="isDarkMode ? 'border-gray-700' : 'border-gray-300'">
                  <div :class="['font-quicksand text-sm font-semibold mb-2', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                    Export Logbook
                  </div>
                  <div class="space-y-2">
                    <button
                      type="button"
                      @click="exportToCSV"
                      :disabled="logEntries.length === 0"
                      :class="[
                        'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-quicksand transition-all',
                        logEntries.length === 0
                          ? (isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                          : (isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
                      ]"
                    >
                      <Icon name="ri:file-excel-2-line" size="16" />
                      Export as CSV
                    </button>
                    <button
                      type="button"
                      @click="exportToJSON"
                      :disabled="logEntries.length === 0"
                      :class="[
                        'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-quicksand transition-all',
                        logEntries.length === 0
                          ? (isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                          : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900')
                      ]"
                    >
                      <Icon name="ri:file-code-line" size="16" />
                      Export as JSON
                    </button>
                  </div>
                  <p :class="['text-xs mt-2', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                    {{ logEntries.length === 0 ? 'No entries to export' : `${logEntries.length} ${logEntries.length === 1 ? 'entry' : 'entries'} available` }}
                  </p>
                </div>
                <!-- Developers Link -->
                <div class="pt-2 border-t" :class="isDarkMode ? 'border-gray-700' : 'border-gray-300'">
                  <NuxtLink
                    to="/developers"
                    :class="[
                      'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-quicksand transition-all',
                      isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    ]"
                    @click="showHeaderSettings = false"
                  >
                    <Icon name="ri:code-s-slash-line" size="16" />
                    Developers
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </nav>
          </div>
        </div>
      </header>

    <main :class="['min-h-screen flex flex-col pt-40 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300', isDarkMode ? '' : '']">
      <div class="mr-auto w-full flex flex-col gap-10 lg:flex-row">
        <aside
          :class="[
            'flex-shrink-0 rounded-2xl border text-left font-quicksand transition-all duration-300 flex flex-col',
            isDarkMode 
              ? 'bg-gray-800 border-gray-700 text-gray-200' 
              : 'bg-gray-100 border-gray-300 text-gray-800 shadow-sm',
            isSidebarCollapsed 
              ? 'lg:w-16 px-3 py-4' 
              : 'lg:w-72 xl:w-80 px-5 py-6'
          ]"
        >
          <div :class="['flex items-center mb-6', isSidebarCollapsed ? 'justify-center' : 'justify-between']">
            <div v-show="!isSidebarCollapsed" class="flex-1">
              <h2 :class="['text-lg font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                Logbook Catalog
              </h2>
              <p :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Auto-populated from saved entries.
              </p>
        </div>
            <div class="flex items-center gap-2">
              <Icon 
                v-show="!isSidebarCollapsed"
                :name="'ri:database-2-line'" 
                :size="22" 
                :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" 
              />
              <button
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
          <div v-show="!isSidebarCollapsed" class="space-y-6 flex-1">
            <div
              v-for="section in catalogSections"
              :key="section.key"
              :class="[
                'rounded-xl border px-4 py-4 transition-colors duration-300',
                isDarkMode 
                  ? 'bg-gray-700/50 border-gray-600' 
                  : 'bg-gray-200 border-gray-300'
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
                      {{ section.key === 'aircraft' ? (catalogs.families?.length || catalogs[section.key].length) : catalogs[section.key].length }}
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
                <div
                    v-if="(section.key !== 'aircraft' && catalogs[section.key].length === 0) || (section.key === 'aircraft' && (!catalogs.families || catalogs.families.length === 0))"
                  :class="['text-xs italic font-quicksand', isDarkMode ? 'text-gray-500' : 'text-gray-400']"
                >
                  No records yet.
          </div>

                  <!-- Aircraft: family tree -->
                  <template v-if="section.key === 'aircraft'">
                    <ul :class="['space-y-2 text-sm max-h-56 overflow-y-auto pr-1 font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                      <li v-for="fam in catalogs.families || []" :key="'fam-' + fam" class="space-y-1">
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
                              @click="familyOpenState[fam] = !familyOpenState[fam]"
                              :class="[
                                'px-1 py-0.5 rounded',
                                isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-300'
                              ]"
                            >
                              <span class="font-medium">{{ fam }}</span>
                            </button>
                            <span :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                              ({{ catalogs.familyToItems?.[fam]?.length || 0 }})
                            </span>
                          </div>
                        </div>
                        <ul v-show="familyOpenState[fam]" class="ml-7 space-y-1">
                          <li
                            v-for="item in catalogs.familyToItems?.[fam] || []"
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
                    'space-y-2 text-sm max-h-48 overflow-y-auto pr-1 font-quicksand',
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  ]"
                >
                  <li
                    v-for="item in catalogs[section.key]"
                    :key="`${section.key}-${item}`"
                    :class="[
                      'flex items-center gap-2',
                          (section.key === 'airports') ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''
                        ]"
                        @click="section.key === 'airports' ? showAirportInfo(item) : null"
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
                    <span :class="['inline-flex h-2 w-2 rounded-full', isDarkMode ? 'bg-gray-500' : 'bg-gray-400']"></span>
                    <span class="truncate" :title="item">{{ item }}</span>
                  </li>
                </ul>
                  </template>
        </div>
            </div>
          </div>
          <!-- Conditions filter section -->
          <div v-show="!isSidebarCollapsed" class="mt-4">
            <div
              :class="[
                'rounded-xl border px-4 py-4 transition-colors duration-300',
                isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-200 border-gray-300'
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
                  v-for="opt in conditionOptions"
                  :key="'filter-cond-' + opt.value"
                    :class="[
                    'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-quicksand cursor-pointer transition-all',
                    isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' : 'border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100'
                  ]"
                >
                  <input
                    type="checkbox"
                    @click.stop
                    :checked="!!selectedFilters.conditions[opt.value]"
                    @change="(e) => { const c = (e.target as HTMLInputElement).checked; selectedFilters.conditions[opt.value] = c }"
                      :class="[
                      'h-4 w-4 rounded border transition-colors',
                      isDarkMode ? 'border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500' : 'border-gray-400 bg-white text-blue-600 focus:ring-blue-500'
                      ]"
                    />
                  <span>{{ opt.label }}</span>
                </label>
            </div>
                  </div>
                </div>
          <!-- Aircraft families filter section removed per request -->

          <div v-show="!isSidebarCollapsed" class="relative settings-container mt-auto pt-6">
            <div class="mb-3 flex items-center justify-between">
              <div :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Filters active:
                <span :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                  {{
                    Object.values(selectedFilters.aircraft).filter(Boolean).length +
                    Object.values(selectedFilters.airports).filter(Boolean).length +
                    Object.values(selectedFilters.pilots).filter(Boolean).length +
                    Object.values(selectedFilters.conditions).filter(Boolean).length
                  }}
                </span>
              </div>
                    <button
                      type="button"
                @click="clearAllFilters"
                      :class="[
                  'text-xs px-3 py-1 rounded-lg transition-colors font-quicksand',
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                ]"
              >
                Clear Filters
                    </button>
            </div>
          </div>
          <div v-show="isSidebarCollapsed" class="flex flex-col items-center gap-4">
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

        <div class="flex-1 space-y-12">
          <section class="text-center lg:text-left">

            <div class="space-y-6">
              <div :class="[
                'p-6 rounded-2xl border text-left transition-colors duration-300',
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-gray-100 border-gray-300 shadow-sm'
              ]">
                <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 :class="['text-lg font-quicksand font-semibold', isDarkMode ? 'text-white' : 'text-gray-900']">
                  Totals Overview
                </h2>
                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      :class="[
                        'px-3 py-1.5 rounded-md text-xs font-quicksand transition-colors',
                        totalsTimeMode === 'all'
                          ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800')
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
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800')
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
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800')
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
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800')
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
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        ]"
                      />
                      <span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-600']">to</span>
                      <input
                        type="date"
                        v-model="totalsCustomEnd"
                        :class="[
                          'px-2 py-1 rounded-md text-xs font-quicksand border',
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        ]"
                      />
                    </div>
                  </div>
                </div>
                <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <div
                    v-for="summaryField in summaryFields"
                    :key="summaryField.key"
                    :class="[
                      'rounded-xl border px-4 py-5 text-left transition-all duration-300 relative overflow-hidden group',
                      summaryField.key === 'totalTime'
                        ? (isDarkMode 
                            ? 'bg-gray-800/80 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                            : 'bg-white border-blue-200 shadow-md shadow-blue-100')
                        : (isDarkMode 
                            ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' 
                            : 'bg-white border-gray-200 hover:bg-gray-50 shadow-sm')
                    ]"
                  >
                    <!-- Decorative glow for Total Time -->
                    <div v-if="summaryField.key === 'totalTime'" class="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-colors duration-500"></div>
                    
                    <p :class="[
                      'text-xs uppercase tracking-wider font-semibold font-quicksand relative z-10',
                      summaryField.key === 'totalTime'
                        ? (isDarkMode ? 'text-blue-400' : 'text-blue-600')
                        : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                    ]">
                      {{ summaryField.label }}
                    </p>
                    <p :class="[
                      'font-semibold font-quicksand mt-2 relative z-10',
                      summaryField.key === 'totalTime'
                        ? 'text-3xl tracking-tight'
                        : 'text-2xl',
                      summaryField.key === 'totalTime'
                        ? (isDarkMode ? 'text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-gray-900')
                        : (isDarkMode ? 'text-gray-200' : 'text-gray-900')
                    ]">
                      {{ formatTotalValue(summaryField.key) }}
                    </p>
          </div>
        </div>
    </div>
              <div :class="[
                'p-6 rounded-2xl border text-left transition-colors duration-300',
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-gray-100 border-gray-300 shadow-sm'
              ]">
                <h2 :class="['text-lg font-quicksand font-semibold mb-4', isDarkMode ? 'text-white' : 'text-gray-900']">
                  Regulatory Snapshot
                </h2>
                <ul :class="['space-y-2 text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-600']">
                  <li>
                    • Track dates, aircraft identification, departure/destination, and total time to satisfy
                    61.51(b) recordkeeping.
                  </li>
                  <li>
                    • Capture conditions (night, instrument, simulated) and training specifics required for recent experience.
                  </li>
                  <li>
                    • AC&nbsp;120-78B reminders: maintain data integrity, protect revision history, and record signer identity (signatures coming soon).
                  </li>
                </ul>
              </div>
            </div>
          </section>

            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div class="max-w-xl text-left">
                <h2 :class="['text-2xl font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                  Stored Entries
            </h2>
            <p :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
                  Entries are stored locally in this browser to align with AC&nbsp;120-78B data integrity expectations. Export and secured archival features will follow the signing workflow.
            </p>
      </div>
              <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div class="relative">
              <input 
                    v-model="searchTerm"
                    type="search"
                    placeholder="Search entries"
                    :class="[
                      'w-full sm:w-60 rounded-lg border px-5 py-2 focus:outline-none focus:ring-2 font-quicksand transition-colors duration-300',
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:ring-blue-500' 
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-blue-500'
                    ]"
              />
        <span :class="['absolute inset-y-0 right-3 flex items-center', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            <Icon name="ri:search-line" size="18" />
          </span>        
          </div>
                <div>
              <button
            type="button"
            @click="toggleEntryForm"
                    :class="[
              'inline-flex items-center px-5 py-2 rounded-lg text-sm sm:text-base font-quicksand font-medium transition-all duration-200',
                      isDarkMode 
                ? (isEntryFormOpen ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white')
                : (isEntryFormOpen ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900')
            ]"
          >
            {{ isEntryFormOpen ? 'Hide Entry' : 'Add Entry' }}
          </button>
            </div>
              </div>
        </div>

            <div :class="['mt-4 text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Sorted by most recent entry date.
          </div>

            <div
              v-if="filteredEntries.length === 0"
                      :class="[
                'mt-6 rounded-2xl border border-dashed p-10 text-center font-quicksand transition-colors duration-300',
                      isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-gray-400' 
                  : 'bg-gray-100 border-gray-300 text-gray-500'
                    ]"
            >
              No entries recorded yet. Add your first flight above to begin building your digital logbook.
          </div>

            <div
              v-else
                      :class="[
                'mt-6 overflow-hidden rounded-2xl border transition-colors duration-300',
                        isDarkMode 
    ? 'border-gray-700' 
    : 'border-gray-300 shadow-sm'
              ]"
            >
              <table :class="[
                'min-w-full divide-y text-left font-quicksand',
                isDarkMode 
                  ? 'divide-gray-700 bg-gray-800' 
                  : 'divide-gray-200 bg-white'
              ]">
                <thead :class="[
                  'uppercase text-xs font-semibold tracking-wider font-quicksand sticky top-0 z-20 shadow-sm',
                  isDarkMode 
                    ? 'bg-gray-800 text-gray-400 border-b border-gray-700' 
                    : 'bg-gray-50 text-gray-500 border-b border-gray-200'
                ]">
                  <tr>
                    <th class="px-4 py-3 font-medium">Date</th>
                    <th class="px-4 py-3 font-medium">Aircraft</th>
                    <th class="px-4 py-3 font-medium">Identification</th>
                    <th class="px-4 py-3 font-medium">From → To</th>
                    <th class="px-4 py-3 font-medium hidden xl:table-cell">Conditions</th>
                    <th class="px-4 py-3 font-medium hidden lg:table-cell">Remarks</th>
                    <th class="px-4 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody :class="[
                  'divide-y text-sm font-quicksand',
                  isDarkMode 
                    ? 'divide-gray-700 bg-gray-900 text-gray-300' 
                    : 'divide-gray-200 bg-white text-gray-600'
                ]">
                  <!-- Add Entry Row (Inline Style) -->
                  <tr v-if="isEntryFormOpen">

                    <td :colspan="7" class="px-0 py-0">
                      <div
                      :class="[
                          'border-b shadow-inner transition-all duration-300',
                      isDarkMode 
                            ? 'bg-gray-900/80 border-gray-700' 
                            : 'bg-blue-50/50 border-gray-200'
                        ]"
                      >
                        <div class="p-6">
                            <form class="grid gap-6" @submit.prevent="submitEntry">
                              <div class="flex items-center justify-between mb-2">
                                <h3 :class="['text-sm font-bold uppercase tracking-wider', isDarkMode ? 'text-blue-400' : 'text-blue-600']">New Log Entry</h3>
                                <button
                                  type="button"
                                  @click="isCommercialMode = !isCommercialMode"
                                  :class="['text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border transition-colors', 
                                    isCommercialMode 
                                      ? (isDarkMode ? 'bg-blue-900/30 text-blue-300 border-blue-700' : 'bg-blue-100 text-blue-700 border-blue-200')
                                      : (isDarkMode ? 'text-gray-500 border-gray-700' : 'text-gray-400 border-gray-200')
                                  ]"
                                >
                                  {{ isCommercialMode ? 'OOOI Active' : '+ OOOI' }}
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
                                <div class="grid grid-cols-4 gap-2 p-2 rounded border border-dashed border-gray-600/50">
                                 <div v-for="field in oooiFields" :key="field">
                                    <label :class="['block text-[10px] uppercase font-bold mb-1 text-center', isDarkMode ? 'text-blue-400' : 'text-blue-600']">{{ field }}</label>
                                    <input 
                                      v-if="newEntry.oooi" 
                                      v-model="newEntry.oooi[field]" 
                                      type="text" 
                                      maxlength="4" 
                                      placeholder="1430" 
                                      @input="(e) => { if (newEntry.oooi && field !== 'isZulu') (newEntry.oooi as unknown as Record<string, string | null>)[field] = formatOOOIInput((e.target as HTMLInputElement).value) }"
                                      :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" 
                                    />
                                  </div>
          </div>
            </div>
            
                              <div class="grid gap-4 md:grid-cols-4">
                  <div>
                                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Date</label>
                                  <input v-model="newEntry.date" type="date" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" required />
          </div>
                  <div>
                                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Role</label>
                                  <select v-model="newEntry.role" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']">
                                    <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
                                  </select>
          </div>
                  <div>
                                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Aircraft</label>
                                  <input v-model="newEntry.aircraftMakeModel" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" required />
      </div>
                  <div class="relative">
                                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Ident</label>
                                  <input 
                                    v-model="newEntry.registration" 
                                    type="text" 
                                    :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" 
                                    required
                                    autocomplete="off"
                                    @focus="showIdentDropdown = true"
                                    @blur="handleIdentBlur"
                                  />
                                  <!-- Aircraft Ident Dropdown -->
                                  <div 
                                    v-if="showIdentDropdown && filteredAircraftForNewEntry.length > 0"
                                    :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300']"
                                  >
                                    <button
                                      v-for="aircraft in filteredAircraftForNewEntry"
                                      :key="aircraft.registration"
                                      type="button"
                                      :class="['w-full px-3 py-2 text-left text-sm font-mono uppercase hover:bg-opacity-80 transition-colors', isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100']"
                                      @mousedown.prevent="selectAircraftForNewEntry(aircraft)"
                                    >
                                      {{ aircraft.registration }}
                                    </button>
                                  </div>
          </div>
            </div>

                              <div class="grid gap-4 md:grid-cols-4">
                  <div class="relative">
                                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">From</label>
                                  <input 
                                    v-model="newEntry.departure" 
                                    type="text" 
                                    :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" 
                                    required
                                    autocomplete="off"
                                    @focus="showFromDropdown = true"
                                    @blur="handleFromBlur"
                                  />
                                  <!-- Airport FROM Dropdown -->
                                  <div 
                                    v-if="showFromDropdown && filteredAirportsForFrom.length > 0"
                                    :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300']"
                                  >
                                    <button
                                      v-for="airport in filteredAirportsForFrom"
                                      :key="airport"
                                      type="button"
                                      :class="['w-full px-3 py-2 text-left text-sm font-mono uppercase hover:bg-opacity-80 transition-colors', isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100']"
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
                                    :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" 
                                    required
                                    autocomplete="off"
                                    @focus="showToDropdown = true"
                                    @blur="handleToBlur"
                                  />
                                  <!-- Airport TO Dropdown -->
                                  <div 
                                    v-if="showToDropdown && filteredAirportsForTo.length > 0"
                                    :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300']"
                                  >
                                    <button
                                      v-for="airport in filteredAirportsForTo"
                                      :key="airport"
                                      type="button"
                                      :class="['w-full px-3 py-2 text-left text-sm font-mono uppercase hover:bg-opacity-80 transition-colors', isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100']"
                                      @mousedown.prevent="selectAirportForTo(airport)"
                                    >
                                      {{ airport }}
                                    </button>
                                  </div>
            </div>
                  <div>
                                  <div class="flex gap-2">
                                    <div class="flex-1">
                                      <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Category/Class</label>
                                      <input v-model="newEntry.aircraftCategoryClass" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" placeholder="e.g. ASEL" />
                                    </div>
                                    <div class="flex-1">
                                      <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Time</label>
                                      <input v-model.number="newEntry.categoryClassTime" type="number" step="0.1" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" placeholder="0.0" />
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Route</label>
                                  <input v-model="newEntry.route" type="text" :class="['w-full rounded border px-2 py-1 text-sm font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" />
                                </div>
                              </div>
                              
                              <!-- Flight Times -->
                              <div>
                                <label :class="['block text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Time</label>
                                <div class="flex gap-2 w-full">
                                  <div v-for="field in flightTimeFields" :key="field.key" class="flex-1">
                                    <div :class="['text-[9px] uppercase font-bold mb-1 text-center whitespace-nowrap', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                                      {{ field.key === 'total' ? 'Total Time' : field.key === 'pic' ? 'PIC' : field.key === 'sic' ? 'SIC' : field.key === 'dual' ? 'Dual R' : field.key === 'solo' ? 'Solo' : field.key === 'night' ? 'Night' : field.key === 'actualInstrument' ? 'Actual' : field.key === 'dualGiven' ? 'Dual G' : field.key === 'crossCountry' ? 'XC' : field.key === 'simulator' ? 'Hood' : field.label }}
                                    </div>
                    <input
                                      v-model.number="newEntry.flightTime[field.key]" 
                                      type="number" 
                                      step="0.1"
                                      :placeholder="'0.0'"
                                      :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" 
                    />
          </div>
        </div>
                              </div>

                               <!-- Performance -->
                               <div class="grid gap-4 grid-cols-4">
                                 <div>
                                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Day Ldg</label>
                                    <input v-model.number="newEntry.performance.dayLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" />
                                 </div>
                                 <div>
                                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Night Ldg</label>
                                    <input v-model.number="newEntry.performance.nightLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" />
                                 </div>
                                 <div>
                                    <div class="flex gap-2">
                                      <div class="flex-1">
                                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">App #</label>
                                        <input v-model.number="newEntry.performance.approachCount" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" placeholder="0" />
                                      </div>
                                      <div class="flex-1">
                                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">App Type</label>
                                        <input v-model="newEntry.performance.approachType" type="text" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" placeholder="ILS" />
                                      </div>
                                    </div>
                                 </div>
                                 <div>
                                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Holds</label>
                                    <input v-model.number="newEntry.performance.holdingProcedures" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" />
                                 </div>
                               </div>

              <div class="flex flex-wrap gap-3">
                <label
                  v-for="condition in conditionOptions"
                  :key="condition.value"
                  :class="[
                    'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-quicksand cursor-pointer transition-all',
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' 
                      : 'border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100'
                  ]"
                >
                  <input
                    v-model="newEntry.flightConditions"
                    :value="condition.value"
                    type="checkbox"
                    :class="[
                      'h-4 w-4 rounded border transition-colors',
                      isDarkMode 
                        ? 'border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500' 
                        : 'border-gray-400 bg-white text-blue-600 focus:ring-blue-500'
                    ]"
                  />
                  <span>{{ condition.label }}</span>
                </label>
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
                                      ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' 
                                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                ]"
              ></textarea>
    </div>

                              <!-- Pilot Section -->
                              <div>
                                <label :class="['block text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Pilot</label>
                                <div class="grid gap-4 md:grid-cols-3">
                                  <div>
                                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Job</label>
                                    <select v-model="newEntry.trainingInstructor" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']">
                                      <option value="">Select...</option>
                                      <option value="Student">Student</option>
                                      <option value="Instructor">Instructor</option>
                                      <option value="Safety Pilot">Safety Pilot</option>
                                      <option value="Captain">Captain</option>
                                      <option value="First Officer">First Officer</option>
                                    </select>
                                  </div>
                                  <div class="relative">
                                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Name</label>
                                    <input 
                                      v-model="newEntry.trainingElements" 
                                      type="text" 
                                      :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" 
                                      placeholder="Pilot Name"
                                      autocomplete="off"
                                      @focus="showPilotNameDropdown = true"
                                      @blur="handlePilotNameBlur"
                                    />
                                    <!-- Pilot Name Dropdown -->
                                    <div 
                                      v-if="showPilotNameDropdown && filteredPilots.length > 0"
                                      :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300']"
                                    >
                                      <button
                                        v-for="pilot in filteredPilots"
                                        :key="pilot"
                                        type="button"
                                        :class="['w-full px-3 py-2 text-left text-sm hover:bg-opacity-80 transition-colors', isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100']"
                                        @mousedown.prevent="selectPilotName(pilot)"
                                      >
                                        {{ pilot }}
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Number</label>
                                    <input v-model="newEntry.instructorCertificate" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" placeholder="Certificate #" />
                                  </div>
                                </div>
                              </div>
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div v-if="validationError" :class="['font-quicksand text-sm', isDarkMode ? 'text-red-400' : 'text-red-600']">
                {{ validationError }}
              </div>
              <div v-if="successMessage" :class="['font-quicksand text-sm', isDarkMode ? 'text-emerald-400' : 'text-emerald-600']">
                {{ successMessage }}
              </div>
              <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
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
                      : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                  ]"
                  @click="cancelEditing"
                >
                  Cancel
                </button>
            <button 
              type="submit"
                  :class="[
                    'inline-flex items-center justify-center rounded-lg px-6 py-2 font-semibold font-quicksand transition-all',
                    isDarkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  ]"
                >
                  {{ editingEntryId ? 'Update Entry' : 'Save Entry' }}
            </button>
          </div>
          </div>
        </form>
        </div>
      </div>
                    </td>
                  </tr>
                  <template v-for="entry in filteredEntries" :key="entry.id">
                  <tr
                    :class="[
                      'transition-all duration-200 border-l-4',
                      isDarkMode 
                        ? 'hover:bg-gray-800 border-transparent hover:border-blue-500' 
                        : 'hover:bg-gray-50 border-transparent hover:border-blue-500'
                    ]"
                      class="cursor-pointer"
                      @click="beginInlineEditing(entry)"
                  >
                    <td class="px-4 py-3 align-top">
                      <div :class="['font-semibold', isDarkMode ? 'text-white' : 'text-gray-900']">
                        {{ formatDisplayDate(entry.date) }}
            </div>
                      <div :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                        {{ entry.role }}
            </div>
                    </td>
                    <td class="px-4 py-3 align-top">
                      <div :class="[isDarkMode ? 'text-gray-200' : 'text-gray-900']">{{ entry.aircraftMakeModel }}</div>
                      <div :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                        {{ entry.aircraftCategoryClass }}
          </div>
                    </td>
                    <td :class="['px-4 py-3 align-top uppercase font-mono text-xs tracking-wide', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                      {{ entry.registration }}
                    </td>
                    <td class="px-4 py-3 align-top">
                      <div :class="['font-semibold whitespace-nowrap', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                        {{ entry.departure }} → {{ entry.destination }}
        </div>
                      <div v-if="entry.route" :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                        {{ entry.route }}
                      </div>
                    </td>
                    <td class="px-4 py-3 align-top hidden xl:table-cell">
                      <div class="flex flex-wrap gap-1">
                        <span
                          v-for="condition in (entry.flightConditions || []).map(conditionLabel).filter(Boolean)"
                          :key="`${entry.id}-${condition}`"
                          :class="[
                            'rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold border',
                            isDarkMode 
                              ? 'bg-gray-800 border-gray-600 text-gray-300' 
                              : 'bg-white border-gray-200 text-gray-600'
                          ]"
                        >
                          {{ condition }}
          </span>
                        <span :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400']" v-if="!entry.flightConditions || entry.flightConditions.length === 0">
                          —
          </span>
                      </div>
                    </td>
                    <td :class="['px-4 py-3 align-top hidden lg:table-cell text-sm italic', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                      {{ entry.remarks || '—' }}
                    </td>
                    <td :class="['px-4 py-3 align-top text-right font-bold font-mono', isDarkMode ? 'text-blue-400' : 'text-blue-600']">
                      {{ formatNumber(entry.flightTime.total) }}
                    </td>
                    </tr>
                    <tr v-if="expandedEntryId === entry.id">
                      <td :colspan="7" class="px-0 py-0">
                        <div
                        :class="[
                            'border-b border-t shadow-inner transition-all duration-300',
                          isDarkMode 
                              ? 'bg-gray-900/50 border-gray-700' 
                              : 'bg-gray-50 border-gray-200'
                          ]"
                        >
                          <div class="p-6">
                            <div v-if="inlineEditEntry" class="grid gap-6">
                              
                              <!-- Inline Edit Form (Simplified Version) -->
                              <div class="flex justify-end mb-2">
                      <button
                        type="button"
                                  @click="isInlineCommercialMode = !isInlineCommercialMode"
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
                                <div class="grid grid-cols-4 gap-2 p-2 rounded border border-dashed border-gray-600/50">
                                 <div v-for="field in oooiFields" :key="field">
                                    <label :class="['block text-[10px] uppercase font-bold mb-1 text-center', isDarkMode ? 'text-blue-400' : 'text-blue-600']">{{ field }}</label>
                                    <input 
                                      v-if="inlineEditEntry?.oooi" 
                                      v-model="inlineEditEntry.oooi[field]" 
                                      type="text" 
                                      maxlength="4" 
                                      placeholder="1430"
                                      @input="(e) => { if (inlineEditEntry?.oooi && field !== 'isZulu') (inlineEditEntry.oooi as unknown as Record<string, string | null>)[field] = formatOOOIInput((e.target as HTMLInputElement).value) }"
                                      :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" 
                                    />
                                  </div>
                                 </div>
                              </div>

                              <div class="grid gap-4 md:grid-cols-4">
                                <div>
                                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Date</label>
                                  <input v-model="inlineEditEntry.date" type="date" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" />
                                </div>
                                <div>
                                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Role</label>
                                  <select v-model="inlineEditEntry.role" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']">
                                    <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
                                  </select>
                                </div>
                                <div>
                                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Aircraft</label>
                                  <input v-model="inlineEditEntry.aircraftMakeModel" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" />
                                </div>
                                <div class="relative">
                                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Ident</label>
                                  <input 
                                    v-model="inlineEditEntry.registration" 
                                    type="text" 
                                    :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']"
                                    autocomplete="off"
                                    @focus="showInlineIdentDropdown = true"
                                    @blur="handleInlineIdentBlur"
                                  />
                                  <!-- Aircraft Ident Dropdown for Inline Edit -->
                                  <div 
                                    v-if="showInlineIdentDropdown && filteredAircraftForInlineEdit.length > 0"
                                    :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300']"
                                  >
                                    <button
                                      v-for="aircraft in filteredAircraftForInlineEdit"
                                      :key="aircraft.registration"
                                      type="button"
                                      :class="['w-full px-3 py-2 text-left text-sm font-mono uppercase hover:bg-opacity-80 transition-colors', isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100']"
                                      @mousedown.prevent="selectAircraftForInlineEdit(aircraft)"
                                    >
                                      {{ aircraft.registration }}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div class="grid gap-4 md:grid-cols-4">
                                <div class="relative">
                                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">From</label>
                                  <input 
                                    v-model="inlineEditEntry.departure" 
                                    type="text" 
                                    :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']"
                                    autocomplete="off"
                                    @focus="showInlineFromDropdown = true"
                                    @blur="handleInlineFromBlur"
                                  />
                                  <!-- Airport FROM Dropdown for Inline Edit -->
                                  <div 
                                    v-if="showInlineFromDropdown && filteredAirportsForInlineFrom.length > 0"
                                    :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300']"
                                  >
                                    <button
                                      v-for="airport in filteredAirportsForInlineFrom"
                                      :key="airport"
                                      type="button"
                                      :class="['w-full px-3 py-2 text-left text-sm font-mono uppercase hover:bg-opacity-80 transition-colors', isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100']"
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
                                    :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']"
                                    autocomplete="off"
                                    @focus="showInlineToDropdown = true"
                                    @blur="handleInlineToBlur"
                                  />
                                  <!-- Airport TO Dropdown for Inline Edit -->
                                  <div 
                                    v-if="showInlineToDropdown && filteredAirportsForInlineTo.length > 0"
                                    :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300']"
                                  >
                                    <button
                                      v-for="airport in filteredAirportsForInlineTo"
                                      :key="airport"
                                      type="button"
                                      :class="['w-full px-3 py-2 text-left text-sm font-mono uppercase hover:bg-opacity-80 transition-colors', isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100']"
                                      @mousedown.prevent="selectAirportForInlineTo(airport)"
                                    >
                                      {{ airport }}
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <div class="flex gap-2">
                                    <div class="flex-1">
                                      <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Category/Class</label>
                                      <input v-model="inlineEditEntry.aircraftCategoryClass" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" placeholder="e.g. ASEL" />
                                    </div>
                                    <div class="flex-1">
                                      <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Time</label>
                                      <input v-model.number="inlineEditEntry.categoryClassTime" type="number" step="0.1" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" placeholder="0.0" />
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Route</label>
                                  <input v-model="inlineEditEntry.route" type="text" :class="['w-full rounded border px-2 py-1 text-sm font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" />
                                </div>
                              </div>
                              
                              <!-- Flight Times Inline -->
                               <div>
                                <label :class="['block text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Time</label>
                                <div class="flex gap-2 w-full">
                                  <div v-for="(label, key) in {total: 'Total Time', pic: 'PIC', sic: 'SIC', dual: 'Dual R', solo: 'Solo', night: 'Night', actualInstrument: 'Actual', dualGiven: 'Dual G', crossCountry: 'XC', simulator: 'Hood'}" :key="key" class="flex-1">
                                    <div :class="['text-[9px] uppercase font-bold mb-1 text-center whitespace-nowrap', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                                      {{ label }}
                                    </div>
                                      <input 
                                        v-model.number="inlineEditEntry.flightTime[key]" 
                                        type="number" 
                                        step="0.1"
                                      :placeholder="'0.0'"
                                      :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" 
                                      />
                                    </div>
                                  </div>
                               </div>

                               <!-- Performance Inline -->
                               <div class="grid gap-4 grid-cols-4">
                                 <div>
                                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Day Ldg</label>
                                    <input v-model.number="inlineEditEntry.performance.dayLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" />
                                 </div>
                                 <div>
                                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Night Ldg</label>
                                    <input v-model.number="inlineEditEntry.performance.nightLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" />
                                 </div>
                                 <div>
                                    <div class="flex gap-2">
                                      <div class="flex-1">
                                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">App #</label>
                                        <input v-model.number="inlineEditEntry.performance.approachCount" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" placeholder="0" />
                                      </div>
                                      <div class="flex-1">
                                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">App Type</label>
                                        <input v-model="inlineEditEntry.performance.approachType" type="text" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" placeholder="ILS" />
                                      </div>
                                    </div>
                                 </div>
                                 <div>
                                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Holds</label>
                                    <input v-model.number="inlineEditEntry.performance.holdingProcedures" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" />
                                 </div>
                               </div>

                              <div class="flex flex-wrap gap-3">
                                <label
                                  v-for="condition in conditionOptions"
                                  :key="condition.value"
                                  :class="[
                                    'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-quicksand cursor-pointer transition-all',
                                    isDarkMode 
                                      ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' 
                                      : 'border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100'
                                  ]"
                                >
                                  <input
                                    v-model="inlineEditEntry.flightConditions"
                                    :value="condition.value"
                                    type="checkbox"
                                    :class="[
                                      'h-4 w-4 rounded border transition-colors',
                                      isDarkMode 
                                        ? 'border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500' 
                                        : 'border-gray-400 bg-white text-blue-600 focus:ring-blue-500'
                                    ]"
                                  />
                                  <span>{{ condition.label }}</span>
                                </label>
                              </div>

                              <div>
                                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Remarks / Applicable 61.51 Notes</label>
                                <textarea
                                  v-model="inlineEditEntry.remarks"
                                  rows="3"
                                  placeholder="Document training received, endorsements pending, or other relevant notes."
                                  :class="[
                                    'w-full rounded border px-2 py-2 text-sm font-quicksand transition-colors duration-300',
                                    isDarkMode 
                                      ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' 
                                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                                  ]"
                                ></textarea>
                              </div>

                              <!-- Pilot Section -->
                              <div>
                                <label :class="['block text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Pilot</label>
                                <div class="grid gap-4 md:grid-cols-3">
                                  <div>
                                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Job</label>
                                    <select v-model="inlineEditEntry.trainingInstructor" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']">
                                      <option value="">Select...</option>
                                      <option value="Student">Student</option>
                                      <option value="Instructor">Instructor</option>
                                      <option value="Safety Pilot">Safety Pilot</option>
                                      <option value="Captain">Captain</option>
                                      <option value="First Officer">First Officer</option>
                                    </select>
                                  </div>
                                  <div class="relative">
                                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Name</label>
                                    <input 
                                      v-model="inlineEditEntry.trainingElements" 
                                      type="text" 
                                      :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" 
                                      placeholder="Pilot Name"
                                      autocomplete="off"
                                      @focus="showInlinePilotNameDropdown = true"
                                      @blur="handleInlinePilotNameBlur"
                                    />
                                    <!-- Pilot Name Dropdown for Inline Edit -->
                                    <div 
                                      v-if="showInlinePilotNameDropdown && filteredPilotsForInline.length > 0"
                                      :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300']"
                                    >
                                      <button
                                        v-for="pilot in filteredPilotsForInline"
                                        :key="pilot"
                                        type="button"
                                        :class="['w-full px-3 py-2 text-left text-sm hover:bg-opacity-80 transition-colors', isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100']"
                                        @mousedown.prevent="selectPilotNameForInline(pilot)"
                                      >
                                        {{ pilot }}
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Number</label>
                                    <input v-model="inlineEditEntry.instructorCertificate" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" placeholder="Certificate #" />
                                  </div>
                                 </div>
                               </div>

                              <div class="flex items-center justify-between mt-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
                                  @click.stop="confirmAndDeleteEntry(entry.id)"
                                  :class="['text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1']"
                                >
                                  Delete Entry
                                </button>
                                <div class="flex items-center gap-3">
                                  <button
                                    type="button"
                                    @click.stop="cancelInlineEdit"
                                    :class="['px-4 py-2 rounded-lg text-sm font-medium', isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100']"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    @click.stop="saveInlineEdit"
                                    :class="['px-4 py-2 rounded-lg text-sm font-bold shadow-lg', isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white']"
                                  >
                                    Confirm Changes
                                  </button>
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                    </td>
                  </tr>
                  </template>
                </tbody>
              </table>
        </div>
      </div>
    </div>
    </main>

    <!-- Pilot Profile Overlay -->
    <div
      v-if="showPilotProfile"
      class="fixed inset-0 z-40 flex items-start justify-center px-4 py-8"
    >
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showPilotProfile = false"></div>
      <div
        :class="[
          'relative w-full max-w-5xl overflow-y-auto rounded-3xl border shadow-2xl transition-colors duration-300 max-h-[90vh] p-6 sm:p-8 space-y-6',
          isDarkMode 
            ? 'bg-gray-900 border-gray-700 text-gray-100' 
            : 'bg-white border-gray-200 text-gray-900'
        ]"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-start gap-4">
            <div
              :class="[
                'h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-semibold',
                isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
              ]"
            >
              {{ pilotInitials }}
            </div>
            <div>
              <p :class="['text-xs uppercase tracking-[0.2em] font-semibold', isDarkMode ? 'text-blue-300' : 'text-blue-600']">
                Pilot Profile
              </p>
              <h2 class="text-2xl font-semibold font-quicksand mt-1">
                {{ pilotProfile.name || 'Add your name' }}
              </h2>
              <p :class="['text-sm mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                {{ pilotProfile.callsign ? `Callsign ${pilotProfile.callsign}` : 'Add a callsign to personalize your profile' }}
              </p>
              <p v-if="pilotProfile.homeBase" :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Home Base · {{ pilotProfile.homeBase.toUpperCase() }}
              </p>
            </div>
          </div>
          <button
            @click="showPilotProfile = false"
            :class="[
              'self-start rounded-full p-2 transition-colors',
              isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            ]"
            aria-label="Close pilot profile"
          >
            <Icon name="ri:close-line" size="22" />
          </button>
        </div>

        <div class="grid gap-6 lg:grid-cols-3">
          <div
            :class="[
              'space-y-4 rounded-2xl border p-4 sm:p-6',
              isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-gray-50 border-gray-200'
            ]"
          >
            <div class="space-y-2">
              <label :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Full Name
              </label>
              <input
                v-model="pilotProfile.name"
                type="text"
                placeholder="e.g. Jordan Reynolds"
                :class="[
                  'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200',
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                ]"
              />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-2">
                <label :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Callsign
                </label>
                <input
                  v-model="pilotProfile.callsign"
                  type="text"
                  placeholder="e.g. MAVERICK"
                  :class="[
                    'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200',
                    isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                  ]"
                />
              </div>
              <div class="space-y-2">
                <label :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Home Base
                </label>
                <input
                  v-model="pilotProfile.homeBase"
                  type="text"
                  placeholder="e.g. KAPA"
                  :class="[
                    'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200',
                    isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                  ]"
                />
              </div>
            </div>
            <div class="space-y-2">
              <label :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Certificates & Ratings
              </label>
              <textarea
                v-model="pilotProfile.certificates"
                rows="3"
                placeholder="Commercial ASEL · Instrument Airplane · Advanced Ground Instructor"
                :class="[
                  'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200',
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                ]"
              ></textarea>
            </div>
            <div class="space-y-2">
              <label :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Current Focus
              </label>
              <textarea
                v-model="pilotProfile.flightGoals"
                rows="3"
                placeholder="Instrument currency, mountain flying checkout, CFI prep..."
                :class="[
                  'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200',
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                ]"
              ></textarea>
            </div>
            <div class="space-y-2">
              <label :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Notes
              </label>
              <textarea
                v-model="pilotProfile.notes"
                rows="3"
                placeholder="Preferred instructors, aircraft quirks, reminders..."
                :class="[
                  'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200',
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                ]"
              ></textarea>
            </div>
          </div>

          <div class="lg:col-span-2 space-y-6">
            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="card in pilotStatCards"
                :key="card.key"
                :class="[
                  'rounded-2xl border p-4',
                  isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-gray-50 border-gray-200'
                ]"
              >
                <p :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  {{ card.label }}
                </p>
                <p class="text-3xl font-semibold mt-1">
                  {{ card.value }}
                </p>
                <p :class="['text-xs mt-1', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                  {{ card.helper }}
                </p>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div
                :class="[
                  'rounded-2xl border p-4',
                  isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-white border-gray-200'
                ]"
              >
                <p :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                  Favorite Aircraft
                </p>
                <p class="text-lg font-semibold mt-1">
                  {{ pilotProfileStats.favoriteAircraft || '—' }}
                </p>
                <p :class="['text-xs mt-1', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                  Based on total flights logged
                </p>
              </div>
              <div
                :class="[
                  'rounded-2xl border p-4',
                  isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-white border-gray-200'
                ]"
              >
                <p :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                  Favorite Route
                </p>
                <p class="text-lg font-semibold mt-1">
                  {{ pilotProfileStats.favoriteRoute || '—' }}
                </p>
                <p :class="['text-xs mt-1', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                  Most frequently flown pairing
                </p>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              <div
                :class="[
                  'rounded-2xl border p-4',
                  isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-white border-gray-200'
                ]"
              >
                <p :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                  Avg Flight Duration
                </p>
                <p class="text-2xl font-semibold mt-1">
                  {{ pilotProfileStats.avgDuration.toFixed(1) }} hrs
                </p>
              </div>
              <div
                :class="[
                  'rounded-2xl border p-4',
                  isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-white border-gray-200'
                ]"
              >
                <p :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                  Day Landings
                </p>
                <p class="text-2xl font-semibold mt-1">
                  {{ pilotProfileStats.dayLandings.toFixed(0) }}
                </p>
              </div>
              <div
                :class="[
                  'rounded-2xl border p-4',
                  isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-white border-gray-200'
                ]"
              >
                <p :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                  Night Landings
                </p>
                <p class="text-2xl font-semibold mt-1">
                  {{ pilotProfileStats.nightLandings.toFixed(0) }}
                </p>
              </div>
            </div>

            <div
              :class="[
                'rounded-2xl border p-4',
                isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-white border-gray-200'
              ]"
            >
              <p :class="['text-xs font-semibold uppercase tracking-wide mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                Conditions Flown
              </p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="chip in pilotConditionChips"
                  :key="chip.label"
                  :class="[
                    'px-3 py-1 rounded-full text-sm font-medium',
                    isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'
                  ]"
                >
                  {{ chip.label }} · {{ chip.count }}
                </span>
                <span
                  v-if="pilotConditionChips.length === 0"
                  :class="[
                    'px-3 py-1 rounded-full text-sm font-medium',
                    isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                  ]"
                >
                  No condition data yet
                </span>
              </div>
            </div>

            <div
              :class="[
                'rounded-2xl border p-4 space-y-4',
                isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-white border-gray-200'
              ]"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                    Recent Flights
                  </p>
                  <p :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                    Latest three entries across your logbook
                  </p>
                </div>
                <div v-if="pilotProfileStats.longestLeg" :class="['text-right text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                  <p class="font-semibold uppercase tracking-wide">Longest Leg</p>
                  <p>{{ pilotProfileStats.longestLeg.route }}</p>
                  <p>{{ pilotProfileStats.longestLeg.duration.toFixed(1) }} hrs · {{ formatDisplayDate(pilotProfileStats.longestLeg.date) }}</p>
                </div>
              </div>
              <div class="space-y-3">
                <div
                  v-for="flight in pilotRecentFlights"
                  :key="flight.id"
                  :class="[
                    'rounded-2xl border px-4 py-3 flex items-center justify-between gap-4',
                    isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50'
                  ]"
                >
                  <div>
                    <p class="text-sm font-semibold">
                      {{ formatDisplayDate(flight.date) }}
                    </p>
                    <p :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
                      {{ buildRouteLabel(flight) }}
                    </p>
                    <p :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                      {{ flight.trainingInstructor || '—' }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold">
                      {{ flight.aircraftMakeModel || '—' }}
                    </p>
                    <p :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
                      {{ flight.registration || '—' }}
                    </p>
                    <p :class="['text-xs mt-1', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                      {{ coerceNumber(flight.flightTime.total).toFixed(1) }} hrs
                    </p>
                  </div>
                </div>
                <div
                  v-if="pilotRecentFlights.length === 0"
                  :class="[
                    'rounded-2xl border px-4 py-6 text-center',
                    isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50'
                  ]"
                >
                  <p :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Log a flight to start building your story.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Aircraft Information Modal -->
    <div
      v-if="showAircraftModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="closeAircraftModal"
    >
      <div
        :class="[
          'relative w-full max-w-lg rounded-2xl border shadow-2xl transition-colors duration-300',
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-gray-100 border-gray-300'
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
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
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

            <div v-if="currentAircraftInfo.year || currentAircraftInfo.engineType || currentAircraftInfo.category" class="grid grid-cols-2 gap-4">
              <div v-if="currentAircraftInfo.year">
                <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Year
                </div>
                <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                  {{ currentAircraftInfo.year }}
                </div>
              </div>
              <div v-if="currentAircraftInfo.engineType">
                <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Engine Type
                </div>
                <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                  {{ currentAircraftInfo.engineType }}
                </div>
              </div>
              <div v-if="currentAircraftInfo.category">
                <div :class="['text-sm font-semibold font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  Category
                </div>
                <div :class="['text-base font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                  {{ currentAircraftInfo.category }}
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
      </div>

            <div v-if="currentAircraftInfo.source" class="pt-4 border-t" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
              <div :class="['text-xs font-quicksand italic', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                Source: {{ currentAircraftInfo.source }}
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

    <!-- Airport Information Modal -->
    <div
      v-if="showAirportModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="closeAirportModal"
    >
      <div
        :class="[
          'relative w-full max-w-lg rounded-2xl border shadow-2xl transition-colors duration-300',
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-gray-100 border-gray-300'
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
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
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
                  {{ currentAirportInfo.latitude.toFixed(4) }}, {{ currentAirportInfo.longitude.toFixed(4) }}
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  LOGBOOK_STORAGE_KEY,
  createEmptyFlightTime,
  createEmptyPerformance,
  createEmptyOOOI
} from '~/utils/logbookTypes'
import type {
  CatalogKey,
  EditableLogEntry,
  FlightTimeBreakdown,
  FlightTimeKey,
  LogEntry,
  PerformanceKey,
  PerformanceMetrics
} from '~/utils/logbookTypes'
import { useAircraftLookup } from '~/composables/useAircraftLookup'
import type { AircraftInfo } from '~/composables/useAircraftLookup'
import { useAirportLookup } from '~/composables/useAirportLookup'
import type { AirportInfo } from '~/composables/useAirportLookup'
import { calculateNightTime } from '~/utils/nightTimeCalculator'

const roleOptions = ['PIC', 'SIC', 'Dual Received', 'Solo', 'Safety Pilot'] as const
const oooiFields: (keyof OOOITimes)[] = ['out', 'off', 'on', 'in']

const conditionOptions = [
  { value: 'nightVfr', label: 'Night' },
  { value: 'ifr', label: 'IFR' },
  { value: 'simInstrument', label: 'Simulated Instrument' },
  { value: 'actualInstrument', label: 'Actual Instrument' },
  { value: 'crossCountry', label: 'Cross-Country' }
] as const

const flightTimeFields: readonly { key: FlightTimeKey; label: string }[] = [
  { key: 'total', label: 'Total Time *' },
  { key: 'pic', label: 'Pilot in Command' },
  { key: 'sic', label: 'Second in Command' },
  { key: 'dual', label: 'Dual Received' },
  { key: 'solo', label: 'Solo' },
  { key: 'night', label: 'Night' },
  { key: 'actualInstrument', label: 'Actual Instrument' },
  { key: 'dualGiven', label: 'Dual Given' },
  { key: 'crossCountry', label: 'Cross-Country' },
  { key: 'simulator', label: 'Simulator / Training Device' }
] as const

const performanceFields: readonly { key: PerformanceKey; label: string }[] = [
  { key: 'dayLandings', label: 'Day Landings' },
  { key: 'nightLandings', label: 'Night Landings' },
  { key: 'approachCount', label: 'Approach Count' },
  { key: 'approachType', label: 'Approach Type' },
  { key: 'holdingProcedures', label: 'Holding Procedures' }
] as const

const PILOT_PROFILE_STORAGE_KEY = 'logifi://pilot-profile'

interface PilotProfilePrefs {
  name: string
  callsign: string
  homeBase: string
  certificates: string
  flightGoals: string
  notes: string
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
  notes: ''
}

// Available metrics for Totals Overview customization
type TotalsMetricKey = 
  | 'totalTime'
  | 'soloTime'
  | 'picTime'
  | 'nightTime'
  | 'instrumentTime'
  | 'crossCountry'
  | 'dualGiven'
  | 'sic'
  | 'dualReceived'
  | 'mostUsedAircraft'

const availableTotalsMetrics: readonly { key: TotalsMetricKey; label: string }[] = [
  { key: 'totalTime', label: 'Total Time (hrs)' },
  { key: 'soloTime', label: 'Solo Time (hrs)' },
  { key: 'picTime', label: 'PIC Time (hrs)' },
  { key: 'nightTime', label: 'Night Time (hrs)' },
  { key: 'instrumentTime', label: 'Instrument Time (hrs)' },
  { key: 'crossCountry', label: 'Cross Country (hrs)' },
  { key: 'dualGiven', label: 'Dual Given (hrs)' },
  { key: 'sic', label: 'SIC (hrs)' },
  { key: 'dualReceived', label: 'Dual Received (hrs)' },
  { key: 'mostUsedAircraft', label: 'Most Used Aircraft' }
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

// Load selected metrics from localStorage
function loadSelectedTotalsMetrics(): void {
  if (!isBrowser) return
  const saved = window.localStorage.getItem('logifi-totals-metrics')
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as TotalsMetricKey[]
      // Validate that all keys are valid
      if (Array.isArray(parsed) && parsed.every(k => availableTotalsMetrics.some(m => m.key === k))) {
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
  window.localStorage.setItem('logifi-totals-metrics', JSON.stringify(selectedTotalsMetrics.value))
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
    .map(key => availableTotalsMetrics.find(m => m.key === key))
    .filter((m): m is { key: TotalsMetricKey; label: string } => m !== undefined)
})

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

const logEntries = ref<LogEntry[]>([])

const newEntry = reactive<EditableLogEntry>(createBlankEntry())
const searchTerm = ref('')
const validationError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isBrowser = typeof window !== 'undefined'
const isEntryFormOpen = ref(false)
const isCommercialMode = ref(false)
const isInlineCommercialMode = ref(false)
const editingEntryId = ref<string | null>(null)
const expandedEntryId = ref<string | null>(null)
const inlineEditEntry = ref<LogEntry | null>(null)

async function beginInlineEditing(entry: LogEntry): Promise<void> {
  if (expandedEntryId.value === entry.id) {
    expandedEntryId.value = null
    inlineEditEntry.value = null
    isInlineCommercialMode.value = false
  } else {
    expandedEntryId.value = entry.id
    // Deep copy for inline editing
    const copy = JSON.parse(JSON.stringify(entry))
    // Normalize the date for the input field
    copy.date = normalizeDateForInput(entry.date)
    if (!copy.oooi) {
      copy.oooi = createEmptyOOOI()
    }
    inlineEditEntry.value = copy
    // Auto-enable commercial mode if OOOI data exists
    if (copy.oooi && Object.values(copy.oooi).some(v => v)) {
      isInlineCommercialMode.value = true
    } else {
      isInlineCommercialMode.value = false
    }
  }
}

async function saveInlineEdit(): Promise<void> {
  if (!inlineEditEntry.value) return
  
  // Basic validation (simplified)
  if (!inlineEditEntry.value.date || !inlineEditEntry.value.registration) {
    alert('Date and Aircraft Identification are required.')
    return
  }

  // Update the entry in the list
  const targetId = inlineEditEntry.value.id
  const updatedEntry = { ...inlineEditEntry.value }
  logEntries.value = logEntries.value.map((e) => 
    e.id === targetId ? updatedEntry : e
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  expandedEntryId.value = null
  inlineEditEntry.value = null
  isInlineCommercialMode.value = false
}

function cancelInlineEdit(): void {
  expandedEntryId.value = null
  inlineEditEntry.value = null
  isInlineCommercialMode.value = false
}

const catalogOpenState = reactive<Record<CatalogKey, boolean>>({
  aircraft: true,
  airports: true,
  pilots: true,
  categoryClass: true
})
const isSidebarCollapsed = ref(false)
const showHeaderSettings = ref(false)
const showPilotProfile = ref(false)
const showIdentDropdown = ref(false)
const showInlineIdentDropdown = ref(false)
const showFromDropdown = ref(false)
const showInlineFromDropdown = ref(false)
const showToDropdown = ref(false)
const showInlineToDropdown = ref(false)
const showPilotNameDropdown = ref(false)
const showInlinePilotNameDropdown = ref(false)
const isDarkMode = ref(true)
const pilotProfile = reactive<PilotProfilePrefs>({ ...pilotProfileDefaults })
const pilotProfileLoaded = ref(false)
const pilotInitials = computed(() => {
  const name = pilotProfile.name.trim()
  if (!name) return 'PP'
  const parts = name.split(/\s+/).filter(Boolean)
  const initials = parts.slice(0, 2).map(part => part[0]?.toUpperCase() ?? '')
  return initials.join('') || 'PP'
})
// Catalog filters
const selectedFilters = reactive({
  aircraft: {} as Record<string, boolean>, // key: tail (e.g., N123AB)
  airports: {} as Record<string, boolean>, // key: code (e.g., KPAO)
  pilots: {} as Record<string, boolean>,   // key: name string
  conditions: {} as Record<string, boolean>, // key: condition value (e.g., 'ifr', 'nightVfr')
  families: {} as Record<string, boolean>, // key: normalized aircraft family (e.g., 'C172', 'PA-28')
  categoryClass: {} as Record<string, boolean> // key: category/class (e.g., 'ASEL', 'AMEL')
})
// Aircraft family section open/closed state
const familyOpenState = reactive<Record<string, boolean>>({})
// Totals time filter
type TotalsTimeMode = 'all' | '30' | '60' | 'custom'
const totalsTimeMode = ref<TotalsTimeMode>('all')
const totalsCustomStart = ref<string>('')
const totalsCustomEnd = ref<string>('')

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

function escapeCSVValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function exportToCSV(): void {
  if (logEntries.value.length === 0) return
  
  const headers = [
    'Date',
    'Role',
    'Aircraft Category/Class',
    'Aircraft Make/Model',
    'Registration',
    'Departure',
    'Destination',
    'Route',
    'Training Elements',
    'Training Instructor',
    'Instructor Certificate',
    'Flight Conditions',
    'Remarks',
    'Out',
    'Off',
    'On',
    'In',
    'Total Flight Time',
    'PIC',
    'SIC',
    'Dual Received',
    'Solo',
    'Night',
    'Actual Instrument',
    'Simulated Instrument',
    'Cross Country',
    'Ground Simulator',
    'Dual Given',
    'Day Landings',
    'Night Landings',
    'Instrument Approaches',
    'Approach Type',
    'Holding Procedures'
  ]
  
  const formatTimeValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '0.0'
    }
    return Number(value).toFixed(1)
  }

  const formatCountValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '0'
    }
    return String(Math.round(Number(value)))
  }

  const getInstrumentSplit = (entry: LogEntry): [string, string] => {
    // Returns [Actual Instrument, Simulated Instrument] for CSV export
    // Note: simulator field is exported separately as "Ground Simulator"
    const actualVal = entry.flightTime.actualInstrument
    return [
      actualVal ? formatTimeValue(actualVal) : '',
      '' // Simulated instrument (hood time) - not tracked separately from Ground Simulator
    ]
  }

  const rows = logEntries.value.map((entry) => {
    return [
      formatDisplayDate(entry.date),
      entry.role || '',
      entry.aircraftCategoryClass || '',
      entry.aircraftMakeModel || '',
      entry.registration || '',
      entry.departure || '',
      entry.destination || '',
      entry.route || '',
      entry.trainingElements || '',
      entry.trainingInstructor || '',
      entry.instructorCertificate || '',
      (entry.flightConditions || []).join('; '),
      entry.remarks || '',
      entry.oooi?.out || '',
      entry.oooi?.off || '',
      entry.oooi?.on || '',
      entry.oooi?.in || '',
      formatTimeValue(entry.flightTime.total),
      formatTimeValue(entry.flightTime.pic),
      formatTimeValue(entry.flightTime.sic),
      formatTimeValue(entry.flightTime.dual),
      formatTimeValue(entry.flightTime.solo),
      formatTimeValue(entry.flightTime.night),
      ...getInstrumentSplit(entry),
      formatTimeValue(entry.flightTime.crossCountry),
      formatTimeValue(entry.flightTime.simulator),
      formatTimeValue(entry.flightTime.dualGiven),
      formatCountValue(entry.performance.dayLandings),
      formatCountValue(entry.performance.nightLandings),
      formatCountValue(entry.performance.approachCount),
      entry.performance.approachType || '',
      formatCountValue(entry.performance.holdingProcedures)
    ].map(val => escapeCSVValue(String(val)))
  })
  
  const csvContent = [
    headers.map(escapeCSVValue).join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `logifi-logbook-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function exportToJSON(): void {
  if (logEntries.value.length === 0) return
  
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    pilotProfile: pilotProfileLoaded.value ? { ...pilotProfile } : null,
    entries: logEntries.value.map((entry) => ({
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
      flightConditions: entry.flightConditions,
      remarks: entry.remarks,
      flightTime: entry.flightTime,
      performance: entry.performance,
      oooi: entry.oooi
    }))
  }
  
  const jsonContent = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `logifi-logbook-${new Date().toISOString().split('T')[0]}.json`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function loadPilotProfilePrefs(): void {
  if (!isBrowser) return
  try {
    const stored = window.localStorage.getItem(PILOT_PROFILE_STORAGE_KEY)
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
  window.localStorage.setItem(PILOT_PROFILE_STORAGE_KEY, JSON.stringify(payload))
}

// Aircraft lookup
const { lookupAircraft } = useAircraftLookup()
const showAircraftModal = ref(false)
const currentAircraftInfo = ref<AircraftInfo | null>(null)
const loadingAircraftInfo = ref(false)
const aircraftInfoError = ref<string | null>(null)

// Airport lookup
const { lookupAirport } = useAirportLookup()
const showAirportModal = ref(false)
const currentAirportInfo = ref<AirportInfo | null>(null)
const loadingAirportInfo = ref(false)
const airportInfoError = ref<string | null>(null)

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
  return value.trim()
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
  const engineType = (info?.engineType || '').toLowerCase()
  
  // Log for debugging
  console.log('Deriving category from:', { category, engineType, make: info?.make, model: info?.model })
  
  // Check category field first
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
  
  // Check engine type for multi-engine indicators
  if (engineType.includes('multi') || engineType.includes('twin') || /\d+\s*engines?/.test(engineType)) {
    const isSea = category.includes('sea') || category.includes('amphib') || engineType.includes('sea')
    return isSea ? 'AMES' : 'AMEL'
  }
  
  // Fall back to text analysis of make/model
  const derived = deriveCategoryFromTextShort(`${info?.make || ''} ${info?.model || ''} ${fallbackMakeModel || ''}`)
  console.log('Derived from text:', derived)
  return derived
}

function normalizeAndAutofillCategories(): void {
  const cacheRaw = isBrowser ? window.localStorage.getItem('logifi://aircraft-cache') : null
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


const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  saveThemePreference()
  applyTheme()
}

const saveThemePreference = () => {
  if (isBrowser) {
    window.localStorage.setItem('logifi-theme', isDarkMode.value ? 'dark' : 'light')
  }
}

const loadThemePreference = () => {
  if (isBrowser) {
    const saved = window.localStorage.getItem('logifi-theme')
    if (saved === 'light') {
      isDarkMode.value = false
  } else {
      isDarkMode.value = true
    }
    applyTheme()
  }
}

const applyTheme = () => {
  if (isBrowser) {
    const root = document.documentElement
    if (isDarkMode.value) {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }
}

function sanitizeFlightConditions(conditions: string[]): string[] {
  return (conditions || [])
    .filter(Boolean)
    .filter((condition) => condition !== 'dayVfr')
}

function createBlankEntry(): EditableLogEntry {
  return {
    date: '',
    role: roleOptions[0],
    aircraftCategoryClass: '',
    categoryClassTime: null,
    aircraftMakeModel: '',
    registration: '',
    departure: '',
    destination: '',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: '',
    flightTime: createEmptyFlightTime(),
    performance: createEmptyPerformance(),
    oooi: createEmptyOOOI()
  }
}

function generateEntryId(): string {
  return `entry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function resetForm(): void {
  Object.assign(newEntry, createBlankEntry())
  editingEntryId.value = null
}

function toggleEntryForm(): void {
  isEntryFormOpen.value = !isEntryFormOpen.value
}

function toggleCatalogSection(key: CatalogKey): void {
  catalogOpenState[key] = !catalogOpenState[key]
}

function formatOOOIInput(value: string): string {
  // Remove non-digits and limit to 4 characters
  return value.replace(/\D/g, '').slice(0, 4)
}

function autoCheckFlightConditions(
  conditions: string[], 
  nightTime: number | null, 
  actualInstrumentTime: number | null, 
  simulatorTime: number | null, 
  xcTime: number | null
): string[] {
  const conditionSet = new Set(conditions)
  
  // Auto-check Night if night time > 0
  if (nightTime && nightTime > 0) {
    conditionSet.add('nightVfr')
  } else {
    conditionSet.delete('nightVfr')
  }
  
  // Auto-check IFR AND Actual Instrument if actual instrument time > 0
  if (actualInstrumentTime && actualInstrumentTime > 0) {
    conditionSet.add('ifr')
    conditionSet.add('actualInstrument')
  } else {
    conditionSet.delete('ifr')
    conditionSet.delete('actualInstrument')
  }
  
  // Auto-check Simulated Instrument if hood/simulator time > 0
  if (simulatorTime && simulatorTime > 0) {
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

// Helpers to extract keys for filters
function extractTailFromCatalogItem(item: string): string | null {
  let text = (item || '').trim()
  const seps = ['·', '•', '-', '|', '–', '—']
  for (const s of seps) {
    if (text.includes(s)) {
      const parts = text.split(s).map(p => p.trim())
      const nPart = parts.find(p => /^N[A-Z0-9]+$/i.test(p) || p.toUpperCase().startsWith('N'))
      if (nPart) {
        text = nPart
        break
      }
    }
  }
  const m = text.match(/N[A-Z0-9]+/i)
  return m ? m[0].toUpperCase() : null
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
    const info = await lookupAircraft(cleanRegistration)
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
}

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
  newEntry.flightConditions = sanitizeFlightConditions(entry.flightConditions || [])
  newEntry.remarks = entry.remarks
  Object.assign(newEntry.flightTime, entry.flightTime)
  Object.assign(newEntry.performance, entry.performance)
  if (entry.oooi) {
    newEntry.oooi = { ...entry.oooi }
    if (Object.values(entry.oooi).some(v => v)) {
      isCommercialMode.value = true
    } else {
      isCommercialMode.value = false
    }
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
  const engineType = (info?.engineType || '').toLowerCase()
  
  // Check category field first
  if (category.includes('single') && (category.includes('land') || category.includes('fixed'))) return 'Airplane SEL'
  if (category.includes('single') && (category.includes('sea') || category.includes('amphib'))) return 'Airplane SES'
  if (category.includes('multi') && (category.includes('land') || category.includes('fixed'))) return 'Airplane MEL'
  if (category.includes('multi') && (category.includes('sea') || category.includes('amphib'))) return 'Airplane MES'
  
  // Check engine type for multi-engine indicators
  if (engineType.includes('multi') || engineType.includes('twin') || /\d+\s*engines?/.test(engineType)) {
    const isSea = category.includes('sea') || category.includes('amphib') || engineType.includes('sea')
    return isSea ? 'Airplane MES' : 'Airplane MEL'
  }
  
  return deriveCategoryFromText(`${info?.make || ''} ${info?.model || ''} ${fallbackMakeModel || ''}`)
}

async function tryPopulateAircraftCategory(registration: string): Promise<void> {
  try {
    const reg = (registration || '').toUpperCase().trim()
    if (!reg) return
    // 1) Try local aircraft cache created during exports
    let derived = ''
    if (isBrowser) {
      const cacheRaw = window.localStorage.getItem('logifi://aircraft-cache')
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

function cancelEditing(): void {
  resetForm()
  validationError.value = null
  successMessage.value = null
}

function validateEntry(entry: EditableLogEntry): string | null {
  if (!entry.date) {
    return 'Date of flight is required.'
  }
  if (!entry.aircraftCategoryClass.trim()) {
    return 'Aircraft category and class is required.'
  }
  if (!entry.aircraftMakeModel.trim()) {
    return 'Aircraft make and model is required.'
  }
  if (!entry.registration.trim()) {
    return 'Aircraft identification (N-number) is required.'
  }
  if (!entry.departure.trim() || !entry.destination.trim()) {
    return 'Departure and destination aerodromes are required.'
  }
  if (
    entry.flightTime.total === null ||
    Number.isNaN(entry.flightTime.total) ||
    entry.flightTime.total < 0
  ) {
    return 'Total flight time must be provided.'
  }
  return null
}

function normalizeNumber(value: number | null): number | null {
  if (value === null || Number.isNaN(value)) {
    return null
  }
  const rounded = Math.round(value * 10) / 10
  return rounded >= 0 ? rounded : null
}

function calculateDuration(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  
  // helper to parse HH:mm or HHmm
  const parse = (t: string) => {
     t = t.replace(':', '').trim()
     if (t.length < 3) return null // Allow 3 digits like 130 -> 0130? No, let's expect 4 or assume leading zero
     if (t.length === 3) t = '0' + t
     if (t.length !== 4) return null
     const h = parseInt(t.substring(0, 2))
     const m = parseInt(t.substring(2, 4))
     if (isNaN(h) || isNaN(m)) return null
     return h * 60 + m
  }

  const s = parse(start)
  const e = parse(end)
  
  if (s === null || e === null) return null
  
  let diff = e - s
  if (diff < 0) diff += 24 * 60 // wrap around midnight
  
  return Math.round((diff / 60) * 10) / 10
}

// Watcher to auto-calculate total time and flight time
watch(() => [newEntry.oooi?.out, newEntry.oooi?.in, newEntry.oooi?.off, newEntry.oooi?.on, newEntry.role], () => {
  if (!isCommercialMode.value || !newEntry.oooi) return
  
  if (newEntry.oooi.out && newEntry.oooi.in) {
     const block = calculateDuration(newEntry.oooi.out, newEntry.oooi.in)
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

watch(() => [inlineEditEntry.value?.oooi?.out, inlineEditEntry.value?.oooi?.in, inlineEditEntry.value?.role], () => {
  if (!isInlineCommercialMode.value || !inlineEditEntry.value?.oooi) return
  
  if (inlineEditEntry.value.oooi.out && inlineEditEntry.value.oooi.in) {
     const block = calculateDuration(inlineEditEntry.value.oooi.out, inlineEditEntry.value.oooi.in)
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

// Auto-calculate night time based on OOOI and airport location
async function autoCalculateNightTime(
  date: string,
  departure: string,
  destination: string,
  outTime: string | null,
  inTime: string | null,
  isZulu: boolean = true
): Promise<number | null> {
  if (!date || !departure || !outTime || !inTime) return null
  
  // Get departure airport coordinates from cache, or try to look them up
  let depCoords = getAirportCoordsFromCache(departure)
  
  if (!depCoords) {
    // Try to look up the airport
    const depInfo = await lookupAirport(departure)
    if (depInfo?.latitude && depInfo?.longitude) {
      depCoords = { lat: depInfo.latitude, lon: depInfo.longitude }
    }
  }
  
  if (!depCoords) return null
  
  // Get destination coordinates (optional, for more accurate calculation on long flights)
  let destCoords = getAirportCoordsFromCache(destination)
  if (!destCoords && destination) {
    const destInfo = await lookupAirport(destination)
    if (destInfo?.latitude && destInfo?.longitude) {
      destCoords = { lat: destInfo.latitude, lon: destInfo.longitude }
    }
  }
  
  // Normalize date to YYYY-MM-DD format
  let normalizedDate = date
  if (date.includes('/')) {
    const parts = date.split('/')
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const mm = parts[0]
      const dd = parts[1]
      const yyyy = parts[2]
      normalizedDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
    }
  }
  
  const result = calculateNightTime({
    date: normalizedDate,
    depLatitude: depCoords.lat,
    depLongitude: depCoords.lon,
    destLatitude: destCoords?.lat,
    destLongitude: destCoords?.lon,
    outTime,
    inTime,
    isZulu
  })
  
  if (result.success && result.nightHours > 0) {
    return result.nightHours
  }
  
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
    if (!isCommercialMode.value || !newEntry.oooi) return
    if (!newEntry.date || !newEntry.departure || !newEntry.oooi.out || !newEntry.oooi.in) return
    
    const nightTime = await autoCalculateNightTime(
      newEntry.date,
      newEntry.departure,
      newEntry.destination,
      newEntry.oooi.out,
      newEntry.oooi.in,
      newEntry.oooi.isZulu
    )
    
    if (nightTime !== null) {
      newEntry.flightTime.night = nightTime
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
    if (!isInlineCommercialMode.value || !inlineEditEntry.value?.oooi) return
    if (!inlineEditEntry.value.date || !inlineEditEntry.value.departure || 
        !inlineEditEntry.value.oooi.out || !inlineEditEntry.value.oooi.in) return
    
    const nightTime = await autoCalculateNightTime(
      inlineEditEntry.value.date,
      inlineEditEntry.value.departure,
      inlineEditEntry.value.destination,
      inlineEditEntry.value.oooi.out,
      inlineEditEntry.value.oooi.in,
      inlineEditEntry.value.oooi.isZulu
    )
    
    if (nightTime !== null && inlineEditEntry.value) {
      inlineEditEntry.value.flightTime.night = nightTime
    }
  },
  { deep: true }
)

// Watcher to auto-check flight conditions based on time entries (Add Entry form)
watch(
  () => [
    newEntry.flightTime.night,
    newEntry.flightTime.actualInstrument,
    newEntry.flightTime.simulator,
    newEntry.flightTime.crossCountry
  ],
  () => {
    newEntry.flightConditions = autoCheckFlightConditions(
      newEntry.flightConditions,
      newEntry.flightTime.night,
      newEntry.flightTime.actualInstrument,
      newEntry.flightTime.simulator,
      newEntry.flightTime.crossCountry
    )
  },
  { deep: true }
)

// Watcher to auto-check flight conditions based on time entries (Edit Entry form)
watch(
  () => [
    inlineEditEntry.value?.flightTime.night,
    inlineEditEntry.value?.flightTime.actualInstrument,
    inlineEditEntry.value?.flightTime.simulator,
    inlineEditEntry.value?.flightTime.crossCountry
  ],
  () => {
    if (!inlineEditEntry.value) return
    inlineEditEntry.value.flightConditions = autoCheckFlightConditions(
      inlineEditEntry.value.flightConditions,
      inlineEditEntry.value.flightTime.night,
      inlineEditEntry.value.flightTime.actualInstrument,
      inlineEditEntry.value.flightTime.simulator,
      inlineEditEntry.value.flightTime.crossCountry
    )
  },
  { deep: true }
)

function submitEntry(): void {
  validationError.value = null
  successMessage.value = null

  const error = validateEntry(newEntry)
  if (error) {
    validationError.value = error
    return
  }
  
  const baseEntry: Omit<LogEntry, 'id'> = {
    date: newEntry.date,
    role: newEntry.role,
    aircraftCategoryClass: normalizeCategoryClassLabel(newEntry.aircraftCategoryClass.trim()),
    categoryClassTime: normalizeNumber(newEntry.categoryClassTime),
    aircraftMakeModel: newEntry.aircraftMakeModel.trim(),
    registration: newEntry.registration.trim(),
    departure: newEntry.departure.trim(),
    destination: newEntry.destination.trim(),
    route: newEntry.route.trim(),
    trainingElements: newEntry.trainingElements.trim(),
    trainingInstructor: newEntry.trainingInstructor.trim(),
    instructorCertificate: newEntry.instructorCertificate.trim(),
    flightConditions: sanitizeFlightConditions([...newEntry.flightConditions]),
    remarks: newEntry.remarks.trim(),
    flightTime: flightTimeFields.reduce<FlightTimeBreakdown>((acc, field) => {
      acc[field.key] = normalizeNumber(newEntry.flightTime[field.key])
      return acc
    }, {} as FlightTimeBreakdown),
    performance: performanceFields.reduce<PerformanceMetrics>((acc, field) => {
      if (field.key === 'approachType') {
        acc[field.key] = (newEntry.performance[field.key] as string | null) ?? null
      } else {
      acc[field.key] = newEntry.performance[field.key] ?? null
      }
      return acc
    }, {} as PerformanceMetrics),
    oooi: newEntry.oooi && Object.values(newEntry.oooi).some(v => v) ? { ...newEntry.oooi } : undefined
  }

  if (editingEntryId.value) {
    const targetId = editingEntryId.value
    logEntries.value = logEntries.value
      .map((entry) => (entry.id === targetId ? { ...baseEntry, id: targetId } : entry))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    successMessage.value = 'Entry updated.'
  } else {
    const entryToStore: LogEntry = {
      ...baseEntry,
      id: generateEntryId()
    }
    logEntries.value = [...logEntries.value, entryToStore].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    successMessage.value = 'Entry saved locally. Remember to archive signatures once the feature is available.'
  }

  resetForm()
}

function removeEntry(id: string): void {
  logEntries.value = logEntries.value.filter((entry) => entry.id !== id)
}

function confirmAndDeleteEditing(): void {
  if (!editingEntryId.value) return
  const proceed = window.confirm('Delete this entry? This action cannot be undone.')
  if (!proceed) return
  removeEntry(editingEntryId.value)
  resetForm()
  successMessage.value = null
  validationError.value = null
}

function confirmAndDeleteEntry(id: string): void {
  const proceed = window.confirm('Delete this entry? This action cannot be undone.')
  if (!proceed) return
  removeEntry(id)
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
function loadPersistedEntries(): void {
  if (!isBrowser) {
    return
  }
  const stored = window.localStorage.getItem(LOGBOOK_STORAGE_KEY)
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
        
        return {
          ...entry,
          flightConditions: sanitizeFlightConditions(entry.flightConditions || []),
          flightTime: {
            ...createEmptyFlightTime(),
            ...entry.flightTime
          },
          performance: {
            ...createEmptyPerformance(),
            ...entry.performance
          }
        }
      })
    }
  } catch (err) {
    console.error('Unable to load stored logbook entries', err)
  }
}

onMounted(() => {
  loadPersistedEntries()
  loadThemePreference()
  loadClockPrefs()
  loadSelectedTotalsMetrics()
  loadPilotProfilePrefs()
  // Normalize and autofill aircraft category/class labels on load
  normalizeAndAutofillCategories()
  if (logEntries.value.length === 0) {
    isEntryFormOpen.value = true
  }
  
  // Close settings when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (showHeaderSettings.value && !target.closest('.settings-container')) {
      showHeaderSettings.value = false
    }
  }
  document.addEventListener('click', handleClickOutside)
  clockTimer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
  
  return () => {
    document.removeEventListener('click', handleClickOutside)
    if (clockTimer !== null) {
      clearInterval(clockTimer)
      clockTimer = null
    }
  }
})

watch(
  logEntries,
  (entries) => {
    if (!isBrowser) {
      return
    }
    window.localStorage.setItem(LOGBOOK_STORAGE_KEY, JSON.stringify(entries))
  },
  { deep: true }
)

watch(
  pilotProfile,
  () => {
    savePilotProfilePrefs()
  },
  { deep: true }
)

const filteredEntries = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  const activeAircraft = new Set(getActiveFilterKeys(selectedFilters.aircraft).map(k => k.toUpperCase()))
  const activeAirports = new Set(getActiveFilterKeys(selectedFilters.airports).map(k => k.toUpperCase()))
  const activePilots = new Set(getActiveFilterKeys(selectedFilters.pilots))
  const activeConditions = new Set(getActiveFilterKeys(selectedFilters.conditions))
  const activeFamilies = new Set(getActiveFilterKeys(selectedFilters.families))
  const activeCategoryClass = new Set(getActiveFilterKeys(selectedFilters.categoryClass).map(k => k.toUpperCase()))

  const result = logEntries.value.filter((entry) => {
    // text search
    const matchesTerm =
      term.length === 0 ||
      [
        entry.aircraftMakeModel,
        entry.registration,
        entry.departure,
        entry.destination,
        entry.route,
        entry.remarks,
        entry.trainingElements
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)

    if (!matchesTerm) return false

    // aircraft filter (registration match)
    if (activeAircraft.size > 0) {
      const reg = (entry.registration || '').toUpperCase()
      if (!activeAircraft.has(reg)) {
        return false
      }
    }

    // airports filter (either departure or destination must match any active airport)
    if (activeAirports.size > 0) {
      const dep = (entry.departure || '').toUpperCase()
      const dst = (entry.destination || '').toUpperCase()
      if (!activeAirports.has(dep) && !activeAirports.has(dst)) {
        return false
      }
    }

    // pilots filter (name match)
    if (activePilots.size > 0) {
      const pilotName = entry.trainingElements || ''
      if (!activePilots.has(pilotName)) {
        return false
      }
    }

    // conditions filter (require all selected conditions to be present)
    if (activeConditions.size > 0) {
      const entryConds = new Set((entry.flightConditions || []) as string[])
      for (const cond of activeConditions) {
        if (!entryConds.has(cond)) {
          return false
        }
      }
    }

    // aircraft family filter (match normalized family)
    if (activeFamilies.size > 0) {
      const fam = normalizeAircraftFamily(entry.aircraftMakeModel || '')
      if (!fam || !activeFamilies.has(fam)) {
        return false
      }
    }

    // category/class filter
    if (activeCategoryClass.size > 0) {
      const catClass = (entry.aircraftCategoryClass || '').trim().toUpperCase()
      if (!activeCategoryClass.has(catClass)) {
        return false
      }
    }

    return true
  })

  // Sort by date (most recent first)
  return result.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
    return dateB - dateA
  })
})

const entriesForTotals = computed(() => {
  // further narrow filteredEntries by time window
  const mode = totalsTimeMode.value
  const nowDate = new Date()
  let start: Date | null = null
  let end: Date | null = null
  if (mode === '30') {
    start = new Date(nowDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    end = nowDate
  } else if (mode === '60') {
    start = new Date(nowDate.getTime() - 60 * 24 * 60 * 60 * 1000)
    end = nowDate
  } else if (mode === 'custom') {
    if (totalsCustomStart.value) {
      start = new Date(totalsCustomStart.value)
    }
    if (totalsCustomEnd.value) {
      end = new Date(totalsCustomEnd.value)
      // include end day fully by setting to end of day
      end.setHours(23, 59, 59, 999)
    }
  }
  if (!start && !end) {
    return filteredEntries.value
  }
  return filteredEntries.value.filter((entry) => {
    const d = new Date(entry.date)
    if (Number.isNaN(d.getTime())) return false
    if (start && d < start) return false
    if (end && d > end) return false
    return true
  })
})

const totals = computed(() => {
  const timeAccumulator = flightTimeFields.reduce<Record<FlightTimeKey, number>>((acc, field) => {
    acc[field.key] = 0
    return acc
  }, {} as Record<FlightTimeKey, number>)

  const performanceAccumulator = performanceFields.reduce<Record<PerformanceKey, any>>(
    (acc, field) => {
      acc[field.key] = field.key === 'approachType' ? null : 0
      return acc
    },
    {} as Record<PerformanceKey, any>
  )

  entriesForTotals.value.forEach((entry) => {
    flightTimeFields.forEach((field) => {
      timeAccumulator[field.key] += entry.flightTime[field.key] ?? 0
    })
    performanceFields.forEach((field) => {
      // Skip approachType since it's a string, not a number
      if (field.key !== 'approachType') {
        performanceAccumulator[field.key] += (entry.performance[field.key] as number) ?? 0
      }
    })
  })

  return {
    time: timeAccumulator,
    performance: performanceAccumulator,
    count: entriesForTotals.value.length
  }
})

const catalogs = computed<Record<CatalogKey, string[]> & { families?: string[], familyToItems?: Record<string, string[]> }>(() => {
  const aircraft = new Set<string>()
  const airports = new Set<string>()
  const pilots = new Set<string>()
  const categoryClass = new Set<string>()
  const familiesSet = new Set<string>()
  const familyToItemsMap: Record<string, Set<string>> = {}

  logEntries.value.forEach((entry) => {
    const makeModel = entry.aircraftMakeModel.trim()
    const tail = entry.registration.trim().toUpperCase()
    if (makeModel || tail) {
      aircraft.add(tail ? `${makeModel || 'Airframe'} · ${tail}` : makeModel)
    }
    if (makeModel) {
      const fam = normalizeAircraftFamily(makeModel)
      if (fam) familiesSet.add(fam)
      if (fam) {
        if (!familyToItemsMap[fam]) familyToItemsMap[fam] = new Set<string>()
        const item = tail ? `${makeModel || 'Airframe'} · ${tail}` : makeModel
        familyToItemsMap[fam].add(item)
      }
    }
    if (entry.departure.trim()) {
      airports.add(entry.departure.trim().toUpperCase())
    }
    if (entry.destination.trim()) {
      airports.add(entry.destination.trim().toUpperCase())
    }
    if (entry.trainingElements.trim()) {
      pilots.add(entry.trainingElements.trim())
    }
    if (entry.aircraftCategoryClass.trim()) {
      categoryClass.add(entry.aircraftCategoryClass.trim().toUpperCase())
    }
  })

  // Convert family map to ordered arrays
  const familyToItems: Record<string, string[]> = {}
  Array.from(familiesSet)
    .sort((a, b) => a.localeCompare(b))
    .forEach((fam) => {
      familyToItems[fam] = Array.from(familyToItemsMap[fam] || []).sort((a, b) => a.localeCompare(b))
      // initialize open state if unset
      if (familyOpenState[fam] === undefined) {
        familyOpenState[fam] = false
    }
  })

  return {
    aircraft: Array.from(aircraft).sort((a, b) => a.localeCompare(b)),
    airports: Array.from(airports).sort((a, b) => a.localeCompare(b)),
    pilots: Array.from(pilots).sort((a, b) => a.localeCompare(b)),
    categoryClass: Array.from(categoryClass).sort((a, b) => a.localeCompare(b)),
    families: Array.from(familiesSet).sort((a, b) => a.localeCompare(b)),
    familyToItems
  }
})

// Aircraft registry for Ident dropdown - unique registrations with their make/model
const aircraftRegistry = computed(() => {
  const registry: { registration: string; makeModel: string }[] = []
  const seen = new Set<string>()
  logEntries.value.forEach((entry) => {
    const reg = entry.registration.trim().toUpperCase()
    if (reg && !seen.has(reg)) {
      seen.add(reg)
      registry.push({ registration: reg, makeModel: entry.aircraftMakeModel.trim() })
    }
  })
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
function selectAircraftForNewEntry(aircraft: { registration: string; makeModel: string }): void {
  newEntry.registration = aircraft.registration
  newEntry.aircraftMakeModel = aircraft.makeModel
  showIdentDropdown.value = false
}

function selectAircraftForInlineEdit(aircraft: { registration: string; makeModel: string }): void {
  if (!inlineEditEntry.value) return
  inlineEditEntry.value.registration = aircraft.registration
  inlineEditEntry.value.aircraftMakeModel = aircraft.makeModel
  showInlineIdentDropdown.value = false
}

// Blur handlers for Ident dropdowns (with delay to allow click to register)
function handleIdentBlur(): void {
  window.setTimeout(() => { showIdentDropdown.value = false }, 150)
}

function handleInlineIdentBlur(): void {
  window.setTimeout(() => { showInlineIdentDropdown.value = false }, 150)
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

// Selection handlers for FROM dropdown
function selectAirportForFrom(airport: string): void {
  newEntry.departure = airport
  showFromDropdown.value = false
  // Prefetch coordinates for night time calculation
  prefetchAirportCoords(airport)
}

function selectAirportForInlineFrom(airport: string): void {
  if (!inlineEditEntry.value) return
  inlineEditEntry.value.departure = airport
  showInlineFromDropdown.value = false
  prefetchAirportCoords(airport)
}

// Selection handlers for TO dropdown
function selectAirportForTo(airport: string): void {
  newEntry.destination = airport
  showToDropdown.value = false
  prefetchAirportCoords(airport)
}

function selectAirportForInlineTo(airport: string): void {
  if (!inlineEditEntry.value) return
  inlineEditEntry.value.destination = airport
  showInlineToDropdown.value = false
  prefetchAirportCoords(airport)
}

// Selection handlers for Pilot Name dropdown
function selectPilotName(pilot: string): void {
  newEntry.trainingElements = pilot
  showPilotNameDropdown.value = false
}

function selectPilotNameForInline(pilot: string): void {
  if (!inlineEditEntry.value) return
  inlineEditEntry.value.trainingElements = pilot
  showInlinePilotNameDropdown.value = false
}

// Blur handlers for airport and pilot dropdowns
function handleFromBlur(): void {
  window.setTimeout(() => { showFromDropdown.value = false }, 150)
}

function handleInlineFromBlur(): void {
  window.setTimeout(() => { showInlineFromDropdown.value = false }, 150)
}

function handleToBlur(): void {
  window.setTimeout(() => { showToDropdown.value = false }, 150)
}

function handleInlineToBlur(): void {
  window.setTimeout(() => { showInlineToDropdown.value = false }, 150)
}

function handlePilotNameBlur(): void {
  window.setTimeout(() => { showPilotNameDropdown.value = false }, 150)
}

function handleInlinePilotNameBlur(): void {
  window.setTimeout(() => { showInlinePilotNameDropdown.value = false }, 150)
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

const pilotProfileStats = computed<PilotProfileStats>(() => {
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
    longestLeg: null
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
    const instrument = coerceNumber(entry.flightTime.actualInstrument) + coerceNumber(entry.flightTime.simulator)

    stats.totalHours += total
    stats.picHours += pic
    stats.nightHours += night
    stats.instrumentHours += instrument
    stats.dayLandings += coerceNumber(entry.performance.dayLandings)
    stats.nightLandings += coerceNumber(entry.performance.nightLandings)

    const dep = (entry.departure || '').trim()
    const dst = (entry.destination || '').trim()
    if (dep) airports.add(dep.toUpperCase())
    if (dst) airports.add(dst.toUpperCase())

    const routeLabel = buildRouteLabel(entry)
    routeCounts[routeLabel] = (routeCounts[routeLabel] || 0) + 1

    const family = normalizeAircraftFamily(entry.aircraftMakeModel.trim())
    if (family) {
      familyCounts[family] = (familyCounts[family] || 0) + 1
    }

    (entry.flightConditions || []).forEach((condition) => {
      const label = condition?.trim() || 'Other'
      conditionCounts[label] = (conditionCounts[label] || 0) + 1
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
        date: entry.date
      }
    }
  })

  stats.airportsVisited = airports.size
  stats.avgDuration = stats.totalFlights > 0 ? stats.totalHours / stats.totalFlights : 0
  stats.favoriteAircraft = getTopKey(familyCounts)
  stats.favoriteRoute = getTopKey(routeCounts)
  stats.conditions = Object.entries(conditionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))

  return stats
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
  return [...logEntries.value]
    .filter((entry) => {
      const timestamp = new Date(entry.date).getTime()
      return !Number.isNaN(timestamp)
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)
})

function formatNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—'
  }
  return value.toFixed(1)
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

// Computed property for most used aircraft family
const mostUsedAircraft = computed(() => {
  const familyCounts: Record<string, number> = {}
  entriesForTotals.value.forEach((entry) => {
    const makeModel = entry.aircraftMakeModel.trim()
    if (makeModel) {
      const family = normalizeAircraftFamily(makeModel)
      if (family) {
        familyCounts[family] = (familyCounts[family] || 0) + 1
      }
    }
  })
  if (Object.keys(familyCounts).length === 0) return null
  const sorted = Object.entries(familyCounts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || null
})

function formatTotalValue(key: TotalsMetricKey): string {
  if (key === 'totalTime') {
    return totals.value.time.total.toFixed(1)
  }
  if (key === 'soloTime') {
    return (totals.value.time.solo ?? 0).toFixed(1)
  }
  if (key === 'picTime') {
    return (totals.value.time.pic ?? 0).toFixed(1)
  }
  if (key === 'nightTime') {
    return (totals.value.time.night ?? 0).toFixed(1)
  }
  if (key === 'instrumentTime') {
    const simulated = Number(totals.value.time.simulator ?? 0)
    const actual = Number(totals.value.time.actualInstrument ?? 0)
    const sum = simulated + actual
    return sum.toFixed(1)
  }
  if (key === 'crossCountry') {
    return (totals.value.time.crossCountry ?? 0).toFixed(1)
  }
  if (key === 'sic') {
    return (totals.value.time.sic ?? 0).toFixed(1)
  }
  if (key === 'dualReceived') {
    return (totals.value.time.dual ?? 0).toFixed(1)
  }
  if (key === 'dualGiven') {
    return (totals.value.time.dualGiven ?? 0).toFixed(1)
  }
  if (key === 'mostUsedAircraft') {
    return mostUsedAircraft.value || '—'
  }
  return '—'
}

function conditionLabel(value: string): string {
  if (value === 'dayVfr') {
    return ''
  }
  const option = conditionOptions.find((option) => option.value === value)
  return option ? option.label : value
}
</script>
