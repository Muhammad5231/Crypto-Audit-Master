import { useAuthStore } from "@/store/authStore";

const API_BASE = "http://localhost:5001/api";

function getToken() {
  return useAuthStore.getState().token;
}

function buildQuery(params?: Record<string, any>) {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.append(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error("Backend connect nahi ho raha. Backend ko http://localhost:5001 par run karo aur MongoDB Compass start rakho.");
  }

  const contentType = res.headers.get("content-type") || "";
  let data: any = null;

  if (contentType.includes("application/json")) data = await res.json();
  else if (contentType.includes("text/csv") || contentType.includes("application/pdf")) data = await res.blob();
  else data = await res.text();

  if (!res.ok) throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
  return data as T;
}

export const authApi = {
  register: (payload: { username: string; email: string; password: string }) =>
    request<{ token: string; user: any }>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { emailOrUsername: string; password: string }) =>
    request<{ token: string; user: any }>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request<any>("/auth/me"),
};

export const workspaceApi = {
  list: (includeArchived = false) => request<any>(`/workspaces${buildQuery({ includeArchived })}`),
  create: (payload: any) => request<any>("/workspaces", { method: "POST", body: JSON.stringify(payload) }),
  get: (workspaceId: string) => request<any>(`/workspaces/${workspaceId}`),
  update: (workspaceId: string, payload: any) => request<any>(`/workspaces/${workspaceId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  delete: (workspaceId: string) => request<any>(`/workspaces/${workspaceId}`, { method: "DELETE" }),
  archive: (workspaceId: string, isArchived: boolean) => request<any>(`/workspaces/${workspaceId}/archive`, { method: "POST", body: JSON.stringify({ isArchived }) }),
  duplicate: (workspaceId: string) => request<any>(`/workspaces/${workspaceId}/duplicate`, { method: "POST" }),
  updateLastOpened: (workspaceId: string) => request<any>(`/workspaces/${workspaceId}/last-opened`, { method: "PATCH" }),
};

export const uploadApi = {
  list: (workspaceId: string) =>
    request<any>(`/workspaces/${workspaceId}/uploads`),

  upload: (
    workspaceId: string,
    file: File,
    exchangeName = 'Default Exchange',
    buyFeePercent = '0',
    sellFeePercent = '0'
  ) => {
    const formData = new FormData();

    formData.append('file', file);
    formData.append('exchangeName', exchangeName);
    formData.append('buyFeePercent', String(buyFeePercent));
    formData.append('sellFeePercent', String(sellFeePercent));

    return request<any>(`/workspaces/${workspaceId}/uploads`, {
      method: 'POST',
      body: formData,
    });
  },

  delete: (workspaceId: string, fileId: string) =>
    request<any>(`/workspaces/${workspaceId}/uploads/${fileId}`, {
      method: 'DELETE',
    }),
};

export const reportApi = {
  process: (workspaceId: string) => request<any>(`/workspaces/${workspaceId}/process`, { method: "POST" }),
  getReport: (workspaceId: string) => request<any>(`/workspaces/${workspaceId}/report`),
  getAnalytics: (workspaceId: string) => request<any>(`/workspaces/${workspaceId}/analytics`),
  getRealizedTrades: (workspaceId: string, params?: Record<string, any>) => request<any>(`/workspaces/${workspaceId}/realized-trades${buildQuery(params)}`),
  getOpenHoldings: (workspaceId: string) => request<any>(`/workspaces/${workspaceId}/open-holdings`),
  getDailyProfit: (workspaceId: string) => request<any>(`/workspaces/${workspaceId}/daily-profit`),
};

export const settingsApi = {
  getExchangeSettings: (workspaceId: string) => request<any>(`/workspaces/${workspaceId}/exchange-settings`),
  upsertExchangeSetting: (workspaceId: string, payload: any) => request<any>(`/workspaces/${workspaceId}/exchange-settings`, { method: "POST", body: JSON.stringify(payload) }),
  updateExchangeSetting: (workspaceId: string, settingId: string, payload: any) => request<any>(`/workspaces/${workspaceId}/exchange-settings/${settingId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteExchangeSetting: (workspaceId: string, settingId: string) => request<any>(`/workspaces/${workspaceId}/exchange-settings/${settingId}`, { method: "DELETE" }),
};

export const notesApi = {
  list: (workspaceId: string) => request<any>(`/workspaces/${workspaceId}/notes`),
  create: (workspaceId: string, payload: any) => request<any>(`/workspaces/${workspaceId}/notes`, { method: "POST", body: JSON.stringify(payload) }),
  update: (workspaceId: string, noteId: string, payload: any) => request<any>(`/workspaces/${workspaceId}/notes/${noteId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  delete: (workspaceId: string, noteId: string) => request<any>(`/workspaces/${workspaceId}/notes/${noteId}`, { method: "DELETE" }),
};

export const manualTradeApi = {
  create: (workspaceId: string, payload: any) => request<any>(`/workspaces/${workspaceId}/manual-trades`, { method: "POST", body: JSON.stringify(payload) }),
  list: (workspaceId: string) => request<any>(`/workspaces/${workspaceId}/manual-trades`),
};

export const exportApi = {
  exportCsv: (workspaceId: string, _params?: Record<string, any>) => request<Blob>(`/workspaces/${workspaceId}/export`),
  exportPdf: (workspaceId: string, _params?: Record<string, any>) => request<Blob>(`/workspaces/${workspaceId}/export-pdf`),
  getHistory: (workspaceId: string) => request<any>(`/workspaces/${workspaceId}/export-history`),
};

export const api = {
  ...authApi,
  getWorkspaces: workspaceApi.list,
  createWorkspace: workspaceApi.create,
  updateWorkspace: workspaceApi.update,
  deleteWorkspace: workspaceApi.delete,
  uploadCsv: uploadApi.upload,
  processWorkspace: reportApi.process,
  getReport: reportApi.getReport,
  getRealizedTrades: reportApi.getRealizedTrades,
  getOpenHoldings: reportApi.getOpenHoldings,
  getAnalytics: reportApi.getAnalytics,
  getExchangeSettings: settingsApi.getExchangeSettings,
  saveExchangeSettings: settingsApi.upsertExchangeSetting,
  getNotes: notesApi.list,
  saveNotes: notesApi.create,
  addManualTrade: manualTradeApi.create,
  exportCsv: exportApi.exportCsv,
  exportPdf: exportApi.exportPdf,
};
