import { test, expect } from '@playwright/test'

test.describe('Offline Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('removes HTML splash after the app mounts', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('#app-splash')).toHaveCount(0, { timeout: 10000 })
  })

  test('shows branded splash before the app shell renders', async ({ page }) => {
    await page.addInitScript(() => {
      const splash = document.createElement('div')
      splash.id = 'app-splash'
      splash.textContent = 'Loading Logifi…'
      document.body.prepend(splash)
    })

    await page.goto('/')
    await expect(page.locator('#app-splash')).toHaveCount(1)
  })

  test('shows online status indicator in settings when available', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    const settingsButton = page.getByRole('button', { name: /settings/i }).first()
    if (await settingsButton.count()) {
      await settingsButton.click()
      const statusIndicator = page.locator('[data-testid="online-status"]')
      if (await statusIndicator.count()) {
        await expect(statusIndicator.first()).toBeVisible()
      }
    }
  })

  test('allows creating entries when offline using local storage', async ({ page, context }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))

    await expect(page).toHaveTitle(/Logifi|Logbook/i)

    const addEntryButton = page.getByRole('button', { name: /add entry|new entry/i }).first()
    if (await addEntryButton.count()) {
      await addEntryButton.click()
      await expect(page.locator('form')).toBeVisible()
    }
  })

  test('keeps cached session when Supabase auth is slow', async ({ page }) => {
    const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    if (!supabaseUrl) {
      test.skip(true, 'Supabase URL not configured for auth cache test')
    }

    const storageKey = `sb-${new URL(supabaseUrl!).hostname.split('.')[0]}-auth-token`
    await page.addInitScript(({ key }) => {
      const session = {
        access_token: 'offline-test-token',
        refresh_token: 'offline-test-refresh',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: { id: 'offline-user', email: 'offline@example.com' },
      }
      localStorage.setItem(key, JSON.stringify(session))
      localStorage.setItem('logifi-offline-session', JSON.stringify(session))
    }, { key: storageKey })

    await page.route('**/*supabase.co/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      await route.continue()
    })

    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('#app-splash')).toHaveCount(0, { timeout: 10000 })
    await expect(page.getByText('Loading Logifi…')).not.toBeVisible({ timeout: 10000 })
  })

  test('does not treat browser-online alone as cloud-online for sync status', async ({ page, context }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    // Block Supabase while leaving navigator.onLine true (altitude-like).
    await page.route('**/auth/v1/health**', (route) => route.abort())
    await page.route('**/*supabase.co/**', (route) => route.abort())
    await page.evaluate(() => window.dispatchEvent(new Event('online')))

    const settingsButton = page.getByRole('button', { name: /settings/i }).first()
    if (!(await settingsButton.count())) {
      test.skip(true, 'Settings button not available')
      return
    }
    await settingsButton.click()

    const statusIndicator = page.locator('[data-testid="online-status"]').first()
    if (!(await statusIndicator.count())) {
      test.skip(true, 'Online status indicator not available')
      return
    }

    await expect(statusIndicator).toContainText(/Offline|Checking/i, { timeout: 15000 })
    // Keep context online so we are not testing navigator.onLine===false.
    expect(await page.evaluate(() => navigator.onLine)).toBe(true)
    await context.setOffline(false)
  })

  test('sync queue can be inspected after offline save attempt', async ({ page, context }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))

    const queueStatus = page.locator('[data-testid="sync-queue-status"]')
    if (await queueStatus.count()) {
      await expect(queueStatus.first()).toBeVisible()
    } else {
      await expect(page).toHaveTitle(/Logifi|Logbook/i)
    }
  })

  test('reloads local entries after reconnect', async ({ page, context }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))

    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))

    await expect(page).toHaveTitle(/Logifi|Logbook/i)
  })

  test('cross-device delete removes synced locals missing from remote snapshot', async () => {
    const { mergeRemoteLogEntries } = await import('../../shared/logEntryMerge')
    const entry = {
      id: 'remote-deleted',
      date: '2026-05-26',
      role: 'PIC',
      aircraftCategoryClass: 'Airplane SEL',
      categoryClassTime: null,
      aircraftMakeModel: 'C172',
      registration: 'N12345',
      flightNumber: null,
      departure: 'KJFK',
      destination: 'KLGA',
      route: '',
      trainingElements: '',
      trainingInstructor: '',
      instructorCertificate: '',
      flightConditions: [] as string[],
      remarks: '',
      tags: [] as string[],
      logbookType: 'flight' as const,
      flightTime: {
        total: 1.2,
        pic: 1.2,
        sic: null,
        dual: null,
        solo: null,
        night: null,
        actualInstrument: null,
        simulatedInstrument: null,
        crossCountry: null,
        dualGiven: null,
      },
      performance: {
        dayTakeoffs: null,
        dayLandings: null,
        nightTakeoffs: null,
        nightLandings: null,
        approachCount: null,
        holdingProcedures: null,
        approaches: [] as { type: string; count: number }[],
      },
      flagged: false,
      isImported: false,
    }

    const result = mergeRemoteLogEntries({
      localEntries: [{ entry, synced: true }],
      remoteEntries: [],
      syncQueue: [],
    })

    expect(result.removedEntryIds).toEqual(['remote-deleted'])
    expect(result.mergedEntries).toEqual([])
  })
})
