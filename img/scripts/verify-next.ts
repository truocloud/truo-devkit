/**
 * Builds a real Next app against the built loader and asserts the emitted markup.
 *
 * This is the only check that covers the `loaderFile` contract. Next requires the
 * module to have a **default export** that is a **synchronous** function, and it
 * only says so at build time — with an error that names neither rule. A unit test
 * can assert the shape of the export; it cannot assert that Next accepts it.
 *
 * It is a separate CI job because it installs Next, which is two orders of
 * magnitude more than everything else in this workspace put together.
 */
import { mkdtemp, mkdir, rm, writeFile, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PID = "acme";
const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const dir = await mkdtemp(join(tmpdir(), "truo-next-"));

async function run(cmd: string[], cwd: string): Promise<void> {
  const p = Bun.spawnSync(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  if (p.exitCode !== 0) throw new Error(`${cmd.join(" ")} failed with ${p.exitCode}`);
}

try {
  await mkdir(join(dir, "app"), { recursive: true });

  await writeFile(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "truo-next-fixture",
        private: true,
        dependencies: {
          next: "^15",
          react: "^19",
          "react-dom": "^19",
          // The built packages, straight from disk. Testing the sources would
          // test something nobody installs.
          "@truocloud/img": `file:${join(ROOT, "packages/url")}`,
          "@truocloud/img-next": `file:${join(ROOT, "packages/next")}`,
        },
      },
      null,
      2,
    ),
  );

  await writeFile(
    join(dir, "next.config.js"),
    // CommonJS on purpose: this is still what most real projects have, and it is
    // why the packages ship a CJS build at all.
    `module.exports = {
  output: "export",
  images: {
    loader: "custom",
    loaderFile: "./node_modules/@truocloud/img-next/loader.js",
    deviceSizes: [640, 828, 1200, 1600, 2048],
  },
};\n`,
  );

  await writeFile(join(dir, ".env"), `NEXT_PUBLIC_TRUO_IMG_PID=${PID}\n`);
  await writeFile(
    join(dir, "app/layout.js"),
    `export default function L({ children }) { return <html><body>{children}</body></html>; }\n`,
  );
  await writeFile(
    join(dir, "app/page.js"),
    `import Image from "next/image";
export default function Page() {
  return <Image src="/uploads/photo.jpg" alt="" width={1200} height={800} />;
}\n`,
  );

  await run(["npm", "install", "--no-audit", "--no-fund"], dir);
  await run(["npx", "next", "build"], dir);

  const outDir = join(dir, "out");
  const files = await readdir(outDir);
  const htmlName = files.find((f) => f.endsWith(".html"));
  if (!htmlName) throw new Error("the export produced no HTML");
  const html = await readFile(join(outDir, htmlName), "utf8");

  // The assertions that matter: Next called OUR loader, and it produced the
  // canonical URL shape rather than something that merely looks right.
  const expectations = [
    // density pair (no `sizes`)
    `/i/${PID}/uploads/photo.jpg?f=auto&amp;w=1200 1x`,
    `/i/${PID}/uploads/photo.jpg?f=auto&amp;w=2048 2x`,
    // width ladder from deviceSizes (with `sizes`) — the ends of it
    `/i/${PID}/uploads/hero.jpg?f=auto&amp;w=640 640w`,
    `/i/${PID}/uploads/hero.jpg?f=auto&amp;w=2048 2048w`,
  ];
  for (const expected of expectations) {
    if (!html.includes(expected)) {
      throw new Error(`the emitted markup does not contain ${expected}\n\n${html.slice(0, 2000)}`);
    }
  }
  if (html.includes("/_next/image")) {
    // Next silently falls back to its own optimizer when the loader is not
    // picked up, and the page still renders — which is exactly how a broken
    // integration ships unnoticed.
    throw new Error("Next used its built-in optimizer: the custom loader was not picked up");
  }

  console.log("[verify-next] the loader is wired and the srcset is canonical");
} finally {
  await rm(dir, { recursive: true, force: true });
}
