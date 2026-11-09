export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Account = {
  id: number;
  name: string;
  email: string;
  role: string;
  license_reference: string | null;
};

export type Enrollment = {
  license_reference: string;
  name: string;
  email: string;
  parent_reference: string | null;
  parent_name: string | null;
  enrolled_via: string;
  consented_at: string | null;
};

const TOKEN_KEY = "cafs_token";
const USER_KEY = "cafs_user";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.errors) {
      const messages = Object.values(error.errors).flat();
      if (messages.length) return messages.join(" ");
    }
    return error.message;
  }
  return "The study studio server could not be reached. Start the Laravel app, then try again.";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getCachedAccount(): Account | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Account;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: Account) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function logout(): Promise<void> {
  try {
    if (getToken()) await api("/api/logout", { method: "POST" });
  } catch {
    // The local session still has to end if the server is unreachable.
  }
  clearSession();
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("The study studio server could not be reached.", 0);
  }

  if (response.status === 204) return undefined as T;

  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
    errors?: Record<string, string[]>;
  };

  if (!response.ok) {
    throw new ApiError(data.message || "Request failed.", response.status, data.errors);
  }

  return data as T;
}

export async function fetchStudioDocument(): Promise<string> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/studio`, {
      headers: {
        Accept: "text/html",
        Authorization: token ? `Bearer ${token}` : "",
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("The study studio server could not be reached.", 0);
  }

  if (!response.ok) {
    throw new ApiError("Your study studio could not be opened.", response.status);
  }

  return response.text();
}

export async function downloadEnrollmentCsv(): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_URL}/api/admin/enrollments/export`, {
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  });
  if (!response.ok) {
    throw new ApiError("The enrollment register could not be exported.", response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "CAFS_enrollment_register.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
