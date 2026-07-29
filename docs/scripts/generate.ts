/**
 * Genera del OpenAPI todo lo que la documentacion no debe escribir a mano.
 *
 *   bun scripts/generate.ts
 *
 * Sale:
 *   public/openapi.json                 el spec, para Scalar y para quien lo quiera
 *   public/llms.txt / llms-full.txt     el catalogo para agentes
 *   src/content/docs/referencia/*.md    una pagina por familia, con las CUATRO formas
 *                                       de llamar cada operacion
 *
 * **Por que se genera la paridad de las cuatro formas.** El posicionamiento dice
 * "API-first y listo para agentes". La prueba de eso no es un parrafo: es que la
 * misma operacion aparezca como curl, como comando del CLI, como metodo del SDK y
 * como accion de MCP, y que las cuatro salgan del mismo `operationId`. Escritas a
 * mano, tres de las cuatro quedarian viejas en el primer endpoint nuevo.
 *
 * Reusa `packages/codegen/src/ir.ts` —el mismo IR del que salen el SDK y el CLI—
 * en vez de reinterpretar el spec. Si el CLI llama a algo de una forma, la
 * documentacion no puede decir otra.
 */
import { mkdirSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildIR, type OpIR } from "../../packages/codegen/src/ir.ts";
import openapi from "../../packages/openapi/src/index.ts";

const DOCS = resolve(import.meta.dirname, "..");
const ROOT = resolve(DOCS, "..");
const PUBLIC = resolve(DOCS, "public");
const REFERENCE = resolve(DOCS, "src/content/docs/referencia");

const BASE_URL = openapi.servers?.[0]?.url ?? "https://api.truo.cloud";

mkdirSync(PUBLIC, { recursive: true });
// Se borra entero: una familia que desaparezca del spec tiene que desaparecer de
// la documentacion, no quedar como una pagina huerfana que documenta un 404.
rmSync(REFERENCE, { recursive: true, force: true });
mkdirSync(REFERENCE, { recursive: true });

// ── El spec ─────────────────────────────────────────────────────────────────
copyFileSync(
  resolve(ROOT, "packages/openapi/openapi/v1.json"),
  resolve(PUBLIC, "openapi.json"),
);

const ops = buildIR();

// ── Utilidades ──────────────────────────────────────────────────────────────

function slug(tag: string): string {
  return tag
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Un valor de ejemplo para un path param, sacado del propio spec cuando lo trae. */
function sample(op: OpIR, name: string): string {
  const param = op.pathParams.find((p) => p.name === name);
  const example = param?.schema.example;
  if (typeof example === "string" || typeof example === "number") return String(example);
  // Los ids de servicio son la mayoria y tienen prefijo tipado; el resto cae en
  // un placeholder obvio para que nadie lo copie y pegue creyendo que es real.
  return name === "id" ? "svc_10432" : `<${name}>`;
}

function curlFor(op: OpIR): string {
  let path = op.path;
  for (const p of op.pathParams) path = path.replace(`{${p.name}}`, sample(op, p.name));

  const lines = [`curl ${BASE_URL}${path} \\`];
  if (op.method !== "get") lines.push(`  -X ${op.method.toUpperCase()} \\`);
  lines.push(`  -H "Authorization: Bearer $TRUO_TOKEN"`);

  // Un `-d '{}'` en un endpoint cuyo body es opcional le enseña a la gente a
  // mandar un objeto vacio como si hiciera falta.
  const body = bodyExample(op);
  if (op.body && (op.body.required || body !== "{}")) {
    lines[lines.length - 1] += ` \\`;
    lines.push(`  -H "Content-Type: application/json" \\`);
    lines.push(`  -d '${body}'`);
  }
  return lines.join("\n");
}

/** Un body de ejemplo con las propiedades requeridas. */
function bodyExample(op: OpIR): string {
  const schema = op.body?.schema;
  const props = schema?.properties;
  if (!props) return "{}";
  const required = new Set(schema?.required ?? []);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!required.has(key)) continue;
    out[key] =
      value.example ??
      (value.enum?.[0] ??
        (value.type === "number" || value.type === "integer"
          ? 1
          : value.type === "boolean"
            ? true
            : value.type === "array"
              ? []
              : `<${key}>`));
  }
  return JSON.stringify(out);
}

function cliFor(op: OpIR): string | null {
  if (!op.cli) return null;
  // Los posicionales de `x-truo-cli` llevan etiqueta de cara al usuario
  // (`service_id`) y los path params se llaman como en la URL (`id`). Se
  // resuelven **por orden**, igual que en `gen-cli.ts`: emparejarlos por nombre
  // dejaria `<service_id>` literal en la documentacion de la mitad de los
  // comandos.
  const remaining = [...op.pathParams];
  const args = (op.cli.positional ?? []).map((label) => {
    const param = remaining.shift();
    return param ? sample(op, param.name) : `<${label}>`;
  });
  return `truo ${op.cli.command}${args.length ? " " + args.join(" ") : ""}`;
}

