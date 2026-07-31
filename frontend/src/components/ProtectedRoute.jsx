import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ShieldAlert } from 'lucide-react';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-muted border-t-bordeaux rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ allowedRoles, fallback = <DefaultFallback /> }) {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return fallback;
  }

  if (!isAuthenticated) {
    // Redirect to login but save the current location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if roles are restricted and user's role is allowed
  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 shadow-lg">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 text-or mb-6">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Accès Non Autorisé</h2>
          <p className="text-muted-foreground mb-6">
            Votre compte (Rôle: <span className="font-semibold text-bordeaux">{user?.role || 'MEMBRE'}</span>) n'a pas les permissions requises pour accéder à cette page.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/dashboard"
              className="px-4 py-2 bg-bordeaux text-white rounded-md hover:bg-bordeaux/90 transition-colors font-medium text-sm"
            >
              Retour au Dashboard
            </a>
            <a
              href="/"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors font-medium text-sm"
            >
              Page d'accueil
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
