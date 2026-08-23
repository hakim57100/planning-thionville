import * as ReactNative from "react-native";

const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
};

export const API_BASE_URL = env.apiBaseUrl;

/**
 * Renvoie l'URL de base de l'API.
 * En développement web (Metro sur 8081), on tente de déduire l'URL de l'API (port 3000)
 * à partir du nom d'hôte courant si EXPO_PUBLIC_API_BASE_URL n'est pas défini.
 */
export function getApiBaseUrl(): string {
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
  }

  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "planning-thionville-user-info";
