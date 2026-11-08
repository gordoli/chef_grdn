import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SessionProvider, AuthGate } from '@/hooks/SessionProvider';
import { RecipeProvider } from '@/hooks/RecipeProvider';
import { useRecipes } from '@/hooks/useRecipes';
import { Layout } from '@/components/Layout';
import { Home } from '@/pages/Home';
const Gallery = lazy(() =>
  import('@/pages/Gallery').then((module) => ({ default: module.Gallery })),
);
const RecipeDetail = lazy(() =>
  import('@/pages/RecipeDetail').then((module) => ({ default: module.RecipeDetail })),
);
const RecipeEditor = lazy(() =>
  import('@/pages/RecipeEditor').then((module) => ({ default: module.RecipeEditor })),
);
const SignIn = lazy(() => import('@/pages/SignIn').then((module) => ({ default: module.SignIn })));
import { Button } from '@/components/ui/button';
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Recipe book failed to render', error.message, info.componentStack);
  }
  render() {
    return this.state.failed ? (
      <div className="auth-state">
        <h1>Something went off recipe.</h1>
        <p>Reload the page to try again.</p>
        <Button onClick={() => window.location.reload()}>Open the book again</Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function LoadedEditor() {
  const { loading } = useRecipes();
  const { slug } = useParams();
  return loading ? (
    <div className="page-loader">Opening your recipe…</div>
  ) : (
    <RecipeEditor key={slug ?? 'new'} />
  );
}
function AppRoutes() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn />} />
      {['', '/demo'].map((prefix) => (
        <Route
          key={prefix || 'live'}
          element={
            <AuthGate>
              <RecipeProvider>
                <Layout />
              </RecipeProvider>
            </AuthGate>
          }
        >
          <Route path={`${prefix}/`} element={<Home />} />
          <Route path={`${prefix}/favorites`} element={<Home />} />
          <Route path={`${prefix}/gallery`} element={<Gallery />} />
          <Route path={`${prefix}/new`} element={<LoadedEditor />} />
          <Route path={`${prefix}/r/:slug/edit`} element={<LoadedEditor />} />
          <Route
            path={`${prefix}/r/:slug`}
            element={
              <>
                <Home />
                <RecipeDetail />
              </>
            }
          />
        </Route>
      ))}
      <Route
        path="*"
        element={
          <div className="auth-state">
            <h1>A little off the menu.</h1>
            <p>We couldn’t find that page.</p>
            <Button asChild>
              <Link to="/">Back to recipes</Link>
            </Button>
          </div>
        }
      />
    </Routes>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SessionProvider>
          <Suspense fallback={<div className="page-loader">Opening your recipe book…</div>}>
            <AppRoutes />
          </Suspense>
          <Toaster position="bottom-right" richColors closeButton />
        </SessionProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
