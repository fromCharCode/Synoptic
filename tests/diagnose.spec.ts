import { test, expect } from '@playwright/test'

test.describe('Synoptik Audio Diagnostics', () => {

  test('page loads and renders canvas', async ({ page }) => {
    // Accept self-signed cert
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })

    // Check canvas exists
    const canvas = page.locator('canvas#gl')
    await expect(canvas).toBeVisible()

    // Check intro appears then fades
    const intro = page.locator('#intro')
    await expect(intro).toBeVisible()

    // Wait for intro to fade
    await page.waitForTimeout(3000)
    await expect(intro).toHaveClass(/gone/)
  })

  test('collect console errors and logs', async ({ page }) => {
    const logs: string[] = []
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
      else logs.push(`[${msg.type()}] ${msg.text()}`)
    })

    page.on('pageerror', err => {
      errors.push(`PAGE ERROR: ${err.message}`)
    })

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    console.log('=== CONSOLE LOGS ===')
    for (const log of logs) console.log(log)
    console.log('=== ERRORS ===')
    for (const err of errors) console.log(err)

    // Check for critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('Certificate') && !e.includes('SSL')
    )
    console.log('=== CRITICAL ERRORS ===')
    for (const err of criticalErrors) console.log(err)
  })

  test('check AudioEngine state via window.synoptik', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Check if synoptik app is exposed on window
    const hasApp = await page.evaluate(() => {
      return typeof (window as Record<string, unknown>).synoptik !== 'undefined'
    })
    console.log('window.synoptik exists:', hasApp)

    // Check audioEngine state
    const audioState = await page.evaluate(() => {
      const app = (window as Record<string, unknown>).synoptik as Record<string, unknown> | undefined
      if (!app) return { error: 'no app' }

      const ae = app.audioEngine as Record<string, unknown> | undefined
      if (!ae) return { error: 'no audioEngine' }

      return {
        mode: ae.mode,
        isActive: ae.isActive,
        hasContext: typeof ae.context !== 'undefined',
      }
    })
    console.log('AudioEngine state:', JSON.stringify(audioState))

    // Check if audioAnalyser is exposed globally
    const hasAnalyser = await page.evaluate(() => {
      return typeof (window as Record<string, unknown>).__synoptikAnalyser !== 'undefined'
    })
    console.log('window.__synoptikAnalyser exists:', hasAnalyser)
  })

  test('check YouTube player functionality', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', err => errors.push(`PAGE ERROR: ${err.message}`))

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Open panel
    await page.click('#pt')
    await page.waitForTimeout(500)

    // Click Audio tab
    const tabs = page.locator('.tab')
    const tabCount = await tabs.count()
    console.log('Tab count:', tabCount)
    for (let i = 0; i < tabCount; i++) {
      const text = await tabs.nth(i).textContent()
      console.log(`Tab ${i}: "${text}"`)
    }

    // Find and click Audio tab
    await page.locator('.tab', { hasText: 'Audio' }).click()
    await page.waitForTimeout(500)

    // Check if YouTube section exists
    const ytSection = page.locator('text=YouTube')
    const ytExists = await ytSection.count()
    console.log('YouTube section found:', ytExists > 0)

    // Check for YouTube URL input
    const ytInput = page.locator('input[placeholder*="youtube" i], input[placeholder*="YouTube" i], input[placeholder*="URL" i], input[type="text"]')
    const inputCount = await ytInput.count()
    console.log('Text inputs found:', inputCount)

    if (inputCount > 0) {
      // Try entering a YouTube URL
      await ytInput.first().fill('https://www.youtube.com/watch?v=69zVJjH7xCs')
      await page.waitForTimeout(500)

      // Look for a load/laden button
      const loadBtn = page.locator('button, .ab, .preset-btn', { hasText: /laden|load/i })
      const btnCount = await loadBtn.count()
      console.log('Load buttons found:', btnCount)

      if (btnCount > 0) {
        await loadBtn.first().click()
        await page.waitForTimeout(3000)

        // Check if YouTube player appeared
        const ytPlayer = page.locator('#yt-player')
        const playerVisible = await ytPlayer.isVisible()
        console.log('YouTube player visible:', playerVisible)

        // Check if iframe was created
        const iframe = page.locator('#yt-player iframe')
        const iframeCount = await iframe.count()
        console.log('YouTube iframe count:', iframeCount)
      }
    }

    // Check audio state after YouTube load
    const audioState = await page.evaluate(() => {
      const app = (window as Record<string, unknown>).synoptik as Record<string, unknown> | undefined
      if (!app) return { error: 'no app' }
      const ae = app.audioEngine as Record<string, unknown> | undefined
      return {
        mode: ae?.mode,
        isActive: ae?.isActive,
      }
    })
    console.log('AudioEngine state after YouTube:', JSON.stringify(audioState))

    // Print any errors
    if (errors.length > 0) {
      console.log('=== ERRORS DURING YOUTUBE TEST ===')
      for (const err of errors) console.log(err)
    }
  })

  test('check Spotify button and errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Open panel > Audio tab
    await page.click('#pt')
    await page.waitForTimeout(300)
    await page.locator('.tab', { hasText: 'Audio' }).click()
    await page.waitForTimeout(300)

    // Find Spotify button
    const spotifyBtn = page.locator('.ab', { hasText: /spotify/i })
    const spotifyExists = await spotifyBtn.count()
    console.log('Spotify button found:', spotifyExists > 0)

    // Check Spotify client ID from env
    const clientId = await page.evaluate(() => {
      return (import.meta as Record<string, Record<string, unknown>>).env?.VITE_SPOTIFY_CLIENT_ID
    })
    console.log('Spotify Client ID available:', typeof clientId === 'string' && clientId.length > 0)

    // Check errors
    console.log('Errors:', errors)
  })
})
