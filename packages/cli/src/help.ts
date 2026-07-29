/**
 * Ayuda, construida del mismo arbol que ejecuta los comandos.
 *
 * No hay texto de ayuda escrito a mano para las operaciones de la API: el resumen, la
 * descripcion, los argumentos y los valores validos salen del OpenAPI. Una ayuda que se
 * escribe aparte del codigo que ejecuta es una ayuda que en seis meses miente.
 */
import type { CommandSpec } from "./generated/commands.ts";
import { COMMANDS } from "./generated/commands.ts";
import { color } from "./output.ts";

export interface Builtin {
  path: string[];
  summary: string;
  usage?: string;
  details?: string;
}

const GLOBAL_FLAGS = `
${color.bold("Flags globales")}
  -o, --output <fmt>      table (default) | json | jsonl | yaml | id
      --field <ruta>      Recorta la salida: --field data.0.hostname
      --profile <nombre>  Perfil de ~/.truo/config.json
      --token <tc_…>      Token explicito (gana sobre TRUO_TOKEN y sobre el perfil)
      --base-url <url>    Apunta a otra instancia de la API
  -y, --yes               No preguntar en las operaciones destructivas
  -q, --quiet             Sin progreso ni mensajes de cortesia
      --no-wait           No esperar a que termine una operacion asincrona
      --body-json '{…}'   Cuerpo crudo, para lo que las flags no cubren
  -h, --help              Esta ayuda
  -v, --version           Version del CLI y del contrato`;

function line(name: string, summary: string, width: number): string {
  return `  ${color.cyan(name.padEnd(width))}  ${summary}`;
}

/** Nombre del grupo → una linea que lo describa, escrita a mano porque el spec no la tiene. */
const GROUP_SUMMARY: Record<string, string> = {
  auth: "Credenciales: iniciar sesion, ver estado, gestionar tokens",
  config: "Perfiles y configuracion local",
  services: "Inventario de servicios de la cuenta",
  vps: "Servidores virtuales: power, consola, backups, firewall, IPs",
  dns: "Zonas y registros DNS",
  dbaas: "Bases de datos administradas",
  caas: "Aplicaciones en contenedores (Truo Apps / CaaS)",
  lb: "Balanceadores de carga",
  "object-storage": "Object Storage compatible con S3",
  "mail-gateway": "Mail Gateway: dominios, API keys, dominios verificados y uso",
  operation: "Operaciones asincronas",
  account: "Datos de la cuenta",
  audit: "Registro de auditoria",
  api: "Llamada cruda a cualquier endpoint (escape hatch)",
  mcp: "Servidor MCP para agentes de IA",
  completion: "Autocompletado del shell",
};

export function rootHelp(builtins: Builtin[]): string {
  const groups = new Map<string, string>();
  for (const c of COMMANDS) groups.set(c.path[0]!, GROUP_SUMMARY[c.path[0]!] ?? "");
  for (const b of builtins) groups.set(b.path[0]!, GROUP_SUMMARY[b.path[0]!] ?? b.summary);

  const names = [...groups.keys()].sort();
  const width = Math.max(...names.map((n) => n.length));

  return `${color.bold("truo")} — la infraestructura de TruoCloud desde la terminal.

${color.bold("Uso")}
  truo <grupo> <comando> [argumentos] [flags]

${color.bold("Grupos")}
${names.map((n) => line(n, groups.get(n) || "", width)).join("\n")}
${GLOBAL_FLAGS}

${color.bold("Ejemplos")}
  truo auth login
  truo services list
  truo vps list -o json | jq '.[].hostname'
  truo vps power svc_10432 stop
  truo dns record list ejemplo.com

Ayuda de un grupo:    truo vps --help
Ayuda de un comando:  truo vps power --help
Documentacion:        https://docs.truo.cloud
`;
}

export function groupHelp(group: string, builtins: Builtin[]): string {
  const commands = COMMANDS.filter((c) => c.path[0] === group);
  const built = builtins.filter((b) => b.path[0] === group && b.path.length > 1);
  if (commands.length === 0 && built.length === 0) return "";

  const entries: { name: string; summary: string }[] = [
    ...built.map((b) => ({ name: b.path.slice(1).join(" "), summary: b.summary })),
    ...commands.map((c) => ({ name: c.path.slice(1).join(" "), summary: c.summary || c.operationId })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const width = Math.max(...entries.map((e) => e.name.length));
  return `${color.bold(`truo ${group}`)} — ${GROUP_SUMMARY[group] ?? ""}

${color.bold("Comandos")}
${entries.map((e) => line(e.name, e.summary, width)).join("\n")}

Ayuda de un comando: truo ${group} <comando> --help
`;
}

export function commandHelp(spec: CommandSpec): string {
  const usage = [
    "truo",
    ...spec.path,
    ...spec.positionals.map((p) => (p.required ? `<${p.label}>` : `[${p.label}]`)),
    spec.flags.length ? "[flags]" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const sections: string[] = [`${color.bold(usage)}`];

  if (spec.summary) sections.push(spec.summary);
  if (spec.description) sections.push(color.dim(wrap(spec.description, 78)));

  if (spec.positionals.length) {
    const width = Math.max(...spec.positionals.map((p) => p.label.length));
    sections.push(
      `${color.bold("Argumentos")}\n` +
        spec.positionals
          .map((p) => {
            const values = p.values ? ` ${color.dim(`(${p.values.join(" | ")})`)}` : "";
            return line(p.label, (p.description ?? "").split("\n")[0] + values, width);
          })
          .join("\n"),
    );
  }

  if (spec.flags.length) {
    const labels = spec.flags.map((f) => `--${f.flag}${f.type === "boolean" ? "" : ` <${f.type}>`}`);
    const width = Math.max(...labels.map((l) => l.length));
    sections.push(
      `${color.bold("Flags")}\n` +
        spec.flags
          .map((f, i) => {
            const values = f.values ? ` ${color.dim(`(${f.values.join(" | ")})`)}` : "";
            const req = f.required ? color.yellow(" [obligatoria]") : "";
            return line(labels[i]!, (f.description ?? "").split("\n")[0] + values + req, width);
          })
          .join("\n"),
    );
  }

  const notes: string[] = [];
  if (spec.scope) notes.push(`Scope requerido: ${color.cyan(spec.scope)}`);
  if (spec.danger === "destructive") notes.push(color.red("Destructiva: pide confirmacion salvo con --yes."));
  if (spec.longRunning) notes.push("Asincrona: espera por defecto; usa --no-wait para no esperar.");
  if (spec.deprecated) notes.push(color.yellow("DEPRECADA: va a dejar de existir."));
  notes.push(color.dim(`operationId: ${spec.operationId}`));
  sections.push(notes.join("\n"));

  return sections.join("\n\n") + "\n";
}

function wrap(text: string, width: number): string {
  return text
    .split("\n")
    .map((paragraph) => {
      const words = paragraph.split(/\s+/);
      const lines: string[] = [];
      let current = "";
      for (const w of words) {
        if (current.length + w.length + 1 > width) {
          lines.push(current);
          current = w;
        } else {
          current = current ? `${current} ${w}` : w;
        }
      }
      if (current) lines.push(current);
      return lines.join("\n");
    })
    .join("\n");
}
