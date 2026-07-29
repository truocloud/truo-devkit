---
title: El contrato
description: Forma de las respuestas, paginación por cursor, idempotencia, operaciones asíncronas y request IDs.
sidebar:
  order: 2
---

## Respuestas

Sin envoltorio. El status HTTP ya dice si salió bien; un `{"success":true,"data":…}`
cuesta un `unwrap` en cada SDK, en cada `jq` y en cada resultado de herramienta, a
cambio de cero información.

```jsonc
// un recurso
{ "object": "vps", "id": "svc_10432", "hostname": "web-01", "status": "running" }

// una colección
{ "object": "list", "data": [ … ], "has_more": true, "next_cursor": "eyJvIjo1MH0" }

// un error — cualquier respuesta >= 400
{ "error": {
    "type": "authorization_error",
    "code": "insufficient_scope",
    "message": "Esta operación requiere el scope 'vps:write'.",
    "param": null,
    "request_id": "req_01JQ8X…"
} }
```

`truo vps get svc_1 | jq .hostname` funciona sin ceremonia, que es la prueba.

Ramificá por **`code`**, nunca por el texto de `message`: el `code` es estable y
el `message` puede mejorarse cualquier día. Ver [errores](/errores/).

## IDs con prefijo

Se acepta `10432` y `svc_10432`; **siempre se devuelve `svc_10432`**. Un entero
pelado es indistinguible de un id de factura en un log, en un `argv` o en el
contexto de un modelo, y el error que se gana con el prefijo —*"esperaba un id de
servicio, llegó `inv_9912`"*— vale el ejercicio entero.

## Paginación

```
GET /v1/vps?limit=25&cursor=eyJvIjo1MCwidiI6MX0
```

`limit` va de 1 a 100. La respuesta trae `has_more` y `next_cursor`. **No hay
total**: contar filas no sale barato y nadie lo usa para otra cosa que pintar un
número.

:::caution[El cursor es opaco]
No lo construyas, no lo parsees y no lo guardes entre sesiones. Su codificación
cambia sin aviso — es justamente lo que nos permite pasar de `offset` a `keyset`
sin romperle nada a nadie.
:::

El SDK y el CLI lo siguen solos:

```ts
for await (const vps of truo.vps.listAll()) console.log(vps.hostname);
```

## Idempotencia

Todo `POST`, `PATCH`, `PUT` y `DELETE` acepta `Idempotency-Key`.

```bash
curl https://api.truo.cloud/v1/vps/svc_10432/backups \
  -X POST \
  -H "Authorization: Bearer $TRUO_TOKEN" \
  -H "Idempotency-Key: backup-nocturno-2026-07-29"
```

- Misma key + mismo body → se replica la respuesta original, con
  `Idempotent-Replay: true`. **No se ejecuta dos veces.**
- Misma key + body distinto → `409 idempotency_conflict`.
- Solo se guardan las respuestas `2xx`: un `5xx` deja reintentar con la misma key.
- Las claves viven 24 horas.

El SDK genera una automáticamente en las operaciones que la aceptan, así que un
reintento por timeout de red no crea dos backups.

## Operaciones asíncronas

Lo que tarda devuelve **`202`** con un `Location` y un objeto `operation`:

```jsonc
{
  "object": "operation",
  "id": "op_01JQ8XKM4N7P2R9T",
  "type": "vps.reinstall",
  "status": "running",       // queued | running | succeeded | failed
  "progress": 40,
  "resource": { "object": "vps", "id": "svc_10432" },
  "result": null,
  "error": null
}
```

Se consulta `GET /v1/operations/{id}` hasta `succeeded` o `failed`. El SDK trae
`truo.operations.wait(id)` y el CLI espera por defecto (`--no-wait` para no
esperar).

Si el sistema de fondo tiene un hipo, la operación se devuelve igual con
`"stale": true` en vez de un `500`. Un cliente que hace polling no debe perder su
operación por un problema que no es suyo — **seguí esperando**, no abortes.

## `X-Request-Id`

Toda respuesta lo trae, y toda respuesta de error lo repite adentro del body.

```
X-Request-Id: req_01JQ8XKM4N7P2R9TVWXYZ
```

Es lo único que hace falta para que soporte encuentre exactamente tu llamada.
**Logueálo.** El CLI lo imprime en cada error y `truo api` lo muestra siempre.

## Control de concurrencia

En DNS, `GET` de un conjunto de registros devuelve un `ETag` y `PATCH` acepta
`If-Match`. Sin eso, dos aplicaciones concurrentes se pisan en silencio; con eso,
la segunda recibe `412`.

En el resto de los recursos todavía no hay `ETag`. Agregarlo después no rompe
nada, así que no asumas su ausencia.

## De dónde sale todo esto

El documento OpenAPI **se genera de los schemas de validación de los propios
handlers**. Un endpoint no puede aceptar un body que el spec no describa, porque
es literalmente el mismo objeto el que valida y el que documenta.

De ahí salen, sin ningún eslabón escrito a mano, los tipos del SDK, los métodos
del cliente, el árbol de comandos del CLI y estas páginas de referencia.

El spec vive en [`/v1/openapi.json`](https://api.truo.cloud/v1/openapi.json) y
también como paquete: `npm i @truocloud/openapi`.
