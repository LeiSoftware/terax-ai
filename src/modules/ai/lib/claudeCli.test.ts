import { describe, expect, it } from "vitest";
import {
  buildClaudeCodeInvokeArgs,
  buildClaudeCodePrompt,
  isClaudeCodeModel,
} from "./claudeCli";

describe("Claude Code CLI provider", () => {
  it("detects the Claude Code model id", () => {
    expect(isClaudeCodeModel("claude-code-sonnet")).toBe(true);
    expect(isClaudeCodeModel("claude-sonnet-4-6")).toBe(false);
  });

  it("builds a text-only transcript prompt", () => {
    const prompt = buildClaudeCodePrompt({
      messages: [
        {
          id: "u1",
          role: "user",
          parts: [{ type: "text", text: "hi" }],
        },
        {
          id: "a1",
          role: "assistant",
          parts: [{ type: "text", text: "hello" }],
        },
      ],
      customInstructions: "Be concise.",
      projectMemory: "Project rule.",
    });

    expect(prompt).toContain("Project rule.");
    expect(prompt).toContain("Be concise.");
    expect(prompt).toContain("default tools enabled");
    expect(prompt).toContain("USER:\nhi");
    expect(prompt).toContain("ASSISTANT:\nhello");
  });

  it("passes the workspace scope to the native command", () => {
    expect(buildClaudeCodeInvokeArgs("hi", "/tmp/project")).toEqual({
      prompt: "hi",
      model: "sonnet",
      cwd: "/tmp/project",
      timeoutSecs: 300,
      workspace: { kind: "local" },
    });
  });
});
