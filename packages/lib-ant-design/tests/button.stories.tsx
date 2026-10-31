import { buttonLabel } from "./button-label.ts";
import type { Meta, StoryObj } from "@storybook/react";
import { Button, Modal } from "antd";
import { useState } from "react";
import "antd/dist/reset.css";
function Details({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="primary" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal
        title="Details"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => setOpen(false)}
      >
        Portaled content
      </Modal>
    </>
  );
}
const meta = {
  title: "Ant Design/Button",
  component: Details,
  args: { label: buttonLabel },
} as const;
meta satisfies Meta<typeof Details>;
export default meta;
export const Primary: StoryObj<typeof meta> = {};
