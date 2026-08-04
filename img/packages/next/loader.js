// The path a human types into next.config.js:
//
//   images: { loader: "custom", loaderFile: "./node_modules/@truocloud/img-next/loader.js" }
//
// It lives at the package root and not in dist/ because that config line is
// copied by hand, and one that has to reach into a build directory is one people
// get wrong. Next resolves and bundles this file itself, so the re-export costs
// nothing at runtime.
export { default } from "./dist/loader.js";
