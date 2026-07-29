# `truo` — CLI de TruoCloud

Opera VPS, DNS, bases de datos administradas, contenedores, balanceadores, Object
Storage y Mail Gateway desde la terminal.

El árbol de comandos **se genera del OpenAPI** de `api.truo.cloud`: cada endpoint
declara su comando, sus argumentos y si es peligroso. Un endpoint nuevo aparece en
el CLI sin que nadie escriba código de CLI.

```
npm i -g @truocloud/cli        # o: npx @truocloud/cli
brew install truocloud/tap/truo
scoop bucket add truocloud https://github.com/truocloud/scoop-bucket && scoop install truo
curl -fsSL https://raw.githubusercontent.com/truocloud/truo-devkit/main/install.sh | sh
```

## Empezar

```bash
truo auth login                 # abre el navegador y crea la API key de este equipo
truo services list
truo vps power svc_10432 stop   # espera a que termine; --no-wait para no esperar
truo dns record list ejemplo.com
```

`truo auth login` usa el device flow (RFC 8628): muestra un código, lo aprobás en
cualquier navegador —puede ser el del teléfono— y el CLI crea **su propia API
key**, que queda guardada. Esa key se revoca sola desde el panel sin tocar el
resto de tus credenciales. En CI, `--token` o la variable `TRUO_TOKEN`.

## Salida

`table` por defecto, y todo lo que no sean datos va a **stderr** — así
`truo vps list -o json > f.json` siempre sale limpio.

```bash
truo vps list -o json | jq '.[].hostname'
truo vps list -o id | xargs -n1 truo vps get
truo vps get svc_1 --field hostname
```

## Códigos de salida

Son contrato público, para que un script no tenga que parsear el texto del error.

| | | | |
|---|---|---|---|
| `0` ok | `1` interno | `2` uso | `3` sin credencial |
| `4` sin permiso | `5` no existe | `6` conflicto | `7` rate limit |
| `8` error de la API | `9` timeout de operación | `10` cancelado | `130` Ctrl-C |

## Sin dependencias

Se publica bundleado: `npm i -g` baja un archivo, no un árbol de `node_modules`.
Los binarios de brew, scoop y `install.sh` son single-file y no necesitan Node.

---

Documentación: **[docs.truo.cloud](https://docs.truo.cloud)** ·
Código: [truocloud/truo-devkit](https://github.com/truocloud/truo-devkit) · MIT
