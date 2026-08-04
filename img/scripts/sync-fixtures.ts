/**
 * Pulls `fixtures/urls.json` from img.truo.cloud.
 *
 * The vectors are GENERATED from the parser and the signer, and those live in the
 * service — not here. Three implementations build the same URL string (this core,
 * every framework loader, and the WordPress plugin's PHP builder) and a fourth
 * interprets it (the service). A vendored copy of the contract is a copy that rots:
 * the day the service changes a rule, this repo keeps testing yesterday's contract
 * and passes.
 *
 * Same shape and same reason as `bun run sync:spec` for the OpenAPI document.
 *
 *   bun run sync:fixtures          # update the local copy
 *   bun run sync:fixtures --check  # fail if it is stale (this is what CI runs)
 */
const SOURCE = process.env.TRUO_IMG_FIXTURES_URL ?? "https://img.truo.cloud/fixtures/urls.json";
const TARGET = new URL("../fixtures/urls.json", import.meta.url);
const check = process.argv.includes("--check");

const res = await fetch(SOURCE);
if (!res.ok) {
  console.error(`[fixtures] ${SOURCE} answered ${res.status}`);
  process.exit(1);
}

// Re-serialised the same way the generator writes it, so a difference is a
// difference in the contract and never in the whitespace.
const remote = `${JSON.stringify(await res.json(), null, 2)}\n`;
const local = await Bun.file(TARGET).text().catch(() => "");

if (remote === local) {
  console.log("[fixtures] up to date");
  process.exit(0);
}

if (check) {
  console.error(
    "[fixtures] the local copy does not match img.truo.cloud.\n" +
      "Run `bun run sync:fixtures` and look at what changed: these vectors are the URL\n" +
      "contract, and they are also consumed by published packages.",
  );
  process.exit(1);
}

await Bun.write(TARGET, remote);
console.log(`[fixtures] updated from ${SOURCE}`);
