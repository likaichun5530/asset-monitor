// Local-only refresh: credentials never go to Vercel or the browser.
import { readFile, open, rename } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { snapshotFromSheets } from '../shared/income-source.js'
const output = process.env.INCOME_SNAPSHOT_PATH
if (!output) throw new Error('Set INCOME_SNAPSHOT_PATH to a private path outside this repository')
const { resolve, sep } = await import('node:path')
const root = resolve(new URL('..', import.meta.url).pathname)
if (resolve(output).startsWith(root + sep)) throw new Error('Snapshot must stay outside the repository')
const tokenPath = process.env.INCOME_OAUTH_PATH || join(process.env.HERMES_HOME || join(homedir(), '.hermes'), 'google-sheets-private/token.json')
const credentials = JSON.parse(await readFile(tokenPath, 'utf8'))
if (JSON.stringify(credentials.scopes) !== JSON.stringify(['https://www.googleapis.com/auth/spreadsheets.readonly'])) throw new Error('Only existing Sheets read-only OAuth is supported')
async function request(url, options = {}) {
 // curl honors this host's HTTPS_PROXY; Node 22 fetch ignores it by default.
 // Pass secrets over stdin, never command arguments or logs.
 const { spawn } = await import('node:child_process')
 const config = [`url = ${JSON.stringify(url)}`]
 for (const [name, value] of Object.entries(options.headers || {})) config.push(`header = ${JSON.stringify(`${name}: ${value}`)}`)
 if (options.body) config.push(`data = ${JSON.stringify(String(options.body))}`)
 const text = await new Promise((resolve, reject) => {
   const child = spawn('curl', ['--silent', '--fail', '--max-time', '30', '--config', '-'], { stdio: ['pipe', 'pipe', 'pipe'] })
   let output = ''
   child.stdout.on('data', chunk => { output += chunk })
   child.on('error', () => reject(new Error('curl is required for proxy-aware Google reads')))
   child.on('close', code => code === 0 ? resolve(output) : reject(new Error(`Google read failed (curl exit ${code}); no credentials logged`)))
   child.stdin.end(config.join('\n'))
 })
 return JSON.parse(text)
}
const refreshed = await request('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: credentials.client_id, client_secret: credentials.client_secret, refresh_token: credentials.refresh_token, grant_type: 'refresh_token' }) })
const base = 'https://sheets.googleapis.com/v4/spreadsheets/1zRY0Ov4MLu1pTSXLMFh6_1bj8DBDW-0-rjUGm2jPJm0'
const headers = { Authorization: `Bearer ${refreshed.access_token}` }
const metadata = await request(base + '?fields=sheets(properties(title))', { headers })
const query = new URLSearchParams({ valueRenderOption: 'UNFORMATTED_VALUE' })
for (const sheet of metadata.sheets) if (/^\d{4}$/.test(sheet.properties.title)) query.append('ranges', `'${sheet.properties.title}'!A1:Z60`)
const snapshot = snapshotFromSheets(await request(base + '/values:batchGet?' + query, { headers }), new Date().toISOString())
const temporary = join(dirname(output), `.income-${process.pid}.tmp`)
const file = await open(temporary, 'wx', 0o600)
try { await file.writeFile(JSON.stringify(snapshot, null, 2)); } finally { await file.close() }
await rename(temporary, output)
console.log(`Verified ${snapshot.years.length} years; read at ${snapshot.snapshotAt}; private snapshot refreshed. No credentials copied.`)
