// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

/**
 * docs.truo.cloud
 *
 * Static, no backend: it builds to HTML and is served from GitHub Pages. Docs
 * that need their own server are docs that can go down in the very incident
 * they document.
 */
export default defineConfig({
  site: "https://docs.truo.cloud",
  /**
   * These three URLs are PUBLISHED and immutable: they are the `homepage` of
   * `@truocloud/img-next`, `-nuxt` and `-angular` on npm, and npm metadata
   * cannot be edited after a version ships. They were written before the
   * frameworks page merged into one, and they 404-ed until somebody reported
   * it from a pull request in another project.
   *
   * So they redirect rather than being "fixed" at the source: the packages that
   * point here are already out, and every future version will keep pointing at
   * the same place.
   */
  redirects: {
    "/images/nextjs": "/images/frameworks/#nextjs",
    "/images/nuxt": "/images/frameworks/#nuxt",
    "/images/angular": "/images/frameworks/#angular",
  },
  integrations: [
    starlight({
      title: "TruoCloud",
      description:
        "Documentation for the TruoCloud public API: reference, TypeScript SDK, CLI, and guides for AI agents.",
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
      },
      // Brand assets come from the TruoCloud brand kit; the wordmark replaces
      // the plain-text title.
      logo: {
        light: "./src/assets/logo.svg",
        dark: "./src/assets/logo-dark.svg",
        replacesTitle: true,
      },
      favicon: "/favicon.svg",
      head: [
        {
          tag: "link",
          attrs: { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
        },
        {
          tag: "link",
          attrs: { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        },
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/truocloud/truo-devkit",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/truocloud/truo-devkit/edit/main/docs/",
      },
      customCss: ["./src/styles/truo.css"],
      sidebar: [
        {
          label: "Getting started",
          items: [
            // `link`, not `slug`: the landing page is a `splash`, not a docs
            // page with its own sidebar.
            { label: "Introduction", link: "/" },
            { label: "Authentication", slug: "getting-started/authentication" },
            { label: "The API contract", slug: "getting-started/api-contract" },
          ],
        },
        {
          label: "Reference",
          items: [
            // The interactive reference is not a Starlight page: it's Scalar
            // running on the same openapi.json the API serves.
            { label: "API playground", link: "/api/" },
            // Since Starlight 0.39 an `autogenerate` entry takes no `label` of
            // its own: it goes inside a group with its `items`.
            { label: "Operations", items: [{ autogenerate: { directory: "reference" } }] },
          ],
        },
        {
          label: "Tools",
          items: [
            { label: "`truo` CLI", slug: "tools/cli" },
            { label: "TypeScript SDK", slug: "tools/sdk" },
          ],
        },
        {
          label: "Images",
          items: [
            { label: "Overview", slug: "images" },
            { label: "The image URL", slug: "images/url" },
            { label: "JavaScript", slug: "images/javascript" },
            { label: "Frameworks", slug: "images/frameworks" },
            { label: "Migrating", slug: "images/migrate" },
          ],
        },
        {
          label: "AI agents",
          items: [{ label: "Giving an agent access", slug: "ai-agents" }],
        },
        {
          label: "Policies",
          items: [
            { label: "Deprecation", slug: "deprecation" },
            { label: "Errors", slug: "errors" },
            { label: "Rate limits", slug: "rate-limits" },
          ],
        },
      ],
    }),
  ],
});
