---
title: Política de deprecación
description: Doce meses de aviso, headers Deprecation y Sunset, y qué cambia sin aviso.
---

Esto es un compromiso, no una nota de ingeniería. Es también el criterio por el
que la API puede llamarse **v1** y no beta.

## Qué garantiza `v1`

Mientras `v1` esté vigente, **nada de esto pasa** sin cumplir el aviso de abajo:

- Eliminar un endpoint, un campo de respuesta, un parámetro, un valor de enum o
  un `operationId`.
- Renombrar cualquiera de ellos. Renombrar es eliminar y crear.
- Volver obligatorio un parámetro que era opcional, o restringir el rango de
  valores aceptados.
- Cambiar el tipo de un campo, el código de estado HTTP de un caso ya
  documentado, o el `code` de un error.

Los `operationId` (`vps.power`, `dns.records.patch`) son **estables para
siempre**: son la clave con la que el SDK, el CLI, las herramientas de agente y
esta documentación se referencian entre sí. Un `operationId` no se recicla ni
después de eliminada la operación.

## Qué cambia sin aviso

Estos cambios son **aditivos** y pueden salir cualquier día. Un cliente que se
rompe con ellos tiene un bug propio, y lo decimos de antemano para que no sea una
discusión:

- **Campos nuevos** en cualquier respuesta. Deserializá ignorando lo desconocido;
  no uses parsers estrictos que fallen ante un campo de más.
- **Valores nuevos** en un enum de respuesta — un estado de VPS nuevo, un motor
  de base de datos nuevo. Tené siempre una rama `default`.
- **Endpoints, recursos y parámetros opcionales nuevos.**
- **El contenido del cursor de paginación.** Es una cadena opaca: se pasa tal
  cual y no se almacena entre sesiones.
- **Correcciones de seguridad** que cierren un acceso que nunca debió existir. Si
  un permiso estaba mal aplicado, arreglarlo no espera doce meses.
- **Comportamiento no documentado**: el orden de una lista sin `sort`, el texto
  exacto de un `message` de error (el `code` sí es estable), los tiempos de una
  operación asíncrona.
- **Los límites de uso**, dentro de lo razonable y comunicados en los headers
  `RateLimit-*` de cada respuesta.

## El aviso: doce meses

Todo cambio breaking sobre `v1` lleva **doce meses** entre el anuncio y el corte.
Durante esa ventana:

1. **Se publica en el changelog**, con la fecha de corte y la ruta de migración
   concreta.
2. **Se avisa por correo** al dueño de cada API key que haya llamado la operación
   afectada en los 90 días previos. No es un boletín: si tu key no la usa, no te
   escribimos.
3. **Las respuestas llevan headers** desde el día del anuncio:

   ```http
   Deprecation: Sun, 27 Jul 2026 00:00:00 GMT
   Sunset: Tue, 27 Jul 2027 00:00:00 GMT
   Link: <https://docs.truo.cloud/changelog/…>; rel="deprecation"
   ```

   `Deprecation` es la fecha del anuncio y `Sunset` la del corte
   ([RFC 9745](https://datatracker.ietf.org/doc/html/rfc9745) y
   [RFC 8594](https://datatracker.ietf.org/doc/html/rfc8594)). Podés detectar que
   estás usando algo condenado **sin leer nada**: alcanza con loguear la
   presencia del header. El SDK y el CLI lo emiten como warning por `stderr`.
4. **El OpenAPI marca la operación** `deprecated: true`, así el diff del spec lo
   hace visible en cualquier pipeline.

Una operación deprecada **sigue funcionando igual** hasta la fecha de `Sunset`.
No se degrada, no se le baja el límite, no se le mete latencia.

## Versiones nuevas

Un cambio que no cabe en lo aditivo produce **`/v2`**, no un `v1` roto. `v1` y
`v2` conviven, y los doce meses de `v1` corren desde que `v2` sale de beta.

La versión está en la URL: es visible en cualquier log y no depende de que
configures un header.

## Lo que queda fuera

- **Todo lo marcado `beta`** en el OpenAPI y en esta documentación. La marca es
  explícita, la garantía es ninguna, y nada entra a beta sin decirlo.
- **Cualquier endpoint que no esté en
  [`/v1/openapi.json`](https://api.truo.cloud/v1/openapi.json).** Si no está en
  el spec, no tiene contrato.

## Cómo se hace cumplir

No depende de que alguien se acuerde. El spec se genera del código —los schemas
de validación son a la vez validador de runtime y fuente del documento— y **CI
falla ante cualquier cambio breaking**, salvo que el cambio lleve la etiqueta que
fuerza justamente esta conversación.
