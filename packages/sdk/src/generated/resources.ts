// ─────────────────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit by hand.
//
// It comes from packages/openapi/openapi/v1.json via packages/codegen.
// To change it: change the handler in the API (the Zod schemas are the source
// of truth), regenerate the spec there, 'bun run sync:spec' here, then 'bun run gen'.
// ─────────────────────────────────────────────────────────────────────────────

import type * as T from "./types.ts";
import type { Call, Paginate, RequestOptions } from "../types.ts";

/**
 * Builds the client's resource tree on top of a transport.
 *
 * Every method is one line: it resolves the `operationId`, assembles path/query/body
 * and delegates. All the real logic — retries, idempotency, errors, cursor — lives in
 * the transport, not here, so regenerating this file can never break it.
 */
export function createResources(call: Call, paginate: Paginate) {
  return {
    account: {
      /**
       * Get the current account and credential
       * 
       * Scope: `account:read`
       */
      get: (params?: RequestOptions) =>
        call<T.Account>("account.get", { path: undefined, body: undefined, queryKeys: undefined, params }),
    },
    apiKeys: {
      /**
       * Create an API key
       * Returns the plaintext token **exactly once**. Store it immediately: only its SHA-256 hash is kept and there is no way to recover it later.
       * 
       * Scope: `apikeys:write`
       */
      create: (body?: T.ApiKeyCreate, params?: RequestOptions) =>
        call<T.ApiKeyCreated>("apiKeys.create", { path: undefined, body: body, queryKeys: undefined, params }),
      /**
       * Get an API key
       * 
       * Scope: `apikeys:read`
       */
      get: (id: string, params?: RequestOptions) =>
        call<T.ApiKey>("apiKeys.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      /**
       * List the API keys in the account
       * Session only. Never returns tokens: only the prefix and last 4 characters.
       * 
       * Scope: `apikeys:read`
       */
      list: (params?: T.ApiKeysListQuery & RequestOptions) =>
        call<T.ApiKeyList>("apiKeys.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
      /**
       * Iterates **all** pages of `apiKeys.list`, following the cursor on its own.
       * A `for await` over this never drops results by forgetting `next_cursor`.
       */
      listAll: (params?: T.ApiKeysListQuery & RequestOptions) =>
        paginate<T.ApiKey>(
          "apiKeys.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
        ),
      /**
       * Revoke an API key
       * Irreversible. Revocation propagates to all replicas over pub/sub in under a second; the worst case, with Redis down, is 60 seconds (the in-process cache TTL).
       * 
       * Scope: `apikeys:write`
       * **Destructive: there is no undo.**
       */
      revoke: (id: string, params?: RequestOptions) =>
        call<T.ApiKey>("apiKeys.revoke", { path: { id }, body: undefined, queryKeys: undefined, params }),
      /**
       * Update an API key
       * Scopes and the allowlist can only be **narrowed**. Widening returns 403: without that rule, a key with `vps:read` could promote itself to `vps:write` with a PATCH and scopes would stop meaning anything.
       * 
       * Scope: `apikeys:write`
       */
      update: (id: string, body?: T.ApiKeyUpdate, params?: RequestOptions) =>
        call<T.ApiKey>("apiKeys.update", { path: { id }, body: body, queryKeys: undefined, params }),
    },
    auditLogs: {
      /**
       * List the account's API activity
       * Includes **denied** attempts (4xx), not just what succeeded: a credential probing endpoints it should not touch is exactly the signal you need to be able to see.
       * 
       * Scope: `audit:read`
       */
      list: (params?: T.AuditLogsListQuery & RequestOptions) =>
        call<T.AuditLogList>("auditLogs.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor", "status", "deniedOnly"], params }),
      /**
       * Iterates **all** pages of `auditLogs.list`, following the cursor on its own.
       * A `for await` over this never drops results by forgetting `next_cursor`.
       */
      listAll: (params?: T.AuditLogsListQuery & RequestOptions) =>
        paginate<T.AuditLog>(
          "auditLogs.list", { path: undefined, queryKeys: ["limit", "cursor", "status", "deniedOnly"], params },
        ),
    },
    caas: {
      apps: {
        /**
         * Create an app
         * Creates the app and configures its source, but **does not deploy it**: it stays `idle` until you call `POST /v1/caas/{id}/apps/{app_id}/deploy`. Separating the two is what lets you create the app, load its variables, and only then deploy — the reverse order would start the application without its configuration.
         * 
         * Scope: `caas:write`
         */
        create: (id: string, body: T.CaasAppsCreateBody, params?: RequestOptions) =>
          call<T.CaasApp>("caas.apps.create", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * Delete an app
         * **Destructive.** Deletes the app, its variables, and its domains. The service's database data is untouched: it lives separately.
         * 
         * Scope: `caas:write`
         * **Destructive: there is no undo.**
         */
        delete: (id: string, appId: string, params?: RequestOptions) =>
          call<void>("caas.apps.delete", { path: { id, app_id: appId }, body: undefined, queryKeys: undefined, params }),
        /**
         * Deploy an app
         * Returns `202` as soon as the deployment starts. The operation resolves by looking up that deployment in the app's history, the only place the backend reports its outcome. Wait on it with `GET /v1/operations/{id}`; failure details are in `GET /v1/caas/{id}/apps/{app_id}/logs`.
         * 
         * It lives in its own scope (`caas:deploy`) because deploying executes whatever code is in the configured source — which is different from editing the app's configuration.
         * 
         * Scope: `caas:deploy`
         * Returns an asynchronous operation; await it with `operations.wait()`.
         */
        deploy: (id: string, appId: string, params?: RequestOptions) =>
          call<T.Operation>("caas.apps.deploy", { path: { id, app_id: appId }, body: undefined, queryKeys: undefined, params }),
        /**
         * Get an app
         * Returns **only** the declared fields. The backend responds with the deployment engine's full internal object —including plaintext environment variables—; none of that leaves through here. For variable names, use `GET /v1/caas/{id}/apps/{app_id}/env`.
         * 
         * Scope: `caas:read`
         */
        get: (id: string, appId: string, params?: RequestOptions) =>
          call<T.CaasApp>("caas.apps.get", { path: { id, app_id: appId }, body: undefined, queryKeys: undefined, params }),
        /**
         * List the service's apps
         * `source` comes back `null`: the backend does not include it in the listing.
         * 
         * Scope: `caas:read`
         */
        list: (id: string, params?: T.CaasAppsListQuery & RequestOptions) =>
          call<T.CaasAppList>("caas.apps.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `caas.apps.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: T.CaasAppsListQuery & RequestOptions) =>
          paginate<T.CaasApp>(
            "caas.apps.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Get an app's logs
         * **A snapshot, not a stream.** Returns whatever the backend has at call time, and there is no way to ask for "what came after": the backend accepts a cursor but never emits the next one, so this endpoint publishes none. To follow an application live, call again.
         * 
         * Scope: `caas:read`
         */
        logs: (id: string, appId: string, params?: RequestOptions) =>
          call<T.CaasLogs>("caas.apps.logs", { path: { id, app_id: appId }, body: undefined, queryKeys: undefined, params }),
        /**
         * Restart an app
         * Restarts the process without rebuilding the image: it picks up the current environment variables but does **not** pull new code. That is what `deploy` is for.
         * 
         * Scope: `caas:write`
         */
        restart: (id: string, appId: string, params?: RequestOptions) =>
          call<T.Operation>("caas.apps.restart", { path: { id, app_id: appId }, body: undefined, queryKeys: undefined, params }),
      },
      databases: {
        /**
         * Create a database
         * The platform generates the password and **it is not returned here or by any other `/v1` endpoint**: there is no way to recover it through this API. Connect from an app in the same service, where the connection string is already available.
         * 
         * Deleting a database is not in this version: the backend does not implement it yet, and publishing an endpoint that always fails would be publishing roadmap.
         * 
         * Scope: `caas:write`
         */
        create: (id: string, body: T.CaasDatabasesCreateBody, params?: RequestOptions) =>
          call<T.CaasDatabase>("caas.databases.create", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * List the service's databases
         * They belong to the service, not to an app: several apps in the same service can use the same database. **Credentials are not returned** by any endpoint of this API.
         * 
         * Scope: `caas:read`
         */
        list: (id: string, params?: T.CaasDatabasesListQuery & RequestOptions) =>
          call<T.CaasDatabaseList>("caas.databases.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `caas.databases.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: T.CaasDatabasesListQuery & RequestOptions) =>
          paginate<T.CaasDatabase>(
            "caas.databases.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
      },
      deployments: {
        /**
         * List an app's deployment history
         * Newest first, as the backend returns it.
         * 
         * Scope: `caas:read`
         */
        list: (id: string, appId: string, params?: T.CaasDeploymentsListQuery & RequestOptions) =>
          call<T.CaasDeploymentList>("caas.deployments.list", { path: { id, app_id: appId }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `caas.deployments.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, appId: string, params?: T.CaasDeploymentsListQuery & RequestOptions) =>
          paginate<T.CaasDeployment>(
            "caas.deployments.list", { path: { id, app_id: appId }, queryKeys: ["limit", "cursor"], params },
          ),
      },
      domains: {
        /**
         * Add a domain to an app
         * The host's DNS must point at the service's IP **before** you call: certificate issuance is validated over HTTP.
         * 
         * Two more things to know:
         * 
         * - **It is not atomic.** Creation registers the domain and then rebuilds the ingress routing; if the second step fails, the call returns an error with the domain already created. Retrying is safe and is the right move — creation is idempotent per host.
         * - **The certificate is issued afterwards**, asynchronously, with no state or id to query. That is why `certificate_type` comes back `null` here. The only real check is an HTTPS request to the host.
         * 
         * Scope: `caas:write`
         */
        create: (id: string, appId: string, body: T.CaasDomainsCreateBody, params?: RequestOptions) =>
          call<T.CaasDomain>("caas.domains.create", { path: { id, app_id: appId }, body: body, queryKeys: undefined, params }),
        /**
         * Remove a domain from an app
         * Deleting a host that is not on the app is not an error: the ingress routing is rebuilt either way, which is what makes retrying safe.
         * 
         * Scope: `caas:write`
         * **Destructive: there is no undo.**
         */
        delete: (id: string, appId: string, host: string, params?: RequestOptions) =>
          call<void>("caas.domains.delete", { path: { id, app_id: appId, host }, body: undefined, queryKeys: undefined, params }),
        /**
         * List an app's domains
         * 
         * Scope: `caas:read`
         */
        list: (id: string, appId: string, params?: RequestOptions) =>
          call<T.CaasDomainList>("caas.domains.list", { path: { id, app_id: appId }, body: undefined, queryKeys: undefined, params }),
        /**
         * Iterates **all** pages of `caas.domains.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, appId: string, params?: RequestOptions) =>
          paginate<T.CaasDomain>(
            "caas.domains.list", { path: { id, app_id: appId }, queryKeys: undefined, params },
          ),
      },
      env: {
        /**
         * List environment variable names
         * **Returns names, never values.** There is no version of this endpoint that returns them: once written, a value is read only by the application. The backend masks by applying a regex to the key name, which lets anything not named like a secret (`DATABASE_URL`, `SENTRY_DSN`) through in plaintext; that is not a classification policy and it is not published.
         * 
         * Scope: `caas:read`
         */
        list: (id: string, appId: string, params?: RequestOptions) =>
          call<T.CaasEnvVarList>("caas.env.list", { path: { id, app_id: appId }, body: undefined, queryKeys: undefined, params }),
        /**
         * Iterates **all** pages of `caas.env.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, appId: string, params?: RequestOptions) =>
          paginate<T.CaasEnvVar>(
            "caas.env.list", { path: { id, app_id: appId }, queryKeys: undefined, params },
          ),
        /**
         * Replace the environment variables
         * **Replaces the entire set**: anything missing from `vars` is deleted. Not a limitation — it is the semantics of the backend, which writes the whole block at once.
         * 
         * Since `GET /env` returns no values, the set has to come from your side — your secrets manager or your configuration repository. That is the natural shape for declarative infrastructure, and it also removes the panel's failure mode, where saving without rewriting the secrets erased them.
         * 
         * Changes take effect on the next `deploy` or `restart`.
         * 
         * Scope: `caas:write`
         * **Destructive: there is no undo.**
         */
        replace: (id: string, appId: string, body: T.CaasEnvReplaceBody, params?: RequestOptions) =>
          call<T.CaasEnvVarList>("caas.env.replace", { path: { id, app_id: appId }, body: body, queryKeys: undefined, params }),
      },
      instances: {
        /**
         * Get a CaaS service with its live state
         * Queries the control plane. If it does not respond, `provisioning_state` and `machine` come back `null` instead of failing: a control plane hiccup should not stop you from reading the rest of the resource or its `capabilities`.
         * 
         * Scope: `caas:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.Caas>("caas.instances.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * List CaaS services
         * Served from the database, without querying the control plane: `provisioning_state` and `machine` come back `null`. Fetching them would cost two calls per page item.
         * 
         * A page can come back with fewer items than `limit` even when more exist: every control plane product shares the same provisioning module, so the family filter can only be applied after reading the page. `has_more` remains the correct signal for whether anything is left to fetch.
         * 
         * Scope: `caas:read`
         */
        list: (params?: T.CaasInstancesListQuery & RequestOptions) =>
          call<T.CaasList>("caas.instances.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `caas.instances.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (params?: T.CaasInstancesListQuery & RequestOptions) =>
          paginate<T.Caas>(
            "caas.instances.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
      },
    },
    dbaas: {
      backups: {
        /**
         * Create a backup
         * Returns `202` as soon as the task starts, not when the archive is ready: a dump can take minutes, far beyond any HTTP timeout. The operation **resolves against the backup list** —a new one appears or it does not— rather than against the POST result, so it survives the call timing out while the backup is still running. Wait on it with `GET /v1/operations/{id}`.
         * 
         * Scope: `dbaas:write`
         * Returns an asynchronous operation; await it with `operations.wait()`.
         */
        create: (id: string, params?: RequestOptions) =>
          call<T.Operation>("dbaas.backups.create", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * List the service's backups
         * Newest first. A service whose engine has no managed backups returns an empty list, not an error.
         * 
         * Scope: `dbaas:read`
         */
        list: (id: string, params?: T.DbaasBackupsListQuery & RequestOptions) =>
          call<T.DbaasBackupList>("dbaas.backups.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `dbaas.backups.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: T.DbaasBackupsListQuery & RequestOptions) =>
          paginate<T.DbaasBackup>(
            "dbaas.backups.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
      },
      connection: {
        /**
         * Get connection details, without the credential
         * Host, port, database, admin username, TLS mode, and the service's CA — which is **public** and used to verify the server. **It does not include the password or any URI containing it**: the credential comes from `POST /v1/dbaas/{id}/credentials`, which requires the `dbaas:credentials` scope.
         * 
         * Scope: `dbaas:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.DbaasConnection>("dbaas.connection.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
      credentials: {
        /**
         * Reveal the admin credential
         * Returns the admin password **in plaintext**. It rotates nothing: this is the credential already in use.
         * 
         * It is a POST rather than a GET on purpose. A GET lands in browser history, in any proxy's logs, and in intermediate caches, and can be triggered accidentally from a link; a POST forces a deliberate action and enters the audit log as a mutation, so revealing a database's credential leaves a trace. For the same reason it lives in its own scope (`dbaas:credentials`): `dbaas:write` creates scoped databases and users, while this grants full access to the data and survives revoking the key.
         * 
         * Scope: `dbaas:credentials`
         */
        create: (id: string, params?: RequestOptions) =>
          call<T.DbaasCredential>("dbaas.credentials.create", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
      databases: {
        /**
         * Create a database
         * `charset` and `collation` are MySQL-only; `owner` is PostgreSQL-only. Other engines ignore them. The response carries no size or table count: the database is born empty and re-reading it would cost another call just to report a zero.
         * 
         * Scope: `dbaas:write`
         */
        create: (id: string, body: T.DbaasDatabasesCreateBody, params?: RequestOptions) =>
          call<T.DbaasDatabase>("dbaas.databases.create", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * Delete a database
         * **Destructive and irreversible**: the data is gone and there is no trash bin. All that remains is whatever is in `GET /v1/dbaas/{id}/backups`.
         * 
         * Scope: `dbaas:write`
         * **Destructive: there is no undo.**
         */
        delete: (id: string, name: string, params?: RequestOptions) =>
          call<void>("dbaas.databases.delete", { path: { id, name }, body: undefined, queryKeys: undefined, params }),
        /**
         * List the service's databases
         * 
         * Scope: `dbaas:read`
         */
        list: (id: string, params?: T.DbaasDatabasesListQuery & RequestOptions) =>
          call<T.DbaasDatabaseList>("dbaas.databases.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `dbaas.databases.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: T.DbaasDatabasesListQuery & RequestOptions) =>
          paginate<T.DbaasDatabase>(
            "dbaas.databases.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
      },
      instances: {
        /**
         * Get a database with its live state
         * Queries the backend. If it does not respond, the state fields come back `null` and `capabilities` omits `databases`/`users` instead of failing: a backend hiccup should not stop you from reading the rest of the resource.
         * 
         * Scope: `dbaas:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.Dbaas>("dbaas.instances.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * List managed databases
         * Served from the database, without querying the backend: `engine`, `state`, `host`, and `plan` come back `null`, and `capabilities` **omits** `databases` and `users` because knowing whether the engine has them would cost one call per page item. An absent key means "not queried", which is not the same as `false`. For the live state of one, use `GET /v1/dbaas/{id}`.
         * 
         * Scope: `dbaas:read`
         */
        list: (params?: T.DbaasInstancesListQuery & RequestOptions) =>
          call<T.DbaasList>("dbaas.instances.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `dbaas.instances.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (params?: T.DbaasInstancesListQuery & RequestOptions) =>
          paginate<T.Dbaas>(
            "dbaas.instances.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Restart the engine
         * Drops open connections: in-flight transactions are lost. Returns `202` with an already-completed operation —the restart is synchronous in both backends— so clients treat every long mutation the same way, and so the day it stops being synchronous, only the operation's `backend` column changes, not the contract.
         * 
         * Scope: `dbaas:write`
         */
        restart: (id: string, params?: RequestOptions) =>
          call<T.Operation>("dbaas.instances.restart", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
      logs: {
        /**
         * Get the engine log's last lines
         * The tail of the engine process's log, oldest to newest. It is not a query log or an audit log: these are the engine's startup messages, errors, and warnings.
         * 
         * Scope: `dbaas:read`
         */
        get: (id: string, params?: T.DbaasLogsGetQuery & RequestOptions) =>
          call<T.DbaasLogs>("dbaas.logs.get", { path: { id }, body: undefined, queryKeys: ["lines"], params }),
      },
      stats: {
        /**
         * Get instance metrics
         * A snapshot, not a time series. Which fields are populated depends on the service's backend: some measure the container and others the engine.
         * 
         * Scope: `dbaas:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.DbaasStats>("dbaas.stats.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
      users: {
        /**
         * Create a user
         * The password is neither stored on our side nor returned later: if it is lost, change it with `POST /v1/dbaas/{id}/users/{username}/password`.
         * 
         * Scope: `dbaas:write`
         */
        create: (id: string, body: T.DbaasUsersCreateBody, params?: RequestOptions) =>
          call<T.DbaasUser>("dbaas.users.create", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * Delete a user
         * **Cuts off everything currently connected as that user.** It deletes no data: the databases the user created remain.
         * 
         * Scope: `dbaas:write`
         * **Destructive: there is no undo.**
         */
        delete: (id: string, username: string, params?: T.DbaasUsersDeleteQuery & RequestOptions) =>
          call<void>("dbaas.users.delete", { path: { id, username }, body: undefined, queryKeys: ["host"], params }),
        /**
         * List the engine's users
         * Includes the admin. On MySQL the same name can appear with several `host` values: the `user@host` pair is what identifies the user, and that is why it is the resource's `id`.
         * 
         * Scope: `dbaas:read`
         */
        list: (id: string, params?: T.DbaasUsersListQuery & RequestOptions) =>
          call<T.DbaasUserList>("dbaas.users.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `dbaas.users.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: T.DbaasUsersListQuery & RequestOptions) =>
          paginate<T.DbaasUser>(
            "dbaas.users.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Change a user's password
         * Takes effect immediately: applications still using the old one will fail on reconnect. It also works for the admin user.
         * 
         * Scope: `dbaas:write`
         */
        setPassword: (id: string, username: string, body: T.DbaasUsersSetPasswordBody, params?: RequestOptions) =>
          call<void>("dbaas.users.set_password", { path: { id, username }, body: body, queryKeys: undefined, params }),
      },
    },
    dns: {
      records: {
        /**
         * Delete an RRset
         * Deletes every value for that name and type.
         * 
         * Scope: `dns:write`
         * **Destructive: there is no undo.**
         */
        delete: (zone: string, name: string, type: string, params?: RequestOptions) =>
          call<void>("dns.records.delete", { path: { zone, name, type }, body: undefined, queryKeys: undefined, params }),
        /**
         * Get an RRset
         * 
         * Scope: `dns:read`
         */
        get: (zone: string, name: string, type: string, params?: RequestOptions) =>
          call<T.DnsRecord>("dns.records.get", { path: { zone, name, type }, body: undefined, queryKeys: undefined, params }),
        /**
         * List a zone's records
         * Grouped into RRsets: an `A` record with two IPs is **one** record with two values. The response carries an `ETag`; pass it as `If-Match` when writing and no concurrent change gets lost.
         * 
         * Scope: `dns:read`
         */
        list: (zone: string, params?: T.DnsRecordsListQuery & RequestOptions) =>
          call<T.DnsRecordList>("dns.records.list", { path: { zone }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `dns.records.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (zone: string, params?: T.DnsRecordsListQuery & RequestOptions) =>
          paginate<T.DnsRecord>(
            "dns.records.list", { path: { zone }, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Apply several changes at once
         * Each element replaces its RRset; `values: []` deletes it. It is how you apply a coherent change —moving a site and its mail together— without it landing halfway between two calls. **It is not atomic in the backend**: if one change fails, the earlier ones were already applied and the response says which one stopped.
         * 
         * Scope: `dns:write`
         * **Destructive: there is no undo.**
         */
        patch: (zone: string, body: T.DnsRecordsPatchBody, params?: RequestOptions) =>
          call<T.DnsRecordList>("dns.records.patch", { path: { zone }, body: body, queryKeys: undefined, params }),
        /**
         * Create or replace an RRset
         * Replaces the **entire** RRset: values missing from `values` are deleted. That is DNS semantics and the backend's — there is no "add an IP" without rewriting the set. Read the RRset, add the value to the list, and send the full list with the `ETag` in `If-Match`.
         * 
         * Scope: `dns:write`
         */
        put: (zone: string, name: string, type: string, body: T.DnsRecordsPutBody, params?: RequestOptions) =>
          call<T.DnsRecord>("dns.records.put", { path: { zone, name, type }, body: body, queryKeys: undefined, params }),
      },
      zones: {
        /**
         * Export the zone in BIND format
         * The zone file exactly as the backend emits it. Useful for backup or migration.
         * 
         * Scope: `dns:read`
         */
        export: (zone: string, params?: RequestOptions) =>
          call<T.DnsZoneExport>("dns.zones.export", { path: { zone }, body: undefined, queryKeys: undefined, params }),
        /**
         * Get a zone
         * 
         * Scope: `dns:read`
         */
        get: (zone: string, params?: RequestOptions) =>
          call<T.DnsZone>("dns.zones.get", { path: { zone }, body: undefined, queryKeys: undefined, params }),
        /**
         * List DNS zones
         * Served from the database, without querying the DNS backend: `record_count` and `serial` come back `null`. Fetching them would cost one call per zone, and some accounts have dozens.
         * 
         * Scope: `dns:read`
         */
        list: (params?: T.DnsZonesListQuery & RequestOptions) =>
          call<T.DnsZoneList>("dns.zones.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `dns.zones.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (params?: T.DnsZonesListQuery & RequestOptions) =>
          paginate<T.DnsZone>(
            "dns.zones.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
      },
    },
    images: {
      keys: {
        /**
         * Create a delivery token
         * Returns the full `imgt_…` token, **exactly once**: only its hash is stored, so there is no way to show it again. If it is lost, rotate or mint another.
         * 
         * This token **does not work against this API**: it authenticates the delivery plane — `GET {api_endpoint}/v1/img?url=…` for transformations and `POST {api_endpoint}/v1/sign` to sign URLs. Delivery deliberately does not go through `api.truo.cloud`: one extra hop on every `<img>` of every page is one extra failure mode.
         * 
         * It requires `images:keys` rather than `images:write` because holding this token **is** the ability to serve — and bill — traffic through the account's tenant.
         * 
         * Scope: `images:keys`
         */
        create: (params?: RequestOptions) =>
          call<T.ImageKey>("images.keys.create", { path: undefined, body: undefined, queryKeys: undefined, params }),
        /**
         * Rotate the delivery token
         * Issues a new token and returns it. With `grace_seconds`, the previous token keeps working that long, so servers holding it do not fail at the instant of rotation; with `0` (the default) it dies immediately. There is no going back: the old token cannot be reactivated.
         * 
         * Scope: `images:keys`
         * **Destructive: there is no undo.**
         */
        rotate: (body?: T.ImageRotateRequest, params?: RequestOptions) =>
          call<T.ImageKey>("images.keys.rotate", { path: undefined, body: body, queryKeys: undefined, params }),
      },
      origins: {
        /**
         * Allow an origin
         * Adds a hostname (`images.example.com`) or a wildcard (`*.example.com`) to the allowlist. Idempotent: re-adding an existing pattern changes nothing. Each plan caps how many origins it can hold; past the cap this returns `quota_exceeded`.
         * 
         * Scope: `images:write`
         */
        add: (body: T.ImageOriginCreate, params?: RequestOptions) =>
          call<T.ImageOrigin>("images.origins.add", { path: undefined, body: body, queryKeys: undefined, params }),
        /**
         * List the origin allowlist
         * The hostnames the service is allowed to fetch from. **Fail-closed**: an empty allowlist serves nothing, on purpose — an open image proxy is an attack tool.
         * 
         * Scope: `images:read`
         */
        list: (params?: T.ImagesOriginsListQuery & RequestOptions) =>
          call<T.ImageOriginList>("images.origins.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `images.origins.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (params?: T.ImagesOriginsListQuery & RequestOptions) =>
          paginate<T.ImageOrigin>(
            "images.origins.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Remove an origin
         * Stops serving from that origin immediately. Reversible: adding the pattern back restores it. If it was the last origin, the tenant serves nothing until one is added — the allowlist is fail-closed.
         * 
         * Scope: `images:write`
         */
        remove: (pattern: string, params?: RequestOptions) =>
          call<void>("images.origins.remove", { path: { pattern }, body: undefined, queryKeys: undefined, params }),
      },
      signing: {
        /**
         * Reveal the URL-signing secret
         * Returns the per-tenant HMAC-SHA256 secret that signs delivery URLs. **It is a POST on purpose, even though it changes nothing**: a GET that returns a secret lands in browser history, in any proxy's cache, and in yesterday's `curl`. A POST forces a deliberate action, is not cacheable, and enters the audit log as a mutation.
         * 
         * The secret is recoverable (stored, not hashed) because your server needs it whole to sign every URL it emits. It belongs on the server, **never in the browser**: anyone holding it can mint URLs that serve — and bill — through your tenant. If it was compromised, rotate it with `POST /v1/images/signing-secret/rotate`.
         * 
         * Scope: `images:keys`
         */
        reveal: (params?: RequestOptions) =>
          call<T.ImageSigningSecret>("images.signing.reveal", { path: undefined, body: undefined, queryKeys: undefined, params }),
        /**
         * Rotate the URL-signing secret
         * Issues a new secret and returns it. URLs signed with the previous secret keep working until `previous_valid_until` (per `grace_seconds`) — without a grace window, every `<img>` already rendered in your pages would break at the instant of rotation. Re-sign and redeploy before the window closes.
         * 
         * Scope: `images:keys`
         * **Destructive: there is no undo.**
         */
        rotate: (body?: T.ImageRotateRequest, params?: RequestOptions) =>
          call<T.ImageSigningSecret>("images.signing.rotate", { path: undefined, body: body, queryKeys: undefined, params }),
      },
      tenant: {
        /**
         * Get the account's Image Services
         * It takes no id: there is one Image Services tenant per account. Returns the plan, the month's usage, and how many origins are allowed. `origin_count: 0` means nothing is served yet — the allowlist is fail-closed. If the account does not have the service, it returns 404.
         * 
         * Scope: `images:read`
         */
        get: (params?: RequestOptions) =>
          call<T.ImageServices>("images.tenant.get", { path: undefined, body: undefined, queryKeys: undefined, params }),
      },
      usage: {
        /**
         * Get the period's usage and billable line
         * Consumption against the plan for the period: transformations (cache misses — real CPU work), deliveries, egress bytes, what the quota includes, the overage, and the total in USD. Includes the daily series. On a hard-capped plan (`included.hard_cap`) the overage is never billed: the service stops at the quota instead.
         * 
         * Scope: `images:read`
         */
        get: (params?: T.ImagesUsageGetQuery & RequestOptions) =>
          call<T.ImageUsageReport>("images.usage.get", { path: undefined, body: undefined, queryKeys: ["period", "days"], params }),
      },
    },
    lb: {
      backends: {
        /**
         * Add a backend to a listener
         * A shortcut over `PUT /listeners` for the common case of adding a machine. It revalidates and applies the full configuration, so it inherits the same guarantee: either the backend ends up receiving traffic, or nothing changed.
         * 
         * Scope: `lb:write`
         */
        create: (id: string, body: T.LbBackendsCreateBody, params?: RequestOptions) =>
          call<T.LbBackend>("lb.backends.create", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * Remove a backend from a listener
         * The three values identifying the backend go in the path. The upstream expects them in the body of a `DELETE`, which proxies and CDNs discard and several HTTP clients refuse to send; the body is built on this side.
         * 
         * **A listener cannot be left without backends.** Removing the last one returns `400 validation_failed`: to remove the whole listener, use `PUT /listeners` without it.
         * 
         * Scope: `lb:write`
         * **Destructive: there is no undo.**
         */
        delete: (id: string, listener: string, ip: string, port: string, params?: RequestOptions) =>
          call<void>("lb.backends.delete", { path: { id, listener, ip, port }, body: undefined, queryKeys: undefined, params }),
        /**
         * List the backends
         * The backends of every listener, flattened, each with the listener it belongs to. It is a view over the same configuration that `GET /listeners` returns.
         * 
         * Scope: `lb:read`
         */
        list: (id: string, params?: RequestOptions) =>
          call<T.LbBackendList>("lb.backends.list", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Iterates **all** pages of `lb.backends.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: RequestOptions) =>
          paginate<T.LbBackend>(
            "lb.backends.list", { path: { id }, queryKeys: undefined, params },
          ),
      },
      instances: {
        /**
         * Get a load balancer with its live state
         * Queries the control plane, which in turn probes the balancer. If it does not respond, the state fields come back `null` instead of failing.
         * 
         * Scope: `lb:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.LoadBalancer>("lb.instances.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * List load balancers
         * Served from the database, without querying the control plane: `provisioning_state`, `healthy`, and `listener_count` come back `null`. Fetching them would cost one call per page item.
         * 
         * A page can come back with fewer items than `limit` even when more exist: every control plane product shares the same provisioning module, so the family filter can only be applied after reading the page. `has_more` remains the correct signal for whether anything is left to fetch.
         * 
         * Scope: `lb:read`
         */
        list: (params?: T.LbInstancesListQuery & RequestOptions) =>
          call<T.LoadBalancerList>("lb.instances.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `lb.instances.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (params?: T.LbInstancesListQuery & RequestOptions) =>
          paginate<T.LoadBalancer>(
            "lb.instances.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
      },
      listeners: {
        /**
         * List the listeners
         * The balancer's full configuration, including each listener's backends. It is what you read, modify, and send back in `PUT`.
         * 
         * Scope: `lb:read`
         */
        list: (id: string, params?: RequestOptions) =>
          call<T.LbListenerList>("lb.listeners.list", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Iterates **all** pages of `lb.listeners.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: RequestOptions) =>
          paginate<T.LbListener>(
            "lb.listeners.list", { path: { id }, queryKeys: undefined, params },
          ),
        /**
         * Replace the listener configuration
         * **Replaces the entire set**: listeners missing from `listeners` are deleted, along with their backends. Sending `[]` leaves the balancer with nothing listening and cuts traffic. Read `GET /listeners`, modify, and send everything back.
         * 
         * **The change is applied within the call**: by the time this returns, the new configuration is already serving traffic. If the resulting configuration is invalid, nothing is applied and the response is `400 validation_failed` — the service is never left half-configured.
         * 
         * Scope: `lb:write`
         * **Destructive: there is no undo.**
         */
        replace: (id: string, body: T.LbListenersReplaceBody, params?: RequestOptions) =>
          call<T.LbListenerList>("lb.listeners.replace", { path: { id }, body: body, queryKeys: undefined, params }),
      },
      stats: {
        /**
         * Get per-listener state and traffic
         * A point-in-time snapshot: current connections and bytes accumulated since the balancer's last start, plus each backend's health from the latest probe. There is no historical series.
         * 
         * If the balancer does not answer the probe, the listeners still appear —they come from the stored configuration— with `state: unknown` and zeroed counters. A listener that exists but does not respond and one that exists with no traffic cannot be told apart by the counters: check `state`.
         * 
         * Scope: `lb:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.LbStats>("lb.stats.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
    },
    mailgateway: {
      domains: {
        /**
         * Add a sending domain
         * Returns **the DNS records you must publish** in the domain's zone. That is the point of this call: until they are published and SES sees them, the domain does not verify and you cannot send from it. Each record carries `purpose`, `type`, `host`, `value`, and `status`; `purpose` is the stable key for automating publication.
         * 
         * Verification is **asynchronous and on the SES side**: this call does not wait. Check the status with `POST /v1/mail-gateway/domains/{domain}/verify`.
         * 
         * It is idempotent: repeating it for an already-added domain reuses the same DKIM key pair and returns the same records, so a retry does not invalidate what is already published.
         * 
         * Scope: `mailgateway:write`
         */
        create: (body: T.MailgatewayDomainsCreateBody, params?: RequestOptions) =>
          call<T.MailGatewayDomain>("mailgateway.domains.create", { path: undefined, body: body, queryKeys: undefined, params }),
        /**
         * Remove a sending domain
         * Cuts off sending from that domain: it leaves the SMTP policy and the keys. The DNS records remain published in your zone; removing them is up to you. Adding it back generates new DKIM keys, so the old TXT record stops working.
         * 
         * Scope: `mailgateway:write`
         * **Destructive: there is no undo.**
         */
        delete: (domain: string, params?: RequestOptions) =>
          call<void>("mailgateway.domains.delete", { path: { domain }, body: undefined, queryKeys: undefined, params }),
        /**
         * List sending domains
         * Each domain comes with its DNS records and the status of each one. You can only send from a `verified` domain.
         * 
         * Scope: `mailgateway:read`
         */
        list: (params?: T.MailgatewayDomainsListQuery & RequestOptions) =>
          call<T.MailGatewayDomainList>("mailgateway.domains.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `mailgateway.domains.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (params?: T.MailgatewayDomainsListQuery & RequestOptions) =>
          paginate<T.MailGatewayDomain>(
            "mailgateway.domains.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Check a domain's verification
         * **A check, not a trigger.** SES inspects public DNS on its own and at its own pace; this reads that result and updates the domain's status and each record's. Getting `pending` back is not an error: it means SES has not seen the records yet, either because they have not propagated or because they are not published.
         * 
         * The `dkim` and `mail_from_mx` records are the ones SES verifies. `spf`, `mail_from_spf`, and `dmarc` always stay `info`: they improve deliverability, but nothing checks them.
         * 
         * `verified_at` comes back `null` in this response even when the status is `verified`; the value is in `GET /v1/mail-gateway/domains`.
         * 
         * Scope: `mailgateway:write`
         */
        verify: (domain: string, params?: RequestOptions) =>
          call<T.MailGatewayDomain>("mailgateway.domains.verify", { path: { domain }, body: undefined, queryKeys: undefined, params }),
      },
      keys: {
        /**
         * Create a sending API key
         * Returns the full key in `secret`, **exactly once**: we store its hash, so there is no way to show it again. If it is lost, create another and revoke this one.
         * 
         * This key **does not work against this API**: it is used on the sending plane, `POST {api_endpoint}/emails` (currently `https://mg.truo.cloud/v1/emails`), with `Authorization: Bearer mg_live_…`. Sending deliberately does not go through `api.truo.cloud`: one extra hop on the mail path is one extra failure mode.
         * 
         * It requires `mailgateway:send` rather than `mailgateway:write` because issuing this credential **is** the ability to send on the account's behalf, and it survives this API's key being revoked.
         * 
         * Scope: `mailgateway:send`
         */
        create: (params?: RequestOptions) =>
          call<T.MailGatewayKey>("mailgateway.keys.create", { path: undefined, body: undefined, queryKeys: undefined, params }),
        /**
         * Revoke a sending API key
         * Takes effect almost immediately: the key leaves the gateway's index. Whatever was already accepted is delivered. Revoking requires `write` rather than `send` on purpose: removing the account's ability to send should not require the scope that **grants** the ability to send.
         * 
         * Scope: `mailgateway:write`
         * **Destructive: there is no undo.**
         */
        delete: (keyId: string, params?: RequestOptions) =>
          call<void>("mailgateway.keys.delete", { path: { key_id: keyId }, body: undefined, queryKeys: undefined, params }),
        /**
         * List sending API keys
         * Includes revoked keys, so history can be audited. `secret` is always `null`: we store the key's hash and there is no way to recover it.
         * 
         * Scope: `mailgateway:read`
         */
        list: (params?: T.MailgatewayKeysListQuery & RequestOptions) =>
          call<T.MailGatewayKeyList>("mailgateway.keys.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `mailgateway.keys.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (params?: T.MailgatewayKeysListQuery & RequestOptions) =>
          paginate<T.MailGatewayKey>(
            "mailgateway.keys.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
      },
      messages: {
        /**
         * List sent messages
         * One element per message, newest first, with the aggregate status of the highest-severity event seen (`bounced` beats `delivered`). Retained for 90 days.
         * 
         * No `total`: the backend cannot know how many messages match without walking the entire history, and no `/v1` collection publishes totals. Paginate with `next_cursor`.
         * 
         * Scope: `mailgateway:read`
         */
        list: (params?: T.MailgatewayMessagesListQuery & RequestOptions) =>
          call<T.MailGatewayMessageList>("mailgateway.messages.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor", "recipient", "days"], params }),
        /**
         * Iterates **all** pages of `mailgateway.messages.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (params?: T.MailgatewayMessagesListQuery & RequestOptions) =>
          paginate<T.MailGatewayMessage>(
            "mailgateway.messages.list", { path: undefined, queryKeys: ["limit", "cursor", "recipient", "days"], params },
          ),
      },
      metrics: {
        /**
         * Get delivery and reputation metrics
         * Delivery, open, bounce, and complaint rates for the range, with the daily series, send-to-delivery latency, and the per-domain breakdown. Rates are fractions (0–1), not percentages. `bounce_rate_limit` and `complaint_rate_limit` are the SES thresholds: crossing them suspends sending to protect the shared reputation.
         * 
         * Scope: `mailgateway:read`
         */
        get: (params?: T.MailgatewayMetricsGetQuery & RequestOptions) =>
          call<T.MailGatewayMetrics>("mailgateway.metrics.get", { path: undefined, body: undefined, queryKeys: ["range"], params }),
      },
      smtp: {
        /**
         * View the SMTP configuration
         * Host, port, username, and status, **without the password**. It is what you need to configure or review a mail client without handling the secret. For the password, use `POST /v1/mail-gateway/smtp`.
         * 
         * Scope: `mailgateway:read`
         */
        get: (params?: RequestOptions) =>
          call<T.MailGatewaySmtp>("mailgateway.smtp.get", { path: undefined, body: undefined, queryKeys: undefined, params }),
        /**
         * Reveal the SMTP password
         * Returns the SMTP password in plaintext. **It is a POST on purpose, even though it changes nothing.** The backend exposes it in a GET, and a GET that returns a secret lands in browser history, in any proxy's cache, and in yesterday's `curl`. A POST forces a deliberate action, is not cacheable, and enters the audit log as a mutation — which is exactly how "who pulled the sending password, and when" has to be auditable.
         * 
         * The password is recoverable (stored encrypted, not hashed) because a mail server needs it whole on every connection. If it was compromised, no longer looking at it is not enough: rotate it with `POST /v1/mail-gateway/smtp/rotate`.
         * 
         * Scope: `mailgateway:send`
         */
        reveal: (params?: RequestOptions) =>
          call<T.MailGatewaySmtpCredentials>("mailgateway.smtp.reveal", { path: undefined, body: undefined, queryKeys: undefined, params }),
        /**
         * Rotate the SMTP credential
         * Issues a new username and password and returns both. The previous credential is deactivated, not deleted, so an application that still holds it in memory does not crash at the instant of rotation — but it will stop working, so update your systems. There is no going back: the old one cannot be reactivated from here.
         * 
         * Scope: `mailgateway:send`
         * **Destructive: there is no undo.**
         */
        rotate: (params?: RequestOptions) =>
          call<T.MailGatewaySmtpCredentials>("mailgateway.smtp.rotate", { path: undefined, body: undefined, queryKeys: undefined, params }),
      },
      tenant: {
        /**
         * Get the account's Mail Gateway
         * It takes no id: there is one Mail Gateway per account. Returns the status, the month's usage, and how many domains and keys exist; each has its own detail endpoint. If the account does not have the service, it returns 404.
         * 
         * Scope: `mailgateway:read`
         */
        get: (params?: RequestOptions) =>
          call<T.MailGateway>("mailgateway.tenant.get", { path: undefined, body: undefined, queryKeys: undefined, params }),
      },
      usage: {
        /**
         * Get the current month's usage
         * Accepted and rejected sends for the current UTC calendar month. This is the number that gets billed. Rejected sends are not charged: they are the ones the gateway stopped before SES.
         * 
         * Scope: `mailgateway:read`
         */
        get: (params?: RequestOptions) =>
          call<T.MailGatewayUsage>("mailgateway.usage.get", { path: undefined, body: undefined, queryKeys: undefined, params }),
      },
    },
    meta: {
      /**
       * What this API instance supports
       * Requires no authentication. Returns the available resources, the scope taxonomy, and the current limits, so a client never has to discover them by trial and error.
       */
      capabilities: (params?: RequestOptions) =>
        call<T.Capabilities>("meta.capabilities", { path: undefined, body: undefined, queryKeys: undefined, params }),
    },
    objectstorage: {
      buckets: {
        /**
         * Create a bucket
         * Returns the same resource as `GET /v1/object-storage/buckets/{bucket}`. The backend's create call responds with the raw registry row —a different shape, with a different date format— so it is re-read before responding: it costs one call and buys create and read returning the same object.
         * 
         * Scope: `objectstorage:write`
         */
        create: (body: T.ObjectstorageBucketsCreateBody, params?: RequestOptions) =>
          call<T.StorageBucket>("objectstorage.buckets.create", { path: undefined, body: body, queryKeys: undefined, params }),
        /**
         * Delete a bucket
         * A bucket with objects is not deleted: the request fails and touches nothing. `?purge=true` deletes it along with all its contents, and that **cannot be undone** — there is no trash bin and no versioning. To know how many objects will be lost, empty it first with `POST .../empty`, which returns the count.
         * 
         * Scope: `objectstorage:write`
         * **Destructive: there is no undo.**
         */
        delete: (bucket: string, params?: T.ObjectstorageBucketsDeleteQuery & RequestOptions) =>
          call<void>("objectstorage.buckets.delete", { path: { bucket }, body: undefined, queryKeys: ["purge"], params }),
        /**
         * Empty a bucket
         * Deletes every object and keeps the bucket with its configuration. **It cannot be undone.** On a large bucket it can take a while: deletion runs object by object against the storage.
         * 
         * Scope: `objectstorage:write`
         * **Destructive: there is no undo.**
         * Returns an asynchronous operation; await it with `operations.wait()`.
         */
        empty: (bucket: string, params?: RequestOptions) =>
          call<T.StorageDeletion>("objectstorage.buckets.empty", { path: { bucket }, body: undefined, queryKeys: undefined, params }),
        /**
         * Get a bucket
         * 
         * Scope: `objectstorage:read`
         */
        get: (bucket: string, params?: RequestOptions) =>
          call<T.StorageBucket>("objectstorage.buckets.get", { path: { bucket }, body: undefined, queryKeys: undefined, params }),
        /**
         * List buckets
         * Includes buckets created directly through the S3 protocol, which have no registry row: they are listed anyway —hiding them would hide data that exists— with `created_at` set to `null` and private access.
         * 
         * Scope: `objectstorage:read`
         */
        list: (params?: T.ObjectstorageBucketsListQuery & RequestOptions) =>
          call<T.StorageBucketList>("objectstorage.buckets.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `objectstorage.buckets.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (params?: T.ObjectstorageBucketsListQuery & RequestOptions) =>
          paginate<T.StorageBucket>(
            "objectstorage.buckets.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Get a bucket's metrics
         * Storage, egress, and requests for the requested range. The series carry one point per UTC day and come back empty until there is data, rather than being padded with zeros that would be indistinguishable from a day without traffic.
         * 
         * Scope: `objectstorage:read`
         */
        metrics: (bucket: string, params?: T.ObjectstorageBucketsMetricsQuery & RequestOptions) =>
          call<T.StorageBucketMetrics>("objectstorage.buckets.metrics", { path: { bucket }, body: undefined, queryKeys: ["range"], params }),
        /**
         * Change a bucket's visibility
         * Making the bucket public mints an anonymous read URL (`public_url`) and keeps it if the bucket later goes private: republishing returns the same URL, not a new one.
         * 
         * Scope: `objectstorage:write`
         */
        update: (bucket: string, body: T.ObjectstorageBucketsUpdateBody, params?: RequestOptions) =>
          call<T.StorageBucket>("objectstorage.buckets.update", { path: { bucket }, body: body, queryKeys: undefined, params }),
      },
      keys: {
        /**
         * Issue an access key
         * The **only** endpoint that returns `secret_access_key`, and it returns it exactly once: it is not stored in plaintext on our side and there is no way to recover it later. If it is lost, the way out is to delete the key and issue another. Keys coexist: issuing one does not revoke the previous ones. Limit each one to a bucket with `scope` so that losing one does not compromise the rest.
         * 
         * Scope: `objectstorage:keys`
         */
        create: (body: T.ObjectstorageKeysCreateBody, params?: RequestOptions) =>
          call<T.StorageAccessKeyWithSecret>("objectstorage.keys.create", { path: undefined, body: body, queryKeys: undefined, params }),
        /**
         * Revoke an access key
         * Revocation is immediate. Revoking a key **also invalidates the presigned URLs signed with it**, even if they have not expired: the signature is validated against the key, and a revoked key no longer exists. It is the only way to cut off a presigned URL early.
         * 
         * Scope: `objectstorage:keys`
         * **Destructive: there is no undo.**
         */
        delete: (keyId: string, params?: RequestOptions) =>
          call<void>("objectstorage.keys.delete", { path: { key_id: keyId }, body: undefined, queryKeys: undefined, params }),
        /**
         * List access keys
         * Active keys only, and never the secret.
         * 
         * Scope: `objectstorage:read`
         */
        list: (params?: T.ObjectstorageKeysListQuery & RequestOptions) =>
          call<T.StorageAccessKeyList>("objectstorage.keys.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `objectstorage.keys.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (params?: T.ObjectstorageKeysListQuery & RequestOptions) =>
          paginate<T.StorageAccessKey>(
            "objectstorage.keys.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
      },
      objects: {
        /**
         * Delete objects
         * Batch delete by key. It is a `POST` rather than a `DELETE` because the key list goes in the body: not every HTTP client sends a `DELETE` with a body. **It cannot be undone.** `deleted` can be lower than the number of keys requested: keys that did not exist do not count.
         * 
         * Scope: `objectstorage:write`
         * **Destructive: there is no undo.**
         */
        delete: (bucket: string, body: T.ObjectstorageObjectsDeleteBody, params?: RequestOptions) =>
          call<T.StorageDeletion>("objectstorage.objects.delete", { path: { bucket }, body: body, queryKeys: undefined, params }),
        /**
         * List a bucket's objects
         * One level at a time, like a file explorer: entries with `is_folder: true` are prefixes, navigated by passing their `key` as `prefix`. It does not accept `limit`: the backend sets the page size (up to 1000 entries) and trimming here would silently drop objects as the cursor advances.
         * 
         * Scope: `objectstorage:read`
         */
        list: (bucket: string, params?: T.ObjectstorageObjectsListQuery & RequestOptions) =>
          call<T.StorageObjectList>("objectstorage.objects.list", { path: { bucket }, body: undefined, queryKeys: ["prefix", "cursor"], params }),
        /**
         * Iterates **all** pages of `objectstorage.objects.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (bucket: string, params?: T.ObjectstorageObjectsListQuery & RequestOptions) =>
          paginate<T.StorageObject>(
            "objectstorage.objects.list", { path: { bucket }, queryKeys: ["prefix", "cursor"], params },
          ),
        /**
         * Presign a temporary URL
         * Returns a link that works without credentials until it expires. `method: "GET"` to download (requires `objectstorage:read`), `method: "PUT"` to upload (requires `objectstorage:write`). The URL is a bearer credential: it works for anyone who holds it, and the only way to cut it off before it expires is to revoke the S3 key that signed it. Request the shortest TTL that works for you. It also inherits the scope of that key: if the key is limited to one bucket or is read-only, the URL can do no more than the key can.
         * 
         * Scope: `objectstorage:read`
         */
        presign: (bucket: string, body: T.ObjectstorageObjectsPresignBody, params?: RequestOptions) =>
          call<T.StoragePresignedUrl>("objectstorage.objects.presign", { path: { bucket }, body: body, queryKeys: undefined, params }),
      },
      tenant: {
        /**
         * Get the account's Object Storage
         * Usage, endpoint, and status. It is a per-account singleton: there is no listing and no id to pass. Storage and object counts come from the latest daily snapshot, not a live scan, so a freshly uploaded object can take a while to show up in the totals.
         * 
         * Scope: `objectstorage:read`
         */
        get: (params?: RequestOptions) =>
          call<T.ObjectStorage>("objectstorage.tenant.get", { path: undefined, body: undefined, queryKeys: undefined, params }),
      },
    },
    operations: {
      /**
       * Get the status of an operation
       * Reads consult the real backend, with a 2 s cache. If the backend does not respond, the last known state is returned with `stale: true` and **never a 500**: a polling client must not lose its operation to a backend hiccup, nor be pushed into retrying the mutation.
       * 
       * Scope: `operations:read`
       */
      get: (id: string, params?: RequestOptions) =>
        call<T.Operation>("operations.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      /**
       * List the account's recent operations
       * 
       * Scope: `operations:read`
       */
      list: (params?: T.OperationsListQuery & RequestOptions) =>
        call<T.OperationList>("operations.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
      /**
       * Iterates **all** pages of `operations.list`, following the cursor on its own.
       * A `for await` over this never drops results by forgetting `next_cursor`.
       */
      listAll: (params?: T.OperationsListQuery & RequestOptions) =>
        paginate<T.Operation>(
          "operations.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
        ),
    },
    services: {
      /**
       * Get a service
       * A 404 here means both "does not exist" and "exists but this credential cannot see it". That is deliberate: a 403 would confirm the service's existence and turn the API into an enumeration oracle.
       * 
       * Scope: `services:read`
       */
      get: (id: string, params?: RequestOptions) =>
        call<T.Service>("services.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      /**
       * List the services in the account
       * Returns only the services this credential can see: the key's allowlist and the owning user's per-service permissions both apply. It is the entry point for obtaining the `service_id` values used by every other resource.
       * 
       * Scope: `services:read`
       */
      list: (params?: T.ServicesListQuery & RequestOptions) =>
        call<T.ServiceList>("services.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor", "family"], params }),
      /**
       * Iterates **all** pages of `services.list`, following the cursor on its own.
       * A `for await` over this never drops results by forgetting `next_cursor`.
       */
      listAll: (params?: T.ServicesListQuery & RequestOptions) =>
        paginate<T.Service>(
          "services.list", { path: undefined, queryKeys: ["limit", "cursor", "family"], params },
        ),
    },
    vps: {
      backups: {
        /**
         * Create a backup
         * Queues a `vzdump`. With `mode: snapshot` (the default) the machine keeps running. The operation reflects that the task was queued, not that the archive is ready: the final size appears in `GET /v1/vps/{id}/backups` once the hypervisor finishes.
         * 
         * Scope: `vps:write`
         * Returns an asynchronous operation; await it with `operations.wait()`.
         */
        create: (id: string, body?: T.VpsBackupsCreateBody, params?: RequestOptions) =>
          call<T.Operation>("vps.backups.create", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * Delete a backup
         * 
         * Scope: `vps:write`
         * **Destructive: there is no undo.**
         */
        delete: (id: string, backupId: string, params?: RequestOptions) =>
          call<void>("vps.backups.delete", { path: { id, backup_id: backupId }, body: undefined, queryKeys: undefined, params }),
        /**
         * List the VPS backups
         * 
         * Scope: `vps:read`
         */
        list: (id: string, params?: T.VpsBackupsListQuery & RequestOptions) =>
          call<T.VpsBackupList>("vps.backups.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `vps.backups.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: T.VpsBackupsListQuery & RequestOptions) =>
          paginate<T.VpsBackup>(
            "vps.backups.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Restore a backup
         * **Destructive.** Powers off the machine and overwrites the entire disk: everything written after that backup is lost. The backend verifies the backup belongs to this VPS before touching anything.
         * 
         * Scope: `vps:write`
         * **Destructive: there is no undo.**
         * Returns an asynchronous operation; await it with `operations.wait()`.
         */
        restore: (id: string, backupId: string, params?: RequestOptions) =>
          call<T.Operation>("vps.backups.restore", { path: { id, backup_id: backupId }, body: undefined, queryKeys: undefined, params }),
      },
      config: {
        /**
         * Get the machine configuration
         * 
         * Scope: `vps:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.VpsConfig>("vps.config.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
      console: {
        /**
         * Open a console
         * Issues a single-use ticket. **It grants full access to the operating system**, bypassing the network and SSH, which is why it lives in its own scope (`vps:console`) instead of falling under `vps:write`. Do not log it: the SPICE `file` carries the password inside.
         * 
         * Scope: `vps:console`
         */
        create: (id: string, body?: T.VpsConsoleCreateBody, params?: RequestOptions) =>
          call<T.ConsoleTicket>("vps.console.create", { path: { id }, body: body, queryKeys: undefined, params }),
      },
      /**
       * Get a VPS with its live state
       * Queries the hypervisor. If it does not respond, the state fields come back `null` instead of failing: a hypervisor hiccup should not stop you from reading the rest of the resource or its `capabilities`.
       * 
       * Scope: `vps:read`
       */
      get: (id: string, params?: RequestOptions) =>
        call<T.Vps>("vps.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      ips: {
        /**
         * List the IPs assigned to the VPS
         * 
         * Scope: `vps:read`
         */
        list: (id: string, params?: T.VpsIpsListQuery & RequestOptions) =>
          call<T.VpsIpList>("vps.ips.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `vps.ips.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: T.VpsIpsListQuery & RequestOptions) =>
          paginate<T.VpsIp>(
            "vps.ips.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
      },
      /**
       * List VPS instances
       * Served from the database, without querying the hypervisor: `state`, `cpu`, `memory`, and `disk` come back `null`. Fetching them would cost one backend call per page item. For the live state of one instance, use `GET /v1/vps/{id}`.
       * 
       * Scope: `vps:read`
       */
      list: (params?: T.VpsListQuery & RequestOptions) =>
        call<T.VpsList>("vps.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
      /**
       * Iterates **all** pages of `vps.list`, following the cursor on its own.
       * A `for await` over this never drops results by forgetting `next_cursor`.
       */
      listAll: (params?: T.VpsListQuery & RequestOptions) =>
        paginate<T.Vps>(
          "vps.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
        ),
      metrics: {
        /**
         * Get CPU, memory, disk, and network usage series
         * The hypervisor's RRD series. Resolution is set by `timeframe` and is not configurable: `hour` yields minutes, `year` yields weeks. `cpu_percent` is a percentage of the allocated total.
         * 
         * Scope: `vps:read`
         */
        list: (id: string, params?: T.VpsMetricsListQuery & RequestOptions) =>
          call<T.VpsMetrics>("vps.metrics.list", { path: { id }, body: undefined, queryKeys: ["timeframe"], params }),
      },
      /**
       * Start, stop, or reboot
       * Returns `202` as soon as the order is issued, not when the machine reaches the requested state. The operation resolves against the **VM's actual state**, so it survives the backend taking longer than the HTTP timeout — a `reboot` is stop, wait, and start, which does not fit in one request. Wait on it with `GET /v1/operations/{id}`.
       * 
       * Scope: `vps:power`
       * Returns an asynchronous operation; await it with `operations.wait()`.
       */
      power: (id: string, body: T.VpsPowerBody, params?: RequestOptions) =>
        call<T.Operation>("vps.power", { path: { id }, body: body, queryKeys: undefined, params }),
      /**
       * Reinstall the operating system
       * **Destructive and irreversible: it wipes the entire disk.** Queues a job that runs the same state machine as a fresh provision (provision → wait for boot → health check), so the operation reports real progress and can take several minutes. The IP is preserved.
       * 
       * Scope: `vps:write`
       * **Destructive: there is no undo.**
       * Returns an asynchronous operation; await it with `operations.wait()`.
       */
      reinstall: (id: string, body: T.VpsReinstallBody, params?: RequestOptions) =>
        call<T.Operation>("vps.reinstall", { path: { id }, body: body, queryKeys: undefined, params }),
      templates: {
        /**
         * List the operating systems available for reinstall
         * Depends on the machine type and the node it lives on, so it is requested per VPS rather than globally.
         * 
         * Scope: `vps:read`
         */
        list: (id: string, params?: T.VpsTemplatesListQuery & RequestOptions) =>
          call<T.VpsTemplateList>("vps.templates.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `vps.templates.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: T.VpsTemplatesListQuery & RequestOptions) =>
          paginate<T.VpsTemplate>(
            "vps.templates.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
      },
      /**
       * Rename a VPS
       * Changes the operating system hostname. On LXC it takes effect immediately; on KVM it renames the VM and the operating system picks it up on the next reboot.
       * 
       * Scope: `vps:write`
       */
      update: (id: string, body: T.VpsUpdateBody, params?: RequestOptions) =>
        call<T.Vps>("vps.update", { path: { id }, body: body, queryKeys: undefined, params }),
    },
  };
}

/** The resource tree, inferred. It is what `TruoClient` exposes. */
export type Resources = ReturnType<typeof createResources>;
