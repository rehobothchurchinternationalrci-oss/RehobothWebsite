import React from "react";
import logo from "@/images/logo.jpeg";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4 py-12 relative overflow-hidden">
      {/* Back to Home Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4.5 py-2 text-sm font-bold text-gray-650 hover:text-bordeaux bg-white/90 hover:bg-white border border-gray-200/60 rounded-xl shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>
      </div>
      {/* Decorative premium background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-or/5 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-bordeaux/5 blur-[120px]" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-1 rounded-2xl bg-card border border-or/40 shadow-md hover:border-or/80 transition-all duration-300 mb-5">
            <img src={logo} alt="Rehoboth Church Logo" className="w-20 h-20 rounded-xl object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2 font-medium">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-xl border border-border/80 p-8 hover:shadow-2xl transition-shadow duration-300">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
