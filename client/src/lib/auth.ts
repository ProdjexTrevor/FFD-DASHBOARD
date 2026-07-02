const STORAGE_KEY = "fdd.dashboardAuth";

export interface DashboardAuth {
  username: string;
  password: string;
}

export function getStoredAuth(): DashboardAuth | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as DashboardAuth;
    if (!parsed.username || !parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: DashboardAuth) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function getAuthHeader() {
  const auth = getStoredAuth();
  if (!auth) return null;
  return `Basic ${btoa(`${auth.username}:${auth.password}`)}`;
}
