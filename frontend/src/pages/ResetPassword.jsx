import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "@/services/auth/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";

/**
 * Supabase returns the recovery outcome in the URL FRAGMENT, never in the
 * query string — which is why `useSearchParams().get("token")` always came
 * back null and every valid link was rejected as invalid.
 *
 *   success: #access_token=...&refresh_token=...&type=recovery
 *   failure: #error=access_denied&error_code=otp_expired&error_description=...
 *
 * The fragment never reaches the server, so it has to be read client-side.
 */
function readRecoveryFragment() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    accessToken: params.get("access_token"),
    errorCode: params.get("error_code"),
    errorDescription: params.get("error_description"),
  };
}

export default function ResetPassword() {
  // Read once, before the effect below wipes the fragment.
  const [recovery] = useState(readRecoveryFragment);
  const resetToken = recovery.accessToken;

  // A recovery JWT in the address bar ends up in browsing history and in the
  // Referer of any outbound request. Strip it as soon as it has been read.
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(resetToken, newPassword);
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title={recovery.errorCode === "otp_expired" ? "Link expired" : "Invalid reset link"}
        subtitle={
          recovery.errorCode === "otp_expired"
            ? "This password reset link is no longer valid"
            : "This password reset link is missing or invalid"
        }
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            Request a new link
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          {recovery.errorCode === "otp_expired"
            ? "Reset links can only be used once, and expire after a short while. Request a new one — and open it in the same browser, without forwarding the email."
            : "The link you used appears to be incomplete. Please request a new password reset email."}
        </p>
        {recovery.errorDescription && (
          <p className="mt-3 text-xs text-muted-foreground text-center">
            {recovery.errorDescription}
          </p>
        )}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title="New password"
      subtitle="Enter your new password below"
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
