const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dryRun = false; // set true to preview only

// replacements now handle substrings (e.g. useOrganizationMembers) and preserve casing
function preserveCase(match, replacementBase) {
  if (match === match.toUpperCase()) return replacementBase.toUpperCase();
  if (match[0] === match[0].toUpperCase()) return replacementBase[0].toUpperCase() + replacementBase.slice(1);
  return replacementBase.toLowerCase();
}

const replacements = [
  // plural first to avoid partial-singular matches
  { from: /organizations/ig, to: function(m) { return preserveCase(m, 'organisations'); } },
  { from: /organization/ig, to: function(m) { return preserveCase(m, 'organisation'); } },
];

function shouldIgnore(name) {
  const ignore = ['node_modules', '.git', 'dist', 'build', 'coverage'];
  return ignore.some(i => name.includes(i));
}

function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const textExts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.sql', '.css', '.html'];
  if (!textExts.includes(ext)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let updated = content;
  replacements.forEach(r => { updated = updated.replace(r.from, r.to); });

  if (updated !== content) {
    if (dryRun) {
      console.log('[DRY] update content:', filePath);
    } else {
      fs.writeFileSync(filePath, updated, 'utf8');
      console.log('updated content:', filePath);
    }
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach(entry => {
    const full = path.join(dir, entry.name);
    if (shouldIgnore(full)) return;
    if (entry.isDirectory()) {
      walk(full);
      // rename directory if contains 'organization' (case-insensitive)
      if (/organization/i.test(entry.name)) {
        const newName = entry.name
          .replace(/organizations/ig, (m) => preserveCase(m, 'organisations'))
          .replace(/organization/ig, (m) => preserveCase(m, 'organisation'));
        const newPath = path.join(dir, newName);
        if (!dryRun) {
          try { fs.renameSync(full, newPath); console.log('renamed dir:', full, '->', newPath); } catch(e) { console.error('rename dir failed', full, e.message); }
        } else {
          console.log('[DRY] rename dir:', full, '->', newPath);
        }
      }
    } else if (entry.isFile()) {
      processFile(full);
      // rename file if contains 'organization' (case-insensitive)
      if (/organization/i.test(entry.name)) {
        const newName = entry.name
          .replace(/organizations/ig, (m) => preserveCase(m, 'organisations'))
          .replace(/organization/ig, (m) => preserveCase(m, 'organisation'));
        const newPath = path.join(dir, newName);
        if (!dryRun) {
          try { fs.renameSync(full, newPath); console.log('renamed file:', full, '->', newPath); } catch(e) { console.error('rename file failed', full, e.message); }
        } else {
          console.log('[DRY] rename file:', full, '->', newPath);
        }
      }
    }
  });
}

console.log('Starting rename from organisation -> organisation at', root);
walk(root);
console.log('Done');
