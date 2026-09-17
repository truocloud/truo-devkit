---
title: Orders
description: Buy a product from a script, follow the provisioning as an operation, and cancel it later — the whole lifecycle without the panel.
---

Until v1.2 the API managed what you already had. `/v1/orders` closes the loop:
list what your account can buy, buy it, wait for it to be live, operate it
through its family (`/v1/wordpress`, `/v1/vps`, …), and cancel it when you
are done.

:::caution[A key with `orders:write` can spend money]
It is the only scope that can. Give it to the key that runs your provisioning
pipeline and to nothing else; a key with `wordpress:*` and no `orders:*` can
manage every site and cannot buy one.
:::

## 1. What can I buy?

```bash
truo orders products                    # the whole catalog, one page
truo orders products --family wordpress  # only the WordPress ladder
```

```jsonc
{ "object": "product",
  "product": "wp-25k",                  // ← the slug you order with
  "name": "WP 25k",
  "group": "WordPress Hosting",
  "family": "wordpress",                // which /v1 resource manages it once active
  "currency": "USD",
  "prices": [
    { "cycle": "monthly",  "price": 12.59, "setup_fee": 0 },
    { "cycle": "annually", "price": 125.88, "setup_fee": 0 }
  ],
  "options": [],
  "hostname": { "accepted": true, "description": "The site name …" } }
```

- **`product` is a slug, never an internal id.** It is derived from the
  product name and pinned for the WordPress ladder (`wp-10k` … `wp-1m`), so
  a rename in the catalog does not break your script.
- **Prices are in your account's currency.** No conversion happens at order
  time.
- Products that are hidden or retired are not listed and cannot be ordered
  (`product_not_orderable`).

## 2. Order

```bash
truo orders create --product wp-25k --cycle annually \
  --hostname mystore --promocode LAUNCH2026 --wait
```

```ts
const op = await truo.orders.create(
  { product: "wp-25k", cycle: "annually", hostname: "mystore", promocode: "LAUNCH2026" },
  { idempotencyKey: "order-mystore-2026-09" },
);
const done = await truo.operations.wait(op.id, { timeoutMs: 15 * 60_000 });
console.log(done.result.service.id); // svc_1241 → truo.wordpress.get(...)
```

The response is an **operation** (`202` + `Location`), like every long
action in the API, so `--wait` and `operations.wait()` work unchanged. Reading
it needs no extra scope: any scope that mutates (`orders:write` included) implies
`operations:read` — if a key could start something, it can follow it. Seeing the
resulting service (`truo.wordpress.get`) does need `services:read` or `wordpress:read`.

| The operation is | Because | What to do |
|---|---|---|
| `pending` | the invoice needs a payment your account credit did not cover | pay `result.invoice.payment_url`; the operation moves on by itself. No timeout |
| `running` | the order was accepted and the service is provisioning | wait. `progress` 50 → 75 as it advances |
| `succeeded` | the service is active (for WordPress: the site answers) | `result.service.id` is yours to operate |
| `failed` | `order_cancelled`, `order_rejected`, or `provisioning_timeout` (accepted but not active after 30 min) | the message says; support is already on a timeout |

Everything that can be rejected **before** anything is created, is:

| `code` | Meaning |
|---|---|
| `product_not_orderable` | unknown slug, or not for sale |
| `validation_failed` with `param: "cycle"` | that cycle is not sold; the message lists the ones that are |
| `invalid_promocode` | the code doesn't exist, expired, is used up, doesn't apply to the product/cycle, or was already used on this account |
| `hostname_taken` | the WordPress site name is in use. Pick another — the API never appends `-2` for you |

:::note[`Idempotency-Key` is required]
A retry without it would be a second purchase. The CLI and the SDK send one
automatically; over raw HTTP, send your own. Same key + same body returns
the original operation (`Idempotent-Replay: true`); same key + different
body is a 409.
:::

### Payment

An order is accepted at once when its invoice ends at zero: a free product,
a 100 % promo code, or enough **account credit** (applied automatically).
Otherwise the operation waits in `pending` with the invoice's `payment_url`
until a human pays it in the panel. The API never activates a service that
still owes money; that decision belongs to the panel's postpaid flow.

`GET /v1/orders/payment-methods` lists what `payment_method` accepts; the
one flagged `default` is used when you omit it.

## 3. Cancel

```bash
truo orders cancel ord_245 --when end_of_cycle
```

- A `pending` (unpaid) order is voided at once: `mode: "order_cancelled"`.
- An `active` order gets a cancellation request per service:
  `mode: "cancellation_requested"`. Billing executes it `immediate`ly or at
  the `end_of_cycle` (default).

**This call destroys nothing by itself.** The termination runs on billing's
schedule, and backups are kept according to the product's policy.

## Ids

| Prefix | Resource |
|---|---|
| `ord_` | order |
| `inv_` | invoice |
| `svc_` | the service the order created |
| `op_` | the operation that follows the order |
