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

/** The 100 commands derived from the spec. */
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
  }
];

/** Indexed by `truo <a> <b>`, which is how the dispatcher looks them up. */
export const COMMANDS_BY_PATH: Record<string, CommandSpec> = Object.fromEntries(
  COMMANDS.map((c) => [c.path.join(" "), c]),
);
