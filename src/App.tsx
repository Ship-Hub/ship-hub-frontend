import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { FeedPage } from './pages/FeedPage';
import { PublishPage } from './pages/PublishPage';
import { MemoryPage } from './pages/MemoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { SavedPage } from './pages/SavedPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { EventsPage } from './pages/EventsPage';
import { GraphPage } from './pages/GraphPage';
import { MemoBankCallbackPage } from './pages/MemoBankCallbackPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { SearchPage } from './pages/SearchPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { BrowsePage } from './pages/BrowsePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { PacksPage } from './pages/PacksPage';
import { PackDetailPage } from './pages/PackDetailPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { ShowcasePage } from './pages/ShowcasePage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { MessagesPage } from './pages/MessagesPage';
import { AdminPage } from './pages/AdminPage';
import { useAuthStore } from './store/auth';
import { Cursor } from './components/Cursor';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <BrowserRouter>
            <Cursor />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth/callback/memobank" element={<MemoBankCallbackPage />} />
              <Route path="/" element={<FeedPage />} />
              <Route path="/memory/:id" element={<MemoryPage />} />
              <Route path="/posts/:id" element={<PostDetailPage />} />
              <Route path="/u/:username" element={<ProfilePage />} />
              <Route path="/u/:username/showcase" element={<ShowcasePage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/new" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/packs" element={<PacksPage />} />
              <Route path="/packs/:id" element={<PackDetailPage />} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/messages/:username" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/graph" element={<GraphPage />} />
              <Route path="/publish" element={<ProtectedRoute><PublishPage /></ProtectedRoute>} />
              <Route path="/saved" element={<ProtectedRoute><SavedPage /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
