export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  PROJECTS: '/projects',
  PROJECT_DETAIL: (id: string) => `/projects/${id}`,
  TESTS: (suiteId: string) => `/suites/${suiteId}/tests`,
  TEST_DETAIL: (id: string) => `/tests/${id}`,
  FLOW_EDITOR: (testId: string) => `/tests/${testId}/editor`,
  RECORDER: '/recorder',
  EXECUTIONS: '/executions',
  EXECUTION_DETAIL: (id: string) => `/executions/${id}`,
  REPORT: (executionId: string) => `/reports/${executionId}`,
  SETTINGS: '/settings',
} as const;
