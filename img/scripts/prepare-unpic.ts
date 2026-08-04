/**
 * Rewrites `unpic-src/truocloud.ts` into the file that goes into the upstream PR.
 *
 * Two mechanical differences, and a script makes both so that nothing is edited
 * by hand between "tested here" and "submitted there":
 *
 *   1. imports move from `unpic/utils.js` (the published entrypoints, which is
 *      how we can test against the real library) to `../utils.js` (relative, the
 *      only form that works inside their tree);
 *   2. the exports get their `URLExtractor<"truocloud">` annotations, which
 *      cannot typecheck here because `"truocloud"` is not in the `ImageCdn`
 *      union until the PR adds it.
 *
 *   bun scripts/prepare-unpic.ts
 */
const SOURCE = new URL("../unpic-src/truocloud.ts", import.meta.url);
const TARGET = new URL("../unpic-src/dist/truocloud.ts", import.meta.url);

let code = await Bun.file(SOURCE).text();

// 1. relative imports
code = code
  .replace(/from "unpic\/utils\.js"/g, 'from "../utils.js"')
  .replace(/from "unpic\/types\.js"/g, 'from "../types.js"');

// 2. upstream type annotations
code = code
  .replace(
    'import type { ImageFormat, Operations } from "../types.js";',
    'import type {\n  ImageFormat,\n  Operations,\n  URLExtractor,\n  URLGenerator,\n  URLTransformer,\n} from "../types.js";',
  )
  .replace(
    "export function extract(url: string | URL): { src: string; operations: TruoCloudOperations } | null {",
    'export const extract: URLExtractor<"truocloud"> = (url) => {',
  )
  .replace(
    "export function generate(src: string | URL, operations: TruoCloudOperations): string {",
    'export const generate: URLGenerator<"truocloud"> = (src, operations) => {',
  )
  .replace(
    "export const transform = createExtractAndGenerate(extract, generate);",
    'export const transform: URLTransformer<"truocloud"> = createExtractAndGenerate(extract, generate);',
  );

// The two rewritten functions became arrow consts: close them with `};`.
code = code.replace(
  /(  src\.search = "";\n  return \{ src: toCanonicalUrlString\(src\), operations \};\n)\}/,
  "$1};",
);
code = code.replace(/(  sortSearch\(url\);\n  return toCanonicalUrlString\(url\);\n)\}/, "$1};");

// The header explains how to get here; upstream it would be noise.
code = code.replace(/\/\*\*[\s\S]*?\*\/\n/, `/**
 * unpic provider for img.truo.cloud.
 *
 * Docs: https://docs.truo.cloud/images
 */
`);

await Bun.write(TARGET, code);
console.log(`[unpic] wrote ${TARGET.pathname}`);
console.log(`
The rest of the PR is three additions upstream:

  src/types.ts          add "truocloud" to the ImageCdn union
  src/providers/types.ts  add  truocloud: TruoCloudOperations  to ProviderOperations
                          add  truocloud: undefined            to ProviderOptions
  data/domains.ts       add  "img.truo.cloud": "truocloud"

Detection is by domain, not by path: "/i/" is far too generic for the shared path
registry and would claim other people's URLs. A custom domain therefore does not
autodetect and needs an explicit provider — the same as every other provider that
allows custom domains.
`);
