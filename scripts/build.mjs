import fs from 'node:fs';

/** When flattening .js files into dist/, relative ESM imports must be
 *  rewritten to match the flattened filename layout produced by this script.
 *
 * Layout mapping used by this script:
 *   src/index.js    → dist/src-index.js
 *   src/cli.js      → dist/src-cli.js
 */
const FLAT_MAP = new Map([
  ['src/index.js', 'src-index.js'],
  ['src/cli.js', 'src-cli.js'],
]);

/** Rewrites ESM relative imports that reference known source files mapped
 * into the flattened dist layout. Non-mapped imports are left untouched.
 */
function rewriteImports(content) {
  // Build lookup: given basename "index.js", find its mapped output name "src-index.js"
  const byName = new Map();
  for (const [srcPath, outName] of FLAT_MAP.entries()) {
    const base = srcPath.split('/').pop();
    byName.set(base, outName);
  }

  // Replace both single and double quoted imports
  for (const q of ["'", '"']) {
    const names = [...byName.keys()].sort((a, b) => b.length - a.length);
    const escapedNames = names.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    if (!escapedNames) continue;
    const pattern = new RegExp(`(from\\s*)(${q})\\.\\/(${escapedNames})${q}`, 'g');
    content = content.replace(pattern, (match, prefix, openQ, fileName) => {
      const outName = byName.get(fileName);
      if (!outName) return match;
      return `${prefix}${openQ}.\/${outName}${openQ}`;
    });
  }
  return content;
}

// Top-level invocation appended to flatten CLI sources into runnable entries
const CLI_INVOCATION = '\n\nif (typeof process !== "undefined" && typeof run === "function") {\n  process.exitCode = run(process.argv.slice(2));\n}\n';

fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist', { recursive: true });

for (const file of ['src/index.js', 'src/cli.js', 'SKILL.md', 'README.md']) {
  const outName = FLAT_MAP.get(file) || file.replaceAll('/', '-');
  const content = fs.readFileSync(file, 'utf8');

  if (file.endsWith('.js')) {
    // Rewrite relative ESM imports to match the flattened layout
    let transformed = rewriteImports(content);
    // Append runtime invocation for executable CLI entry points
    if (file === 'src/cli.js') {
      transformed += CLI_INVOCATION;
    }
    fs.writeFileSync(`dist/${outName}`, transformed, 'utf8');
  } else {
    fs.copyFileSync(file, `dist/${outName}`);
  }
}

console.log('build ok');
