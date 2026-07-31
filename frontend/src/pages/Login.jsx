import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, ShieldAlert, Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { authService } from "@/services/auth/authService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Password change state
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const login = useAuthStore((state) => state.login);
  const { checkUserAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userProfile = await login(email, password);
      if (userProfile?.must_change_password) {
        setMustChangePassword(true);
        setLoading(false);
        return;
      }
      if (checkUserAuth) {
        await checkUserAuth();
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Identifiants invalides. Veuillez réessayer.");
      setLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setLoading(true);
    try {
      await authService.changePassword(newPassword);
      if (checkUserAuth) {
        await checkUserAuth();
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Échec de la modification du mot de passe. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={mustChangePassword ? "Sécurité" : "Bienvenue"}
      subtitle={
        mustChangePassword
          ? "Pour la sécurité de votre compte, veuillez personnaliser votre mot de passe pour continuer."
          : "Connectez-vous à votre espace Rehoboth"
      }

    >
      {error && (
        <div className="mb-6 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 font-medium flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {mustChangePassword ? (
        <form onSubmit={handlePasswordChangeSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium text-foreground">
              Nouveau mot de passe
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="newPassword"
                type="password"
                placeholder="Nouveau mot de passe (min. 6 caractères)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 h-12 focus-visible:ring-or border-muted-foreground/20 rounded-xl"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              Confirmer le nouveau mot de passe
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirmer le nouveau mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 h-12 focus-visible:ring-or border-muted-foreground/20 rounded-xl"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-bordeaux hover:bg-bordeaux/90 text-white font-semibold rounded-xl shadow-md shadow-bordeaux/20 transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 mt-6"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Mise à jour...
              </>
            ) : (
              "Enregistrer et continuer"
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Adresse Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="votre.nom@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 focus-visible:ring-or border-muted-foreground/20 rounded-xl"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Mot de passe
              </Label>
              <Link to="/forgot-password" className="text-xs text-or hover:text-or/80 font-semibold transition-colors hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 focus-visible:ring-or border-muted-foreground/20 rounded-xl"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-or"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                aria-pressed={showPassword}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-bordeaux hover:bg-bordeaux/90 text-white font-semibold rounded-xl shadow-md shadow-bordeaux/20 transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 mt-6"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              "Se connecter"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
