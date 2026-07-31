import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTIONS = [
    { name: "Accueil", href: "#top" },
    { name: "Infos", href: "#infos" },
    { name: "Prédications", href: "#predications" },
    { name: "Départements", href: "#departements" },
    { name: "Responsables", href: "#responsables" },
];

/**
 * Layout dédié aux pages d'extension : navigation propre à l'extension
 * (son nom, ses sections) plutôt que le menu global du site.
 */
export default function ExtensionLayout({ extension, children }) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 flex h-16 items-center justify-between gap-4">
                    <a href="#top" className="flex items-center gap-2.5 min-w-0">
                        <img src={extension.logoUrl} alt="" className="w-8 h-8 object-contain rounded-md bg-white shrink-0" />
                        <span className="font-heading font-bold text-lg text-bordeaux truncate">{extension.name}</span>
                    </a>

                    <nav className="hidden md:flex items-center gap-6">
                        {SECTIONS.map((s) => (
                            <a key={s.href} href={s.href} className="text-sm font-medium text-muted-foreground hover:text-bordeaux transition-colors">
                                {s.name}
                            </a>
                        ))}
                    </nav>

                    <div className="hidden md:block shrink-0">
                        <Button asChild variant="outline" size="sm" className="border-bordeaux text-bordeaux hover:bg-bordeaux/5">
                            <Link to="/">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Retour au site
                            </Link>
                        </Button>
                    </div>

                    <button
                        className="md:hidden flex items-center justify-center p-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {mobileOpen && (
                    <div className="md:hidden border-b bg-background px-4 py-4 space-y-1">
                        {SECTIONS.map((s) => (
                            <a
                                key={s.href}
                                href={s.href}
                                onClick={() => setMobileOpen(false)}
                                className="block py-2 px-3 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted"
                            >
                                {s.name}
                            </a>
                        ))}
                        <Link
                            to="/"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 py-2 px-3 rounded-md text-sm font-medium text-bordeaux"
                        >
                            <ArrowLeft className="w-4 h-4" /> Retour au site
                        </Link>
                    </div>
                )}
            </header>

            <main className="flex-1">{children}</main>

            <footer className="bg-or text-bordeaux py-10">
                <div className="container mx-auto px-4 text-center space-y-2">
                    <div className="font-heading font-bold text-lg">{extension.name}</div>
                    <p className="text-sm text-bordeaux/80">
                        {extension.address}{extension.meetingTime ? ` · ${extension.meetingTime}` : ""}
                    </p>
                    <div className="pt-4 mt-4 border-t border-bordeaux/20 text-xs text-bordeaux/70">
                        &copy; {new Date().getFullYear()} Rehoboth Church International. Tous droits réservés.
                    </div>
                </div>
            </footer>
        </div>
    );
}
