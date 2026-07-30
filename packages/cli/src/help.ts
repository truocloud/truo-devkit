/**
 * Help text, built from the same tree that executes the commands.
 *
 * There is no hand-written help for the API operations: the summary, the description,
 * the arguments and the valid values come from the OpenAPI spec. Help written apart from
 * the code that runs is help that lies within six months.
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
${color.bold("Global flags")}
  -o, --output <fmt>      table (default) | json | jsonl | yaml | id
      --field <path>      Trims the output: --field data.0.hostname
      --profile <name>    Profile from ~/.truo/config.json
      --token <tc_…>      Explicit token (wins over TRUO_TOKEN and over the profile)
      --base-url <url>    Points at another API instance
  -y, --yes               Do not ask on destructive operations
  -q, --quiet             No progress or courtesy messages
      --no-wait           Do not wait for an asynchronous operation to finish
      --body-json '{…}'   Raw body, for what the flags do not cover
  -h, --help              This help
  -v, --version           CLI and contract version`;

function line(name: string, summary: string, width: number): string {
  return `  ${color.cyan(name.padEnd(width))}  ${summary}`;
}

/** Group name → one line describing it, hand-written because the spec does not have one. */
const GROUP_SUMMARY: Record<string, string> = {
  auth: "Credentials: sign in, check status, manage tokens",
  config: "Profiles and local configuration",
  services: "Inventory of the account's services",
  vps: "Virtual servers: power, console, backups, firewall, IPs",
  dns: "DNS zones and records",
  dbaas: "Managed databases",
  caas: "Containerized applications (Truo Apps / CaaS)",
  lb: "Load balancers",
  "object-storage": "S3-compatible Object Storage",
  "mail-gateway": "Mail Gateway: domains, API keys, verified domains and usage",
  operation: "Asynchronous operations",
  account: "Account details",
  audit: "Audit log",
  api: "Raw call to any endpoint (escape hatch)",
  mcp: "MCP server for AI agents",
  completion: "Shell completion",
};

export function rootHelp(builtins: Builtin[]): string {
  const groups = new Map<string, string>();
  for (const c of COMMANDS) groups.set(c.path[0]!, GROUP_SUMMARY[c.path[0]!] ?? "");
  for (const b of builtins) groups.set(b.path[0]!, GROUP_SUMMARY[b.path[0]!] ?? b.summary);

  const names = [...groups.keys()].sort();
  const width = Math.max(...names.map((n) => n.length));

  return `${color.bold("truo")} — TruoCloud infrastructure from the terminal.

${color.bold("Usage")}
  truo <group> <command> [arguments] [flags]

${color.bold("Groups")}
${names.map((n) => line(n, groups.get(n) || "", width)).join("\n")}
${GLOBAL_FLAGS}

${color.bold("Examples")}
  truo auth login
  truo services list
  truo vps list -o json | jq '.[].hostname'
  truo vps power svc_10432 stop
  truo dns record list example.com

Help for a group:    truo vps --help
Help for a command:  truo vps power --help
Documentation:       https://docs.truo.cloud
`;
}

export function groupHelp(group: string, builtins: Builtin[]): string {
  const commands = COMMANDS.filter((c) => c.path[0] === group);
  const built = builtins.filter((b) => b.path[0] === group && b.path.length > 1);
  if (commands.length === 0 && built.length === 0) return "";

  // A builtin may shadow a generated command of the same name (`auth status`
  // replaces `GET /v1/account` so it can also show where the token comes from).
  // The dispatcher already gives the builtin priority; without this dedup the
  // help listed both, with two different descriptions for the same thing you type.
  const seen = new Set(built.map((b) => b.path.slice(1).join(" ")));
  const entries: { name: string; summary: string }[] = [
    ...built.map((b) => ({ name: b.path.slice(1).join(" "), summary: b.summary })),
    ...commands
      .map((c) => ({ name: c.path.slice(1).join(" "), summary: c.summary || c.operationId }))
      .filter((c) => !seen.has(c.name)),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const width = Math.max(...entries.map((e) => e.name.length));
  return `${color.bold(`truo ${group}`)} — ${GROUP_SUMMARY[group] ?? ""}

${color.bold("Commands")}
${entries.map((e) => line(e.name, e.summary, width)).join("\n")}

Help for a command: truo ${group} <command> --help
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
      `${color.bold("Arguments")}\n` +
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
            const req = f.required ? color.yellow(" [required]") : "";
            return line(labels[i]!, (f.description ?? "").split("\n")[0] + values + req, width);
          })
          .join("\n"),
    );
  }

  const notes: string[] = [];
  if (spec.scope) notes.push(`Required scope: ${color.cyan(spec.scope)}`);
  if (spec.danger === "destructive") notes.push(color.red("Destructive: asks for confirmation unless --yes."));
  if (spec.longRunning) notes.push("Asynchronous: waits by default; use --no-wait to skip waiting.");
  if (spec.deprecated) notes.push(color.yellow("DEPRECATED: going away."));
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
