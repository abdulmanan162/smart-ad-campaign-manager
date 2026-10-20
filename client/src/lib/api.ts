import type { Campaign, CampaignInput, DailyPoint, DateRange, MetricsInput, Overview, Platform, Status } from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Surface the first field error from zod's flattened output when present.
    const fieldErrors = body?.details?.fieldErrors as Record<string, string[]> | undefined;
    const first = fieldErrors && Object.values(fieldErrors).flat()[0];
    throw new ApiError(res.status, first || body?.error || `Request failed (${res.status})`, body?.details);
  }
  return body as T;
}

const qs = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
  return s ? `?${s}` : '';
};

export interface CampaignFilters {
  status?: Status | '';
  platform?: Platform | '';
  search?: string;
}

export const api = {
  listCampaigns: (range: DateRange, f: CampaignFilters = {}) =>
    request<{ campaigns: Campaign[] }>(
      `/campaigns${qs({ ...range, status: f.status || undefined, platform: f.platform || undefined, search: f.search || undefined })}`,
    ).then((r) => r.campaigns),

  getCampaign: (id: number, range: DateRange) =>
    request<{ campaign: Campaign; daily: DailyPoint[] }>(`/campaigns/${id}${qs({ ...range })}`),

  createCampaign: (input: CampaignInput) =>
    request<{ id: number }>('/campaigns', { method: 'POST', body: JSON.stringify(input) }),

  updateCampaign: (id: number, input: CampaignInput) =>
    request<{ id: number }>(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(input) }),

  setStatus: (id: number, status: Status) =>
    request<{ id: number }>(`/campaigns/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  deleteCampaign: (id: number) => request<void>(`/campaigns/${id}`, { method: 'DELETE' }),

  recordMetrics: (id: number, input: MetricsInput) =>
    request<{ ok: true }>(`/campaigns/${id}/metrics`, { method: 'PUT', body: JSON.stringify(input) }),

  overview: (range: DateRange, f: Omit<CampaignFilters, 'search'> = {}) =>
    request<Overview>(`/analytics/overview${qs({ ...range, status: f.status || undefined, platform: f.platform || undefined })}`),
};
