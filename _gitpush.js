const { execSync } = require('child_process')
const path = require('path')

// Find git — check common Windows locations
const gitPaths = [
  'C:\\Program Files\\Git\\bin\\git.exe',
  'C:\\Program Files (x86)\\Git\\bin\\git.exe',
  'C:\\Users\\mutua\\AppData\\Local\\Programs\\Git\\bin\\git.exe',
  'git', // in PATH
]

let gitCmd = null
for (const g of gitPaths) {
  try {
    execSync(`"${g}" --version`, { stdio: 'pipe' })
    gitCmd = `"${g}"`
    console.log('Found git:', g)
    break
  } catch {}
}

if (!gitCmd) {
  console.log('Git not found in any standard location.')
  console.log('Checking winget...')
  try {
    const dirs = require('fs').readdirSync('C:\\Program Files\\')
    const gitDir = dirs.find(d => d.toLowerCase().includes('git'))
    console.log('Git dir:', gitDir)
  } catch (e) {
    console.log('Could not list Program Files:', e.message)
  }
  process.exit(1)
}

const run = (cmd) => {
  console.log('\n>', cmd.replace(gitCmd, 'git'))
  try {
    const out = execSync(`${gitCmd} ${cmd}`, { encoding: 'utf8', cwd: process.cwd() })
    if (out.trim()) console.log(out.trim())
    return out
  } catch (e) {
    const msg = (e.stdout || '') + (e.stderr || '')
    console.log(msg.trim())
    return msg
  }
}

// Check if already a git repo
try {
  run('status --short')
} catch {
  console.log('Initialising repo...')
  run('init')
}

// Set identity
run('config user.email "mutuagedeon77@gmail.com"')
run('config user.name "Gedeon Mutua"')

// Stage all files (respecting .gitignore)
run('add .')

// Show what will be committed
const status = run('status --short')
console.log('\nFiles to commit:', status.split('\n').filter(Boolean).length)

// Commit
run('commit -m "NEXSMARKETS v1.0 — Full platform with M-Pesa STK Push, Admin Dashboard, Auth Portal, AI Scanner"')

// Check remotes
const remotes = run('remote -v')
console.log('Remotes:', remotes || 'none')
