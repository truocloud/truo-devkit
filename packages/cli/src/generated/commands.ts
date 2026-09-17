// ─────────────────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit by hand.
//
// It comes from packages/openapi/openapi/v1.json via packages/codegen.
// To change it: change the handler in the API (the Zod schemas are the source
// of truth), regenerate the spec there, 'bun run sync:spec' here, then 'bun run gen'.
// ─────────────────────────────────────────────────────────────────────────────

/** Where an argument's value goes when the request is built. */
export type ArgIn = "path" | "query" | "body";

export interface Positional {
  /** How it is named in the help: `<service_id>`. */
  label: string;
  in: ArgIn;
  /** Actual key in the spec (the path uses `id`, even if the help says `service_id`). */
  key: string;
  required: boolean;
  type?: "string" | "number" | "boolean" | "json" | "string[]";
  /** Allowed values, if the schema enumerates them. */
  values?: string[];
  description?: string;
}

export interface Flag {
  /** Name on the command line, without `--`. */
  flag: string;
  key: string;
  in: ArgIn;
  type: "string" | "number" | "boolean" | "json" | "string[]";
  required: boolean;
  values?: string[];
  description?: string;
}

export interface CommandSpec {
  /** `["vps","power"]` → `truo vps power`. */
  path: string[];
  operationId: string;
  summary: string;
  description: string;
  danger: "none" | "reversible" | "destructive";
  longRunning: boolean;
  deprecated: boolean;
  scope: string | null;
  bodyRequired: boolean;
  /** The body declares no properties: it can only be sent with `--body-json`. */
  freeformBody: boolean;
  positionals: Positional[];
  flags: Flag[];
}

