import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SESSION_TOKEN_KEY, USER_INFO_KEY } from "@/constants/api";

export type User = {
  id: number;
  name: string;
  email: string | null;
  jobTitle: string;
  color: string;
  role: "admin" | "employee";
  active: boolean;
};

export async function getSessionToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(SESSION_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch (error) {
    console.error("[Auth] Failed to get session token:", error);
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage.setItem(SESSION_TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  } catch (error) {
    console.error("[Auth] Failed to set session token:", error);
    throw error;
  }
}

export async function removeSessionToken(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } catch (error) {
    console.error("[Auth] Failed to remove session token:", error);
  }
}

export async function getUserInfo(): Promise<User | null> {
  try {
    let info: string | null = null;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") info = window.localStorage.getItem(USER_INFO_KEY);
    } else {
      info = await SecureStore.getItemAsync(USER_INFO_KEY);
    }
    return info ? (JSON.parse(info) as User) : null;
  } catch (error) {
    console.error("[Auth] Failed to get user info:", error);
    return null;
  }
}

export async function setUserInfo(user: User): Promise<void> {
  try {
    const serialized = JSON.stringify(user);
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage.setItem(USER_INFO_KEY, serialized);
      return;
    }
    await SecureStore.setItemAsync(USER_INFO_KEY, serialized);
  } catch (error) {
    console.error("[Auth] Failed to set user info:", error);
  }
}

export async function clearUserInfo(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage.removeItem(USER_INFO_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
  } catch (error) {
    console.error("[Auth] Failed to clear user info:", error);
  }
}
