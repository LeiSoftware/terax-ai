type ErrorLike = {
  message?: unknown;
  lastError?: unknown;
  errors?: unknown;
  statusCode?: unknown;
  responseBody?: unknown;
  type?: unknown;
  request_id?: unknown;
  error?: unknown;
};

type ProviderError = {
  type: string | null;
  message: string | null;
  statusCode: number | null;
  requestId: string | null;
};

export function formatChatError(error: unknown): string {
  const retry = asObject(error);
  const lastError = retry?.lastError ?? lastArrayItem(retry?.errors);
  const providerError = extractProviderError(lastError ?? error);
  const message = getMessage(error);

  if (!providerError) return message;

  const providerMessage = formatProviderError(providerError);
  const attempts = Array.isArray(retry?.errors) ? retry.errors.length : null;
  if (attempts && attempts > 1) {
    return `Failed after ${attempts} attempts. Last error: ${providerMessage}`;
  }
  return providerMessage;
}

function extractProviderError(error: unknown): ProviderError | null {
  const obj = asObject(error);
  if (!obj) return null;
  const statusCode = typeof obj.statusCode === "number" ? obj.statusCode : null;
  const parsed = parseResponseBody(obj.responseBody);
  if (!parsed) {
    return statusCode
      ? { type: null, message: null, statusCode, requestId: null }
      : null;
  }

  const errorObj = asObject(parsed.error);
  const type = typeof errorObj?.type === "string" ? errorObj.type : null;
  const message =
    typeof errorObj?.message === "string"
      ? errorObj.message
      : typeof parsed.message === "string"
        ? parsed.message
        : null;
  const requestId =
    typeof parsed.request_id === "string" ? parsed.request_id : null;

  if (!type && !message && !statusCode && !requestId) return null;
  return { type, message, statusCode, requestId };
}

function parseResponseBody(body: unknown): Record<string, unknown> | null {
  if (typeof body !== "string" || !body.trim()) return null;
  try {
    const parsed = JSON.parse(body);
    return asObject(parsed);
  } catch {
    return null;
  }
}

function formatProviderError(error: ProviderError): string {
  const parts: string[] = [];
  if (error.type) parts.push(error.type);
  if (error.statusCode) parts.push(`HTTP ${error.statusCode}`);
  const label = parts.length > 0 ? parts.join(" ") : "provider error";
  const message = error.message ? `: ${error.message}` : "";
  const requestId = error.requestId ? ` (request ${error.requestId})` : "";
  return `${label}${message}${requestId}`;
}

function getMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const obj = asObject(error);
  if (typeof obj?.message === "string") return obj.message;
  return String(error);
}

function asObject(value: unknown): ErrorLike | null {
  return value && typeof value === "object" ? (value as ErrorLike) : null;
}

function lastArrayItem(value: unknown): unknown {
  return Array.isArray(value) && value.length > 0
    ? value[value.length - 1]
    : undefined;
}
