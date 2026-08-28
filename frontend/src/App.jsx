import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';

// Pages chargées à la demande (code-splitting) : chaque page devient son
// propre chunk, le visiteur du site public ne télécharge pas le dashboard.
const PageNotFound = lazy(() => import('./pages/PageNotFound'));

// Public pages
const Accueil = lazy(() => import('./pages/public/Accueil'));
const APropos = lazy(() => import('./pages/public/APropos'));
const Evenements = lazy(() => import('./pages/public/Evenements'));
const Predications = lazy(() => import('./pages/public/Predications'));
const Departements = lazy(() => import('./pages/public/Departements'));
const Contact = lazy(() => import('./pages/public/Contacts'));
const RejoindreDepartement = lazy(() => import('./pages/public/RejoindreDepartement'));

// Dashboard pages
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Membres = lazy(() => import('./pages/dashboard/Membres'));
const DepartementsDash = lazy(() => import('./pages/dashboard/Departements'));
const EvenementsDash = lazy(() => import('./pages/dashboard/Evenements'));
const Presences = lazy(() => import('./pages/dashboard/Presences'));
const Dons = lazy(() => import('./pages/dashboard/Dons'));
const PredicationsDash = lazy(() => import('./pages/dashboard/Predications'));
const Communication = lazy(() => import('./pages/dashboard/Communication'));
const Parametres = lazy(() => import('./pages/dashboard/Parametres'));
const DepartementWorkspace = lazy(() => import('./pages/dashboard/DepartementWorkspace'));

// Auth pages
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

const FullScreenSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-muted border-t-bordeaux rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, navigateToLogin } = useAuth();

  if (isLoadingAuth) {
    return <FullScreenSpinner />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Site public */}
      <Route path="/" element={<Accueil />} />
      <Route path="/a-propos" element={<APropos />} />
      <Route path="/evenements" element={<Evenements />} />
      <Route path="/predications" element={<Predications />} />
      <Route path="/departements" element={<Departements />} />
      <Route path="/departements/:id/rejoindre" element={<RejoindreDepartement />} />
      <Route path="/contact" element={<Contact />} />

      {/* Dashboard - All Authenticated Users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>

      {/* Dashboard - Admin & pastoral roles */}
      <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PASTEUR', 'SECRETAIRE']} />}>
        <Route path="/dashboard/membres" element={<Membres />} />
        <Route path="/dashboard/dons" element={<Dons />} />
      </Route>

      {/* Dashboard - Departments & presence management */}
      <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PASTEUR', 'SECRETAIRE', 'CHEF_DEPARTEMENT']} />}>
        <Route path="/dashboard/departements" element={<DepartementsDash />} />
        <Route path="/dashboard/departements/:id/workspace" element={<DepartementWorkspace />} />
        <Route path="/dashboard/presences" element={<Presences />} />
        <Route path="/dashboard/communication" element={<Communication />} />
      </Route>

      {/* Dashboard - Events */}
      <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PASTEUR', 'SECRETAIRE', 'EQUIPE_MEDIA', 'CHEF_DEPARTEMENT']} />}>
        <Route path="/dashboard/evenements" element={<EvenementsDash />} />
      </Route>

      {/* Dashboard - Sermons / Media */}
      <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PASTEUR', 'EQUIPE_MEDIA']} />}>
        <Route path="/dashboard/predications" element={<PredicationsDash />} />
      </Route>

      {/* Dashboard - Settings */}
      <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PASTEUR']} />}>
        <Route path="/dashboard/parametres" element={<Parametres />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
