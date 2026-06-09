import { invoke } from "@tauri-apps/api/core";
import { createUIMessageStream, type UIMessage } from "ai";
import { currentWorkspaceEnv } from "@/modules/workspace";

type ClaudeCodeOutput = {
  stdout: string;
  stderr: string;
  exit_code: number | null;
  timed_out: boolean;
  truncated: boolean;
};

type BuildPromptOptions = {
  messages: UIMessage[];
  customInstructions?: string;
  agentPersona?: { name: string; instructions: string } | null;
  projectMemory?: string | null;
};

type RunClaudeCliOptions = BuildPromptOptions & {
  cwd: string | null;
  abortSignal?: AbortSignal;
  onStep?: (step: string | null) => void;
};

const CLAUDE_CODE_MODEL = "sonnet";

export function isClaudeCodeModel(modelId: string): boolean {
  return modelId === "claude-code-sonnet";
}

export function runClaudeCodeCliStream(opts: RunClaudeCliOptions) {
  return createUIMessageStream<UIMessage>({
    originalMessages: opts.messages,
    execute: async ({ writer }) => {
      if (opts.abortSignal?.aborted) return;
      opts.onStep?.("Running Claude Code");
      const prompt = buildClaudeCodePrompt(opts);
      const output = await invoke<ClaudeCodeOutput>("claude_code_print", {
        ...buildClaudeCodeInvokeArgs(prompt, opts.cwd),
      });
      opts.onStep?.(null);
      if (opts.abortSignal?.aborted) return;
      if (output.timed_out) {
        throw new Error("Claude Code timed out.");
      }
      if (output.exit_code !== 0) {
        throw new Error(formatClaudeCodeFailure(output));
      }
      const text = output.stdout.trim();
      if (!text) {
        throw new Error(
          output.stderr.trim() || "Claude Code returned no output.",
        );
      }
      writer.write({ type: "text-start", id: "claude-code-output" });
      writer.write({
        type: "text-delta",
        id: "claude-code-output",
        delta: text,
      });
      writer.write({ type: "text-end", id: "claude-code-output" });
    },
    onError: (error) =>
      error instanceof Error ? error.message : String(error),
  });
}

export function buildClaudeCodeInvokeArgs(prompt: string, cwd: string | null) {
  return {
    prompt,
    model: CLAUDE_CODE_MODEL,
    cwd,
    timeoutSecs: 300,
    workspace: currentWorkspaceEnv(),
  };
}

export function buildClaudeCodePrompt({
  messages,
  customInstructions,
  agentPersona,
  projectMemory,
}: BuildPromptOptions): string {
  const blocks = [
    "You are replying inside Terax's built-in AI chat.",
    "You are running through Claude Code CLI with its default tools enabled. Use tools when they are needed, and answer directly in chat when no tool is needed.",
    "File edits and command execution are handled by Claude Code's own permission system, not Terax's AI SDK approval cards.",
  ];
  if (projectMemory?.trim()) {
    blocks.push(`Project instructions:\n${projectMemory.trim()}`);
  }
  if (agentPersona?.instructions.trim()) {
    blocks.push(
      `Active agent persona (${agentPersona.name}):\n${agentPersona.instructions.trim()}`,
    );
  }
  if (customInstructions?.trim()) {
    blocks.push(`User custom instructions:\n${customInstructions.trim()}`);
  }

  const transcript = messages
    .map((m) => {
      const text = uiMessageText(m).trim();
      if (!text) return null;
      return `${m.role.toUpperCase()}:\n${text}`;
    })
    .filter((x): x is string => x !== null)
    .join("\n\n");

  return `${blocks.join("\n\n")}\n\nConversation:\n${transcript}`;
}

function uiMessageText(message: UIMessage): string {
  return message.parts
    .map((part) => {
      if (part.type === "text") return part.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function formatClaudeCodeFailure(output: ClaudeCodeOutput): string {
  const stderr = output.stderr.trim();
  const stdout = output.stdout.trim();
  const body = stderr || stdout || "unknown error";
  const suffix = output.truncated ? " (output truncated)" : "";
  return `Claude Code failed${output.exit_code === null ? "" : ` with exit code ${output.exit_code}`}: ${body}${suffix}`;
}
