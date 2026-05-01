import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = execSync('git rev-parse --show-toplevel', {
  cwd: process.cwd(),
  encoding: 'utf8',
}).trim()

const trackedFiles = execSync('git ls-files', {
  cwd: repoRoot,
  encoding: 'utf8',
})
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)

const ignoredDirectories = [
  'node_modules/',
  'dist/',
  'playwright-report/',
  'test-results/',
]
const blockedTrackedPaths = [
  {
    name: 'Supabase CLI temp metadata',
    regex: /^supabase\/\.temp\//,
  },
]
const textFileExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.yaml',
  '.yml',
  '.toml',
  '.sql',
  '.env',
  '.txt',
])

const secretPatterns = [
  {
    name: 'Supabase service-role key',
    regex: /sb_secret_[A-Za-z0-9_-]{20,}/g,
  },
  {
    name: 'Live Stripe secret key',
    regex: /sk_live_[0-9a-zA-Z]{16,}/g,
  },
  {
    name: 'AWS access key',
    regex: /AKIA[0-9A-Z]{16}/g,
  },
  {
    name: 'Private key block',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    name: 'Hardcoded service-role env assignment',
    regex: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\n\r#]+/g,
  },
]

const allowedTokenValues = new Set([
  'sb_secret_....',
  'your-anon-key-here',
  'pk_test_...',
])

const maskSample = (value) => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 12) return '[redacted]'
  return `${normalized.slice(0, 6)}...[redacted]...${normalized.slice(-4)}`
}

const violations = []

for (const relativeFilePath of trackedFiles) {
  if (ignoredDirectories.some((dir) => relativeFilePath.includes(dir))) continue

  const absolutePath = path.resolve(repoRoot, relativeFilePath)

  if (existsSync(absolutePath)) {
    for (const { name, regex } of blockedTrackedPaths) {
      if (regex.test(relativeFilePath)) {
        violations.push({
          file: relativeFilePath,
          rule: name,
          sample: '[tracked generated file]',
        })
      }
    }
  }

  const extension = path.extname(relativeFilePath)
  const basename = path.basename(relativeFilePath)
  const isEnvLike = basename.startsWith('.env')

  if (!isEnvLike && !textFileExtensions.has(extension)) continue

  let content
  try {
    content = readFileSync(absolutePath, 'utf8')
  } catch {
    continue
  }

  for (const { name, regex } of secretPatterns) {
    const matches = content.match(regex)
    if (!matches) continue

    for (const match of matches) {
      if (name === 'Hardcoded service-role env assignment') {
        const [, value = ''] = match.split('=', 2)
        const normalizedValue = value.trim()
        if (
          normalizedValue === 'sb_secret_....' ||
          normalizedValue === '${SUPABASE_SERVICE_ROLE_KEY}' ||
          normalizedValue === '$SUPABASE_SERVICE_ROLE_KEY'
        ) {
          continue
        }
      }

      const isAllowed = allowedTokenValues.has(match.trim())
      if (isAllowed) continue

      violations.push({
        file: relativeFilePath,
        rule: name,
        sample: maskSample(match),
      })
    }
  }
}

if (violations.length > 0) {
  console.error('Potential secrets found in tracked files:')
  for (const violation of violations) {
    console.error(
      `- ${violation.file} | ${violation.rule} | ${violation.sample}`,
    )
  }
  console.error(
    '\nUse placeholders in tracked files and keep real secrets in untracked local env files.',
  )
  process.exit(1)
}

console.log('No obvious secrets found in tracked files.')
