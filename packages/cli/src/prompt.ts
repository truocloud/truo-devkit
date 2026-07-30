/**
 * Interactive input.
 *
 * Hard rule: **none of this works without a TTY**. A CLI hanging on a question in a CI
 * pipeline is an incident, and one that assumes "yes" on a destructive question is a
 * worse one. Without a terminal, fail with a concrete instruction.
 */
import { createInterface } from "node:readline";
import { CliError, EXIT } from "./exit.ts";

export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stderr.isTTY);
}

async function ask(question: string, opts: { silent?: boolean } = {}): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });

  if (opts.silent) {
    // No echo: the token stays off the screen and away from anyone looking over a shoulder.
    const iface = rl as unknown as { _writeToOutput?: (s: string) => void; output?: NodeJS.WriteStream };
    iface._writeToOutput = function (s: string) {
      if (s.includes(question)) iface.output?.write(question);
    };
  }

  try {
    return await new Promise<string>((resolve) => rl.question(question, resolve));
  } finally {
    rl.close();
    if (opts.silent) process.stderr.write("\n");
  }
}

/** Yes/no confirmation. Anything that is not an explicit "y" counts as no. */
export async function confirm(message: string): Promise<boolean> {
  if (!isInteractive()) {
    throw new CliError(
      `${message}\nCannot confirm without an interactive terminal.`,
      EXIT.ABORTED,
      "Pass --yes if you are sure of what you are doing in a script.",
    );
  }
  const answer = await ask(`${message}\nContinue? [y/N] `);
  // "s"/"si" stay accepted for Spanish-speaking muscle memory; rejecting them
  // would turn an intended "yes" into a silent cancel.
  return ["y", "yes", "s", "si", "sí"].includes(answer.trim().toLowerCase());
}

/** Reads a sensitive value without echo. TTY only. */
export async function askSecret(question: string): Promise<string> {
  if (!isInteractive()) {
    throw new CliError("An interactive terminal is required.", EXIT.UNAUTHENTICATED, "In scripts, set TRUO_TOKEN.");
  }
  return (await ask(question, { silent: true })).trim();
}
