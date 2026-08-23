import { getApiBaseUrl } from "@/constants/api";
import * as Auth from "./auth";

export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const sessionToken = await Auth.getSessionToken();
  if (sessionToken) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }

  const baseUrl = getApiBaseUrl();
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = baseUrl ? `${cleanBaseUrl}${cleanEndpoint}` : endpoint;

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorText;
    } catch {
      // pas du JSON, on garde le texte tel quel
    }
    throw new Error(errorMessage || `Échec de la requête : ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

// Connexion par code d'accès : renvoie le token de session + les infos du salarié.
export async function loginWithCode(code: string): Promise<{ token: string; user: Auth.User }> {
  return apiCall<{ token: string; user: Auth.User }>("/api/auth/code-login", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function logout(): Promise<void> {
  await apiCall<void>("/api/auth/logout", { method: "POST" });
}

export async function getMe(): Promise<Auth.User | null> {
  try {
    const result = await apiCall<{ user: Auth.User | null }>("/api/auth/me");
    return result.user || null;
  } catch (error) {
    return null;
  }
}
