import { api } from '@/lib/api/axios.client';
import type { Execution, ExecutionResult } from '@/types/models';

export const executionsApi = {
  getAll: () => api.get<Execution[]>('/executions').then((r) => r.data),
  getOne: (id: string) => api.get<Execution>(`/executions/${id}`).then((r) => r.data),
  getResults: (id: string) => api.get<ExecutionResult[]>(`/executions/${id}/results`).then((r) => r.data),
  trigger: (dto: { projectId: string; suiteId?: string }) =>
    api.post<Execution>('/executions', dto).then((r) => r.data),
  cancel: (id: string) => api.delete(`/executions/${id}`),
};
