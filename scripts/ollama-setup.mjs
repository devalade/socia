#!/usr/bin/env node
// Scan the machine for Ollama, start it when possible, choose an installed model,
// write the local OLLAMA_* settings to .env, and send a test prompt.
//
//   pnpm ollama:setup
//   pnpm ollama:setup --model deepseek-r1:8b
//   pnpm ollama:setup --check
//   pnpm ollama:setup --no-start
//
// The script does not download a model. Pull one with `ollama pull <model>`.
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, openSync, readFileSync, writeFileSync, mkdirSync, accessSync, constants } from 'node:fs'
import { randomBytes } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(root, '.env')
const args = process.argv.slice(2)
const flag = (name) => {
  const index = args.indexOf(name)
  if (index === -1) return undefined
  const value = args[index + 1]
  if (!value || value.startsWith('--')) fail(`${name} requires a value.`)
  return value
}
const has = (name) => args.includes(name)

if (has('--help') || has('-h')) {
  console.log(`Usage: pnpm ollama:setup [options]

  --model <name>     Use this model instead of the automatic choice
  --base-url <url>   Override the Ollama endpoint (default http://127.0.0.1:11434)
  --check            Scan and test only; do not write .env
  --no-start         Do not start Ollama if it is not running
  -h, --help         Show this help`)
  process.exit(0)
}

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

function readEnv() {
  if (!existsSync(envPath)) return ''
  return readFileSync(envPath, 'utf8')
}

function envValue(content, key) {
  const line = content.split(/\r?\n/).find((item) => item.startsWith(`${key}=`))
  return line ? line.slice(key.length + 1).trim() : ''
}

function setEnv(content, key, value) {
  const lines = content ? content.split(/\r?\n/) : []
  let found = false
  const next = lines.map((line) => {
    if (!line.startsWith(`${key}=`)) return line
    if (found) return line
    found = true
    return `${key}=${value}`
  })
  if (!found) next.push(`${key}=${value}`)
  return next.join('\n').replace(/\n+$/, '') + '\n'
}

function normalizeBase(raw) {
  let value = String(raw || '').trim().replace(/\/+$/, '')
  if (!value) value = 'http://127.0.0.1:11434'
  if (!/^https?:\/\//i.test(value)) value = `http://${value}`
  if (value.endsWith('/v1')) value = value.slice(0, -3)
  return value.replace(/\/+$/, '')
}

function baseFromEnv(content) {
  const fromFlag = flag('--base-url')
  if (fromFlag) return normalizeBase(fromFlag)
  const fromFile = envValue(content, 'OLLAMA_BASE_URL')
  if (fromFile) return normalizeBase(fromFile)
  const fromProcess = process.env.OLLAMA_BASE_URL
  if (fromProcess) return normalizeBase(fromProcess)
  const host = process.env.OLLAMA_HOST
  if (host) return normalizeBase(host.includes('://') ? host : `http://${host}`)
  return 'http://127.0.0.1:11434'
}

function commandPath(name) {
  try {
    const command = process.platform === 'win32' ? 'where' : 'which'
    const output = execFileSync(command, [name], { encoding: 'utf8', timeout: 4000 })
    return output.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || null
  } catch {
    return null
  }
}

function findBinary() {
  const candidates = [
    process.env.OLLAMA_BIN,
    commandPath('ollama'),
    '/opt/homebrew/bin/ollama',
    '/usr/local/bin/ollama',
    path.join(os.homedir(), '.local/bin/ollama'),
    '/Applications/Ollama.app/Contents/Resources/ollama',
    path.join(os.homedir(), 'Applications/Ollama.app/Contents/Resources/ollama'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // Try the next candidate.
    }
  }
  return null
}

function binaryVersion(binary) {
  try {
    return execFileSync(binary, ['--version'], { encoding: 'utf8', timeout: 5000 }).trim().split(/\r?\n/)[0]
  } catch {
    return null
  }
}

async function apiJson(url, timeout = 2000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout) })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return response.json()
}

