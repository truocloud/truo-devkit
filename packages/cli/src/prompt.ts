/**
 * Entrada interactiva.
 *
 * Regla dura: **nada de esto funciona sin TTY**. Un CLI que se cuelga esperando una
 * respuesta en un pipeline de CI es un incidente, y uno que asume "sí" ante una pregunta
 * destructiva es un incidente peor. Sin terminal, se falla con una instruccion concreta.
 */
import { createInterface } from "node:readline";
import { CliError, EXIT } from "./exit.ts";

export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stderr.isTTY);
}

async function ask(question: string, opts: { silent?: boolean } = {}): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });

  if (opts.silent) {
    // Sin eco: el token no queda en pantalla ni al alcance de quien mire por encima.
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

/** Confirmacion sí/no. Todo lo que no sea un "s"/"y" explicito cuenta como no. */
export async function confirm(message: string): Promise<boolean> {
  if (!isInteractive()) {
    throw new CliError(
      `${message}\nSin terminal interactiva no se puede confirmar.`,
      EXIT.ABORTED,
      "Pasa --yes si estas seguro de lo que estas haciendo en un script.",
    );
  }
  const answer = await ask(`${message}\n¿Continuar? [s/N] `);
  return ["s", "si", "sí", "y", "yes"].includes(answer.trim().toLowerCase());
}

/** Lee un valor sensible sin eco. Solo con TTY. */
export async function askSecret(question: string): Promise<string> {
  if (!isInteractive()) {
    throw new CliError("Se necesita una terminal interactiva.", EXIT.UNAUTHENTICATED, "En scripts, exporta TRUO_TOKEN.");
  }
  return (await ask(question, { silent: true })).trim();
}
