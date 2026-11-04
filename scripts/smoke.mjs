import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const base = process.env.BASE_URL ?? 'http://localhost:3000'
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD
const create = process.env.SMOKE_CREATE === '1'

if (!email || !password) {
  console.error('SMOKE_EMAIL and SMOKE_PASSWORD are required.')
  process.exit(2)
}

const shots = path.resolve('docs/shots/smoke')
await fs.mkdir(shots, { recursive: true })

const health = await fetch(`${base}/health`).catch((error) => {
  throw new Error(`Health check failed: ${error.message}`)
})
const healthBody = await health.json()
assert.equal(health.status, 200, `Health returned ${health.status}`)
assert.equal(healthBody.ok, true, 'Health is not ok')
assert.equal(healthBody.database, true, 'D1 is not reachable')

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' })
const page = await context.newPage()
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))

const step = (name) => console.log(`· ${name}`)

try {
  step('anonymous /app redirects to /connexion')
  await page.goto(`${base}/app`, { waitUntil: 'networkidle' })
  await page.waitForURL('**/connexion**', { timeout: 20_000 })
  assert.ok(page.url().includes('/connexion'))

  step('sign in')
  // Type rather than fill: React's value tracker needs the keystrokes on a hydrated controlled form.
  const emailField = page.getByLabel('Adresse e-mail')
  await emailField.click()
  await page.keyboard.type(email, { delay: 5 })
  const passwordField = page.getByLabel('Mot de passe', { exact: true })
  await passwordField.click()
  await page.keyboard.type(password, { delay: 5 })
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL('**/app', { timeout: 25_000 })
  await page.getByText('Briefing de posture').waitFor({ timeout: 20_000 })
  await page.screenshot({ path: path.join(shots, 'dashboard.png'), fullPage: true })

  step('history')
  await page.goto(`${base}/app/investigations`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Dossiers' }).waitFor({ timeout: 20_000 })
  await page.screenshot({ path: path.join(shots, 'history.png'), fullPage: true })

  step('administration (admin only)')
  await page.goto(`${base}/app/settings?tab=ia`, { waitUntil: 'networkidle' })
  if (page.url().includes('/app/settings')) {
    await page.getByText('Catalogue des modèles').waitFor({ timeout: 20_000 })
    await page.screenshot({ path: path.join(shots, 'settings.png'), fullPage: true })
  }

  if (create) {
    step('create a draft from the sample alert')
    await page.goto(`${base}/app/investigations/new`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Charger un exemple' }).click()
    await page.getByRole('button', { name: 'Brouillon', exact: true }).click()
    await page.waitForURL('**/app/investigations/inv_*', { timeout: 30_000 })
    await page.getByText('Encoded PowerShell launched from an Office application').first().waitFor({ timeout: 20_000 })
    await page.screenshot({ path: path.join(shots, 'investigation-draft.png'), fullPage: true })
  }

  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`)
  console.log('✓ SOCIA smoke passed')
} catch (error) {
  console.error('✗ SOCIA smoke failed')
  console.error(error instanceof Error ? error.message : error)
  const body = await page.locator('body').innerText().catch(() => '')
  console.error(body.slice(0, 1200))
  await page.screenshot({ path: path.join(shots, 'failure.png'), fullPage: true }).catch(() => {})
  process.exitCode = 1
} finally {
  await browser.close()
}
