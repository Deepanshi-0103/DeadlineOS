const REMEMBERED_EMAIL_KEY = "deadlineos_remembered_email";

export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

export function setRememberedEmail(email: string) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = email.trim().toLowerCase();
    if (trimmed) localStorage.setItem(REMEMBERED_EMAIL_KEY, trimmed);
  } catch {
    // ignore quota / private mode
  }
}
