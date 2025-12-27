<template>
<div
  :class="[
    'min-h-screen overflow-y-auto transition-colors duration-300 font-quicksand',
    isDarkMode ? 'bg-gray-900' : 'bg-gray-300'
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
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
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
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            ]"
              aria-label="Settings"
            >
              <Icon name="ri:settings-3-line" size="18" class="mr-2" />
              Settings
            </button>
            <div
              v-if="showHeaderSettings"
              :class="[
                'absolute right-0 top-full mt-2 w-64 rounded-xl border shadow-2xl z-10 flex flex-col',
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-gray-100 border-gray-300'
              ]"
              style="max-height: calc(100vh - 120px);"
            >
              <div class="flex items-center justify-between p-4 border-b" :class="isDarkMode ? 'border-gray-700' : 'border-gray-300'">
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
              <div class="overflow-y-auto p-4 space-y-4">
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
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-800')
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
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-800')
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
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-800')
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
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-800')
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
                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100'
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
                          ? (isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-400 cursor-not-allowed')
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
                          ? (isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-400 cursor-not-allowed')
                          : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900')
                      ]"
                    >
                      <Icon name="ri:file-code-line" size="16" />
                      Export as JSON
                    </button>
                    <button
                      type="button"
                      @click="showForm8710Modal = true"
                      :disabled="logEntries.length === 0"
                      :class="[
                        'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-quicksand transition-all',
                        logEntries.length === 0
                          ? (isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-400 cursor-not-allowed')
                          : (isDarkMode ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white')
                      ]"
                    >
                      <Icon name="ri:file-pdf-line" size="16" />
                      Generate 8710 Form
                    </button>
                  </div>
                  <p :class="['text-xs mt-2', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                    {{ logEntries.length === 0 ? 'No entries to export' : `${logEntries.length} ${logEntries.length === 1 ? 'entry' : 'entries'} available` }}
                  </p>
                </div>
                <div 
                  class="space-y-3 pt-2 border-t transition-colors" 
                  :class="[
                    isDarkMode ? 'border-gray-700' : 'border-gray-300',
                    isDragOverImport ? (isDarkMode ? 'border-green-500 bg-green-900/20' : 'border-green-500 bg-green-50') : ''
                  ]"
                  @dragover.prevent="handleImportDragOver"
                  @dragenter.prevent="handleImportDragEnter"
                  @dragleave="handleImportDragLeave"
                  @drop.prevent="handleImportDrop"
                >
                  <div :class="['font-quicksand text-sm font-semibold mb-2', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                    Import Logbook
                  </div>
                  <div class="space-y-2">
                    <button
                      type="button"
                      @click="() => csvFileInput?.click()"
                      :class="[
                        'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-quicksand transition-all',
                        isDarkMode ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                      ]"
                    >
                      <Icon name="ri:file-excel-2-line" size="16" />
                      Import from CSV
                    </button>
                    <button
                      type="button"
                      @click="() => jsonFileInput?.click()"
                      :class="[
                        'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-quicksand transition-all',
                        isDarkMode ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                      ]"
                    >
                      <Icon name="ri:file-code-line" size="16" />
                      Import from JSON
                    </button>
                  </div>
                  <p :class="['text-xs mt-2', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
                    {{ isDragOverImport ? 'Drop file here to import' : 'Drag & drop or click to import. Duplicates (same date + registration) will be skipped.' }}
                  </p>
                </div>
                <!-- Hidden file inputs -->
                <input
                  ref="csvFileInput"
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  style="display: none;"
                  @change="handleCSVImport"
                />
                <input
                  ref="jsonFileInput"
                  type="file"
                  accept=".json,application/json"
                  style="display: none;"
                  @change="handleJSONImport"
                />
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

    <main :class="['min-h-screen flex flex-col pt-40 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300 overflow-x-auto', isDarkMode ? '' : '']">
      <div class="mr-auto w-full max-w-full flex flex-col gap-10 lg:flex-row">
        <aside
          :class="[
            'flex-shrink-0 rounded-2xl border text-left font-quicksand transition-all duration-300 flex flex-col',
            isDarkMode 
              ? 'bg-gray-800 border-gray-700 text-gray-200' 
              : 'bg-gray-200 border-gray-300 text-gray-800 shadow-sm',
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
                              @contextmenu.prevent="showRenameFamilyContextMenu($event, fam)"
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
                    <span :class="['inline-flex h-2 w-2 rounded-full', isDarkMode ? 'bg-gray-500' : 'bg-gray-400']"></span>
                    <span class="truncate" :title="section.key === 'airports' ? getAirportDisplayText(item) : item">
                      {{ section.key === 'airports' ? getAirportDisplayText(item) : item }}
                    </span>
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
                isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-300 border-gray-300'
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
                    isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200'
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
          <!-- Aircraft families filter section removed per request -->

          <!-- Flagged Entries filter section -->
          <div v-show="!isSidebarCollapsed" class="mt-4">
            <div
              :class="[
                'rounded-xl border px-4 py-4 transition-colors duration-300',
                isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-300 border-gray-300'
              ]"
            >
              <div class="flex items-center justify-between mb-2">
                <h3 :class="['text-sm font-semibold font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                  Flagged Entries
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
            </div>
          </div>

          <div v-show="!isSidebarCollapsed" class="relative settings-container mt-auto pt-6">
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

        <div class="flex-1 space-y-12 min-w-0 overflow-x-auto">
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
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
                        ]"
                      />
                      <span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-600']">to</span>
                      <input
                        type="date"
                        v-model="totalsCustomEnd"
                        :class="[
                          'px-2 py-1 rounded-md text-xs font-quicksand border',
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
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
                            : 'bg-gray-100 border-blue-200 shadow-md shadow-blue-100')
                        : (isDarkMode 
                            ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' 
                            : 'bg-gray-100 border-gray-200 hover:bg-gray-200 shadow-sm')
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
                  Logbook
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
                        : 'border-gray-300 bg-gray-100 text-gray-900 placeholder-gray-400 focus:ring-blue-500'
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

            <div class="flex items-center justify-between gap-4">
            <div :class="['mt-4 text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Sorted by most recent entry date.
              </div>
              <!-- Floating Settings Button Above DATE Column -->
              <div 
                v-if="filteredEntries.length > 0 && visibleColumns.find(c => c.key === 'date')"
                class="relative column-settings-container"
              >
                <button
                  type="button"
                  @click.stop="showColumnSettings = !showColumnSettings"
                  :class="[
                    'p-1.5 rounded transition-colors',
                    isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300 bg-gray-800' 
                      : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700 bg-gray-100'
                  ]"
                  aria-label="Column settings"
                >
                  <Icon name="ri:settings-3-line" size="16" />
                </button>
                <!-- Column Settings Dropdown -->
                <div
                  v-if="showColumnSettings"
                  :class="[
                    'absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-2xl p-4 z-50',
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-gray-100 border-gray-300'
                  ]"
                  @click.stop
                >
                  <div class="flex items-center justify-between mb-4">
                    <h3 :class="['font-semibold font-quicksand text-sm', isDarkMode ? 'text-white' : 'text-gray-900']">
                      Column Settings
                    </h3>
                    <button
                      @click="showColumnSettings = false"
                      :class="['hover:opacity-70 transition-opacity', isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700']"
                      aria-label="Close column settings"
                    >
                      <Icon name="ri:close-line" size="20" />
                    </button>
                  </div>
                  <div class="space-y-2 max-h-96 overflow-y-auto">
                    <div
                      v-for="col in columnConfig.sort((a, b) => a.order - b.order)"
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
              </div>
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
                'mt-6 overflow-x-auto rounded-2xl border transition-colors duration-300 relative',
                        isDarkMode 
    ? 'border-gray-700' 
    : 'border-gray-300 shadow-sm'
              ]"
            >
              <table :class="[
                'w-full divide-y text-left font-quicksand',
                isDarkMode 
                  ? 'divide-gray-700 bg-gray-800' 
                    : 'divide-gray-200 bg-gray-100'
              ]" style="table-layout: fixed; width: 100%;">
                <thead :class="[
                  'uppercase text-xs font-semibold tracking-wider font-quicksand sticky top-0 z-20 shadow-sm',
                  isDarkMode 
                    ? 'bg-gray-800 text-gray-400 border-b border-gray-700' 
                    : 'bg-gray-100 text-gray-500 border-b border-gray-200'
                ]">
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
                      <!-- Resize handle -->
                      <div
                        class="absolute top-0 right-0 h-full w-1 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        :class="isDarkMode ? 'hover:bg-blue-500' : 'hover:bg-blue-600'"
                        @mousedown.prevent="startResize(col.key, $event)"
                        style="margin-right: -2px;"
                      ></div>
                    </th>
                  </tr>
                </thead>
                <tbody :class="[
                  'divide-y text-sm font-quicksand',
                  isDarkMode 
                    ? 'divide-gray-700 bg-gray-900 text-gray-300' 
                    : 'divide-gray-200 bg-gray-100 text-gray-600'
                ]">
                  <template v-for="entry in filteredEntries" :key="entry.id">
                  <tr
                    :class="[
                      'transition-all duration-200 border-l-4',
                      entry.flagged
                        ? (isDarkMode 
                          ? 'bg-amber-900/20 border-l-amber-500 hover:bg-amber-900/30' 
                          : 'bg-amber-50 border-l-amber-500 hover:bg-amber-100')
                        : (isDarkMode 
                          ? 'hover:bg-gray-800 border-transparent hover:border-blue-500' 
                          : 'hover:bg-gray-200 border-transparent hover:border-blue-500')
                    ]"
                      class="cursor-pointer"
                      @click="beginInlineEditing(entry)"
                  >
                    <td 
                      v-for="col in visibleColumns"
                      :key="col.key"
                      :class="[...getCellClasses(col), getCellTextColor(col)]"
                      :style="col.width ? `width: ${col.width}px;` : ''"
                    >
                      <!-- Date Column -->
                      <template v-if="col.key === 'date'">
                        <div :class="['font-semibold text-sm', isDarkMode ? 'text-white' : 'text-gray-900']">
                          {{ formatDisplayDate(entry.date) }}
                        </div>
                        <div :class="['text-xs truncate', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                          {{ entry.role }}
                        </div>
                      </template>
                      <!-- Aircraft Column -->
                      <template v-else-if="col.key === 'aircraft'">
                        <div :class="['text-sm truncate', isDarkMode ? 'text-gray-200' : 'text-gray-900']">{{ entry.aircraftMakeModel }}</div>
                        <div :class="['text-xs truncate', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                          {{ entry.aircraftCategoryClass }}
                        </div>
                      </template>
                      <!-- Identification Column -->
                      <template v-else-if="col.key === 'identification'">
                        {{ entry.registration }}
                      </template>
                      <!-- Flight Number Column -->
                      <template v-else-if="col.key === 'flightNumber'">
                        {{ entry.flightNumber || '—' }}
                      </template>
                      <!-- From → To Column -->
                      <template v-else-if="col.key === 'fromTo'">
                        <div :class="['font-semibold text-sm truncate', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                          {{ entry.departure }} → {{ entry.destination }}
                        </div>
                        <div v-if="entry.route" :class="['text-xs truncate', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                          {{ entry.route }}
                        </div>
                      </template>
                      <!-- Conditions Column -->
                      <template v-else-if="col.key === 'conditions'">
                        <div class="flex flex-wrap gap-1">
                          <span
                            v-for="condition in sortConditionsInFixedOrder(entry.flightConditions || [])"
                            :key="`${entry.id}-${condition}`"
                            :class="[
                              'rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold border',
                              isDarkMode 
                                ? 'bg-gray-800 border-gray-600 text-gray-300' 
                                : 'bg-gray-100 border-gray-200 text-gray-600'
                            ]"
                          >
                            {{ condition }}
                          </span>
                          <span :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400']" v-if="!entry.flightConditions || entry.flightConditions.length === 0">
                            —
                          </span>
                        </div>
                      </template>
                      <!-- Remarks Column -->
                      <template v-else-if="col.key === 'remarks'">
                        <div class="whitespace-normal break-words">{{ entry.remarks || '—' }}</div>
                      </template>
                      <!-- PIC Column -->
                      <template v-else-if="col.key === 'pic'">
                        {{ formatNumber(entry.flightTime.pic) }}
                      </template>
                      <!-- SIC Column -->
                      <template v-else-if="col.key === 'sic'">
                        {{ formatNumber(entry.flightTime.sic) }}
                      </template>
                      <!-- Dual R Column -->
                      <template v-else-if="col.key === 'dualR'">
                        {{ formatNumber(entry.flightTime.dual) }}
                      </template>
                      <!-- Solo Column -->
                      <template v-else-if="col.key === 'solo'">
                        {{ formatNumber(entry.flightTime.solo) }}
                      </template>
                      <!-- Night Column -->
                      <template v-else-if="col.key === 'night'">
                        {{ formatNumber(entry.flightTime.night) }}
                      </template>
                      <!-- Actual Column -->
                      <template v-else-if="col.key === 'actual'">
                        {{ formatNumber(entry.flightTime.actualInstrument) }}
                      </template>
                      <!-- Hood Column -->
                      <template v-else-if="col.key === 'hood'">
                        {{ formatNumber(entry.flightTime.simulatedInstrument) }}
                      </template>
                      <!-- Dual G Column -->
                      <template v-else-if="col.key === 'dualG'">
                        {{ formatNumber(entry.flightTime.dualGiven) }}
                      </template>
                      <!-- XC Column -->
                      <template v-else-if="col.key === 'xc'">
                        {{ formatNumber(entry.flightTime.crossCountry) }}
                      </template>
                      <!-- Day Landings Column -->
                      <template v-else-if="col.key === 'dayLandings'">
                        {{ entry.performance.dayLandings ?? '—' }}
                      </template>
                      <!-- Night Landings Column -->
                      <template v-else-if="col.key === 'nightLandings'">
                        {{ entry.performance.nightLandings ?? '—' }}
                      </template>
                      <!-- Approach Column -->
                      <template v-else-if="col.key === 'approach'">
                        {{ entry.performance.approachCount ?? '—' }}
                      </template>
                      <!-- Pilots Column -->
                      <template v-else-if="col.key === 'pilots'">
                        <div class="truncate">{{ entry.trainingElements || '—' }}</div>
                      </template>
                      <!-- Total Column -->
                      <template v-else-if="col.key === 'total'">
                        {{ formatNumber(entry.flightTime.total) }}
                      </template>
                    </td>
                    </tr>
                  </template>
                </tbody>
              </table>
        </div>
      </div>
    </div>
    </main>

    <!-- Backdrop Overlay for Edit Panel -->
    <Transition name="fade">
      <div
        v-if="expandedEntryId !== null"
        class="fixed inset-0 z-40 bg-black/50 pointer-events-none"
      ></div>
    </Transition>

    <!-- Right-Side Edit Panel -->
    <Transition name="slide-right">
      <div v-if="expandedEntryId !== null && inlineEditEntry" class="fixed right-0 top-0 h-full w-full md:w-[500px] lg:w-[600px] z-50" @keydown.escape="cancelInlineEdit" tabindex="-1">
        <div class="h-full flex flex-col shadow-2xl" :class="isDarkMode ? 'bg-gray-900 border-l border-gray-700' : 'bg-gray-50 border-l border-gray-200'">
          <!-- Panel Header -->
        <div 
          class="flex items-center justify-between p-4 border-b"
          :class="[
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          ]"
        >
          <h2 
            class="text-lg font-semibold font-quicksand"
            :class="[
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            ]"
          >
            Edit Flight Entry
          </h2>
          <button
            type="button"
            @click="cancelInlineEdit"
            :class="[
              'p-2 rounded-lg transition-colors text-xl leading-none',
              isDarkMode 
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
            ]"
            aria-label="Close panel"
          >
            ×
          </button>
          </div>
          
          <!-- Scrollable Form Content -->
          <div class="flex-1 overflow-y-auto p-6" data-edit-panel>
          <div v-if="inlineEditEntry" class="grid gap-6">
            
            <!-- Inline Edit Form (Simplified Version) -->
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
                    :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" 
                  />
                </div>
               </div>
            </div>

            <div class="grid gap-4 md:grid-cols-4">
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Date</label>
                <input v-model="inlineEditEntry.date" type="date" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" />
              </div>
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Role</label>
                <select v-model="inlineEditEntry.role" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']">
                  <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
                </select>
              </div>
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Aircraft</label>
                <input v-model="inlineEditEntry.aircraftMakeModel" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" />
              </div>
              <div class="relative">
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Ident</label>
                <input 
                  v-model="inlineEditEntry.registration" 
                  type="text" 
                  :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']"
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
                  :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-100 border-gray-300']"
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
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Flight Number</label>
                <input 
                  v-model="inlineEditEntry.flightNumber" 
                  type="text" 
                  :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']"
                  autocomplete="off"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div class="grid gap-4" style="grid-template-columns: 1fr 1fr 2fr 1.5fr;">
              <div class="relative">
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">From</label>
                <input 
                  v-model="inlineEditEntry.departure" 
                  type="text" 
                  :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']"
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
                  :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-100 border-gray-300']"
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
                  :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']"
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
                  :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-100 border-gray-300']"
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
              <div>
                <div class="flex gap-2">
                  <div class="flex-[0.6]">
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Category/Class</label>
                    <input v-model="inlineEditEntry.aircraftCategoryClass" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" placeholder="e.g. ASEL" />
                  </div>
                  <div class="flex-[1.4]">
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Time</label>
                    <input v-model.number="inlineEditEntry.categoryClassTime" type="number" step="0.1" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" placeholder="0.0" />
                  </div>
                </div>
              </div>
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Route</label>
                <input v-model="inlineEditEntry.route" type="text" :class="['w-full rounded border px-2 py-1 text-sm font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" />
              </div>
            </div>
            
            <!-- Flight Times Inline -->
             <div>
              <label :class="['block text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Time</label>
              <div class="flex gap-2 w-full">
                <div v-for="(label, key) in {total: 'Total Time', pic: 'PIC', sic: 'SIC', dual: 'Dual R', solo: 'Solo', night: 'Night', actualInstrument: 'Actual', dualGiven: 'Dual G', crossCountry: 'XC', simulatedInstrument: 'Hood'}" :key="key" class="flex-1">
                  <div :class="['text-[9px] uppercase font-bold mb-1 text-center whitespace-nowrap', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                    {{ label }}
                  </div>
                    <input 
                      :value="inlineEditEntry.flightTime[key] === null || inlineEditEntry.flightTime[key] === undefined || inlineEditEntry.flightTime[key] === 0 ? '' : String(inlineEditEntry.flightTime[key])"
                      type="text"
                      inputmode="decimal"
                    :placeholder="'0.0'"
                    :class="[
                      'w-full rounded border px-2 py-1 text-sm text-center font-mono',
                      key !== 'total' ? 'cursor-pointer' : '',
                      isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-100 border-gray-300',
                      (inlineEditEntry.flightTime[key] === null || inlineEditEntry.flightTime[key] === 0 || inlineEditEntry.flightTime[key] === undefined)
                        ? (isDarkMode ? 'text-gray-500' : 'text-gray-400')
                        : (isDarkMode ? 'text-white' : 'text-gray-900')
                    ]"
                    @input="(e) => {
                      if (!inlineEditEntry) return;
                      const input = e.target as HTMLInputElement;
                      const val = input.value.trim();
                      
                      // Handle empty input
                      if (val === '' || val === '-') {
                        inlineEditEntry.flightTime[key as FlightTimeKey] = null;
                        return;
                      }
                      
                      // Remove any non-numeric characters except decimal point and minus
                      const cleaned = val.replace(/[^\d.-]/g, '');
                      
                      // Parse as float
                      const num = parseFloat(cleaned);
                      
                      if (isNaN(num)) {
                        // Invalid input - revert to previous value or null
                        inlineEditEntry.flightTime[key as FlightTimeKey] = null;
                      } else {
                        // Ensure it's a valid number (not Infinity, etc.)
                        inlineEditEntry.flightTime[key as FlightTimeKey] = isFinite(num) ? num : null;
                      }
                    }"
                    @click="key !== 'total' && inlineEditEntry && fillFieldWithTotalTime(key as FlightTimeKey, inlineEditEntry.flightTime.total, true)"
                    @blur="(e) => {
                      if (!inlineEditEntry) return;
                      const input = e.target as HTMLInputElement;
                      const val = inlineEditEntry.flightTime[key];
                      
                      // Format display on blur
                      if (val === null || val === undefined) {
                        input.value = '';
                      } else if (val === 0) {
                        input.value = '0.0';
                      } else {
                        // Format to 1 decimal place
                        input.value = Number(val).toFixed(1);
                      }
                    }"
                    />
                  </div>
                </div>
             </div>

             <!-- Performance Inline -->
             <div class="grid gap-4 grid-cols-4">
               <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Day Ldg</label>
                  <input v-model.number="inlineEditEntry.performance.dayLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" />
               </div>
               <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Night Ldg</label>
                  <input v-model.number="inlineEditEntry.performance.nightLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" />
               </div>
               <div>
                  <div class="flex gap-2">
                    <div class="flex-1">
                      <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">App #</label>
                      <input v-model.number="inlineEditEntry.performance.approachCount" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" placeholder="0" />
                    </div>
                    <div class="flex-1">
                      <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">App Type</label>
                      <input v-model="inlineEditEntry.performance.approachType" type="text" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" placeholder="ILS" />
                    </div>
                  </div>
               </div>
               <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Holds</label>
                  <input v-model.number="inlineEditEntry.performance.holdingProcedures" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" />
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
                    : 'border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200'
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
                      : 'border-gray-400 bg-gray-100 text-blue-600 focus:ring-blue-500'
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
                    : 'border-gray-300 bg-gray-100 text-gray-900 placeholder-gray-400'
                ]"
              ></textarea>
            </div>

            <!-- Pilot Section -->
            <div>
              <label :class="['block text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Pilot</label>
              <div class="grid gap-4 md:grid-cols-3">
                <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Job</label>
                  <select v-model="inlineEditEntry.trainingInstructor" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']">
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
                    :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" 
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
                    :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-100 border-gray-300']"
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
                <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Number</label>
                  <input v-model="inlineEditEntry.instructorCertificate" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" placeholder="Certificate #" />
                </div>
               </div>
             </div>

            <div 
              class="flex items-center justify-between mt-2 pt-4 border-t"
              :class="[
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              ]"
            >
              <button
                type="button"
                @click.stop="expandedEntryId && confirmAndDeleteEntry(expandedEntryId)"
                :class="['text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1']"
              >
                Delete Entry
              </button>
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  @click.stop="cancelInlineEdit"
                  :class="['px-4 py-2 rounded-lg text-sm font-medium', isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-200']"
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
      </div>
    </Transition>

    <!-- Backdrop Overlay for Add Entry Panel -->
    <Transition name="fade">
      <div
        v-if="isEntryFormOpen"
        class="fixed inset-0 z-40 bg-black/50 pointer-events-none"
      ></div>
    </Transition>

    <!-- Right-Side Add Entry Panel -->
    <Transition name="slide-right">
      <div v-if="isEntryFormOpen" class="fixed right-0 top-0 h-full w-full md:w-[500px] lg:w-[600px] z-50" @keydown.escape="toggleEntryForm" tabindex="-1">
        <div class="h-full flex flex-col shadow-2xl" :class="isDarkMode ? 'bg-gray-900 border-l border-gray-700' : 'bg-gray-50 border-l border-gray-200'">
          <!-- Panel Header -->
          <div class="flex items-center justify-between p-4 border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
            <h2 class="text-lg font-semibold font-quicksand" :class="[isDarkMode ? 'text-gray-100' : 'text-gray-900']">
              New Log Entry
            </h2>
            <button
              type="button"
              @click="toggleEntryForm"
              :class="[
                'p-2 rounded-lg transition-colors text-xl leading-none',
                isDarkMode 
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
              ]"
              aria-label="Close panel"
            >
              ×
            </button>
          </div>
          
          <!-- Scrollable Form Content -->
          <div class="flex-1 overflow-y-auto p-6" data-add-entry-panel>
            <form class="grid gap-6" @submit.prevent="submitEntry">
              <div class="flex items-center justify-between mb-2">
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
                      :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" 
                    />
                  </div>
                 </div>
              </div>
            
              <div class="grid gap-4 md:grid-cols-4">
                <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Date</label>
                  <input v-model="newEntry.date" type="date" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" required />
                </div>
                <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Role</label>
                  <select v-model="newEntry.role" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']">
                    <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
                  </select>
                </div>
                <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Aircraft</label>
                  <input v-model="newEntry.aircraftMakeModel" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" required />
                </div>
                <div class="relative">
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Ident</label>
                  <input 
                    v-model="newEntry.registration" 
                    type="text" 
                    :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" 
                    required
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
                    :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-100 border-gray-300']"
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
                <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Flight Number</label>
                  <input 
                    v-model="newEntry.flightNumber" 
                    type="text" 
                    :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" 
                    autocomplete="off"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div class="grid gap-4" style="grid-template-columns: 1fr 1fr 2fr 1.5fr;">
                <div class="relative">
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">From</label>
                  <input 
                    v-model="newEntry.departure" 
                    type="text" 
                    :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" 
                    required
                    autocomplete="off"
                    @input="newEntry.departure = ($event.target as HTMLInputElement).value.toUpperCase()"
                    @focus="showFromDropdown = true; highlightedFromIndex = filteredAirportsForFrom.length > 0 ? 0 : -1"
                    @keydown="(e) => handleDropdownKeydown(e, 'from', filteredAirportsForFrom, (item) => selectAirportForFrom(item))"
                    @blur="handleFromBlur"
                  />
                  <!-- Airport FROM Dropdown -->
                  <div 
                    v-if="showFromDropdown && filteredAirportsForFrom.length > 0"
                    data-dropdown="from"
                    :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-100 border-gray-300']"
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
                    :class="['w-full rounded border px-2 py-1 text-sm uppercase font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" 
                    required
                    autocomplete="off"
                    @input="newEntry.destination = ($event.target as HTMLInputElement).value.toUpperCase()"
                    @focus="showToDropdown = true; highlightedToIndex = filteredAirportsForTo.length > 0 ? 0 : -1"
                    @keydown="(e) => handleDropdownKeydown(e, 'to', filteredAirportsForTo, (item) => selectAirportForTo(item))"
                    @blur="handleToBlur"
                  />
                  <!-- Airport TO Dropdown -->
                  <div 
                    v-if="showToDropdown && filteredAirportsForTo.length > 0"
                    data-dropdown="to"
                    :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-100 border-gray-300']"
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
                <div>
                  <div class="flex gap-2">
                    <div class="flex-[0.6]">
                      <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Category/Class</label>
                      <input v-model="newEntry.aircraftCategoryClass" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" placeholder="e.g. ASEL" />
                    </div>
                    <div class="flex-[1.4]">
                      <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Time</label>
                      <input v-model.number="newEntry.categoryClassTime" type="number" step="0.1" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" placeholder="0.0" />
                    </div>
                  </div>
                </div>
                <div>
                  <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Route</label>
                  <input v-model="newEntry.route" type="text" :class="['w-full rounded border px-2 py-1 text-sm font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" />
                </div>
              </div>
              
              <!-- Flight Times -->
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Time</label>
                <div class="flex gap-2 w-full">
                  <div v-for="field in flightTimeFields" :key="field.key" class="flex-1">
                    <div :class="['text-[9px] uppercase font-bold mb-1 text-center whitespace-nowrap', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                      {{ field.key === 'total' ? 'Total Time' : field.key === 'pic' ? 'PIC' : field.key === 'sic' ? 'SIC' : field.key === 'dual' ? 'Dual R' : field.key === 'solo' ? 'Solo' : field.key === 'night' ? 'Night' : field.key === 'actualInstrument' ? 'Actual' : field.key === 'dualGiven' ? 'Dual G' : field.key === 'crossCountry' ? 'XC' : field.key === 'simulatedInstrument' ? 'Hood' : field.label }}
                    </div>
                    <input
                      :value="newEntry.flightTime[field.key] === null || newEntry.flightTime[field.key] === undefined || newEntry.flightTime[field.key] === 0 ? '' : String(newEntry.flightTime[field.key])"
                      type="text"
                      inputmode="decimal"
                      :placeholder="'0.0'"
                      :class="[
                        'w-full rounded border px-2 py-1 text-sm text-center font-mono',
                        field.key !== 'total' ? 'cursor-pointer' : '',
                        isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-100 border-gray-300',
                        (newEntry.flightTime[field.key] === null || newEntry.flightTime[field.key] === 0 || newEntry.flightTime[field.key] === undefined)
                          ? (isDarkMode ? 'text-gray-500' : 'text-gray-400')
                          : (isDarkMode ? 'text-white' : 'text-gray-900')
                      ]"
                      @input="(e) => {
                        const input = e.target as HTMLInputElement;
                        const val = input.value.trim();
                        
                        // Handle empty input
                        if (val === '' || val === '-') {
                          newEntry.flightTime[field.key] = null;
                          return;
                        }
                        
                        // Remove any non-numeric characters except decimal point and minus
                        const cleaned = val.replace(/[^\d.-]/g, '');
                        
                        // Parse as float
                        const num = parseFloat(cleaned);
                        
                        if (isNaN(num)) {
                          // Invalid input - revert to previous value or null
                          newEntry.flightTime[field.key] = null;
                        } else {
                          // Ensure it's a valid number (not Infinity, etc.)
                          newEntry.flightTime[field.key] = isFinite(num) ? num : null;
                        }
                      }"
                      @click="field.key !== 'total' && fillFieldWithTotalTime(field.key, newEntry.flightTime.total, false)"
                      @blur="(e) => {
                        const input = e.target as HTMLInputElement;
                        const val = newEntry.flightTime[field.key];
                        
                        // Format display on blur
                        if (val === null || val === undefined) {
                          input.value = '';
                        } else if (val === 0) {
                          input.value = '0.0';
                        } else {
                          // Format to 1 decimal place
                          input.value = Number(val).toFixed(1);
                        }
                      }"
                    />
                  </div>
                </div>
              </div>

               <!-- Performance -->
               <div class="grid gap-4 grid-cols-4">
                 <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Day Ldg</label>
                    <input v-model.number="newEntry.performance.dayLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" />
                 </div>
                 <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Night Ldg</label>
                    <input v-model.number="newEntry.performance.nightLandings" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" />
                 </div>
                 <div>
                    <div class="flex gap-2">
                      <div class="flex-1">
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">App #</label>
                        <input v-model.number="newEntry.performance.approachCount" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" placeholder="0" />
                      </div>
                      <div class="flex-1">
                        <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">App Type</label>
                        <input v-model="newEntry.performance.approachType" type="text" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" placeholder="ILS" />
                      </div>
                    </div>
                 </div>
                 <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Holds</label>
                    <input v-model.number="newEntry.performance.holdingProcedures" type="number" min="0" :class="['w-full rounded border px-2 py-1 text-sm text-center font-mono', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" />
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
                      : 'border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200'
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
                        : 'border-gray-400 bg-gray-100 text-blue-600 focus:ring-blue-500'
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
                      : 'border-gray-300 bg-gray-100 text-gray-900 placeholder-gray-400'
                  ]"
                ></textarea>
              </div>

              <!-- Pilot Section -->
              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-2', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Pilot</label>
                <div class="grid gap-4 md:grid-cols-3">
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Job</label>
                    <select v-model="newEntry.trainingInstructor" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']">
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
                      :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" 
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
                      :class="['absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded border shadow-lg', isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-100 border-gray-300']"
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
                  <div>
                    <label :class="['block text-[10px] uppercase font-bold mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Number</label>
                    <input v-model="newEntry.instructorCertificate" type="text" :class="['w-full rounded border px-2 py-1 text-sm', isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900']" placeholder="Certificate #" />
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
                        : 'border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200'
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
      </div>
    </Transition>

    <!-- Pilot Profile Overlay -->
    <div
      v-if="showPilotProfile"
      class="fixed inset-0 z-40 flex items-start justify-center px-4 py-8"
    >
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showPilotProfile = false"></div>
      <div
        :class="[
          'relative w-full max-w-7xl overflow-y-auto rounded-3xl border shadow-2xl transition-colors duration-300 max-h-[90vh] p-6 sm:p-8 space-y-6',
          isDarkMode 
            ? 'bg-gray-900 border-gray-700 text-gray-100' 
            : 'bg-gray-100 border-gray-200 text-gray-900'
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
              isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
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
              isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-gray-100 border-gray-200'
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
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
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
                    isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
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
                    isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
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
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
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
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
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
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
                ]"
              ></textarea>
            </div>

            <!-- 8710 Form Fields -->
            <div class="pt-4 border-t" :class="isDarkMode ? 'border-gray-700' : 'border-gray-300'">
              <h3 :class="['text-sm font-semibold uppercase tracking-wide mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                FAA Form 8710 Information
              </h3>
              
              <div class="space-y-4">
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="space-y-2">
                    <label :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                      Date of Birth
                    </label>
                    <input
                      v-model="pilotProfile.dateOfBirth"
                      type="text"
                      placeholder="MM/DD/YYYY"
                      maxlength="10"
                      :class="[
                        'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200',
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
                      ]"
                    />
                  </div>
                  <div class="space-y-2">
                    <label :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                      Place of Birth
                    </label>
                    <input
                      v-model="pilotProfile.placeOfBirth"
                      type="text"
                      placeholder="City, State or City, Country"
                      :class="[
                        'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200',
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
                      ]"
                    />
                  </div>
                </div>

                <div class="space-y-2">
                  <label :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Residential Address
                  </label>
                  <input
                    v-model="pilotProfile.residentialAddress"
                    type="text"
                    placeholder="Street Address"
                    :class="[
                      'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200 mb-2',
                      isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
                    ]"
                  />
                  <div class="grid gap-2 sm:grid-cols-3">
                    <input
                      v-model="pilotProfile.residentialCity"
                      type="text"
                      placeholder="City"
                      :class="[
                        'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200',
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
                      ]"
                    />
                    <input
                      v-model="pilotProfile.residentialState"
                      type="text"
                      placeholder="State"
                      maxlength="2"
                      :class="[
                        'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200 uppercase',
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
                      ]"
                    />
                    <input
                      v-model="pilotProfile.residentialZip"
                      type="text"
                      placeholder="ZIP"
                      maxlength="10"
                      :class="[
                        'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200',
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
                      ]"
                    />
                  </div>
                </div>

                <div class="space-y-2">
                  <label :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Mailing Address <span class="text-xs normal-case font-normal">(if different from residential)</span>
                  </label>
                  <input
                    v-model="pilotProfile.mailingAddress"
                    type="text"
                    placeholder="Street Address (optional)"
                    :class="[
                      'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200 mb-2',
                      isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
                    ]"
                  />
                  <div class="grid gap-2 sm:grid-cols-3">
                    <input
                      v-model="pilotProfile.mailingCity"
                      type="text"
                      placeholder="City"
                      :class="[
                        'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200',
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
                      ]"
                    />
                    <input
                      v-model="pilotProfile.mailingState"
                      type="text"
                      placeholder="State"
                      maxlength="2"
                      :class="[
                        'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200 uppercase',
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
                      ]"
                    />
                    <input
                      v-model="pilotProfile.mailingZip"
                      type="text"
                      placeholder="ZIP"
                      maxlength="10"
                      :class="[
                        'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200',
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
                      ]"
                    />
                  </div>
                </div>

                <div class="space-y-2">
                  <label :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Certificate Number <span class="text-xs normal-case font-normal">(if applicable)</span>
                  </label>
                  <input
                    v-model="pilotProfile.certificateNumber"
                    type="text"
                    placeholder="e.g. 12345678"
                    :class="[
                      'w-full rounded-xl border px-4 py-2.5 font-quicksand focus:outline-none focus:ring-2 transition-colors duration-200',
                      isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
                    ]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="lg:col-span-2 space-y-6">
            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="card in pilotStatCards"
                :key="card.key"
                :class="[
                  'rounded-2xl border p-4',
                  isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-gray-100 border-gray-200'
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
                  isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-gray-100 border-gray-200'
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
                  isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-gray-100 border-gray-200'
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
                  isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-gray-100 border-gray-200'
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
                  isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-gray-100 border-gray-200'
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
                  isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-gray-100 border-gray-200'
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
                isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-gray-100 border-gray-200'
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
                isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-gray-100 border-gray-200'
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
                    isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-100'
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
                    isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-100'
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

    <!-- Form 8710 Generator Modal -->
    <div
      v-if="showForm8710Modal"
      class="fixed inset-0 z-40 flex items-start justify-center px-4 py-8"
    >
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showForm8710Modal = false"></div>
      <div
        :class="[
          'relative w-full max-w-4xl overflow-y-auto rounded-3xl border shadow-2xl transition-colors duration-300 max-h-[90vh] p-6 sm:p-8 space-y-6',
          isDarkMode 
            ? 'bg-gray-900 border-gray-700 text-gray-100' 
            : 'bg-gray-100 border-gray-200 text-gray-900'
        ]"
      >
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-semibold font-quicksand">
              Generate FAA Form 8710-1
            </h2>
            <p :class="['text-sm mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Pre-fill form with your logbook data
            </p>
          </div>
          <button
            @click="showForm8710Modal = false"
            :class="[
              'rounded-full p-2 transition-colors',
              isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            ]"
            aria-label="Close"
          >
            <Icon name="ri:close-line" size="22" />
          </button>
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
            'rounded-2xl border p-6 space-y-4',
            isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-gray-100 border-gray-200'
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
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
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
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 justify-end">
          <button
            @click="showForm8710Modal = false"
            :class="[
              'px-4 py-2 rounded-lg font-quicksand transition-colors',
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            ]"
          >
            Cancel
          </button>
          <button
            @click="showForm8710View = true; showForm8710Modal = false"
            :class="[
              'px-4 py-2 rounded-lg font-quicksand transition-colors flex items-center gap-2',
              isDarkMode ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
            ]"
          >
            <Icon name="ri:file-list-3-line" size="18" />
            View Form
          </button>
        </div>
      </div>
    </div>

    <!-- Form 8710 Full View -->
    <div
      v-if="showForm8710View"
      class="fixed inset-0 z-50 overflow-y-auto"
      :class="isDarkMode ? 'bg-gray-900' : 'bg-gray-100'"
    >
      <div class="min-h-screen p-4 sm:p-6 lg:p-8">
        <div class="max-w-6xl mx-auto">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6 print:hidden">
            <div>
              <h1 :class="['text-3xl font-bold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                FAA Form 8710-1
              </h1>
              <p :class="['text-sm mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
                Airman Certificate and/or Rating Application
              </p>
            </div>
            <div class="flex gap-3">
              <button
                @click="printForm8710"
                :class="[
                  'px-4 py-2 rounded-lg font-quicksand transition-colors flex items-center gap-2',
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
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                ]"
              >
                Close
              </button>
            </div>
          </div>

          <!-- Form Content -->
          <div
            :class="[
              'rounded-2xl border p-6 sm:p-8 space-y-8 print:p-0 print:border-0 print:rounded-none print:shadow-none',
              isDarkMode ? 'bg-gray-800 border-gray-700 print:bg-white print:text-black' : 'bg-white border-gray-300'
            ]"
            id="form8710-content"
          >
            <!-- Section I: Application Information -->
            <div class="space-y-4">
              <h2 :class="['text-xl font-bold border-b pb-2', isDarkMode ? 'text-white border-gray-600 print:text-black print:border-gray-400' : 'text-gray-900 border-gray-300']">
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
                
                <div v-if="form8710PreviewData?.sectionI?.certificateNumber">
                  <label :class="['block text-xs font-semibold uppercase mb-1', isDarkMode ? 'text-gray-400 print:text-gray-700' : 'text-gray-600']">
                    Certificate Number
                  </label>
                  <div :class="['px-3 py-2 rounded border', isDarkMode ? 'bg-gray-900 border-gray-600 text-white print:bg-white print:text-black print:border-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900']">
                    {{ form8710PreviewData.sectionI.certificateNumber }}
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
              <h2 :class="['text-xl font-bold border-b pb-2', isDarkMode ? 'text-white border-gray-600 print:text-black print:border-gray-400' : 'text-gray-900 border-gray-300']">
                II. RECENT EXPERIENCE
              </h2>
              
              <div class="overflow-x-auto">
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
              <h2 :class="['text-xl font-bold border-b pb-2', isDarkMode ? 'text-white border-gray-600 print:text-black print:border-gray-400' : 'text-gray-900 border-gray-300']">
                III. RECORD OF PILOT TIME
              </h2>
              
              <div class="overflow-x-auto">
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
                      <td :class="['px-2 py-2 border font-medium sticky left-0 z-10', isDarkMode ? 'border-gray-600 text-gray-300 bg-gray-800 print:text-black print:bg-white print:border-gray-400' : 'border-gray-300 text-gray-700 bg-white']">
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

            <!-- Footer Note -->
            <div :class="['text-xs mt-8 pt-4 border-t print:hidden', isDarkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-300']">
              <p>This form is generated by Logifi. Review all fields before submitting to FAA.</p>
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
            : 'bg-gray-200 border-gray-300'
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
            : 'bg-gray-200 border-gray-300'
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

    <!-- Crew/Instructor Profile Modal -->
    <div
      v-if="showCrewProfileModal && currentCrewName"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="closeCrewProfileModal"
    >
      <div
        :class="[
          'relative w-full max-w-lg rounded-2xl border shadow-2xl transition-colors duration-300',
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-gray-200 border-gray-300'
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
                autofocus
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
                  'rounded-lg p-3 flex items-center justify-between',
                  isDarkMode ? 'bg-gray-700/50' : 'bg-gray-300'
                ]"
              >
                <div>
                  <div :class="['text-sm font-quicksand font-medium', isDarkMode ? 'text-white' : 'text-gray-900']">
                    {{ flight.departure }} → {{ flight.destination }}
                  </div>
                  <div :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
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
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
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
            <span>Rename Family...</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Rename Aircraft Family Modal -->
    <div
      v-if="showRenameFamilyModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="closeRenameFamilyModal"
    >
      <div
        :class="[
          'relative w-full max-w-md rounded-2xl border shadow-2xl transition-colors duration-300',
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-gray-200 border-gray-300'
        ]"
        @click.stop
      >
        <div class="flex items-center justify-between p-6 border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
          <h3 :class="['text-xl font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
            Rename Aircraft Family
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

          <div v-if="renameFamilyNewName.trim() && normalizeAircraftFamily(renameFamilyNewName.trim()) !== renameFamilyOldName" class="rounded-lg p-3" :class="[isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100']">
            <div :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              <span class="font-semibold">Note:</span> 
              <span v-if="catalogs.families?.includes(normalizeAircraftFamily(renameFamilyNewName.trim()))">
                This will merge with the existing "{{ normalizeAircraftFamily(renameFamilyNewName.trim()) }}" family.
              </span>
              <span v-else>
                This will create a new family group.
              </span>
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
            :disabled="!renameFamilyNewName.trim() || renameFamilyNewName.trim() === renameFamilyOldName"
            :class="[
              'px-4 py-2 rounded-lg font-semibold font-quicksand transition-colors',
              (!renameFamilyNewName.trim() || renameFamilyNewName.trim() === renameFamilyOldName)
                ? (isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                : (isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700')
            ]"
          >
            Rename
          </button>
        </div>
      </div>
    </div>

    <!-- Import Preview Modal -->
    <div
      v-if="showImportPreview && importPreviewStatistics && importPreviewMetadata"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="cancelImport"
    >
      <div
        :class="[
          'relative w-full max-w-4xl max-h-[90vh] rounded-2xl border shadow-2xl transition-colors duration-300 flex flex-col',
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-gray-200 border-gray-300'
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
            <h4 :class="['text-lg font-semibold font-quicksand mb-4', isDarkMode ? 'text-white' : 'text-gray-900']">
              Flight Time
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Total</div>
                <div :class="['text-lg font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ importPreviewStatistics.totalFlightTime.toFixed(1) }}h
                </div>
              </div>
              <div :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">PIC</div>
                <div :class="['text-lg font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ importPreviewStatistics.picTime.toFixed(1) }}h
                </div>
              </div>
              <div :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Night</div>
                <div :class="['text-lg font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ importPreviewStatistics.nightTime.toFixed(1) }}h
                </div>
              </div>
              <div :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">XC</div>
                <div :class="['text-lg font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ importPreviewStatistics.crossCountryTime.toFixed(1) }}h
                </div>
              </div>
              <div :class="['rounded-lg border p-3', isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-white']">
                <div :class="['text-xs font-quicksand mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Instrument</div>
                <div :class="['text-lg font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ (importPreviewStatistics.actualInstrumentTime + importPreviewStatistics.simulatedInstrumentTime).toFixed(1) }}h
                </div>
              </div>
            </div>
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
          </div>

          <!-- Entry List -->
          <div>
            <h4 :class="['text-lg font-semibold font-quicksand mb-4', isDarkMode ? 'text-white' : 'text-gray-900']">
              Entries to Import ({{ importPreviewEntries.length }})
            </h4>
            <div class="space-y-2 max-h-96 overflow-y-auto">
              <div
                v-for="entry in importPreviewEntries"
                :key="entry.id"
                :class="[
                  'rounded-lg border p-3 cursor-pointer transition-colors',
                  isDarkMode 
                    ? 'border-gray-700 bg-gray-900/30 hover:bg-gray-900/50' 
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                ]"
                @click="togglePreviewEntry(entry.id)"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3">
                      <div :class="['text-sm font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900']">
                        {{ formatDisplayDate(entry.date) }}
                      </div>
                      <div :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                        {{ entry.registration }}
                      </div>
                      <div :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                        {{ entry.aircraftMakeModel }}
                      </div>
                    </div>
                    <div class="flex items-center gap-2 mt-1">
                      <div :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                        {{ entry.departure }} → {{ entry.destination }}
                      </div>
                      <div :class="['text-xs font-mono', isDarkMode ? 'text-blue-400' : 'text-blue-600']">
                        {{ (entry.flightTime.total ?? 0).toFixed(1) }}h
                      </div>
                    </div>
                  </div>
                  <Icon 
                    :name="expandedPreviewEntries.has(entry.id) ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'" 
                    size="20" 
                    :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']"
                  />
                </div>
                <div v-if="expandedPreviewEntries.has(entry.id)" class="mt-3 pt-3 border-t" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div><span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">Role:</span> <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ entry.role }}</span></div>
                    <div><span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">PIC:</span> <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ (entry.flightTime.pic ?? 0).toFixed(1) }}h</span></div>
                    <div><span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">Night:</span> <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ (entry.flightTime.night ?? 0).toFixed(1) }}h</span></div>
                    <div><span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">XC:</span> <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ (entry.flightTime.crossCountry ?? 0).toFixed(1) }}h</span></div>
                    <div><span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">Landings:</span> <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ (entry.performance.dayLandings ?? 0) + (entry.performance.nightLandings ?? 0) }}</span></div>
                    <div><span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">Approaches:</span> <span :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ entry.performance.approachCount ?? 0 }}</span></div>
                  </div>
                  <div v-if="entry.remarks" class="mt-2 text-xs" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-600']">
                    {{ entry.remarks }}
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
            :class="[
              'px-4 py-2 rounded-lg font-quicksand transition-colors',
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
            ]"
          >
            Cancel
          </button>
          <button
            @click="confirmImport"
            :class="[
              'px-4 py-2 rounded-lg font-quicksand transition-colors',
              'bg-green-600 hover:bg-green-700 text-white'
            ]"
          >
            Confirm Import
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch, watchEffect } from 'vue'
import {
  LOGBOOK_STORAGE_KEY,
  createEmptyFlightTime,
  createEmptyPerformance,
  createEmptyOOOI,
  DEFAULT_COLUMN_CONFIG
} from '~/utils/logbookTypes'
import type {
  CatalogKey,
  EditableLogEntry,
  FlightTimeBreakdown,
  FlightTimeKey,
  LogEntry,
  LogbookColumnConfig,
  LogbookColumnKey,
  PerformanceKey,
  PerformanceMetrics
} from '~/utils/logbookTypes'
import { useAircraftLookup } from '~/composables/useAircraftLookup'
import type { AircraftInfo } from '~/composables/useAircraftLookup'
import { useAirportLookup } from '~/composables/useAirportLookup'
import type { AirportInfo } from '~/composables/useAirportLookup'
import { calculateNightTime } from '~/utils/nightTimeCalculator'
import { DateTime } from 'luxon'
import { calculateSectionII, calculateSectionIII } from '~/utils/form8710Calculator'
import type { Form8710Data, AircraftCategory8710 } from '~/utils/form8710Types'
import { supabase } from '~/lib/supabase'

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
  { key: 'simulatedInstrument', label: 'Simulator / Training Device' }
] as const

