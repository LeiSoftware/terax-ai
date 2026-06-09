import { describe, expect, it } from "vitest";
import {
  ANTHROPIC_OAUTH_BETA,
  buildAnthropicProviderSettings,
  isAnthropicOAuthToken,
} from "./anthropicAuth";

describe("Anthropic auth settings", () => {
  it("uses x-api-key auth for regular Anthropic API keys", () => {
    expect(isAnthropicOAuthToken("sk-ant-api03-example")).toBe(false);
    expect(buildAnthropicProviderSettings(" sk-ant-api03-example ")).toEqual({
      apiKey: "sk-ant-api03-example",
    });
  });

  it("uses bearer auth and the OAuth beta for Claude OAuth tokens", () => {
    expect(isAnthropicOAuthToken("sk-ant-oat01-example")).toBe(true);
    expect(buildAnthropicProviderSettings(" sk-ant-oat01-example ")).toEqual({
      authToken: "sk-ant-oat01-example",
      headers: { "anthropic-beta": ANTHROPIC_OAUTH_BETA },
    });
  });
});
