// ─────────────────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit by hand.
//
// It comes from packages/openapi/openapi/v1.json via packages/codegen.
// To change it: change the handler in the API (the Zod schemas are the source
// of truth), regenerate the spec there, 'bun run sync:spec' here, then 'bun run gen'.
// ─────────────────────────────────────────────────────────────────────────────

/** Contract types for `api.truo.cloud/v1` (OpenAPI 1.0.0). */

export type Capabilities = {
  object: "capabilities";
  api_version: string;
  brand: string;
  resources: string[];
  scopes: string[];
  /** These scopes exist only for sessions. No API key can hold them, not even under `*`. */
  scopes_never_grantable_to_keys: string[];
  limits: {
    max_page_size: number;
    default_page_size: number;
    rate_limits: Record<string, {
      per_key: number;
      per_account: number;
    }>;
  };
  features: Record<string, boolean>;
};

export type Error = {
  error: {
    /** The broad class of the error. */
    type: "authentication_error" | "authorization_error" | "invalid_request_error" | "rate_limit_error" | "api_error";
    /** The error's specific, stable identity. Never renamed. */
    code: string;
    /** A prose explanation, safe to display. */
    message: string;
    /** The field that failed, in dot notation. */
    param: string | null;
    request_id: string;
    required_scope?: string;
    retry_after?: number;
    /** Per-field detail when `code` is `validation_failed`. */
    errors?: ({
      param: string;
      message: string;
    })[];
  };
};

export type Account = {
  object: "account";
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  country: string | null;
  status: string | null;
  /** Credit balance, in the account's currency. */
  credit: number | null;
  credential: {
    object: "credential";
    id: string | null;
    type: "api_key" | "session";
    scopes: string[];
    /** Empty = the credential reaches every service in the account. */
    service_allowlist: string[];
    /** true when the user who owns the credential is the account owner. */
    is_owner: boolean;
    rate_limit_tier: string | null;
  };
};

export type ApiKey = {
  object: "api_key";
  id: string;
  name: string | null;
  token_prefix: string | null;
  token_last4: string | null;
  scopes: string[];
  /** Empty = the key reaches every service in the account. */
  service_allowlist: string[];
  rate_limit_tier: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string | null;
  revoked_at: string | null;
};