const performanceFields: readonly { key: PerformanceKey; label: string }[] = [
  { key: 'dayLandings', label: 'Day Landings' },
  { key: 'nightLandings', label: 'Night Landings' },
  { key: 'approachCount', label: 'Approach Count' },
  { key: 'approachType', label: 'Approach Type' },
  { key: 'holdingProcedures', label: 'Holding Procedures' }
] as const

const PILOT_PROFILE_STORAGE_KEY = 'logifi://pilot-profile'
const CREW_PROFILES_STORAGE_KEY = 'logifi://crew-profiles'

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

// Column configuration for logbook table
const COLUMN_CONFIG_STORAGE_KEY = 'logifi-logbook-columns'
const columnConfig = ref<LogbookColumnConfig[]>(DEFAULT_COLUMN_CONFIG.map(c => ({ ...c })))

// Load column configuration from localStorage
function loadColumnConfig(): void {
  if (!isBrowser) return
  const saved = window.localStorage.getItem(COLUMN_CONFIG_STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as LogbookColumnConfig[]
      // Validate the saved config and merge with defaults
      if (Array.isArray(parsed)) {
        // Start with defaults and merge saved values
        const merged = DEFAULT_COLUMN_CONFIG.map(defaultCol => {
          const savedCol = parsed.find(p => p.key === defaultCol.key)
          if (savedCol) {
            // Use saved values but ensure required fields match defaults
            return {
              ...savedCol,
              required: defaultCol.required,
              label: defaultCol.label,
              responsiveClass: defaultCol.responsiveClass,
              width: savedCol.width ?? defaultCol.width, // Preserve saved width or use default
              visible: defaultCol.required ? true : savedCol.visible // Force required columns to be visible
            }
          }
          // New column not in saved config, use default
          return { ...defaultCol }
        })
        // Ensure required columns are visible
        merged.forEach(col => {
          if (col.required) col.visible = true
        })
        columnConfig.value = merged
        saveColumnConfig() // Save merged config back to update localStorage with new columns
        return
      }
    } catch {
      // Invalid JSON, use defaults
    }
  }
  columnConfig.value = DEFAULT_COLUMN_CONFIG.map(c => ({ ...c }))
}

