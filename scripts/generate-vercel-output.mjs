import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { nodeFileTrace } from "@vercel/nft";

const rootDir = process.cwd();
const outputDir = join(rootDir, ".vercel", "output");
const staticDir = join(outputDir, "static");
const functionDir = join(outputDir, "functions", "api", "server.func");

async function copyTracedNodeModules() {
  const { fileList, warnings } = await nodeFileTrace([join(functionDir, "index.mjs")], {
    base: rootDir,
    processCwd: rootDir,
  });

  for (const warning of warnings) {
    console.warn(warning.message);
  }

  let copiedFiles = 0;

  for (const file of fileList) {
    const normalizedFile = file.replaceAll("\\", "/");
    if (!normalizedFile.startsWith("node_modules/")) continue;

    const pathParts = normalizedFile.split("/");
    const source = join(rootDir, ...pathParts);
    const destination = join(functionDir, ...pathParts);

    await mkdir(dirname(destination), { recursive: true });
    await cp(source, destination, { force: true, recursive: true });
    copiedFiles += 1;
  }

  console.log(`Copied ${copiedFiles} traced dependency files to Vercel function.`);
}

await rm(outputDir, { force: true, recursive: true });
await mkdir(staticDir, { recursive: true });
await mkdir(functionDir, { recursive: true });

await cp(join(rootDir, "dist", "client"), staticDir, { recursive: true });
await cp(join(rootDir, "dist", "server"), join(functionDir, "dist", "server"), {
  recursive: true,
});

await writeFile(
  join(outputDir, "config.json"),
  `${JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "^/assets/(.*)$", dest: "/assets/$1" },
        { src: "^/favicon\\.ico$", dest: "/favicon.ico" },
        { src: "^/(.*)$", dest: "/api/server?__vc_path=/$1" },
      ],
    },
    null,
    2,
  )}\n`,
);

await writeFile(
  join(functionDir, ".vc-config.json"),
  `${JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
    },
    null,
    2,
  )}\n`,
);

await writeFile(
  join(functionDir, "package.json"),
  `${JSON.stringify({ type: "module" }, null, 2)}\n`,
);

await writeFile(
  join(functionDir, "index.mjs"),
  `let serverPromise;

async function getServer() {
  serverPromise ??= import("./dist/server/server.js").then((module) => module.default);
  return serverPromise;
}

function getRequestUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const url = new URL(req.url || "/", protocol + "://" + host);
  const routedPath = url.searchParams.get("__vc_path");

  if (routedPath) {
    url.pathname = routedPath.startsWith("/") ? routedPath : "/" + routedPath;
    url.searchParams.delete("__vc_path");
  }

  return url;
}

function getRequestHeaders(req) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  return headers;
}

async function sendWebResponse(res, webResponse) {
  res.statusCode = webResponse.status;
  res.statusMessage = webResponse.statusText;
  webResponse.headers.forEach((value, key) => res.setHeader(key, value));

  if (!webResponse.body) {
    res.end();
    return;
  }

  const reader = webResponse.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

export default async function handler(req, res) {
  const server = await getServer();
  const method = req.method || "GET";
  const body = method === "GET" || method === "HEAD" ? undefined : req;
  const request = new Request(getRequestUrl(req), {
    method,
    headers: getRequestHeaders(req),
    body,
    duplex: body ? "half" : undefined,
  });

  const response = await server.fetch(request, process.env, {});
  await sendWebResponse(res, response);
}
`,
);

await copyTracedNodeModules();
