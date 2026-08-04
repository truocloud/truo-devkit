/**
 * Rewrites `nuxt-src/truocloud.ts` into the file that goes into the upstream PR.
 *
 * One mechanical difference, and a script makes it so nothing is edited by hand
 * between "tested here" and "submitted there": the helpers are imported from
 * `@nuxt/image/runtime` (their public entry, which is what lets the test run
 * against the same code) and upstream they come from the two relative paths
 * their own providers use.
 *
 *   bun run nuxt:prepare
 */
const SOURCE = new URL("../nuxt-src/truocloud.ts", import.meta.url);
const TARGET = new URL("../nuxt-src/dist/truocloud.ts", import.meta.url);

let code = await Bun.file(SOURCE).text();

code = code.replace(
  /\/\/ Their PUBLIC runtime entry[\s\S]*?import \{ createOperationsGenerator, defineProvider \} from "@nuxt\/image\/runtime";/,
  'import { createOperationsGenerator } from "../utils/index.js";\nimport { defineProvider } from "../utils/provider.js";',
);

// The header explains how to get here; upstream it would be noise.
code = code.replace(
  /\/\*\*[\s\S]*?\*\/\n/,
  `/**
 * @nuxt/image provider for img.truo.cloud.
 *
 * Docs: https://docs.truo.cloud/images/nuxt
 */
`,
);

await Bun.write(TARGET, code);
console.log(`[nuxt] wrote ${TARGET.pathname}`);
console.log(`
The rest of the PR:

  src/runtime/providers/truocloud.ts   this file
  src/module.ts                        add "truocloud" to BuiltInProviderName
  docs/                                a provider page
  playground/                          an entry, so it is exercised

Configuration is one option, \`baseURL\`, holding the endpoint the console
publishes (https://img.truo.cloud/i/<pid>). No API key: the delivery contract is
public by design, and signing — when a tenant turns it on — happens server-side.
`);
