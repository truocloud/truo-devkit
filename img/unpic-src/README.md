# unpic provider (not published)

`truocloud.ts` is the source of an upstream pull request to
[`ascorbic/unpic`](https://github.com/ascorbic/unpic). It lives here so it is
tested on every commit instead of drifting between the day it is written and the
day it is merged — the local test runs it against the real `unpic` package and
against every vector in the shared fixture.

**unpic goes first out of all the integrations.** One accepted transformer covers
React, Vue, Svelte, Solid, Qwik, Astro and Angular at once, plus `@unpic/astro`.
Nothing else has that multiplier.

## Producing the PR

```bash
bun run unpic:prepare   # writes unpic-src/dist/truocloud.ts
```

Two mechanical rewrites the script makes so nothing is edited by hand:

1. imports move from `unpic/utils.js` (the published entrypoints, which is what
   lets us test against the real library here) to `../utils.js`;
2. the exports get their `URLExtractor<"truocloud">` annotations, which cannot
   typecheck here because `"truocloud"` is not in the `ImageCdn` union until the
   PR adds it.

The rest of the PR is three one-line additions:

| file | addition |
|---|---|
| `src/types.ts` | `"truocloud"` in the `ImageCdn` union |
| `src/providers/types.ts` | `truocloud: TruoCloudOperations` and `truocloud: undefined` |
| `data/domains.ts` | `"img.truo.cloud": "truocloud"` |

## Detection is by domain, not by path

`/i/` is far too generic for the shared path registry and would claim URLs that
are not ours. A custom domain therefore does not autodetect and needs an explicit
`provider="truocloud"` — the same as every other provider that allows custom
domains.

## Send it after the first npm publish

No maintainer merges a provider pointing at a package that does not exist yet,
and every one of them looks at the download count.
