import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatusBadge } from "@/components/app/primitives";

afterEach(cleanup);

describe("Status changes with browser-translated labels", () => {
  it.each([
    ["pending", "confirmed"],
    ["pending", "cancelled"],
    ["confirmed", "cancelled"],
    ["confirmed", "pending"],
  ] as const)("renders %s → %s without a DOM exception", (before, after) => {
    const { container, rerender } = render(<StatusBadge status={before} />);
    // Browser translation replaces a text node with its translated DOM wrapper.
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const label = walker.nextNode()!;
    const translated = document.createElement("font");
    translated.textContent = "Translated status";
    label.parentNode!.replaceChild(translated, label);

    expect(() => rerender(<StatusBadge status={after} />)).not.toThrow();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container).toHaveTextContent(after.charAt(0).toUpperCase() + after.slice(1));
  });
});
