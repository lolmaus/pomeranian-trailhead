import type { StorybookConfig } from "@storybook/react-vite";
const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: [
    "../../../packages/lib-ant-design/tests/**/*.stories.tsx",
    "../../../packages/test-support/tests/fixtures/**/*.stories.tsx",
  ],
  core: { disableTelemetry: true },
};
export default config;
