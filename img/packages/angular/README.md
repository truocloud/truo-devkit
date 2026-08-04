# @truocloud/img-angular

`NgOptimizedImage` loader for [img.truo.cloud](https://docs.truo.cloud/images).

```bash
npm install @truocloud/img-angular
```

```ts
import { provideTruoImageLoader } from "@truocloud/img-angular";

bootstrapApplication(AppComponent, {
  providers: [provideTruoImageLoader("https://img.truo.cloud/i/acme")],
});
```

```html
<img ngSrc="uploads/photo.jpg" width="800" height="600" priority />
<!-- https://img.truo.cloud/i/acme/uploads/photo.jpg?f=auto&w=800 -->
```

The endpoint is shown in the console under **Images → Endpoint**. The signature
mirrors Angular's own `provideImageKitLoader` — endpoint first, options second —
so switching providers is a one-line change.

| option | |
|---|---|
| `format` | defaults to `"auto"`; pin it to `"webp"` behind a CDN that ignores `Vary`, or `false` to send none |
| `transform` | parameters added to every URL |
| `placeholderWidth` | width of the LQIP Angular requests with `placeholder` (default 20) |

## Anything the directive does not model

`loaderParams` is Angular's escape hatch and it reaches the URL untouched:

```html
<img ngSrc="hero.jpg" width="1200" height="600"
     [loaderParams]="{ transform: { fit: 'cover', gravity: 'attention' } }" />
<!-- …?a=attention&f=auto&fit=cover&w=1200 -->
```

## Using the loader without Angular's DI

`createTruoImageLoader` is exported from `@truocloud/img-angular/loader` and
carries no Angular import at all, so it can be used and tested on its own.

MIT