// Save column configuration to localStorage
function saveColumnConfig(): void {
  if (!isBrowser) return
  window.localStorage.setItem(COLUMN_CONFIG_STORAGE_KEY, JSON.stringify(columnConfig.value))
}

// Computed: visible columns sorted by order
const visibleColumns = computed(() => {
  return columnConfig.value
    .filter(col => col.visible)
    .sort((a, b) => a.order - b.order)
})

// Toggle column visibility
function toggleColumnVisibility(key: LogbookColumnKey): void {
  const col = columnConfig.value.find(c => c.key === key)
  if (!col || col.required) return // Can't hide required columns
  
  // Ensure at least one non-required column remains visible
  const visibleNonRequired = columnConfig.value.filter(c => c.visible && !c.required)
  if (visibleNonRequired.length === 1 && col.visible) {
    // Can't hide the last visible non-required column
    return
  }
  
  col.visible = !col.visible
  saveColumnConfig()
}

// Reorder columns
function reorderColumns(draggedKey: LogbookColumnKey, targetOrder: number): void {
  const draggedCol = columnConfig.value.find(c => c.key === draggedKey)
  if (!draggedCol) return
  
  const currentOrder = draggedCol.order
  
  // Update orders
  columnConfig.value.forEach(col => {
    if (col.key === draggedKey) {
      col.order = targetOrder
    } else if (targetOrder < currentOrder) {
      // Moving up: shift columns down
      if (col.order >= targetOrder && col.order < currentOrder) {
        col.order += 1
      }
    } else {
      // Moving down: shift columns up
      if (col.order > currentOrder && col.order <= targetOrder) {
        col.order -= 1
      }
    }
  })
  
  saveColumnConfig()
}

