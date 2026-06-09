export const ANTHROPIC_OAUTH_BETA = "oauth-2025-04-20";

export function isAnthropicOAuthToken(token: string): boolean {
  return /^sk-ant-oat[0-9A-Za-z_-]*-/.test(token.trim());
}

export function buildAnthropicProviderSettings(token: string):
  | { apiKey: string; authToken?: never }
  | {
      authToken: string;
      headers: { "anthropic-beta": string };
      apiKey?: never;
    } {
  const trimmed = token.trim();
  if (!isAnthropicOAuthToken(trimmed)) return { apiKey: trimmed };
  return {
    authToken: trimmed,
    headers: { "anthropic-beta": ANTHROPIC_OAUTH_BETA },
  };
}
