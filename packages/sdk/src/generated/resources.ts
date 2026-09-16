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
    serverless: {
      cron: {
        /**
         * Get the account's Cron Jobs
         * It takes no id: there is one Cron tenant per account. Returns the plan, its limits, how many schedules exist, and the month's executions. Schedules themselves are managed against the service's data plane with the tenant token.
         * 
         * Scope: `serverless:read`
         */
        get: (params?: RequestOptions) =>
          call<T.ServerlessCron>("serverless.cron.get", { path: undefined, body: undefined, queryKeys: undefined, params }),
        keys: {
          /**
           * Rotate the Cron token
           * Issues a new `crt_…` token and returns it, exactly once. With `grace_seconds` the previous token keeps working that long; with `0` (the default) it dies immediately. Schedules keep firing through a rotation — the token only authenticates management.
           * 
           * Scope: `serverless:keys`
           * **Destructive: there is no undo.**
           */
          rotate: (body?: T.ServerlessRotateRequest, params?: RequestOptions) =>
            call<T.ServerlessKey>("serverless.cron.keys.rotate", { path: undefined, body: body, queryKeys: undefined, params }),
        },
        usage: {
          /**
           * Get the Cron period's usage and billable line
           * Webhook executions against the plan for the period, the overage, the total in USD, and the daily series. On the free plan, deliveries past the quota are skipped (visible in the execution log) instead of billed.
           * 
           * Scope: `serverless:read`
           */
          get: (params?: T.ServerlessCronUsageGetQuery & RequestOptions) =>
            call<T.ServerlessCronUsage>("serverless.cron.usage.get", { path: undefined, body: undefined, queryKeys: ["period", "days"], params }),
        },
      },
      db: {
        /**
         * Get the account's Serverless DB
         * It takes no id: there is one Serverless DB tenant per account. Returns the plan, its limits, the live namespaces and the month's usage. **This is not DBaaS** (`/v1/databases`, managed database VMs): this is the serverless SQL primitive, D1-compatible, one SQLite database per namespace.
         * 
         * Scope: `serverless:read`
         */
        get: (params?: RequestOptions) =>
          call<T.ServerlessDb>("serverless.db.get", { path: undefined, body: undefined, queryKeys: undefined, params }),
        keys: {
          /**
           * Rotate the DB token
           * Issues a new `dbt_…` token and returns it, exactly once. With `grace_seconds` the previous token keeps working that long — rotate with a grace window and redeploy your apps before it closes, or every query they run dies at the instant of rotation.
           * 
           * Scope: `serverless:keys`
           * **Destructive: there is no undo.**
           */
          rotate: (body?: T.ServerlessRotateRequest, params?: RequestOptions) =>
            call<T.ServerlessKey>("serverless.db.keys.rotate", { path: undefined, body: body, queryKeys: undefined, params }),
        },
        usage: {
          /**
           * Get the DB period's usage and billable line
           * Rows read/written and the storage peak against the plan for the period, the overage, the total in USD, and the daily series. `exec` (multi-statement DDL) does not report rows and is not metered, same as D1.
           * 
           * Scope: `serverless:read`
           */
          get: (params?: T.ServerlessDbUsageGetQuery & RequestOptions) =>
            call<T.ServerlessDbUsage>("serverless.db.usage.get", { path: undefined, body: undefined, queryKeys: ["period", "days"], params }),
        },
      },
      functions: {
        /**
         * Get the account's Serverless Functions
         * It takes no id: there is one Functions tenant per account. Returns the plan, its limits, how many functions are deployed, and the month's invocations. Deploys and invocations go through the service's data plane, not this API.
         * 
         * Scope: `serverless:read`
         */
        get: (params?: RequestOptions) =>
          call<T.ServerlessFunctions>("serverless.functions.get", { path: undefined, body: undefined, queryKeys: undefined, params }),
        keys: {
          /**
           * Rotate the Functions token
           * Issues a new `fnt_…` token and returns it, exactly once. With `grace_seconds` the previous token keeps working that long. Deployed functions keep serving through a rotation — the token only authenticates deploys and management, not the public invocation URLs.
           * 
           * Scope: `serverless:keys`
           * **Destructive: there is no undo.**
           */
          rotate: (body?: T.ServerlessRotateRequest, params?: RequestOptions) =>
            call<T.ServerlessKey>("serverless.functions.keys.rotate", { path: undefined, body: body, queryKeys: undefined, params }),
        },
        usage: {
          /**
           * Get the Functions period's usage and billable line
           * Invocations, errors and total execution time against the plan for the period, the overage, the total in USD, and the daily series.
           * 
           * Scope: `serverless:read`
           */
          get: (params?: T.ServerlessFunctionsUsageGetQuery & RequestOptions) =>
            call<T.ServerlessFunctionsUsage>("serverless.functions.usage.get", { path: undefined, body: undefined, queryKeys: ["period", "days"], params }),
        },
      },
      kv: {
        /**
         * Get the account's Serverless KV
         * It takes no id: there is one KV tenant per account. Returns the plan, its limits, and the month's usage. If the account does not have the service, it returns 404.
         * 
         * Scope: `serverless:read`
         */
        get: (params?: RequestOptions) =>
          call<T.ServerlessKv>("serverless.kv.get", { path: undefined, body: undefined, queryKeys: undefined, params }),
        keys: {
          /**
           * Create an additional KV token
           * Mints a new `kvt_…` token **without invalidating the existing ones** — KV is the only primitive that supports several live tokens per tenant (one per app or environment). The token is returned exactly once: only its hash is stored.
           * 
           * It does not work against this API: it authenticates the data plane at `{api_endpoint}/v1/ns/…`. It requires `serverless:keys` because holding it **is** the ability to read, write and bill against the account's tenant.
           * 
           * Scope: `serverless:keys`
           */
          create: (params?: RequestOptions) =>
            call<T.ServerlessKey>("serverless.kv.keys.create", { path: undefined, body: undefined, queryKeys: undefined, params }),
          /**
           * Rotate the KV tokens
           * Issues a new token and returns it. **All** previous tokens of the tenant are affected: with `grace_seconds` they keep working that long; with `0` (the default) they die immediately. There is no going back.
           * 
           * Scope: `serverless:keys`
           * **Destructive: there is no undo.**
           */
          rotate: (body?: T.ServerlessRotateRequest, params?: RequestOptions) =>
            call<T.ServerlessKey>("serverless.kv.keys.rotate", { path: undefined, body: body, queryKeys: undefined, params }),
        },
        usage: {
          /**
           * Get the KV period's usage and billable line
           * Reads, writes and the storage peak against the plan for the period, the overage, the total in USD, and the daily series. On a hard-capped plan (`included.hard_cap`) the overage is never billed: the service stops at the quota instead.
           * 
           * Scope: `serverless:read`
           */
          get: (params?: T.ServerlessKvUsageGetQuery & RequestOptions) =>
            call<T.ServerlessKvUsage>("serverless.kv.usage.get", { path: undefined, body: undefined, queryKeys: ["period", "days"], params }),
        },
      },
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
    wordpress: {
      /**
       * Get a one-time login URL to wp-admin
       * Logs in as the first administrator without a password. **Single use, short-lived** (`expires_in_seconds`). It is a POST because the URL is a credential: it is not cached, not replayed by `Idempotency-Key`, and it enters the audit log. Requires `wordpress:console`.
       * 
       * Scope: `wordpress:console`
       */
      autologin: (id: string, params?: RequestOptions) =>
        call<T.WordpressAutologin>("wordpress.autologin", { path: { id }, body: undefined, queryKeys: undefined, params }),
      backups: {
        /**
         * Create a backup now
         * Database and files. Counts against the daily manual-backup allowance of the plan (`429 rate_limited` when exceeded) and its storage quota (`429 quota_exceeded`). One at a time per site (`409`). The operation carries the `backup_id` in `result`.
         * 
         * Scope: `wordpress:write`
         * Returns an asynchronous operation; await it with `operations.wait()`.
         */
        create: (id: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.backups.create", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Delete a backup
         * **Irreversible.** Scheduled backups are also pruned by the retention policy; you rarely need this.
         * 
         * Scope: `wordpress:write`
         * **Destructive: there is no undo.**
         */
        delete: (id: string, backupId: string, params?: RequestOptions) =>
          call<void>("wordpress.backups.delete", { path: { id, backup_id: backupId }, body: undefined, queryKeys: undefined, params }),
        /**
         * Get a temporary download URL for a backup
         * The archive may have to be rebuilt from cold storage first, which can take a minute. It is a POST because the URL is a credential: it is not cached and it enters the audit log.
         * 
         * Scope: `wordpress:write`
         */
        download: (id: string, backupId: string, params?: RequestOptions) =>
          call<T.WordpressBackupDownload>("wordpress.backups.download", { path: { id, backup_id: backupId }, body: undefined, queryKeys: undefined, params }),
        /**
         * List the site's backups
         * Newest first. Scheduled and manual ones, wherever they are stored.
         * 
         * Scope: `wordpress:read`
         */
        list: (id: string, params?: T.WordpressBackupsListQuery & RequestOptions) =>
          call<T.WordpressBackupList>("wordpress.backups.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `wordpress.backups.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: T.WordpressBackupsListQuery & RequestOptions) =>
          paginate<T.WordpressBackup>(
            "wordpress.backups.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Restore a backup
         * **Destructive**: overwrites the database and the files with the backup. Everything changed since it was taken is lost. Take a fresh backup first if in doubt.
         * 
         * Scope: `wordpress:write`
         * **Destructive: there is no undo.**
         * Returns an asynchronous operation; await it with `operations.wait()`.
         */
        restore: (id: string, backupId: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.backups.restore", { path: { id, backup_id: backupId }, body: undefined, queryKeys: undefined, params }),
        settings: {
          /**
           * Get the backup schedule
           * 
           * Scope: `wordpress:read`
           */
          get: (id: string, params?: RequestOptions) =>
            call<T.WordpressBackupSettings>("wordpress.backups.settings.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
          /**
           * Change the backup schedule
           * `retention_days` is clamped to the range the plan allows; the response shows what was applied.
           * 
           * Scope: `wordpress:write`
           */
          update: (id: string, body: T.WordpressBackupsSettingsUpdateBody, params?: RequestOptions) =>
            call<T.WordpressBackupSettings>("wordpress.backups.settings.update", { path: { id }, body: body, queryKeys: undefined, params }),
        },
      },
      cache: {
        /**
         * Flush every cache
         * Object cache (Redis), page cache and the CDN edge if enabled. Harmless: the caches rebuild on the next visits.
         * 
         * Scope: `wordpress:write`
         */
        flush: (id: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.cache.flush", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
      cdn: {
        /**
         * Disable the media CDN
         * 
         * Scope: `wordpress:write`
         */
        disable: (id: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.cdn.disable", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Enable the media CDN
         * Serves uploads from the edge with on-the-fly image optimization. Media URLs are rewritten on the frontend only.
         * 
         * Scope: `wordpress:write`
         */
        enable: (id: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.cdn.enable", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Get the CDN state
         * 
         * Scope: `wordpress:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.WordpressCdn>("wordpress.cdn.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Purge the CDN cache
         * 
         * Scope: `wordpress:write`
         */
        purge: (id: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.cdn.purge", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
      cloudflare: {
        /**
         * Take your custom domains off Cloudflare
         * Removes the Cloudflare hostnames and goes back to per-domain certificates. Point your DNS at the site again.
         * 
         * Scope: `wordpress:write`
         */
        disable: (id: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.cloudflare.disable", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Put your custom domains behind Cloudflare
         * Registers each custom domain with Cloudflare and switches its certificate. The operation `result` lists, per domain, the DNS records to publish. Until they resolve, the domain keeps working as before.
         * 
         * Scope: `wordpress:write`
         */
        enable: (id: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.cloudflare.enable", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Get the Cloudflare state of every domain
         * Whether your custom domains go through Cloudflare (edge cache, DDoS protection, managed certificates) and the per-domain status. Only on sites whose `capabilities.cloudflare` is true.
         * 
         * Scope: `wordpress:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.WordpressCloudflare>("wordpress.cloudflare.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
        records: {
          /**
           * Get the DNS records a Cloudflare-enabled domain needs
           * Re-fetches the records and the current verification status from Cloudflare. Use it to check progress after publishing them.
           * 
           * Scope: `wordpress:read`
           */
          get: (id: string, params?: T.WordpressCloudflareRecordsGetQuery & RequestOptions) =>
            call<T.WordpressCloudflareRecords>("wordpress.cloudflare.records.get", { path: { id }, body: undefined, queryKeys: ["domain"], params }),
        },
      },
      core: {
        updates: {
          /**
           * Update WordPress core
           * Updates to the latest version WordPress offers and runs the database upgrade. Take a backup first.
           * 
           * Scope: `wordpress:write`
           */
          apply: (id: string, params?: RequestOptions) =>
            call<T.Operation>("wordpress.core.updates.apply", { path: { id }, body: undefined, queryKeys: undefined, params }),
          /**
           * Check for WordPress core updates
           * 
           * Scope: `wordpress:read`
           */
          list: (id: string, params?: RequestOptions) =>
            call<T.WordpressCoreUpdates>("wordpress.core.updates.list", { path: { id }, body: undefined, queryKeys: undefined, params }),
        },
      },
      cron: {
        /**
         * Unschedule a WP-Cron event
         * Removes every scheduled occurrence of the hook. A plugin may schedule it again.
         * 
         * Scope: `wordpress:write`
         * **Destructive: there is no undo.**
         */
        delete: (id: string, hook: string, params?: RequestOptions) =>
          call<void>("wordpress.cron.delete", { path: { id, hook }, body: undefined, queryKeys: undefined, params }),
        /**
         * List scheduled WP-Cron events
         * 
         * Scope: `wordpress:read`
         */
        list: (id: string, params?: T.WordpressCronListQuery & RequestOptions) =>
          call<T.WordpressCronEventList>("wordpress.cron.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `wordpress.cron.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: T.WordpressCronListQuery & RequestOptions) =>
          paginate<T.WordpressCronEvent>(
            "wordpress.cron.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Run a WP-Cron event now
         * 
         * Scope: `wordpress:write`
         */
        run: (id: string, hook: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.cron.run", { path: { id, hook }, body: undefined, queryKeys: undefined, params }),
      },
      domains: {
        /**
         * Add a custom domain
         * Registers the domain, requests its certificate and — if it is the first custom domain — makes it the primary and rewrites the site URLs. The response says which DNS records to publish. By default the request fails if the domain does not point here yet; pass `force` to add it first and configure DNS afterwards.
         * 
         * Scope: `wordpress:write`
         */
        add: (id: string, body: T.WordpressDomainsAddBody, params?: RequestOptions) =>
          call<T.WordpressDomainAdded>("wordpress.domains.add", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * Remove a custom domain
         * The site stops answering on it. Its certificate is dropped. The platform hostname cannot be removed.
         * 
         * Scope: `wordpress:write`
         * **Destructive: there is no undo.**
         */
        delete: (id: string, domainId: string, params?: RequestOptions) =>
          call<void>("wordpress.domains.delete", { path: { id, domain_id: domainId }, body: undefined, queryKeys: undefined, params }),
        /**
         * List the site's domains
         * Includes the platform hostname the site was born with and every custom domain you added.
         * 
         * Scope: `wordpress:read`
         */
        list: (id: string, params?: RequestOptions) =>
          call<T.WordpressDomainList>("wordpress.domains.list", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Iterates **all** pages of `wordpress.domains.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: RequestOptions) =>
          paginate<T.WordpressDomain>(
            "wordpress.domains.list", { path: { id }, queryKeys: undefined, params },
          ),
        /**
         * Make a domain the primary
         * Rewrites `siteurl`/`home` and every URL in the database. An apex becomes `www.`: that is the canonical form.
         * 
         * Scope: `wordpress:write`
         */
        setPrimary: (id: string, domainId: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.domains.set_primary", { path: { id, domain_id: domainId }, body: undefined, queryKeys: undefined, params }),
        ssl: {
          /**
           * Retry certificate issuance for every domain
           * Clears failed certificate attempts and asks for them again. Use it after fixing DNS. Let's Encrypt allows 5 failures per hour per domain: do not loop on this.
           * 
           * Scope: `wordpress:write`
           */
          retry: (id: string, params?: RequestOptions) =>
            call<T.Operation>("wordpress.domains.ssl.retry", { path: { id }, body: undefined, queryKeys: undefined, params }),
        },
        /**
         * Check a domain's DNS
         * Resolves the domain (and `www.` for an apex) and says whether it points here, or why not.
         * 
         * Scope: `wordpress:read`
         */
        verify: (id: string, domainId: string, params?: RequestOptions) =>
          call<T.WordpressDomainVerification>("wordpress.domains.verify", { path: { id, domain_id: domainId }, body: undefined, queryKeys: undefined, params }),
      },
      email: {
        /**
         * Get how the site sends email
         * 
         * Scope: `wordpress:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.WordpressEmail>("wordpress.email.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * List recently sent emails
         * What `wp_mail()` sent in the last 7 days: recipient, subject and method. No bodies.
         * 
         * Scope: `wordpress:read`
         */
        log: (id: string, params?: T.WordpressEmailLogQuery & RequestOptions) =>
          call<T.WordpressEmailLogList>("wordpress.email.log", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Send a test email
         * Sends through the site's own mailer. `result.sent` says whether `wp_mail()` succeeded; a `false` is the diagnosis, not an error.
         * 
         * Scope: `wordpress:write`
         */
        test: (id: string, body: T.WordpressEmailTestBody, params?: RequestOptions) =>
          call<T.Operation>("wordpress.email.test", { path: { id }, body: body, queryKeys: undefined, params }),
      },
      /**
       * Get a WordPress site with its live state
       * Queries the node. If it does not respond, `live` comes back `null` instead of failing: a node hiccup should not stop you from reading the rest of the resource or its `capabilities`.
       * 
       * Scope: `wordpress:read`
       */
      get: (id: string, params?: RequestOptions) =>
        call<T.Wordpress>("wordpress.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      /**
       * List WordPress sites
       * Served from the database, without querying the node: `live` comes back `null`. Fetching it would cost one backend call per page item. For the live state of one site, use `GET /v1/wordpress/{id}`.
       * 
       * Scope: `wordpress:read`
       */
      list: (params?: T.WordpressListQuery & RequestOptions) =>
        call<T.WordpressList>("wordpress.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
      /**
       * Iterates **all** pages of `wordpress.list`, following the cursor on its own.
       * A `for await` over this never drops results by forgetting `next_cursor`.
       */
      listAll: (params?: T.WordpressListQuery & RequestOptions) =>
        paginate<T.Wordpress>(
          "wordpress.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
        ),
      logs: {
        /**
         * Get a log's last lines
         * 
         * Scope: `wordpress:read`
         */
        get: (id: string, params?: T.WordpressLogsGetQuery & RequestOptions) =>
          call<T.WordpressLogs>("wordpress.logs.get", { path: { id }, body: undefined, queryKeys: ["type", "lines"], params }),
      },
      monitoring: {
        /**
         * Run PageSpeed Insights
         * Runs Google PageSpeed Insights live for mobile and desktop: 10–30 s. Core Web Vitals included.
         * 
         * Scope: `wordpress:read`
         */
        pagespeed: (id: string, params?: RequestOptions) =>
          call<T.WordpressPagespeed>("wordpress.monitoring.pagespeed", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Get the auto-recovery state and history
         * The platform watches every site and repairs the common failures on its own (plugin fatals, stuck services). This is what it did to yours, and whether it gave up (`halted`).
         * 
         * Scope: `wordpress:read`
         */
        recovery: (id: string, params?: T.WordpressMonitoringRecoveryQuery & RequestOptions) =>
          call<T.WordpressRecovery>("wordpress.monitoring.recovery", { path: { id }, body: undefined, queryKeys: ["days"], params }),
      },
      php: {
        /**
         * Get PHP version and settings
         * 
         * Scope: `wordpress:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.WordpressPhp>("wordpress.php.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Restart PHP
         * Recycles the PHP workers and reloads the web server. No downtime; in-flight requests finish.
         * 
         * Scope: `wordpress:write`
         */
        restart: (id: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.php.restart", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Change PHP settings
         * Only the provided keys change. PHP reloads gracefully: no downtime.
         * 
         * Scope: `wordpress:write`
         */
        update: (id: string, body: T.WordpressPhpUpdateBody, params?: RequestOptions) =>
          call<T.Operation>("wordpress.php.update", { path: { id }, body: body, queryKeys: undefined, params }),
        version: {
          /**
           * Change the PHP version
           * Switches the interpreter and restarts PHP: a few seconds of errors while it comes back. Custom settings carry over.
           * 
           * Scope: `wordpress:write`
           */
          set: (id: string, body: T.WordpressPhpVersionSetBody, params?: RequestOptions) =>
            call<T.Operation>("wordpress.php.version.set", { path: { id }, body: body, queryKeys: undefined, params }),
        },
      },
      plugins: {
        /**
         * Activate a plugin
         * 
         * Scope: `wordpress:write`
         */
        activate: (id: string, slug: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.plugins.activate", { path: { id, slug }, body: undefined, queryKeys: undefined, params }),
        /**
         * Deactivate a plugin
         * 
         * Scope: `wordpress:write`
         */
        deactivate: (id: string, slug: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.plugins.deactivate", { path: { id, slug }, body: undefined, queryKeys: undefined, params }),
        /**
         * Delete a plugin
         * Removes its files. Its settings stay in the database, as WordPress does.
         * 
         * Scope: `wordpress:write`
         * **Destructive: there is no undo.**
         */
        delete: (id: string, slug: string, params?: RequestOptions) =>
          call<void>("wordpress.plugins.delete", { path: { id, slug }, body: undefined, queryKeys: undefined, params }),
        /**
         * Install a plugin
         * From wordpress.org by slug, or from an `https://` zip. Activates it unless `activate` is `false`.
         * 
         * Scope: `wordpress:write`
         */
        install: (id: string, body: T.WordpressPluginsInstallBody, params?: RequestOptions) =>
          call<T.Operation>("wordpress.plugins.install", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * List installed plugins
         * 
         * Scope: `wordpress:read`
         */
        list: (id: string, params?: T.WordpressPluginsListQuery & RequestOptions) =>
          call<T.WordpressExtensionList>("wordpress.plugins.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `wordpress.plugins.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: T.WordpressPluginsListQuery & RequestOptions) =>
          paginate<T.WordpressExtension>(
            "wordpress.plugins.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Search wordpress.org for plugins
         * 
         * Scope: `wordpress:read`
         */
        search: (id: string, params?: T.WordpressPluginsSearchQuery & RequestOptions) =>
          call<T.WordpressExtensionSearchList>("wordpress.plugins.search", { path: { id }, body: undefined, queryKeys: ["q"], params }),
        /**
         * Update a plugin
         * 
         * Scope: `wordpress:write`
         */
        update: (id: string, slug: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.plugins.update", { path: { id, slug }, body: undefined, queryKeys: undefined, params }),
        /**
         * Update every plugin with an update available
         * 
         * Scope: `wordpress:write`
         */
        updateAll: (id: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.plugins.update_all", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
      /**
       * Restart the site
       * Restarts the whole site (web server, PHP, database, cache): ~30 s of downtime. To reload PHP alone without downtime use `POST /v1/wordpress/{id}/php/restart`.
       * 
       * Scope: `wordpress:write`
       */
      restart: (id: string, params?: RequestOptions) =>
        call<T.Operation>("wordpress.restart", { path: { id }, body: undefined, queryKeys: undefined, params }),
      security: {
        blockedIps: {
          /**
           * Lift a lockout
           * 
           * Scope: `wordpress:write`
           */
          delete: (id: string, ipId: string, params?: RequestOptions) =>
            call<void>("wordpress.security.blocked_ips.delete", { path: { id, ip_id: ipId }, body: undefined, queryKeys: undefined, params }),
          /**
           * List IPs locked out for failed logins
           * 
           * Scope: `wordpress:read`
           */
          list: (id: string, params?: RequestOptions) =>
            call<T.WordpressBlockedIpList>("wordpress.security.blocked_ips.list", { path: { id }, body: undefined, queryKeys: undefined, params }),
          /**
           * Iterates **all** pages of `wordpress.security.blocked_ips.list`, following the cursor on its own.
           * A `for await` over this never drops results by forgetting `next_cursor`.
           */
          listAll: (id: string, params?: RequestOptions) =>
            paginate<T.WordpressBlockedIp>(
              "wordpress.security.blocked_ips.list", { path: { id }, queryKeys: undefined, params },
            ),
        },
        /**
         * Get the security status
         * Login protection counters and the result of the last integrity scan (core and wordpress.org plugins against official checksums).
         * 
         * Scope: `wordpress:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.WordpressSecurity>("wordpress.security.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Run an integrity scan now
         * Verifies core and wordpress.org plugins against their official checksums. The findings come in the operation `result`.
         * 
         * Scope: `wordpress:write`
         * Returns an asynchronous operation; await it with `operations.wait()`.
         */
        scan: (id: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.security.scan", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
      staging: {
        /**
         * Create a staging environment
         * A full copy of the site (database and files) on its own URL, with fixed resources. Takes a minute or two. The operation carries the clone in `result`.
         * 
         * Scope: `wordpress:write`
         * Returns an asynchronous operation; await it with `operations.wait()`.
         */
        create: (id: string, body?: T.WordpressStagingCreateBody, params?: RequestOptions) =>
          call<T.Operation>("wordpress.staging.create", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * Delete a staging environment
         * **Irreversible**: the clone and its data are removed. Production is not touched.
         * 
         * Scope: `wordpress:write`
         * **Destructive: there is no undo.**
         */
        delete: (id: string, name: string, params?: RequestOptions) =>
          call<void>("wordpress.staging.delete", { path: { id, name }, body: undefined, queryKeys: undefined, params }),
        /**
         * List staging environments
         * 
         * Scope: `wordpress:read`
         */
        list: (id: string, params?: RequestOptions) =>
          call<T.WordpressStagingList>("wordpress.staging.list", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Iterates **all** pages of `wordpress.staging.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: RequestOptions) =>
          paginate<T.WordpressStaging>(
            "wordpress.staging.list", { path: { id }, queryKeys: undefined, params },
          ),
        /**
         * Push a staging environment to production
         * **Destructive**: copies the database and/or the files of the clone OVER the live site. Take a backup of production first.
         * 
         * Scope: `wordpress:write`
         * **Destructive: there is no undo.**
         * Returns an asynchronous operation; await it with `operations.wait()`.
         */
        push: (id: string, name: string, body?: T.WordpressStagingPushBody, params?: RequestOptions) =>
          call<T.Operation>("wordpress.staging.push", { path: { id, name }, body: body, queryKeys: undefined, params }),
      },
      /**
       * Get runtime state, health and resource usage
       * Health (installed, database reachable, pending updates) comes from a check the node runs every 15 minutes: `checked_at` says when. Resource usage is measured for this request.
       * 
       * Scope: `wordpress:read`
       */
      status: (id: string, params?: RequestOptions) =>
        call<T.WordpressStatus>("wordpress.status", { path: { id }, body: undefined, queryKeys: undefined, params }),
      themes: {
        /**
         * Activate a theme
         * 
         * Scope: `wordpress:write`
         */
        activate: (id: string, slug: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.themes.activate", { path: { id, slug }, body: undefined, queryKeys: undefined, params }),
        /**
         * Delete a theme
         * The active theme cannot be deleted: activate another one first.
         * 
         * Scope: `wordpress:write`
         * **Destructive: there is no undo.**
         */
        delete: (id: string, slug: string, params?: RequestOptions) =>
          call<void>("wordpress.themes.delete", { path: { id, slug }, body: undefined, queryKeys: undefined, params }),
        /**
         * Install a theme
         * From wordpress.org by slug, or from an `https://` zip. Does not activate it unless `activate` is `true`.
         * 
         * Scope: `wordpress:write`
         */
        install: (id: string, body: T.WordpressThemesInstallBody, params?: RequestOptions) =>
          call<T.Operation>("wordpress.themes.install", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * List installed themes
         * 
         * Scope: `wordpress:read`
         */
        list: (id: string, params?: T.WordpressThemesListQuery & RequestOptions) =>
          call<T.WordpressExtensionList>("wordpress.themes.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Iterates **all** pages of `wordpress.themes.list`, following the cursor on its own.
         * A `for await` over this never drops results by forgetting `next_cursor`.
         */
        listAll: (id: string, params?: T.WordpressThemesListQuery & RequestOptions) =>
          paginate<T.WordpressExtension>(
            "wordpress.themes.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Search wordpress.org for themes
         * 
         * Scope: `wordpress:read`
         */
        search: (id: string, params?: T.WordpressThemesSearchQuery & RequestOptions) =>
          call<T.WordpressExtensionSearchList>("wordpress.themes.search", { path: { id }, body: undefined, queryKeys: ["q"], params }),
        /**
         * Update a theme
         * 
         * Scope: `wordpress:write`
         */
        update: (id: string, slug: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.themes.update", { path: { id, slug }, body: undefined, queryKeys: undefined, params }),
        /**
         * Update every theme with an update available
         * 
         * Scope: `wordpress:write`
         */
        updateAll: (id: string, params?: RequestOptions) =>
          call<T.Operation>("wordpress.themes.update_all", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
      wpcli: {
        /**
         * Run a WP-CLI command
         * Runs `wp <command> <args…>` inside the site and returns `exit_code`, `output` and `error` in the operation `result` (output capped at 64 KB, `truncated: true` past it). A non-zero exit code is the command's result, not an API error. Only an allowlist of subcommands runs: no `eval`, no `shell`, no free-form `db query`, no global flags that change where it runs. Requires `wordpress:console`: WP-CLI is full access to the site and its database.
         * 
         * Scope: `wordpress:console`
         * **Destructive: there is no undo.**
         */
        run: (id: string, body: T.WordpressWpcliRunBody, params?: RequestOptions) =>
          call<T.Operation>("wordpress.wpcli.run", { path: { id }, body: body, queryKeys: undefined, params }),
      },
    },
  };
}

/** The resource tree, inferred. It is what `TruoClient` exposes. */
export type Resources = ReturnType<typeof createResources>;
