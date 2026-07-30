/**
 * Exit codes. **They are public contract**: they appear in `--help` and in the docs.
 *
 * They exist so a script can tell "I lack permission" from "it does not exist" without
 * parsing the error text — which is what everyone ends up doing when a CLI returns 1 for
 * everything, and what breaks the first time someone improves a message.
 */
export const EXIT = {
  /** All good. */
  OK: 0,
  /** Internal CLI error: a bug on our side. */
  INTERNAL: 1,
  /** Incorrect usage: unknown command, missing argument, invalid flag. */
  USAGE: 2,
  /** No credential, or the credential is not valid (401). */
  UNAUTHENTICATED: 3,
  /** The credential is valid but not enough: missing scope or permission (403). */
  FORBIDDEN: 4,
  /** Not found — or not found *for this credential*, which the API does not distinguish on purpose (404). */
  NOT_FOUND: 5,
  /** Conflict: already exists, or the state changed underneath (409, 412). */
  CONFLICT: 6,
  /** Rate limit (429). */
  RATE_LIMITED: 7,
  /** The API failed (5xx) or could not be reached. */
  API_ERROR: 8,
  /** The wait for an asynchronous operation timed out. **The operation is still running.** */
  OPERATION_TIMEOUT: 9,
  /** The user said no at the confirmation prompt. */
  ABORTED: 10,
  /** Ctrl-C. */
  SIGINT: 130,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

/** CLI error with an exit code already decided. */
export class CliError extends Error {
  readonly code: ExitCode;
  /** Concrete suggestion of what to do. Printed under the message. */
  readonly hint: string | undefined;

  constructor(message: string, code: ExitCode = EXIT.USAGE, hint?: string) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.hint = hint;
  }
}

/** Translates an SDK error into its corresponding exit code. */
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
