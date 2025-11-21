import * as SecureStore from "expo-secure-store";

import type {
  AuthResponse,
  AuthTokens,
  LoginCredentials,
  RegisterPayload,
  User,
} from "./types";

const BASE_URL = "https://splitbillbe.netlify.app";
const ACCESS_TOKEN_KEY = "splitbill_accessToken";
const REFRESH_TOKEN_KEY = "splitbill_refreshToken";

let cachedTokens: AuthTokens | null = null;

const memoryStore: Record<string, string | null> = {};

async function storageIsSecureAvailable(): Promise<boolean> {
  try {
    return Boolean(await SecureStore.isAvailableAsync());
  } catch {
    return false;
  }
}

async function readValue(key: string): Promise<string | null> {
  const canUseSecure = await storageIsSecureAvailable();
  if (canUseSecure) {
    return SecureStore.getItemAsync(key);
  }

  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(key);
  }

  return memoryStore[key] ?? null;
}

async function writeValue(key: string, value: string): Promise<void> {
  const canUseSecure = await storageIsSecureAvailable();
  if (canUseSecure) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(key, value);
  } else {
    memoryStore[key] = value;
  }
}

async function deleteValue(key: string): Promise<void> {
  const canUseSecure = await storageIsSecureAvailable();
  if (canUseSecure) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem(key);
  }

  delete memoryStore[key];
}

async function saveTokens(tokens: AuthTokens): Promise<void> {
  cachedTokens = tokens;
  await writeValue(ACCESS_TOKEN_KEY, tokens.accessToken);
  await writeValue(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

async function clearTokens(): Promise<void> {
  cachedTokens = null;
  await deleteValue(ACCESS_TOKEN_KEY);
  await deleteValue(REFRESH_TOKEN_KEY);
}

async function getTokens(): Promise<AuthTokens | null> {
  if (cachedTokens) return cachedTokens;

  const [accessToken, refreshToken] = await Promise.all([
    readValue(ACCESS_TOKEN_KEY),
    readValue(REFRESH_TOKEN_KEY),
  ]);

  if (accessToken && refreshToken) {
    cachedTokens = { accessToken, refreshToken };
    return cachedTokens;
  }

  return null;
}

export type ApiRequestOptions = RequestInit & { skipAuth?: boolean };

async function request<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const tokens = options.skipAuth ? null : await getTokens();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (tokens) {
    headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      await clearTokens();
    }

    const errorMessage =
      (data as { error?: string } | null)?.error ?? "Request failed";
    throw new Error(errorMessage);
  }

  return data as T;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return request<T>(endpoint, options);
}

export async function register(
  payload: RegisterPayload
): Promise<AuthResponse> {
  const result = await request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
  });

  await saveTokens({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
  return result;
}

export async function login(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  const result = await request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
    skipAuth: true,
  });

  await saveTokens({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
  return result;
}

export async function logout(): Promise<void> {
  const tokens = await getTokens();

  try {
    await request("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: tokens?.refreshToken }),
    });
  } finally {
    await clearTokens();
  }
}

export async function getCurrentUser(): Promise<User> {
  const result = await request<{ user: User }>("/api/auth/me");
  return result.user;
}

export async function restoreSession(): Promise<{
  tokens: AuthTokens;
  user: User;
} | null> {
  const tokens = await getTokens();
  if (!tokens) return null;

  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    await clearTokens();
    return null;
  }

  return { tokens, user };
}
