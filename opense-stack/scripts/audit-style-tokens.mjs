import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const repoRoot = new URL("..", import.meta.url).pathname;
const scanRoots = ["apps/stoqr/src", "packages/ui/src"];
const extensions = new Set([".css", ".ts", ".tsx"]);

const excludedPathParts = new Set(["__tests__", "assets"]);
const excludedFiles = new Set([
  "apps/stoqr/src/components/LabelStudio/pdfExport.ts",
  "packages/ui/src/components/ui/ColorPalette.tsx",
  "packages/ui/src/components/ui/Shades.tsx",
  "packages/ui/src/styles.css",
  "packages/ui/src/typography-tokens.css",
]);

const tailwindPalette =
  "(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)";

const checks = [
  {
    name: "raw hex color",
    pattern: /#[0-9a-fA-F]{3,8}\b/g,
  },
  {
    name: "raw rgb/hsl color",
    pattern: /\b(?:rgb|rgba|hsl|hsla)\(/g,
  },
  {
    name: "Tailwind palette color class",
    pattern: new RegExp(
      `\\b(?:text|bg|border|ring|from|via|to)-${tailwindPalette}-\\d{2,3}\\b`,
      "g",
    ),
  },
  {
    name: "hard-coded arbitrary shadow color",
    pattern: /\bshadow-\[[^\]]*(?:rgba?\(|hsla?\(|#[0-9a-fA-F]{3,8})[^\]]*\]/g,
  },
];

const isExcluded = (relativePath) => {
  if (excludedFiles.has(relativePath)) return true;
  if (relativePath.endsWith(".test.ts") || relativePath.endsWith(".test.tsx")) {
    return true;
  }
  return relativePath
    .split(sep)
    .some((part) => excludedPathParts.has(part));
};

const getExtension = (path) => {
  if (path.endsWith(".tsx")) return ".tsx";
  if (path.endsWith(".ts")) return ".ts";
  if (path.endsWith(".css")) return ".css";
  return "";
};

const collectFiles = (dir, files = []) => {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectFiles(fullPath, files);
      continue;
    }

    if (extensions.has(getExtension(fullPath))) {
      files.push(fullPath);
    }
  }
  return files;
};

const violations = [];

for (const root of scanRoots) {
  for (const file of collectFiles(join(repoRoot, root))) {
    const relativePath = relative(repoRoot, file);
    if (isExcluded(relativePath)) continue;

    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      if (line.includes("style-token-audit-ignore")) return;

      for (const check of checks) {
        check.pattern.lastIndex = 0;
        const matches = [...line.matchAll(check.pattern)];
        for (const match of matches) {
          violations.push({
            file: relativePath,
            line: index + 1,
            check: check.name,
            match: match[0],
          });
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error("Style token audit failed. Use @repo/ui semantic tokens instead.");
  for (const violation of violations) {
    console.error(
      `${violation.file}:${violation.line} ${violation.check}: ${violation.match}`,
    );
  }
  process.exit(1);
}

console.log("Style token audit passed.");
