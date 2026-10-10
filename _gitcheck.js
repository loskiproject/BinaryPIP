const fs = require('fs')
const { execSync, spawnSync } = require('child_process')

let log = ''
const out = (msg) => { log += msg + '\n'; fs.writeFileSync('_gitlog.txt', log) }

// Try every possible git location
const tries = [
  'git',
  'C:\\Program Files\\Git\\bin\\git.exe',
  'C:\\Program Files\\Git\\cmd\\git.exe',
  'C:\\Program Files (x86)\\Git\\bin\\git.exe',
]

for (const g of tries) {
  try {
    const r = spawnSync(g, ['--version'], { encoding: 'utf8', timeout: 5000 })
    if (r.stdout) { out('FOUND: ' + g + ' => ' + r.stdout.trim()); break }
    if (r.error) out('ERR: ' + g + ' => ' + r.error.message)
  } catch(e) {
    out('CATCH: ' + g + ' => ' + e.message)
  }
}

// Also check via where command
try {
  const w = spawnSync('where', ['git'], { encoding: 'utf8', shell: true })
  out('where git: ' + (w.stdout || w.stderr || 'empty'))
} catch(e) {
  out('where error: ' + e.message)
}

// Check if .git exists
out('.git exists: ' + fs.existsSync('.git'))

// List root files
try {
  out('Root: ' + fs.readdirSync('.').join(', '))
} catch(e) {
  out('ls error: ' + e.message)
}

out('Done.')
