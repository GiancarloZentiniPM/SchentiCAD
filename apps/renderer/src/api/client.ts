// ============================================================
// SchentiCAD API Client — Fetch wrapper for NestJS Backend
// ============================================================

const BASE_URL =
  (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_API_URL ??
  "http://localhost:3001";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, `${res.status} ${res.statusText}: ${body}`);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// --- Projects ---

export const projectsApi = {
  list: () => request<any[]>("/api/projects"),
  get: (id: string) => request<any>(`/api/projects/${encodeURIComponent(id)}`),
  create: (data: { name: string; company?: string; creator?: string; description?: string }) =>
    request<any>("/api/projects", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; company?: string; creator?: string; description?: string }) =>
    request<any>(`/api/projects/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// --- Pages ---

export const pagesApi = {
  list: (projectId: string) =>
    request<any[]>(`/api/pages?projectId=${encodeURIComponent(projectId)}`),
  get: (id: string) => request<any>(`/api/pages/${encodeURIComponent(id)}`),
  create: (data: { projectId: string; name: string; type?: string; format?: string; orientation?: string }) =>
    request<any>("/api/pages", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; type?: string; format?: string; orientation?: string }) =>
    request<any>(`/api/pages/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/api/pages/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// --- Elements ---

export const elementsApi = {
  list: (pageId: string) =>
    request<any[]>(`/api/elements?pageId=${encodeURIComponent(pageId)}`),
  get: (id: string) => request<any>(`/api/elements/${encodeURIComponent(id)}`),
  create: (data: {
    pageId: string;
    symbolId: string;
    x: number;
    y: number;
    rotation?: number;
    mirrored?: boolean;
    bmk?: string;
    properties?: string;
  }) => request<any>("/api/elements", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { x?: number; y?: number; rotation?: number; mirrored?: boolean; bmk?: string; properties?: string }) =>
    request<any>(`/api/elements/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/api/elements/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// --- Wires ---

export const wiresApi = {
  list: (pageId: string) =>
    request<any[]>(`/api/wires?pageId=${encodeURIComponent(pageId)}`),
  get: (id: string) => request<any>(`/api/wires/${encodeURIComponent(id)}`),
  create: (data: {
    pageId: string;
    name?: string;
    path: string;
    gauge?: string;
    color?: string;
    potential?: string;
  }) => request<any>("/api/wires", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; path?: string; gauge?: string; color?: string; potential?: string }) =>
    request<any>(`/api/wires/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/api/wires/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// --- BMK ---

export const bmkApi = {
  list: (projectId: string) =>
    request<any[]>(`/api/bmk?projectId=${encodeURIComponent(projectId)}`),
  get: (id: string) => request<any>(`/api/bmk/${encodeURIComponent(id)}`),
  allocate: (data: { projectId: string; prefix: string; elementId: string; plantDesignation?: string; locationDesignation?: string }) =>
    request<any>("/api/bmk/allocate", { method: "POST", body: JSON.stringify(data) }),
  rename: (id: string, designation: string) =>
    request<any>(`/api/bmk/${encodeURIComponent(id)}/rename`, { method: "PUT", body: JSON.stringify({ designation }) }),
  delete: (id: string) =>
    request<void>(`/api/bmk/${encodeURIComponent(id)}`, { method: "DELETE" }),
  duplicates: (projectId: string) =>
    request<Record<string, any[]>>(`/api/bmk/duplicates?projectId=${encodeURIComponent(projectId)}`),
};

// --- Symbols ---

export const symbolsApi = {
  list: (category?: string) => {
    const q = category ? `?category=${encodeURIComponent(category)}` : "";
    return request<any[]>(`/api/symbols${q}`);
  },
  get: (id: string) => request<any>(`/api/symbols/${encodeURIComponent(id)}`),
  create: (data: {
    name: string;
    category: string;
    geometry: string;
    connectionPoints: string;
    width: number;
    height: number;
    description?: string;
  }) => request<any>("/api/symbols", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: {
    name?: string;
    category?: string;
    geometry?: string;
    connectionPoints?: string;
    width?: number;
    height?: number;
    description?: string;
  }) => request<any>(`/api/symbols/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/api/symbols/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// --- Versioning ---

export const versioningApi = {
  // Branches
  listBranches: (projectId: string) =>
    request<any[]>(`/api/projects/${encodeURIComponent(projectId)}/versioning/branches`),
  createBranch: (projectId: string, data: { name: string; headCommitId?: string }) =>
    request<any>(`/api/projects/${encodeURIComponent(projectId)}/versioning/branches`, {
      method: "POST", body: JSON.stringify(data),
    }),
  deleteBranch: (projectId: string, branchId: string) =>
    request<void>(`/api/projects/${encodeURIComponent(projectId)}/versioning/branches/${encodeURIComponent(branchId)}`, {
      method: "DELETE",
    }),

  // Commits
  listCommits: (projectId: string, branchId?: string) => {
    const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
    return request<any[]>(`/api/projects/${encodeURIComponent(projectId)}/versioning/commits${q}`);
  },
  getCommit: (projectId: string, commitId: string) =>
    request<any>(`/api/projects/${encodeURIComponent(projectId)}/versioning/commits/${encodeURIComponent(commitId)}`),
  createCommit: (projectId: string, data: {
    branchId: string; parentCommitId?: string; message: string;
    authorName?: string; snapshotHash?: string; snapshot?: string;
    deltas?: { entityType: string; entityId: string; operation: string; oldValue?: string; newValue?: string }[];
  }) =>
    request<any>(`/api/projects/${encodeURIComponent(projectId)}/versioning/commits`, {
      method: "POST", body: JSON.stringify(data),
    }),

  // Snapshot
  getSnapshot: (projectId: string, commitId: string) =>
    request<{ snapshot: any; hash: string }>(
      `/api/projects/${encodeURIComponent(projectId)}/versioning/commits/${encodeURIComponent(commitId)}/snapshot`,
    ),

  // History
  getHistory: (projectId: string, branchId: string, limit?: number) => {
    const q = limit ? `?limit=${limit}` : "";
    return request<any[]>(
      `/api/projects/${encodeURIComponent(projectId)}/versioning/history/${encodeURIComponent(branchId)}${q}`,
    );
  },
};
