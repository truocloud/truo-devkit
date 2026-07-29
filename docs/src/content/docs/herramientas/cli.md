---
title: CLI `truo`
description: Instalación, salida, códigos de salida, perfiles y el escape hatch para lo que el CLI todavía no cubre.
sidebar:
  order: 1
---

```bash
npm install -g @truocloud/cli
brew install truocloud/tap/truo
scoop bucket add truocloud https://github.com/truocloud/scoop-bucket && scoop install truo
curl -fsSL https://raw.githubusercontent.com/truocloud/truo-devkit/main/install.sh | sh
```

Los binarios se publican con su `SHA256SUMS`, y brew, scoop y `install.sh` lo
verifican. Los paquetes de npm salen con
[provenance](https://docs.npmjs.com/generating-provenance-statements).

```bash
truo auth login
truo services list
truo vps power svc_10432 stop
```

El árbol de comandos **se genera del OpenAPI**. Un endpoint nuevo aparece en el
CLI —con su ayuda, sus argumentos y sus valores válidos— sin que nadie escriba
código de CLI.

## Salida

Tabla por defecto. Todo lo que no son datos —progreso, avisos, confirmaciones—
va a **`stderr`**, así `truo vps list -o json > f.json` siempre sale limpio.

```bash
truo vps list -o json | jq '.[].hostname'
truo vps list -o jsonl                  # una línea por elemento, para streamear
truo vps list -o id | xargs -n1 truo vps get
truo vps get svc_1 --field hostname     # recorta la salida
```

## Operaciones que tardan

Se **esperan por defecto**. Un CLI que devuelve antes de que la cosa pase obliga
a cada script a escribir su propio bucle de polling, y la mitad no lo escribe.

```bash
truo vps power svc_10432 stop              # espera
truo vps power svc_10432 stop --no-wait    # imprime el id y sale 0
truo operation wait op_01JQ8X…             # retomar después
```

Si vence el tiempo de espera, el CLI sale con **9** e imprime el id: la operación
**sigue corriendo**, solo dejamos de mirarla.

## Confirmaciones

Todo lo marcado `destructive` en el contrato pregunta antes. `--yes` lo saltea, y
sin terminal interactiva el CLI **falla** en vez de asumir que sí.

## Códigos de salida

Contrato público, para que un script no parsee el texto del error.

| | | |
|---|---|---|
| `0` ok | `1` bug del CLI | `2` uso incorrecto |
| `3` sin credencial | `4` sin scope o permiso | `5` no existe |
| `6` conflicto | `7` rate limit | `8` la API falló |
| `9` venció la espera | `10` cancelaste | `130` Ctrl-C |

## Perfiles

```bash
truo config use produccion
truo config set base_url https://api.truo.cloud
truo config list
```

La configuración vive en `~/.truo/config.json` y **las credenciales en un archivo
aparte** (`credentials.json`, modo `0600`). Están separadas a propósito:
mezcladas, es cuestión de tiempo que alguien pegue un token en un ticket.

Precedencia: `--token` → `TRUO_TOKEN` → perfil.

## El escape hatch

Para lo que la API ya expone y el CLI todavía no envuelve. No valida argumentos
ni pide confirmación: es crudo a propósito.

```bash
truo api GET /v1/vps
truo api POST /v1/vps/svc_1/power --body-json '{"action":"stop"}'
```

Existe para que **nunca haya que esperar una versión del CLI** para usar algo que
la API ya tiene.

## Autocompletado

```bash
eval "$(truo completion bash)"     # bash · zsh · fish
```

También se genera del árbol de comandos, así que tampoco puede quedar viejo.
