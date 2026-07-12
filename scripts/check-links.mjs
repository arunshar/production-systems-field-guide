import vm from "node:vm";
import { readFileSync } from "node:fs";

const context = { window: {} };
vm.createContext(context);
new vm.Script(readFileSync("content.js", "utf8"), { filename: "content.js" }).runInContext(context);
const resources = context.window.FIELD_GUIDE_DATA.resources;
const concurrency = 6;
let cursor = 0;
const failures = [];

async function check(resource) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    let response = await fetch(resource.url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "systems-that-survive-link-check/1.0" }
    });
    if ([403, 405, 406].includes(response.status)) {
      response = await fetch(resource.url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "systems-that-survive-link-check/1.0", range: "bytes=0-2048" }
      });
    }
    if (response.status >= 400 && response.status !== 403) {
      failures.push(`${resource.id}: HTTP ${response.status} ${resource.url}`);
    } else {
      console.log(`OK ${response.status} ${resource.id}`);
    }
  } catch (error) {
    failures.push(`${resource.id}: ${error.name} ${resource.url}`);
  } finally {
    clearTimeout(timer);
  }
}

async function worker() {
  while (cursor < resources.length) {
    const resource = resources[cursor];
    cursor += 1;
    await check(resource);
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));

if (failures.length) {
  console.error("Link check failures:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Checked ${resources.length} public resource links.`);