async function apiUp(base) {
  try {
    await apiJson(`${base}/api/tags`, 1500)
    return true
  } catch {
    return false
  }
}

async function listModels(base) {
  const payload = await apiJson(`${base}/api/tags`, 5000)
  const models = Array.isArray(payload.models) ? payload.models : []
  return models
    .map((model) => ({
      name: typeof model.name === 'string' ? model.name : '',
      size: typeof model.size === 'number' ? model.size : null,
      parameters: model.details && typeof model.details.parameter_size === 'string' ? model.details.parameter_size : '',
    }))
    .filter((model) => model.name)
}

function pickModel(models, current) {
  const requested = flag('--model')
  if (requested) {
    const installed = models.some((model) => model.name === requested || model.name.split(':')[0] === requested)
    if (!installed) fail(`Model "${requested}" is not installed. Available models: ${models.map((model) => model.name).join(', ') || 'none'}.`)
    return requested
  }
  if (current) {
    const installed = models.some((model) => model.name === current || model.name.split(':')[0] === current)
    if (installed) return current
  }
  for (const pattern of [/deepseek/i, /qwen/i, /llama/i, /mistral/i, /gemma/i, /phi/i]) {
    const match = models.find((model) => pattern.test(model.name))
    if (match) return match.name
  }
  return models[0]?.name || ''
}

function startOllama(binary, base) {
  const host = new URL(base).host
  const logDir = path.join(os.homedir(), '.ollama')
  const logPath = path.join(logDir, 'socia-serve.log')
  mkdirSync(logDir, { recursive: true })
  const fd = openSync(logPath, 'a')
  const child = spawn(binary, ['serve'], {
    detached: true,
    stdio: ['ignore', fd, fd],
    env: { ...process.env, OLLAMA_HOST: host },
  })
  child.unref()
  return { pid: child.pid, logPath }
}

async function waitForApi(base, attempts = 50) {
  for (let index = 0; index < attempts; index += 1) {
    if (await apiUp(base)) return true
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  return false
}

async function testModel(base, model) {
  const started = Date.now()
  const response = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Tu réponds uniquement par le mot OK.' },
        { role: 'user', content: 'Réponds OK.' },
      ],
      temperature: 0,
      max_tokens: 16,
      stream: false,
    }),
    signal: AbortSignal.timeout(120_000),
  })
  const body = await response.text()
  if (!response.ok) throw new Error(`${response.status} ${body.slice(0, 240)}`)
  let content = ''
  try {
    const payload = JSON.parse(body)
    content = payload.choices?.[0]?.message?.content ?? payload.response ?? ''
  } catch {
    content = body.slice(0, 80)
  }
  return { content: String(content).trim().slice(0, 80), ms: Date.now() - started }
}

function logTail(logPath) {
  try {
    return readFileSync(logPath, 'utf8').trim().split(/\r?\n/).slice(-12).join('\n')
  } catch {
    return ''
  }
}

const currentEnv = readEnv()
const base = baseFromEnv(currentEnv)
const binary = findBinary()
const version = binary ? binaryVersion(binary) : null
let running = await apiUp(base)
let started = null

if (!running && binary && !has('--no-start')) {
  console.log(`Starting Ollama on ${base} ...`)
  started = startOllama(binary, base)
  running = await waitForApi(base)
}

let models = []
let modelsError = null
if (running) {
  try {
    models = await listModels(base)
  } catch (error) {
    modelsError = error instanceof Error ? error.message : String(error)
  }
}

const envModel = envValue(currentEnv, 'OLLAMA_MODEL') || process.env.OLLAMA_MODEL || ''
const selected = running
  ? (models.length ? pickModel(models, envModel) : (flag('--model') || ''))
  : (flag('--model') || envModel)
