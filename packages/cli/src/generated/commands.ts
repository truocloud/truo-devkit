// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVO GENERADO — no editar a mano.
//
// Sale de packages/openapi/openapi/v1.json a traves de packages/codegen.
// Para cambiarlo: cambia el handler en la API (los schemas Zod son la fuente de
// verdad), regenera el spec alla, 'bun run sync:spec' aca, y 'bun run gen'.
// ─────────────────────────────────────────────────────────────────────────────

/** De donde sale el valor de un argumento cuando se arma el request. */
export type ArgIn = "path" | "query" | "body";

export interface Positional {
  /** Como se llama en la ayuda: `<service_id>`. */
  label: string;
  in: ArgIn;
  /** Clave real en el spec (el path usa `id`, aunque la ayuda diga `service_id`). */
  key: string;
  required: boolean;
  type?: "string" | "number" | "boolean" | "json" | "string[]";
  /** Valores admitidos, si el schema los enumera. */
  values?: string[];
  description?: string;
}

export interface Flag {
  /** Nombre en la linea de comandos, sin `--`. */
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
  /** El body no declara propiedades: solo se puede mandar con `--body-json`. */
  freeformBody: boolean;
  positionals: Positional[];
  flags: Flag[];
}

/** Los 100 comandos derivados del spec. */
export const COMMANDS: CommandSpec[] = [
  {
    "path": [
      "auth",
      "status"
    ],
    "operationId": "account.get",
    "summary": "Obtener la cuenta y la credencial actual",
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
    "summary": "Crear una API key",
    "description": "Devuelve el token en claro **una sola vez**. Guardalo en el momento: solo se almacena su hash SHA-256 y no hay forma de recuperarlo después.",
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
        "description": "Scopes concretos. `*` no se acepta: enumerá lo que la key necesita. `apikeys:*` y `users:*` no son otorgables."
      },
      {
        "flag": "service-allowlist",
        "key": "service_allowlist",
        "in": "body",
        "type": "string[]",
        "required": false,
        "description": "Restringe la key a estos servicios. Omitido o vacío = toda la cuenta."
      },
      {
        "flag": "expires-at",
        "key": "expires_at",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "Vencimiento en ISO 8601. Sin esto la key no vence."
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
    "summary": "Listar las API keys de la cuenta",
    "description": "Solo con sesión. Nunca devuelve tokens: solo prefijo y últimos 4.",
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
    "summary": "Revocar una API key",
    "description": "Irreversible. La revocación se propaga a todas las réplicas por pub/sub en menos de un segundo; el peor caso, con Redis caído, es 60 segundos (el TTL de la caché en proceso).",
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
    "summary": "Listar la actividad de API de la cuenta",
    "description": "Incluye los intentos **denegados** (4xx), no solo lo que funcionó: una credencial probando endpoints que no le corresponden es precisamente la señal que hay que poder ver.",
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
    "summary": "Crear una app",
    "description": "Crea la app y configura su origen, pero **no la despliega**: queda en `idle` hasta que llames a `POST /v1/caas/{id}/apps/{app_id}/deploy`. Separar las dos cosas es lo que permite crear la app, cargarle las variables y recién ahí desplegar — el orden inverso arrancaría la aplicación sin su configuración.",
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
        "description": "Nombre visible de la app. El backend deriva de acá un identificador interno."
      },
      {
        "flag": "source",
        "key": "source",
        "in": "body",
        "type": "json",
        "required": false,
        "description": "Se puede omitir y configurar después, pero una app sin origen no se puede desplegar."
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
    "summary": "Borrar una app",
    "description": "**Destructivo.** Borra la app, sus variables y sus dominios. Los datos de las bases del servicio no se tocan: viven aparte.",
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
    "summary": "Desplegar una app",
    "description": "Devuelve `202` en cuanto el despliegue arranca. La operación se resuelve buscando ese despliegue en el historial de la app, que es el único lugar donde el backend reporta en qué quedó. Esperá con `GET /v1/operations/{id}`; el detalle de un fallo está en `GET /v1/caas/{id}/apps/{app_id}/logs`.\n\nVive en su propio scope (`caas:deploy`) porque desplegar ejecuta el código que haya en el origen configurado — es distinto de editar la configuración de la app.",
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
    "summary": "Obtener una app",
    "description": "Devuelve **solo** los campos declarados. El backend responde con el objeto interno completo del motor de despliegue —que incluye las variables de entorno en claro—; nada de eso sale por acá. Para los nombres de las variables, `GET /v1/caas/{id}/apps/{app_id}/env`.",
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
    "summary": "Listar las apps del servicio",
    "description": "`source` viene en `null`: el backend no lo trae en el listado.",
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
    "summary": "Logs de una app",
    "description": "**Es una foto, no un stream.** Devuelve lo que el backend tenga en el momento de la llamada y no hay forma de pedir \"lo que vino después\": el backend acepta un cursor pero nunca emite el siguiente, así que este endpoint no publica ninguno. Para seguir una aplicación en vivo, volvé a llamar.",
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
    "summary": "Reiniciar una app",
    "description": "Reinicia el proceso sin volver a construir la imagen: toma las variables de entorno actuales pero **no** trae código nuevo. Para eso es `deploy`.",
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
    "summary": "Crear una base de datos",
    "description": "La contraseña la genera la plataforma y **no se devuelve acá ni en ningún otro endpoint de `/v1`**: no hay forma de recuperarla por esta API. Conectate desde una app del mismo servicio, donde la cadena de conexión ya está disponible.\n\nBorrar una base no está en esta versión: el backend todavía no lo implementa y publicar un endpoint que siempre falla sería publicar roadmap.",
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
    "summary": "Bases de datos del servicio",
    "description": "Son del servicio, no de una app: varias apps del mismo servicio pueden usar la misma base. **Las credenciales no se devuelven** por ningún endpoint de esta API.",
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
    "summary": "Historial de despliegues de una app",
    "description": "Del más reciente al más viejo, según lo devuelve el backend.",
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
    "summary": "Agregar un dominio a una app",
    "description": "El DNS del host tiene que estar apuntado a la IP del servicio **antes** de llamar: la emisión del certificado se valida por HTTP.\n\nDos cosas más que hay que saber:\n\n- **No es atómico.** El alta registra el dominio y después reconstruye el ruteo de entrada; si lo segundo falla, la llamada devuelve error con el dominio ya creado. Reintentar es seguro y es lo correcto — el alta es idempotente por host.\n- **El certificado se emite después**, de forma asíncrona y sin ningún estado ni id que consultar. Por eso `certificate_type` viene en `null` acá. La única verificación real es una petición HTTPS al host.",
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
        "description": "Tiene que resolver a la IP del servicio **antes** de crearlo: el certificado se valida por HTTP y sin el DNS apuntado la emisión falla en silencio."
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
    "summary": "Quitar un dominio de una app",
    "description": "Borrar un host que no está en la app no es un error: el ruteo de entrada se reconstruye igual, que es lo que hace que reintentar sea seguro.",
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
    "summary": "Dominios de una app",
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
    "summary": "Nombres de las variables de entorno",
    "description": "**Devuelve los nombres, nunca los valores.** No hay una versión de este endpoint que los devuelva: una vez escrito, un valor solo lo lee la aplicación. El backend enmascara aplicando una regex al nombre de la clave, lo que deja pasar en claro cualquier cosa que no se llame como un secreto (`DATABASE_URL`, `SENTRY_DSN`); eso no es una política de clasificación y no se publica.",
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
    "summary": "Reemplazar las variables de entorno",
    "description": "**Reemplaza el conjunto entero**: lo que no venga en `vars` se borra. No es una limitación, es la semántica del backend, que escribe el bloque completo de una.\n\nComo `GET /env` no devuelve valores, el set tiene que salir de tu lado — de tu gestor de secretos o de tu repositorio de configuración. Eso es lo natural para infraestructura declarativa, y de paso elimina el modo de fallo del panel, donde guardar sin volver a escribir los secretos los borraba.\n\nLos cambios toman efecto en el próximo `deploy` o `restart`.",
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
        "description": "El conjunto **completo**. Lo que no esté acá se borra: mandar `[]` deja la app sin ninguna variable. Como `GET /env` no devuelve valores, el set entero tiene que salir de tu lado —de tu gestor de secretos o de tu repositorio de configuración—, que es como funciona cualquier infraestructura declarativa."
      }
    ]
  },
  {
    "path": [
      "caas",
      "get"
    ],
    "operationId": "caas.instances.get",
    "summary": "Obtener un servicio CaaS con su estado real",
    "description": "Consulta el control plane. Si no responde, `provisioning_state` y `machine` vuelven en `null` en vez de fallar: un hipo del control plane no debería impedirte leer el resto del recurso ni sus `capabilities`.",
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
    "summary": "Listar los servicios CaaS de la cuenta",
    "description": "Sale de la base, sin consultar el control plane: `provisioning_state` y `machine` vienen en `null`. Traerlos costaría dos llamadas por elemento de la página.\n\nUna página puede venir con menos elementos que el `limit` aunque haya más: todos los productos del control plane comparten un mismo módulo de aprovisionamiento, así que el filtro por familia solo puede aplicarse después de leer la página. `has_more` sigue siendo la señal correcta de si queda algo por traer.",
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
    "summary": "Crear un backup",
    "description": "Devuelve `202` en cuanto la tarea arranca, no cuando el archivo está listo: un dump puede tardar minutos, muy por encima de cualquier timeout HTTP. La operación **se resuelve contra la lista de backups** —aparece uno nuevo o no— y no contra el resultado del POST, así que sobrevive a que la llamada expire con el backup corriendo. Esperala con `GET /v1/operations/{id}`.",
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
    "summary": "Backups del servicio",
    "description": "Del más nuevo al más viejo. Un servicio cuyo motor no tiene backups gestionados devuelve una lista vacía, no un error.",
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
    "summary": "Datos de conexión, sin la credencial",
    "description": "Host, puerto, base, usuario administrador, modo TLS y la CA del servicio — que es **pública** y sirve para verificar al servidor. **No incluye la password ni ninguna URI que la contenga**: la credencial sale de `POST /v1/dbaas/{id}/credentials`, que exige el scope `dbaas:credentials`.",
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
    "summary": "Revelar la credencial de administración",
    "description": "Devuelve la password del administrador **en claro**. No rota nada: es la credencial que ya está en uso.\n\nEs un POST y no un GET a propósito. Un GET queda en el historial del navegador, en los logs de cualquier proxy y en cachés intermedias, y se puede disparar sin querer desde un link; un POST obliga a una acción deliberada y entra al audit log como mutación, así que revelar la credencial de una base deja rastro. Por lo mismo vive en su propio scope (`dbaas:credentials`): `dbaas:write` crea bases y usuarios acotados, esto da acceso total a los datos y sobrevive a revocar la key.",
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
    "summary": "Crear una base",
    "description": "`charset` y `collation` son de MySQL; `owner`, de PostgreSQL. El resto de los motores los ignora. La respuesta no trae tamaño ni conteo de tablas: la base nace vacía y releerla costaría otra llamada para informar un cero.",
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
        "description": "Solo MySQL. Default `utf8mb4`."
      },
      {
        "flag": "collation",
        "key": "collation",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "Solo MySQL. Default `utf8mb4_unicode_ci`."
      },
      {
        "flag": "owner",
        "key": "owner",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "Solo PostgreSQL. Usuario dueño de la base; por defecto el administrador."
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
    "summary": "Borrar una base",
    "description": "**Destructivo e irreversible**: se van los datos y no hay papelera. Lo único que queda es lo que haya en `GET /v1/dbaas/{id}/backups`.",
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
    "summary": "Listar las bases del servicio",
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
    "summary": "Obtener una base de datos con su estado real",
    "description": "Consulta el backend. Si no responde, los campos de estado vuelven en `null` y `capabilities` queda sin `databases`/`users` en vez de fallar: que el backend tenga un hipo no debería impedirte leer el resto del recurso.",
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
    "summary": "Listar las bases de datos gestionadas de la cuenta",
    "description": "Sale de la base, sin consultar el backend: `engine`, `state`, `host` y `plan` vienen en `null`, y `capabilities` **omite** `databases` y `users` porque saber si el motor las tiene costaría una llamada por elemento de la página. Una clave ausente es \"no se consultó\", que no es lo mismo que `false`. Para el estado real de una, `GET /v1/dbaas/{id}`.",
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
    "summary": "Reiniciar el motor",
    "description": "Corta las conexiones abiertas: las transacciones en vuelo se pierden. Devuelve `202` con una operación ya terminada —el reinicio es síncrono en los dos backends— para que el cliente trate todas las mutaciones largas igual, y para que el día que deje de serlo no cambie el contrato sino la columna `backend` de la operación.",
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
    "summary": "Últimas líneas del log del motor",
    "description": "La cola del log del proceso del motor, de la más vieja a la más nueva. No es un log de consultas ni de auditoría: son los mensajes de arranque, errores y avisos del motor.",
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
    "summary": "Métricas de la instancia",
    "description": "Instantánea, no serie temporal. Qué campos vienen llenos depende del backend del servicio: unos miden el contenedor y otros el motor.",
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
    "summary": "Crear un usuario",
    "description": "La password no se guarda de nuestro lado ni se devuelve después: si se pierde, se cambia con `POST /v1/dbaas/{id}/users/{username}/password`.",
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
        "description": "No se guarda ni se devuelve: si se pierde, se cambia con `POST /v1/dbaas/{id}/users/{username}/password`."
      },
      {
        "flag": "host",
        "key": "host",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "Solo MySQL. Default `%` (cualquier origen)."
      },
      {
        "flag": "databases",
        "key": "databases",
        "in": "body",
        "type": "string[]",
        "required": false,
        "description": "Bases sobre las que se le otorgan permisos."
      },
      {
        "flag": "privileges",
        "key": "privileges",
        "in": "body",
        "type": "string[]",
        "required": false,
        "description": "MySQL: privilegios de SQL (`SELECT`, `INSERT`, …); default `ALL` sobre `databases`. PostgreSQL: se usa el primero como rol (`readwrite`, `readonly`). Una palabra por elemento: los privilegios compuestos (`ALL PRIVILEGES`) no se aceptan porque el valor termina dentro de un `GRANT` que el motor arma por concatenación."
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
    "summary": "Borrar un usuario",
    "description": "**Corta el acceso de todo lo que estuviera conectado con ese usuario.** No borra datos: las bases que creó siguen ahí.",
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
    "summary": "Listar los usuarios del motor",
    "description": "Incluye al administrador. En MySQL el mismo nombre puede aparecer con varios `host`: el par `usuario@host` es lo que identifica al usuario, y por eso es el `id` del recurso.",
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
    "summary": "Cambiar la password de un usuario",
    "description": "Toma efecto de inmediato: las aplicaciones que sigan usando la anterior van a fallar al reconectar. Sirve también para el usuario administrador.",
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
    "summary": "Borrar un RRset",
    "description": "Borra todos los valores de ese nombre y tipo.",
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
    "summary": "Obtener un RRset",
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
    "summary": "Listar los registros de una zona",
    "description": "Agrupados en RRsets: un `A` con dos IPs es **un** registro con dos valores. La respuesta trae un `ETag`; pasalo como `If-Match` al escribir y ningún cambio concurrente se pierde.",
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
    "summary": "Aplicar varios cambios a la vez",
    "description": "Cada elemento reemplaza su RRset; `values: []` lo borra. Es la forma de aplicar un cambio coherente —mover un sitio y su correo juntos— sin que quede a medias entre dos llamadas. **No es atómico en el backend**: si un cambio falla, los anteriores ya se aplicaron y la respuesta dice cuál cortó.",
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
    "summary": "Crear o reemplazar un RRset",
    "description": "Reemplaza el RRset **entero**: los valores que no vengan en `values` se borran. Es la semántica del DNS y la del backend — no existe \"agregar una IP\" sin reescribir el conjunto. Leé el RRset, agregá el valor a la lista y mandá la lista completa con el `ETag` en `If-Match`.",
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
        "description": "Segundos, 60–604800. Default 3600."
      },
      {
        "flag": "values",
        "key": "values",
        "in": "body",
        "type": "string[]",
        "required": true,
        "description": "Reemplaza el RRset **entero**. Los valores que no estén acá se borran: para agregar uno, leé el RRset, agregalo a la lista y mandá la lista completa."
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
    "summary": "Exportar la zona en formato BIND",
    "description": "El archivo de zona tal como lo emite el backend. Útil para respaldo o migración.",
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
    "summary": "Obtener una zona",
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
    "summary": "Listar las zonas DNS de la cuenta",
    "description": "Sale de la base, sin consultar el backend de DNS: `record_count` y `serial` vienen en `null`. Traerlos costaría una llamada por zona y hay cuentas con decenas.",
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
    "summary": "Agregar un destino a un listener",
    "description": "Atajo sobre `PUT /listeners` para el caso frecuente de sumar una máquina. Revalida y aplica la configuración completa, así que hereda la misma garantía: o el destino queda recibiendo tráfico, o no cambió nada.",
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
        "description": "Nombre de un listener existente."
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
    "summary": "Quitar un destino de un listener",
    "description": "Los tres valores que identifican al destino van en la ruta. El backend los espera en el cuerpo de un `DELETE`, cosa que proxies y CDNs descartan y que varios clientes HTTP no mandan; el cuerpo se arma de este lado.\n\n**Un listener no puede quedarse sin destinos.** Quitar el último devuelve `400 validation_failed`: para eliminar el listener entero usá `PUT /listeners` sin él.",
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
    "summary": "Listar los destinos",
    "description": "Los destinos de todos los listeners, aplanados, cada uno con el listener al que pertenece. Es una vista sobre la misma configuración que devuelve `GET /listeners`.",
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
    "summary": "Obtener un load balancer con su estado real",
    "description": "Consulta el control plane, que a su vez sondea el balanceador. Si no responde, los campos de estado vuelven en `null` en vez de fallar.",
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
    "summary": "Listar los load balancers de la cuenta",
    "description": "Sale de la base, sin consultar el control plane: `provisioning_state`, `healthy` y `listener_count` vienen en `null`. Traerlos costaría una llamada por elemento de la página.\n\nUna página puede venir con menos elementos que el `limit` aunque haya más: todos los productos del control plane comparten un mismo módulo de aprovisionamiento, así que el filtro por familia solo puede aplicarse después de leer la página. `has_more` sigue siendo la señal correcta de si queda algo por traer.",
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
    "summary": "Listar los listeners",
    "description": "La configuración completa del balanceador, incluidos los destinos de cada listener. Es lo que hay que leer, modificar y volver a mandar en `PUT`.",
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
    "summary": "Reemplazar la configuración de listeners",
    "description": "**Reemplaza el conjunto entero**: los listeners que no vengan en `listeners` se borran, con sus destinos. Mandar `[]` deja el balanceador sin nada escuchando y corta el tráfico. Leé `GET /listeners`, modificá y mandá todo de vuelta.\n\n**El cambio se aplica dentro de la llamada**: cuando esto devuelve, la configuración nueva ya está sirviendo tráfico. Si la configuración resultante es inválida no se aplica nada y la respuesta es `400 validation_failed` — el servicio nunca queda a medias.",
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
        "description": "El conjunto **completo**. Lo que no esté acá se borra, incluidos sus destinos; mandar `[]` deja el balanceador sin nada escuchando. Nombres y puertos son únicos dentro del conjunto."
      }
    ]
  },
  {
    "path": [
      "lb",
      "stats"
    ],
    "operationId": "lb.stats.get",
    "summary": "Estado y tráfico por listener",
    "description": "Una foto del momento: conexiones en curso y bytes acumulados desde el último arranque del balanceador, más la salud de cada destino según el último sondeo. No hay serie histórica.\n\nSi el balanceador no contesta el sondeo, los listeners igual aparecen —salen de la configuración guardada— con `state: unknown` y los contadores en cero. Un listener que existe y no responde y uno que existe sin tráfico no se distinguen por los contadores: miralos por `state`.",
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
    "summary": "Agregar un dominio de envío",
    "description": "Devuelve **los registros DNS que hay que publicar** en la zona del dominio. Eso es lo importante de esta llamada: hasta que estén publicados y SES los vea, el dominio no verifica y no se puede enviar desde él. Cada registro trae `purpose`, `type`, `host`, `value` y `status`; `purpose` es la clave estable con la que automatizar la publicación.\n\nLa verificación es **asíncrona y del lado de SES**: esta llamada no espera. Consultá el estado con `POST /v1/mail-gateway/domains/{domain}/verify`.\n\nEs idempotente: repetirla sobre un dominio ya dado de alta reusa el mismo par de llaves DKIM y devuelve los mismos registros, así que un reintento no invalida lo ya publicado.",
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
        "description": "Dominio de envío. Se normaliza a minúsculas. Tenés que poder editar su DNS: el alta devuelve los registros a publicar."
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
    "summary": "Quitar un dominio de envío",
    "description": "Corta el envío desde ese dominio: sale de la política del SMTP y de las keys. Los registros DNS quedan publicados en tu zona; borrarlos es cosa tuya. Volver a agregarlo genera llaves DKIM nuevas, así que el TXT viejo deja de servir.",
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
    "summary": "Listar los dominios de envío",
    "description": "Cada dominio viene con los registros DNS que le corresponden y el estado de cada uno. Solo se puede enviar desde un dominio `verified`.",
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
    "summary": "Consultar la verificación de un dominio",
    "description": "**Consulta, no fuerza.** SES revisa el DNS público por su cuenta y a su ritmo; esto lee ese resultado y actualiza el estado del dominio y el de cada registro. Que vuelva `pending` no es un error: significa que SES todavía no vio los registros, sea porque no propagaron o porque falta publicarlos.\n\nLos registros `dkim` y `mail_from_mx` son los que SES verifica. `spf`, `mail_from_spf` y `dmarc` quedan siempre en `info`: mejoran la entrega, pero no hay quien los chequee.\n\n`verified_at` viene en `null` en esta respuesta aunque el estado sea `verified`; el dato está en `GET /v1/mail-gateway/domains`.",
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
    "summary": "Crear una API key de envío",
    "description": "Devuelve la key completa en `secret`, **una sola vez**: guardamos su hash, así que no hay forma de volver a mostrarla. Si se pierde, se crea otra y se revoca esta.\n\nEsta key **no sirve contra esta API**: se usa en el plano de envío, `POST {api_endpoint}/emails` (hoy `https://mg.truo.cloud/v1/emails`), con `Authorization: Bearer mg_live_…`. El envío no pasa por `api.truo.cloud` a propósito: un salto de más en el camino del correo es un modo de falla de más.\n\nPide `mailgateway:send` y no `mailgateway:write` porque emitir esta credencial **es** poder enviar en nombre de la cuenta, y eso sobrevive a que revoquen la key de esta API.",
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
    "summary": "Revocar una API key de envío",
    "description": "Efecto casi inmediato: la key sale del índice del gateway. Lo que ya se aceptó, se entrega. Revocar es `write` y no `send` a propósito: quitarle capacidad de envío a la cuenta no debería exigir el scope que **otorga** capacidad de envío.",
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
    "summary": "Listar las API keys de envío",
    "description": "Incluye las revocadas, para que se pueda auditar qué hubo. `secret` siempre es `null`: de la key guardamos su hash y no hay forma de recuperarla.",
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
    "summary": "Listar los mensajes enviados",
    "description": "Un elemento por mensaje, del más reciente al más viejo, con el estado agregado del evento de mayor severidad que se vio (`bounced` gana a `delivered`). Se retienen 90 días.\n\nSin `total`: el backend no sabe cuántos mensajes matchean sin recorrer la historia entera, y ninguna colección de `/v1` publica totales. Paginá con `next_cursor`.",
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
    "summary": "Métricas de entrega y reputación",
    "description": "Tasas de entrega, apertura, rebote y queja del rango, con la serie diaria, la latencia envío→entrega y el desglose por dominio. Las tasas son fracciones (0–1), no porcentajes. `bounce_rate_limit` y `complaint_rate_limit` son los umbrales de SES: cruzarlos suspende el envío para proteger la reputación compartida.",
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
    "summary": "Ver la configuración SMTP",
    "description": "Host, puerto, usuario y estado, **sin la password**. Es lo que hace falta para configurar o revisar un cliente de correo sin manipular el secreto. Para la password, `POST /v1/mail-gateway/smtp`.",
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
    "summary": "Revelar la password SMTP",
    "description": "Devuelve la password SMTP en claro. **Es un POST a propósito, aunque no cambie nada.** El backend la expone en un GET, y un GET que devuelve un secreto queda en el historial del navegador, en la caché de cualquier proxy y en el `curl` de ayer. Un POST obliga a una acción deliberada, no es cacheable, y entra al audit log como mutación — que es exactamente cómo hay que poder auditar \"quién sacó la clave de envío y cuándo\".\n\nLa password es recuperable (se guarda cifrada, no hasheada) porque un servidor de correo la necesita entera en cada conexión. Si la comprometieron, no alcanza con dejar de mirarla: rotala con `POST /v1/mail-gateway/smtp/rotate`.",
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
    "summary": "Rotar la credencial SMTP",
    "description": "Emite usuario y password nuevos y devuelve los dos. La credencial anterior queda desactivada, no borrada, para que una aplicación que todavía la tenga en memoria no se caiga en el instante de la rotación — pero dejará de funcionar, así que actualizá tus sistemas. No hay vuelta atrás: la vieja no se puede reactivar desde acá.",
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
    "summary": "Obtener el Mail Gateway de la cuenta",
    "description": "No lleva id: hay un solo Mail Gateway por cuenta. Trae el estado, el uso del mes y cuántos dominios y keys hay; el detalle de cada uno tiene su propio endpoint. Si la cuenta no tiene el servicio, devuelve 404.",
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
    "summary": "Uso del mes en curso",
    "description": "Envíos aceptados y rechazados del mes calendario UTC en curso. Es el número que factura. Los rechazados no se cobran: son los que el gateway frenó antes de SES.",
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
    "summary": "Crear un bucket",
    "description": "Devuelve el mismo recurso que `GET /v1/object-storage/buckets/{bucket}`. El alta del backend responde la fila cruda del registro —otra forma, con otro formato de fecha— así que se relee antes de contestar: cuesta una llamada y compra que el alta y la lectura devuelvan el mismo objeto.",
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
        "description": "Default `private`."
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
    "summary": "Borrar un bucket",
    "description": "Un bucket con objetos no se borra: el request falla y no toca nada. `?purge=true` lo borra con todo el contenido, y eso **no se puede deshacer** — no hay papelera ni versiones. Si querés saber cuántos objetos se van a perder, vaciálo primero con `POST .../empty`, que devuelve la cuenta.",
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
    "summary": "Vaciar un bucket",
    "description": "Borra todos los objetos y conserva el bucket con su configuración. **No se puede deshacer.** Sobre un bucket grande puede tardar: el borrado va objeto por objeto contra el almacenamiento.",
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
    "summary": "Obtener un bucket",
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
    "summary": "Listar los buckets",
    "description": "Incluye los buckets creados directamente por el protocolo S3, que no tienen fila de registro: se listan igual —ocultarlos escondería datos que existen— con `created_at` en `null` y acceso privado.",
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
    "summary": "Métricas de un bucket",
    "description": "Almacenamiento, egress y requests del rango pedido. Las series traen un punto por día UTC y vienen vacías mientras no haya datos, en vez de rellenarse con ceros que se confundirían con un día sin tráfico.",
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
    "summary": "Cambiar la visibilidad de un bucket",
    "description": "Publicar el bucket le acuña una URL de lectura anónima (`public_url`) y la conserva si después se vuelve privado: republicar devuelve la misma URL, no una nueva.",
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
        "description": "`public` publica el bucket en una URL de solo lectura (`public_url`). `private` la retira: los objetos siguen accesibles con llave o con una URL prefirmada."
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
    "summary": "Emitir una llave de acceso",
    "description": "Es el **único** endpoint que devuelve `secret_access_key`, y lo devuelve una sola vez: no se guarda en claro de nuestro lado y no hay forma de recuperarlo después. Si se pierde, la salida es borrar la llave y emitir otra. Las llaves conviven: emitir una no revoca las anteriores. Acotá cada una a un bucket con `scope` para que perder una no comprometa el resto.",
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
        "description": "Para reconocerla después. No tiene efecto sobre los permisos."
      }
    ],
    "flags": [
      {
        "flag": "scope",
        "key": "scope",
        "in": "body",
        "type": "string",
        "required": false,
        "description": "Nombre de bucket para acotar la llave, o `*` (default) para todos. Una llave por bucket es lo que hace que perder una no comprometa el resto."
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
        "description": "Default `readwrite`."
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
    "summary": "Revocar una llave de acceso",
    "description": "La revocación es inmediata. Revocar una llave **invalida también las URLs prefirmadas que se firmaron con ella**, aunque no hayan expirado: la firma se valida contra la llave, y una llave revocada ya no existe. Es la única forma de cortar una URL prefirmada antes de tiempo.",
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
    "summary": "Listar las llaves de acceso",
    "description": "Solo las activas, y nunca el secreto.",
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
    "summary": "Borrar objetos",
    "description": "Borrado en lote por key. Es un `POST` y no un `DELETE` porque la lista de keys va en el cuerpo: un `DELETE` con body no lo mandan igual todos los clientes HTTP. **No se puede deshacer.** `deleted` puede ser menor que la cantidad de keys pedidas: las que no existían no cuentan.",
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
        "description": "Keys relativas al bucket. Una key que no existe no es un error: no se cuenta."
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
    "summary": "Listar objetos de un bucket",
    "description": "Un nivel a la vez, como un explorador de archivos: las entradas con `is_folder: true` son prefijos, y se navegan pasando su `key` como `prefix`. No acepta `limit`: el backend fija el tamaño de página (hasta 1000 entradas) y recortar acá perdería objetos en silencio al avanzar el cursor.",
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
    "summary": "Firmar una URL temporal",
    "description": "Devuelve un link que funciona sin credenciales hasta que expira. `method: \"GET\"` para descargar (requiere `objectstorage:read`), `method: \"PUT\"` para subir (requiere `objectstorage:write`). La URL es una credencial de portador: funciona para cualquiera que la tenga y la única forma de cortarla antes de que venza es revocar la llave S3 que la firmó. Pedí el TTL más corto que te sirva. Hereda además el alcance de esa llave: si está acotada a un bucket o es de solo lectura, la URL no puede más que ella.",
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
        "description": "Key relativa al bucket."
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
        "description": "Qué habilita la URL: `GET` descarga, `PUT` sube. Default `GET`. Firmar un `PUT` requiere `objectstorage:write`."
      },
      {
        "flag": "expires-in",
        "key": "expires_in",
        "in": "body",
        "type": "number",
        "required": false,
        "description": "Segundos de validez, 1–604800 (7 días). Default 900."
      }
    ]
  },
  {
    "path": [
      "object-storage",
      "get"
    ],
    "operationId": "objectstorage.tenant.get",
    "summary": "Obtener el Object Storage de la cuenta",
    "description": "Uso, endpoint y estado. Es singleton por cuenta: no hay listado ni id que pasar. El almacenamiento y el conteo de objetos salen del último snapshot diario, no de un escaneo en vivo, así que un objeto recién subido puede tardar en reflejarse en los totales.",
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
    "summary": "Estado de una operación",
    "description": "Se consulta el backend real al leer, con caché de 2 s. Si el backend no responde se devuelve el último estado conocido con `stale: true` y **nunca un 500**: un cliente haciendo polling no debe perder su operación por un hipo del backend, ni ser empujado a reintentar la mutación.",
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
    "summary": "Listar operaciones recientes de la cuenta",
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
    "summary": "Obtener un servicio",
    "description": "Un 404 acá significa tanto \"no existe\" como \"existe pero esta credencial no puede verlo\". Es deliberado: un 403 confirmaría la existencia del servicio y convertiría la API en un oráculo de enumeración.",
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
    "summary": "Listar los servicios de la cuenta",
    "description": "Devuelve solo los servicios que esta credencial puede ver: se aplican la allowlist de la key y los permisos por servicio del usuario dueño. Es el punto de entrada para obtener los `service_id` que usan los demás recursos.",
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
    "summary": "Crear un backup",
    "description": "Encola un `vzdump`. Con `mode: snapshot` (default) la máquina sigue andando. La operación refleja que la tarea quedó encolada, no que el archivo esté listo: el tamaño final aparece en `GET /v1/vps/{id}/backups` cuando el hipervisor termina.",
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
        "description": "`snapshot` no interrumpe el servicio. `stop` apaga la VM durante el backup."
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
    "summary": "Borrar un backup",
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
    "summary": "Backups del VPS",
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
    "summary": "Restaurar un backup",
    "description": "**Destructivo.** Apaga la máquina y sobreescribe el disco entero: todo lo escrito después de ese backup se pierde. El backend verifica que el backup pertenezca a este VPS antes de tocar nada.",
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
    "summary": "Configuración de la máquina",
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
    "summary": "Abrir una consola",
    "description": "Emite un ticket de un solo uso. **Da acceso total al sistema operativo**, sin pasar por la red ni por SSH, y por eso vive en su propio scope (`vps:console`) en vez de caer bajo `vps:write`. No lo loguees: el `file` de SPICE lleva la contraseña adentro.",
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
    "summary": "Obtener un VPS con su estado real",
    "description": "Consulta el hipervisor. Si no responde, los campos de estado vuelven en `null` en vez de fallar: que el hipervisor tenga un hipo no debería impedirte leer el resto del recurso ni sus `capabilities`.",
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
    "summary": "IPs asignadas al VPS",
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
    "summary": "Listar los VPS de la cuenta",
    "description": "Sale de la base, sin consultar el hipervisor: `state`, `cpu`, `memory` y `disk` vienen en `null`. Traerlos costaría una llamada al backend por cada elemento de la página. Para el estado vivo de uno, `GET /v1/vps/{id}`.",
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
    "summary": "Serie de uso de CPU, memoria, disco y red",
    "description": "Serie RRD del hipervisor. La resolución la fija el `timeframe` y no es configurable: `hour` da minutos, `year` da semanas. `cpu_percent` es porcentaje del total asignado.",
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
    "summary": "Encender, apagar o reiniciar",
    "description": "Devuelve `202` en cuanto la orden sale, no cuando la máquina llegó al estado pedido. La operación se resuelve contra el **estado real de la VM**, así que sobrevive a que el backend tarde más que el timeout HTTP — un `reboot` es apagar, esperar y encender, y eso no entra en una request. Esperá con `GET /v1/operations/{id}`.",
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
        "description": "`shutdown` pide un apagado ordenado al sistema operativo y cae a corte duro si no responde. `stop` corta la energía de una: puede corromper el sistema de archivos."
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
    "summary": "Reinstalar el sistema operativo",
    "description": "**Destructivo e irreversible: borra el disco entero.** Encola un job que corre la misma máquina de estados que un alta nueva (aprovisionar → esperar el boot → chequeo de salud), así que la operación reporta progreso real y puede tardar varios minutos. La IP se conserva.",
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
        "description": "Un `id` de `GET /v1/vps/{id}/templates`."
      },
      {
        "flag": "root-password",
        "key": "root_password",
        "in": "body",
        "type": "string",
        "required": true,
        "description": "Password de root del sistema nuevo. No se guarda ni se devuelve nunca: si se pierde, la única salida es otra reinstalación."
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
    "summary": "Sistemas operativos disponibles para reinstalar",
    "description": "Depende del tipo de máquina y del nodo donde vive, así que se pide por VPS y no global.",
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
    "summary": "Renombrar un VPS",
    "description": "Cambia el hostname del sistema operativo. En LXC toma efecto al vuelo; en KVM cambia el nombre de la VM y el sistema operativo lo adopta al reiniciar.",
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
        "description": "Etiqueta simple o FQDN. El backend valida el formato."
      }
    ]
  }
];

/** Indexados por `truo <a> <b>`, que es como los busca el dispatcher. */
export const COMMANDS_BY_PATH: Record<string, CommandSpec> = Object.fromEntries(
  COMMANDS.map((c) => [c.path.join(" "), c]),
);
