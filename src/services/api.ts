
import { auth } from "./firebase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ApiOptions extends RequestInit {
  authenticated?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not configured.");
  }

  const {
    authenticated = true,
    headers,
    ...requestOptions
  } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  if (
    requestOptions.body &&
    !(requestOptions.body instanceof FormData)
  ) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Please sign in to continue.");
    }

    const token = await user.getIdToken();
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const path = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: requestHeaders,
  });

  const contentType = response.headers.get("content-type") ?? "";

  const result = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result
        ? String(result.error)
        : `API request failed (${response.status})`;

    throw new Error(message);
  }

  return result as T;
}
