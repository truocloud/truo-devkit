---
title: Autenticación
description: API keys, scopes, allowlist por servicio y cómo el CLI crea su propia credencial sin que copies y pegues nada.
sidebar:
  order: 1
---

Un solo esquema: `Authorization: Bearer <token>`.

```bash
curl https://api.truo.cloud/v1/account \
  -H "Authorization: Bearer tc_live_..."
```

Las API keys se crean desde el panel (**Configuración → API keys**) o con el CLI.
El token **se muestra una sola vez**: guardamos su hash, no el valor. Si se
pierde, se crea otra.

## Desde el CLI, sin copiar y pegar

```bash
truo auth login
```

Muestra un código, lo aprobás en cualquier navegador —puede ser el del teléfono—
y el CLI **crea su propia API key** con los scopes que le corresponden. Esa key
queda guardada en `~/.truo/credentials.json` con permisos `0600`.

Copiar y pegar una key funciona, pero es exactamente el paso donde termina en el
historial de la terminal, en un chat o en un ticket de soporte. El device flow
([RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628)) evita ese paso, y
funciona por SSH dentro de un bastión, que es donde pasa la mitad de los logins.

```bash
truo auth login --scopes vps:read,vps:power   # acotada
truo auth login --token tc_live_...           # para CI, sin navegador
truo auth status                              # quién soy y con qué credencial
```

En CI, exportá `TRUO_TOKEN`. Precedencia: `--token` → `TRUO_TOKEN` → perfil
guardado.

## Scopes

Gramática plana `<recurso>:<acción>`, con comodines `<recurso>:*` y `*`. Sin
anidamiento: en cuanto se permite `vps:backups:read` uno está construyendo un
lenguaje de políticas, y lo que sigue es querer IAM.

| Recurso | Acciones |
|---|---|
| `account` | `read`, `write` |
| `services` | `read`, `write` |
| `vps` | `read`, `power`, `write`, `console` |
| `dbaas` | `read`, `write`, `credentials` |
| `caas` | `read`, `write`, `deploy` |
| `lb` | `read`, `write` |
| `dns` | `read`, `write` |
| `mailgateway` | `read`, `write`, `send` |
| `objectstorage` | `read`, `write`, `keys` |
| `operations`, `audit` | `read` |

Una acción se separa del `write` genérico solo cuando otorgarla es
**materialmente más peligrosa**, no por prolijidad:

- `vps:console` no es "otro write": es acceso total al sistema operativo.
- `dbaas:credentials` revela la contraseña de administración del motor —
  acceso total a los datos, y **sobrevive a que revoques la key**.
- `objectstorage:keys` mintea credenciales S3 de larga vida.

### Lo que una key nunca puede hacer

`apikeys:*` y `users:*` **no son otorgables a una API key**, ni siquiera bajo
`*`. Una key que puede crear keys derrota la revocación; una que puede crear
sub-usuarios es persistencia, porque sobrevive a que revoques la key. Esos
scopes existen solo para sesiones.

*No existe forma de configurar una API key que pueda crear API keys.* Es una
propiedad del sistema, no una recomendación.

## Cuatro límites a la vez

Una llamada se autoriza solo si se cumplen **los cuatro**:

1. Los **scopes de la key** incluyen el que la operación pide.
2. El **usuario dueño de la key** tiene el permiso correspondiente en la cuenta.
3. Los **grants por servicio** de ese usuario alcanzan el nivel requerido.
4. La **allowlist de servicios** de la key incluye ese servicio (o está vacía,
   que significa "todos").

El punto 2 tiene una consecuencia que conviene saber de antemano: si un
sub-usuario crea una key y después le revocás un permiso, **la key también lo
pierde**. Dar de baja a alguien que se va neutraliza sus keys sin tener que
acordarse de ir a revocarlas una por una.

## 404, nunca 403

Un servicio que no existe y uno que existe pero tu credencial no puede ver
devuelven **lo mismo: 404**. Un 403 confirmaría que el servicio existe, y eso
convierte la API en un oráculo de enumeración para cualquiera con una key válida
de otra cuenta.

Si esperabas ver algo y recibís 404, revisá la allowlist de la key y los grants
del usuario antes de buscar el bug en otro lado.

## Revocar

```bash
truo auth token list
truo auth token revoke key_42
```

La revocación se propaga en **menos de un segundo** en el caso normal, y en el
peor caso —si el canal de invalidación está caído— hasta **60 segundos**. Ese es
el número, no "inmediato".

`truo auth logout` borra la credencial **de este equipo** y no revoca nada: si la
copiaste a otro lado, sigue funcionando.
