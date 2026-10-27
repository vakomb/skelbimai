#!/usr/bin/env node
// Build: src/index.html (template) -> dist/index.html (single self-contained file).
// No dependencies. Usage: node tools/build.mjs [--out dist/index.html]
//
// Template directives (each is replaced verbatim, nothing else is touched):
//   <!-- @include partials/x.html -->            -> file contents (marker's trailing newline is consumed)
//   <!-- @inline <style id="a"> styles/x.css --> -> <style id="a">{file}</style>
//   <!-- @inline <script id="a"> scripts/x.js --> -> <script id="a">{file}</script>
//   <!-- @inline <script> scripts/app/ iife -->   -> every *.js in that folder (sorted by name) concatenated
//                                                  and wrapped in one "(() => { ... })();" so all parts share
//                                                  a single scope, exactly like the original one big script
//   "@@datauri:assets/x.png@@" (inside any file)  -> "data:image/png;base64,...."
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "src");
const args = process.argv.slice(2);
const outArg = args.includes("--out") ? args[args.indexOf("--out") + 1] : "dist/index.html";
const OUT = path.resolve(root, outArg);

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf"
};

function read(rel) {
  const file = path.join(SRC, rel);
  if (!fs.existsSync(file)) throw new Error(`Missing source file: src/${rel}`);
  return fs.readFileSync(file, "utf8");
}

function inlineDataUris(text) {
  return text.replace(/@@datauri:([^@"'\s]+)@@/g, (_, rel) => {
    const file = path.join(SRC, rel);
    const mime = MIME[path.extname(rel).toLowerCase()];
    if (!mime) throw new Error(`Unknown data-uri type: ${rel}`);
    return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
  });
}

function closingGuard(rel, tag, body) {
  // A literal </style> or </script> inside a block would end it early in the browser.
  if (new RegExp(`</${tag}`, "i").test(body))
    throw new Error(`src/${rel} contains "</${tag}" which would break the page`);
}

let html = read("index.html");
html = html.replace(/<!-- @include (\S+) -->\n?/g, (_, rel) => read(rel));
let blocks = 0;
function readBlock(rel, flag) {
  if (!rel.endsWith("/")) return read(rel);
  const dir = path.join(SRC, rel);
  const files = fs
    .readdirSync(dir)
    .filter(f => f.endsWith(".js"))
    .sort();
  if (!files.length) throw new Error(`No .js files in src/${rel}`);
  const joined = files.map(f => read(rel + f)).join("\n");
  if (flag === "iife") return `(() => {\n${joined}\n})();\n`;
  if (flag) throw new Error(`Unknown flag "${flag}" for src/${rel}`);
  return joined;
}

html = html.replace(
  /<!-- @inline <(style|script)([^>]*)> (\S+)(?: (\w+))? -->/g,
  (_, tag, attrs, rel, flag) => {
    const body = inlineDataUris(readBlock(rel, flag));
    closingGuard(rel, tag, body);
    blocks++;
    return `<${tag}${attrs}>${body}</${tag}>`;
  }
);
if (/<!-- @(include|inline) /.test(html)) throw new Error("Unresolved build directive left in output");

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
// src/public/** – statiniai failai (pvz. sutarties šablonas), kopijuojami šalia index.html.
const PUB = path.join(SRC, "public");
if (fs.existsSync(PUB) && path.resolve(path.dirname(OUT)) !== path.resolve(PUB))
  fs.cpSync(PUB, path.dirname(OUT), { recursive: true });
console.log(
  `Built ${path.relative(root, OUT)} — ${blocks} inline blocks, ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`
);
