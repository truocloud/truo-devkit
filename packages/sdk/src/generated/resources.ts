// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVO GENERADO — no editar a mano.
//
// Sale de packages/openapi/openapi/v1.json a traves de packages/codegen.
// Para cambiarlo: cambia el handler en la API (los schemas Zod son la fuente de
// verdad), regenera el spec alla, 'bun run sync:spec' aca, y 'bun run gen'.
// ─────────────────────────────────────────────────────────────────────────────

import type * as T from "./types.ts";
import type { Call, Paginate, RequestOptions } from "../types.ts";

/**
 * Construye el arbol de recursos del cliente sobre un transporte.
 *
 * Cada metodo es una linea: resuelve el `operationId`, arma path/query/body y delega.
 * Toda la logica de verdad —reintentos, idempotencia, errores, cursor— vive en el
 * transporte, no aca, asi que regenerar este archivo nunca puede romperla.
 */
export function createResources(call: Call, paginate: Paginate) {
  return {
    account: {
      /**
       * Obtener la cuenta y la credencial actual
       * 
       * Scope: `account:read`
       */
      get: (params?: RequestOptions) =>
        call<T.Account>("account.get", { path: undefined, body: undefined, queryKeys: undefined, params }),
    },
    apiKeys: {
      /**
       * Crear una API key
       * Devuelve el token en claro **una sola vez**. Guardalo en el momento: solo se almacena su hash SHA-256 y no hay forma de recuperarlo después.
       * 
       * Scope: `apikeys:write`
       */
      create: (body?: T.ApiKeyCreate, params?: RequestOptions) =>
        call<T.ApiKeyCreated>("apiKeys.create", { path: undefined, body: body, queryKeys: undefined, params }),
      /**
       * Obtener una API key
       * 
       * Scope: `apikeys:read`
       */
      get: (id: string, params?: RequestOptions) =>
        call<T.ApiKey>("apiKeys.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      /**
       * Listar las API keys de la cuenta
       * Solo con sesión. Nunca devuelve tokens: solo prefijo y últimos 4.
       * 
       * Scope: `apikeys:read`
       */
      list: (params?: T.ApiKeysListQuery & RequestOptions) =>
        call<T.ApiKeyList>("apiKeys.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
      /**
       * Itera **todas** las paginas de `apiKeys.list`, siguiendo el cursor sola.
       * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
       */
      listAll: (params?: T.ApiKeysListQuery & RequestOptions) =>
        paginate<T.ApiKey>(
          "apiKeys.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
        ),
      /**
       * Revocar una API key
       * Irreversible. La revocación se propaga a todas las réplicas por pub/sub en menos de un segundo; el peor caso, con Redis caído, es 60 segundos (el TTL de la caché en proceso).
       * 
       * Scope: `apikeys:write`
       * **Destructiva: no tiene vuelta atras.**
       */
      revoke: (id: string, params?: RequestOptions) =>
        call<T.ApiKey>("apiKeys.revoke", { path: { id }, body: undefined, queryKeys: undefined, params }),
      /**
       * Modificar una API key
       * Los scopes y la allowlist solo se pueden **estrechar**. Ampliar devuelve 403: sin esa regla, una key con `vps:read` se auto-promueve a `vps:write` con un PATCH y el scope deja de significar algo.
       * 
       * Scope: `apikeys:write`
       */
      update: (id: string, body?: T.ApiKeyUpdate, params?: RequestOptions) =>
        call<T.ApiKey>("apiKeys.update", { path: { id }, body: body, queryKeys: undefined, params }),
    },
    auditLogs: {
      /**
       * Listar la actividad de API de la cuenta
       * Incluye los intentos **denegados** (4xx), no solo lo que funcionó: una credencial probando endpoints que no le corresponden es precisamente la señal que hay que poder ver.
       * 
       * Scope: `audit:read`
       */
      list: (params?: T.AuditLogsListQuery & RequestOptions) =>
        call<T.AuditLogList>("auditLogs.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor", "status", "deniedOnly"], params }),
      /**
       * Itera **todas** las paginas de `auditLogs.list`, siguiendo el cursor sola.
       * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
       */
      listAll: (params?: T.AuditLogsListQuery & RequestOptions) =>
        paginate<T.AuditLog>(
          "auditLogs.list", { path: undefined, queryKeys: ["limit", "cursor", "status", "deniedOnly"], params },
        ),
    },
    caas: {
      apps: {
        /**
         * Crear una app
         * Crea la app y configura su origen, pero **no la despliega**: queda en `idle` hasta que llames a `POST /v1/caas/{id}/apps/{app_id}/deploy`. Separar las dos cosas es lo que permite crear la app, cargarle las variables y recién ahí desplegar — el orden inverso arrancaría la aplicación sin su configuración.
         * 
         * Scope: `caas:write`
         */
        create: (id: string, body: T.CaasAppsCreateBody, params?: RequestOptions) =>
          call<T.CaasApp>("caas.apps.create", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * Borrar una app
         * **Destructivo.** Borra la app, sus variables y sus dominios. Los datos de las bases del servicio no se tocan: viven aparte.
         * 
         * Scope: `caas:write`
         * **Destructiva: no tiene vuelta atras.**
         */
        delete: (id: string, appId: string, params?: RequestOptions) =>
          call<void>("caas.apps.delete", { path: { id, app_id: appId }, body: undefined, queryKeys: undefined, params }),
        /**
         * Desplegar una app
         * Devuelve `202` en cuanto el despliegue arranca. La operación se resuelve buscando ese despliegue en el historial de la app, que es el único lugar donde el backend reporta en qué quedó. Esperá con `GET /v1/operations/{id}`; el detalle de un fallo está en `GET /v1/caas/{id}/apps/{app_id}/logs`.
         * 
         * Vive en su propio scope (`caas:deploy`) porque desplegar ejecuta el código que haya en el origen configurado — es distinto de editar la configuración de la app.
         * 
         * Scope: `caas:deploy`
         * Devuelve una operacion asincrona; espera con `operations.wait()`.
         */
        deploy: (id: string, appId: string, params?: RequestOptions) =>
          call<T.Operation>("caas.apps.deploy", { path: { id, app_id: appId }, body: undefined, queryKeys: undefined, params }),
        /**
         * Obtener una app
         * Devuelve **solo** los campos declarados. El backend responde con el objeto interno completo del motor de despliegue —que incluye las variables de entorno en claro—; nada de eso sale por acá. Para los nombres de las variables, `GET /v1/caas/{id}/apps/{app_id}/env`.
         * 
         * Scope: `caas:read`
         */
        get: (id: string, appId: string, params?: RequestOptions) =>
          call<T.CaasApp>("caas.apps.get", { path: { id, app_id: appId }, body: undefined, queryKeys: undefined, params }),
        /**
         * Listar las apps del servicio
         * `source` viene en `null`: el backend no lo trae en el listado.
         * 
         * Scope: `caas:read`
         */
        list: (id: string, params?: T.CaasAppsListQuery & RequestOptions) =>
          call<T.CaasAppList>("caas.apps.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `caas.apps.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (id: string, params?: T.CaasAppsListQuery & RequestOptions) =>
          paginate<T.CaasApp>(
            "caas.apps.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Logs de una app
         * **Es una foto, no un stream.** Devuelve lo que el backend tenga en el momento de la llamada y no hay forma de pedir "lo que vino después": el backend acepta un cursor pero nunca emite el siguiente, así que este endpoint no publica ninguno. Para seguir una aplicación en vivo, volvé a llamar.
         * 
         * Scope: `caas:read`
         */
        logs: (id: string, appId: string, params?: RequestOptions) =>
          call<T.CaasLogs>("caas.apps.logs", { path: { id, app_id: appId }, body: undefined, queryKeys: undefined, params }),
        /**
         * Reiniciar una app
         * Reinicia el proceso sin volver a construir la imagen: toma las variables de entorno actuales pero **no** trae código nuevo. Para eso es `deploy`.
         * 
         * Scope: `caas:write`
         */
        restart: (id: string, appId: string, params?: RequestOptions) =>
          call<T.Operation>("caas.apps.restart", { path: { id, app_id: appId }, body: undefined, queryKeys: undefined, params }),
      },
      databases: {
        /**
         * Crear una base de datos
         * La contraseña la genera la plataforma y **no se devuelve acá ni en ningún otro endpoint de `/v1`**: no hay forma de recuperarla por esta API. Conectate desde una app del mismo servicio, donde la cadena de conexión ya está disponible.
         * 
         * Borrar una base no está en esta versión: el backend todavía no lo implementa y publicar un endpoint que siempre falla sería publicar roadmap.
         * 
         * Scope: `caas:write`
         */
        create: (id: string, body: T.CaasDatabasesCreateBody, params?: RequestOptions) =>
          call<T.CaasDatabase>("caas.databases.create", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * Bases de datos del servicio
         * Son del servicio, no de una app: varias apps del mismo servicio pueden usar la misma base. **Las credenciales no se devuelven** por ningún endpoint de esta API.
         * 
         * Scope: `caas:read`
         */
        list: (id: string, params?: T.CaasDatabasesListQuery & RequestOptions) =>
          call<T.CaasDatabaseList>("caas.databases.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `caas.databases.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (id: string, params?: T.CaasDatabasesListQuery & RequestOptions) =>
          paginate<T.CaasDatabase>(
            "caas.databases.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
      },
      deployments: {
        /**
         * Historial de despliegues de una app
         * Del más reciente al más viejo, según lo devuelve el backend.
         * 
         * Scope: `caas:read`
         */
        list: (id: string, appId: string, params?: T.CaasDeploymentsListQuery & RequestOptions) =>
          call<T.CaasDeploymentList>("caas.deployments.list", { path: { id, app_id: appId }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `caas.deployments.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (id: string, appId: string, params?: T.CaasDeploymentsListQuery & RequestOptions) =>
          paginate<T.CaasDeployment>(
            "caas.deployments.list", { path: { id, app_id: appId }, queryKeys: ["limit", "cursor"], params },
          ),
      },
      domains: {
        /**
         * Agregar un dominio a una app
         * El DNS del host tiene que estar apuntado a la IP del servicio **antes** de llamar: la emisión del certificado se valida por HTTP.
         * 
         * Dos cosas más que hay que saber:
         * 
         * - **No es atómico.** El alta registra el dominio y después reconstruye el ruteo de entrada; si lo segundo falla, la llamada devuelve error con el dominio ya creado. Reintentar es seguro y es lo correcto — el alta es idempotente por host.
         * - **El certificado se emite después**, de forma asíncrona y sin ningún estado ni id que consultar. Por eso `certificate_type` viene en `null` acá. La única verificación real es una petición HTTPS al host.
         * 
         * Scope: `caas:write`
         */
        create: (id: string, appId: string, body: T.CaasDomainsCreateBody, params?: RequestOptions) =>
          call<T.CaasDomain>("caas.domains.create", { path: { id, app_id: appId }, body: body, queryKeys: undefined, params }),
        /**
         * Quitar un dominio de una app
         * Borrar un host que no está en la app no es un error: el ruteo de entrada se reconstruye igual, que es lo que hace que reintentar sea seguro.
         * 
         * Scope: `caas:write`
         * **Destructiva: no tiene vuelta atras.**
         */
        delete: (id: string, appId: string, host: string, params?: RequestOptions) =>
          call<void>("caas.domains.delete", { path: { id, app_id: appId, host }, body: undefined, queryKeys: undefined, params }),
        /**
         * Dominios de una app
         * 
         * Scope: `caas:read`
         */
        list: (id: string, appId: string, params?: RequestOptions) =>
          call<T.CaasDomainList>("caas.domains.list", { path: { id, app_id: appId }, body: undefined, queryKeys: undefined, params }),
        /**
         * Itera **todas** las paginas de `caas.domains.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (id: string, appId: string, params?: RequestOptions) =>
          paginate<T.CaasDomain>(
            "caas.domains.list", { path: { id, app_id: appId }, queryKeys: undefined, params },
          ),
      },
      env: {
        /**
         * Nombres de las variables de entorno
         * **Devuelve los nombres, nunca los valores.** No hay una versión de este endpoint que los devuelva: una vez escrito, un valor solo lo lee la aplicación. El backend enmascara aplicando una regex al nombre de la clave, lo que deja pasar en claro cualquier cosa que no se llame como un secreto (`DATABASE_URL`, `SENTRY_DSN`); eso no es una política de clasificación y no se publica.
         * 
         * Scope: `caas:read`
         */
        list: (id: string, appId: string, params?: RequestOptions) =>
          call<T.CaasEnvVarList>("caas.env.list", { path: { id, app_id: appId }, body: undefined, queryKeys: undefined, params }),
        /**
         * Itera **todas** las paginas de `caas.env.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (id: string, appId: string, params?: RequestOptions) =>
          paginate<T.CaasEnvVar>(
            "caas.env.list", { path: { id, app_id: appId }, queryKeys: undefined, params },
          ),
        /**
         * Reemplazar las variables de entorno
         * **Reemplaza el conjunto entero**: lo que no venga en `vars` se borra. No es una limitación, es la semántica del backend, que escribe el bloque completo de una.
         * 
         * Como `GET /env` no devuelve valores, el set tiene que salir de tu lado — de tu gestor de secretos o de tu repositorio de configuración. Eso es lo natural para infraestructura declarativa, y de paso elimina el modo de fallo del panel, donde guardar sin volver a escribir los secretos los borraba.
         * 
         * Los cambios toman efecto en el próximo `deploy` o `restart`.
         * 
         * Scope: `caas:write`
         * **Destructiva: no tiene vuelta atras.**
         */
        replace: (id: string, appId: string, body: T.CaasEnvReplaceBody, params?: RequestOptions) =>
          call<T.CaasEnvVarList>("caas.env.replace", { path: { id, app_id: appId }, body: body, queryKeys: undefined, params }),
      },
      instances: {
        /**
         * Obtener un servicio CaaS con su estado real
         * Consulta el control plane. Si no responde, `provisioning_state` y `machine` vuelven en `null` en vez de fallar: un hipo del control plane no debería impedirte leer el resto del recurso ni sus `capabilities`.
         * 
         * Scope: `caas:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.Caas>("caas.instances.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Listar los servicios CaaS de la cuenta
         * Sale de la base, sin consultar el control plane: `provisioning_state` y `machine` vienen en `null`. Traerlos costaría dos llamadas por elemento de la página.
         * 
         * Una página puede venir con menos elementos que el `limit` aunque haya más: todos los productos del control plane comparten un mismo módulo de aprovisionamiento, así que el filtro por familia solo puede aplicarse después de leer la página. `has_more` sigue siendo la señal correcta de si queda algo por traer.
         * 
         * Scope: `caas:read`
         */
        list: (params?: T.CaasInstancesListQuery & RequestOptions) =>
          call<T.CaasList>("caas.instances.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `caas.instances.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
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
         * Crear un backup
         * Devuelve `202` en cuanto la tarea arranca, no cuando el archivo está listo: un dump puede tardar minutos, muy por encima de cualquier timeout HTTP. La operación **se resuelve contra la lista de backups** —aparece uno nuevo o no— y no contra el resultado del POST, así que sobrevive a que la llamada expire con el backup corriendo. Esperala con `GET /v1/operations/{id}`.
         * 
         * Scope: `dbaas:write`
         * Devuelve una operacion asincrona; espera con `operations.wait()`.
         */
        create: (id: string, params?: RequestOptions) =>
          call<T.Operation>("dbaas.backups.create", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Backups del servicio
         * Del más nuevo al más viejo. Un servicio cuyo motor no tiene backups gestionados devuelve una lista vacía, no un error.
         * 
         * Scope: `dbaas:read`
         */
        list: (id: string, params?: T.DbaasBackupsListQuery & RequestOptions) =>
          call<T.DbaasBackupList>("dbaas.backups.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `dbaas.backups.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (id: string, params?: T.DbaasBackupsListQuery & RequestOptions) =>
          paginate<T.DbaasBackup>(
            "dbaas.backups.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
      },
      connection: {
        /**
         * Datos de conexión, sin la credencial
         * Host, puerto, base, usuario administrador, modo TLS y la CA del servicio — que es **pública** y sirve para verificar al servidor. **No incluye la password ni ninguna URI que la contenga**: la credencial sale de `POST /v1/dbaas/{id}/credentials`, que exige el scope `dbaas:credentials`.
         * 
         * Scope: `dbaas:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.DbaasConnection>("dbaas.connection.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
      credentials: {
        /**
         * Revelar la credencial de administración
         * Devuelve la password del administrador **en claro**. No rota nada: es la credencial que ya está en uso.
         * 
         * Es un POST y no un GET a propósito. Un GET queda en el historial del navegador, en los logs de cualquier proxy y en cachés intermedias, y se puede disparar sin querer desde un link; un POST obliga a una acción deliberada y entra al audit log como mutación, así que revelar la credencial de una base deja rastro. Por lo mismo vive en su propio scope (`dbaas:credentials`): `dbaas:write` crea bases y usuarios acotados, esto da acceso total a los datos y sobrevive a revocar la key.
         * 
         * Scope: `dbaas:credentials`
         */
        create: (id: string, params?: RequestOptions) =>
          call<T.DbaasCredential>("dbaas.credentials.create", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
      databases: {
        /**
         * Crear una base
         * `charset` y `collation` son de MySQL; `owner`, de PostgreSQL. El resto de los motores los ignora. La respuesta no trae tamaño ni conteo de tablas: la base nace vacía y releerla costaría otra llamada para informar un cero.
         * 
         * Scope: `dbaas:write`
         */
        create: (id: string, body: T.DbaasDatabasesCreateBody, params?: RequestOptions) =>
          call<T.DbaasDatabase>("dbaas.databases.create", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * Borrar una base
         * **Destructivo e irreversible**: se van los datos y no hay papelera. Lo único que queda es lo que haya en `GET /v1/dbaas/{id}/backups`.
         * 
         * Scope: `dbaas:write`
         * **Destructiva: no tiene vuelta atras.**
         */
        delete: (id: string, name: string, params?: RequestOptions) =>
          call<void>("dbaas.databases.delete", { path: { id, name }, body: undefined, queryKeys: undefined, params }),
        /**
         * Listar las bases del servicio
         * 
         * Scope: `dbaas:read`
         */
        list: (id: string, params?: T.DbaasDatabasesListQuery & RequestOptions) =>
          call<T.DbaasDatabaseList>("dbaas.databases.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `dbaas.databases.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (id: string, params?: T.DbaasDatabasesListQuery & RequestOptions) =>
          paginate<T.DbaasDatabase>(
            "dbaas.databases.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
      },
      instances: {
        /**
         * Obtener una base de datos con su estado real
         * Consulta el backend. Si no responde, los campos de estado vuelven en `null` y `capabilities` queda sin `databases`/`users` en vez de fallar: que el backend tenga un hipo no debería impedirte leer el resto del recurso.
         * 
         * Scope: `dbaas:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.Dbaas>("dbaas.instances.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Listar las bases de datos gestionadas de la cuenta
         * Sale de la base, sin consultar el backend: `engine`, `state`, `host` y `plan` vienen en `null`, y `capabilities` **omite** `databases` y `users` porque saber si el motor las tiene costaría una llamada por elemento de la página. Una clave ausente es "no se consultó", que no es lo mismo que `false`. Para el estado real de una, `GET /v1/dbaas/{id}`.
         * 
         * Scope: `dbaas:read`
         */
        list: (params?: T.DbaasInstancesListQuery & RequestOptions) =>
          call<T.DbaasList>("dbaas.instances.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `dbaas.instances.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (params?: T.DbaasInstancesListQuery & RequestOptions) =>
          paginate<T.Dbaas>(
            "dbaas.instances.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Reiniciar el motor
         * Corta las conexiones abiertas: las transacciones en vuelo se pierden. Devuelve `202` con una operación ya terminada —el reinicio es síncrono en los dos backends— para que el cliente trate todas las mutaciones largas igual, y para que el día que deje de serlo no cambie el contrato sino la columna `backend` de la operación.
         * 
         * Scope: `dbaas:write`
         */
        restart: (id: string, params?: RequestOptions) =>
          call<T.Operation>("dbaas.instances.restart", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
      logs: {
        /**
         * Últimas líneas del log del motor
         * La cola del log del proceso del motor, de la más vieja a la más nueva. No es un log de consultas ni de auditoría: son los mensajes de arranque, errores y avisos del motor.
         * 
         * Scope: `dbaas:read`
         */
        get: (id: string, params?: T.DbaasLogsGetQuery & RequestOptions) =>
          call<T.DbaasLogs>("dbaas.logs.get", { path: { id }, body: undefined, queryKeys: ["lines"], params }),
      },
      stats: {
        /**
         * Métricas de la instancia
         * Instantánea, no serie temporal. Qué campos vienen llenos depende del backend del servicio: unos miden el contenedor y otros el motor.
         * 
         * Scope: `dbaas:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.DbaasStats>("dbaas.stats.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
      users: {
        /**
         * Crear un usuario
         * La password no se guarda de nuestro lado ni se devuelve después: si se pierde, se cambia con `POST /v1/dbaas/{id}/users/{username}/password`.
         * 
         * Scope: `dbaas:write`
         */
        create: (id: string, body: T.DbaasUsersCreateBody, params?: RequestOptions) =>
          call<T.DbaasUser>("dbaas.users.create", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * Borrar un usuario
         * **Corta el acceso de todo lo que estuviera conectado con ese usuario.** No borra datos: las bases que creó siguen ahí.
         * 
         * Scope: `dbaas:write`
         * **Destructiva: no tiene vuelta atras.**
         */
        delete: (id: string, username: string, params?: T.DbaasUsersDeleteQuery & RequestOptions) =>
          call<void>("dbaas.users.delete", { path: { id, username }, body: undefined, queryKeys: ["host"], params }),
        /**
         * Listar los usuarios del motor
         * Incluye al administrador. En MySQL el mismo nombre puede aparecer con varios `host`: el par `usuario@host` es lo que identifica al usuario, y por eso es el `id` del recurso.
         * 
         * Scope: `dbaas:read`
         */
        list: (id: string, params?: T.DbaasUsersListQuery & RequestOptions) =>
          call<T.DbaasUserList>("dbaas.users.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `dbaas.users.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (id: string, params?: T.DbaasUsersListQuery & RequestOptions) =>
          paginate<T.DbaasUser>(
            "dbaas.users.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Cambiar la password de un usuario
         * Toma efecto de inmediato: las aplicaciones que sigan usando la anterior van a fallar al reconectar. Sirve también para el usuario administrador.
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
         * Borrar un RRset
         * Borra todos los valores de ese nombre y tipo.
         * 
         * Scope: `dns:write`
         * **Destructiva: no tiene vuelta atras.**
         */
        delete: (zone: string, name: string, type: string, params?: RequestOptions) =>
          call<void>("dns.records.delete", { path: { zone, name, type }, body: undefined, queryKeys: undefined, params }),
        /**
         * Obtener un RRset
         * 
         * Scope: `dns:read`
         */
        get: (zone: string, name: string, type: string, params?: RequestOptions) =>
          call<T.DnsRecord>("dns.records.get", { path: { zone, name, type }, body: undefined, queryKeys: undefined, params }),
        /**
         * Listar los registros de una zona
         * Agrupados en RRsets: un `A` con dos IPs es **un** registro con dos valores. La respuesta trae un `ETag`; pasalo como `If-Match` al escribir y ningún cambio concurrente se pierde.
         * 
         * Scope: `dns:read`
         */
        list: (zone: string, params?: T.DnsRecordsListQuery & RequestOptions) =>
          call<T.DnsRecordList>("dns.records.list", { path: { zone }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `dns.records.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (zone: string, params?: T.DnsRecordsListQuery & RequestOptions) =>
          paginate<T.DnsRecord>(
            "dns.records.list", { path: { zone }, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Aplicar varios cambios a la vez
         * Cada elemento reemplaza su RRset; `values: []` lo borra. Es la forma de aplicar un cambio coherente —mover un sitio y su correo juntos— sin que quede a medias entre dos llamadas. **No es atómico en el backend**: si un cambio falla, los anteriores ya se aplicaron y la respuesta dice cuál cortó.
         * 
         * Scope: `dns:write`
         * **Destructiva: no tiene vuelta atras.**
         */
        patch: (zone: string, body: T.DnsRecordsPatchBody, params?: RequestOptions) =>
          call<T.DnsRecordList>("dns.records.patch", { path: { zone }, body: body, queryKeys: undefined, params }),
        /**
         * Crear o reemplazar un RRset
         * Reemplaza el RRset **entero**: los valores que no vengan en `values` se borran. Es la semántica del DNS y la del backend — no existe "agregar una IP" sin reescribir el conjunto. Leé el RRset, agregá el valor a la lista y mandá la lista completa con el `ETag` en `If-Match`.
         * 
         * Scope: `dns:write`
         */
        put: (zone: string, name: string, type: string, body: T.DnsRecordsPutBody, params?: RequestOptions) =>
          call<T.DnsRecord>("dns.records.put", { path: { zone, name, type }, body: body, queryKeys: undefined, params }),
      },
      zones: {
        /**
         * Exportar la zona en formato BIND
         * El archivo de zona tal como lo emite el backend. Útil para respaldo o migración.
         * 
         * Scope: `dns:read`
         */
        export: (zone: string, params?: RequestOptions) =>
          call<T.DnsZoneExport>("dns.zones.export", { path: { zone }, body: undefined, queryKeys: undefined, params }),
        /**
         * Obtener una zona
         * 
         * Scope: `dns:read`
         */
        get: (zone: string, params?: RequestOptions) =>
          call<T.DnsZone>("dns.zones.get", { path: { zone }, body: undefined, queryKeys: undefined, params }),
        /**
         * Listar las zonas DNS de la cuenta
         * Sale de la base, sin consultar el backend de DNS: `record_count` y `serial` vienen en `null`. Traerlos costaría una llamada por zona y hay cuentas con decenas.
         * 
         * Scope: `dns:read`
         */
        list: (params?: T.DnsZonesListQuery & RequestOptions) =>
          call<T.DnsZoneList>("dns.zones.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `dns.zones.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (params?: T.DnsZonesListQuery & RequestOptions) =>
          paginate<T.DnsZone>(
            "dns.zones.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
      },
    },
    lb: {
      backends: {
        /**
         * Agregar un destino a un listener
         * Atajo sobre `PUT /listeners` para el caso frecuente de sumar una máquina. Revalida y aplica la configuración completa, así que hereda la misma garantía: o el destino queda recibiendo tráfico, o no cambió nada.
         * 
         * Scope: `lb:write`
         */
        create: (id: string, body: T.LbBackendsCreateBody, params?: RequestOptions) =>
          call<T.LbBackend>("lb.backends.create", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * Quitar un destino de un listener
         * Los tres valores que identifican al destino van en la ruta. El backend los espera en el cuerpo de un `DELETE`, cosa que proxies y CDNs descartan y que varios clientes HTTP no mandan; el cuerpo se arma de este lado.
         * 
         * **Un listener no puede quedarse sin destinos.** Quitar el último devuelve `400 validation_failed`: para eliminar el listener entero usá `PUT /listeners` sin él.
         * 
         * Scope: `lb:write`
         * **Destructiva: no tiene vuelta atras.**
         */
        delete: (id: string, listener: string, ip: string, port: string, params?: RequestOptions) =>
          call<void>("lb.backends.delete", { path: { id, listener, ip, port }, body: undefined, queryKeys: undefined, params }),
        /**
         * Listar los destinos
         * Los destinos de todos los listeners, aplanados, cada uno con el listener al que pertenece. Es una vista sobre la misma configuración que devuelve `GET /listeners`.
         * 
         * Scope: `lb:read`
         */
        list: (id: string, params?: RequestOptions) =>
          call<T.LbBackendList>("lb.backends.list", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Itera **todas** las paginas de `lb.backends.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (id: string, params?: RequestOptions) =>
          paginate<T.LbBackend>(
            "lb.backends.list", { path: { id }, queryKeys: undefined, params },
          ),
      },
      instances: {
        /**
         * Obtener un load balancer con su estado real
         * Consulta el control plane, que a su vez sondea el balanceador. Si no responde, los campos de estado vuelven en `null` en vez de fallar.
         * 
         * Scope: `lb:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.LoadBalancer>("lb.instances.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Listar los load balancers de la cuenta
         * Sale de la base, sin consultar el control plane: `provisioning_state`, `healthy` y `listener_count` vienen en `null`. Traerlos costaría una llamada por elemento de la página.
         * 
         * Una página puede venir con menos elementos que el `limit` aunque haya más: todos los productos del control plane comparten un mismo módulo de aprovisionamiento, así que el filtro por familia solo puede aplicarse después de leer la página. `has_more` sigue siendo la señal correcta de si queda algo por traer.
         * 
         * Scope: `lb:read`
         */
        list: (params?: T.LbInstancesListQuery & RequestOptions) =>
          call<T.LoadBalancerList>("lb.instances.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `lb.instances.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (params?: T.LbInstancesListQuery & RequestOptions) =>
          paginate<T.LoadBalancer>(
            "lb.instances.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
      },
      listeners: {
        /**
         * Listar los listeners
         * La configuración completa del balanceador, incluidos los destinos de cada listener. Es lo que hay que leer, modificar y volver a mandar en `PUT`.
         * 
         * Scope: `lb:read`
         */
        list: (id: string, params?: RequestOptions) =>
          call<T.LbListenerList>("lb.listeners.list", { path: { id }, body: undefined, queryKeys: undefined, params }),
        /**
         * Itera **todas** las paginas de `lb.listeners.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (id: string, params?: RequestOptions) =>
          paginate<T.LbListener>(
            "lb.listeners.list", { path: { id }, queryKeys: undefined, params },
          ),
        /**
         * Reemplazar la configuración de listeners
         * **Reemplaza el conjunto entero**: los listeners que no vengan en `listeners` se borran, con sus destinos. Mandar `[]` deja el balanceador sin nada escuchando y corta el tráfico. Leé `GET /listeners`, modificá y mandá todo de vuelta.
         * 
         * **El cambio se aplica dentro de la llamada**: cuando esto devuelve, la configuración nueva ya está sirviendo tráfico. Si la configuración resultante es inválida no se aplica nada y la respuesta es `400 validation_failed` — el servicio nunca queda a medias.
         * 
         * Scope: `lb:write`
         * **Destructiva: no tiene vuelta atras.**
         */
        replace: (id: string, body: T.LbListenersReplaceBody, params?: RequestOptions) =>
          call<T.LbListenerList>("lb.listeners.replace", { path: { id }, body: body, queryKeys: undefined, params }),
      },
      stats: {
        /**
         * Estado y tráfico por listener
         * Una foto del momento: conexiones en curso y bytes acumulados desde el último arranque del balanceador, más la salud de cada destino según el último sondeo. No hay serie histórica.
         * 
         * Si el balanceador no contesta el sondeo, los listeners igual aparecen —salen de la configuración guardada— con `state: unknown` y los contadores en cero. Un listener que existe y no responde y uno que existe sin tráfico no se distinguen por los contadores: miralos por `state`.
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
         * Agregar un dominio de envío
         * Devuelve **los registros DNS que hay que publicar** en la zona del dominio. Eso es lo importante de esta llamada: hasta que estén publicados y SES los vea, el dominio no verifica y no se puede enviar desde él. Cada registro trae `purpose`, `type`, `host`, `value` y `status`; `purpose` es la clave estable con la que automatizar la publicación.
         * 
         * La verificación es **asíncrona y del lado de SES**: esta llamada no espera. Consultá el estado con `POST /v1/mail-gateway/domains/{domain}/verify`.
         * 
         * Es idempotente: repetirla sobre un dominio ya dado de alta reusa el mismo par de llaves DKIM y devuelve los mismos registros, así que un reintento no invalida lo ya publicado.
         * 
         * Scope: `mailgateway:write`
         */
        create: (body: T.MailgatewayDomainsCreateBody, params?: RequestOptions) =>
          call<T.MailGatewayDomain>("mailgateway.domains.create", { path: undefined, body: body, queryKeys: undefined, params }),
        /**
         * Quitar un dominio de envío
         * Corta el envío desde ese dominio: sale de la política del SMTP y de las keys. Los registros DNS quedan publicados en tu zona; borrarlos es cosa tuya. Volver a agregarlo genera llaves DKIM nuevas, así que el TXT viejo deja de servir.
         * 
         * Scope: `mailgateway:write`
         * **Destructiva: no tiene vuelta atras.**
         */
        delete: (domain: string, params?: RequestOptions) =>
          call<void>("mailgateway.domains.delete", { path: { domain }, body: undefined, queryKeys: undefined, params }),
        /**
         * Listar los dominios de envío
         * Cada dominio viene con los registros DNS que le corresponden y el estado de cada uno. Solo se puede enviar desde un dominio `verified`.
         * 
         * Scope: `mailgateway:read`
         */
        list: (params?: T.MailgatewayDomainsListQuery & RequestOptions) =>
          call<T.MailGatewayDomainList>("mailgateway.domains.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `mailgateway.domains.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (params?: T.MailgatewayDomainsListQuery & RequestOptions) =>
          paginate<T.MailGatewayDomain>(
            "mailgateway.domains.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Consultar la verificación de un dominio
         * **Consulta, no fuerza.** SES revisa el DNS público por su cuenta y a su ritmo; esto lee ese resultado y actualiza el estado del dominio y el de cada registro. Que vuelva `pending` no es un error: significa que SES todavía no vio los registros, sea porque no propagaron o porque falta publicarlos.
         * 
         * Los registros `dkim` y `mail_from_mx` son los que SES verifica. `spf`, `mail_from_spf` y `dmarc` quedan siempre en `info`: mejoran la entrega, pero no hay quien los chequee.
         * 
         * `verified_at` viene en `null` en esta respuesta aunque el estado sea `verified`; el dato está en `GET /v1/mail-gateway/domains`.
         * 
         * Scope: `mailgateway:write`
         */
        verify: (domain: string, params?: RequestOptions) =>
          call<T.MailGatewayDomain>("mailgateway.domains.verify", { path: { domain }, body: undefined, queryKeys: undefined, params }),
      },
      keys: {
        /**
         * Crear una API key de envío
         * Devuelve la key completa en `secret`, **una sola vez**: guardamos su hash, así que no hay forma de volver a mostrarla. Si se pierde, se crea otra y se revoca esta.
         * 
         * Esta key **no sirve contra esta API**: se usa en el plano de envío, `POST {api_endpoint}/emails` (hoy `https://mg.truo.cloud/v1/emails`), con `Authorization: Bearer mg_live_…`. El envío no pasa por `api.truo.cloud` a propósito: un salto de más en el camino del correo es un modo de falla de más.
         * 
         * Pide `mailgateway:send` y no `mailgateway:write` porque emitir esta credencial **es** poder enviar en nombre de la cuenta, y eso sobrevive a que revoquen la key de esta API.
         * 
         * Scope: `mailgateway:send`
         */
        create: (params?: RequestOptions) =>
          call<T.MailGatewayKey>("mailgateway.keys.create", { path: undefined, body: undefined, queryKeys: undefined, params }),
        /**
         * Revocar una API key de envío
         * Efecto casi inmediato: la key sale del índice del gateway. Lo que ya se aceptó, se entrega. Revocar es `write` y no `send` a propósito: quitarle capacidad de envío a la cuenta no debería exigir el scope que **otorga** capacidad de envío.
         * 
         * Scope: `mailgateway:write`
         * **Destructiva: no tiene vuelta atras.**
         */
        delete: (keyId: string, params?: RequestOptions) =>
          call<void>("mailgateway.keys.delete", { path: { key_id: keyId }, body: undefined, queryKeys: undefined, params }),
        /**
         * Listar las API keys de envío
         * Incluye las revocadas, para que se pueda auditar qué hubo. `secret` siempre es `null`: de la key guardamos su hash y no hay forma de recuperarla.
         * 
         * Scope: `mailgateway:read`
         */
        list: (params?: T.MailgatewayKeysListQuery & RequestOptions) =>
          call<T.MailGatewayKeyList>("mailgateway.keys.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `mailgateway.keys.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (params?: T.MailgatewayKeysListQuery & RequestOptions) =>
          paginate<T.MailGatewayKey>(
            "mailgateway.keys.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
      },
      messages: {
        /**
         * Listar los mensajes enviados
         * Un elemento por mensaje, del más reciente al más viejo, con el estado agregado del evento de mayor severidad que se vio (`bounced` gana a `delivered`). Se retienen 90 días.
         * 
         * Sin `total`: el backend no sabe cuántos mensajes matchean sin recorrer la historia entera, y ninguna colección de `/v1` publica totales. Paginá con `next_cursor`.
         * 
         * Scope: `mailgateway:read`
         */
        list: (params?: T.MailgatewayMessagesListQuery & RequestOptions) =>
          call<T.MailGatewayMessageList>("mailgateway.messages.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor", "recipient", "days"], params }),
        /**
         * Itera **todas** las paginas de `mailgateway.messages.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (params?: T.MailgatewayMessagesListQuery & RequestOptions) =>
          paginate<T.MailGatewayMessage>(
            "mailgateway.messages.list", { path: undefined, queryKeys: ["limit", "cursor", "recipient", "days"], params },
          ),
      },
      metrics: {
        /**
         * Métricas de entrega y reputación
         * Tasas de entrega, apertura, rebote y queja del rango, con la serie diaria, la latencia envío→entrega y el desglose por dominio. Las tasas son fracciones (0–1), no porcentajes. `bounce_rate_limit` y `complaint_rate_limit` son los umbrales de SES: cruzarlos suspende el envío para proteger la reputación compartida.
         * 
         * Scope: `mailgateway:read`
         */
        get: (params?: T.MailgatewayMetricsGetQuery & RequestOptions) =>
          call<T.MailGatewayMetrics>("mailgateway.metrics.get", { path: undefined, body: undefined, queryKeys: ["range"], params }),
      },
      smtp: {
        /**
         * Ver la configuración SMTP
         * Host, puerto, usuario y estado, **sin la password**. Es lo que hace falta para configurar o revisar un cliente de correo sin manipular el secreto. Para la password, `POST /v1/mail-gateway/smtp`.
         * 
         * Scope: `mailgateway:read`
         */
        get: (params?: RequestOptions) =>
          call<T.MailGatewaySmtp>("mailgateway.smtp.get", { path: undefined, body: undefined, queryKeys: undefined, params }),
        /**
         * Revelar la password SMTP
         * Devuelve la password SMTP en claro. **Es un POST a propósito, aunque no cambie nada.** El backend la expone en un GET, y un GET que devuelve un secreto queda en el historial del navegador, en la caché de cualquier proxy y en el `curl` de ayer. Un POST obliga a una acción deliberada, no es cacheable, y entra al audit log como mutación — que es exactamente cómo hay que poder auditar "quién sacó la clave de envío y cuándo".
         * 
         * La password es recuperable (se guarda cifrada, no hasheada) porque un servidor de correo la necesita entera en cada conexión. Si la comprometieron, no alcanza con dejar de mirarla: rotala con `POST /v1/mail-gateway/smtp/rotate`.
         * 
         * Scope: `mailgateway:send`
         */
        reveal: (params?: RequestOptions) =>
          call<T.MailGatewaySmtpCredentials>("mailgateway.smtp.reveal", { path: undefined, body: undefined, queryKeys: undefined, params }),
        /**
         * Rotar la credencial SMTP
         * Emite usuario y password nuevos y devuelve los dos. La credencial anterior queda desactivada, no borrada, para que una aplicación que todavía la tenga en memoria no se caiga en el instante de la rotación — pero dejará de funcionar, así que actualizá tus sistemas. No hay vuelta atrás: la vieja no se puede reactivar desde acá.
         * 
         * Scope: `mailgateway:send`
         * **Destructiva: no tiene vuelta atras.**
         */
        rotate: (params?: RequestOptions) =>
          call<T.MailGatewaySmtpCredentials>("mailgateway.smtp.rotate", { path: undefined, body: undefined, queryKeys: undefined, params }),
      },
      tenant: {
        /**
         * Obtener el Mail Gateway de la cuenta
         * No lleva id: hay un solo Mail Gateway por cuenta. Trae el estado, el uso del mes y cuántos dominios y keys hay; el detalle de cada uno tiene su propio endpoint. Si la cuenta no tiene el servicio, devuelve 404.
         * 
         * Scope: `mailgateway:read`
         */
        get: (params?: RequestOptions) =>
          call<T.MailGateway>("mailgateway.tenant.get", { path: undefined, body: undefined, queryKeys: undefined, params }),
      },
      usage: {
        /**
         * Uso del mes en curso
         * Envíos aceptados y rechazados del mes calendario UTC en curso. Es el número que factura. Los rechazados no se cobran: son los que el gateway frenó antes de SES.
         * 
         * Scope: `mailgateway:read`
         */
        get: (params?: RequestOptions) =>
          call<T.MailGatewayUsage>("mailgateway.usage.get", { path: undefined, body: undefined, queryKeys: undefined, params }),
      },
    },
    meta: {
      /**
       * Qué soporta esta instancia de la API
       * No requiere autenticación. Devuelve los recursos disponibles, la taxonomía de scopes y los límites vigentes, para que un cliente no tenga que descubrirlos a los golpes.
       */
      capabilities: (params?: RequestOptions) =>
        call<T.Capabilities>("meta.capabilities", { path: undefined, body: undefined, queryKeys: undefined, params }),
    },
    objectstorage: {
      buckets: {
        /**
         * Crear un bucket
         * Devuelve el mismo recurso que `GET /v1/object-storage/buckets/{bucket}`. El alta del backend responde la fila cruda del registro —otra forma, con otro formato de fecha— así que se relee antes de contestar: cuesta una llamada y compra que el alta y la lectura devuelvan el mismo objeto.
         * 
         * Scope: `objectstorage:write`
         */
        create: (body: T.ObjectstorageBucketsCreateBody, params?: RequestOptions) =>
          call<T.StorageBucket>("objectstorage.buckets.create", { path: undefined, body: body, queryKeys: undefined, params }),
        /**
         * Borrar un bucket
         * Un bucket con objetos no se borra: el request falla y no toca nada. `?purge=true` lo borra con todo el contenido, y eso **no se puede deshacer** — no hay papelera ni versiones. Si querés saber cuántos objetos se van a perder, vaciálo primero con `POST .../empty`, que devuelve la cuenta.
         * 
         * Scope: `objectstorage:write`
         * **Destructiva: no tiene vuelta atras.**
         */
        delete: (bucket: string, params?: T.ObjectstorageBucketsDeleteQuery & RequestOptions) =>
          call<void>("objectstorage.buckets.delete", { path: { bucket }, body: undefined, queryKeys: ["purge"], params }),
        /**
         * Vaciar un bucket
         * Borra todos los objetos y conserva el bucket con su configuración. **No se puede deshacer.** Sobre un bucket grande puede tardar: el borrado va objeto por objeto contra el almacenamiento.
         * 
         * Scope: `objectstorage:write`
         * **Destructiva: no tiene vuelta atras.**
         * Devuelve una operacion asincrona; espera con `operations.wait()`.
         */
        empty: (bucket: string, params?: RequestOptions) =>
          call<T.StorageDeletion>("objectstorage.buckets.empty", { path: { bucket }, body: undefined, queryKeys: undefined, params }),
        /**
         * Obtener un bucket
         * 
         * Scope: `objectstorage:read`
         */
        get: (bucket: string, params?: RequestOptions) =>
          call<T.StorageBucket>("objectstorage.buckets.get", { path: { bucket }, body: undefined, queryKeys: undefined, params }),
        /**
         * Listar los buckets
         * Incluye los buckets creados directamente por el protocolo S3, que no tienen fila de registro: se listan igual —ocultarlos escondería datos que existen— con `created_at` en `null` y acceso privado.
         * 
         * Scope: `objectstorage:read`
         */
        list: (params?: T.ObjectstorageBucketsListQuery & RequestOptions) =>
          call<T.StorageBucketList>("objectstorage.buckets.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `objectstorage.buckets.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (params?: T.ObjectstorageBucketsListQuery & RequestOptions) =>
          paginate<T.StorageBucket>(
            "objectstorage.buckets.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Métricas de un bucket
         * Almacenamiento, egress y requests del rango pedido. Las series traen un punto por día UTC y vienen vacías mientras no haya datos, en vez de rellenarse con ceros que se confundirían con un día sin tráfico.
         * 
         * Scope: `objectstorage:read`
         */
        metrics: (bucket: string, params?: T.ObjectstorageBucketsMetricsQuery & RequestOptions) =>
          call<T.StorageBucketMetrics>("objectstorage.buckets.metrics", { path: { bucket }, body: undefined, queryKeys: ["range"], params }),
        /**
         * Cambiar la visibilidad de un bucket
         * Publicar el bucket le acuña una URL de lectura anónima (`public_url`) y la conserva si después se vuelve privado: republicar devuelve la misma URL, no una nueva.
         * 
         * Scope: `objectstorage:write`
         */
        update: (bucket: string, body: T.ObjectstorageBucketsUpdateBody, params?: RequestOptions) =>
          call<T.StorageBucket>("objectstorage.buckets.update", { path: { bucket }, body: body, queryKeys: undefined, params }),
      },
      keys: {
        /**
         * Emitir una llave de acceso
         * Es el **único** endpoint que devuelve `secret_access_key`, y lo devuelve una sola vez: no se guarda en claro de nuestro lado y no hay forma de recuperarlo después. Si se pierde, la salida es borrar la llave y emitir otra. Las llaves conviven: emitir una no revoca las anteriores. Acotá cada una a un bucket con `scope` para que perder una no comprometa el resto.
         * 
         * Scope: `objectstorage:keys`
         */
        create: (body: T.ObjectstorageKeysCreateBody, params?: RequestOptions) =>
          call<T.StorageAccessKeyWithSecret>("objectstorage.keys.create", { path: undefined, body: body, queryKeys: undefined, params }),
        /**
         * Revocar una llave de acceso
         * La revocación es inmediata. Revocar una llave **invalida también las URLs prefirmadas que se firmaron con ella**, aunque no hayan expirado: la firma se valida contra la llave, y una llave revocada ya no existe. Es la única forma de cortar una URL prefirmada antes de tiempo.
         * 
         * Scope: `objectstorage:keys`
         * **Destructiva: no tiene vuelta atras.**
         */
        delete: (keyId: string, params?: RequestOptions) =>
          call<void>("objectstorage.keys.delete", { path: { key_id: keyId }, body: undefined, queryKeys: undefined, params }),
        /**
         * Listar las llaves de acceso
         * Solo las activas, y nunca el secreto.
         * 
         * Scope: `objectstorage:read`
         */
        list: (params?: T.ObjectstorageKeysListQuery & RequestOptions) =>
          call<T.StorageAccessKeyList>("objectstorage.keys.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `objectstorage.keys.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (params?: T.ObjectstorageKeysListQuery & RequestOptions) =>
          paginate<T.StorageAccessKey>(
            "objectstorage.keys.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
          ),
      },
      objects: {
        /**
         * Borrar objetos
         * Borrado en lote por key. Es un `POST` y no un `DELETE` porque la lista de keys va en el cuerpo: un `DELETE` con body no lo mandan igual todos los clientes HTTP. **No se puede deshacer.** `deleted` puede ser menor que la cantidad de keys pedidas: las que no existían no cuentan.
         * 
         * Scope: `objectstorage:write`
         * **Destructiva: no tiene vuelta atras.**
         */
        delete: (bucket: string, body: T.ObjectstorageObjectsDeleteBody, params?: RequestOptions) =>
          call<T.StorageDeletion>("objectstorage.objects.delete", { path: { bucket }, body: body, queryKeys: undefined, params }),
        /**
         * Listar objetos de un bucket
         * Un nivel a la vez, como un explorador de archivos: las entradas con `is_folder: true` son prefijos, y se navegan pasando su `key` como `prefix`. No acepta `limit`: el backend fija el tamaño de página (hasta 1000 entradas) y recortar acá perdería objetos en silencio al avanzar el cursor.
         * 
         * Scope: `objectstorage:read`
         */
        list: (bucket: string, params?: T.ObjectstorageObjectsListQuery & RequestOptions) =>
          call<T.StorageObjectList>("objectstorage.objects.list", { path: { bucket }, body: undefined, queryKeys: ["prefix", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `objectstorage.objects.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (bucket: string, params?: T.ObjectstorageObjectsListQuery & RequestOptions) =>
          paginate<T.StorageObject>(
            "objectstorage.objects.list", { path: { bucket }, queryKeys: ["prefix", "cursor"], params },
          ),
        /**
         * Firmar una URL temporal
         * Devuelve un link que funciona sin credenciales hasta que expira. `method: "GET"` para descargar (requiere `objectstorage:read`), `method: "PUT"` para subir (requiere `objectstorage:write`). La URL es una credencial de portador: funciona para cualquiera que la tenga y la única forma de cortarla antes de que venza es revocar la llave S3 que la firmó. Pedí el TTL más corto que te sirva. Hereda además el alcance de esa llave: si está acotada a un bucket o es de solo lectura, la URL no puede más que ella.
         * 
         * Scope: `objectstorage:read`
         */
        presign: (bucket: string, body: T.ObjectstorageObjectsPresignBody, params?: RequestOptions) =>
          call<T.StoragePresignedUrl>("objectstorage.objects.presign", { path: { bucket }, body: body, queryKeys: undefined, params }),
      },
      tenant: {
        /**
         * Obtener el Object Storage de la cuenta
         * Uso, endpoint y estado. Es singleton por cuenta: no hay listado ni id que pasar. El almacenamiento y el conteo de objetos salen del último snapshot diario, no de un escaneo en vivo, así que un objeto recién subido puede tardar en reflejarse en los totales.
         * 
         * Scope: `objectstorage:read`
         */
        get: (params?: RequestOptions) =>
          call<T.ObjectStorage>("objectstorage.tenant.get", { path: undefined, body: undefined, queryKeys: undefined, params }),
      },
    },
    operations: {
      /**
       * Estado de una operación
       * Se consulta el backend real al leer, con caché de 2 s. Si el backend no responde se devuelve el último estado conocido con `stale: true` y **nunca un 500**: un cliente haciendo polling no debe perder su operación por un hipo del backend, ni ser empujado a reintentar la mutación.
       * 
       * Scope: `operations:read`
       */
      get: (id: string, params?: RequestOptions) =>
        call<T.Operation>("operations.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      /**
       * Listar operaciones recientes de la cuenta
       * 
       * Scope: `operations:read`
       */
      list: (params?: T.OperationsListQuery & RequestOptions) =>
        call<T.OperationList>("operations.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
      /**
       * Itera **todas** las paginas de `operations.list`, siguiendo el cursor sola.
       * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
       */
      listAll: (params?: T.OperationsListQuery & RequestOptions) =>
        paginate<T.Operation>(
          "operations.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
        ),
    },
    services: {
      /**
       * Obtener un servicio
       * Un 404 acá significa tanto "no existe" como "existe pero esta credencial no puede verlo". Es deliberado: un 403 confirmaría la existencia del servicio y convertiría la API en un oráculo de enumeración.
       * 
       * Scope: `services:read`
       */
      get: (id: string, params?: RequestOptions) =>
        call<T.Service>("services.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      /**
       * Listar los servicios de la cuenta
       * Devuelve solo los servicios que esta credencial puede ver: se aplican la allowlist de la key y los permisos por servicio del usuario dueño. Es el punto de entrada para obtener los `service_id` que usan los demás recursos.
       * 
       * Scope: `services:read`
       */
      list: (params?: T.ServicesListQuery & RequestOptions) =>
        call<T.ServiceList>("services.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor", "family"], params }),
      /**
       * Itera **todas** las paginas de `services.list`, siguiendo el cursor sola.
       * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
       */
      listAll: (params?: T.ServicesListQuery & RequestOptions) =>
        paginate<T.Service>(
          "services.list", { path: undefined, queryKeys: ["limit", "cursor", "family"], params },
        ),
    },
    vps: {
      backups: {
        /**
         * Crear un backup
         * Encola un `vzdump`. Con `mode: snapshot` (default) la máquina sigue andando. La operación refleja que la tarea quedó encolada, no que el archivo esté listo: el tamaño final aparece en `GET /v1/vps/{id}/backups` cuando el hipervisor termina.
         * 
         * Scope: `vps:write`
         * Devuelve una operacion asincrona; espera con `operations.wait()`.
         */
        create: (id: string, body?: T.VpsBackupsCreateBody, params?: RequestOptions) =>
          call<T.Operation>("vps.backups.create", { path: { id }, body: body, queryKeys: undefined, params }),
        /**
         * Borrar un backup
         * 
         * Scope: `vps:write`
         * **Destructiva: no tiene vuelta atras.**
         */
        delete: (id: string, backupId: string, params?: RequestOptions) =>
          call<void>("vps.backups.delete", { path: { id, backup_id: backupId }, body: undefined, queryKeys: undefined, params }),
        /**
         * Backups del VPS
         * 
         * Scope: `vps:read`
         */
        list: (id: string, params?: T.VpsBackupsListQuery & RequestOptions) =>
          call<T.VpsBackupList>("vps.backups.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `vps.backups.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (id: string, params?: T.VpsBackupsListQuery & RequestOptions) =>
          paginate<T.VpsBackup>(
            "vps.backups.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
        /**
         * Restaurar un backup
         * **Destructivo.** Apaga la máquina y sobreescribe el disco entero: todo lo escrito después de ese backup se pierde. El backend verifica que el backup pertenezca a este VPS antes de tocar nada.
         * 
         * Scope: `vps:write`
         * **Destructiva: no tiene vuelta atras.**
         * Devuelve una operacion asincrona; espera con `operations.wait()`.
         */
        restore: (id: string, backupId: string, params?: RequestOptions) =>
          call<T.Operation>("vps.backups.restore", { path: { id, backup_id: backupId }, body: undefined, queryKeys: undefined, params }),
      },
      config: {
        /**
         * Configuración de la máquina
         * 
         * Scope: `vps:read`
         */
        get: (id: string, params?: RequestOptions) =>
          call<T.VpsConfig>("vps.config.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      },
      console: {
        /**
         * Abrir una consola
         * Emite un ticket de un solo uso. **Da acceso total al sistema operativo**, sin pasar por la red ni por SSH, y por eso vive en su propio scope (`vps:console`) en vez de caer bajo `vps:write`. No lo loguees: el `file` de SPICE lleva la contraseña adentro.
         * 
         * Scope: `vps:console`
         */
        create: (id: string, body?: T.VpsConsoleCreateBody, params?: RequestOptions) =>
          call<T.ConsoleTicket>("vps.console.create", { path: { id }, body: body, queryKeys: undefined, params }),
      },
      /**
       * Obtener un VPS con su estado real
       * Consulta el hipervisor. Si no responde, los campos de estado vuelven en `null` en vez de fallar: que el hipervisor tenga un hipo no debería impedirte leer el resto del recurso ni sus `capabilities`.
       * 
       * Scope: `vps:read`
       */
      get: (id: string, params?: RequestOptions) =>
        call<T.Vps>("vps.get", { path: { id }, body: undefined, queryKeys: undefined, params }),
      ips: {
        /**
         * IPs asignadas al VPS
         * 
         * Scope: `vps:read`
         */
        list: (id: string, params?: T.VpsIpsListQuery & RequestOptions) =>
          call<T.VpsIpList>("vps.ips.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `vps.ips.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (id: string, params?: T.VpsIpsListQuery & RequestOptions) =>
          paginate<T.VpsIp>(
            "vps.ips.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
      },
      /**
       * Listar los VPS de la cuenta
       * Sale de la base, sin consultar el hipervisor: `state`, `cpu`, `memory` y `disk` vienen en `null`. Traerlos costaría una llamada al backend por cada elemento de la página. Para el estado vivo de uno, `GET /v1/vps/{id}`.
       * 
       * Scope: `vps:read`
       */
      list: (params?: T.VpsListQuery & RequestOptions) =>
        call<T.VpsList>("vps.list", { path: undefined, body: undefined, queryKeys: ["limit", "cursor"], params }),
      /**
       * Itera **todas** las paginas de `vps.list`, siguiendo el cursor sola.
       * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
       */
      listAll: (params?: T.VpsListQuery & RequestOptions) =>
        paginate<T.Vps>(
          "vps.list", { path: undefined, queryKeys: ["limit", "cursor"], params },
        ),
      metrics: {
        /**
         * Serie de uso de CPU, memoria, disco y red
         * Serie RRD del hipervisor. La resolución la fija el `timeframe` y no es configurable: `hour` da minutos, `year` da semanas. `cpu_percent` es porcentaje del total asignado.
         * 
         * Scope: `vps:read`
         */
        list: (id: string, params?: T.VpsMetricsListQuery & RequestOptions) =>
          call<T.VpsMetrics>("vps.metrics.list", { path: { id }, body: undefined, queryKeys: ["timeframe"], params }),
      },
      /**
       * Encender, apagar o reiniciar
       * Devuelve `202` en cuanto la orden sale, no cuando la máquina llegó al estado pedido. La operación se resuelve contra el **estado real de la VM**, así que sobrevive a que el backend tarde más que el timeout HTTP — un `reboot` es apagar, esperar y encender, y eso no entra en una request. Esperá con `GET /v1/operations/{id}`.
       * 
       * Scope: `vps:power`
       * Devuelve una operacion asincrona; espera con `operations.wait()`.
       */
      power: (id: string, body: T.VpsPowerBody, params?: RequestOptions) =>
        call<T.Operation>("vps.power", { path: { id }, body: body, queryKeys: undefined, params }),
      /**
       * Reinstalar el sistema operativo
       * **Destructivo e irreversible: borra el disco entero.** Encola un job que corre la misma máquina de estados que un alta nueva (aprovisionar → esperar el boot → chequeo de salud), así que la operación reporta progreso real y puede tardar varios minutos. La IP se conserva.
       * 
       * Scope: `vps:write`
       * **Destructiva: no tiene vuelta atras.**
       * Devuelve una operacion asincrona; espera con `operations.wait()`.
       */
      reinstall: (id: string, body: T.VpsReinstallBody, params?: RequestOptions) =>
        call<T.Operation>("vps.reinstall", { path: { id }, body: body, queryKeys: undefined, params }),
      templates: {
        /**
         * Sistemas operativos disponibles para reinstalar
         * Depende del tipo de máquina y del nodo donde vive, así que se pide por VPS y no global.
         * 
         * Scope: `vps:read`
         */
        list: (id: string, params?: T.VpsTemplatesListQuery & RequestOptions) =>
          call<T.VpsTemplateList>("vps.templates.list", { path: { id }, body: undefined, queryKeys: ["limit", "cursor"], params }),
        /**
         * Itera **todas** las paginas de `vps.templates.list`, siguiendo el cursor sola.
         * Un `for await` sobre esto nunca deja resultados afuera por olvidar `next_cursor`.
         */
        listAll: (id: string, params?: T.VpsTemplatesListQuery & RequestOptions) =>
          paginate<T.VpsTemplate>(
            "vps.templates.list", { path: { id }, queryKeys: ["limit", "cursor"], params },
          ),
      },
      /**
       * Renombrar un VPS
       * Cambia el hostname del sistema operativo. En LXC toma efecto al vuelo; en KVM cambia el nombre de la VM y el sistema operativo lo adopta al reiniciar.
       * 
       * Scope: `vps:write`
       */
      update: (id: string, body: T.VpsUpdateBody, params?: RequestOptions) =>
        call<T.Vps>("vps.update", { path: { id }, body: body, queryKeys: undefined, params }),
    },
  };
}

/** El arbol de recursos, inferido. Es lo que expone `TruoClient`. */
export type Resources = ReturnType<typeof createResources>;