export type ApiKeyList = {
  object: "list";
  data: ApiKey[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type ApiKeyCreated = ApiKey & {
  /**
   * The plaintext token. **Shown only once**: it is never stored, only its SHA-256 hash. If it is lost, create a new key.
   */
  token: string;
};

export type ApiKeyCreate = {
  name: string;
  /**
   * Concrete scopes. `*` is not accepted: enumerate what the key needs. `apikeys:*` and `users:*` are not grantable.
   */
  scopes: string[];
  /** Restricts the key to these services. Omitted or empty = the whole account. */
  service_allowlist?: string[];
  /** Expiration in ISO 8601. Without it, the key never expires. */
  expires_at?: string;
};

export type ApiKeyUpdate = {
  name?: string;
  /** Can only be **narrowed**. Widening returns 403. */
  scopes?: string[];
  /** Can only be narrowed: an unrestricted key can gain a restriction, never lose one. */
  service_allowlist?: string[];
};

export type Service = {
  object: "service";
  id: string;
  /**
   * The service's family. It determines which resource manages it. `other` is a real product in the account that has no dedicated resource in v1 yet.
   */
  family: "vps" | "dns" | "dbaas" | "caas" | "lb" | "objectstorage" | "mailgateway" | "other";
  status: "active" | "pending" | "suspended" | "terminated" | "cancelled" | "fraud" | "unknown";
  /** The product's name in the catalog. */
  name: string | null;
  /** The service's label: domain, hostname, or an identifier the customer set. */
  label: string | null;
  primary_ip: string | null;
  billing_cycle: string | null;
  next_due_date: string | null;
  created_at: string | null;
  /**
   * This service's actual capabilities. Requesting an operation whose capability is `false` returns 400 `unsupported_for_product`.
   */
  capabilities: Record<string, boolean>;
};

export type ServiceList = {
  object: "list";
  data: Service[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type Operation = {
  object: "operation";
  id: string;
  type: string;
  status: "pending" | "running" | "succeeded" | "failed";
  progress: number | null;
  /** The resource the operation runs against. */
  resource: {
    object: string;
    id: string;
  } | null;
  /** The result payload. Its shape depends on `type`. */
  result?: unknown;
  /** Failure detail when `status` is `failed`. */
  error?: unknown;
  /**
   * true when the backend could not be reached and this is the last known state. Retry: the operation was not lost.
   */
  stale?: boolean;
  created_at: string | null;
  completed_at: string | null;
};

export type OperationList = {
  object: "list";
  data: Operation[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type AuditLog = {
  object: "audit_log";
  id: string;
  request_id: string;
  method: string;
  /** The route template, not the concrete path. Aggregatable by definition. */
  route: string;
  path: string;
  status: number;
  error_code: string | null;
  scope_required: string | null;
  credential_id: string | null;
  /** `api`, `cli`, or `mcp`. */
  via: string | null;
  ip: string | null;
  duration_ms: number | null;
  created_at: string | null;
};

export type AuditLogList = {
  object: "list";
  data: AuditLog[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type Vps = {
  object: "vps";
  id: string;
  status: "active" | "pending" | "suspended" | "terminated" | "cancelled" | "fraud" | "unknown";
  hostname: string | null;
  /** `qemu` = full virtualization (KVM). `lxc` = container. */
  type: "qemu" | "lxc";
  /** The physical node. Informational: it changes if we migrate the VM and is not addressable. */
  node: string | null;
  vmid: number | null;
  primary_ip: string | null;
  /**
   * The machine's actual state. Distinct from `status`, which is the **contract** state in billing: an `active` VPS can be `stopped` because the customer powered it off.
   */
  state: "running" | "stopped" | "paused" | "unknown";
  uptime_seconds: number | null;
  cpu: ({
    cores: number | null;
    usage_percent: number | null;
  }) | null;
  memory: ({
    used_bytes: number | null;
    total_bytes: number | null;
  }) | null;
  disk: ({
    used_bytes: number | null;
    total_bytes: number | null;
  }) | null;
  /** A reinstall is in progress. Power operations fail while it lasts. */
  reinstalling: boolean;
  /**
   * Which `/v1` endpoints respond for THIS VPS. A capability set to `false` returns `400 unsupported_for_product`; it is not a transient error and retrying does not help.
   */
  capabilities: Record<string, boolean>;
};

export type VpsList = {
  object: "list";
  data: Vps[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type VpsConfig = {
  object: "vps_config";
  vmid: number | null;
  node: string | null;
  /** `qemu` = full virtualization (KVM). `lxc` = container. */
  type: "qemu" | "lxc";
  cores: number | null;
  memory_mb: number | null;
  /** The storage descriptor exactly as the hypervisor reports it. */
  boot_disk: string | null;
  os_type: string | null;
  hostname: string | null;
};

export type VpsMetricPoint = {
  time: string;
  cpu_percent: number | null;
  memory_bytes: number | null;
  disk_read_bytes: number | null;
  disk_write_bytes: number | null;
  net_in_bytes: number | null;
  net_out_bytes: number | null;
};

export type VpsMetrics = {
  object: "vps_metrics";
  timeframe: "hour" | "day" | "week" | "month" | "year";
  data: VpsMetricPoint[];
};

export type VpsIp = {
  object: "vps_ip";
  version: 4 | 6;
  address: string | null;
  netmask: string | null;
  gateway: string | null;
  prefix: string | null;
};

export type VpsIpList = {
  object: "list";
  data: VpsIp[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type VpsTemplate = {
  object: "vps_template";
  /** Pass it as `template` in the reinstall. */
  id: string;
  name: string;
  /** `qemu` = full virtualization (KVM). `lxc` = container. */
  type: "qemu" | "lxc";
  storage: string | null;
};

export type VpsTemplateList = {
  object: "list";
  data: VpsTemplate[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type ConsoleTicket = {
  object: "console_ticket";
  type: "vnc" | "spice";
  /** noVNC: open it in the browser. */
  url: string | null;
  /**
   * SPICE: the `.vv` contents for `remote-viewer`. **It is a credential**: it grants full access to the operating system. Do not log it or store it.
   */
  file: string | null;
  filename: string | null;
};

export type VpsBackup = {
  object: "vps_backup";
  id: string;
  size_bytes: number | null;
  format: string | null;
  storage: string | null;
  created_at: string | null;
};

export type VpsBackupList = {
  object: "list";
  data: VpsBackup[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type DnsZone = {
  object: "dns_zone";
  id: string;
  /** The service backing the zone. For billing and support only. */
  service: string;
  status: "active" | "pending" | "suspended" | "terminated" | "cancelled" | "fraud" | "unknown";
  record_count: number | null;
  serial: string | null;
};

export type DnsZoneList = {
  object: "list";
  data: DnsZone[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type DnsZoneExport = {
  object: "dns_zone_export";
  zone: string;
  format: "bind";
  content: string;
};

export type DnsRecord = {
  object: "dns_record";
  id: string;
  /** FQDN without the trailing dot. */
  name: string;
  /** The `SOA` and the delegation `NS` are managed by the platform and cannot be edited. */
  type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SRV" | "CAA" | "PTR";
  ttl: number;
  /**
   * All the RRset's values. For `MX` they include the priority (`10 mail.example.com`); for `SRV`, priority, weight, and port.
   */
  values: string[];
};

export type DnsRecordList = {
  object: "list";
  data: DnsRecord[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type Dbaas = {
  object: "dbaas";
  id: string;
  status: "active" | "pending" | "suspended" | "terminated" | "cancelled" | "fraud" | "unknown";
  /**
   * The engine's actual state. Distinct from `status`, which is the **contract** state in billing: an `active` service can be `provisioning` for its first few minutes.
   */
  state: "running" | "stopped" | "provisioning" | "error" | "unknown";
  /** The engine: `mysql`, `postgresql`, `mongodb`, `valkey` (or the historical `redis`). */
  engine: string | null;
  engine_version: string | null;
  host: string | null;
  port: number | null;
  /** The physical node. Informational and not addressable; `null` on the shared tier. */
  node: string | null;
  region: string | null;
  plan: ({
    cpu_cores: number | null;
    ram_mb: number | null;
    storage_gb: number | null;
  }) | null;
  created_at: string | null;
  /**
   * Which `/v1` endpoints respond for THIS service. A capability set to `false` returns `400 unsupported_for_product`: it is not transient and retrying does not help. An **absent** key is different from `false` — it means it was not queried (see the listing).
   */
  capabilities: Record<string, boolean>;
};

export type DbaasList = {
  object: "list";
  data: Dbaas[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type DbaasConnection = {
  object: "dbaas_connection";
  /** The engine: `mysql`, `postgresql`, `mongodb`, `valkey` (or the historical `redis`). */
  engine: string | null;
  host: string | null;
  port: number | null;
  /** The default database. `null` on services where the admin picks one on connect. */
  database: string | null;
  /** The engine's admin user. */
  username: string | null;
  /** The TLS mode in the engine's vocabulary (`verify-ca`, `VERIFY_CA`, `rediss`). */
  sslmode: string | null;
  /**
   * The service CA's PEM, for `sslrootcert`/`--ssl-ca`. It is **public**: it verifies the server, it does not grant access.
   */
  ca_cert: string | null;
};

export type DbaasCredential = {
  object: "dbaas_credential";
  username: string | null;
  /**
   * The admin password, in plaintext. **It is full access to the data**: do not log it, do not store it in a shared configuration file, and do not pass it on the command line. No URI is returned: a URI with the credential inside ends up in shell history and in the logs of whatever process receives it.
   */
  password: string | null;
  host: string | null;
  port: number | null;
  database: string | null;
};

/**
 * Which fields are populated depends on the service's backend: some measure the **container** (CPU, memory, disk) and others the **engine** (connections, size, uptime). A `null` means "not measured here", not zero.
 */
export type DbaasStats = {
  object: "dbaas_stats";
  cpu_percent: number | null;
  memory_used_bytes: number | null;
  memory_total_bytes: number | null;
  disk_used_bytes: number | null;
  disk_total_bytes: number | null;
  connections: number | null;
  max_connections: number | null;
  uptime_seconds: number | null;
  database_count: number | null;
  total_size_bytes: number | null;
};

export type DbaasLogs = {
  object: "dbaas_logs";
  /** Oldest to newest, as the engine returns them. */
  lines: string[];
};

export type DbaasDatabase = {
  object: "dbaas_database";
  id: string;
  name: string;
  owner: string | null;
  size_bytes: number | null;
  /** Tables (or collections in MongoDB). `null` when the engine does not report it. */
  table_count: number | null;
};

export type DbaasDatabaseList = {
  object: "list";
  data: DbaasDatabase[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type DbaasUser = {
  object: "dbaas_user";
  id: string;
  username: string;
  /** MySQL only: where the user can connect from. `%` means any origin. */
  host: string | null;
  can_login: boolean | null;
  can_create_db: boolean | null;
};

export type DbaasUserList = {
  object: "list";
  data: DbaasUser[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type DbaasBackup = {
  object: "dbaas_backup";
  id: string;
  /** `full`, `diff`, `incr`, `manual`… */
  type: string | null;
  size_bytes: number | null;
  /** `local`, `s3`, or `both`. */
  location: string | null;
  created_at: string | null;
};

export type DbaasBackupList = {
  object: "list";
  data: DbaasBackup[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type Caas = {
  object: "caas";
  id: string;
  status: "active" | "pending" | "suspended" | "terminated" | "cancelled" | "fraud" | "unknown";
  /** The service's identifier. */
  label: string | null;
  primary_ip: string | null;
  /**
   * Provisioning progress. Distinct from `status`, which is the **contract** state in billing: a service that is `active` in billing can still be `provisioning` here. Until it is `active`, the app endpoints return `400 unsupported_for_product`.
   */
  provisioning_state: "draft" | "provisioning" | "active" | "suspended" | "terminated" | "error" | "unknown";
  /**
   * The machine running the service. `null` in the listing and also when it does not exist yet — a freshly purchased service has no machine until provisioning finishes.
   */
  machine: ({
    state: "running" | "stopped" | "unknown";
    uptime_seconds: number | null;
  }) | null;
  /**
   * Which `/v1` endpoints respond for THIS service. A capability set to `false` returns `400 unsupported_for_product`; it is not a transient error and retrying does not help.
   */
  capabilities: Record<string, boolean>;
};

export type CaasList = {
  object: "list";
  data: Caas[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

/**
 * The code source. It comes back `null` in the listing —the backend does not include it there— and also when the app was created without a configured source. Use `GET /v1/caas/{id}/apps/{app_id}`.
 */
export type CaasAppSource = ({
  /** `other` = the source was configured outside this API and cannot be represented here. */
  type: "git" | "docker_image" | "other";
  /** The repository URL, or the image reference (`nginx:1.27`). */
  ref: string | null;
  branch: string | null;
}) | null;

export type CaasApp = {
  object: "caas_app";
  id: string;
  name: string;
  /**
   * The outcome of the **latest deployment**. It is not a health check: a `deployed` does not guarantee the process is still alive right now. `idle` = never deployed since creation.
   */
  status: "idle" | "deploying" | "deployed" | "error" | "unknown";
  source: CaasAppSource;
};

export type CaasAppList = {
  object: "list";
  data: CaasApp[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type CaasDeployment = {
  object: "caas_deployment";
  id: string;
  status: "running" | "succeeded" | "failed" | "unknown";
  created_at: string | null;
};

export type CaasDeploymentList = {
  object: "list";
  data: CaasDeployment[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type CaasLogs = {
  object: "caas_logs";
  app: string;
  /** Output exactly as the app emits it, with line breaks. It can come back empty. */
  content: string;
};

export type CaasEnvVar = {
  object: "caas_env_var";
  key: string;
};

export type CaasEnvVarList = {
  object: "list";
  data: CaasEnvVar[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type CaasDomain = {
  object: "caas_domain";
  host: string;
  https: boolean;
  /**
   * Which issuer is configured, **not** whether the certificate was already issued: issuance is asynchronous, with no state or id to query. It comes back `null` in the creation response, because at that point there is no certificate yet. The only real check that the domain is serving is an HTTPS request to the host.
   */
  certificate_type: "none" | "letsencrypt" | "custom" | "unknown";
};

export type CaasDomainList = {
  object: "list";
  data: CaasDomain[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type CaasDatabase = {
  object: "caas_database";
  id: string;
  engine: string;
  name: string;
  /**
   * The outcome of the **latest deployment**. It is not a health check: a `deployed` does not guarantee the process is still alive right now. `idle` = never deployed since creation.
   */
  status: "idle" | "deploying" | "deployed" | "error" | "unknown";
};

export type CaasDatabaseList = {
  object: "list";
  data: CaasDatabase[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type LoadBalancer = {
  object: "load_balancer";
  id: string;
  status: "active" | "pending" | "suspended" | "terminated" | "cancelled" | "fraud" | "unknown";
  /**
   * Provisioning progress. Distinct from `status`, which is the **contract** state in billing. Until it is `active`, writing listeners returns `400 unsupported_for_product`.
   */
  provisioning_state: "draft" | "provisioning" | "active" | "suspended" | "terminated" | "error" | "unknown";
  /** The balancer's stable name. Point your DNS records here, not at the IP. */
  hostname: string | null;
  /**
   * The IP traffic enters through. It can move to another machine on failure: that is part of how the service recovers, which is why it is not what belongs in DNS.
   */
  public_ip: string | null;
  /**
   * Is the balancer responding? `null` = could not be verified, which is different from `false`: it happens while provisioning. It says nothing about the health of your backends — that is in `GET /v1/load-balancers/{id}/stats`.
   */
  healthy: boolean | null;
  listener_count: number | null;
  /**
   * Which `/v1` endpoints respond for THIS service. A capability set to `false` returns `400 unsupported_for_product`.
   */
  capabilities: Record<string, boolean>;
};

export type LoadBalancerList = {
  object: "list";
  data: LoadBalancer[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type LbListener = {
  object: "lb_listener";
  id: string;
  name: string;
  /**
   * `tcp` balances at the connection level and works for any protocol. `http` understands the request and is what enables routing by domain.
   */
  protocol: "http" | "tcp";
  port: number;
  /**
   * `passthrough` hands TLS to your backends intact. `terminate` decrypts it at the balancer —requires `protocol: http` and `domain`— and traffic to your backends travels in plaintext over the internal network.
   */
  tls: "none" | "passthrough" | "terminate";
  domain: string | null;
  /**
   * `source` always sends each origin IP to the same backend: it is what you use when the application keeps sessions in memory.
   */
  algorithm: "roundrobin" | "leastconn" | "source";
  health_check: {
    type: "tcp" | "http";
    path: string | null;
    interval_ms: number;
  };
  backends: ({
    ip: string;
    port: number;
    weight: number | null;
  })[];
};

export type LbListenerList = {
  object: "list";
  data: LbListener[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type LbBackend = {
  object: "lb_backend";
  id: string;
  listener: string;
  /** The backend's IP or hostname. */
  ip: string;
  port: number;
  /** Traffic share relative to the listener's other backends. Defaults to 1. */
  weight: number | null;
};

export type LbBackendList = {
  object: "list";
  data: LbBackend[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type LbStats = {
  object: "lb_stats";
  listeners: ({
    listener: string;
    protocol: "http" | "tcp" | "unknown";
    port: number | null;
    state: "up" | "down" | "unknown";
    /** Connections in flight. */
    sessions: number;
    bytes_in: number;
    bytes_out: number;
    backends: ({
      /** The backend as declared, in `host:port` form. */
      target: string;
      health: "healthy" | "unhealthy" | "unknown";
    })[];
  })[];
};

export type ObjectStorage = {
  object: "object_storage";
  service: string | null;
  status: "active" | "suspended" | "error";
  /** The S3 endpoint. Configure your client with `addressing_style=path`. */
  endpoint: string;
  storage_bytes: number;
  objects: number;
  buckets: number;
  /** Downloaded in the last 30 days. */
  egress_used_bytes: number;
  /** The period's included egress, derived from the storage in use. */
  egress_included_bytes: number;
  requests_30d: number;
};

export type StorageBucket = {
  object: "storage_bucket";
  id: string;
  name: string;
  /**
   * `public` publishes the bucket at a read-only URL (`public_url`). `private` withdraws it: objects remain accessible with a key or a presigned URL.
   */
  access: "private" | "public";
  objects: number;
  size_bytes: number;
  /** The anonymous read base URL. `null` while the bucket is private. */
  public_url: string | null;
  /** Null for a bucket created by a direct S3 client, which has no registry row. */
  created_at: string | null;
};

export type StorageBucketList = {
  object: "list";
  data: StorageBucket[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type StorageDeletion = {
  object: "storage_deletion";
  bucket: string;
  /** Objects actually deleted. */
  deleted: number;
};

export type StorageBucketMetrics = {
  object: "storage_bucket_metrics";
  bucket: string;
  range: "7d" | "30d" | "90d";
  storage_bytes: number;
  /** Difference against the first snapshot in the range. Negative if the bucket shrank. */
  storage_delta_bytes: number;
  objects: number;
  objects_delta: number;
  egress_used_bytes: number;
  egress_included_bytes: number;
  /** Always 30 days, regardless of `range`. */
  requests_30d: number;
  /** Reads as a percentage of the range's total requests. */
  get_pct: number;
  /** One point per UTC day. Empty until there are snapshots. */
  storage_series: ({
    date: string;
    bytes: number;
  })[];
  /** One point per UTC day. Empty if there was no traffic in the range. */
  requests_series: ({
    date: string;
    get: number;
    put: number;
  })[];
  /** How much left through the edge cache versus the origin. */
  egress_by_origin: ({
    label: string;
    bytes: number;
  })[];
};

export type StorageObject = {
  object: "storage_object";
  id: string;
  /** Relative to the bucket. Folders end in `/`. */
  key: string;
  /** The key's last segment. */
  name: string;
  /**
   * A folder is not an object: it is a shared prefix. It is listed for navigation, and has no size or date.
   */
  is_folder: boolean;
  /** Inferred from the extension, not read from the object. */
  content_type: string | null;
  size_bytes: number | null;
  last_modified: string | null;
};

export type StorageObjectList = {
  object: "list";
  data: StorageObject[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type StoragePresignedUrl = {
  object: "storage_presigned_url";
  url: string;
  method: "GET" | "PUT";
  expires_in: number;
  expires_at: string | null;
};

export type StorageAccessKey = {
  object: "storage_access_key";
  /** Currently equal to `access_key_id`; still treat it as the resource's identifier. */
  id: string;
  name: string;
  /** What goes in the S3 client. */
  access_key_id: string;
  /** The bucket the key is limited to, or `*` for all. */
  scope: string;
  /**
   * `read` only downloads, `readwrite` uploads and deletes, `full` adds bucket management through the S3 protocol.
   */
  permission: "read" | "readwrite" | "full";
  created_at: string | null;
  last_used: string | null;
};

export type StorageAccessKeyList = {
  object: "list";
  data: StorageAccessKey[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type StorageAccessKeyWithSecret = StorageAccessKey & {
  /**
   * Appears **exactly once**, in this response. It is not stored in plaintext on our side and no endpoint recovers it: if it is lost, the way out is to issue another key and rotate the application.
   */
  secret_access_key: string;
};

export type MailGatewayUsage = {
  object: "mail_gateway_usage";
  /** The current UTC calendar month, `YYYY-MM`. It is the period that gets billed. */
  period: string;
  /** Sends accepted during the period. */
  sends: number;
  /**
   * Sends rejected by the gateway before reaching SES (unverified domain, suspended tenant, invalid payload). They are not billed.
   */
  rejected: number;
};

export type MailGateway = {
  object: "mail_gateway";
  id: string;
  status: "active" | "suspended" | "deprovisioned" | "unknown";
  plan: string | null;
  /**
   * Where sending happens. Sending does NOT go through this API: it goes against this endpoint with an API key from `POST /v1/mail-gateway/keys`.
   */
  api_endpoint: string;
  /**
   * The tenant's SES config set. It reports the delivery events that feed `/metrics` and `/messages`; `null` means the tenant has no metrics yet.
   */
  config_set: string | null;
  domain_count: number;
  /** Active and revoked API keys. */
  key_count: number;
  usage_month: MailGatewayUsage;
  created_at: string | null;
};

export type MailGatewayMetrics = {
  object: "mail_gateway_metrics";
  range: "7d" | "30d" | "90d";
  sends: number;
  /**
   * Change versus the previous period, as a fraction (`0.12` = +12%). `null` when the previous period had no sends: dividing by zero is not a 0%.
   */
  sends_delta_pct: number | null;
  /** A 0–1 fraction, not a percentage. */
  delivery_rate: number;
  open_rate: number;
  bounce_rate: number;
  complaint_rate: number;
  /**
   * The SES bounce threshold. Crossing it puts the whole platform's sending reputation at risk, so the gateway suspends before getting there.
   */
  bounce_rate_limit: number;
  complaint_rate_limit: number;
  complaints: number;
  /** The daily series for the range. */
  series: ({
    /** Start of the UTC day, ISO 8601. */
    date: string | null;
    sends: number;
    opens: number;
    bounces: number;
  })[];
  /** Empty when there were no deliveries in the range. */
  latency: ({
    /** The measured stage. Currently only `send_to_delivery`. */
    stage: string;
    p50_seconds: number;
    p95_seconds: number;
    p99_seconds: number;
  })[];
  by_domain: ({
    domain: string;
    sends: number;
    delivery_rate: number;
    open_rate: number;
    bounce_rate: number;
  })[];
};

export type MailGatewayDnsRecord = {
  /** What the record is for. Current values: `dkim`, `spf`, `mail_from_mx`, `mail_from_spf`, `dmarc`. */
  purpose: string;
  type: string;
  /** The record's full name, without the trailing dot. */
  host: string;
  value: string;
  /**
   * `info` = nothing verifies it, but publishing it improves deliverability. `pending` = SES has not seen it yet.
   */
  status: "pending" | "verified" | "info" | "unknown";
};

export type MailGatewayDomain = {
  object: "mail_gateway_domain";
  id: string;
  domain: string;
  status: "pending" | "verified" | "failed" | "unknown";
  verified_at: string | null;
  /** The records that must be published in the domain's zone. */
  records: MailGatewayDnsRecord[];
};

export type MailGatewayDomainList = {
  object: "list";
  data: MailGatewayDomain[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type MailGatewayMessage = {
  object: "mail_gateway_message";
  id: string;
  recipient: string | null;
  subject: string | null;
  status: "queued" | "delivered" | "opened" | "deferred" | "bounced" | "complained" | "unknown";
  /** The `mg-category` tag set on the send, if any was set. */
  category: string | null;
  from_domain: string | null;
  /** The time of the message's latest event, not of the send. */
  occurred_at: string | null;
};

export type MailGatewayMessageList = {
  object: "list";
  data: MailGatewayMessage[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type MailGatewayKey = {
  object: "mail_gateway_key";
  id: string;
  /** A display prefix, to recognize the key without seeing it whole. */
  hint: string | null;
  status: "active" | "revoked" | "unknown";
  /**
   * The full key. **Only present in the creation response, exactly once**: we store this key's hash, so there is no way to recover it later — not even for us. In the listing it is always `null`.
   */
  secret: string | null;
  /** Where this key is used: `POST {api_endpoint}/emails`. */
  api_endpoint: string;
  created_at: string | null;
};

export type MailGatewayKeyList = {
  object: "list";
  data: MailGatewayKey[];
  has_more: boolean;
  /**
   * Pass it as `cursor` for the next page. It is **opaque**: do not build it, do not parse it, and do not store it across versions.
   */
  next_cursor: string | null;
};

export type MailGatewaySmtp = {
  object: "mail_gateway_smtp";
  host: string;
  /** SMTPS, implicit TLS from the greeting. There is no STARTTLS on 587. */
  port: number;
  username: string;
  /** `suspended` = SMTP sending is cut off, usually over reputation or unpaid bills. */
  status: "active" | "suspended" | "revoked" | "unknown";
  config_set: string | null;
};

export type MailGatewaySmtpCredentials = {
  object: "mail_gateway_smtp";
  host: string;
  /** SMTPS, implicit TLS from the greeting. There is no STARTTLS on 587. */
  port: number;
  username: string;
  /** `suspended` = SMTP sending is cut off, usually over reputation or unpaid bills. */
  status: "active" | "suspended" | "revoked" | "unknown";
  config_set: string | null;
  /** The SMTP password in plaintext. Treat it as a secret: it sends on your behalf. */
  password: string;
};

/** Query parameters of `GET /v1/api-keys`. */
export type ApiKeysListQuery = {
  limit?: string;
  cursor?: string;
};

/** Query parameters of `GET /v1/audit-logs`. */
export type AuditLogsListQuery = {
  limit?: string;
  cursor?: string;
  status?: string;
  deniedOnly?: string;
};

/** Body of `POST /v1/caas/{id}/apps`. */
export type CaasAppsCreateBody = {
  /** The app's display name. The backend derives an internal identifier from it. */
  name: string;
  /** Can be omitted and configured later, but an app without a source cannot be deployed. */
  source?: {
    type: "git" | "docker_image";
    /** The repository URL for `git`, the image reference for `docker_image`. */
    ref: string;
    /** `git` only. Defaults to `main`. */
    branch?: string;
  };
};

/** Query parameters of `GET /v1/caas/{id}/apps`. */
export type CaasAppsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Body of `POST /v1/caas/{id}/databases`. */
export type CaasDatabasesCreateBody = {
  engine: "postgres" | "mysql" | "mariadb" | "mongo" | "redis";
  name: string;
};

/** Query parameters of `GET /v1/caas/{id}/databases`. */
export type CaasDatabasesListQuery = {
  limit?: string;
  cursor?: string;
};

/** Query parameters of `GET /v1/caas/{id}/apps/{app_id}/deployments`. */
export type CaasDeploymentsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Body of `POST /v1/caas/{id}/apps/{app_id}/domains`. */
export type CaasDomainsCreateBody = {
  /**
   * It must resolve to the service's IP **before** you create it: the certificate is validated over HTTP, and without DNS pointed, issuance fails silently.
   */
  host: string;
};

/** Body of `PUT /v1/caas/{id}/apps/{app_id}/env`. */
export type CaasEnvReplaceBody = {
  /**
   * The **complete** set. Anything not listed here is deleted: sending `[]` leaves the app with no variables. Since `GET /env` returns no values, the whole set has to come from your side —your secrets manager or your configuration repository— which is how any declarative infrastructure works.
   */
  vars: ({
    key: string;
    /** Stored as-is. Never returned. */
    value: string;
  })[];
};

/** Query parameters of `GET /v1/caas`. */
export type CaasInstancesListQuery = {
  limit?: string;
  cursor?: string;
};

/** Query parameters of `GET /v1/dbaas/{id}/backups`. */
export type DbaasBackupsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Body of `POST /v1/dbaas/{id}/databases`. */
export type DbaasDatabasesCreateBody = {
  name: string;
  /** MySQL only. Defaults to `utf8mb4`. */
  charset?: string;
  /** MySQL only. Defaults to `utf8mb4_unicode_ci`. */
  collation?: string;
  /** PostgreSQL only. The user that owns the database; defaults to the admin. */
  owner?: string;
};

/** Query parameters of `GET /v1/dbaas/{id}/databases`. */
export type DbaasDatabasesListQuery = {
  limit?: string;
  cursor?: string;
};

/** Query parameters of `GET /v1/dbaas`. */
export type DbaasInstancesListQuery = {
  limit?: string;
  cursor?: string;
};

/** Query parameters of `GET /v1/dbaas/{id}/logs`. */
export type DbaasLogsGetQuery = {
  lines?: string;
};

/** Body of `POST /v1/dbaas/{id}/users`. */
export type DbaasUsersCreateBody = {
  username: string;
  /**
   * Never stored or returned: if it is lost, change it with `POST /v1/dbaas/{id}/users/{username}/password`.
   */
  password: string;
  /** MySQL only. Defaults to `%` (any origin). */
  host?: string;
  /** Databases the user is granted permissions on. */
  databases?: string[];
  /**
   * MySQL: SQL privileges (`SELECT`, `INSERT`, …); defaults to `ALL` over `databases`. PostgreSQL: the first one is used as the role (`readwrite`, `readonly`). One word per element: compound privileges (`ALL PRIVILEGES`) are rejected because the value ends up inside a `GRANT` the engine builds by concatenation.
   */
  privileges?: string[];
};

/** Query parameters of `DELETE /v1/dbaas/{id}/users/{username}`. */
export type DbaasUsersDeleteQuery = {
  host?: string;
};

/** Query parameters of `GET /v1/dbaas/{id}/users`. */
export type DbaasUsersListQuery = {
  limit?: string;
  cursor?: string;
};

/** Body of `POST /v1/dbaas/{id}/users/{username}/password`. */
export type DbaasUsersSetPasswordBody = {
  password: string;
};

/** Query parameters of `GET /v1/dns/zones/{zone}/records`. */
export type DnsRecordsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Body of `PATCH /v1/dns/zones/{zone}/records`. */
export type DnsRecordsPatchBody = {
  records: ({
    name: string;
    /** The `SOA` and the delegation `NS` are managed by the platform and cannot be edited. */
    type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SRV" | "CAA" | "PTR";
    /** Seconds, 60–604800. Defaults to 3600. */
    ttl?: number;
    /** An empty list = delete the RRset. */
    values: string[];
  })[];
};

/** Body of `PUT /v1/dns/zones/{zone}/records/{name}/{type}`. */
export type DnsRecordsPutBody = {
  /** Seconds, 60–604800. Defaults to 3600. */
  ttl?: number;
  /**
   * Replaces the **entire** RRset. Values not listed here are deleted: to add one, read the RRset, append it to the list, and send the full list.
   */
  values: string[];
};

/** Query parameters of `GET /v1/dns/zones`. */
export type DnsZonesListQuery = {
  limit?: string;
  cursor?: string;
};

/** Body of `POST /v1/load-balancers/{id}/backends`. */
export type LbBackendsCreateBody = {
  /** The name of an existing listener. */
  listener: string;
  ip: string;
  port: number;
  weight?: number;
};

/** Query parameters of `GET /v1/load-balancers`. */
export type LbInstancesListQuery = {
  limit?: string;
  cursor?: string;
};

/** Body of `PUT /v1/load-balancers/{id}/listeners`. */
export type LbListenersReplaceBody = {
  /**
   * The **complete** set. Anything not listed here is deleted, including its backends; sending `[]` leaves the balancer with nothing listening. Names and ports are unique within the set.
   */
  listeners: ({
    /** Identifies the listener within the service. Unique. */
    name: string;
    /**
     * `tcp` balances at the connection level and works for any protocol. `http` understands the request and is what enables routing by domain.
     */
    protocol: "http" | "tcp";
    /** The entry port. Unique within the service. */
    port: number;
    /** Defaults to `none`. */
    tls?: "none" | "passthrough" | "terminate";
    domain?: string;
    /** Defaults to `roundrobin`. */
    algorithm?: "roundrobin" | "leastconn" | "source";
    health_check?: {
      /** Defaults to `tcp`. */
      type?: "tcp" | "http";
      /** Required when `http`. */
      path?: string;
      /** How often each backend is probed. Defaults to 2000. */
      interval_ms?: number;
    };
    /** A listener without backends is not representable: at least one. */
    backends: ({
      /** IP or hostname. */
      ip: string;
      port: number;
      weight?: number;
    })[];
  })[];
};

/** Body of `POST /v1/mail-gateway/domains`. */
export type MailgatewayDomainsCreateBody = {
  /**
   * The sending domain. Normalized to lowercase. You must be able to edit its DNS: the creation call returns the records to publish.
   */
  domain: string;
};

/** Query parameters of `GET /v1/mail-gateway/domains`. */
export type MailgatewayDomainsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Query parameters of `GET /v1/mail-gateway/keys`. */
export type MailgatewayKeysListQuery = {
  limit?: string;
  cursor?: string;
};

/** Query parameters of `GET /v1/mail-gateway/messages`. */
export type MailgatewayMessagesListQuery = {
  limit?: string;
  cursor?: string;
  recipient?: string;
  days?: string;
};

/** Query parameters of `GET /v1/mail-gateway/metrics`. */
export type MailgatewayMetricsGetQuery = {
  range?: "7d" | "30d" | "90d";
};

/** Body of `POST /v1/object-storage/buckets`. */
export type ObjectstorageBucketsCreateBody = {
  name: string;
  /** Defaults to `private`. */
  access?: "private" | "public";
};

/** Query parameters of `DELETE /v1/object-storage/buckets/{bucket}`. */
export type ObjectstorageBucketsDeleteQuery = {
  purge?: "true" | "false";
};

/** Query parameters of `GET /v1/object-storage/buckets`. */
export type ObjectstorageBucketsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Query parameters of `GET /v1/object-storage/buckets/{bucket}/metrics`. */
export type ObjectstorageBucketsMetricsQuery = {
  range?: "7d" | "30d" | "90d";
};

/** Body of `PATCH /v1/object-storage/buckets/{bucket}`. */
export type ObjectstorageBucketsUpdateBody = {
  /**
   * `public` publishes the bucket at a read-only URL (`public_url`). `private` withdraws it: objects remain accessible with a key or a presigned URL.
   */
  access: "private" | "public";
};

/** Body of `POST /v1/object-storage/keys`. */
export type ObjectstorageKeysCreateBody = {
  /** To recognize it later. It has no effect on permissions. */
  name: string;
  /**
   * A bucket name to limit the key to, or `*` (the default) for all. One key per bucket is what keeps losing one from compromising the rest.
   */
  scope?: string;
  /** Defaults to `readwrite`. */
  permission?: "read" | "readwrite" | "full";
};

/** Query parameters of `GET /v1/object-storage/keys`. */
export type ObjectstorageKeysListQuery = {
  limit?: string;
  cursor?: string;
};

/** Body of `POST /v1/object-storage/buckets/{bucket}/objects/delete`. */
export type ObjectstorageObjectsDeleteBody = {
  /** Keys relative to the bucket. A key that does not exist is not an error: it is not counted. */
  keys: string[];
};

/** Query parameters of `GET /v1/object-storage/buckets/{bucket}/objects`. */
export type ObjectstorageObjectsListQuery = {
  prefix?: string;
  cursor?: string;
};

/** Body of `POST /v1/object-storage/buckets/{bucket}/presign`. */
export type ObjectstorageObjectsPresignBody = {
  /** The key, relative to the bucket. */
  key: string;
  /**
   * What the URL enables: `GET` downloads, `PUT` uploads. Defaults to `GET`. Signing a `PUT` requires `objectstorage:write`.
   */
  method?: "GET" | "PUT";
  /** Validity in seconds, 1–604800 (7 days). Defaults to 900. */
  expires_in?: number;
};

/** Query parameters of `GET /v1/operations`. */
export type OperationsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Query parameters of `GET /v1/services`. */
export type ServicesListQuery = {
  limit?: string;
  cursor?: string;
  family?: "vps" | "dns" | "dbaas" | "caas" | "lb" | "objectstorage" | "mailgateway" | "other";
};

/** Body of `POST /v1/vps/{id}/backups`. */
export type VpsBackupsCreateBody = {
  compress?: "zstd" | "gzip" | "lzo" | "none";
  /** `snapshot` does not interrupt the service. `stop` powers off the VM during the backup. */
  mode?: "snapshot" | "suspend" | "stop";
  storage?: string;
};

/** Query parameters of `GET /v1/vps/{id}/backups`. */
export type VpsBackupsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Body of `POST /v1/vps/{id}/console`. */
export type VpsConsoleCreateBody = {
  type?: "vnc" | "spice";
};

/** Query parameters of `GET /v1/vps/{id}/ips`. */
export type VpsIpsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Query parameters of `GET /v1/vps`. */
export type VpsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Query parameters of `GET /v1/vps/{id}/metrics`. */
export type VpsMetricsListQuery = {
  timeframe?: "hour" | "day" | "week" | "month" | "year";
};

/** Body of `POST /v1/vps/{id}/power`. */
export type VpsPowerBody = {
  /**
   * `shutdown` asks the operating system for an orderly shutdown and falls back to a hard cut if it does not respond. `stop` cuts power immediately: it can corrupt the filesystem.
   */
  action: "start" | "stop" | "shutdown" | "reboot";
};

/** Body of `POST /v1/vps/{id}/reinstall`. */
export type VpsReinstallBody = {
  /** An `id` from `GET /v1/vps/{id}/templates`. */
  template: string;
  /**
   * The new system's root password. Never stored or returned: if it is lost, the only way out is another reinstall.
   */
  root_password: string;
};

/** Query parameters of `GET /v1/vps/{id}/templates`. */
export type VpsTemplatesListQuery = {
  limit?: string;
  cursor?: string;
};

/** Body of `PATCH /v1/vps/{id}`. */
export type VpsUpdateBody = {
  /** A plain label or an FQDN. The backend validates the format. */
  hostname: string;
};
