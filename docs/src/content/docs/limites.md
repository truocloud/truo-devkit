---
title: Límites de uso
description: Cuántas llamadas por minuto, cómo leer los headers RateLimit y qué hacer con un 429.
---

Hay tres buckets, y cada operación declara a cuál pertenece
(`x-truo-rate-bucket` en el spec).

| Bucket | Por key | Por cuenta | Qué cae acá |
|---|---|---|---|
| `read` | 600 / min | 2 000 / min | los `GET` |
| `write` | 120 / min | 400 / min | las mutaciones normales |
| `expensive` | 20 / min | 60 / min | consola, presign, restore, reinstall, logs |

El límite **por cuenta** existe para que nadie esquive el de por key creando
veinte keys. Gana el más restrictivo de los dos.

## Los headers

Vienen en **toda** respuesta, no solo en los 429. Así se puede desacelerar antes
de chocar en vez de después.

```http
RateLimit-Limit: 600
RateLimit-Remaining: 583
RateLimit-Reset: 41
RateLimit-Policy: 600;w=60
```

`RateLimit-Reset` son segundos hasta que la ventana se renueva. Los mismos
valores se repiten como `X-RateLimit-*` para clientes que ya los esperan con ese
nombre.

## Cuando llega el 429

```jsonc
{ "error": { "type": "rate_limit_error", "code": "rate_limited", … } }
```

Con `Retry-After` en segundos. **Respetalo**: reintentar antes solo consume el
presupuesto de la ventana siguiente.

El SDK ya lo hace —backoff exponencial con jitter, honrando `Retry-After`— y
nunca reintenta un `POST` que no lleve `Idempotency-Key`.

Distinto es `quota_exceeded`: ese es un límite del plan, no del minuto.
Reintentar no ayuda.

## Si te queda chico

Los límites se pueden subir por key. Escribinos con el `id` de la key y qué
estás construyendo.

## Si el sistema de límites se cae

**Se deja pasar.** Convertir una caída de la caché en una caída total de la API
sería peor que el problema que evita. Puede pasar entonces que un pico atraviese
sin ser contado; no es una invitación a apoyarse en eso.