// Reset to defaults
function resetColumnConfig(): void {
  columnConfig.value = DEFAULT_COLUMN_CONFIG.map(c => ({ ...c }))
  saveColumnConfig()
}

// Drag and drop state
const draggedColumnKey = ref<LogbookColumnKey | null>(null)

// Handle column drop for reordering
function handleColumnDrop(targetKey: LogbookColumnKey): void {
  if (!draggedColumnKey.value || draggedColumnKey.value === targetKey) {
    draggedColumnKey.value = null
    return
  }
  
  const targetCol = columnConfig.value.find(c => c.key === targetKey)
  if (!targetCol) {
    draggedColumnKey.value = null
    return
  }
  
  reorderColumns(draggedColumnKey.value, targetCol.order)
  draggedColumnKey.value = null
}

// Column resize state
const resizingColumn = ref<LogbookColumnKey | null>(null)
const resizeStartX = ref(0)
const resizeStartWidth = ref(0)

// Start column resize
function startResize(columnKey: LogbookColumnKey, event: MouseEvent): void {
  const col = columnConfig.value.find(c => c.key === columnKey)
  if (!col) return
  
  resizingColumn.value = columnKey
  resizeStartX.value = event.clientX
  resizeStartWidth.value = col.width ?? 100
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  event.preventDefault()
}

// Handle resize during drag
function handleResize(event: MouseEvent): void {
  if (!resizingColumn.value) return
  
  const col = columnConfig.value.find(c => c.key === resizingColumn.value)
  if (!col) return
  
  const deltaX = event.clientX - resizeStartX.value
  const newWidth = Math.max(50, resizeStartWidth.value + deltaX) // Minimum width of 50px
  
  col.width = newWidth
}

