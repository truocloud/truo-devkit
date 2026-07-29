/**
 * Codigos de salida. **Son contrato publico**: van en `--help` y en la documentacion.
 *
 * Existen para que un script pueda distinguir "no tengo permiso" de "no existe" sin
 * parsear el texto del error — que es lo que termina haciendo todo el mundo cuando un CLI
 * devuelve 1 para todo, y lo que se rompe la primera vez que alguien mejora un mensaje.
 */
export const EXIT = {
  /** Todo bien. */
  OK: 0,
  /** Error interno del CLI: un bug nuestro. */
  INTERNAL: 1,
  /** Uso incorrecto: comando desconocido, falta un argumento, flag invalida. */
  USAGE: 2,
  /** Sin credencial, o la credencial no vale (401). */
  UNAUTHENTICATED: 3,
  /** La credencial vale pero no alcanza: falta scope o permiso (403). */
  FORBIDDEN: 4,
  /** No existe — o no existe *para esta credencial*, que la API no distingue a proposito (404). */
  NOT_FOUND: 5,
  /** Conflicto: ya existe, o el estado cambio debajo (409, 412). */
  CONFLICT: 6,
  /** Rate limit (429). */
  RATE_LIMITED: 7,
  /** La API fallo (5xx) o no se pudo llegar. */
  API_ERROR: 8,
  /** Se vencio la espera de una operacion asincrona. **La operacion sigue corriendo.** */
  OPERATION_TIMEOUT: 9,
  /** El usuario dijo que no en la confirmacion. */
  ABORTED: 10,
  /** Ctrl-C. */
  SIGINT: 130,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

/** Error del CLI con un codigo de salida ya decidido. */
export class CliError extends Error {
  readonly code: ExitCode;
  /** Sugerencia concreta de que hacer. Se imprime debajo del mensaje. */
  readonly hint: string | undefined;

  constructor(message: string, code: ExitCode = EXIT.USAGE, hint?: string) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.hint = hint;
  }
}

/** Traduce un error del SDK al codigo de salida que le corresponde. */
export function exitCodeForStatus(status: number | null | undefined): ExitCode {
  switch (status) {
    case 401:
      return EXIT.UNAUTHENTICATED;
    case 403:
      return EXIT.FORBIDDEN;
    case 404:
      return EXIT.NOT_FOUND;
    case 409:
    case 412:
      return EXIT.CONFLICT;
    case 429:
      return EXIT.RATE_LIMITED;
    default:
      return status && status >= 500 ? EXIT.API_ERROR : EXIT.USAGE;
  }
}
