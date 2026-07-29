// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVO GENERADO — no editar a mano.
//
// Sale de packages/openapi/openapi/v1.json a traves de packages/codegen.
// Para cambiarlo: cambia el handler en la API (los schemas Zod son la fuente de
// verdad), regenera el spec alla, 'bun run sync:spec' aca, y 'bun run gen'.
// ─────────────────────────────────────────────────────────────────────────────

/** Tipos del contrato de `api.truo.cloud/v1` (OpenAPI 1.0.0). */

export type Capabilities = {
  object: "capabilities";
  api_version: string;
  brand: string;
  resources: string[];
  scopes: string[];
  /** Estos scopes existen solo para sesiones. Ninguna API key puede tenerlos, ni bajo `*`. */
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
    /** Clase gruesa del error. */
    type: "authentication_error" | "authorization_error" | "invalid_request_error" | "rate_limit_error" | "api_error";
    /** Identidad específica y estable del error. Nunca se renombra. */
    code: string;
    /** Explicación en prosa, apta para mostrar. */
    message: string;
    /** Campo que falló, en notación de punto. */
    param: string | null;
    request_id: string;
    required_scope?: string;
    retry_after?: number;
    /** Detalle por campo cuando `code` es `validation_failed`. */
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
  /** Saldo a favor, en la moneda de la cuenta. */
  credit: number | null;
  credential: {
    object: "credential";
    id: string | null;
    type: "api_key" | "session";
    scopes: string[];
    /** Vacío = la credencial alcanza todos los servicios de la cuenta. */
    service_allowlist: string[];
    /** true si el usuario dueño de la credencial es el owner de la cuenta. */
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
  /** Vacío = la key alcanza todos los servicios de la cuenta. */
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
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type ApiKeyCreated = ApiKey & {
  /**
   * El token en claro. **Se muestra una sola vez**: no se almacena, solo su hash SHA-256. Si se pierde, hay que crear otra key.
   */
  token: string;
};

export type ApiKeyCreate = {
  name: string;
  /**
   * Scopes concretos. `*` no se acepta: enumerá lo que la key necesita. `apikeys:*` y `users:*` no son otorgables.
   */
  scopes: string[];
  /** Restringe la key a estos servicios. Omitido o vacío = toda la cuenta. */
  service_allowlist?: string[];
  /** Vencimiento en ISO 8601. Sin esto la key no vence. */
  expires_at?: string;
};

export type ApiKeyUpdate = {
  name?: string;
  /** Solo se puede **estrechar**. Ampliar devuelve 403. */
  scopes?: string[];
  /** Solo se puede estrechar: una key sin restricción puede ganarla, nunca perderla. */
  service_allowlist?: string[];
};

export type Service = {
  object: "service";
  id: string;
  /**
   * Familia del servicio. Determina bajo qué recurso se gestiona. `other` es un producto real de la cuenta que todavía no tiene recurso dedicado en v1.
   */
  family: "vps" | "dns" | "dbaas" | "caas" | "lb" | "objectstorage" | "mailgateway" | "other";
  status: "active" | "pending" | "suspended" | "terminated" | "cancelled" | "fraud" | "unknown";
  /** Nombre del producto en el catálogo. */
  name: string | null;
  /** Etiqueta del servicio: dominio, hostname o identificador que puso el cliente. */
  label: string | null;
  primary_ip: string | null;
  billing_cycle: string | null;
  next_due_date: string | null;
  created_at: string | null;
  /**
   * Capacidades reales de este servicio. Pedir una operación con capacidad `false` devuelve 400 `unsupported_for_product`.
   */
  capabilities: Record<string, boolean>;
};

export type ServiceList = {
  object: "list";
  data: Service[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type Operation = {
  object: "operation";
  id: string;
  type: string;
  status: "pending" | "running" | "succeeded" | "failed";
  progress: number | null;
  /** Recurso sobre el que corre la operación. */
  resource: {
    object: string;
    id: string;
  } | null;
  /** Payload del resultado. La forma depende de `type`. */
  result?: unknown;
  /** Detalle del fallo cuando `status` es `failed`. */
  error?: unknown;
  /**
   * true cuando no se pudo consultar el backend y esto es el último estado conocido. Reintentá: la operación no se perdió.
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
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type AuditLog = {
  object: "audit_log";
  id: string;
  request_id: string;
  method: string;
  /** Template de la ruta, no el path concreto. Agregable por definición. */
  route: string;
  path: string;
  status: number;
  error_code: string | null;
  scope_required: string | null;
  credential_id: string | null;
  /** `api`, `cli` o `mcp`. */
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
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type Vps = {
  object: "vps";
  id: string;
  status: "active" | "pending" | "suspended" | "terminated" | "cancelled" | "fraud" | "unknown";
  hostname: string | null;
  /** `qemu` = virtualización completa (KVM). `lxc` = contenedor. */
  type: "qemu" | "lxc";
  /** Nodo físico. Informativo: cambia si migramos la VM y no es direccionable. */
  node: string | null;
  vmid: number | null;
  primary_ip: string | null;
  /**
   * Estado real de la máquina. Distinto de `status`, que es el estado del **contrato** en facturación: un VPS `active` puede estar `stopped` porque el cliente lo apagó.
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
  /** Hay una reinstalación en curso. Las operaciones de power fallan mientras dure. */
  reinstalling: boolean;
  /**
   * Qué endpoints de `/v1` responden para ESTE VPS. Una capacidad en `false` devuelve `400 unsupported_for_product`; no es un error transitorio y reintentar no ayuda.
   */
  capabilities: Record<string, boolean>;
};

export type VpsList = {
  object: "list";
  data: Vps[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type VpsConfig = {
  object: "vps_config";
  vmid: number | null;
  node: string | null;
  /** `qemu` = virtualización completa (KVM). `lxc` = contenedor. */
  type: "qemu" | "lxc";
  cores: number | null;
  memory_mb: number | null;
  /** Descriptor de almacenamiento tal como lo reporta el hipervisor. */
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
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type VpsTemplate = {
  object: "vps_template";
  /** Pasalo como `template` en la reinstalación. */
  id: string;
  name: string;
  /** `qemu` = virtualización completa (KVM). `lxc` = contenedor. */
  type: "qemu" | "lxc";
  storage: string | null;
};

export type VpsTemplateList = {
  object: "list";
  data: VpsTemplate[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type ConsoleTicket = {
  object: "console_ticket";
  type: "vnc" | "spice";
  /** noVNC: abrir en el navegador. */
  url: string | null;
  /**
   * SPICE: contenido del `.vv` para `remote-viewer`. **Es una credencial**: da acceso total al sistema operativo. No lo loguees ni lo guardes.
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
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type DnsZone = {
  object: "dns_zone";
  id: string;
  /** Servicio que respalda la zona. Solo para facturación y soporte. */
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
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
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
  /** FQDN sin punto final. */
  name: string;
  /** El `SOA` y el `NS` de la delegación los administra la plataforma y no se editan. */
  type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SRV" | "CAA" | "PTR";
  ttl: number;
  /**
   * Todos los valores del RRset. Para `MX` incluyen la prioridad (`10 mail.ejemplo.com`); para `SRV`, prioridad, peso y puerto.
   */
  values: string[];
};

export type DnsRecordList = {
  object: "list";
  data: DnsRecord[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type Dbaas = {
  object: "dbaas";
  id: string;
  status: "active" | "pending" | "suspended" | "terminated" | "cancelled" | "fraud" | "unknown";
  /**
   * Estado real del motor. Distinto de `status`, que es el estado del **contrato** en facturación: un servicio `active` puede estar `provisioning` los primeros minutos.
   */
  state: "running" | "stopped" | "provisioning" | "error" | "unknown";
  /** Motor: `mysql`, `postgresql`, `mongodb`, `valkey` (o `redis`, histórico). */
  engine: string | null;
  engine_version: string | null;
  host: string | null;
  port: number | null;
  /** Nodo físico. Informativo y no direccionable; `null` en el tier compartido. */
  node: string | null;
  region: string | null;
  plan: ({
    cpu_cores: number | null;
    ram_mb: number | null;
    storage_gb: number | null;
  }) | null;
  created_at: string | null;
  /**
   * Qué endpoints de `/v1` responden para ESTE servicio. Una capacidad en `false` devuelve `400 unsupported_for_product`: no es transitorio y reintentar no ayuda. Una clave **ausente** es distinta de `false` — significa que no se consultó (ver el listado).
   */
  capabilities: Record<string, boolean>;
};

export type DbaasList = {
  object: "list";
  data: Dbaas[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type DbaasConnection = {
  object: "dbaas_connection";
  /** Motor: `mysql`, `postgresql`, `mongodb`, `valkey` (o `redis`, histórico). */
  engine: string | null;
  host: string | null;
  port: number | null;
  /** Base por defecto. `null` en los servicios donde el administrador elige al entrar. */
  database: string | null;
  /** Usuario administrador del motor. */
  username: string | null;
  /** Modo TLS en el vocabulario del motor (`verify-ca`, `VERIFY_CA`, `rediss`). */
  sslmode: string | null;
  /**
   * PEM de la CA del servicio, para `sslrootcert`/`--ssl-ca`. Es **público**: sirve para verificar al servidor, no para entrar.
   */
  ca_cert: string | null;
};

export type DbaasCredential = {
  object: "dbaas_credential";
  username: string | null;
  /**
   * Password del administrador, en claro. **Es acceso total a los datos**: no la loguees, no la guardes en un archivo de configuración compartido y no la pases por la línea de comandos. No se devuelve ninguna URI: una URI con la credencial adentro termina en el historial del shell y en los logs del proceso que la recibe.
   */
  password: string | null;
  host: string | null;
  port: number | null;
  database: string | null;
};

/**
 * Qué campos vienen llenos depende del backend del servicio: unos miden el **contenedor** (CPU, memoria, disco) y otros el **motor** (conexiones, tamaño, uptime). Un `null` es "no se mide acá", no cero.
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
  /** De la más vieja a la más nueva, como las devuelve el motor. */
  lines: string[];
};

export type DbaasDatabase = {
  object: "dbaas_database";
  id: string;
  name: string;
  owner: string | null;
  size_bytes: number | null;
  /** Tablas (o colecciones en MongoDB). `null` cuando el motor no lo reporta. */
  table_count: number | null;
};

export type DbaasDatabaseList = {
  object: "list";
  data: DbaasDatabase[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type DbaasUser = {
  object: "dbaas_user";
  id: string;
  username: string;
  /** Solo MySQL: desde dónde puede conectarse. `%` es cualquier origen. */
  host: string | null;
  can_login: boolean | null;
  can_create_db: boolean | null;
};

export type DbaasUserList = {
  object: "list";
  data: DbaasUser[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type DbaasBackup = {
  object: "dbaas_backup";
  id: string;
  /** `full`, `diff`, `incr`, `manual`… */
  type: string | null;
  size_bytes: number | null;
  /** `local`, `s3` o `both`. */
  location: string | null;
  created_at: string | null;
};

export type DbaasBackupList = {
  object: "list";
  data: DbaasBackup[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type Caas = {
  object: "caas";
  id: string;
  status: "active" | "pending" | "suspended" | "terminated" | "cancelled" | "fraud" | "unknown";
  /** Identificador del servicio. */
  label: string | null;
  primary_ip: string | null;
  /**
   * Avance del aprovisionamiento. Distinto de `status`, que es el estado del **contrato** en facturación: un servicio `active` en facturación puede seguir en `provisioning` acá. Mientras no esté `active`, los endpoints de apps devuelven `400 unsupported_for_product`.
   */
  provisioning_state: "draft" | "provisioning" | "active" | "suspended" | "terminated" | "error" | "unknown";
  /**
   * Máquina que corre el servicio. `null` en el listado y también cuando todavía no existe — un servicio recién comprado no tiene máquina hasta que el alta termina.
   */
  machine: ({
    state: "running" | "stopped" | "unknown";
    uptime_seconds: number | null;
  }) | null;
  /**
   * Qué endpoints de `/v1` responden para ESTE servicio. Una capacidad en `false` devuelve `400 unsupported_for_product`; no es un error transitorio y reintentar no ayuda.
   */
  capabilities: Record<string, boolean>;
};

export type CaasList = {
  object: "list";
  data: Caas[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

/**
 * Origen del código. Viene en `null` en el listado —el backend no lo trae ahí— y también cuando la app se creó sin origen configurado. Usá `GET /v1/caas/{id}/apps/{app_id}`.
 */
export type CaasAppSource = ({
  /** `other` = el origen se configuró por fuera de esta API y no es representable acá. */
  type: "git" | "docker_image" | "other";
  /** URL del repositorio, o referencia de la imagen (`nginx:1.27`). */
  ref: string | null;
  branch: string | null;
}) | null;

export type CaasApp = {
  object: "caas_app";
  id: string;
  name: string;
  /**
   * En qué quedó el **último despliegue**. No es un healthcheck: un `deployed` no garantiza que el proceso siga vivo ahora. `idle` = nunca se desplegó desde que se creó.
   */
  status: "idle" | "deploying" | "deployed" | "error" | "unknown";
  source: CaasAppSource;
};

export type CaasAppList = {
  object: "list";
  data: CaasApp[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
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
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type CaasLogs = {
  object: "caas_logs";
  app: string;
  /** Salida tal como la emite la app, con saltos de línea. Puede venir vacía. */
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
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type CaasDomain = {
  object: "caas_domain";
  host: string;
  https: boolean;
  /**
   * Qué emisor está configurado, **no** si el certificado ya se emitió: la emisión es asíncrona y no hay ningún estado ni id que consultar. Viene en `null` en la respuesta del alta, porque en ese momento todavía no hay certificado. La única verificación real de que el dominio quedó sirviendo es una petición HTTPS al host.
   */
  certificate_type: "none" | "letsencrypt" | "custom" | "unknown";
};

export type CaasDomainList = {
  object: "list";
  data: CaasDomain[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type CaasDatabase = {
  object: "caas_database";
  id: string;
  engine: string;
  name: string;
  /**
   * En qué quedó el **último despliegue**. No es un healthcheck: un `deployed` no garantiza que el proceso siga vivo ahora. `idle` = nunca se desplegó desde que se creó.
   */
  status: "idle" | "deploying" | "deployed" | "error" | "unknown";
};

export type CaasDatabaseList = {
  object: "list";
  data: CaasDatabase[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type LoadBalancer = {
  object: "load_balancer";
  id: string;
  status: "active" | "pending" | "suspended" | "terminated" | "cancelled" | "fraud" | "unknown";
  /**
   * Avance del aprovisionamiento. Distinto de `status`, que es el estado del **contrato** en facturación. Mientras no esté `active`, escribir listeners devuelve `400 unsupported_for_product`.
   */
  provisioning_state: "draft" | "provisioning" | "active" | "suspended" | "terminated" | "error" | "unknown";
  /** Nombre estable del balanceador. Apuntá tus registros DNS acá, no a la IP. */
  hostname: string | null;
  /**
   * IP por la que entra el tráfico. Puede moverse a otra máquina ante una falla: es parte de cómo el servicio se recupera, y por eso no es lo que conviene poner en un DNS.
   */
  public_ip: string | null;
  /**
   * ¿Responde el balanceador? `null` = no se pudo verificar, que es distinto de `false`: pasa mientras se aprovisiona. No dice nada sobre la salud de tus destinos — eso está en `GET /v1/load-balancers/{id}/stats`.
   */
  healthy: boolean | null;
  listener_count: number | null;
  /**
   * Qué endpoints de `/v1` responden para ESTE servicio. Una capacidad en `false` devuelve `400 unsupported_for_product`.
   */
  capabilities: Record<string, boolean>;
};

export type LoadBalancerList = {
  object: "list";
  data: LoadBalancer[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type LbListener = {
  object: "lb_listener";
  id: string;
  name: string;
  /**
   * `tcp` balancea a nivel de conexión y sirve para cualquier protocolo. `http` entiende el pedido y es lo que habilita enrutar por dominio.
   */
  protocol: "http" | "tcp";
  port: number;
  /**
   * `passthrough` entrega el TLS intacto a tus destinos. `terminate` lo descifra en el balanceador —requiere `protocol: http` y `domain`— y el tráfico hacia tus destinos viaja en claro por la red interna.
   */
  tls: "none" | "passthrough" | "terminate";
  domain: string | null;
  /**
   * `source` manda cada IP de origen siempre al mismo destino: es lo que se usa cuando la aplicación guarda sesión en memoria.
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
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type LbBackend = {
  object: "lb_backend";
  id: string;
  listener: string;
  /** IP o nombre de host del destino. */
  ip: string;
  port: number;
  /** Proporción de tráfico frente a los demás destinos del listener. Default 1. */
  weight: number | null;
};

export type LbBackendList = {
  object: "list";
  data: LbBackend[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
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
    /** Conexiones en curso. */
    sessions: number;
    bytes_in: number;
    bytes_out: number;
    backends: ({
      /** El destino tal como está declarado, en la forma `host:puerto`. */
      target: string;
      health: "healthy" | "unhealthy" | "unknown";
    })[];
  })[];
};

export type ObjectStorage = {
  object: "object_storage";
  service: string | null;
  status: "active" | "suspended" | "error";
  /** Endpoint S3. Configurá el cliente con `addressing_style=path`. */
  endpoint: string;
  storage_bytes: number;
  objects: number;
  buckets: number;
  /** Descargado en los últimos 30 días. */
  egress_used_bytes: number;
  /** Egress incluido del período, derivado del almacenamiento en uso. */
  egress_included_bytes: number;
  requests_30d: number;
};

export type StorageBucket = {
  object: "storage_bucket";
  id: string;
  name: string;
  /**
   * `public` publica el bucket en una URL de solo lectura (`public_url`). `private` la retira: los objetos siguen accesibles con llave o con una URL prefirmada.
   */
  access: "private" | "public";
  objects: number;
  size_bytes: number;
  /** Base de lectura anónima. `null` mientras el bucket sea privado. */
  public_url: string | null;
  /** Null en un bucket creado por un cliente S3 directo, que no tiene fila de registro. */
  created_at: string | null;
};

export type StorageBucketList = {
  object: "list";
  data: StorageBucket[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type StorageDeletion = {
  object: "storage_deletion";
  bucket: string;
  /** Objetos efectivamente borrados. */
  deleted: number;
};

export type StorageBucketMetrics = {
  object: "storage_bucket_metrics";
  bucket: string;
  range: "7d" | "30d" | "90d";
  storage_bytes: number;
  /** Diferencia contra el primer snapshot del rango. Negativo si el bucket bajó. */
  storage_delta_bytes: number;
  objects: number;
  objects_delta: number;
  egress_used_bytes: number;
  egress_included_bytes: number;
  /** Siempre 30 días, independiente de `range`. */
  requests_30d: number;
  /** Porcentaje de lecturas sobre el total de requests del rango. */
  get_pct: number;
  /** Un punto por día UTC. Vacío mientras no haya snapshots. */
  storage_series: ({
    date: string;
    bytes: number;
  })[];
  /** Un punto por día UTC. Vacío si no hubo tráfico en el rango. */
  requests_series: ({
    date: string;
    get: number;
    put: number;
  })[];
  /** Cuánto salió por el cache del edge y cuánto por el origen. */
  egress_by_origin: ({
    label: string;
    bytes: number;
  })[];
};

export type StorageObject = {
  object: "storage_object";
  id: string;
  /** Relativa al bucket. Las carpetas terminan en `/`. */
  key: string;
  /** Último segmento de la key. */
  name: string;
  /**
   * Una carpeta no es un objeto: es un prefijo común. Se lista para poder navegar, y no tiene tamaño ni fecha.
   */
  is_folder: boolean;
  /** Inferido de la extensión, no leído del objeto. */
  content_type: string | null;
  size_bytes: number | null;
  last_modified: string | null;
};

export type StorageObjectList = {
  object: "list";
  data: StorageObject[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
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
  /** Hoy coincide con `access_key_id`; tratalo igual como identificador del recurso. */
  id: string;
  name: string;
  /** Lo que va en el cliente S3. */
  access_key_id: string;
  /** Bucket al que está acotada la llave, o `*` para todos. */
  scope: string;
  /**
   * `read` solo descarga, `readwrite` sube y borra, `full` agrega la gestión de buckets desde el protocolo S3.
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
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type StorageAccessKeyWithSecret = StorageAccessKey & {
  /**
   * Aparece **una sola vez**, en esta respuesta. No se guarda en claro de nuestro lado y no hay endpoint que lo recupere: si se pierde, la salida es emitir otra llave y rotar la aplicación.
   */
  secret_access_key: string;
};

export type MailGatewayUsage = {
  object: "mail_gateway_usage";
  /** Mes calendario UTC en curso, `YYYY-MM`. Es el período que factura. */
  period: string;
  /** Envíos aceptados en el período. */
  sends: number;
  /**
   * Envíos rechazados por el gateway antes de llegar a SES (dominio sin verificar, tenant suspendido, payload inválido). No se facturan.
   */
  rejected: number;
};

export type MailGateway = {
  object: "mail_gateway";
  id: string;
  status: "active" | "suspended" | "deprovisioned" | "unknown";
  plan: string | null;
  /**
   * Dónde se envía. El envío NO pasa por esta API: se hace contra este endpoint con una API key de `POST /v1/mail-gateway/keys`.
   */
  api_endpoint: string;
  /**
   * Config set de SES del tenant. Es el que reporta los eventos de entrega que alimentan `/metrics` y `/messages`; en `null` significa que el tenant todavía no tiene métricas.
   */
  config_set: string | null;
  domain_count: number;
  /** API keys activas y revocadas. */
  key_count: number;
  usage_month: MailGatewayUsage;
  created_at: string | null;
};

export type MailGatewayMetrics = {
  object: "mail_gateway_metrics";
  range: "7d" | "30d" | "90d";
  sends: number;
  /**
   * Variación contra el período anterior, en fracción (`0.12` = +12 %). `null` cuando el período anterior no tuvo envíos: dividir por cero no es un 0 %.
   */
  sends_delta_pct: number | null;
  /** Fracción 0–1, no porcentaje. */
  delivery_rate: number;
  open_rate: number;
  bounce_rate: number;
  complaint_rate: number;
  /**
   * Umbral de rebote de SES. Pasarlo pone en riesgo la reputación de envío de toda la plataforma, así que el gateway suspende antes de llegar.
   */
  bounce_rate_limit: number;
  complaint_rate_limit: number;
  complaints: number;
  /** Serie diaria del rango. */
  series: ({
    /** Inicio del día UTC, ISO 8601. */
    date: string | null;
    sends: number;
    opens: number;
    bounces: number;
  })[];
  /** Vacío cuando no hubo entregas en el rango. */
  latency: ({
    /** Etapa medida. Hoy solo `send_to_delivery`. */
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
  /**
   * Para qué sirve el registro. Valores actuales: `dkim`, `spf`, `mail_from_mx`, `mail_from_spf`, `dmarc`.
   */
  purpose: string;
  type: string;
  /** Nombre completo del registro, sin punto final. */
  host: string;
  value: string;
  /**
   * `info` = no lo verifica nadie, pero publicarlo mejora la entrega. `pending` = SES todavía no lo vio.
   */
  status: "pending" | "verified" | "info" | "unknown";
};

export type MailGatewayDomain = {
  object: "mail_gateway_domain";
  id: string;
  domain: string;
  status: "pending" | "verified" | "failed" | "unknown";
  verified_at: string | null;
  /** Los registros que hay que publicar en la zona del dominio. */
  records: MailGatewayDnsRecord[];
};

export type MailGatewayDomainList = {
  object: "list";
  data: MailGatewayDomain[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type MailGatewayMessage = {
  object: "mail_gateway_message";
  id: string;
  recipient: string | null;
  subject: string | null;
  status: "queued" | "delivered" | "opened" | "deferred" | "bounced" | "complained" | "unknown";
  /** La etiqueta `mg-category` que se le puso al envío, si se le puso alguna. */
  category: string | null;
  from_domain: string | null;
  /** Momento del último evento del mensaje, no el del envío. */
  occurred_at: string | null;
};

export type MailGatewayMessageList = {
  object: "list";
  data: MailGatewayMessage[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type MailGatewayKey = {
  object: "mail_gateway_key";
  id: string;
  /** Prefijo de display, para reconocer la key sin verla entera. */
  hint: string | null;
  status: "active" | "revoked" | "unknown";
  /**
   * La key completa. **Solo viene en la respuesta del alta y una única vez**: de esta key guardamos su hash, así que no hay forma de recuperarla después —tampoco para nosotros—. En el listado siempre es `null`.
   */
  secret: string | null;
  /** Dónde se usa esta key: `POST {api_endpoint}/emails`. */
  api_endpoint: string;
  created_at: string | null;
};

export type MailGatewayKeyList = {
  object: "list";
  data: MailGatewayKey[];
  has_more: boolean;
  /**
   * Pasalo como `cursor` para la página siguiente. Es **opaco**: no lo construyas, no lo parsees y no lo guardes entre versiones.
   */
  next_cursor: string | null;
};

export type MailGatewaySmtp = {
  object: "mail_gateway_smtp";
  host: string;
  /** SMTPS, TLS implícito desde el saludo. No hay STARTTLS en 587. */
  port: number;
  username: string;
  /** `suspended` = el envío por SMTP está cortado, normalmente por reputación o mora. */
  status: "active" | "suspended" | "revoked" | "unknown";
  config_set: string | null;
};

export type MailGatewaySmtpCredentials = {
  object: "mail_gateway_smtp";
  host: string;
  /** SMTPS, TLS implícito desde el saludo. No hay STARTTLS en 587. */
  port: number;
  username: string;
  /** `suspended` = el envío por SMTP está cortado, normalmente por reputación o mora. */
  status: "active" | "suspended" | "revoked" | "unknown";
  config_set: string | null;
  /** La password SMTP en claro. Tratala como un secreto: envía en tu nombre. */
  password: string;
};

/** Parametros de consulta de `GET /v1/api-keys`. */
export type ApiKeysListQuery = {
  limit?: string;
  cursor?: string;
};

/** Parametros de consulta de `GET /v1/audit-logs`. */
export type AuditLogsListQuery = {
  limit?: string;
  cursor?: string;
  status?: string;
  deniedOnly?: string;
};

/** Cuerpo de `POST /v1/caas/{id}/apps`. */
export type CaasAppsCreateBody = {
  /** Nombre visible de la app. El backend deriva de acá un identificador interno. */
  name: string;
  /** Se puede omitir y configurar después, pero una app sin origen no se puede desplegar. */
  source?: {
    type: "git" | "docker_image";
    /** URL del repositorio para `git`, referencia de la imagen para `docker_image`. */
    ref: string;
    /** Solo para `git`. Default `main`. */
    branch?: string;
  };
};

/** Parametros de consulta de `GET /v1/caas/{id}/apps`. */
export type CaasAppsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Cuerpo de `POST /v1/caas/{id}/databases`. */
export type CaasDatabasesCreateBody = {
  engine: "postgres" | "mysql" | "mariadb" | "mongo" | "redis";
  name: string;
};

/** Parametros de consulta de `GET /v1/caas/{id}/databases`. */
export type CaasDatabasesListQuery = {
  limit?: string;
  cursor?: string;
};

/** Parametros de consulta de `GET /v1/caas/{id}/apps/{app_id}/deployments`. */
export type CaasDeploymentsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Cuerpo de `POST /v1/caas/{id}/apps/{app_id}/domains`. */
export type CaasDomainsCreateBody = {
  /**
   * Tiene que resolver a la IP del servicio **antes** de crearlo: el certificado se valida por HTTP y sin el DNS apuntado la emisión falla en silencio.
   */
  host: string;
};

/** Cuerpo de `PUT /v1/caas/{id}/apps/{app_id}/env`. */
export type CaasEnvReplaceBody = {
  /**
   * El conjunto **completo**. Lo que no esté acá se borra: mandar `[]` deja la app sin ninguna variable. Como `GET /env` no devuelve valores, el set entero tiene que salir de tu lado —de tu gestor de secretos o de tu repositorio de configuración—, que es como funciona cualquier infraestructura declarativa.
   */
  vars: ({
    key: string;
    /** Se guarda tal cual. No se devuelve nunca. */
    value: string;
  })[];
};

/** Parametros de consulta de `GET /v1/caas`. */
export type CaasInstancesListQuery = {
  limit?: string;
  cursor?: string;
};

/** Parametros de consulta de `GET /v1/dbaas/{id}/backups`. */
export type DbaasBackupsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Cuerpo de `POST /v1/dbaas/{id}/databases`. */
export type DbaasDatabasesCreateBody = {
  name: string;
  /** Solo MySQL. Default `utf8mb4`. */
  charset?: string;
  /** Solo MySQL. Default `utf8mb4_unicode_ci`. */
  collation?: string;
  /** Solo PostgreSQL. Usuario dueño de la base; por defecto el administrador. */
  owner?: string;
};

/** Parametros de consulta de `GET /v1/dbaas/{id}/databases`. */
export type DbaasDatabasesListQuery = {
  limit?: string;
  cursor?: string;
};

/** Parametros de consulta de `GET /v1/dbaas`. */
export type DbaasInstancesListQuery = {
  limit?: string;
  cursor?: string;
};

/** Parametros de consulta de `GET /v1/dbaas/{id}/logs`. */
export type DbaasLogsGetQuery = {
  lines?: string;
};

/** Cuerpo de `POST /v1/dbaas/{id}/users`. */
export type DbaasUsersCreateBody = {
  username: string;
  /**
   * No se guarda ni se devuelve: si se pierde, se cambia con `POST /v1/dbaas/{id}/users/{username}/password`.
   */
  password: string;
  /** Solo MySQL. Default `%` (cualquier origen). */
  host?: string;
  /** Bases sobre las que se le otorgan permisos. */
  databases?: string[];
  /**
   * MySQL: privilegios de SQL (`SELECT`, `INSERT`, …); default `ALL` sobre `databases`. PostgreSQL: se usa el primero como rol (`readwrite`, `readonly`). Una palabra por elemento: los privilegios compuestos (`ALL PRIVILEGES`) no se aceptan porque el valor termina dentro de un `GRANT` que el motor arma por concatenación.
   */
  privileges?: string[];
};

/** Parametros de consulta de `DELETE /v1/dbaas/{id}/users/{username}`. */
export type DbaasUsersDeleteQuery = {
  host?: string;
};

/** Parametros de consulta de `GET /v1/dbaas/{id}/users`. */
export type DbaasUsersListQuery = {
  limit?: string;
  cursor?: string;
};

/** Cuerpo de `POST /v1/dbaas/{id}/users/{username}/password`. */
export type DbaasUsersSetPasswordBody = {
  password: string;
};

/** Parametros de consulta de `GET /v1/dns/zones/{zone}/records`. */
export type DnsRecordsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Cuerpo de `PATCH /v1/dns/zones/{zone}/records`. */
export type DnsRecordsPatchBody = {
  records: ({
    name: string;
    /** El `SOA` y el `NS` de la delegación los administra la plataforma y no se editan. */
    type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SRV" | "CAA" | "PTR";
    /** Segundos, 60–604800. Default 3600. */
    ttl?: number;
    /** Lista vacía = borrar el RRset. */
    values: string[];
  })[];
};

/** Cuerpo de `PUT /v1/dns/zones/{zone}/records/{name}/{type}`. */
export type DnsRecordsPutBody = {
  /** Segundos, 60–604800. Default 3600. */
  ttl?: number;
  /**
   * Reemplaza el RRset **entero**. Los valores que no estén acá se borran: para agregar uno, leé el RRset, agregalo a la lista y mandá la lista completa.
   */
  values: string[];
};

/** Parametros de consulta de `GET /v1/dns/zones`. */
export type DnsZonesListQuery = {
  limit?: string;
  cursor?: string;
};

/** Cuerpo de `POST /v1/load-balancers/{id}/backends`. */
export type LbBackendsCreateBody = {
  /** Nombre de un listener existente. */
  listener: string;
  ip: string;
  port: number;
  weight?: number;
};

/** Parametros de consulta de `GET /v1/load-balancers`. */
export type LbInstancesListQuery = {
  limit?: string;
  cursor?: string;
};

/** Cuerpo de `PUT /v1/load-balancers/{id}/listeners`. */
export type LbListenersReplaceBody = {
  /**
   * El conjunto **completo**. Lo que no esté acá se borra, incluidos sus destinos; mandar `[]` deja el balanceador sin nada escuchando. Nombres y puertos son únicos dentro del conjunto.
   */
  listeners: ({
    /** Identifica al listener dentro del servicio. Único. */
    name: string;
    /**
     * `tcp` balancea a nivel de conexión y sirve para cualquier protocolo. `http` entiende el pedido y es lo que habilita enrutar por dominio.
     */
    protocol: "http" | "tcp";
    /** Puerto de entrada. Único dentro del servicio. */
    port: number;
    /** Default `none`. */
    tls?: "none" | "passthrough" | "terminate";
    domain?: string;
    /** Default `roundrobin`. */
    algorithm?: "roundrobin" | "leastconn" | "source";
    health_check?: {
      /** Default `tcp`. */
      type?: "tcp" | "http";
      /** Obligatorio si `http`. */
      path?: string;
      /** Cada cuánto se sondea cada destino. Default 2000. */
      interval_ms?: number;
    };
    /** Un listener sin destinos no es representable: mínimo uno. */
    backends: ({
      /** IP o nombre de host. */
      ip: string;
      port: number;
      weight?: number;
    })[];
  })[];
};

/** Cuerpo de `POST /v1/mail-gateway/domains`. */
export type MailgatewayDomainsCreateBody = {
  /**
   * Dominio de envío. Se normaliza a minúsculas. Tenés que poder editar su DNS: el alta devuelve los registros a publicar.
   */
  domain: string;
};

/** Parametros de consulta de `GET /v1/mail-gateway/domains`. */
export type MailgatewayDomainsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Parametros de consulta de `GET /v1/mail-gateway/keys`. */
export type MailgatewayKeysListQuery = {
  limit?: string;
  cursor?: string;
};

/** Parametros de consulta de `GET /v1/mail-gateway/messages`. */
export type MailgatewayMessagesListQuery = {
  limit?: string;
  cursor?: string;
  recipient?: string;
  days?: string;
};

/** Parametros de consulta de `GET /v1/mail-gateway/metrics`. */
export type MailgatewayMetricsGetQuery = {
  range?: "7d" | "30d" | "90d";
};

/** Cuerpo de `POST /v1/object-storage/buckets`. */
export type ObjectstorageBucketsCreateBody = {
  name: string;
  /** Default `private`. */
  access?: "private" | "public";
};

/** Parametros de consulta de `DELETE /v1/object-storage/buckets/{bucket}`. */
export type ObjectstorageBucketsDeleteQuery = {
  purge?: "true" | "false";
};

/** Parametros de consulta de `GET /v1/object-storage/buckets`. */
export type ObjectstorageBucketsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Parametros de consulta de `GET /v1/object-storage/buckets/{bucket}/metrics`. */
export type ObjectstorageBucketsMetricsQuery = {
  range?: "7d" | "30d" | "90d";
};

/** Cuerpo de `PATCH /v1/object-storage/buckets/{bucket}`. */
export type ObjectstorageBucketsUpdateBody = {
  /**
   * `public` publica el bucket en una URL de solo lectura (`public_url`). `private` la retira: los objetos siguen accesibles con llave o con una URL prefirmada.
   */
  access: "private" | "public";
};

/** Cuerpo de `POST /v1/object-storage/keys`. */
export type ObjectstorageKeysCreateBody = {
  /** Para reconocerla después. No tiene efecto sobre los permisos. */
  name: string;
  /**
   * Nombre de bucket para acotar la llave, o `*` (default) para todos. Una llave por bucket es lo que hace que perder una no comprometa el resto.
   */
  scope?: string;
  /** Default `readwrite`. */
  permission?: "read" | "readwrite" | "full";
};

/** Parametros de consulta de `GET /v1/object-storage/keys`. */
export type ObjectstorageKeysListQuery = {
  limit?: string;
  cursor?: string;
};

/** Cuerpo de `POST /v1/object-storage/buckets/{bucket}/objects/delete`. */
export type ObjectstorageObjectsDeleteBody = {
  /** Keys relativas al bucket. Una key que no existe no es un error: no se cuenta. */
  keys: string[];
};

/** Parametros de consulta de `GET /v1/object-storage/buckets/{bucket}/objects`. */
export type ObjectstorageObjectsListQuery = {
  prefix?: string;
  cursor?: string;
};

/** Cuerpo de `POST /v1/object-storage/buckets/{bucket}/presign`. */
export type ObjectstorageObjectsPresignBody = {
  /** Key relativa al bucket. */
  key: string;
  /**
   * Qué habilita la URL: `GET` descarga, `PUT` sube. Default `GET`. Firmar un `PUT` requiere `objectstorage:write`.
   */
  method?: "GET" | "PUT";
  /** Segundos de validez, 1–604800 (7 días). Default 900. */
  expires_in?: number;
};

/** Parametros de consulta de `GET /v1/operations`. */
export type OperationsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Parametros de consulta de `GET /v1/services`. */
export type ServicesListQuery = {
  limit?: string;
  cursor?: string;
  family?: "vps" | "dns" | "dbaas" | "caas" | "lb" | "objectstorage" | "mailgateway" | "other";
};

/** Cuerpo de `POST /v1/vps/{id}/backups`. */
export type VpsBackupsCreateBody = {
  compress?: "zstd" | "gzip" | "lzo" | "none";
  /** `snapshot` no interrumpe el servicio. `stop` apaga la VM durante el backup. */
  mode?: "snapshot" | "suspend" | "stop";
  storage?: string;
};

/** Parametros de consulta de `GET /v1/vps/{id}/backups`. */
export type VpsBackupsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Cuerpo de `POST /v1/vps/{id}/console`. */
export type VpsConsoleCreateBody = {
  type?: "vnc" | "spice";
};

/** Parametros de consulta de `GET /v1/vps/{id}/ips`. */
export type VpsIpsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Parametros de consulta de `GET /v1/vps`. */
export type VpsListQuery = {
  limit?: string;
  cursor?: string;
};

/** Parametros de consulta de `GET /v1/vps/{id}/metrics`. */
export type VpsMetricsListQuery = {
  timeframe?: "hour" | "day" | "week" | "month" | "year";
};

/** Cuerpo de `POST /v1/vps/{id}/power`. */
export type VpsPowerBody = {
  /**
   * `shutdown` pide un apagado ordenado al sistema operativo y cae a corte duro si no responde. `stop` corta la energía de una: puede corromper el sistema de archivos.
   */
  action: "start" | "stop" | "shutdown" | "reboot";
};

/** Cuerpo de `POST /v1/vps/{id}/reinstall`. */
export type VpsReinstallBody = {
  /** Un `id` de `GET /v1/vps/{id}/templates`. */
  template: string;
  /**
   * Password de root del sistema nuevo. No se guarda ni se devuelve nunca: si se pierde, la única salida es otra reinstalación.
   */
  root_password: string;
};

/** Parametros de consulta de `GET /v1/vps/{id}/templates`. */
export type VpsTemplatesListQuery = {
  limit?: string;
  cursor?: string;
};

/** Cuerpo de `PATCH /v1/vps/{id}`. */
export type VpsUpdateBody = {
  /** Etiqueta simple o FQDN. El backend valida el formato. */
  hostname: string;
};
