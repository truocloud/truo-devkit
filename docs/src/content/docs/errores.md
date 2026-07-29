---
title: Errores
description: Los códigos de error de la API, qué significa cada uno y qué hacer.
---

Cualquier respuesta `>= 400` trae la misma forma:

```jsonc
{ "error": {
    "type": "authorization_error",
    "code": "insufficient_scope",
    "message": "Esta operación requiere el scope 'vps:write'.",
    "param": null,
    "request_id": "req_01JQ8X…"
} }
```

- **`type`** es la clase gruesa. Sirve para jerarquías de excepción en un cliente.
- **`code`** es la identidad específica. **Es estable y nunca se renombra**:
  ramificá por acá.
- **`message`** es para humanos y puede mejorarse cualquier día. No lo parsees.
- **`request_id`** es lo único que soporte necesita para encontrar tu llamada.

## `authentication_error` — 401

| `code` | Qué pasó | Qué hacer |
|---|---|---|
| `missing_credentials` | No mandaste `Authorization` | Agregá `Authorization: Bearer …` |
| `invalid_credentials` | El token no vale, fue revocado o venció | `truo auth login`. Los tres casos colapsan a propósito: distinguirlos le diría a quien prueba tokens cuáles existen |
| `credential_revoked` | La key fue revocada | Creá otra |
| `credential_expired` | La key tenía vencimiento y pasó | Creá otra |

## `authorization_error` — 403

| `code` | Qué pasó | Qué hacer |
|---|---|---|
| `insufficient_scope` | La key no tiene el scope | Creá una key con ese scope; no se puede ampliar una existente |
| `insufficient_permission` | El **usuario dueño** de la key no tiene el permiso en la cuenta | Pediselo al dueño de la cuenta. Revocar un permiso también se lo quita a las keys de esa persona |
| `insufficient_service_access` | El usuario no tiene grant sobre ese servicio | Ídem |
| `scope_not_grantable` | Pediste `apikeys:*` o `users:*` para una key | No es posible, por diseño. Ver [autenticación](/empezar/autenticacion/) |

:::note
Un servicio que no existe y uno que tu credencial no puede ver devuelven **404**,
no 403. Ver abajo.
:::

## `invalid_request_error` — 400 / 404 / 409

| `code` | Status | Qué pasó |
|---|---|---|
| `validation_failed` | 400 | El body o un parámetro no pasa el schema. `param` dice cuál |
| `not_found` | 404 | No existe, **o no existe para esta credencial**. La API no distingue los dos casos a propósito |
| `already_exists` | 409 | Ya hay un recurso con ese identificador |
| `idempotency_conflict` | 409 | Reusaste una `Idempotency-Key` con un body distinto |
| `invalid_cursor` | 400 | El cursor no es uno nuestro, o es de una versión anterior. **Volvé a empezar la lista**: los cursores no son durables |
| `unsupported_for_product` | 400 | La operación no aplica a ese producto (por ejemplo, consola SPICE en un VPS legacy). Mirá `capabilities` en el `GET` del recurso |

## `rate_limit_error` — 429

| `code` | Qué hacer |
|---|---|
| `rate_limited` | Esperá lo que diga `Retry-After`. Ver [límites](/limites/) |
| `quota_exceeded` | Es un límite del plan, no del minuto: reintentar no ayuda |

## `api_error` — 5xx

| `code` | Qué pasó | Qué hacer |
|---|---|---|
| `internal_error` | Es nuestro | Reintentá con backoff. Si persiste, mandanos el `request_id` |
| `upstream_unavailable` | Un sistema de fondo no responde | Reintentá con backoff |
| `upstream_error` | Un sistema de fondo devolvió un error | Reintentá; si persiste, `request_id` |
| `operation_failed` | Una operación asíncrona terminó en `failed` | `error` dentro de la operación dice por qué. Reintentar sin cambiar nada suele repetir el resultado |

## Reintentar

Reintentá con backoff exponencial y jitter en **429, 500, 502, 503 y 504**,
respetando `Retry-After` cuando venga.

**Nunca reintentes un `POST` sin `Idempotency-Key`.** El SDK no lo hace, y por eso
manda una automáticamente en las operaciones que la aceptan.

## Códigos de salida del CLI

Para que un script no tenga que leer el texto del error.

| | | |
|---|---|---|
| `0` todo bien | `1` bug del CLI | `2` uso incorrecto |
| `3` sin credencial o inválida | `4` sin scope o sin permiso | `5` no existe |
| `6` conflicto | `7` rate limit | `8` la API falló |
| `9` venció la espera de una operación (**sigue corriendo**) | `10` cancelaste una confirmación | `130` Ctrl-C |
