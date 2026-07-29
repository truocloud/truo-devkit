---
title: Darle acceso a un agente
description: Cómo scopear una credencial para un agente de IA, qué significa x-truo-danger y qué trae el contrato para que un modelo no invente parámetros.
---

La API está construida para que un agente pueda operarla **sin que eso implique
darle la cuenta entera**. Esta página es lo que hay que saber antes de conectar
uno.

:::caution[El servidor MCP todavía no existe]
`truo mcp serve` está en construcción. El comando existe y te lo dice; el
catálogo (`x-truo-mcp`) ya viaja en el spec. Mientras tanto, un agente puede usar
la API directamente con lo de abajo, que es lo que hace falta igual.
:::

## Una credencial por agente, acotada

Nunca reuses la key de tu CI ni la de tu Terraform.

```bash
truo auth token create \
  --name "agente-soporte" \
  --scopes services:read,vps:read,vps:power,operations:read \
  --service-allowlist svc_10432,svc_10433
```

Dos límites independientes:

- **Scopes** — qué puede hacer. Empezá solo con `:read` y agregá lo demás cuando
  haga falta de verdad.
- **Allowlist de servicios** — sobre qué. Una key restringida a tres servicios
  **no enumera** el resto de la cuenta: los endpoints de colección filtran, no
  solo bloquean.

Y hay un límite que no se puede desactivar: `apikeys:*` y `users:*` **no son
otorgables a una key**. Un agente con una API key no puede mintear otra
credencial ni crear un usuario, por más que se lo pidan. Ver
[autenticación](/empezar/autenticacion/).

## Lo que el contrato le dice al agente

Cada operación del spec declara cuánto duele equivocarse:

```yaml
x-truo-scope: vps:write
x-truo-danger: destructive      # none | reversible | destructive
x-truo-long-running: true
x-truo-idempotent: true
x-truo-mcp: { toolset: vps, action: reinstall, readonly: false }
```

`x-truo-danger` es lo que hay que usar para decidir **dónde pedir confirmación
humana**. El CLI ya lo hace: todo lo marcado `destructive` pregunta antes, y la
misma clasificación va a gobernar el servidor MCP. Una sola taxonomía para las
dos superficies.

**Aplicá el gate en tu código, no en el prompt.** Un prompt que dice "pedí
confirmación antes de borrar" es una sugerencia; un `if (danger === "destructive")`
es un control.

## Para que no invente parámetros

- **[`llms.txt`](https://docs.truo.cloud/llms.txt)** — el catálogo completo:
  cada `operationId` con su método, su ruta, su scope y si es destructiva.
- **[`llms-full.txt`](https://docs.truo.cloud/llms-full.txt)** — lo mismo más los
  parámetros y el body de cada operación. Es lo que evita que un modelo se
  invente nombres de campo.
- **[`openapi.json`](https://api.truo.cloud/v1/openapi.json)** — el contrato
  entero, si tu agente sabe leerlo.

Dárselos al agente recorta las alucinaciones de parámetros más que cualquier
instrucción en el prompt.

## Cinco cosas que hay que manejar en el código

1. **Todo lo que tarda devuelve `202` + una operación.** El agente tiene que
   consultar `/v1/operations/{id}` hasta `succeeded` o `failed`, no asumir que la
   llamada terminó el trabajo.
2. **Mandá `Idempotency-Key` en toda mutación.** Un agente reintenta más que una
   persona, y sin la key un reintento crea dos backups.
3. **404 no significa "no existe"** — significa "no existe *para esta
   credencial*". Si el agente esperaba ver algo, el problema puede estar en la
   allowlist, no en la infraestructura.
4. **Los datos que devuelve la API pueden venir de un atacante.** Logs de
   contenedor, listados de objetos y registros WHOIS son escribibles por
   terceros. Envolvelos como datos, no como instrucciones, antes de dárselos al
   modelo.
5. **Ninguna respuesta debería llevarle credenciales al modelo.** Los endpoints
   que revelan secretos están detrás de scopes propios (`dbaas:credentials`,
   `objectstorage:keys`) justamente para que puedas no otorgarlos.

## Un ejemplo mínimo

```ts
import { TruoClient, OPERATIONS } from "@truocloud/sdk";

const truo = new TruoClient({ token: process.env.AGENT_TOKEN });

async function ejecutar(operationId: string, args: Record<string, unknown>) {
  const meta = OPERATIONS[operationId as keyof typeof OPERATIONS];
  if (!meta) throw new Error(`operación desconocida: ${operationId}`);

  // El gate vive acá, no en el prompt.
  if (meta.danger === "destructive" && !(await pedirConfirmacionHumana(meta, args))) {
    return { status: "cancelado" };
  }

  const res = await truo.request(operationId, { params: args });
  // Si es asíncrona, esperarla es parte de "ejecutar", no del prompt.
  return meta.longRunning
    ? await truo.operations.wait((res.data as { id: string }).id)
    : res.data;
}
```