/** The 211 commands derived from the spec. */
export const COMMANDS: CommandSpec[] = [
  {
    "path": [
      "auth",
      "status"
    ],
    "operationId": "account.get",
    "summary": "Get the current account and credential",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "account:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "auth",
      "token",
      "create"
    ],
    "operationId": "apiKeys.create",
    "summary": "Create an API key",
    "description": "Returns the plaintext token **exactly once**. Store it immediately: only its SHA-256 hash is kept and there is no way to recover it later.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "apikeys:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "name",
        "key": "name",
        "in": "body",
        "type": "string",
        "required": true
      },
      {
        "flag": "scopes",
        "key": "scopes",
        "in": "body",
        "type": "string[]",
        "required": true,
        "description": "Concrete scopes. `*` is not accepted: enumerate what the key needs. `apikeys:*` and `users:*` are not grantable."
      },
      {
        "flag": "service-allowlist",
        "key": "service_allowlist",
        "in": "body",
        "type": "string[]",
        "required": false,
        "description": "Restricts the key to these services. Omitted or empty = the whole account."
      },
      {
        "flag": "expires-at",
        "key": "expires_at",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "Expiration in ISO 8601. Without it, the key never expires."
      }
    ]
  },
  {
    "path": [
      "auth",
      "token",
      "list"
    ],
    "operationId": "apiKeys.list",
    "summary": "List the API keys in the account",
    "description": "Session only. Never returns tokens: only the prefix and last 4 characters.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "apikeys:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "auth",
      "token",
      "revoke"
    ],
    "operationId": "apiKeys.revoke",
    "summary": "Revoke an API key",
    "description": "Irreversible. Revocation propagates to all replicas over pub/sub in under a second; the worst case, with Redis down, is 60 seconds (the in-process cache TTL).",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "apikeys:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "key_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "audit",
      "list"
    ],
    "operationId": "auditLogs.list",
    "summary": "List the account's API activity",
    "description": "Includes **denied** attempts (4xx), not just what succeeded: a credential probing endpoints it should not touch is exactly the signal you need to be able to see.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "audit:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "status",
        "key": "status",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "denied-only",
        "key": "denied_only",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "caas",
      "app",
      "create"
    ],
    "operationId": "caas.apps.create",
    "summary": "Create an app",
    "description": "Creates the app and configures its source, but **does not deploy it**: it stays `idle` until you call `POST /v1/caas/{id}/apps/{app_id}/deploy`. Separating the two is what lets you create the app, load its variables, and only then deploy — the reverse order would start the application without its configuration.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "name",
        "key": "name",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "The app's display name. The backend derives an internal identifier from it."
      },
      {
        "flag": "source",
        "key": "source",
        "in": "body",
        "type": "json",
        "required": false,
        "description": "Can be omitted and configured later, but an app without a source cannot be deployed."
      }
    ]
  },
  {
    "path": [
      "caas",
      "app",
      "delete"
    ],
    "operationId": "caas.apps.delete",
    "summary": "Delete an app",
    "description": "**Destructive.** Deletes the app, its variables, and its domains. The service's database data is untouched: it lives separately.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "app_id",
        "in": "path",
        "key": "app_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "caas",
      "deploy"
    ],
    "operationId": "caas.apps.deploy",
    "summary": "Deploy an app",
    "description": "Returns `202` as soon as the deployment starts. The operation resolves by looking up that deployment in the app's history, the only place the backend reports its outcome. Wait on it with `GET /v1/operations/{id}`; failure details are in `GET /v1/caas/{id}/apps/{app_id}/logs`.\n\nIt lives in its own scope (`caas:deploy`) because deploying executes whatever code is in the configured source — which is different from editing the app's configuration.",
    "danger": "reversible",
    "longRunning": true,
    "deprecated": false,
    "scope": "caas:deploy",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "app_id",
        "in": "path",
        "key": "app_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "caas",
      "app",
      "get"
    ],
    "operationId": "caas.apps.get",
    "summary": "Get an app",
    "description": "Returns **only** the declared fields. The backend responds with the deployment engine's full internal object —including plaintext environment variables—; none of that leaves through here. For variable names, use `GET /v1/caas/{id}/apps/{app_id}/env`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "app_id",
        "in": "path",
        "key": "app_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "caas",
      "app",
      "list"
    ],
    "operationId": "caas.apps.list",
    "summary": "List the service's apps",
    "description": "`source` comes back `null`: the backend does not include it in the listing.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "caas",
      "logs"
    ],
    "operationId": "caas.apps.logs",
    "summary": "Get an app's logs",
    "description": "**A snapshot, not a stream.** Returns whatever the backend has at call time, and there is no way to ask for \"what came after\": the backend accepts a cursor but never emits the next one, so this endpoint publishes none. To follow an application live, call again.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "app_id",
        "in": "path",
        "key": "app_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "caas",
      "app",
      "restart"
    ],
    "operationId": "caas.apps.restart",
    "summary": "Restart an app",
    "description": "Restarts the process without rebuilding the image: it picks up the current environment variables but does **not** pull new code. That is what `deploy` is for.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "app_id",
        "in": "path",
        "key": "app_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "caas",
      "database",
      "create"
    ],
    "operationId": "caas.databases.create",
    "summary": "Create a database",
    "description": "The platform generates the password and **it is not returned here or by any other `/v1` endpoint**: there is no way to recover it through this API. Connect from an app in the same service, where the connection string is already available.\n\nDeleting a database is not in this version: the backend does not implement it yet, and publishing an endpoint that always fails would be publishing roadmap.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "engine",
        "key": "engine",
        "in": "body",
        "type": "string",
        "required": true,
        "values": [
          "postgres",
          "mysql",
          "mariadb",
          "mongo",
          "redis"
        ]
      },
      {
        "flag": "name",
        "key": "name",
        "in": "body",
        "type": "string",
        "required": true
      }
    ]
  },
  {
    "path": [
      "caas",
      "database",
      "list"
    ],
    "operationId": "caas.databases.list",
    "summary": "List the service's databases",
    "description": "They belong to the service, not to an app: several apps in the same service can use the same database. **Credentials are not returned** by any endpoint of this API.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "caas",
      "deployment",
      "list"
    ],
    "operationId": "caas.deployments.list",
    "summary": "List an app's deployment history",
    "description": "Newest first, as the backend returns it.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "app_id",
        "in": "path",
        "key": "app_id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "caas",
      "domain",
      "add"
    ],
    "operationId": "caas.domains.create",
    "summary": "Add a domain to an app",
    "description": "The host's DNS must point at the service's IP **before** you call: certificate issuance is validated over HTTP.\n\nTwo more things to know:\n\n- **It is not atomic.** Creation registers the domain and then rebuilds the ingress routing; if the second step fails, the call returns an error with the domain already created. Retrying is safe and is the right move — creation is idempotent per host.\n- **The certificate is issued afterwards**, asynchronously, with no state or id to query. That is why `certificate_type` comes back `null` here. The only real check is an HTTPS request to the host.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "app_id",
        "in": "path",
        "key": "app_id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "host",
        "key": "host",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "It must resolve to the service's IP **before** you create it: the certificate is validated over HTTP, and without DNS pointed, issuance fails silently."
      }
    ]
  },
  {
    "path": [
      "caas",
      "domain",
      "remove"
    ],
    "operationId": "caas.domains.delete",
    "summary": "Remove a domain from an app",
    "description": "Deleting a host that is not on the app is not an error: the ingress routing is rebuilt either way, which is what makes retrying safe.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "app_id",
        "in": "path",
        "key": "app_id",
        "required": true
      },
      {
        "label": "host",
        "in": "path",
        "key": "host",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "caas",
      "domain",
      "list"
    ],
    "operationId": "caas.domains.list",
    "summary": "List an app's domains",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "app_id",
        "in": "path",
        "key": "app_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "caas",
      "env",
      "list"
    ],
    "operationId": "caas.env.list",
    "summary": "List environment variable names",
    "description": "**Returns names, never values.** There is no version of this endpoint that returns them: once written, a value is read only by the application. The backend masks by applying a regex to the key name, which lets anything not named like a secret (`DATABASE_URL`, `SENTRY_DSN`) through in plaintext; that is not a classification policy and it is not published.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "app_id",
        "in": "path",
        "key": "app_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "caas",
      "env",
      "set"
    ],
    "operationId": "caas.env.replace",
    "summary": "Replace the environment variables",
    "description": "**Replaces the entire set**: anything missing from `vars` is deleted. Not a limitation — it is the semantics of the backend, which writes the whole block at once.\n\nSince `GET /env` returns no values, the set has to come from your side — your secrets manager or your configuration repository. That is the natural shape for declarative infrastructure, and it also removes the panel's failure mode, where saving without rewriting the secrets erased them.\n\nChanges take effect on the next `deploy` or `restart`.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "app_id",
        "in": "path",
        "key": "app_id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "vars",
        "key": "vars",
        "in": "body",
        "type": "json",
        "required": true,
        "description": "The **complete** set. Anything not listed here is deleted: sending `[]` leaves the app with no variables. Since `GET /env` returns no values, the whole set has to come from your side —your secrets manager or your configuration repository— which is how any declarative infrastructure works."
      }
    ]
  },
  {
    "path": [
      "caas",
      "get"
    ],
    "operationId": "caas.instances.get",
    "summary": "Get a CaaS service with its live state",
    "description": "Queries the control plane. If it does not respond, `provisioning_state` and `machine` come back `null` instead of failing: a control plane hiccup should not stop you from reading the rest of the resource or its `capabilities`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "caas",
      "list"
    ],
    "operationId": "caas.instances.list",
    "summary": "List CaaS services",
    "description": "Served from the database, without querying the control plane: `provisioning_state` and `machine` come back `null`. Fetching them would cost two calls per page item.\n\nA page can come back with fewer items than `limit` even when more exist: every control plane product shares the same provisioning module, so the family filter can only be applied after reading the page. `has_more` remains the correct signal for whether anything is left to fetch.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "caas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "dbaas",
      "backup",
      "create"
    ],
    "operationId": "dbaas.backups.create",
    "summary": "Create a backup",
    "description": "Returns `202` as soon as the task starts, not when the archive is ready: a dump can take minutes, far beyond any HTTP timeout. The operation **resolves against the backup list** —a new one appears or it does not— rather than against the POST result, so it survives the call timing out while the backup is still running. Wait on it with `GET /v1/operations/{id}`.",
    "danger": "reversible",
    "longRunning": true,
    "deprecated": false,
    "scope": "dbaas:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "dbaas",
      "backup",
      "list"
    ],
    "operationId": "dbaas.backups.list",
    "summary": "List the service's backups",
    "description": "Newest first. A service whose engine has no managed backups returns an empty list, not an error.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "dbaas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "dbaas",
      "connection"
    ],
    "operationId": "dbaas.connection.get",
    "summary": "Get connection details, without the credential",
    "description": "Host, port, database, admin username, TLS mode, and the service's CA — which is **public** and used to verify the server. **It does not include the password or any URI containing it**: the credential comes from `POST /v1/dbaas/{id}/credentials`, which requires the `dbaas:credentials` scope.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "dbaas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "dbaas",
      "credentials"
    ],
    "operationId": "dbaas.credentials.create",
    "summary": "Reveal the admin credential",
    "description": "Returns the admin password **in plaintext**. It rotates nothing: this is the credential already in use.\n\nIt is a POST rather than a GET on purpose. A GET lands in browser history, in any proxy's logs, and in intermediate caches, and can be triggered accidentally from a link; a POST forces a deliberate action and enters the audit log as a mutation, so revealing a database's credential leaves a trace. For the same reason it lives in its own scope (`dbaas:credentials`): `dbaas:write` creates scoped databases and users, while this grants full access to the data and survives revoking the key.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "dbaas:credentials",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "dbaas",
      "database",
      "create"
    ],
    "operationId": "dbaas.databases.create",
    "summary": "Create a database",
    "description": "`charset` and `collation` are MySQL-only; `owner` is PostgreSQL-only. Other engines ignore them. The response carries no size or table count: the database is born empty and re-reading it would cost another call just to report a zero.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "dbaas:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "name",
        "key": "name",
        "in": "body",
        "type": "string",
        "required": true
      },
      {
        "flag": "charset",
        "key": "charset",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "MySQL only. Defaults to `utf8mb4`."
      },
      {
        "flag": "collation",
        "key": "collation",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "MySQL only. Defaults to `utf8mb4_unicode_ci`."
      },
      {
        "flag": "owner",
        "key": "owner",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "PostgreSQL only. The user that owns the database; defaults to the admin."
      }
    ]
  },
  {
    "path": [
      "dbaas",
      "database",
      "delete"
    ],
    "operationId": "dbaas.databases.delete",
    "summary": "Delete a database",
    "description": "**Destructive and irreversible**: the data is gone and there is no trash bin. All that remains is whatever is in `GET /v1/dbaas/{id}/backups`.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "dbaas:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "name",
        "in": "path",
        "key": "name",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "dbaas",
      "database",
      "list"
    ],
    "operationId": "dbaas.databases.list",
    "summary": "List the service's databases",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "dbaas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "dbaas",
      "get"
    ],
    "operationId": "dbaas.instances.get",
    "summary": "Get a database with its live state",
    "description": "Queries the backend. If it does not respond, the state fields come back `null` and `capabilities` omits `databases`/`users` instead of failing: a backend hiccup should not stop you from reading the rest of the resource.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "dbaas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "dbaas",
      "list"
    ],
    "operationId": "dbaas.instances.list",
    "summary": "List managed databases",
    "description": "Served from the database, without querying the backend: `engine`, `state`, `host`, and `plan` come back `null`, and `capabilities` **omits** `databases` and `users` because knowing whether the engine has them would cost one call per page item. An absent key means \"not queried\", which is not the same as `false`. For the live state of one, use `GET /v1/dbaas/{id}`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "dbaas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "dbaas",
      "restart"
    ],
    "operationId": "dbaas.instances.restart",
    "summary": "Restart the engine",
    "description": "Drops open connections: in-flight transactions are lost. Returns `202` with an already-completed operation —the restart is synchronous in both backends— so clients treat every long mutation the same way, and so the day it stops being synchronous, only the operation's `backend` column changes, not the contract.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "dbaas:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "dbaas",
      "logs"
    ],
    "operationId": "dbaas.logs.get",
    "summary": "Get the engine log's last lines",
    "description": "The tail of the engine process's log, oldest to newest. It is not a query log or an audit log: these are the engine's startup messages, errors, and warnings.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "dbaas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "lines",
        "key": "lines",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "dbaas",
      "stats"
    ],
    "operationId": "dbaas.stats.get",
    "summary": "Get instance metrics",
    "description": "A snapshot, not a time series. Which fields are populated depends on the service's backend: some measure the container and others the engine.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "dbaas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "dbaas",
      "user",
      "create"
    ],
    "operationId": "dbaas.users.create",
    "summary": "Create a user",
    "description": "The password is neither stored on our side nor returned later: if it is lost, change it with `POST /v1/dbaas/{id}/users/{username}/password`.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "dbaas:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "username",
        "key": "username",
        "in": "body",
        "type": "string",
        "required": true
      },
      {
        "flag": "password",
        "key": "password",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "Never stored or returned: if it is lost, change it with `POST /v1/dbaas/{id}/users/{username}/password`."
      },
      {
        "flag": "host",
        "key": "host",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "MySQL only. Defaults to `%` (any origin)."
      },
      {
        "flag": "databases",
        "key": "databases",
        "in": "body",
        "type": "string[]",
        "required": false,
        "description": "Databases the user is granted permissions on."
      },
      {
        "flag": "privileges",
        "key": "privileges",
        "in": "body",
        "type": "string[]",
        "required": false,
        "description": "MySQL: SQL privileges (`SELECT`, `INSERT`, …); defaults to `ALL` over `databases`. PostgreSQL: the first one is used as the role (`readwrite`, `readonly`). One word per element: compound privileges (`ALL PRIVILEGES`) are rejected because the value ends up inside a `GRANT` the engine builds by concatenation."
      }
    ]
  },
  {
    "path": [
      "dbaas",
      "user",
      "delete"
    ],
    "operationId": "dbaas.users.delete",
    "summary": "Delete a user",
    "description": "**Cuts off everything currently connected as that user.** It deletes no data: the databases the user created remain.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "dbaas:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "username",
        "in": "path",
        "key": "username",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "host",
        "key": "host",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "dbaas",
      "user",
      "list"
    ],
    "operationId": "dbaas.users.list",
    "summary": "List the engine's users",
    "description": "Includes the admin. On MySQL the same name can appear with several `host` values: the `user@host` pair is what identifies the user, and that is why it is the resource's `id`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "dbaas:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "dbaas",
      "user",
      "password"
    ],
    "operationId": "dbaas.users.set_password",
    "summary": "Change a user's password",
    "description": "Takes effect immediately: applications still using the old one will fail on reconnect. It also works for the admin user.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "dbaas:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "username",
        "in": "path",
        "key": "username",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "password",
        "key": "password",
        "in": "body",
        "type": "string",
        "required": true
      }
    ]
  },
  {
    "path": [
      "dns",
      "record",
      "delete"
    ],
    "operationId": "dns.records.delete",
    "summary": "Delete an RRset",
    "description": "Deletes every value for that name and type.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "dns:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "zone",
        "in": "path",
        "key": "zone",
        "required": true
      },
      {
        "label": "name",
        "in": "path",
        "key": "name",
        "required": true
      },
      {
        "label": "type",
        "in": "path",
        "key": "type",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "dns",
      "record",
      "get"
    ],
    "operationId": "dns.records.get",
    "summary": "Get an RRset",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "dns:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "zone",
        "in": "path",
        "key": "zone",
        "required": true
      },
      {
        "label": "name",
        "in": "path",
        "key": "name",
        "required": true
      },
      {
        "label": "type",
        "in": "path",
        "key": "type",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "dns",
      "record",
      "list"
    ],
    "operationId": "dns.records.list",
    "summary": "List a zone's records",
    "description": "Grouped into RRsets: an `A` record with two IPs is **one** record with two values. The response carries an `ETag`; pass it as `If-Match` when writing and no concurrent change gets lost.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "dns:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "zone",
        "in": "path",
        "key": "zone",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "dns",
      "record",
      "apply"
    ],
    "operationId": "dns.records.patch",
    "summary": "Apply several changes at once",
    "description": "Each element replaces its RRset; `values: []` deletes it. It is how you apply a coherent change —moving a site and its mail together— without it landing halfway between two calls. **It is not atomic in the backend**: if one change fails, the earlier ones were already applied and the response says which one stopped.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "dns:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "zone",
        "in": "path",
        "key": "zone",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "records",
        "key": "records",
        "in": "body",
        "type": "json",
        "required": true
      }
    ]
  },
  {
    "path": [
      "dns",
      "record",
      "set"
    ],
    "operationId": "dns.records.put",
    "summary": "Create or replace an RRset",
    "description": "Replaces the **entire** RRset: values missing from `values` are deleted. That is DNS semantics and the backend's — there is no \"add an IP\" without rewriting the set. Read the RRset, add the value to the list, and send the full list with the `ETag` in `If-Match`.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "dns:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "zone",
        "in": "path",
        "key": "zone",
        "required": true
      },
      {
        "label": "name",
        "in": "path",
        "key": "name",
        "required": true
      },
      {
        "label": "type",
        "in": "path",
        "key": "type",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "ttl",
        "key": "ttl",
        "in": "body",
        "type": "number",
        "required": false,
        "description": "Seconds, 60–604800. Defaults to 3600."
      },
      {
        "flag": "values",
        "key": "values",
        "in": "body",
        "type": "string[]",
        "required": true,
        "description": "Replaces the **entire** RRset. Values not listed here are deleted: to add one, read the RRset, append it to the list, and send the full list."
      }
    ]
  },
  {
    "path": [
      "dns",
      "zone",
      "export"
    ],
    "operationId": "dns.zones.export",
    "summary": "Export the zone in BIND format",
    "description": "The zone file exactly as the backend emits it. Useful for backup or migration.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "dns:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "zone",
        "in": "path",
        "key": "zone",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "dns",
      "zone",
      "get"
    ],
    "operationId": "dns.zones.get",
    "summary": "Get a zone",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "dns:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "zone",
        "in": "path",
        "key": "zone",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "dns",
      "zone",
      "list"
    ],
    "operationId": "dns.zones.list",
    "summary": "List DNS zones",
    "description": "Served from the database, without querying the DNS backend: `record_count` and `serial` come back `null`. Fetching them would cost one call per zone, and some accounts have dozens.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "dns:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "images",
      "key",
      "create"
    ],
    "operationId": "images.keys.create",
    "summary": "Create a delivery token",
    "description": "Returns the full `imgt_…` token, **exactly once**: only its hash is stored, so there is no way to show it again. If it is lost, rotate or mint another.\n\nThis token **does not work against this API**: it authenticates the delivery plane — `GET {api_endpoint}/v1/img?url=…` for transformations and `POST {api_endpoint}/v1/sign` to sign URLs. Delivery deliberately does not go through `api.truo.cloud`: one extra hop on every `<img>` of every page is one extra failure mode.\n\nIt requires `images:keys` rather than `images:write` because holding this token **is** the ability to serve — and bill — traffic through the account's tenant.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "images:keys",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "images",
      "key",
      "rotate"
    ],
    "operationId": "images.keys.rotate",
    "summary": "Rotate the delivery token",
    "description": "Issues a new token and returns it. With `grace_seconds`, the previous token keeps working that long, so servers holding it do not fail at the instant of rotation; with `0` (the default) it dies immediately. There is no going back: the old token cannot be reactivated.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "images:keys",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "grace-seconds",
        "key": "grace_seconds",
        "in": "body",
        "type": "number",
        "required": false,
        "description": "How long the previous credential stays valid after the rotation, in seconds (up to 7 days). With `0` it dies immediately."
      }
    ]
  },
  {
    "path": [
      "images",
      "origin",
      "add"
    ],
    "operationId": "images.origins.add",
    "summary": "Allow an origin",
    "description": "Adds a hostname (`images.example.com`) or a wildcard (`*.example.com`) to the allowlist. Idempotent: re-adding an existing pattern changes nothing. Each plan caps how many origins it can hold; past the cap this returns `quota_exceeded`.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "images:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "pattern",
        "in": "body",
        "key": "pattern",
        "required": true,
        "type": "string",
        "description": "A hostname (`images.example.com`) or a wildcard for its subdomains (`*.example.com`). Lowercased on save."
      }
    ],
    "flags": []
  },
  {
    "path": [
      "images",
      "origin",
      "list"
    ],
    "operationId": "images.origins.list",
    "summary": "List the origin allowlist",
    "description": "The hostnames the service is allowed to fetch from. **Fail-closed**: an empty allowlist serves nothing, on purpose — an open image proxy is an attack tool.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "images:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "images",
      "origin",
      "remove"
    ],
    "operationId": "images.origins.remove",
    "summary": "Remove an origin",
    "description": "Stops serving from that origin immediately. Reversible: adding the pattern back restores it. If it was the last origin, the tenant serves nothing until one is added — the allowlist is fail-closed.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "images:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "pattern",
        "in": "path",
        "key": "pattern",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "images",
      "signing",
      "reveal"
    ],
    "operationId": "images.signing.reveal",
    "summary": "Reveal the URL-signing secret",
    "description": "Returns the per-tenant HMAC-SHA256 secret that signs delivery URLs. **It is a POST on purpose, even though it changes nothing**: a GET that returns a secret lands in browser history, in any proxy's cache, and in yesterday's `curl`. A POST forces a deliberate action, is not cacheable, and enters the audit log as a mutation.\n\nThe secret is recoverable (stored, not hashed) because your server needs it whole to sign every URL it emits. It belongs on the server, **never in the browser**: anyone holding it can mint URLs that serve — and bill — through your tenant. If it was compromised, rotate it with `POST /v1/images/signing-secret/rotate`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "images:keys",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "images",
      "signing",
      "rotate"
    ],
    "operationId": "images.signing.rotate",
    "summary": "Rotate the URL-signing secret",
    "description": "Issues a new secret and returns it. URLs signed with the previous secret keep working until `previous_valid_until` (per `grace_seconds`) — without a grace window, every `<img>` already rendered in your pages would break at the instant of rotation. Re-sign and redeploy before the window closes.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "images:keys",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "grace-seconds",
        "key": "grace_seconds",
        "in": "body",
        "type": "number",
        "required": false,
        "description": "How long the previous credential stays valid after the rotation, in seconds (up to 7 days). With `0` it dies immediately."
      }
    ]
  },
  {
    "path": [
      "images",
      "get"
    ],
    "operationId": "images.tenant.get",
    "summary": "Get the account's Image Services",
    "description": "It takes no id: there is one Image Services tenant per account. Returns the plan, the month's usage, and how many origins are allowed. `origin_count: 0` means nothing is served yet — the allowlist is fail-closed. If the account does not have the service, it returns 404.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "images:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "images",
      "usage"
    ],
    "operationId": "images.usage.get",
    "summary": "Get the period's usage and billable line",
    "description": "Consumption against the plan for the period: transformations (cache misses — real CPU work), deliveries, egress bytes, what the quota includes, the overage, and the total in USD. Includes the daily series. On a hard-capped plan (`included.hard_cap`) the overage is never billed: the service stops at the quota instead.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "images:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "period",
        "key": "period",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "days",
        "key": "days",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "lb",
      "backend",
      "add"
    ],
    "operationId": "lb.backends.create",
    "summary": "Add a backend to a listener",
    "description": "A shortcut over `PUT /listeners` for the common case of adding a machine. It revalidates and applies the full configuration, so it inherits the same guarantee: either the backend ends up receiving traffic, or nothing changed.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "lb:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "listener",
        "key": "listener",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "The name of an existing listener."
      },
      {
        "flag": "ip",
        "key": "ip",
        "in": "body",
        "type": "string",
        "required": true
      },
      {
        "flag": "port",
        "key": "port",
        "in": "body",
        "type": "number",
        "required": true
      },
      {
        "flag": "weight",
        "key": "weight",
        "in": "body",
        "type": "number",
        "required": false
      }
    ]
  },
  {
    "path": [
      "lb",
      "backend",
      "remove"
    ],
    "operationId": "lb.backends.delete",
    "summary": "Remove a backend from a listener",
    "description": "The three values identifying the backend go in the path. The upstream expects them in the body of a `DELETE`, which proxies and CDNs discard and several HTTP clients refuse to send; the body is built on this side.\n\n**A listener cannot be left without backends.** Removing the last one returns `400 validation_failed`: to remove the whole listener, use `PUT /listeners` without it.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "lb:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "listener",
        "in": "path",
        "key": "listener",
        "required": true
      },
      {
        "label": "ip",
        "in": "path",
        "key": "ip",
        "required": true
      },
      {
        "label": "port",
        "in": "path",
        "key": "port",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "lb",
      "backend",
      "list"
    ],
    "operationId": "lb.backends.list",
    "summary": "List the backends",
    "description": "The backends of every listener, flattened, each with the listener it belongs to. It is a view over the same configuration that `GET /listeners` returns.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "lb:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "lb",
      "get"
    ],
    "operationId": "lb.instances.get",
    "summary": "Get a load balancer with its live state",
    "description": "Queries the control plane, which in turn probes the balancer. If it does not respond, the state fields come back `null` instead of failing.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "lb:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "lb",
      "list"
    ],
    "operationId": "lb.instances.list",
    "summary": "List load balancers",
    "description": "Served from the database, without querying the control plane: `provisioning_state`, `healthy`, and `listener_count` come back `null`. Fetching them would cost one call per page item.\n\nA page can come back with fewer items than `limit` even when more exist: every control plane product shares the same provisioning module, so the family filter can only be applied after reading the page. `has_more` remains the correct signal for whether anything is left to fetch.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "lb:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "lb",
      "listener",
      "list"
    ],
    "operationId": "lb.listeners.list",
    "summary": "List the listeners",
    "description": "The balancer's full configuration, including each listener's backends. It is what you read, modify, and send back in `PUT`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "lb:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "lb",
      "listener",
      "apply"
    ],
    "operationId": "lb.listeners.replace",
    "summary": "Replace the listener configuration",
    "description": "**Replaces the entire set**: listeners missing from `listeners` are deleted, along with their backends. Sending `[]` leaves the balancer with nothing listening and cuts traffic. Read `GET /listeners`, modify, and send everything back.\n\n**The change is applied within the call**: by the time this returns, the new configuration is already serving traffic. If the resulting configuration is invalid, nothing is applied and the response is `400 validation_failed` — the service is never left half-configured.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "lb:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "listeners",
        "key": "listeners",
        "in": "body",
        "type": "json",
        "required": true,
        "description": "The **complete** set. Anything not listed here is deleted, including its backends; sending `[]` leaves the balancer with nothing listening. Names and ports are unique within the set."
      }
    ]
  },
  {
    "path": [
      "lb",
      "stats"
    ],
    "operationId": "lb.stats.get",
    "summary": "Get per-listener state and traffic",
    "description": "A point-in-time snapshot: current connections and bytes accumulated since the balancer's last start, plus each backend's health from the latest probe. There is no historical series.\n\nIf the balancer does not answer the probe, the listeners still appear —they come from the stored configuration— with `state: unknown` and zeroed counters. A listener that exists but does not respond and one that exists with no traffic cannot be told apart by the counters: check `state`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "lb:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "mail-gateway",
      "domain",
      "add"
    ],
    "operationId": "mailgateway.domains.create",
    "summary": "Add a sending domain",
    "description": "Returns **the DNS records you must publish** in the domain's zone. That is the point of this call: until they are published and SES sees them, the domain does not verify and you cannot send from it. Each record carries `purpose`, `type`, `host`, `value`, and `status`; `purpose` is the stable key for automating publication.\n\nVerification is **asynchronous and on the SES side**: this call does not wait. Check the status with `POST /v1/mail-gateway/domains/{domain}/verify`.\n\nIt is idempotent: repeating it for an already-added domain reuses the same DKIM key pair and returns the same records, so a retry does not invalidate what is already published.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "mailgateway:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "domain",
        "in": "body",
        "key": "domain",
        "required": true,
        "type": "string",
        "description": "The sending domain. Normalized to lowercase. You must be able to edit its DNS: the creation call returns the records to publish."
      }
    ],
    "flags": []
  },
  {
    "path": [
      "mail-gateway",
      "domain",
      "remove"
    ],
    "operationId": "mailgateway.domains.delete",
    "summary": "Remove a sending domain",
    "description": "Cuts off sending from that domain: it leaves the SMTP policy and the keys. The DNS records remain published in your zone; removing them is up to you. Adding it back generates new DKIM keys, so the old TXT record stops working.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "mailgateway:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "domain",
        "in": "path",
        "key": "domain",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "mail-gateway",
      "domain",
      "list"
    ],
    "operationId": "mailgateway.domains.list",
    "summary": "List sending domains",
    "description": "Each domain comes with its DNS records and the status of each one. You can only send from a `verified` domain.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "mailgateway:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "mail-gateway",
      "domain",
      "verify"
    ],
    "operationId": "mailgateway.domains.verify",
    "summary": "Check a domain's verification",
    "description": "**A check, not a trigger.** SES inspects public DNS on its own and at its own pace; this reads that result and updates the domain's status and each record's. Getting `pending` back is not an error: it means SES has not seen the records yet, either because they have not propagated or because they are not published.\n\nThe `dkim` and `mail_from_mx` records are the ones SES verifies. `spf`, `mail_from_spf`, and `dmarc` always stay `info`: they improve deliverability, but nothing checks them.\n\n`verified_at` comes back `null` in this response even when the status is `verified`; the value is in `GET /v1/mail-gateway/domains`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "mailgateway:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "domain",
        "in": "path",
        "key": "domain",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "mail-gateway",
      "key",
      "create"
    ],
    "operationId": "mailgateway.keys.create",
    "summary": "Create a sending API key",
    "description": "Returns the full key in `secret`, **exactly once**: we store its hash, so there is no way to show it again. If it is lost, create another and revoke this one.\n\nThis key **does not work against this API**: it is used on the sending plane, `POST {api_endpoint}/emails` (currently `https://mg.truo.cloud/v1/emails`), with `Authorization: Bearer mg_live_…`. Sending deliberately does not go through `api.truo.cloud`: one extra hop on the mail path is one extra failure mode.\n\nIt requires `mailgateway:send` rather than `mailgateway:write` because issuing this credential **is** the ability to send on the account's behalf, and it survives this API's key being revoked.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "mailgateway:send",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "mail-gateway",
      "key",
      "revoke"
    ],
    "operationId": "mailgateway.keys.delete",
    "summary": "Revoke a sending API key",
    "description": "Takes effect almost immediately: the key leaves the gateway's index. Whatever was already accepted is delivered. Revoking requires `write` rather than `send` on purpose: removing the account's ability to send should not require the scope that **grants** the ability to send.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "mailgateway:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "key_id",
        "in": "path",
        "key": "key_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "mail-gateway",
      "key",
      "list"
    ],
    "operationId": "mailgateway.keys.list",
    "summary": "List sending API keys",
    "description": "Includes revoked keys, so history can be audited. `secret` is always `null`: we store the key's hash and there is no way to recover it.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "mailgateway:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "mail-gateway",
      "message",
      "list"
    ],
    "operationId": "mailgateway.messages.list",
    "summary": "List sent messages",
    "description": "One element per message, newest first, with the aggregate status of the highest-severity event seen (`bounced` beats `delivered`). Retained for 90 days.\n\nNo `total`: the backend cannot know how many messages match without walking the entire history, and no `/v1` collection publishes totals. Paginate with `next_cursor`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "mailgateway:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "recipient",
        "key": "recipient",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "days",
        "key": "days",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "mail-gateway",
      "metrics"
    ],
    "operationId": "mailgateway.metrics.get",
    "summary": "Get delivery and reputation metrics",
    "description": "Delivery, open, bounce, and complaint rates for the range, with the daily series, send-to-delivery latency, and the per-domain breakdown. Rates are fractions (0–1), not percentages. `bounce_rate_limit` and `complaint_rate_limit` are the SES thresholds: crossing them suspends sending to protect the shared reputation.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "mailgateway:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "range",
        "key": "range",
        "in": "query",
        "type": "string",
        "required": false,
        "values": [
          "7d",
          "30d",
          "90d"
        ]
      }
    ]
  },
  {
    "path": [
      "mail-gateway",
      "smtp",
      "get"
    ],
    "operationId": "mailgateway.smtp.get",
    "summary": "View the SMTP configuration",
    "description": "Host, port, username, and status, **without the password**. It is what you need to configure or review a mail client without handling the secret. For the password, use `POST /v1/mail-gateway/smtp`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "mailgateway:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "mail-gateway",
      "smtp",
      "reveal"
    ],
    "operationId": "mailgateway.smtp.reveal",
    "summary": "Reveal the SMTP password",
    "description": "Returns the SMTP password in plaintext. **It is a POST on purpose, even though it changes nothing.** The backend exposes it in a GET, and a GET that returns a secret lands in browser history, in any proxy's cache, and in yesterday's `curl`. A POST forces a deliberate action, is not cacheable, and enters the audit log as a mutation — which is exactly how \"who pulled the sending password, and when\" has to be auditable.\n\nThe password is recoverable (stored encrypted, not hashed) because a mail server needs it whole on every connection. If it was compromised, no longer looking at it is not enough: rotate it with `POST /v1/mail-gateway/smtp/rotate`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "mailgateway:send",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "mail-gateway",
      "smtp",
      "rotate"
    ],
    "operationId": "mailgateway.smtp.rotate",
    "summary": "Rotate the SMTP credential",
    "description": "Issues a new username and password and returns both. The previous credential is deactivated, not deleted, so an application that still holds it in memory does not crash at the instant of rotation — but it will stop working, so update your systems. There is no going back: the old one cannot be reactivated from here.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "mailgateway:send",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "mail-gateway",
      "get"
    ],
    "operationId": "mailgateway.tenant.get",
    "summary": "Get the account's Mail Gateway",
    "description": "It takes no id: there is one Mail Gateway per account. Returns the status, the month's usage, and how many domains and keys exist; each has its own detail endpoint. If the account does not have the service, it returns 404.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "mailgateway:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "mail-gateway",
      "usage"
    ],
    "operationId": "mailgateway.usage.get",
    "summary": "Get the current month's usage",
    "description": "Accepted and rejected sends for the current UTC calendar month. This is the number that gets billed. Rejected sends are not charged: they are the ones the gateway stopped before SES.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "mailgateway:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "object-storage",
      "bucket",
      "create"
    ],
    "operationId": "objectstorage.buckets.create",
    "summary": "Create a bucket",
    "description": "Returns the same resource as `GET /v1/object-storage/buckets/{bucket}`. The backend's create call responds with the raw registry row —a different shape, with a different date format— so it is re-read before responding: it costs one call and buys create and read returning the same object.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "objectstorage:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "name",
        "in": "body",
        "key": "name",
        "required": true,
        "type": "string"
      }
    ],
    "flags": [
      {
        "flag": "access",
        "key": "access",
        "in": "body",
        "type": "string",
        "required": false,
        "values": [
          "private",
          "public"
        ],
        "description": "Defaults to `private`."
      }
    ]
  },
  {
    "path": [
      "object-storage",
      "bucket",
      "delete"
    ],
    "operationId": "objectstorage.buckets.delete",
    "summary": "Delete a bucket",
    "description": "A bucket with objects is not deleted: the request fails and touches nothing. `?purge=true` deletes it along with all its contents, and that **cannot be undone** — there is no trash bin and no versioning. To know how many objects will be lost, empty it first with `POST .../empty`, which returns the count.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "objectstorage:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "bucket",
        "in": "path",
        "key": "bucket",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "purge",
        "key": "purge",
        "in": "query",
        "type": "string",
        "required": false,
        "values": [
          "true",
          "false"
        ]
      }
    ]
  },
  {
    "path": [
      "object-storage",
      "bucket",
      "empty"
    ],
    "operationId": "objectstorage.buckets.empty",
    "summary": "Empty a bucket",
    "description": "Deletes every object and keeps the bucket with its configuration. **It cannot be undone.** On a large bucket it can take a while: deletion runs object by object against the storage.",
    "danger": "destructive",
    "longRunning": true,
    "deprecated": false,
    "scope": "objectstorage:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "bucket",
        "in": "path",
        "key": "bucket",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "object-storage",
      "bucket",
      "get"
    ],
    "operationId": "objectstorage.buckets.get",
    "summary": "Get a bucket",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "objectstorage:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "bucket",
        "in": "path",
        "key": "bucket",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "object-storage",
      "bucket",
      "list"
    ],
    "operationId": "objectstorage.buckets.list",
    "summary": "List buckets",
    "description": "Includes buckets created directly through the S3 protocol, which have no registry row: they are listed anyway —hiding them would hide data that exists— with `created_at` set to `null` and private access.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "objectstorage:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "object-storage",
      "bucket",
      "metrics"
    ],
    "operationId": "objectstorage.buckets.metrics",
    "summary": "Get a bucket's metrics",
    "description": "Storage, egress, and requests for the requested range. The series carry one point per UTC day and come back empty until there is data, rather than being padded with zeros that would be indistinguishable from a day without traffic.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "objectstorage:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "bucket",
        "in": "path",
        "key": "bucket",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "range",
        "key": "range",
        "in": "query",
        "type": "string",
        "required": false,
        "values": [
          "7d",
          "30d",
          "90d"
        ]
      }
    ]
  },
  {
    "path": [
      "object-storage",
      "bucket",
      "update"
    ],
    "operationId": "objectstorage.buckets.update",
    "summary": "Change a bucket's visibility",
    "description": "Making the bucket public mints an anonymous read URL (`public_url`) and keeps it if the bucket later goes private: republishing returns the same URL, not a new one.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "objectstorage:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "bucket",
        "in": "path",
        "key": "bucket",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "access",
        "key": "access",
        "in": "body",
        "type": "string",
        "required": true,
        "values": [
          "private",
          "public"
        ],
        "description": "`public` publishes the bucket at a read-only URL (`public_url`). `private` withdraws it: objects remain accessible with a key or a presigned URL."
      }
    ]
  },
  {
    "path": [
      "object-storage",
      "key",
      "create"
    ],
    "operationId": "objectstorage.keys.create",
    "summary": "Issue an access key",
    "description": "The **only** endpoint that returns `secret_access_key`, and it returns it exactly once: it is not stored in plaintext on our side and there is no way to recover it later. If it is lost, the way out is to delete the key and issue another. Keys coexist: issuing one does not revoke the previous ones. Limit each one to a bucket with `scope` so that losing one does not compromise the rest.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "objectstorage:keys",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "name",
        "in": "body",
        "key": "name",
        "required": true,
        "type": "string",
        "description": "To recognize it later. It has no effect on permissions."
      }
    ],
    "flags": [
      {
        "flag": "scope",
        "key": "scope",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "A bucket name to limit the key to, or `*` (the default) for all. One key per bucket is what keeps losing one from compromising the rest."
      },
      {
        "flag": "permission",
        "key": "permission",
        "in": "body",
        "type": "string",
        "required": false,
        "values": [
          "read",
          "readwrite",
          "full"
        ],
        "description": "Defaults to `readwrite`."
      }
    ]
  },
  {
    "path": [
      "object-storage",
      "key",
      "delete"
    ],
    "operationId": "objectstorage.keys.delete",
    "summary": "Revoke an access key",
    "description": "Revocation is immediate. Revoking a key **also invalidates the presigned URLs signed with it**, even if they have not expired: the signature is validated against the key, and a revoked key no longer exists. It is the only way to cut off a presigned URL early.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "objectstorage:keys",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "key_id",
        "in": "path",
        "key": "key_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "object-storage",
      "key",
      "list"
    ],
    "operationId": "objectstorage.keys.list",
    "summary": "List access keys",
    "description": "Active keys only, and never the secret.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "objectstorage:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "object-storage",
      "object",
      "delete"
    ],
    "operationId": "objectstorage.objects.delete",
    "summary": "Delete objects",
    "description": "Batch delete by key. It is a `POST` rather than a `DELETE` because the key list goes in the body: not every HTTP client sends a `DELETE` with a body. **It cannot be undone.** `deleted` can be lower than the number of keys requested: keys that did not exist do not count.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "objectstorage:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "bucket",
        "in": "path",
        "key": "bucket",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "keys",
        "key": "keys",
        "in": "body",
        "type": "string[]",
        "required": true,
        "description": "Keys relative to the bucket. A key that does not exist is not an error: it is not counted."
      }
    ]
  },
  {
    "path": [
      "object-storage",
      "object",
      "list"
    ],
    "operationId": "objectstorage.objects.list",
    "summary": "List a bucket's objects",
    "description": "One level at a time, like a file explorer: entries with `is_folder: true` are prefixes, navigated by passing their `key` as `prefix`. It does not accept `limit`: the backend sets the page size (up to 1000 entries) and trimming here would silently drop objects as the cursor advances.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "objectstorage:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "bucket",
        "in": "path",
        "key": "bucket",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "prefix",
        "key": "prefix",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "object-storage",
      "object",
      "presign"
    ],
    "operationId": "objectstorage.objects.presign",
    "summary": "Presign a temporary URL",
    "description": "Returns a link that works without credentials until it expires. `method: \"GET\"` to download (requires `objectstorage:read`), `method: \"PUT\"` to upload (requires `objectstorage:write`). The URL is a bearer credential: it works for anyone who holds it, and the only way to cut it off before it expires is to revoke the S3 key that signed it. Request the shortest TTL that works for you. It also inherits the scope of that key: if the key is limited to one bucket or is read-only, the URL can do no more than the key can.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "objectstorage:read",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "bucket",
        "in": "path",
        "key": "bucket",
        "required": true
      },
      {
        "label": "key",
        "in": "body",
        "key": "key",
        "required": true,
        "type": "string",
        "description": "The key, relative to the bucket."
      }
    ],
    "flags": [
      {
        "flag": "method",
        "key": "method",
        "in": "body",
        "type": "string",
        "required": false,
        "values": [
          "GET",
          "PUT"
        ],
        "description": "What the URL enables: `GET` downloads, `PUT` uploads. Defaults to `GET`. Signing a `PUT` requires `objectstorage:write`."
      },
      {
        "flag": "expires-in",
        "key": "expires_in",
        "in": "body",
        "type": "number",
        "required": false,
        "description": "Validity in seconds, 1–604800 (7 days). Defaults to 900."
      }
    ]
  },
  {
    "path": [
      "object-storage",
      "get"
    ],
    "operationId": "objectstorage.tenant.get",
    "summary": "Get the account's Object Storage",
    "description": "Usage, endpoint, and status. It is a per-account singleton: there is no listing and no id to pass. Storage and object counts come from the latest daily snapshot, not a live scan, so a freshly uploaded object can take a while to show up in the totals.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "objectstorage:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "operation",
      "get"
    ],
    "operationId": "operations.get",
    "summary": "Get the status of an operation",
    "description": "Reads consult the real backend, with a 2 s cache. If the backend does not respond, the last known state is returned with `stale: true` and **never a 500**: a polling client must not lose its operation to a backend hiccup, nor be pushed into retrying the mutation.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "operations:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "operation_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "operation",
      "list"
    ],
    "operationId": "operations.list",
    "summary": "List the account's recent operations",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "operations:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "orders",
      "cancel"
    ],
    "operationId": "orders.cancel",
    "summary": "Cancel an order or request the cancellation of its services",
    "description": "A `pending` order (unpaid) is voided at once. An `active` order gets a cancellation request per service, which WHMCS executes `immediate`ly or at the `end_of_cycle`. **This call destroys nothing by itself**; backups are kept according to the product policy.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "orders:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "order_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "when",
        "key": "when",
        "in": "body",
        "type": "string",
        "required": false,
        "values": [
          "immediate",
          "end_of_cycle"
        ],
        "description": "`end_of_cycle` (default) keeps the service until the paid period ends. `immediate` asks for termination now. Nothing is destroyed by this call itself: WHMCS runs it on its schedule."
      },
      {
        "flag": "reason",
        "key": "reason",
        "in": "body",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "orders",
      "create"
    ],
    "operationId": "orders.create",
    "summary": "Order a product",
    "description": "Creates the order in WHMCS and returns an **operation** to follow (`202` + `Location`). If the invoice is settled at once (free, 100 % promo code, or account credit), the order is accepted and provisioning starts: the operation goes `running` → `succeeded` with `result.service` when the service is active (for WordPress, when the site is up). If the invoice needs a payment, the operation stays `pending` with `result.invoice.payment_url` until it is paid; there is no timeout on that. An accepted order that is not active after 30 minutes fails with `provisioning_timeout`.\n\nEverything that can be rejected without touching WHMCS is rejected first: unknown product or cycle, invalid promo code (`invalid_promocode`), taken WordPress site name (`hostname_taken`), bad options.\n\n**`Idempotency-Key` is required**: a retry without it would be a second purchase.",
    "danger": "reversible",
    "longRunning": true,
    "deprecated": false,
    "scope": "orders:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "product",
        "key": "product",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "Slug from `GET /v1/orders/products`."
      },
      {
        "flag": "cycle",
        "key": "cycle",
        "in": "body",
        "type": "string",
        "required": true,
        "values": [
          "monthly",
          "quarterly",
          "semiannually",
          "annually",
          "biennially",
          "triennially",
          "onetime",
          "free"
        ],
        "description": "`free` and `onetime` are not recurring. Check `prices` in the product for what is sold."
      },
      {
        "flag": "hostname",
        "key": "hostname",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "For WordPress: the site name (becomes the subdomain). See `hostname` in the product."
      },
      {
        "flag": "promocode",
        "key": "promocode",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "Validated **before** the order is created: an invalid code is `invalid_promocode`, never an unexpected price."
      },
      {
        "flag": "payment-method",
        "key": "payment_method",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "From `GET /v1/orders/payment-methods`. Defaults to the account default."
      },
      {
        "flag": "options",
        "key": "options",
        "in": "body",
        "type": "json",
        "required": false,
        "description": "Configurable options: `{ \"<option id>\": <choice id | quantity | 1/0> }`. See `options` in the product."
      }
    ]
  },
  {
    "path": [
      "orders",
      "get"
    ],
    "operationId": "orders.get",
    "summary": "Get an order",
    "description": "The order, its invoice (if any) and the services it created. An order of another account is a 404.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "orders:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "order_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "orders",
      "list"
    ],
    "operationId": "orders.list",
    "summary": "List the account's orders",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "orders:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "orders",
      "payment-methods"
    ],
    "operationId": "orders.payment_methods.list",
    "summary": "List the payment methods available to this account",
    "description": "What `payment_method` accepts when ordering. The one flagged `default` is used when omitted. An order whose invoice cannot be settled with account credit stays `pending` until it is paid through the panel with one of these.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "orders:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "orders",
      "products"
    ],
    "operationId": "orders.products.list",
    "summary": "List the products this account can order",
    "description": "The orderable catalog, priced in the account currency. `product` is the stable slug to pass to `POST /v1/orders`; `prices` lists the cycles actually sold; `options` the configurable choices. Hidden and retired products are not listed and cannot be ordered. The whole catalog fits in one page by default (`limit` defaults to 100 here); filter with `family` (e.g. `wordpress`, `vps`).",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "orders:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "family",
        "key": "family",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "serverless",
      "cron",
      "get"
    ],
    "operationId": "serverless.cron.get",
    "summary": "Get the account's Cron Jobs",
    "description": "It takes no id: there is one Cron tenant per account. Returns the plan, its limits, how many schedules exist, and the month's executions. Schedules themselves are managed against the service's data plane with the tenant token.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "serverless:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "serverless",
      "cron",
      "key",
      "rotate"
    ],
    "operationId": "serverless.cron.keys.rotate",
    "summary": "Rotate the Cron token",
    "description": "Issues a new `crt_…` token and returns it, exactly once. With `grace_seconds` the previous token keeps working that long; with `0` (the default) it dies immediately. Schedules keep firing through a rotation — the token only authenticates management.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "serverless:keys",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "grace-seconds",
        "key": "grace_seconds",
        "in": "body",
        "type": "number",
        "required": false,
        "description": "How long the previous token stays valid after the rotation, in seconds (up to 7 days). With `0` it dies immediately."
      }
    ]
  },
  {
    "path": [
      "serverless",
      "cron",
      "usage"
    ],
    "operationId": "serverless.cron.usage.get",
    "summary": "Get the Cron period's usage and billable line",
    "description": "Webhook executions against the plan for the period, the overage, the total in USD, and the daily series. On the free plan, deliveries past the quota are skipped (visible in the execution log) instead of billed.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "serverless:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "period",
        "key": "period",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "days",
        "key": "days",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "serverless",
      "db",
      "get"
    ],
    "operationId": "serverless.db.get",
    "summary": "Get the account's Serverless DB",
    "description": "It takes no id: there is one Serverless DB tenant per account. Returns the plan, its limits, the live namespaces and the month's usage. **This is not DBaaS** (`/v1/databases`, managed database VMs): this is the serverless SQL primitive, D1-compatible, one SQLite database per namespace.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "serverless:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "serverless",
      "db",
      "key",
      "rotate"
    ],
    "operationId": "serverless.db.keys.rotate",
    "summary": "Rotate the DB token",
    "description": "Issues a new `dbt_…` token and returns it, exactly once. With `grace_seconds` the previous token keeps working that long — rotate with a grace window and redeploy your apps before it closes, or every query they run dies at the instant of rotation.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "serverless:keys",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "grace-seconds",
        "key": "grace_seconds",
        "in": "body",
        "type": "number",
        "required": false,
        "description": "How long the previous token stays valid after the rotation, in seconds (up to 7 days). With `0` it dies immediately."
      }
    ]
  },
  {
    "path": [
      "serverless",
      "db",
      "usage"
    ],
    "operationId": "serverless.db.usage.get",
    "summary": "Get the DB period's usage and billable line",
    "description": "Rows read/written and the storage peak against the plan for the period, the overage, the total in USD, and the daily series. `exec` (multi-statement DDL) does not report rows and is not metered, same as D1.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "serverless:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "period",
        "key": "period",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "days",
        "key": "days",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "serverless",
      "functions",
      "get"
    ],
    "operationId": "serverless.functions.get",
    "summary": "Get the account's Serverless Functions",
    "description": "It takes no id: there is one Functions tenant per account. Returns the plan, its limits, how many functions are deployed, and the month's invocations. Deploys and invocations go through the service's data plane, not this API.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "serverless:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "serverless",
      "functions",
      "key",
      "rotate"
    ],
    "operationId": "serverless.functions.keys.rotate",
    "summary": "Rotate the Functions token",
    "description": "Issues a new `fnt_…` token and returns it, exactly once. With `grace_seconds` the previous token keeps working that long. Deployed functions keep serving through a rotation — the token only authenticates deploys and management, not the public invocation URLs.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "serverless:keys",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "grace-seconds",
        "key": "grace_seconds",
        "in": "body",
        "type": "number",
        "required": false,
        "description": "How long the previous token stays valid after the rotation, in seconds (up to 7 days). With `0` it dies immediately."
      }
    ]
  },
  {
    "path": [
      "serverless",
      "functions",
      "usage"
    ],
    "operationId": "serverless.functions.usage.get",
    "summary": "Get the Functions period's usage and billable line",
    "description": "Invocations, errors and total execution time against the plan for the period, the overage, the total in USD, and the daily series.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "serverless:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "period",
        "key": "period",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "days",
        "key": "days",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "serverless",
      "kv",
      "get"
    ],
    "operationId": "serverless.kv.get",
    "summary": "Get the account's Serverless KV",
    "description": "It takes no id: there is one KV tenant per account. Returns the plan, its limits, and the month's usage. If the account does not have the service, it returns 404.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "serverless:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "serverless",
      "kv",
      "key",
      "create"
    ],
    "operationId": "serverless.kv.keys.create",
    "summary": "Create an additional KV token",
    "description": "Mints a new `kvt_…` token **without invalidating the existing ones** — KV is the only primitive that supports several live tokens per tenant (one per app or environment). The token is returned exactly once: only its hash is stored.\n\nIt does not work against this API: it authenticates the data plane at `{api_endpoint}/v1/ns/…`. It requires `serverless:keys` because holding it **is** the ability to read, write and bill against the account's tenant.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "serverless:keys",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "serverless",
      "kv",
      "key",
      "rotate"
    ],
    "operationId": "serverless.kv.keys.rotate",
    "summary": "Rotate the KV tokens",
    "description": "Issues a new token and returns it. **All** previous tokens of the tenant are affected: with `grace_seconds` they keep working that long; with `0` (the default) they die immediately. There is no going back.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "serverless:keys",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "grace-seconds",
        "key": "grace_seconds",
        "in": "body",
        "type": "number",
        "required": false,
        "description": "How long the previous token stays valid after the rotation, in seconds (up to 7 days). With `0` it dies immediately."
      }
    ]
  },
  {
    "path": [
      "serverless",
      "kv",
      "usage"
    ],
    "operationId": "serverless.kv.usage.get",
    "summary": "Get the KV period's usage and billable line",
    "description": "Reads, writes and the storage peak against the plan for the period, the overage, the total in USD, and the daily series. On a hard-capped plan (`included.hard_cap`) the overage is never billed: the service stops at the quota instead.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "serverless:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "period",
        "key": "period",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "days",
        "key": "days",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "services",
      "get"
    ],
    "operationId": "services.get",
    "summary": "Get a service",
    "description": "A 404 here means both \"does not exist\" and \"exists but this credential cannot see it\". That is deliberate: a 403 would confirm the service's existence and turn the API into an enumeration oracle.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "services:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "services",
      "list"
    ],
    "operationId": "services.list",
    "summary": "List the services in the account",
    "description": "Returns only the services this credential can see: the key's allowlist and the owning user's per-service permissions both apply. It is the entry point for obtaining the `service_id` values used by every other resource.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "services:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "family",
        "key": "family",
        "in": "query",
        "type": "string",
        "required": false,
        "values": [
          "vps",
          "dns",
          "dbaas",
          "caas",
          "lb",
          "objectstorage",
          "mailgateway",
          "images",
          "serverless",
          "wordpress",
          "other"
        ]
      }
    ]
  },
  {
    "path": [
      "vps",
      "backup",
      "create"
    ],
    "operationId": "vps.backups.create",
    "summary": "Create a backup",
    "description": "Queues a `vzdump`. With `mode: snapshot` (the default) the machine keeps running. The operation reflects that the task was queued, not that the archive is ready: the final size appears in `GET /v1/vps/{id}/backups` once the hypervisor finishes.",
    "danger": "reversible",
    "longRunning": true,
    "deprecated": false,
    "scope": "vps:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "compress",
        "key": "compress",
        "in": "body",
        "type": "string",
        "required": false,
        "values": [
          "zstd",
          "gzip",
          "lzo",
          "none"
        ]
      },
      {
        "flag": "mode",
        "key": "mode",
        "in": "body",
        "type": "string",
        "required": false,
        "values": [
          "snapshot",
          "suspend",
          "stop"
        ],
        "description": "`snapshot` does not interrupt the service. `stop` powers off the VM during the backup."
      },
      {
        "flag": "storage",
        "key": "storage",
        "in": "body",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "vps",
      "backup",
      "delete"
    ],
    "operationId": "vps.backups.delete",
    "summary": "Delete a backup",
    "description": "",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "vps:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "backup_id",
        "in": "path",
        "key": "backup_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "vps",
      "backup",
      "list"
    ],
    "operationId": "vps.backups.list",
    "summary": "List the VPS backups",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "vps:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "vps",
      "backup",
      "restore"
    ],
    "operationId": "vps.backups.restore",
    "summary": "Restore a backup",
    "description": "**Destructive.** Powers off the machine and overwrites the entire disk: everything written after that backup is lost. The backend verifies the backup belongs to this VPS before touching anything.",
    "danger": "destructive",
    "longRunning": true,
    "deprecated": false,
    "scope": "vps:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "backup_id",
        "in": "path",
        "key": "backup_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "vps",
      "config"
    ],
    "operationId": "vps.config.get",
    "summary": "Get the machine configuration",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "vps:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "vps",
      "console"
    ],
    "operationId": "vps.console.create",
    "summary": "Open a console",
    "description": "Issues a single-use ticket. **It grants full access to the operating system**, bypassing the network and SSH, which is why it lives in its own scope (`vps:console`) instead of falling under `vps:write`. Do not log it: the SPICE `file` carries the password inside.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "vps:console",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "type",
        "key": "type",
        "in": "body",
        "type": "string",
        "required": false,
        "values": [
          "vnc",
          "spice"
        ]
      }
    ]
  },
  {
    "path": [
      "vps",
      "get"
    ],
    "operationId": "vps.get",
    "summary": "Get a VPS with its live state",
    "description": "Queries the hypervisor. If it does not respond, the state fields come back `null` instead of failing: a hypervisor hiccup should not stop you from reading the rest of the resource or its `capabilities`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "vps:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "vps",
      "ip",
      "list"
    ],
    "operationId": "vps.ips.list",
    "summary": "List the IPs assigned to the VPS",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "vps:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "vps",
      "list"
    ],
    "operationId": "vps.list",
    "summary": "List VPS instances",
    "description": "Served from the database, without querying the hypervisor: `state`, `cpu`, `memory`, and `disk` come back `null`. Fetching them would cost one backend call per page item. For the live state of one instance, use `GET /v1/vps/{id}`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "vps:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "vps",
      "stats"
    ],
    "operationId": "vps.metrics.list",
    "summary": "Get CPU, memory, disk, and network usage series",
    "description": "The hypervisor's RRD series. Resolution is set by `timeframe` and is not configurable: `hour` yields minutes, `year` yields weeks. `cpu_percent` is a percentage of the allocated total.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "vps:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "timeframe",
        "key": "timeframe",
        "in": "query",
        "type": "string",
        "required": false,
        "values": [
          "hour",
          "day",
          "week",
          "month",
          "year"
        ]
      }
    ]
  },
  {
    "path": [
      "vps",
      "power"
    ],
    "operationId": "vps.power",
    "summary": "Start, stop, or reboot",
    "description": "Returns `202` as soon as the order is issued, not when the machine reaches the requested state. The operation resolves against the **VM's actual state**, so it survives the backend taking longer than the HTTP timeout — a `reboot` is stop, wait, and start, which does not fit in one request. Wait on it with `GET /v1/operations/{id}`.",
    "danger": "reversible",
    "longRunning": true,
    "deprecated": false,
    "scope": "vps:power",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "action",
        "in": "body",
        "key": "action",
        "required": true,
        "type": "string",
        "values": [
          "start",
          "stop",
          "shutdown",
          "reboot"
        ],
        "description": "`shutdown` asks the operating system for an orderly shutdown and falls back to a hard cut if it does not respond. `stop` cuts power immediately: it can corrupt the filesystem."
      }
    ],
    "flags": []
  },
  {
    "path": [
      "vps",
      "reinstall"
    ],
    "operationId": "vps.reinstall",
    "summary": "Reinstall the operating system",
    "description": "**Destructive and irreversible: it wipes the entire disk.** Queues a job that runs the same state machine as a fresh provision (provision → wait for boot → health check), so the operation reports real progress and can take several minutes. The IP is preserved.",
    "danger": "destructive",
    "longRunning": true,
    "deprecated": false,
    "scope": "vps:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "template",
        "key": "template",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "An `id` from `GET /v1/vps/{id}/templates`."
      },
      {
        "flag": "root-password",
        "key": "root_password",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "The new system's root password. Never stored or returned: if it is lost, the only way out is another reinstall."
      }
    ]
  },
  {
    "path": [
      "vps",
      "template",
      "list"
    ],
    "operationId": "vps.templates.list",
    "summary": "List the operating systems available for reinstall",
    "description": "Depends on the machine type and the node it lives on, so it is requested per VPS rather than globally.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "vps:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "vps",
      "rename"
    ],
    "operationId": "vps.update",
    "summary": "Rename a VPS",
    "description": "Changes the operating system hostname. On LXC it takes effect immediately; on KVM it renames the VM and the operating system picks it up on the next reboot.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "vps:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "hostname",
        "key": "hostname",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "A plain label or an FQDN. The backend validates the format."
      }
    ]
  },
  {
    "path": [
      "webhooks",
      "create"
    ],
    "operationId": "webhooks.create",
    "summary": "Register a webhook",
    "description": "The response includes `secret` **once**. Verify every delivery with it: `Truo-Signature: t=<unix>,v1=<hex HMAC-SHA256(secret, \"<t>.<raw body>\")>`, and reject timestamps older than 5 minutes. The URL must be `https` and publicly reachable. Up to 10 webhooks per account.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "account:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "url",
        "key": "url",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "Must be `https` and reachable from the public internet (no private or loopback addresses)."
      },
      {
        "flag": "events",
        "key": "events",
        "in": "body",
        "type": "string[]",
        "required": true
      },
      {
        "flag": "description",
        "key": "description",
        "in": "body",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "webhooks",
      "delete"
    ],
    "operationId": "webhooks.delete",
    "summary": "Delete a webhook",
    "description": "Pending deliveries to it are dropped.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "account:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "webhook_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "webhooks",
      "delivery"
    ],
    "operationId": "webhooks.deliveries.get",
    "summary": "Get a delivery",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "account:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "webhook_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "delivery_id",
        "in": "path",
        "key": "delivery_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "webhooks",
      "deliveries"
    ],
    "operationId": "webhooks.deliveries.list",
    "summary": "List a webhook's deliveries",
    "description": "Newest first, with the exact signed body of each. This is where to look when a receiver disagrees.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "account:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "webhook_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "webhooks",
      "redeliver"
    ],
    "operationId": "webhooks.deliveries.redeliver",
    "summary": "Send a delivery again",
    "description": "Re-queues a `delivered` or `failed` delivery with the same body (and a fresh signature).",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "account:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "webhook_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "delivery_id",
        "in": "path",
        "key": "delivery_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "webhooks",
      "get"
    ],
    "operationId": "webhooks.get",
    "summary": "Get a webhook",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "account:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "webhook_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "webhooks",
      "list"
    ],
    "operationId": "webhooks.list",
    "summary": "List the account's webhooks",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "account:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "webhooks",
      "ping"
    ],
    "operationId": "webhooks.ping",
    "summary": "Send a test event",
    "description": "Queues a `webhook.ping` delivery to this webhook only, regardless of its subscriptions. Follow it in `GET /v1/webhooks/{id}/deliveries`.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "account:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "webhook_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "webhooks",
      "rotate-secret"
    ],
    "operationId": "webhooks.rotate_secret",
    "summary": "Rotate a webhook's signing secret",
    "description": "The old secret stops working immediately. Deliveries already in flight were signed with it.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "account:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "webhook_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "webhooks",
      "update"
    ],
    "operationId": "webhooks.update",
    "summary": "Update a webhook",
    "description": "",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "account:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "webhook_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "url",
        "key": "url",
        "in": "body",
        "type": "string",
        "required": false
      },
      {
        "flag": "events",
        "key": "events",
        "in": "body",
        "type": "string[]",
        "required": false
      },
      {
        "flag": "description",
        "key": "description",
        "in": "body",
        "type": "string",
        "required": false
      },
      {
        "flag": "enabled",
        "key": "enabled",
        "in": "body",
        "type": "boolean",
        "required": false,
        "description": "Re-enabling resets `consecutive_failures`."
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "autologin"
    ],
    "operationId": "wordpress.autologin",
    "summary": "Get a one-time login URL to wp-admin",
    "description": "Logs in as the first administrator without a password. **Single use, short-lived** (`expires_in_seconds`). It is a POST because the URL is a credential: it is not cached, not replayed by `Idempotency-Key`, and it enters the audit log. Requires `wordpress:console`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:console",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "backup",
      "create"
    ],
    "operationId": "wordpress.backups.create",
    "summary": "Create a backup now",
    "description": "Database and files. Counts against the daily manual-backup allowance of the plan (`429 rate_limited` when exceeded) and its storage quota (`429 quota_exceeded`). One at a time per site (`409`). The operation carries the `backup_id` in `result`.",
    "danger": "none",
    "longRunning": true,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "backup",
      "delete"
    ],
    "operationId": "wordpress.backups.delete",
    "summary": "Delete a backup",
    "description": "**Irreversible.** Scheduled backups are also pruned by the retention policy; you rarely need this.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "backup_id",
        "in": "path",
        "key": "backup_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "backup",
      "download"
    ],
    "operationId": "wordpress.backups.download",
    "summary": "Get a temporary download URL for a backup",
    "description": "The archive may have to be rebuilt from cold storage first, which can take a minute. It is a POST because the URL is a credential: it is not cached and it enters the audit log.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "backup_id",
        "in": "path",
        "key": "backup_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "backup",
      "list"
    ],
    "operationId": "wordpress.backups.list",
    "summary": "List the site's backups",
    "description": "Newest first. Scheduled and manual ones, wherever they are stored.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "backup",
      "restore"
    ],
    "operationId": "wordpress.backups.restore",
    "summary": "Restore a backup",
    "description": "**Destructive**: overwrites the database and the files with the backup. Everything changed since it was taken is lost. Take a fresh backup first if in doubt.",
    "danger": "destructive",
    "longRunning": true,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "backup_id",
        "in": "path",
        "key": "backup_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "backup",
      "settings",
      "get"
    ],
    "operationId": "wordpress.backups.settings.get",
    "summary": "Get the backup schedule",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "backup",
      "settings",
      "set"
    ],
    "operationId": "wordpress.backups.settings.update",
    "summary": "Change the backup schedule",
    "description": "`retention_days` is clamped to the range the plan allows; the response shows what was applied.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "enabled",
        "key": "enabled",
        "in": "body",
        "type": "boolean",
        "required": true
      },
      {
        "flag": "frequency",
        "key": "frequency",
        "in": "body",
        "type": "string",
        "required": true,
        "values": [
          "daily",
          "weekly",
          "monthly"
        ]
      },
      {
        "flag": "retention-days",
        "key": "retention_days",
        "in": "body",
        "type": "number",
        "required": true,
        "description": "Clamped by the node to its allowed range (see `policy`)."
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "cache",
      "flush"
    ],
    "operationId": "wordpress.cache.flush",
    "summary": "Flush every cache",
    "description": "Object cache (Redis), page cache and the CDN edge if enabled. Harmless: the caches rebuild on the next visits.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "cdn",
      "disable"
    ],
    "operationId": "wordpress.cdn.disable",
    "summary": "Disable the media CDN",
    "description": "",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "cdn",
      "enable"
    ],
    "operationId": "wordpress.cdn.enable",
    "summary": "Enable the media CDN",
    "description": "Serves uploads from the edge with on-the-fly image optimization. Media URLs are rewritten on the frontend only.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "cdn",
      "get"
    ],
    "operationId": "wordpress.cdn.get",
    "summary": "Get the CDN state",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "cdn",
      "purge"
    ],
    "operationId": "wordpress.cdn.purge",
    "summary": "Purge the CDN cache",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "cloudflare",
      "disable"
    ],
    "operationId": "wordpress.cloudflare.disable",
    "summary": "Take your custom domains off Cloudflare",
    "description": "Removes the Cloudflare hostnames and goes back to per-domain certificates. Point your DNS at the site again.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "cloudflare",
      "enable"
    ],
    "operationId": "wordpress.cloudflare.enable",
    "summary": "Put your custom domains behind Cloudflare",
    "description": "Registers each custom domain with Cloudflare and switches its certificate. The operation `result` lists, per domain, the DNS records to publish. Until they resolve, the domain keeps working as before.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "cloudflare",
      "get"
    ],
    "operationId": "wordpress.cloudflare.get",
    "summary": "Get the Cloudflare state of every domain",
    "description": "Whether your custom domains go through Cloudflare (edge cache, DDoS protection, managed certificates) and the per-domain status. Only on sites whose `capabilities.cloudflare` is true.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "cloudflare",
      "records"
    ],
    "operationId": "wordpress.cloudflare.records.get",
    "summary": "Get the DNS records a Cloudflare-enabled domain needs",
    "description": "Re-fetches the records and the current verification status from Cloudflare. Use it to check progress after publishing them.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "domain",
        "key": "domain",
        "in": "query",
        "type": "string",
        "required": true
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "core",
      "update"
    ],
    "operationId": "wordpress.core.updates.apply",
    "summary": "Update WordPress core",
    "description": "Updates to the latest version WordPress offers and runs the database upgrade. Take a backup first.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "core",
      "updates"
    ],
    "operationId": "wordpress.core.updates.list",
    "summary": "Check for WordPress core updates",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "cron",
      "delete"
    ],
    "operationId": "wordpress.cron.delete",
    "summary": "Unschedule a WP-Cron event",
    "description": "Removes every scheduled occurrence of the hook. A plugin may schedule it again.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "hook",
        "in": "path",
        "key": "hook",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "cron",
      "list"
    ],
    "operationId": "wordpress.cron.list",
    "summary": "List scheduled WP-Cron events",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "cron",
      "run"
    ],
    "operationId": "wordpress.cron.run",
    "summary": "Run a WP-Cron event now",
    "description": "",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "hook",
        "in": "path",
        "key": "hook",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "domain",
      "add"
    ],
    "operationId": "wordpress.domains.add",
    "summary": "Add a custom domain",
    "description": "Registers the domain, requests its certificate and — if it is the first custom domain — makes it the primary and rewrites the site URLs. The response says which DNS records to publish. By default the request fails if the domain does not point here yet; pass `force` to add it first and configure DNS afterwards.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "domain",
        "key": "domain",
        "in": "body",
        "type": "string",
        "required": true
      },
      {
        "flag": "force",
        "key": "force",
        "in": "body",
        "type": "boolean",
        "required": false,
        "description": "Skip the DNS pre-flight. By default the request fails with `validation_failed` if the domain does not point here yet; with `force` it is added and you configure DNS afterwards."
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "domain",
      "delete"
    ],
    "operationId": "wordpress.domains.delete",
    "summary": "Remove a custom domain",
    "description": "The site stops answering on it. Its certificate is dropped. The platform hostname cannot be removed.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "domain_id",
        "in": "path",
        "key": "domain_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "domain",
      "list"
    ],
    "operationId": "wordpress.domains.list",
    "summary": "List the site's domains",
    "description": "Includes the platform hostname the site was born with and every custom domain you added.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "domain",
      "set-primary"
    ],
    "operationId": "wordpress.domains.set_primary",
    "summary": "Make a domain the primary",
    "description": "Rewrites `siteurl`/`home` and every URL in the database. An apex becomes `www.`: that is the canonical form.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "domain_id",
        "in": "path",
        "key": "domain_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "domain",
      "retry-ssl"
    ],
    "operationId": "wordpress.domains.ssl.retry",
    "summary": "Retry certificate issuance for every domain",
    "description": "Clears failed certificate attempts and asks for them again. Use it after fixing DNS. Let's Encrypt allows 5 failures per hour per domain: do not loop on this.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "domain",
      "verify"
    ],
    "operationId": "wordpress.domains.verify",
    "summary": "Check a domain's DNS",
    "description": "Resolves the domain (and `www.` for an apex) and says whether it points here, or why not.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "domain_id",
        "in": "path",
        "key": "domain_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "email",
      "get"
    ],
    "operationId": "wordpress.email.get",
    "summary": "Get how the site sends email",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "email",
      "log"
    ],
    "operationId": "wordpress.email.log",
    "summary": "List recently sent emails",
    "description": "What `wp_mail()` sent in the last 7 days: recipient, subject and method. No bodies.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "email",
      "test"
    ],
    "operationId": "wordpress.email.test",
    "summary": "Send a test email",
    "description": "Sends through the site's own mailer. `result.sent` says whether `wp_mail()` succeeded; a `false` is the diagnosis, not an error.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "to",
        "key": "to",
        "in": "body",
        "type": "string",
        "required": true
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "get"
    ],
    "operationId": "wordpress.get",
    "summary": "Get a WordPress site with its live state",
    "description": "Queries the node. If it does not respond, `live` comes back `null` instead of failing: a node hiccup should not stop you from reading the rest of the resource or its `capabilities`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "list"
    ],
    "operationId": "wordpress.list",
    "summary": "List WordPress sites",
    "description": "Served from the database, without querying the node: `live` comes back `null`. Fetching it would cost one backend call per page item. For the live state of one site, use `GET /v1/wordpress/{id}`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "logs"
    ],
    "operationId": "wordpress.logs.get",
    "summary": "Get a log's last lines",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "type",
        "key": "type",
        "in": "query",
        "type": "string",
        "required": false,
        "values": [
          "runtime",
          "error",
          "access",
          "server",
          "php"
        ]
      },
      {
        "flag": "lines",
        "key": "lines",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "pagespeed"
    ],
    "operationId": "wordpress.monitoring.pagespeed",
    "summary": "Run PageSpeed Insights",
    "description": "Runs Google PageSpeed Insights live for mobile and desktop: 10–30 s. Core Web Vitals included.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "recovery"
    ],
    "operationId": "wordpress.monitoring.recovery",
    "summary": "Get the auto-recovery state and history",
    "description": "The platform watches every site and repairs the common failures on its own (plugin fatals, stuck services). This is what it did to yours, and whether it gave up (`halted`).",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "days",
        "key": "days",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "php",
      "get"
    ],
    "operationId": "wordpress.php.get",
    "summary": "Get PHP version and settings",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "php",
      "restart"
    ],
    "operationId": "wordpress.php.restart",
    "summary": "Restart PHP",
    "description": "Recycles the PHP workers and reloads the web server. No downtime; in-flight requests finish.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "php",
      "set"
    ],
    "operationId": "wordpress.php.update",
    "summary": "Change PHP settings",
    "description": "Only the provided keys change. PHP reloads gracefully: no downtime.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "memory-limit",
        "key": "memory_limit",
        "in": "body",
        "type": "string",
        "required": false
      },
      {
        "flag": "upload-max-filesize",
        "key": "upload_max_filesize",
        "in": "body",
        "type": "string",
        "required": false
      },
      {
        "flag": "post-max-size",
        "key": "post_max_size",
        "in": "body",
        "type": "string",
        "required": false
      },
      {
        "flag": "max-execution-time",
        "key": "max_execution_time",
        "in": "body",
        "type": "string",
        "required": false
      },
      {
        "flag": "max-input-vars",
        "key": "max_input_vars",
        "in": "body",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "php",
      "version"
    ],
    "operationId": "wordpress.php.version.set",
    "summary": "Change the PHP version",
    "description": "Switches the interpreter and restarts PHP: a few seconds of errors while it comes back. Custom settings carry over.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "version",
        "key": "version",
        "in": "body",
        "type": "string",
        "required": true,
        "values": [
          "8.1",
          "8.2",
          "8.3"
        ]
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "plugin",
      "activate"
    ],
    "operationId": "wordpress.plugins.activate",
    "summary": "Activate a plugin",
    "description": "",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "slug",
        "in": "path",
        "key": "slug",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "plugin",
      "deactivate"
    ],
    "operationId": "wordpress.plugins.deactivate",
    "summary": "Deactivate a plugin",
    "description": "",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "slug",
        "in": "path",
        "key": "slug",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "plugin",
      "delete"
    ],
    "operationId": "wordpress.plugins.delete",
    "summary": "Delete a plugin",
    "description": "Removes its files. Its settings stay in the database, as WordPress does.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "slug",
        "in": "path",
        "key": "slug",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "plugin",
      "install"
    ],
    "operationId": "wordpress.plugins.install",
    "summary": "Install a plugin",
    "description": "From wordpress.org by slug, or from an `https://` zip. Activates it unless `activate` is `false`.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "slug",
        "key": "slug",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "A wordpress.org slug, or an `https://` URL to a zip."
      },
      {
        "flag": "activate",
        "key": "activate",
        "in": "body",
        "type": "boolean",
        "required": false,
        "description": "Plugins default to `true`; themes to `false`."
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "plugin",
      "list"
    ],
    "operationId": "wordpress.plugins.list",
    "summary": "List installed plugins",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "plugin",
      "search"
    ],
    "operationId": "wordpress.plugins.search",
    "summary": "Search wordpress.org for plugins",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "q",
        "key": "q",
        "in": "query",
        "type": "string",
        "required": true
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "plugin",
      "update"
    ],
    "operationId": "wordpress.plugins.update",
    "summary": "Update a plugin",
    "description": "",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "slug",
        "in": "path",
        "key": "slug",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "plugin",
      "update-all"
    ],
    "operationId": "wordpress.plugins.update_all",
    "summary": "Update every plugin with an update available",
    "description": "",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "recipes",
      "apply"
    ],
    "operationId": "wordpress.recipes.apply",
    "summary": "Apply a recipe to a site",
    "description": "Runs the manifest against the site over WP-CLI, in order: requirements → zip checksums → backup → plugins → constants → options → roles → secrets → verify → register. `requires` is checked in this request (`recipe_requirements_unmet`, 412, nothing touched); everything else runs in the background and the operation `result` shows each step. A checksum mismatch fails before the backup with `recipe_checksum_mismatch`; a red `verify` fails with `recipe_verify_failed` and leaves the site as it is — the backup is the way back. On success the site stores `truo_recipe = {name, version, applied_at}` and, if the recipe declares `secrets`, `result.secrets.claim` says where to fetch them once.",
    "danger": "reversible",
    "longRunning": true,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "name",
        "key": "name",
        "in": "body",
        "type": "string",
        "required": true
      },
      {
        "flag": "version",
        "key": "version",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "Default: the latest published version."
      },
      {
        "flag": "backup",
        "key": "backup",
        "in": "body",
        "type": "boolean",
        "required": false,
        "description": "Take a backup before changing anything. Default `true`. It counts against the daily manual-backup allowance."
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "recipes",
      "create"
    ],
    "operationId": "wordpress.recipes.create",
    "summary": "Register a recipe",
    "description": "The body is a `recipe/v1` manifest. It is validated in full before it is stored — limits, allowed constants, and every WP-CLI line it would run — and a problem comes back as `recipe_invalid` with `param` pointing at the field. Zips in `url` are **not** downloaded here; their checksum is verified when the recipe is applied. Max 20 recipes per account.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [],
    "flags": [
      {
        "flag": "api-version",
        "key": "apiVersion",
        "in": "body",
        "type": "string",
        "required": true,
        "values": [
          "recipe/v1"
        ]
      },
      {
        "flag": "name",
        "key": "name",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "Slug, unique per account. Lowercase letters, digits and hyphens."
      },
      {
        "flag": "version",
        "key": "version",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "Semver. Published versions are immutable."
      },
      {
        "flag": "description",
        "key": "description",
        "in": "body",
        "type": "string",
        "required": false
      },
      {
        "flag": "requires",
        "key": "requires",
        "in": "body",
        "type": "json",
        "required": false
      },
      {
        "flag": "plugins",
        "key": "plugins",
        "in": "body",
        "type": "json",
        "required": false,
        "description": "Installed in order. Max 40."
      },
      {
        "flag": "constants",
        "key": "constants",
        "in": "body",
        "type": "json",
        "required": false,
        "description": "`wp config set … --type=constant`. Platform constants (`DB_*`, `WP_HOME`, `WP_SITEURL`, paths) are refused."
      },
      {
        "flag": "options",
        "key": "options",
        "in": "body",
        "type": "json",
        "required": false,
        "description": "`wp option update … --format=json`. Any JSON value; no single quotes, semicolons or backslashes. Max 200."
      },
      {
        "flag": "roles",
        "key": "roles",
        "in": "body",
        "type": "json",
        "required": false
      },
      {
        "flag": "secrets",
        "key": "secrets",
        "in": "body",
        "type": "string[]",
        "required": false,
        "description": "Constant names whose values **we** generate when applying (never in the manifest). Retrieve them once with `wordpress.recipes.secrets.claim` after the operation succeeds."
      },
      {
        "flag": "verify",
        "key": "verify",
        "in": "body",
        "type": "json",
        "required": false,
        "description": "Gate. Any red check fails the operation with `recipe_verify_failed`. Max 10."
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "recipes",
      "delete"
    ],
    "operationId": "wordpress.recipes.delete",
    "summary": "Delete a recipe and all its versions",
    "description": "Sites that already have it applied are not touched.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "name",
        "in": "path",
        "key": "name",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "recipes",
      "get"
    ],
    "operationId": "wordpress.recipes.get",
    "summary": "Get a recipe and its manifest",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "name",
        "in": "path",
        "key": "name",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "version",
        "key": "version",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "recipes",
      "list"
    ],
    "operationId": "wordpress.recipes.list",
    "summary": "List the recipes of this account",
    "description": "Recipes belong to the account, not to a site. Manifests are not included; use `wordpress.recipes.get`.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "recipes",
      "claim-secrets"
    ],
    "operationId": "wordpress.recipes.secrets.claim",
    "summary": "Claim the secrets a recipe generated (once)",
    "description": "Returns the values of the `secrets` a `wordpress.recipes.apply` operation generated for this site, **exactly once**: this response deletes them. They are kept encrypted for 24 hours after the operation succeeds; after that, or after a first claim, this is `not_found`. Store them on your side.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "operation",
        "key": "operation",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "The `wordpress.recipes.apply` operation."
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "recipes",
      "update"
    ],
    "operationId": "wordpress.recipes.update",
    "summary": "Publish a new version of a recipe",
    "description": "The body is a full manifest whose `name` matches the URL and whose `version` is greater than every version already published. Published versions are immutable: a site that reports `truo_recipe = name@1.2.0` always points at the manifest that was applied.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "name",
        "in": "path",
        "key": "name",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "api-version",
        "key": "apiVersion",
        "in": "body",
        "type": "string",
        "required": true,
        "values": [
          "recipe/v1"
        ]
      },
      {
        "flag": "name",
        "key": "name",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "Slug, unique per account. Lowercase letters, digits and hyphens."
      },
      {
        "flag": "version",
        "key": "version",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "Semver. Published versions are immutable."
      },
      {
        "flag": "description",
        "key": "description",
        "in": "body",
        "type": "string",
        "required": false
      },
      {
        "flag": "requires",
        "key": "requires",
        "in": "body",
        "type": "json",
        "required": false
      },
      {
        "flag": "plugins",
        "key": "plugins",
        "in": "body",
        "type": "json",
        "required": false,
        "description": "Installed in order. Max 40."
      },
      {
        "flag": "constants",
        "key": "constants",
        "in": "body",
        "type": "json",
        "required": false,
        "description": "`wp config set … --type=constant`. Platform constants (`DB_*`, `WP_HOME`, `WP_SITEURL`, paths) are refused."
      },
      {
        "flag": "options",
        "key": "options",
        "in": "body",
        "type": "json",
        "required": false,
        "description": "`wp option update … --format=json`. Any JSON value; no single quotes, semicolons or backslashes. Max 200."
      },
      {
        "flag": "roles",
        "key": "roles",
        "in": "body",
        "type": "json",
        "required": false
      },
      {
        "flag": "secrets",
        "key": "secrets",
        "in": "body",
        "type": "string[]",
        "required": false,
        "description": "Constant names whose values **we** generate when applying (never in the manifest). Retrieve them once with `wordpress.recipes.secrets.claim` after the operation succeeds."
      },
      {
        "flag": "verify",
        "key": "verify",
        "in": "body",
        "type": "json",
        "required": false,
        "description": "Gate. Any red check fails the operation with `recipe_verify_failed`. Max 10."
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "restart"
    ],
    "operationId": "wordpress.restart",
    "summary": "Restart the site",
    "description": "Restarts the whole site (web server, PHP, database, cache): ~30 s of downtime. To reload PHP alone without downtime use `POST /v1/wordpress/{id}/php/restart`.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "security",
      "unblock"
    ],
    "operationId": "wordpress.security.blocked_ips.delete",
    "summary": "Lift a lockout",
    "description": "",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "ip_id",
        "in": "path",
        "key": "ip_id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "security",
      "blocked-ips"
    ],
    "operationId": "wordpress.security.blocked_ips.list",
    "summary": "List IPs locked out for failed logins",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "security",
      "get"
    ],
    "operationId": "wordpress.security.get",
    "summary": "Get the security status",
    "description": "Login protection counters and the result of the last integrity scan (core and wordpress.org plugins against official checksums).",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "security",
      "scan"
    ],
    "operationId": "wordpress.security.scan",
    "summary": "Run an integrity scan now",
    "description": "Verifies core and wordpress.org plugins against their official checksums. The findings come in the operation `result`.",
    "danger": "none",
    "longRunning": true,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "staging",
      "create"
    ],
    "operationId": "wordpress.staging.create",
    "summary": "Create a staging environment",
    "description": "A full copy of the site (database and files) on its own URL, with fixed resources. Takes a minute or two. The operation carries the clone in `result`.",
    "danger": "reversible",
    "longRunning": true,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "name",
        "key": "name",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "Defaults to `staging`. A site can have several clones."
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "staging",
      "delete"
    ],
    "operationId": "wordpress.staging.delete",
    "summary": "Delete a staging environment",
    "description": "**Irreversible**: the clone and its data are removed. Production is not touched.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "name",
        "in": "path",
        "key": "name",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "staging",
      "list"
    ],
    "operationId": "wordpress.staging.list",
    "summary": "List staging environments",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "staging",
      "push"
    ],
    "operationId": "wordpress.staging.push",
    "summary": "Push a staging environment to production",
    "description": "**Destructive**: copies the database and/or the files of the clone OVER the live site. Take a backup of production first.",
    "danger": "destructive",
    "longRunning": true,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "name",
        "in": "path",
        "key": "name",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "database",
        "key": "database",
        "in": "body",
        "type": "boolean",
        "required": false,
        "description": "Copy the database. Defaults to `true`."
      },
      {
        "flag": "files",
        "key": "files",
        "in": "body",
        "type": "boolean",
        "required": false,
        "description": "Copy the files. Defaults to `true`."
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "status"
    ],
    "operationId": "wordpress.status",
    "summary": "Get runtime state, health and resource usage",
    "description": "Health (installed, database reachable, pending updates) comes from a check the node runs every 15 minutes: `checked_at` says when. Resource usage is measured for this request.",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "theme",
      "activate"
    ],
    "operationId": "wordpress.themes.activate",
    "summary": "Activate a theme",
    "description": "",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "slug",
        "in": "path",
        "key": "slug",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "theme",
      "delete"
    ],
    "operationId": "wordpress.themes.delete",
    "summary": "Delete a theme",
    "description": "The active theme cannot be deleted: activate another one first.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "slug",
        "in": "path",
        "key": "slug",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "theme",
      "install"
    ],
    "operationId": "wordpress.themes.install",
    "summary": "Install a theme",
    "description": "From wordpress.org by slug, or from an `https://` zip. Does not activate it unless `activate` is `true`.",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "slug",
        "key": "slug",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "A wordpress.org slug, or an `https://` URL to a zip."
      },
      {
        "flag": "activate",
        "key": "activate",
        "in": "body",
        "type": "boolean",
        "required": false,
        "description": "Plugins default to `true`; themes to `false`."
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "theme",
      "list"
    ],
    "operationId": "wordpress.themes.list",
    "summary": "List installed themes",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "limit",
        "key": "limit",
        "in": "query",
        "type": "string",
        "required": false
      },
      {
        "flag": "cursor",
        "key": "cursor",
        "in": "query",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "theme",
      "search"
    ],
    "operationId": "wordpress.themes.search",
    "summary": "Search wordpress.org for themes",
    "description": "",
    "danger": "none",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:read",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "q",
        "key": "q",
        "in": "query",
        "type": "string",
        "required": true
      }
    ]
  },
  {
    "path": [
      "wordpress",
      "theme",
      "update"
    ],
    "operationId": "wordpress.themes.update",
    "summary": "Update a theme",
    "description": "",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      },
      {
        "label": "slug",
        "in": "path",
        "key": "slug",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "theme",
      "update-all"
    ],
    "operationId": "wordpress.themes.update_all",
    "summary": "Update every theme with an update available",
    "description": "",
    "danger": "reversible",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:write",
    "bodyRequired": false,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": []
  },
  {
    "path": [
      "wordpress",
      "wp-cli"
    ],
    "operationId": "wordpress.wpcli.run",
    "summary": "Run a WP-CLI command",
    "description": "Runs `wp <command> <args…>` inside the site and returns `exit_code`, `output` and `error` in the operation `result` (output capped at 64 KB, `truncated: true` past it). A non-zero exit code is the command's result, not an API error. Only an allowlist of subcommands runs: no `eval`, no `shell`, no free-form `db query`, no global flags that change where it runs. Requires `wordpress:console`: WP-CLI is full access to the site and its database.",
    "danger": "destructive",
    "longRunning": false,
    "deprecated": false,
    "scope": "wordpress:console",
    "bodyRequired": true,
    "freeformBody": false,
    "positionals": [
      {
        "label": "service_id",
        "in": "path",
        "key": "id",
        "required": true
      }
    ],
    "flags": [
      {
        "flag": "command",
        "key": "command",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "The WP-CLI subcommand, without the leading `wp`. Allowed: cache, cap, comment, config, core, cron, db, language, maintenance-mode, media, menu, option, plugin, post, redis, rewrite, role, search-replace, sidebar, taxonomy, term, theme, transient, user, widget."
      },
      {
        "flag": "args",
        "key": "args",
        "in": "body",
        "type": "string[]",
        "required": false,
        "description": "Extra arguments, one per element. Quoted for you."
      }
    ]
  }
];

/** Indexed by `truo <a> <b>`, which is how the dispatcher looks them up. */
export const COMMANDS_BY_PATH: Record<string, CommandSpec> = Object.fromEntries(
  COMMANDS.map((c) => [c.path.join(" "), c]),
);