// Stop resize
function stopResize(): void {
  if (resizingColumn.value) {
    saveColumnConfig()
  }
  resizingColumn.value = null
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// Reset column widths to defaults
function resetColumnWidths(): void {
  columnConfig.value.forEach(col => {
    const defaultCol = DEFAULT_COLUMN_CONFIG.find(d => d.key === col.key)
    if (defaultCol && defaultCol.width) {
      col.width = defaultCol.width
    }
  })
  saveColumnConfig()
}

// Helper function to get padding classes for headers and cells (must match)
function getColumnPadding(col: LogbookColumnConfig): string[] {
  switch (col.key) {
    case 'date':
    case 'total':
      return ['px-3', 'py-3']
    default:
      return ['px-2', 'py-3']
  }
}

// Helper function to get text alignment for headers (must match cells)
function getHeaderTextAlign(col: LogbookColumnConfig): string {
  // Right-align numeric columns to match cell alignment
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

// Helper function to get cell classes for a column
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

// Helper function to get cell text color classes
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
    // Close Add Entry form when opening inline edit
    isEntryFormOpen.value = false
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
    aircraftCategoryClass: normalizeCategoryClassLabel(inlineEditEntry.value.aircraftCategoryClass.trim()),
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
    performance: performanceFields.reduce<PerformanceMetrics>((acc, field) => {
      if (field.key === 'approachType') {
        acc[field.key] = (inlineEditEntry.value!.performance[field.key] as string | null) ?? null
      } else {
        acc[field.key] = inlineEditEntry.value!.performance[field.key] ?? null
      }
      return acc
    }, {} as PerformanceMetrics),
    flightConditions: sanitizeFlightConditions([...inlineEditEntry.value.flightConditions]),
    oooi: inlineEditEntry.value.oooi && Object.values(inlineEditEntry.value.oooi).some(v => v) ? { ...inlineEditEntry.value.oooi } : undefined
  }

  // Update the entry in the list
  const targetId = inlineEditEntry.value.id
  logEntries.value = sortEntriesByDateAndOOOI(
    logEntries.value.map((e) => 
      e.id === targetId ? updatedEntry : e
    )
  )

  console.log('[SaveInlineEdit] Entry saved. Updated night time in logEntries:', 
    logEntries.value.find(e => e.id === targetId)?.flightTime.night
  )
  console.log('[SaveInlineEdit] Full flightTime object:', 
    logEntries.value.find(e => e.id === targetId)?.flightTime
  )

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
const showColumnSettings = ref(false)
const showInlineIdentDropdown = ref(false)
const showFromDropdown = ref(false)
const showInlineFromDropdown = ref(false)
const showToDropdown = ref(false)
const showInlineToDropdown = ref(false)
const showPilotNameDropdown = ref(false)
const showInlinePilotNameDropdown = ref(false)

// Highlighted index for keyboard navigation
const highlightedIdentIndex = ref(-1)
const highlightedInlineIdentIndex = ref(-1)
const highlightedFromIndex = ref(-1)
const highlightedInlineFromIndex = ref(-1)
const highlightedToIndex = ref(-1)
const highlightedInlineToIndex = ref(-1)
const highlightedPilotIndex = ref(-1)
const highlightedInlinePilotIndex = ref(-1)
const isDarkMode = ref(true)
const pilotProfile = reactive<PilotProfilePrefs>({ ...pilotProfileDefaults })
const pilotProfileLoaded = ref(false)
const csvFileInput = ref<HTMLInputElement | null>(null)

// Form 8710 state
const showForm8710Modal = ref(false)
const showForm8710View = ref(false)
const form8710PreviewData = ref<Form8710Data | null>(null)
const form8710Warnings = computed<string[]>(() => {
  const warnings: string[] = []
  
  if (!pilotProfile.name) warnings.push('Name is missing in Pilot Profile')
  if (!pilotProfile.dateOfBirth) warnings.push('Date of Birth is missing in Pilot Profile')
  if (!pilotProfile.placeOfBirth) warnings.push('Place of Birth is missing in Pilot Profile')
  if (!pilotProfile.residentialAddress) warnings.push('Residential Address is missing in Pilot Profile')
  
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
  errorMessages: string[]
}

interface ImportMetadata {
  fileName: string
  fileType: 'CSV' | 'JSON'
  importedAt: string
}

const showImportPreview = ref(false)
const importPreviewEntries = ref<LogEntry[]>([])
const importPreviewStatistics = ref<ImportStatistics | null>(null)
const importPreviewMetadata = ref<ImportMetadata | null>(null)
const expandedPreviewEntries = ref<Set<string>>(new Set())
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
  categoryClass: {} as Record<string, boolean>, // key: category/class (e.g., 'ASEL', 'AMEL')
  flagged: false // filter for flagged entries
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
    'Flight Number',
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
    // simulatedInstrument represents hood time (simulated instrument time in actual flight)
    const actualVal = entry.flightTime.actualInstrument
    const simulatedVal = entry.flightTime.simulatedInstrument
    return [
      actualVal ? formatTimeValue(actualVal) : '',
      simulatedVal ? formatTimeValue(simulatedVal) : ''
    ]
  }

  const rows = logEntries.value.map((entry) => {
    return [
      formatDisplayDate(entry.date),
      entry.role || '',
      entry.aircraftCategoryClass || '',
      entry.aircraftMakeModel || '',
      entry.registration || '',
      entry.flightNumber || '',
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
      '0.0', // Ground Simulator - Logifi doesn't track ground simulator time separately
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

    return {
      sectionI,
      sectionII,
      sectionIII
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

// Import functions
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function parseCSVContent(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  const firstLine = lines[0]
  if (!firstLine) return []
  
  // Detect delimiter: count tabs vs commas in first line
  const tabCount = (firstLine.match(/\t/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const delimiter = tabCount > commaCount ? '\t' : ','
  
  console.log(`Detected delimiter: ${delimiter === '\t' ? 'TAB' : 'COMMA'} (tabs: ${tabCount}, commas: ${commaCount})`)
  
  const headers = parseCSVLine(firstLine, delimiter).map((h: string) => h.trim().replace(/^"|"$/g, ''))
  const rows: Record<string, string>[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const values = parseCSVLine(line, delimiter).map((v: string) => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
    if (values.length === 0 || values.every(v => !v)) continue // Skip empty rows
    
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
  }
  
  return rows
}

// Helper function to find a field value by trying multiple possible column names
function findFieldValue(rawEntry: Record<string, any>, possibleNames: string[]): string {
  for (const name of possibleNames) {
    // Try exact match first
    if (rawEntry[name] !== undefined && rawEntry[name] !== null && rawEntry[name] !== '') {
      return String(rawEntry[name]).trim()
    }
    // Try case-insensitive match
    const lowerName = name.toLowerCase()
    for (const key in rawEntry) {
      if (key.toLowerCase() === lowerName && rawEntry[key] !== undefined && rawEntry[key] !== null && rawEntry[key] !== '') {
        return String(rawEntry[key]).trim()
      }
    }
  }
  return ''
}

// Convert a name string to proper title case (e.g., "CHASE ALBRIGHT" -> "Chase Albright")
function toTitleCase(str: string): string {
  if (!str || !str.trim()) return str
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
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

async function normalizeImportedEntry(rawEntry: Record<string, any>): Promise<LogEntry | null> {
  try {
    // Parse date - handle various formats
    const dateValue = findFieldValue(rawEntry, [
      'flight_flightDate',  // Logten
      'Date', 'date', 'DATE', 'Flight Date', 'flight date'
    ])
    let dateStr = dateValue
    if (!dateStr) return null
    
    // Normalize to YYYY-MM-DD format
    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Already in correct format
    } else {
      // Try MM/DD/YYYY format (from Logifi export)
      const parts = dateStr.split('/')
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
      } else {
        // Try parsing with Date object as fallback
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) {
          return null // Invalid date
        }
        const isoString = date.toISOString().split('T')[0]
        if (isoString) {
          dateStr = isoString
        } else {
          return null
        }
      }
    }
    
    // Validate the final date string
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return null // Invalid date format
    }
    
    // Required fields - try multiple common column names for registration
    // Try Logten field names first (they use aircraft_ prefix for registration!)
    let registration = findFieldValue(rawEntry, [
      'aircraft_aircraftID',  // Logten uses this for registration!
      'flight_aircraft', 'flight_aircraftID', 'flight_aircraftRegistration', 'flight_tailNumber', 
      'flight_aircraftIdentifier', 'flight_aircraftIdentifierID',  // Logten variations
      'Tail Number', 'tail number', 'TailNumber', 'tailNumber',  // MyFlightBook uses this
      'Display Tail', 'display tail',  // MyFlightBook also has this
      'Registration', 'registration', 'REGISTRATION',
      'N-Number', 'n-number', 'NNumber', 'nNumber',
      'Aircraft Registration', 'aircraft registration',
      'Ident', 'ident', 'IDENT',
      'Aircraft', 'aircraft', 'AIRCRAFT',
      'Aircraft ID', 'aircraft id', 'AircraftID', 'aircraftID'  // Put this last as fallback
    ])
    
    // Fallback: Search all columns for anything that looks like an aircraft registration
    // This helps with exports where the column name might be unexpected
    if (!registration) {
      for (const key in rawEntry) {
        const value = String(rawEntry[key] || '').trim().toUpperCase()
        // Check if value looks like an aircraft registration (N-number pattern)
        // US registrations: N followed by 1-5 digits, optionally followed by letters
        if (value && /^N\d{1,5}[A-Z]*$/.test(value)) {
          registration = value
          console.log(`Found aircraft registration in column "${key}": ${registration}`)
          break
        }
      }
    }
    
    if (!registration) return null
    
    // Map CSV/JSON fields to LogEntry format
    const entry: LogEntry = {
      id: generateEntryId(),
      date: dateStr,
      role: (() => {
        // Determine role from PIC/SIC time values
        const picTime = normalizeNumber(rawEntry.flight_pic || rawEntry.PIC || rawEntry.pic || 0) || 0
        const sicTime = normalizeNumber(rawEntry.flight_sic || rawEntry.SIC || rawEntry.sic || 0) || 0
        
        if (picTime > 0) {
          return 'PIC'
        } else if (sicTime > 0) {
          return 'SIC'
        }
        
        // Fallback to existing role field
        return findFieldValue(rawEntry, ['Role', 'role', 'ROLE']) || ''
      })(),
      aircraftCategoryClass: normalizeCategoryClassLabel(
        findFieldValue(rawEntry, [
          'aircraftType_selectedAircraftClass',  // Logten (e.g., "Multi-Engine Land")
          'aircraftType_selectedCategory',  // Logten (e.g., "Airplane")
          'Aircraft Category/Class', 'aircraft category/class',
          'Category/Class', 'category/class', 'Category Class', 'category class',
          'aircraftCategoryClass'
        ]) || ''
      ),
      categoryClassTime: normalizeNumber(rawEntry.flight_totalTime || rawEntry['Total Flight Time'] || rawEntry.total || rawEntry.flightTime?.total),
      aircraftMakeModel: extractBaseModelName(
        findFieldValue(rawEntry, [
          'aircraftType_model',  // Logten
          'Aircraft Make/Model', 'aircraft make/model',
          'Model', 'model', 'MODEL',
          'aircraftMakeModel'
        ]) || (() => {
          // Try combining make and model from Logten
          const make = findFieldValue(rawEntry, ['aircraftType_make'])
          const model = findFieldValue(rawEntry, ['aircraftType_model'])
          if (make && model) {
            return `${make} ${model}`.trim()
          }
          return ''
        })()
      ),
      registration: registration.toUpperCase(),
      flightNumber: findFieldValue(rawEntry, [
        'flight_flightNumber',  // Logten
        'Flight Number', 'flight number', 'FlightNumber', 'flightNumber'
      ]) || null,
      departure: '', // Will be set below after route parsing
      destination: '', // Will be set below after route parsing
      route: '', // Will be set below
      trainingElements: (() => {
        // Try Logten crew fields first - show the OTHER pilot (not the logged-in user)
        const picCrew = findFieldValue(rawEntry, ['flight_selectedCrewPIC'])
        const sicCrew = findFieldValue(rawEntry, ['flight_selectedCrewSIC'])
        const picTime = normalizeNumber(rawEntry.flight_pic || rawEntry.PIC || rawEntry.pic || 0) || 0
        const sicTime = normalizeNumber(rawEntry.flight_sic || rawEntry.SIC || rawEntry.sic || 0) || 0
        
        // Get the logged-in user's name from pilot profile
        const userName = (pilotProfile.name || '').trim()
        
        // Determine which pilot to show (the OTHER one, not the user)
        let pilot = ''
        
        if (userName) {
          // Check if user matches PIC crew
          const userIsPIC = picCrew && picCrew.trim().toLowerCase() === userName.toLowerCase()
          // Check if user matches SIC crew
          const userIsSIC = sicCrew && sicCrew.trim().toLowerCase() === userName.toLowerCase()
          
          if (userIsPIC && sicCrew) {
            // User is PIC, show SIC
            pilot = sicCrew
          } else if (userIsSIC && picCrew) {
            // User is SIC, show PIC
            pilot = picCrew
          } else if (!userIsPIC && !userIsSIC) {
            // User doesn't match either, use PIC if available, otherwise SIC
            if (picTime > 0 && picCrew) {
              pilot = picCrew
            } else if (sicTime > 0 && sicCrew) {
              pilot = sicCrew
            }
          }
        } else {
          // No user name available, use PIC if available, otherwise SIC
          if (picTime > 0 && picCrew) {
            pilot = picCrew
          } else if (sicTime > 0 && sicCrew) {
            pilot = sicCrew
          }
        }
        
        // Fallback: Try "First Officer Name" column (MyFlightBook)
        if (!pilot) {
          pilot = findFieldValue(rawEntry, ['First Officer Name', 'first officer name', 'FirstOfficerName', 'firstOfficerName'])
        }
        
        // Fallback: Extract from "Flight Properties" field
        if (!pilot) {
          const flightProperties = findFieldValue(rawEntry, ['Flight Properties', 'flight properties', 'FlightProperties', 'flightProperties'])
          if (flightProperties) {
            // Look for patterns like "First Officer: Name" or "First Officer:Name"
            const firstOfficerMatch = flightProperties.match(/First\s+Officer\s*:\s*([^;]+)/i)
            if (firstOfficerMatch && firstOfficerMatch[1]) {
              pilot = firstOfficerMatch[1].trim()
            }
          }
        }
        
        // If still no pilot found, use Training Elements as fallback
        if (!pilot) {
          pilot = findFieldValue(rawEntry, ['Training Elements', 'training elements', 'TrainingElements', 'trainingElements'])
        }
        
        return toTitleCase(pilot || '')
      })(),
      trainingInstructor: (() => {
        // First check if there's an explicit Training Instructor field
        const explicitInstructor = (rawEntry['Training Instructor'] || rawEntry.trainingInstructor || '').trim()
        if (explicitInstructor) {
          return toTitleCase(explicitInstructor)
        }
        
        // For Logten imports, determine job based on which crew field the pilot name appears in
        // We need to determine the pilot name again (same logic as trainingElements)
        const picCrew = findFieldValue(rawEntry, ['flight_selectedCrewPIC'])
        const sicCrew = findFieldValue(rawEntry, ['flight_selectedCrewSIC'])
        const instructorCrew = findFieldValue(rawEntry, ['flight_selectedCrewInstructor'])
        const studentCrew = findFieldValue(rawEntry, ['flight_selectedCrewStudent'])
        const picTime = normalizeNumber(rawEntry.flight_pic || rawEntry.PIC || rawEntry.pic || 0) || 0
        const sicTime = normalizeNumber(rawEntry.flight_sic || rawEntry.SIC || rawEntry.sic || 0) || 0
        
        // Get the logged-in user's name from pilot profile
        const userName = (pilotProfile.name || '').trim()
        
        // Determine which pilot name we're showing (same logic as trainingElements)
        let pilotName = ''
        
        if (userName) {
          const userIsPIC = picCrew && picCrew.trim().toLowerCase() === userName.toLowerCase()
          const userIsSIC = sicCrew && sicCrew.trim().toLowerCase() === userName.toLowerCase()
          
          if (userIsPIC && sicCrew) {
            pilotName = sicCrew
          } else if (userIsSIC && picCrew) {
            pilotName = picCrew
          } else if (!userIsPIC && !userIsSIC) {
            if (picTime > 0 && picCrew) {
              pilotName = picCrew
            } else if (sicTime > 0 && sicCrew) {
              pilotName = sicCrew
            }
          }
        } else {
          if (picTime > 0 && picCrew) {
            pilotName = picCrew
          } else if (sicTime > 0 && sicCrew) {
            pilotName = sicCrew
          }
        }
        
        // Fallbacks (simplified - just check for name, not all the complex logic)
        if (!pilotName) {
          pilotName = findFieldValue(rawEntry, ['First Officer Name', 'first officer name', 'FirstOfficerName', 'firstOfficerName'])
        }
        if (!pilotName) {
          pilotName = findFieldValue(rawEntry, ['Training Elements', 'training elements', 'TrainingElements', 'trainingElements'])
        }
        
        if (!pilotName) return ''
        
        // Normalize names for comparison (case-insensitive)
        const normalizedPilotName = pilotName.trim().toLowerCase()
        
        // Check in priority order: Instructor, Student, PIC (Captain), SIC (First Officer)
        if (instructorCrew && instructorCrew.trim().toLowerCase() === normalizedPilotName) {
          return 'Instructor'
        }
        if (studentCrew && studentCrew.trim().toLowerCase() === normalizedPilotName) {
          return 'Student'
        }
        if (picCrew && picCrew.trim().toLowerCase() === normalizedPilotName) {
          return 'Captain'
        }
        if (sicCrew && sicCrew.trim().toLowerCase() === normalizedPilotName) {
          return 'First Officer'
        }
        
        // No match found, return empty
        return ''
      })(),
      instructorCertificate: (rawEntry['Instructor Certificate'] || rawEntry.instructorCertificate || '').trim(),
      flightConditions: [],
      remarks: findFieldValue(rawEntry, ['Remarks', 'remarks', 'Comments', 'comments', 'COMMENTS']) || '',
      flightTime: {
        // For Logten imports, we'll calculate total from OOOI times later, so start with null
        // For other imports, use the provided total time
        total: (() => {
          const hasLogtenOOOI = !!(findFieldValue(rawEntry, ['flight_actualDepartureTime']) || findFieldValue(rawEntry, ['flight_actualArrivalTime']))
          if (hasLogtenOOOI) {
            return null // Will be calculated from OOOI times
          }
          return normalizeNumber(rawEntry.flight_totalTime || rawEntry['Total Flight Time'] || rawEntry.total || rawEntry.flightTime?.total)
        })(),
        pic: normalizeNumber(rawEntry.flight_pic || rawEntry.PIC || rawEntry.pic || rawEntry.flightTime?.pic),
        sic: normalizeNumber(rawEntry.flight_sic || rawEntry.SIC || rawEntry.sic || rawEntry.flightTime?.sic),
        dual: normalizeNumber(rawEntry.flight_dualReceived || rawEntry['Dual Received'] || rawEntry.dual || rawEntry.flightTime?.dual),
        solo: normalizeNumber(rawEntry.flight_solo || rawEntry.Solo || rawEntry['Solo Time'] || rawEntry.solo || rawEntry.flightTime?.solo),
        night: normalizeNumber(rawEntry.flight_night || rawEntry.Night || rawEntry.night || rawEntry.flightTime?.night),
        actualInstrument: normalizeNumber(rawEntry.flight_actualInstrument || rawEntry['Actual Instrument'] || rawEntry.IMC || rawEntry.imc || rawEntry.actualInstrument || rawEntry.flightTime?.actualInstrument),
        dualGiven: normalizeNumber(rawEntry.flight_dualGiven || rawEntry['Dual Given'] || rawEntry.CFI || rawEntry.cfi || rawEntry.dualGiven || rawEntry.flightTime?.dualGiven),
        crossCountry: normalizeNumber(rawEntry.flight_crossCountry || rawEntry['Cross Country'] || rawEntry['X-Country'] || rawEntry['X-C'] || rawEntry.crossCountry || rawEntry.flightTime?.crossCountry),
        // IMPORTANT: Map "Simulated Instrument" to simulatedInstrument (hood time)
        // NOT "Ground Simulator" - that's a different field
        simulatedInstrument: normalizeNumber(rawEntry.flight_simulatedInstrument || rawEntry['Simulated Instrument'] || rawEntry.simulatedInstrument || rawEntry.hood || rawEntry.flightTime?.simulatedInstrument)
      },
      performance: {
        dayTakeoffs: normalizeNumber(rawEntry['Day Takeoffs'] || rawEntry['FS Day Landings'] || rawEntry.dayTakeoffs || rawEntry.performance?.dayTakeoffs),
        nightTakeoffs: normalizeNumber(rawEntry['Night Takeoffs'] || rawEntry['FS Night Landings'] || rawEntry.nightTakeoffs || rawEntry.performance?.nightTakeoffs),
        dayLandings: normalizeNumber(
          findFieldValue(rawEntry, [
            'flight_dayLandings',  // Logten
            'Landings', 'landings', 'LANDINGS',  // MyFlightBook uses this for total landings
            'Day Landings', 'day landings', 'DayLandings',
            'FS Day Landings', 'fs day landings',
            'dayLandings'
          ]) || rawEntry.flight_dayLandings || rawEntry.performance?.dayLandings
        ),
        nightLandings: normalizeNumber(
          findFieldValue(rawEntry, [
            'flight_nightLandings',  // Logten
            'Night Landings', 'night landings', 'NightLandings',
            'FS Night Landings', 'fs night landings',
            'nightLandings'
          ]) || rawEntry.flight_nightLandings || rawEntry.performance?.nightLandings
        ),
        approachCount: normalizeNumber(rawEntry['Instrument Approaches'] || rawEntry.Approaches || rawEntry.approachCount || rawEntry.performance?.approachCount),
        approachType: findFieldValue(rawEntry, ['Approach Type', 'approach type', 'ApproachType', 'approachType']) || null,
        holdingProcedures: normalizeNumber(rawEntry['Holding Procedures'] || rawEntry.Hold || rawEntry.holdingProcedures || rawEntry.performance?.holdingProcedures)
      },
      oooi: undefined
    }
    
    // Parse route and extract departure/destination if missing
    let departure = findFieldValue(rawEntry, [
      'flight_from',  // Logten
      'Departure', 'departure', 'From', 'from', 'FROM'
    ]) || ''
    let destination = findFieldValue(rawEntry, [
      'flight_to',  // Logten
      'Destination', 'destination', 'To', 'to', 'TO'
    ]) || ''
    let route = findFieldValue(rawEntry, [
      'flight_route',  // Logten
      'Route', 'route', 'ROUTE'
    ]) || ''
    
    // Parse route to extract departure/destination if they're missing
    // Route format is typically space-separated airport codes like "KIND KLAF" or "KIND KMCX KLGA"
    if ((!departure || departure === 'UNKNOWN') && route) {
      const routeParts = route.trim().split(/\s+/).filter(part => part.length >= 3)
      const firstAirport = routeParts[0]
      const lastAirport = routeParts.length > 1 ? routeParts[routeParts.length - 1] : null
      
      if (firstAirport) {
        departure = firstAirport.toUpperCase()
      }
      if (lastAirport) {
        destination = lastAirport.toUpperCase()  // Last airport is destination
        
        // Keep only intermediate airports in route field
        if (routeParts.length > 2) {
          // Multiple airports: keep middle ones
          route = routeParts.slice(1, -1).join(' ')
        } else {
          // Only 2 airports: route should be empty
          route = ''
        }
      }
    }
    
    // Only use UNKNOWN as last resort
    if (!departure.trim()) {
      departure = 'UNKNOWN'
    }
    if (!destination.trim()) {
      destination = 'UNKNOWN'
    }
    
    // Update entry with parsed values
    entry.departure = departure
    entry.destination = destination
    entry.route = route
    
    // Parse flight conditions
    const conditionsStr = rawEntry['Flight Conditions'] || rawEntry.flightConditions || ''
    if (conditionsStr) {
      entry.flightConditions = sanitizeFlightConditions(
        conditionsStr.split(';').map((c: string) => c.trim()).filter((c: string) => c)
      )
    }
    
    // Parse OOOI times if present - check Logten fields first
    // Logten exports: Scheduled Departure, Actual Departure (OUT), Scheduled Arrival, Actual Arrival (IN)
    // Map Actual Departure → OUT and Actual Arrival → IN, leave OFF and ON blank
    const logtenOut = findFieldValue(rawEntry, ['flight_actualDepartureTime'])
    const logtenIn = findFieldValue(rawEntry, ['flight_actualArrivalTime'])
    const isLogtenImport = !!(logtenOut || logtenIn)
    
    const out = logtenOut || rawEntry.Out || rawEntry.oooi?.out || null
    const off = null // Always blank for Logten imports
    const on = null // Always blank for Logten imports
    const inTime = logtenIn || rawEntry.In || rawEntry.oooi?.in || null
    // Logten times are in local time, not Zulu
    const isZulu = isLogtenImport ? false : (rawEntry['Is Zulu'] !== undefined ? rawEntry['Is Zulu'] : (rawEntry.oooi?.isZulu !== undefined ? rawEntry.oooi.isZulu : true))
    
    // If we have OOOI times, calculate block time from out to in (gate out to gate in)
    // For Logten imports, this will override the null initial value
    // Fall back to off/on if out/in don't exist
    if (out && inTime) {
      // Get timezones for departure and destination airports
      const startTimezone = entry.departure ? await getAirportTimezone(entry.departure) : null
      const endTimezone = entry.destination ? await getAirportTimezone(entry.destination) : null
      
      const calculatedTime = await calculateDuration(out, inTime, entry.date, startTimezone, endTimezone, isZulu)
      if (calculatedTime !== null && calculatedTime > 0) {
        entry.flightTime.total = calculatedTime
      }
    } else if (off && on) {
      // Fallback: calculate from off to on if out/in not available
      const startTimezone = entry.departure ? await getAirportTimezone(entry.departure) : null
      const endTimezone = entry.destination ? await getAirportTimezone(entry.destination) : null
      
      const calculatedTime = await calculateDuration(off, on, entry.date, startTimezone, endTimezone, isZulu)
      if (calculatedTime !== null && calculatedTime > 0) {
        entry.flightTime.total = calculatedTime
      }
    }
    
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
    
    // Set PIC time = total time if user is PIC
    const userName = (pilotProfile.name || '').trim()
    if (userName) {
      const picCrew = findFieldValue(rawEntry, ['flight_selectedCrewPIC'])
      const userIsPIC = picCrew && picCrew.trim().toLowerCase() === userName.toLowerCase()
      
      if (userIsPIC && entry.flightTime.total) {
        entry.flightTime.pic = entry.flightTime.total
      }
    }
    
    // Auto-check flight conditions based on time entries
    entry.flightConditions = autoCheckFlightConditions(
      entry.flightConditions,
      entry.flightTime.night,
      entry.flightTime.actualInstrument,
      entry.flightTime.simulatedInstrument,
      entry.flightTime.crossCountry
    )
    
    return entry
  } catch (error) {
    console.error('Error normalizing imported entry:', error, rawEntry)
    return null
  }
}

function isDuplicateEntry(entry: LogEntry, existingEntries: LogEntry[]): boolean {
  return existingEntries.some(existing => {
    // Must match date and registration
    if (existing.date !== entry.date || 
        existing.registration.toUpperCase() !== entry.registration.toUpperCase()) {
      return false
    }
    
    // Check departure and destination airports (normalize UNKNOWN and empty strings)
    const existingDep = (existing.departure || 'UNKNOWN').trim().toUpperCase()
    const entryDep = (entry.departure || 'UNKNOWN').trim().toUpperCase()
    const existingDest = (existing.destination || 'UNKNOWN').trim().toUpperCase()
    const entryDest = (entry.destination || 'UNKNOWN').trim().toUpperCase()
    
    // If departure or destination differs (and not both UNKNOWN), they're different flights
    if (existingDep !== entryDep || existingDest !== entryDest) {
      // Exception: if both are UNKNOWN, we'll fall through to check times
      if (!(existingDep === 'UNKNOWN' && entryDep === 'UNKNOWN' && 
            existingDest === 'UNKNOWN' && entryDest === 'UNKNOWN')) {
        return false
      }
    }
    
    // If we have OOOI times for both, compare OUT time as tiebreaker
    const existingOut = existing.oooi?.out
    const entryOut = entry.oooi?.out
    if (existingOut && entryOut) {
      // If OUT times differ, they're different flights (e.g., morning vs afternoon)
      return existingOut === entryOut
    }
    
    // If OOOI not available, compare total flight time as tiebreaker
    const existingTotal = existing.flightTime.total
    const entryTotal = entry.flightTime.total
    if (existingTotal !== null && existingTotal !== undefined &&
        entryTotal !== null && entryTotal !== undefined) {
      // Only consider duplicates if total times match exactly (conservative approach)
      return existingTotal === entryTotal
    }
    
    // If we don't have OOOI or total times, and airports matched (or both UNKNOWN),
    // consider them duplicates (conservative approach - matches original behavior for edge cases)
    return true
  })
}

function calculateImportStatistics(entries: LogEntry[]): { statistics: ImportStatistics; validEntries: LogEntry[]; duplicates: LogEntry[]; errors: { entry: LogEntry; message: string }[] } {
  const validEntries: LogEntry[] = []
  const duplicates: LogEntry[] = []
  const errors: { entry: LogEntry; message: string }[] = []
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
  const errorMessages: string[] = []
  
  for (const entry of entries) {
    // Provide defaults for missing required fields
    if (!entry.departure.trim()) {
      entry.departure = 'UNKNOWN'
    }
    if (!entry.destination.trim()) {
      entry.destination = 'UNKNOWN'
    }
    if (!entry.aircraftMakeModel.trim()) {
      entry.aircraftMakeModel = 'Unknown'
    }
    
    // Validate entry
    const validationError = validateEntry(entry)
    if (validationError) {
      errors.push({ entry, message: validationError })
      errorMessages.push(`Entry ${entry.date} ${entry.registration}: ${validationError}`)
      continue
    }
    
    // Check for duplicates
    if (isDuplicateEntry(entry, logEntries.value)) {
      duplicates.push(entry)
      continue
    }
    
    // Entry is valid and not a duplicate
    validEntries.push(entry)
    dates.push(entry.date)
    
    // Accumulate statistics
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
    totalApproaches += entry.performance.approachCount ?? 0
    
    // Aircraft breakdown
    const aircraftKey = `${entry.aircraftMakeModel} (${entry.registration})`
    aircraftBreakdown[aircraftKey] = (aircraftBreakdown[aircraftKey] || 0) + 1
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
    dateRange,
    errorMessages
  }
  
  return { statistics, validEntries, duplicates, errors }
}

async function importEntries(entries: LogEntry[]): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const result = { imported: 0, skipped: 0, errors: [] as string[] }
  
  for (const entry of entries) {
    // Provide defaults for missing required fields (for imports from other systems)
    if (!entry.departure.trim()) {
      entry.departure = 'UNKNOWN'
    }
    if (!entry.destination.trim()) {
      entry.destination = 'UNKNOWN'
    }
    if (!entry.aircraftMakeModel.trim()) {
      entry.aircraftMakeModel = 'Unknown'
    }
    
    // Validate entry (with lenient defaults applied)
    const validationError = validateEntry(entry)
    if (validationError) {
      result.errors.push(`Entry ${entry.date} ${entry.registration}: ${validationError}`)
      continue
    }
    
    // Check for duplicates
    if (isDuplicateEntry(entry, logEntries.value)) {
      result.skipped++
      continue
    }
    
    // Add entry
    logEntries.value = sortEntriesByDateAndOOOI([...logEntries.value, entry])
    result.imported++
  }
  
  return result
}

async function confirmImport(): Promise<void> {
  if (!importPreviewEntries.value.length || !importPreviewStatistics.value) {
    return
  }
  
  // Import the entries
  const result = await importEntries(importPreviewEntries.value)
  
  // Show result
  let message = `Import complete!\n\nImported: ${result.imported} ${result.imported === 1 ? 'entry' : 'entries'}`
  if (result.skipped > 0) {
    message += `\nSkipped (duplicates): ${result.skipped} ${result.skipped === 1 ? 'entry' : 'entries'}`
  }
  if (result.errors.length > 0) {
    message += `\n\nErrors (${result.errors.length}):\n${result.errors.slice(0, 5).join('\n')}`
    if (result.errors.length > 5) {
      message += `\n... and ${result.errors.length - 5} more`
    }
  }
  alert(message)
  
  // Close preview and reset
  cancelImport()
}

function cancelImport(): void {
  showImportPreview.value = false
  importPreviewEntries.value = []
  importPreviewStatistics.value = null
  importPreviewMetadata.value = null
  expandedPreviewEntries.value = new Set()
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

async function processCSVFile(file: File): Promise<void> {
  try {
    const text = await file.text()
    const rows = parseCSVContent(text)
    
    console.log('Parsed CSV rows:', rows.length)
    if (rows.length > 0 && rows[0]) {
      console.log('First row headers:', Object.keys(rows[0]))
      console.log('First row sample:', rows[0])
    }
    
    if (rows.length === 0) {
      alert('CSV file is empty or could not be parsed.')
      return
    }
    
    // Normalize entries
    const entries: LogEntry[] = []
    const rejectedRows: { row: any; reason: string }[] = []
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row) continue
      
      const entry = await normalizeImportedEntry(row)
      if (entry) {
        entries.push(entry)
      } else {
        // Determine why it was rejected
        let reason = 'Unknown reason'
        const dateValue = findFieldValue(row, [
          'flight_flightDate',  // Logten
          'Date', 'date', 'DATE', 'Flight Date', 'flight date'
        ])
        const regValue = findFieldValue(row, [
          'aircraft_aircraftID',  // Logten uses this for registration!
          'flight_aircraft', 'flight_aircraftID', 'flight_aircraftRegistration', 'flight_tailNumber',
          'flight_aircraftIdentifier', 'flight_aircraftIdentifierID',  // Logten variations
          'Tail Number', 'tail number', 'TailNumber', 'tailNumber',  // MyFlightBook uses this
          'Display Tail', 'display tail',  // MyFlightBook also has this
          'Registration', 'registration', 'REGISTRATION',
          'N-Number', 'n-number', 'NNumber', 'nNumber',
          'Aircraft Registration', 'aircraft registration',
          'Ident', 'ident', 'IDENT',
          'Aircraft', 'aircraft', 'AIRCRAFT',
          'Aircraft ID', 'aircraft id', 'AircraftID', 'aircraftID'  // Put this last as fallback
        ])
        
        if (!dateValue) {
          reason = 'Missing date field'
        } else if (!regValue) {
          reason = 'Missing registration field (tried: Registration, Aircraft ID, Tail Number, N-Number, Ident, etc.)'
        } else {
          reason = 'Invalid date format or other validation error'
        }
        rejectedRows.push({ row, reason })
        if (i === 0 && row) {
          console.log('First row rejected:', reason, row)
          console.log('Available columns:', Object.keys(row))
        }
      }
    }
    
    console.log(`Processed ${rows.length} rows: ${entries.length} valid, ${rejectedRows.length} rejected`)
    
    if (entries.length === 0) {
      let errorMsg = 'No valid entries found in CSV file.\n\n'
      if (rejectedRows.length > 0) {
        errorMsg += `Reasons:\n${rejectedRows.slice(0, 3).map(r => `- ${r.reason}`).join('\n')}`
        if (rejectedRows.length > 3) {
          errorMsg += `\n... and ${rejectedRows.length - 3} more`
        }
        errorMsg += '\n\nCheck console for details.'
      }
      alert(errorMsg)
      return
    }
    
    // Calculate statistics and show preview
    const { statistics, validEntries } = calculateImportStatistics(entries)
    importPreviewEntries.value = validEntries
    importPreviewStatistics.value = statistics
    importPreviewMetadata.value = {
      fileName: file.name,
      fileType: 'CSV',
      importedAt: new Date().toISOString()
    }
    showImportPreview.value = true
  } catch (error) {
    console.error('Error importing CSV:', error)
    alert(`Error importing CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      alert('JSON file format not recognized. Expected an array of entries or an object with an "entries" property.')
      return
    }
    
    if (entries.length === 0) {
      alert('No entries found in JSON file.')
      return
    }
    
    // Normalize entries
    const normalizedEntries: LogEntry[] = []
    for (const entry of entries) {
      const normalized = await normalizeImportedEntry(entry)
      if (normalized) {
        normalizedEntries.push(normalized)
      }
    }
    
    if (normalizedEntries.length === 0) {
      alert('No valid entries found in JSON file.')
      return
    }
    
    // Calculate statistics and show preview
    const { statistics, validEntries } = calculateImportStatistics(normalizedEntries)
    importPreviewEntries.value = validEntries
    importPreviewStatistics.value = statistics
    importPreviewMetadata.value = {
      fileName: file.name,
      fileType: 'JSON',
      importedAt: new Date().toISOString()
    }
    showImportPreview.value = true
  } catch (error) {
    console.error('Error importing JSON:', error)
    alert(`Error importing JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
  if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || file.type === 'text/csv' || file.type === 'text/plain') {
    console.log('Processing as CSV/Tab-delimited')
    await processCSVFile(file)
  } else if (fileName.endsWith('.json') || file.type === 'application/json') {
    console.log('Processing as JSON')
    await processJSONFile(file)
  } else {
    alert(`Please drop a CSV, TXT, or JSON file. Received: ${file.type || 'unknown type'}`)
  }
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

// Airport names cache for display in catalog
const airportNames = ref<Record<string, string>>({})

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

// Aircraft family rename modal
const showRenameFamilyModal = ref(false)
const renameFamilyOldName = ref<string>('')
const renameFamilyNewName = ref<string>('')
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuFamilyName = ref<string>('')

// Load crew profiles from localStorage
function loadCrewProfiles(): void {
  if (!isBrowser) return
  try {
    const stored = window.localStorage.getItem(CREW_PROFILES_STORAGE_KEY)
    if (stored) {
      crewProfiles.value = JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
}

// Save crew profiles to localStorage
function saveCrewProfiles(): void {
  if (!isBrowser) return
  try {
    window.localStorage.setItem(CREW_PROFILES_STORAGE_KEY, JSON.stringify(crewProfiles.value))
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
function renameCrewMember(oldName: string, newName: string): void {
  if (!oldName || !newName || oldName.trim() === newName.trim()) {
    return
  }
  
  const trimmedNewName = newName.trim()
  if (!trimmedNewName) {
    return
  }
  
  const oldNameLower = oldName.toLowerCase()
  
  // Find all entries where trainingElements (case-insensitive) matches the old name
  const entriesToUpdate = logEntries.value.filter(entry => 
    entry.trainingElements && entry.trainingElements.toLowerCase() === oldNameLower
  )
  
  // Update all matching entries
  logEntries.value = logEntries.value.map(entry => {
    if (entry.trainingElements && entry.trainingElements.toLowerCase() === oldNameLower) {
      return {
        ...entry,
        trainingElements: trimmedNewName
      }
    }
    return entry
  })
  
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
  
  // Note: logEntries is watched and auto-saves to localStorage
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

function createBlankEntry(): EditableLogEntry {
  return {
    date: '',
    role: roleOptions[0],
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
    flightConditions: [],
    remarks: '',
    flightTime: createEmptyFlightTime(),
    performance: createEmptyPerformance(),
    oooi: createEmptyOOOI(),
    flagged: false
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
  const willBeOpen = !isEntryFormOpen.value
  isEntryFormOpen.value = willBeOpen

  // If opening the Add Entry form, close any open inline edit
  if (willBeOpen) {
    expandedEntryId.value = null
    inlineEditEntry.value = null
    isInlineCommercialMode.value = false
  } else {
    // If closing, reset form if needed
    if (!editingEntryId.value) {
      resetForm()
    }
  }
}

function toggleCatalogSection(key: CatalogKey): void {
  catalogOpenState[key] = !catalogOpenState[key]
}

function formatOOOIInput(value: string): string {
  // Remove non-digits and limit to 4 characters
  return value.replace(/\D/g, '').slice(0, 4)
}

function parseOOOITime(time: string | null): number | null {
  if (!time || time.length === 0) return null
  // Parse 4-digit time string (HHMM) to minutes since midnight
  const digits = time.replace(/\D/g, '').padStart(4, '0')
  if (digits.length !== 4) return null
  const hours = parseInt(digits.slice(0, 2), 10)
  const minutes = parseInt(digits.slice(2, 4), 10)
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }
  return hours * 60 + minutes
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

function sortEntriesByDateAndOOOI(entries: LogEntry[]): LogEntry[] {
  return [...entries].sort((a, b) => {
    // Primary sort: date (descending - most recent first)
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    const dateDiff = dateB - dateA
    
    if (dateDiff !== 0) {
      return dateDiff
    }
    
    // Secondary sort: OOOI "out" time (descending - latest first)
    // Entries without OOOI "out" time come after entries with OOOI times
    const timeA = parseOOOITime(a.oooi?.out ?? null)
    const timeB = parseOOOITime(b.oooi?.out ?? null)
    
    if (timeA === null && timeB === null) return 0
    if (timeA === null) return 1 // a comes after b
    if (timeB === null) return -1 // a comes before b
    return timeB - timeA // descending order (latest first)
  })
}

function autoCheckFlightConditions(
  conditions: string[], 
  nightTime: number | null, 
  actualInstrumentTime: number | null, 
  simulatedInstrumentTime: number | null, 
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
  selectedFilters.flagged = false
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

// Aircraft family rename functions
function showRenameFamilyContextMenu(event: MouseEvent, familyName: string): void {
  event.preventDefault()
  event.stopPropagation()
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuFamilyName.value = familyName
  contextMenuVisible.value = true
}

function closeContextMenu(): void {
  contextMenuVisible.value = false
  contextMenuFamilyName.value = ''
}

function openRenameFamilyModal(): void {
  renameFamilyOldName.value = contextMenuFamilyName.value
  renameFamilyNewName.value = contextMenuFamilyName.value
  closeContextMenu()
  showRenameFamilyModal.value = true
}

function closeRenameFamilyModal(): void {
  showRenameFamilyModal.value = false
  renameFamilyOldName.value = ''
  renameFamilyNewName.value = ''
}

function renameAircraftFamily(oldFamilyName: string, newFamilyName: string): void {
  if (!oldFamilyName || !newFamilyName || oldFamilyName.trim() === newFamilyName.trim()) {
    return
  }
  
  const trimmedNewName = newFamilyName.trim()
  if (!trimmedNewName) {
    return
  }
  
  // Find all entries where normalizeAircraftFamily(entry.aircraftMakeModel) === oldFamilyName
  const entriesToUpdate = logEntries.value.filter(entry => {
    const normalized = normalizeAircraftFamily(entry.aircraftMakeModel)
    return normalized === oldFamilyName
  })
  
  if (entriesToUpdate.length === 0) {
    return
  }
  
  // Update all matching entries
  logEntries.value = logEntries.value.map(entry => {
    const normalized = normalizeAircraftFamily(entry.aircraftMakeModel)
    if (normalized === oldFamilyName) {
      return {
        ...entry,
        aircraftMakeModel: trimmedNewName
      }
    }
    return entry
  })
  
  // Note: logEntries is watched and auto-saves to localStorage
  closeRenameFamilyModal()
}

function confirmRenameFamily(): void {
  if (!renameFamilyOldName.value || !renameFamilyNewName.value) {
    return
  }
  
  const trimmedNewName = renameFamilyNewName.value.trim()
  if (!trimmedNewName) {
    return
  }
  
  if (trimmedNewName === renameFamilyOldName.value) {
    closeRenameFamilyModal()
    return
  }
  
  renameAircraftFamily(renameFamilyOldName.value, trimmedNewName)
}

// Computed: count of entries that will be renamed
const entriesToRenameCount = computed(() => {
  if (!renameFamilyOldName.value) return 0
  return logEntries.value.filter(e => normalizeAircraftFamily(e.aircraftMakeModel) === renameFamilyOldName.value).length
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
  currentCrewName.value = name
  showCrewProfileModal.value = true
}

function closeCrewProfileModal(): void {
  showCrewProfileModal.value = false
  currentCrewName.value = ''
  isEditingCrewName.value = false
  editingCrewName.value = ''
}

// Start editing crew name
function startEditingCrewName(): void {
  isEditingCrewName.value = true
  editingCrewName.value = currentCrewName.value
}

// Save crew name changes
function saveCrewNameEdit(): void {
  if (!editingCrewName.value.trim()) {
    // Prevent empty names, cancel edit instead
    cancelCrewNameEdit()
    return
  }
  
  const trimmedNewName = editingCrewName.value.trim()
  if (trimmedNewName !== currentCrewName.value) {
    renameCrewMember(currentCrewName.value, trimmedNewName)
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

function toggleEntryFlag(entry: LogEntry): void {
  entry.flagged = !entry.flagged
  // The watch on logEntries will automatically save to localStorage
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
 * Convert airport timezone string to IANA timezone format
 * Airport timezones are often in formats like "America/Chicago" or "UTC-6" or just "-6"
 * This function normalizes them to IANA format
 */
function normalizeTimezoneToIANA(timezone: string | undefined | null): string | null {
  if (!timezone) return null
  
  // If already in IANA format (contains '/'), return as-is
  if (timezone.includes('/')) {
    return timezone
  }
  
  // Handle UTC offset strings like "-6", "-5", "UTC-6", "+5", etc.
  // Try patterns: "-6", "+5", "UTC-6", "UTC+5", "-06:00", etc.
  const offsetMatch1 = timezone.match(/^([+-]?)(\d{1,2})(?::\d{2})?$/)
  const offsetMatch2 = timezone.match(/^UTC([+-])(\d{1,2})$/i)
  
  let offset: number | null = null
  
  if (offsetMatch1 && offsetMatch1[2]) {
    const sign = offsetMatch1[1] || '-'
    const hours = offsetMatch1[2]
    offset = parseInt(sign + hours)
  } else if (offsetMatch2) {
    const sign = offsetMatch2[1]
    const hours = offsetMatch2[2]
    if (sign && hours) {
      offset = parseInt(sign + hours)
    }
  }
  
  if (offset !== null) {
    // Map common US UTC offsets to IANA timezones
    // Note: These are approximations - actual timezones depend on DST
    // For US airports, we map to the most common timezone for that offset
    const offsetToTimezone: Record<string, string> = {
      '-10': 'Pacific/Honolulu',  // HST
      '-9': 'America/Anchorage',  // AKST/AKDT
      '-8': 'America/Los_Angeles', // PST/PDT
      '-7': 'America/Denver',     // MST/MDT (or PDT during DST)
      '-6': 'America/Chicago',     // CST/CDT
      '-5': 'America/New_York',   // EST/EDT (or CDT during DST)
      '-4': 'America/New_York',   // EDT (during DST)
    }
    
    const offsetStr = offset.toString()
    const timezone = offsetToTimezone[offsetStr]
    if (timezone) {
      return timezone
    }
  }
  
  // Common timezone mappings for US airports
  const timezoneMap: Record<string, string> = {
    'America/New_York': 'America/New_York',
    'America/Chicago': 'America/Chicago',
    'America/Denver': 'America/Denver',
    'America/Los_Angeles': 'America/Los_Angeles',
    'America/Phoenix': 'America/Phoenix',
    'America/Anchorage': 'America/Anchorage',
    'Pacific/Honolulu': 'Pacific/Honolulu',
    'EST': 'America/New_York',
    'EDT': 'America/New_York',
    'CST': 'America/Chicago',
    'CDT': 'America/Chicago',
    'MST': 'America/Denver',
    'MDT': 'America/Denver',
    'PST': 'America/Los_Angeles',
    'PDT': 'America/Los_Angeles',
    'AKST': 'America/Anchorage',
    'AKDT': 'America/Anchorage',
    'HST': 'Pacific/Honolulu'
  }
  
  // Check if it's a known abbreviation
  if (timezoneMap[timezone]) {
    return timezoneMap[timezone]
  }
  
  // Try to use as-is (might already be valid IANA)
  try {
    // Validate by trying to create a DateTime with this timezone
    DateTime.now().setZone(timezone)
    return timezone
  } catch {
    return null
  }
}

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
watch(() => [newEntry.oooi?.out, newEntry.oooi?.in, newEntry.oooi?.off, newEntry.oooi?.on, newEntry.role, newEntry.departure, newEntry.destination, newEntry.date], async () => {
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

watch(() => [inlineEditEntry.value?.oooi?.out, inlineEditEntry.value?.oooi?.in, inlineEditEntry.value?.oooi?.off, inlineEditEntry.value?.oooi?.on, inlineEditEntry.value?.role, inlineEditEntry.value?.departure, inlineEditEntry.value?.destination, inlineEditEntry.value?.date], async () => {
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
  
  // Get destination coordinates (optional, for more accurate calculation on long flights)
  let destCoords = getAirportCoordsFromCache(destination)
  console.log('[NightTime] Destination coords from cache:', destCoords)
  
  if (!destCoords && destination) {
    console.log('[NightTime] Looking up destination airport:', destination)
    const destInfo = await lookupAirport(destination)
    console.log('[NightTime] Destination airport lookup result:', destInfo)
    if (destInfo?.latitude && destInfo?.longitude) {
      // Ensure coordinates are numbers, not strings
      destCoords = { 
        lat: typeof destInfo.latitude === 'string' ? parseFloat(destInfo.latitude) : destInfo.latitude, 
        lon: typeof destInfo.longitude === 'string' ? parseFloat(destInfo.longitude) : destInfo.longitude 
      }
      console.log('[NightTime] Using destination coords from lookup:', destCoords)
    }
  }
  
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
  
  // Ensure all coordinates are numbers
  const depLat = typeof depCoords.lat === 'number' ? depCoords.lat : parseFloat(String(depCoords.lat))
  const depLon = typeof depCoords.lon === 'number' ? depCoords.lon : parseFloat(String(depCoords.lon))
  const destLat = destCoords ? (typeof destCoords.lat === 'number' ? destCoords.lat : parseFloat(String(destCoords.lat))) : undefined
  const destLon = destCoords ? (typeof destCoords.lon === 'number' ? destCoords.lon : parseFloat(String(destCoords.lon))) : undefined
  
  console.log('[NightTime] Calling calculateNightTime with:', {
    date: normalizedDate,
    depLatitude: depLat,
    depLongitude: depLon,
    destLatitude: destLat,
    destLongitude: destLon,
    outTime: outTimeFormatted,
    inTime: inTimeFormatted,
    isZulu
  })
  
  const result = calculateNightTime({
    date: normalizedDate,
    depLatitude: depLat,
    depLongitude: depLon,
    destLatitude: destLat,
    destLongitude: destLon,
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
      inlineEditEntry.value.flightTime.crossCountry
    )
  },
  { deep: true }
)

// Watcher to sync Category/Class Time with Total Time (Add Entry form)
watch(
  () => newEntry.categoryClassTime,
  (newVal) => {
    if (newVal !== null && newVal !== undefined && newVal !== newEntry.flightTime.total) {
      newEntry.flightTime.total = newVal
    }
  }
)

watch(
  () => newEntry.flightTime.total,
  (newVal) => {
    if (newVal !== null && newVal !== undefined && newVal !== newEntry.categoryClassTime) {
      newEntry.categoryClassTime = newVal
    }
  }
)

// Watcher to sync Category/Class Time with Total Time (Inline Edit form)
watch(
  () => inlineEditEntry.value?.categoryClassTime,
  (newVal) => {
    if (inlineEditEntry.value && newVal !== null && newVal !== undefined && newVal !== inlineEditEntry.value.flightTime.total) {
      inlineEditEntry.value.flightTime.total = newVal
    }
  }
)

watch(
  () => inlineEditEntry.value?.flightTime.total,
  (newVal) => {
    if (inlineEditEntry.value && newVal !== null && newVal !== undefined && newVal !== inlineEditEntry.value.categoryClassTime) {
      inlineEditEntry.value.categoryClassTime = newVal
    }
  }
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
    flightNumber: newEntry.flightNumber?.trim() || null,
    departure: newEntry.departure.trim(),
    destination: newEntry.destination.trim(),
    route: newEntry.route.trim(),
    trainingElements: newEntry.trainingElements.trim(),
    trainingInstructor: newEntry.trainingInstructor.trim(),
    instructorCertificate: newEntry.instructorCertificate.trim(),
    flightConditions: sanitizeFlightConditions([...newEntry.flightConditions]),
    remarks: newEntry.remarks.trim(),
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

  // Debug: Log the flightTime object being saved
  console.log('[SaveEntry] FlightTime being saved:', baseEntry.flightTime)
  console.log('[SaveEntry] Night time value:', baseEntry.flightTime.night)

  if (editingEntryId.value) {
    const targetId = editingEntryId.value
    logEntries.value = sortEntriesByDateAndOOOI(
      logEntries.value.map((entry) => (entry.id === targetId ? { ...baseEntry, id: targetId } : entry))
    )
    console.log('[SaveEntry] Entry updated. Night time in saved entry:', 
      logEntries.value.find(e => e.id === targetId)?.flightTime.night
    )
    successMessage.value = 'Entry updated.'
  } else {
    const entryToStore: LogEntry = {
      ...baseEntry,
      id: generateEntryId()
    }
    logEntries.value = sortEntriesByDateAndOOOI([...logEntries.value, entryToStore])
    console.log('[SaveEntry] Entry saved. Night time in saved entry:', 
      logEntries.value.find(e => e.id === entryToStore.id)?.flightTime.night
    )
    successMessage.value = 'Entry saved locally. Remember to archive signatures once the feature is available.'
  }

  resetForm()
  
  // Close the add entry panel after successful submission
  if (!editingEntryId.value) {
    isEntryFormOpen.value = false
  }
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
        
        // Normalize all flightTime values to ensure they're numbers, not strings
        const normalizedFlightTime: FlightTimeBreakdown = {
          ...createEmptyFlightTime()
        }
        flightTimeFields.forEach((field) => {
          const rawValue = entry.flightTime?.[field.key]
          normalizedFlightTime[field.key] = normalizeNumber(rawValue)
        })
        
        // Normalize performance values too
        const normalizedPerformance: PerformanceMetrics = {
          ...createEmptyPerformance()
        }
        performanceFields.forEach((field) => {
          if (field.key === 'approachType') {
            normalizedPerformance[field.key] = (entry.performance?.[field.key] as string | null) ?? null
          } else {
            const rawValue = entry.performance?.[field.key]
            // For performance fields, convert strings to numbers
            if (typeof rawValue === 'string') {
              const parsed = parseFloat(rawValue)
              normalizedPerformance[field.key] = isNaN(parsed) ? null : parsed
            } else {
              normalizedPerformance[field.key] = rawValue ?? null
            }
          }
        })
        
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
      alert(`Connection failed: ${error.message}\n\nCheck console for details.`)
      return { success: false, error }
    }
    
    console.log('✅ Supabase connection successful!')
    console.log('Table exists, row count:', count)
    alert(`✅ Supabase connection successful!\n\nTable accessible. Row count: ${count ?? 0}`)
    return { success: true, data, count }
  } catch (err) {
    console.error('❌ Supabase test error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    alert(`Test error: ${errorMessage}\n\nCheck console for details.`)
    return { success: false, error: err }
  }
}

// Expose test function to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).testSupabase = testSupabaseConnection
}

onMounted(() => {
  loadPersistedEntries()
  loadThemePreference()
  loadClockPrefs()
  loadSelectedTotalsMetrics()
  loadColumnConfig()
  loadPilotProfilePrefs()
  loadCrewProfiles()
  // Normalize and autofill aircraft category/class labels on load
  normalizeAndAutofillCategories()
  if (logEntries.value.length === 0) {
    // Ensure inline edit is closed when auto-opening Add Entry form
    expandedEntryId.value = null
    inlineEditEntry.value = null
    isInlineCommercialMode.value = false
    isEntryFormOpen.value = true
  }
  
  // Close settings when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (showHeaderSettings.value && !target.closest('.settings-container')) {
      showHeaderSettings.value = false
    }
    if (showColumnSettings.value && !target.closest('.column-settings-container')) {
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
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', stopResize)
      resizingColumn.value = null
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

// Auto-focus first input when edit panel opens
watch(
  expandedEntryId,
  (newId) => {
    if (newId !== null && inlineEditEntry.value) {
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
    if (isOpen) {
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

    // flagged filter
    if (selectedFilters.flagged) {
      if (!entry.flagged) {
        return false
      }
    }

    return true
  })

  // Sort by date (most recent first), then by OOOI out time for same-day entries
  return sortEntriesByDateAndOOOI(result)
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
      const rawValue = entry.flightTime[field.key]
      const value = rawValue ?? 0
      timeAccumulator[field.key] += value
      // Debug logging for night time (log all entries, not just > 0)
      if (field.key === 'night') {
        console.log('[Totals] Processing entry night time:', {
          entryId: entry.id,
          date: entry.date,
          departure: entry.departure,
          rawNightValue: rawValue,
          nightTime: value,
          totalSoFar: timeAccumulator[field.key]
        })
      }
    })
    performanceFields.forEach((field) => {
      // Skip approachType since it's a string, not a number
      if (field.key !== 'approachType') {
        performanceAccumulator[field.key] += (entry.performance[field.key] as number) ?? 0
      }
    })
  })
  
  // Debug logging for final totals
  console.log('[Totals] Final night time total:', timeAccumulator.night, 'from', entriesForTotals.value.length, 'entries')
  console.log('[Totals] All time totals:', timeAccumulator)

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

// Lazy load airport names for display in catalog
watchEffect(() => {
  const airportCodes = catalogs.value.airports
  airportCodes.forEach(async (code) => {
    // Skip if already cached or currently loading
    if (airportNames.value[code]) {
      return
    }
    
    try {
      const info = await lookupAirport(code)
      if (info && info.name) {
        airportNames.value[code] = info.name
      }
    } catch (error) {
      // Silently fail - will just show code without name
      console.warn(`Failed to load airport name for ${code}:`, error)
    }
  })
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
}

function selectAircraftForInlineEdit(aircraft: { registration: string; makeModel: string }): void {
  if (!inlineEditEntry.value) return
  inlineEditEntry.value.registration = aircraft.registration.toUpperCase()
  inlineEditEntry.value.aircraftMakeModel = aircraft.makeModel
  showInlineIdentDropdown.value = false
  highlightedInlineIdentIndex.value = -1
}

// Blur handlers for Ident dropdowns (with delay to allow click to register)
function handleIdentBlur(): void {
  window.setTimeout(() => { 
    showIdentDropdown.value = false
    highlightedIdentIndex.value = -1
  }, 150)
}

function handleInlineIdentBlur(): void {
  window.setTimeout(() => { 
    showInlineIdentDropdown.value = false
    highlightedInlineIdentIndex.value = -1
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

// Selection handlers for FROM dropdown
function selectAirportForFrom(airport: string): void {
  newEntry.departure = airport.toUpperCase()
  showFromDropdown.value = false
  highlightedFromIndex.value = -1
  // Prefetch coordinates for night time calculation
  prefetchAirportCoords(airport)
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
}

function selectPilotNameForInline(pilot: string): void {
  if (!inlineEditEntry.value) return
  inlineEditEntry.value.trainingElements = pilot
  showInlinePilotNameDropdown.value = false
  highlightedInlinePilotIndex.value = -1
}

// Blur handlers for airport and pilot dropdowns
function handleFromBlur(): void {
  window.setTimeout(() => { 
    showFromDropdown.value = false
    highlightedFromIndex.value = -1
  }, 150)
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
    const instrument = coerceNumber(entry.flightTime.actualInstrument) + coerceNumber(entry.flightTime.simulatedInstrument)

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
      const rawValue = condition?.trim() || ''
      const label = conditionOptions.find((opt) => opt.value === rawValue)?.label || rawValue
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
        date: entry.date
      }
    }
  })

  stats.airportsVisited = airports.size
  stats.avgDuration = stats.totalFlights > 0 ? stats.totalHours / stats.totalFlights : 0
  stats.favoriteAircraft = getTopKey(familyCounts)
  stats.favoriteRoute = getTopKey(routeCounts)
  // Create a map of label to index for fixed ordering
  const conditionOrderMap = new Map<string, number>(
    conditionOptions.map((opt, index) => [opt.label, index])
  )
  
  stats.conditions = Object.entries(conditionCounts)
    .filter(([label, count]) => count > 0) // Only include conditions with counts > 0
    .sort((a, b) => {
      const orderA = conditionOrderMap.get(a[0]) ?? Infinity
      const orderB = conditionOrderMap.get(b[0]) ?? Infinity
      return orderA - orderB // Sort by fixed order from conditionOptions
    })
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
  return sortEntriesByDateAndOOOI(
    [...logEntries.value].filter((entry) => {
      const timestamp = new Date(entry.date).getTime()
      return !Number.isNaN(timestamp)
    })
  ).slice(0, 3)
})

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
  return '—'
}

function conditionLabel(value: string): string {
  if (value === 'dayVfr') {
    return ''
  }
  const option = conditionOptions.find((option) => option.value === value)
  return option ? option.label : value
}

function sortConditionsInFixedOrder(conditions: string[]): string[] {
  // Create a map of value to index for fixed ordering
  const conditionOrderMap = new Map<string, number>(
    conditionOptions.map((opt, index) => [opt.value, index])
  )
  
  // Sort by the original values first, then map to labels
  const sorted = [...conditions]
    .filter((cond): cond is string => typeof cond === 'string' && cond !== '' && cond !== 'dayVfr') // Filter out empty/invalid conditions
    .sort((a, b) => {
      const orderA = conditionOrderMap.get(a) ?? Infinity
      const orderB = conditionOrderMap.get(b) ?? Infinity
      return orderA - orderB
    })
  
  return sorted
    .map((cond) => {
      if (cond === 'dayVfr') return ''
      const option = conditionOptions.find((opt) => opt.value === cond)
      return option ? option.label : cond
    })
    .filter((label): label is string => Boolean(label))
}
</script>

<style scoped>
/* Fade transition for backdrop */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
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
.bg-gray-900 input:-webkit-autofill,
.bg-gray-900 input:-webkit-autofill:hover,
.bg-gray-900 input:-webkit-autofill:focus,
.bg-gray-900 input:-webkit-autofill:active,
.bg-gray-900 textarea:-webkit-autofill,
.bg-gray-900 textarea:-webkit-autofill:hover,
.bg-gray-900 textarea:-webkit-autofill:focus,
.bg-gray-900 textarea:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px rgb(31 41 55) inset !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  box-shadow: 0 0 0 1000px rgb(31 41 55) inset !important;
}

/* Also handle inputs with dark mode background classes directly */
input.bg-gray-800:-webkit-autofill,
input.bg-gray-800:-webkit-autofill:hover,
input.bg-gray-800:-webkit-autofill:focus,
input.bg-gray-800:-webkit-autofill:active,
textarea.bg-gray-800:-webkit-autofill,
textarea.bg-gray-800:-webkit-autofill:hover,
textarea.bg-gray-800:-webkit-autofill:focus,
textarea.bg-gray-800:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px rgb(31 41 55) inset !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  box-shadow: 0 0 0 1000px rgb(31 41 55) inset !important;
}
</style>



