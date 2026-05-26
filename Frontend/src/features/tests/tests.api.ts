import { api } from '@/lib/api/axios.client';
import type { Test, TestStep, TestVersion } from '@/types/models';

export const testsApi = {
  getBySuite: (suiteId: string) =>
    api.get<Test[]>(`/suites/${suiteId}/tests`).then((r) => r.data),
  getOne: (id: string) =>
    api.get<Test & { steps: TestStep[] }>(`/tests/${id}`).then((r) => r.data),
  create: (suiteId: string, dto: { name: string; description?: string }) =>
    api.post<Test>(`/suites/${suiteId}/tests`, dto).then((r) => r.data),
  update: (id: string, dto: Partial<{ name: string; description: string; status: string }>) =>
    api.patch<Test>(`/tests/${id}`, dto).then((r) => r.data),
  archive: (id: string) => api.delete(`/tests/${id}`),
  getVersions: (id: string) =>
    api.get<TestVersion[]>(`/tests/${id}/versions`).then((r) => r.data),
  createStep: (testId: string, dto: { action: string; selector?: string; value?: string; description?: string; order: number }) =>
    api.post<TestStep>(`/tests/${testId}/steps`, dto).then((r) => r.data),
  updateStep: (testId: string, stepId: string, dto: Partial<TestStep>) =>
    api.patch<TestStep>(`/tests/${testId}/steps/${stepId}`, dto).then((r) => r.data),
  deleteStep: (testId: string, stepId: string) =>
    api.delete(`/tests/${testId}/steps/${stepId}`),
  reorderSteps: (testId: string, order: { stepId: string; order: number }[]) =>
    api.put(`/tests/${testId}/steps/reorder`, { steps: order }),
};
