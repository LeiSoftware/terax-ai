import { describe, expect, it } from "vitest";
import { hasClaudeCodeCommand } from "./transport";

describe("hasClaudeCodeCommand", () => {
  it("detects the Claude Code command marker on the latest user message", () => {
    expect(
      hasClaudeCodeCommand([
        {
          id: "u1",
          role: "user",
          parts: [
            {
              type: "text",
              text: '<terax-command name="claude-code" />\n\nDo the task.',
            },
          ],
        },
      ]),
    ).toBe(true);
  });

  it("ignores markers from older messages once the latest user turn is normal", () => {
    expect(
      hasClaudeCodeCommand([
        {
          id: "u1",
          role: "user",
          parts: [
            { type: "text", text: '<terax-command name="claude-code" />' },
          ],
        },
        {
          id: "a1",
          role: "assistant",
          parts: [{ type: "text", text: "done" }],
        },
        {
          id: "u2",
          role: "user",
          parts: [{ type: "text", text: "normal follow-up" }],
        },
      ]),
    ).toBe(false);
  });
});
