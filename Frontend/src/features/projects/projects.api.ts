import { api } from '@/lib/api/axios.client';
import type { Project, TestSuite } from '@/types/models';

export interface CreateProjectDto { name: string; baseUrl: string; description?: string }
export interface UpdateProjectDto { name?: string; baseUrl?: string; description?: string }

export const projectsApi = {
  getAll: (archived = false) =>
    api.get<Project[]>('/projects', { params: { archived } }).then((r) => r.data),
  getOne: (id: string) => api.get<Project>(`/projects/${id}`).then((r) => r.data),
  create: (dto: CreateProjectDto) => api.post<Project>('/projects', dto).then((r) => r.data),
  update: (id: string, dto: UpdateProjectDto) =>
    api.patch<Project>(`/projects/${id}`, dto).then((r) => r.data),
  archive: (id: string) => api.delete(`/projects/${id}`),
  getSuites: (projectId: string) =>
    api.get<TestSuite[]>(`/projects/${projectId}/suites`).then((r) => r.data),
  createSuite: (projectId: string, dto: { name: string; description?: string }) =>
    api.post<TestSuite>(`/projects/${projectId}/suites`, dto).then((r) => r.data),
};
