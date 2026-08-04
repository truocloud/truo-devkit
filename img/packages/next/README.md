# @truocloud/img-next

`next/image` loader for [img.truo.cloud](https://docs.truo.cloud/images).

```bash
npm install @truocloud/img-next
```

```js
// next.config.js
module.exports = {
  images: {
    loader: "custom",
    loaderFile: "./node_modules/@truocloud/img-next/loader.js",
    // Five widths, not the default eight. The service caches a transformation on
    // its second identical request, so every width costs two transformations
    // before it starts being a cache hit: with eight, a page with five images
    // costs 80 on the first visit.
    deviceSizes: [640, 828, 1200, 1600, 2048],
  },
};
```

```bash
# .env
NEXT_PUBLIC_TRUO_IMG_PID=acme
```

That is the whole setup. `<Image>` works unchanged:

```jsx
import Image from "next/image";

<Image src="/uploads/photo.jpg" alt="" width={1200} height={800} />
// → https://img.truo.cloud/i/acme/uploads/photo.jpg?f=auto&w=1200
```

`NEXT_PUBLIC_TRUO_IMG_PID` is your tenant's public id, shown in the console under
**Images → Endpoint**. It is not a secret — it appears in every image URL on your
site — and `NEXT_PUBLIC_` is what lets Next inline it into the client bundle.

## Configuring it in code instead

```js
// loader.js at your project root, pointed at by loaderFile
const { createTruoLoader } = require("@truocloud/img-next");
module.exports = createTruoLoader({ pid: "acme", format: "webp" });
```

| option | |
|---|---|
| `pid` | tenant id, if you would rather not use the environment variable |
| `baseUrl` | override for a custom domain |
| `format` | defaults to `"auto"`; pin it to `"webp"` behind a CDN that ignores `Vary`, or `false` to send none |
| `transform` | parameters added to every URL |

## Why `loaderFile` and not the `loader` prop

The prop takes a function, and a function cannot cross the Server Component
boundary — passing one from a server component to `<Image>` fails to serialise.
`loaderFile` is resolved by the bundler at build time and works from anywhere.

MIT
