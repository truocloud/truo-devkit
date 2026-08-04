# @truocloud/img-nuxt

`@nuxt/image` provider for [img.truo.cloud](https://docs.truo.cloud/images).

```bash
npm install @truocloud/img-nuxt
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@nuxt/image"],
  image: {
    providers: {
      truocloud: { provider: "@truocloud/img-nuxt", options: { pid: "acme" } },
    },
    provider: "truocloud",
    // Five widths, not eight: the service caches a transformation on its second
    // identical request, so every extra width costs two before it pays off.
    screens: { xs: 640, sm: 828, md: 1200, lg: 1600, xl: 2048 },
  },
});
```

```vue
<NuxtImg src="/uploads/photo.jpg" width="800" format="auto" />
<!-- https://img.truo.cloud/i/acme/uploads/photo.jpg?f=auto&w=800 -->
```

`pid` is your tenant's public id, shown in the console under **Images →
Endpoint**. It is not a secret: it appears in every image URL on your site.

| option | |
|---|---|
| `pid` | tenant id |
| `baseURL` | full endpoint (`https://images.example.com/i/acme`) — the way to use a custom domain |
| `format` | defaults to `"auto"`; pin it to `"webp"` behind a CDN that ignores `Vary`, or `false` to send none |

`@nuxt/image` normalises modifiers to `width`, `height`, `format`, `quality` and
`fit` before calling a provider, which is exactly the vocabulary the URL builder
takes — so this package is a thin adapter over
[`@truocloud/img`](https://www.npmjs.com/package/@truocloud/img) and not a second
URL builder that could drift from it.

MIT