let testResult = null
let testError = null
if (running && selected) {
  try {
    console.log(`Testing ${selected} (first load can take a while) ...`)
    testResult = await testModel(base, selected)
  } catch (error) {
    testError = error instanceof Error ? error.message : String(error)
  }
}

const changed = []
let nextEnv = currentEnv
if (!envValue(nextEnv, 'APP_ENV')) {
  nextEnv = setEnv(nextEnv, 'APP_ENV', 'local')
  changed.push('APP_ENV')
}
if (!envValue(nextEnv, 'BETTER_AUTH_URL')) {
  nextEnv = setEnv(nextEnv, 'BETTER_AUTH_URL', 'http://localhost:3000')
  changed.push('BETTER_AUTH_URL')
}
if (!envValue(nextEnv, 'BETTER_AUTH_SECRET')) {
  nextEnv = setEnv(nextEnv, 'BETTER_AUTH_SECRET', randomBytes(48).toString('base64'))
  changed.push('BETTER_AUTH_SECRET')
}
const beforeBase = envValue(nextEnv, 'OLLAMA_BASE_URL')
if (beforeBase !== base) {
  nextEnv = setEnv(nextEnv, 'OLLAMA_BASE_URL', base)
  changed.push('OLLAMA_BASE_URL')
}
const beforeModel = envValue(nextEnv, 'OLLAMA_MODEL')
if (selected && beforeModel !== selected) {
  nextEnv = setEnv(nextEnv, 'OLLAMA_MODEL', selected)
  changed.push('OLLAMA_MODEL')
} else if (!selected && running && beforeModel) {
  nextEnv = setEnv(nextEnv, 'OLLAMA_MODEL', '')
  changed.push('OLLAMA_MODEL')
}

if (!has('--check') && changed.length) writeFileSync(envPath, nextEnv)

console.log('')
console.log('SOCIA · Ollama setup')
console.log('')
console.log('System')
console.log(`  binary    ${binary ? `${binary}${version ? ` (${version})` : ''}` : 'not found'}`)
console.log(`  endpoint  ${base}`)
console.log(`  status    ${running ? (started ? `started (pid ${started.pid})` : 'running') : 'unreachable'}`)
console.log(`  models    ${models.length ? `${models.length} installed: ${models.map((model) => `${model.name}${model.parameters ? ` (${model.parameters})` : ''}`).join(', ')}` : 'none'}`)
if (modelsError) console.log(`  error     ${modelsError}`)
console.log('')
console.log('Selection')
console.log(`  model     ${selected || 'none'}`)
if (!selected && running) console.log('            Pull a model with `ollama pull <model>`, then rerun this command.')
if (!running && !binary) {
  console.log('')
  console.log('Install Ollama')
  console.log('  macOS:  brew install ollama   (or https://ollama.com/download)')
  console.log('  then:   ollama serve')
  console.log('          ollama pull <model>')
  console.log('          pnpm ollama:setup')
}
if (started && !running) {
  console.log('')
  console.log(`Ollama did not answer. Log: ${started.logPath}`)
  const tail = logTail(started.logPath)
  if (tail) console.log(tail)
}
console.log('')
console.log('Env')
console.log(`  ${has('--check') ? 'check only, .env untouched' : changed.length ? `.env updated: ${changed.join(', ')}` : '.env already up to date'}`)
console.log(`  file      ${envPath}`)
console.log('')
console.log('Test')
if (testResult) console.log(`  OK in ${(testResult.ms / 1000).toFixed(1)}s, response: ${testResult.content || '(empty)'}`)
else if (testError) console.log(`  FAILED: ${testError}`)
else if (!running) console.log('  skipped: Ollama is not reachable')
else if (!selected) console.log('  skipped: no model selected')
console.log('')
console.log('Next')
console.log('  pnpm dev')
console.log('  open http://localhost:3000')
console.log('  /health exposes aiLocal.available and the detected model.')

process.exit(running && selected && testResult ? 0 : 1)