function sdkFor(op: OpIR): string {
  const chain = op.segments.join(".");
  const args: string[] = op.pathParams.map((p) => `"${sample(op, p.name)}"`);
  const body = bodyExample(op);
  if (op.body && (op.body.required || body !== "{}")) args.push(body);
  return `await truo.${chain}(${args.join(", ")});`;
}

function mcpFor(op: OpIR): string | null {
  if (!op.mcp) return null;
  const args: Record<string, unknown> = { action: op.mcp.action };
  for (const p of op.pathParams) args[p.jsName] = sample(op, p.name);
  return `truo_${op.mcp.toolset}(${JSON.stringify(args, null, 2)})`;
}

const DANGER_LABEL: Record<string, string> = {
  none: "sin riesgo",
  reversible: "reversible",
  destructive: "**destructiva** — no tiene vuelta atras",
};

// ── Una pagina por familia ──────────────────────────────────────────────────

const byTag = new Map<string, OpIR[]>();
for (const op of ops) {
  const list = byTag.get(op.tag) ?? [];
  list.push(op);
  byTag.set(op.tag, list);
}

/**
 * Orden del sidebar: por como se usa, no alfabetico.
 *
 * Lo primero que alguien necesita es saber que tiene (`Services`) y con que
 * credencial (`Account`). Alfabetico dejaria `API Keys` y `Audit` arriba de todo
 * y `VPS` al final, que es exactamente al reves de para que entra la gente.
 */
const TAG_ORDER = [
  "Meta",
  "Account",
  "Services",
  "VPS",
  "DNS",
  "DBaaS",
  "CaaS",
  "Load Balancer",
  "Object Storage",
  "Mail Gateway",
  "Operations",
  "API Keys",
  "Audit",
];

