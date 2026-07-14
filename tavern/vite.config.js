import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

const statusFrameGlobals = {
  name: "status-frame-globals",
  transformIndexHtml: {
    order: "pre",
    handler(html, context) {
      if (context.path !== "/src/index.html") return html;

      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: { src: "https://code.jquery.com/jquery-3.6.0.min.js" },
            injectTo: "head-prepend",
          },
          {
            tag: "script",
            attrs: {
              src: "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js",
            },
            injectTo: "head-prepend",
          },
          {
            tag: "script",
            attrs: { src: "/src/mock.js" },
            injectTo: "head",
          },
        ],
      };
    },
  },
};

export default defineConfig({
  root: projectRoot,
  plugins: [statusFrameGlobals],
  appType: "mpa",
  server: {
    host: "127.0.0.1",
    port: 5174,
    open: "/tavern/",
  },
});
