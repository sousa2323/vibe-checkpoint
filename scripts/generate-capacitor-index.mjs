import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const clientDir = join(process.cwd(), "dist", "client");
const serverEntry = pathToFileURL(join(process.cwd(), "dist", "server", "server.js"));

const server = (await import(serverEntry.href)).default;
const response = await server.fetch(new Request("https://localhost/"), {}, {});

if (!response.ok) {
  throw new Error(
    `Could not render Capacitor index HTML: ${response.status} ${response.statusText}`,
  );
}

const restoreRouteScript = `<script>(function(){try{var path=location.pathname+location.search+location.hash;if(path!=="/"){window.__CHEGAAI_CAPACITOR_INITIAL_PATH=path;history.replaceState(history.state,"","/");}}catch(error){}})();</script>`;
const html = (await response.text()).replace("<head>", `<head>${restoreRouteScript}`);

await writeFile(join(clientDir, "index.html"), html);
