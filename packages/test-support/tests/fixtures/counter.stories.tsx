import type { Meta } from "@storybook/react";
import { useState } from "react";
// A runtime import in Node would fail, proving type references are erased.
void window.document;
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
const meta = {
  title: "HTML/Counter",
  id: "custom-counter",
  excludeStories: /^Helper$/,
  render: () => <Counter />,
} as const;
meta satisfies Meta;
export default meta;
export const Counting = { name: "Readable counter" };

export const Helper = { name: "Not indexed" };
export const Throwing = {
  render: () => {
    throw new Error("Counter fixture render exploded");
  },
};
export const NotReady = { render: () => <p>Never ready</p> };
