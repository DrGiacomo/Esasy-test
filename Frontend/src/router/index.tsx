import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { ROUTES } from './routes';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const ProjectsListPage = lazy(() => import('@/features/projects/pages/ProjectsListPage'));
const ProjectDetailPage = lazy(() => import('@/features/projects/pages/ProjectDetailPage'));
const TestsListPage = lazy(() => import('@/features/tests/pages/TestsListPage'));
const TestDetailPage = lazy(() => import('@/features/tests/pages/TestDetailPage'));
const FlowEditorPage = lazy(() => import('@/features/flow-editor/pages/FlowEditorPage'));
const RecorderPage = lazy(() => import('@/features/recorder/pages/RecorderPage'));
const RecordingsPage = lazy(() => import('@/features/recorder/pages/RecordingsPage'));
const ExecutionsListPage = lazy(() => import('@/features/executions/pages/ExecutionsListPage'));
const ExecutionDetailPage = lazy(() => import('@/features/executions/pages/ExecutionDetailPage'));
const ReportViewerPage = lazy(() => import('@/features/reports/pages/ReportViewerPage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));

const Fallback = () => (
  <div className="flex h-screen items-center justify-center">
    <LoadingSpinner />
  </div>
);

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          {/* Public */}
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />

          {/* Protected — wrapped by AppShell */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to={ROUTES.PROJECTS} replace />} />
              <Route path={ROUTES.PROJECTS} element={<ProjectsListPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="/suites/:suiteId/tests" element={<TestsListPage />} />
              <Route path="/tests/:testId" element={<TestDetailPage />} />
              <Route path="/tests/:testId/editor" element={<FlowEditorPage />} />
              <Route path={ROUTES.RECORDER} element={<RecorderPage />} />
              <Route
                path={ROUTES.RECORDINGS}
                element={
                  <div className="p-6 max-w-4xl mx-auto">
                    <RecordingsPage />
                  </div>
                }
              />
              <Route path={ROUTES.EXECUTIONS} element={<ExecutionsListPage />} />
              <Route path="/executions/:executionId" element={<ExecutionDetailPage />} />
              <Route path="/reports/:executionId" element={<ReportViewerPage />} />
              <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to={ROUTES.PROJECTS} replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
