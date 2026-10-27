#!/usr/bin/env node
// Fast static check (no browser): every JS file parses, and docs/OVERRIDES.md is regenerated with the list of
// app functions that are declared more than once or re-assigned later (the "patch chain").
// Usage: node tools/check.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
let acorn;
for (const p of ["acorn", "/opt/node-tools/node_modules/acorn"]) { try { acorn = require(p); break; } catch {} }
if (!acorn) { console.error("acorn not found: run `npm install`"); process.exit(2); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = p => path.relative(root, p);
const parse = (file) => acorn.parse(fs.readFileSync(file, "utf8"), { ecmaVersion: "latest", sourceType: "script", locations: true });

let errors = 0;
const jsFiles = [
  ...fs.readdirSync(path.join(root, "src/scripts")).filter(f => f.endsWith(".js")).map(f => path.join(root, "src/scripts", f)),
  ...fs.readdirSync(path.join(root, "src/scripts/app")).filter(f => f.endsWith(".js")).sort().map(f => path.join(root, "src/scripts/app", f))
];
for (const f of jsFiles) {
  try { parse(f); } catch (e) { errors++; console.error(`✗ ${rel(f)}: ${e.message}`); }
}

// Patch chain inside the shared app scope.
const appDir = path.join(root, "src/scripts/app");
const defs = new Map();
const add = (name, file, line, kind) => { if (!defs.has(name)) defs.set(name, []); defs.get(name).push({ file, line, kind }); };
for (const f of fs.readdirSync(appDir).filter(f => f.endsWith(".js")).sort()) {
  let ast; try { ast = parse(path.join(appDir, f)); } catch { continue; }
  for (const n of ast.body) {
    if (n.type === "FunctionDeclaration") add(n.id.name, f, n.loc.start.line, "function");
    if (n.type === "ExpressionStatement" && n.expression.type === "AssignmentExpression" && n.expression.left.type === "Identifier")
      add(n.expression.left.name, f, n.loc.start.line, "reassigned");
  }
}
const rows = [...defs].filter(([, v]) => v.length > 1);
const md = [
  "# Funkcijų perrašymų grandinės (generuojama)",
  "",
  "Šis failas sugeneruotas `npm run check`. Nekeisk ranka.",
  "",
  "Programėlė augo pridedant naujas versijas, kurios **perrašo** ankstesnes funkcijas tame pačiame scope.",
  "Galioja **paskutinis** įrašas sąraše. `function` = deklaracija (keli `function X` tame pačiame scope: laimi paskutinė,",
  "nes deklaracijos „iškeliamos“ – hoisting), `reassigned` = `X = function…` vykdymo metu (dažnai apgaubia ankstesnę versiją).",
  "",
  "| Funkcija | Grandinė (failas:eilutė) |",
  "|---|---|",
  ...rows.map(([name, v]) => `| \`${name}\` | ${v.map(d => `${d.file.replace(/\.js$/, "")}:${d.line} (${d.kind})`).join(" → ")} |`),
  ""
].join("\n");
fs.writeFileSync(path.join(root, "docs/OVERRIDES.md"), md);
const dupDecl = rows.filter(([, v]) => v.filter(d => d.kind === "function").length > 1);
console.log(`${errors ? "✗" : "✓"} ${jsFiles.length} JS files parsed${errors ? `, ${errors} error(s)` : ""}`);
console.log(`ℹ ${rows.length} functions with patch chains → docs/OVERRIDES.md` + (dupDecl.length ? `; duplicate declarations: ${dupDecl.map(([n]) => n).join(", ")}` : ""));
process.exit(errors ? 1 : 0);
