import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const requiredFiles = [
  "index.html",
  "styles.css",
  "content.js",
  "app.js",
  "robots.txt",
  "sitemap.xml",
  ".nojekyll"
];

const failures = [];
const fail = (message) => failures.push(message);

for (const file of requiredFiles) {
  if (!existsSync(file)) fail(`Missing required file: ${file}`);
}

const textFiles = ["index.html", "styles.css", "content.js", "app.js", "README.md", "robots.txt", "sitemap.xml"];
for (const file of textFiles) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  if (text.includes("\u2014")) fail(`Em dash found in ${file}`);
  if (/[ \t]+$/m.test(text)) fail(`Trailing whitespace found in ${file}`);
  if (/\/Users\/|file:\/\//i.test(text)) {
    fail(`Private-source marker found in ${file}`);
  }
}

const html = readFileSync("index.html", "utf8");
for (const expected of [
  "Design systems that survive contact with reality.",
  'id="map"',
  'id="design-loop"',
  'id="reliability"',
  'id="interview-lab"',
  'id="resources"',
  'href="styles.css"',
  'src="content.js"',
  'src="app.js"'
]) {
  if (!html.includes(expected)) fail(`Missing required HTML marker: ${expected}`);
}

const idMatches = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = idMatches.filter((id, index) => idMatches.indexOf(id) !== index);
if (duplicateIds.length) fail(`Duplicate HTML IDs: ${[...new Set(duplicateIds)].join(", ")}`);

const contentSource = readFileSync("content.js", "utf8");
const context = { window: {} };
vm.createContext(context);
new vm.Script(contentSource, { filename: "content.js" }).runInContext(context);
const data = context.window.FIELD_GUIDE_DATA;
if (!data) fail("content.js did not publish FIELD_GUIDE_DATA");

if (data) {
  const expectedCounts = { modules: 10, patterns: 20, resources: 36, drills: 24, glossary: 36 };
  for (const [key, minimum] of Object.entries(expectedCounts)) {
    if (!Array.isArray(data[key]) || data[key].length < minimum) {
      fail(`${key} must contain at least ${minimum} entries`);
    }
  }

  for (const key of ["modules", "patterns", "resources", "drills", "glossary"]) {
    const ids = data[key].map((item) => item.id);
    if (new Set(ids).size !== ids.length) fail(`Duplicate IDs in ${key}`);
  }

  const resourceIds = new Set(data.resources.map((resource) => resource.id));
  for (const module of data.modules) {
    for (const id of module.resourceIds || []) {
      if (!resourceIds.has(id)) fail(`Module ${module.id} references missing resource ${id}`);
    }
  }

  for (const resource of data.resources) {
    let parsed;
    try {
      parsed = new URL(resource.url);
    } catch {
      fail(`Invalid resource URL: ${resource.id}`);
      continue;
    }
    if (parsed.protocol !== "https:") fail(`Resource URL must use HTTPS: ${resource.id}`);
  }

  if (!Object.isFrozen(data)) fail("FIELD_GUIDE_DATA must be frozen");
}

for (const file of ["content.js", "app.js"]) {
  try {
    new vm.Script(readFileSync(file, "utf8"), { filename: file });
  } catch (error) {
    fail(`${file} syntax error: ${error.message}`);
  }
}

if (failures.length) {
  console.error("Validation failed:");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Validated ${idMatches.length} unique HTML IDs.`);
console.log(`Validated ${data.modules.length} modules, ${data.patterns.length} patterns, ${data.resources.length} resources, ${data.drills.length} drills, and ${data.glossary.length} glossary terms.`);
console.log("Privacy, style, URL, reference, and JavaScript checks passed.");