const tags = [...byTag.keys()].sort((a, b) => {
  const ia = TAG_ORDER.indexOf(a);
  const ib = TAG_ORDER.indexOf(b);
  // Un tag nuevo que nadie agrego a la lista va al final, no al principio.
  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.localeCompare(b);
});
for (const [index, tag] of tags.entries()) {
  const list = byTag.get(tag)!.sort((a, b) => a.id.localeCompare(b.id));

  const sections = list.map((op) => {
    const badges = [
      `\`${op.method.toUpperCase()} ${op.path}\``,
      op.scope ? `scope \`${op.scope}\`` : null,
      op.danger !== "none" ? DANGER_LABEL[op.danger] : null,
      op.longRunning ? "asincrona" : null,
      op.idempotent ? "idempotente" : null,
      op.deprecated ? "**deprecada**" : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const cli = cliFor(op);
    const mcp = mcpFor(op);

    // Las pestañas son la prueba del "API-first": la misma operacion, las cuatro
    // superficies, todas derivadas del mismo `operationId`.
    const tabs = [
      `<TabItem label="curl">\n\n\`\`\`bash\n${curlFor(op)}\n\`\`\`\n\n</TabItem>`,
      cli ? `<TabItem label="CLI">\n\n\`\`\`bash\n${cli}\n\`\`\`\n\n</TabItem>` : null,
      `<TabItem label="SDK">\n\n\`\`\`ts\n${sdkFor(op)}\n\`\`\`\n\n</TabItem>`,
      mcp ? `<TabItem label="MCP">\n\n\`\`\`js\n${mcp}\n\`\`\`\n\n</TabItem>` : null,
    ].filter(Boolean);

    return [
      `## ${op.summary || op.id}`,
      "",
      badges,
      "",
      op.description ? `${op.description}\n` : "",
      `<Tabs syncKey="superficie">`,
      "",
      tabs.join("\n\n"),
      "",
      `</Tabs>`,
      "",
      `\`operationId\`: \`${op.id}\``,
      "",
    ].join("\n");
  });

  const page = `---
title: ${tag}
description: Operaciones de ${tag} en la API publica de TruoCloud.
sidebar:
  order: ${index + 1}
---

import { Tabs, TabItem } from "@astrojs/starlight/components";

:::note[Generado del contrato]
Esta pagina sale de \`GET ${BASE_URL}/v1/openapi.json\`. Los ejemplos de curl, CLI,
SDK y MCP se derivan del mismo \`operationId\`, asi que no pueden contradecirse.
Para probar contra tu cuenta, usa la [referencia interactiva](/reference/).
:::

${sections.join("\n")}`;

  // `.mdx` y no `.md`: en Markdown plano el `import` sale como texto literal y
  // los `<Tabs>` quedan como HTML inerte. Es exactamente lo que pasó la primera
  // vez — la página se veía bien en el diff y las cuatro formas no se
  // renderizaban en el sitio publicado.
  writeFileSync(resolve(REFERENCE, `${slug(tag)}.mdx`), page.replace(/\r\n/g, "\n"), "utf8");
}

// ── llms.txt ────────────────────────────────────────────────────────────────
// Un agente que se topa con esto sin haber leido nuestra documentacion tiene que
// poder armar una llamada correcta con lo que hay aca.

const llms = `# TruoCloud

> API publica para operar infraestructura cloud: VPS, DNS, bases de datos administradas,
> contenedores, balanceadores, Object Storage y Mail Gateway.

Base: ${BASE_URL}/v1 · OpenAPI: ${BASE_URL}/v1/openapi.json
Autenticacion: \`Authorization: Bearer tc_live_...\` (API key con scopes).

## Como leer las respuestas
- Recurso: \`{ "object": "vps", "id": "svc_10432", ... }\` — sin envoltorio.
- Coleccion: \`{ "object": "list", "data": [...], "has_more": true, "next_cursor": "..." }\`.
  El cursor es **opaco**: no lo construyas ni lo parsees.
- Error (cualquier >=400): \`{ "error": { "type", "code", "message", "param", "request_id" } }\`.
  Ramifica por \`code\`, nunca por el texto de \`message\`.
- Lo que tarda devuelve \`202\` + un objeto \`operation\`: hay que consultar \`/v1/operations/{id}\`
  hasta \`succeeded\` o \`failed\`.

## Reglas
- Toda mutacion acepta \`Idempotency-Key\`. Usala: un reintento sin ella crea dos veces.
- Un servicio que no existe **o que tu credencial no puede ver** devuelve 404, nunca 403.
  Un 403 confirmaria que existe.
- Los ids llevan prefijo tipado (\`svc_10432\`). Se acepta el numero pelado, se devuelve el prefijado.

## Documentacion
- [Introduccion](https://docs.truo.cloud/)
- [Autenticacion](https://docs.truo.cloud/empezar/autenticacion/)
- [El contrato](https://docs.truo.cloud/empezar/contrato/)
- [Errores](https://docs.truo.cloud/errores/)
- [Limites de uso](https://docs.truo.cloud/limites/)
- [Politica de deprecacion](https://docs.truo.cloud/deprecation/)
- [Para agentes de IA](https://docs.truo.cloud/agentes/)

## Operaciones (${ops.length})
${tags
  .map(
    (tag) =>
      `\n### ${tag}\n` +
      byTag
        .get(tag)!
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(
          (op) =>
            `- \`${op.id}\` — ${op.method.toUpperCase()} ${op.path}${op.scope ? ` (scope \`${op.scope}\`)` : ""}${
              op.danger === "destructive" ? " ⚠️ destructiva" : ""
            }${op.longRunning ? " · asincrona" : ""}: ${op.summary}`,
        )
        .join("\n"),
  )
  .join("\n")}
`;

writeFileSync(resolve(PUBLIC, "llms.txt"), llms, "utf8");

// La version larga agrega parametros y body de cada operacion: es lo que evita
// que un agente invente nombres de campo.
const full =
  llms +
  `\n---\n\n# Detalle de cada operacion\n` +
  ops
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((op) => {
      const params = [...op.pathParams, ...op.queryParams];
      return [
        `\n## ${op.id}`,
        `${op.method.toUpperCase()} ${op.path} → ${op.successStatus}`,
        op.summary,
        op.description || "",
        op.scope ? `Scope: \`${op.scope}\`` : "",
        params.length
          ? `Parametros:\n${params
              .map(
                (p) =>
                  `- \`${p.name}\`${p.required ? " (requerido)" : ""}: ${p.schema.type ?? "string"}${
                    p.schema.enum ? ` — uno de ${p.schema.enum.map((v) => `\`${String(v)}\``).join(", ")}` : ""
                  }${p.description ? ` — ${p.description}` : ""}`,
              )
              .join("\n")}`
          : "",
        op.body
          ? `Body:\n\`\`\`json\n${JSON.stringify(op.body.schema.properties ?? {}, null, 2)}\n\`\`\``
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

writeFileSync(resolve(PUBLIC, "llms-full.txt"), full, "utf8");

console.log(`openapi.json + llms.txt + llms-full.txt`);
console.log(`${tags.length} paginas de referencia (${ops.length} operaciones)`);
