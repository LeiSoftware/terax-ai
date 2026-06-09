import { describe, expect, it } from "vitest";
import { formatChatError } from "./errorMessage";

describe("formatChatError", () => {
  it("keeps plain errors unchanged", () => {
    expect(formatChatError(new Error("network down"))).toBe("network down");
  });

  it("includes provider status, type, and request id from retry errors", () => {
    const apiError = {
      message: "Error",
      statusCode: 429,
      responseBody: JSON.stringify({
        type: "error",
        error: { type: "rate_limit_error", message: "Error" },
        request_id: "req_123",
      }),
    };
    const retryError = {
      message: "Failed after 3 attempts. Last error: Error",
      errors: [apiError, apiError, apiError],
      lastError: apiError,
    };

    expect(formatChatError(retryError)).toBe(
      "Failed after 3 attempts. Last error: rate_limit_error HTTP 429: Error (request req_123)",
    );
  });
});
