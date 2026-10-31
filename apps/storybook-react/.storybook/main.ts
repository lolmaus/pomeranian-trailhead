import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: [
    "../../../packages/lib-ant-design/tests/**/*.stories.tsx",
    "../../../packages/test-support/tests/fixtures/**/*.stories.tsx",
  ],
  viteFinal(config) {
    config.plugins ??= [];
    config.plugins.push({
      name: "pomeranian-host-identity",
      configureServer(server) {
        server.middlewares.use("/__pomeranian_host", (_req, res) => {
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              host: "pomeranian-react-storybook",
              root: realpathSync(fileURLToPath(new URL("../../../", import.meta.url))),
            }),
          );
        });
      },
    });
    return config;
  },
  core: { disableTelemetry: true },
};
export default config;
