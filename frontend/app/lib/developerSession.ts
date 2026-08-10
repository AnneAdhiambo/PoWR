const DEVELOPER_SESSION_KEY = "powr_developer_session";

export function getDeveloperSession(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEVELOPER_SESSION_KEY);
}

export function setDeveloperSession(session: string): void {
  localStorage.setItem(DEVELOPER_SESSION_KEY, session);
}

export function clearDeveloperSession(): void {
  localStorage.removeItem(DEVELOPER_SESSION_KEY);
}

export function developerAuthHeaders(): Record<string, string> {
  const session = getDeveloperSession();
  return session ? { Authorization: `Bearer ${session}` } : {};
}
