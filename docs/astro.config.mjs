// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

/**
 * docs.truo.cloud
 *
 * Estatico y sin backend: se construye a HTML y se sirve desde GitHub Pages. Una
 * documentacion que necesita un servidor propio es una documentacion que puede
 * caerse en el mismo incidente que estas documentando.
 */
export default defineConfig({
  site: "https://docs.truo.cloud",
  integrations: [
    starlight({
      title: "TruoCloud",
      description:
        "Documentacion de la API publica de TruoCloud: referencia, SDK de TypeScript, CLI y guias para agentes.",
      defaultLocale: "root",
      locales: {
        root: { label: "Español", lang: "es" },
      },
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
          label: "Empezar",
          items: [
            // `link` y no `slug`: la portada es una `splash`, no una pagina de
            // documentacion con sidebar propio.
            { label: "Introduccion", link: "/" },
            { label: "Autenticacion", slug: "empezar/autenticacion" },
            { label: "El contrato", slug: "empezar/contrato" },
          ],
        },
        {
          label: "Referencia",
          items: [
            // La referencia interactiva no es una pagina de Starlight: es Scalar
            // sobre el mismo openapi.json que sirve la API.
            { label: "API (interactiva)", link: "/reference/" },
            { label: "Operaciones", autogenerate: { directory: "referencia" } },
          ],
        },
        {
          label: "Herramientas",
          items: [
            { label: "CLI `truo`", slug: "herramientas/cli" },
            { label: "SDK de TypeScript", slug: "herramientas/sdk" },
          ],
        },
        {
          label: "Agentes de IA",
          items: [{ label: "Como darle acceso a un agente", slug: "agentes" }],
        },
        {
          label: "Politicas",
          items: [
            { label: "Deprecacion", slug: "deprecation" },
            { label: "Errores", slug: "errores" },
            { label: "Limites de uso", slug: "limites" },
          ],
        },
      ],
    }),
  ],
});
