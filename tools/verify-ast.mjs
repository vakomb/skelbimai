#!/usr/bin/env node
// Proves two built HTML files are code-equivalent: every <script> has the same JS AST and every <style>
// the same CSS token stream (whitespace/formatting ignored). Markup outside blocks must match byte-for-byte.
// Usage: node tools/verify-ast.mjs reference.html dist/index.html
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let acorn;
for (const p of ["acorn", "/opt/node-tools/node_modules/acorn"]) { try { acorn = require(p); break; } catch {} }
if (!acorn) { console.error("acorn not found: run `npm i -D acorn`"); process.exit(2); }

const [a, b] = process.argv.slice(2);
const BLOCK = /<(style|script)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const split = html => { const blocks = [], shell = html.replace(BLOCK, (_, t, at, body) => (blocks.push({ t, at, body }), `<${t}${at}></${t}>`)); return { blocks, shell }; };

const DROP = new Set(["start", "end", "loc", "range", "raw"]);
function norm(node) {
  if (Array.isArray(node)) return node.map(norm);
  if (!node || typeof node !== "object") return node;
  const o = {};
  for (const k of Object.keys(node)) {
    if (DROP.has(k) && !(node.type === "TemplateElement")) continue;
    if (k === "directive") continue;
    if (node.type === "TemplateElement" && (k === "start" || k === "end")) continue;
    o[k] = typeof node[k] === "bigint" ? String(node[k]) : norm(node[k]);
  }
  return o;
}
const jsKey = src => JSON.stringify(norm(acorn.parse(src, { ecmaVersion: "latest", sourceType: "script", allowHashBang: true })));

// CSS: strip comments, then collapse all whitespace and whitespace around punctuation.
function cssKey(css) {
  let s = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const strings = [];
  s = s.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, m => (strings.push(m), `\u0000${strings.length - 1}\u0000`));
  s = s.replace(/\[([\w-]+)([~|^$*]?=)([^\]"'\s\u0000]+)\]/g, '[$1$2"$3"]'); // [a=b] == [a="b"]
  s = s.replace(/\s+/g, " ").replace(/\s*([{}:;,>~+()!/])\s*/g, "$1").replace(/;}/g, "}").replace(/;+/g, ";").trim();
  s = s.toLowerCase().replace(/\b0(\.\d)/g, "$1").replace(/(\.\d*?)0+\b(?=[a-z%]|[^\d])/g, "$1");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => strings[i].replace(/^'|'$/g, '"'));
}

const A = split(fs.readFileSync(a, "utf8")), B = split(fs.readFileSync(b, "utf8"));
let fail = 0;
if (A.shell !== B.shell) { console.error("✗ HTML markup outside <style>/<script> differs"); fail++; }
if (A.blocks.length !== B.blocks.length) { console.error(`✗ block count ${A.blocks.length} vs ${B.blocks.length}`); process.exit(1); }
A.blocks.forEach((x, i) => {
  const y = B.blocks[i];
  const label = `#${i + 1} <${x.t}${x.at}>`;
  if (x.t !== y.t || x.at !== y.at) { console.error(`✗ ${label}: tag/attrs differ`); fail++; return; }
  try {
    const same = x.t === "script" ? jsKey(x.body) === jsKey(y.body) : cssKey(x.body) === cssKey(y.body);
    if (!same) { console.error(`✗ ${label}: content differs`); fail++; }
  } catch (e) { console.error(`✗ ${label}: parse error ${e.message}`); fail++; }
});
console.log(fail ? `FAILED: ${fail} difference(s)` : `OK: ${A.blocks.length} blocks equivalent, markup identical`);
process.exit(fail ? 1 : 0);
