const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const cssFiles = [
  path.join(projectRoot, "assets", "css", "styles.css"),
  path.join(projectRoot, "assets", "css", "utility-classes.css"),
].filter(fs.existsSync);

const exts = [".php", ".html", ".js"];
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "vendor") continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const files = walk(projectRoot).filter((f) => exts.includes(path.extname(f).toLowerCase()));

function extractClasses(css) {
  const classes = new Set();
  const re = /(^|[^\w-])\.([_a-zA-Z]+[_a-zA-Z0-9-]*)(?=[\s\.:#{,>])/g;
  let m;
  while ((m = re.exec(css))) {
    const cls = m[2];
    if (!cls) continue;
    if (/^(btn|col|row|container|d-|text-|bg-|mt-|mb-|me-|ms-|ps-|pe-|py-|px-|fs-)/.test(cls)) continue; // ignore bootstrap-like utility prefixes
    classes.add(cls);
  }
  return Array.from(classes).sort();
}

function findUsage(content, cls) {
  const re = new RegExp("\\b" + cls.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\b", "g");
  return re.test(content);
}

function audit() {
  const report = [];
  const dupMap = new Map();
  const used = new Set();
  const unused = new Set();
  const allContent = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");

  for (const cssPath of cssFiles) {
    const css = fs.readFileSync(cssPath, "utf8");
    const classes = extractClasses(css);
    for (const c of classes) {
      const key = c;
      dupMap.set(key, (dupMap.get(key) || 0) + 1);
      if (findUsage(allContent, c)) used.add(c);
      else unused.add(c);
    }
  }

  const dups = Array.from(dupMap.entries()).filter(([_, cnt]) => cnt > 1);
  const lines = [];
  lines.push("# CSS Audit Report");
  lines.push("");
  lines.push("## Duplicated selectors (appear in multiple CSS files):");
  for (const [cls, cnt] of dups) lines.push(`- .${cls} (${cnt} files)`);
  lines.push("");
  lines.push("## Unused selectors (not referenced in .php/.html/.js):");
  for (const cls of Array.from(unused).filter((c) => !used.has(c)).sort()) lines.push(`- .${cls}`);
  lines.push("");
  fs.mkdirSync(path.join(projectRoot, "tools", "reports"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "tools", "reports", "css-audit-report.md"), lines.join("\n"), "utf8");
}

audit();

