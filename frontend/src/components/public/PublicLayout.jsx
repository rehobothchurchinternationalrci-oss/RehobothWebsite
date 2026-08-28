import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, User, LogOut, Facebook, Youtube, Instagram, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParametres } from "@/hooks/useParametres";
import LogoEglise from "@/components/LogoEglise";

// Icône associée à chaque réseau renseigné dans /dashboard/parametres.
const ICONES_RESEAUX = {
    facebook: Facebook,
    youtube: Youtube,
    instagram: Instagram,
    site_web: Globe,
};

export default function PublicLayout({ children, showNav = true }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { isAuthenticated, user, logout } = useAuth();
    const location = useLocation();
    const { parametres, adresseComplete, reseaux } = useParametres();

    const navLinks = [
        { name: "Accueil", path: "/" },
        { name: "À Propos", path: "/a-propos" },
        { name: "Prédications", path: "/predications" },
        { name: "Départements", path: "/departements" },
        { name: "Contact", path: "/contact" },
    ];

    const isActive = (path) => {
        if (path.includes("#")) {
            const [pathname, hash] = path.split("#");
            return location.pathname === pathname && location.hash === `#${hash}`;
        }
        return location.pathname === path;
    };

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 flex h-16 items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 font-heading font-bold text-xl text-bordeaux">
                        <LogoEglise className="w-8 h-8 object-contain rounded-md" />
                        <span>{parametres.nom}</span>
                    </Link>

                    {/* Desktop Nav */}
                    {showNav && (
                        <nav className="hidden md:flex items-center gap-6">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`text-sm font-medium transition-colors hover:text-bordeaux ${isActive(link.path) ? "text-bordeaux font-semibold" : "text-muted-foreground"
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </nav>
                    )}

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        {isAuthenticated ? (
                            <div className="flex items-center gap-3">
                                <Link to="/dashboard">
                                    <Button variant="outline" size="sm" className="border-bordeaux text-bordeaux hover:bg-bordeaux/5">
                                        <User className="w-4 h-4 mr-2" />
                                        Dashboard
                                    </Button>
                                </Link>
                                <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive">
                                    <LogOut className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <Link to="/login">
                                <Button size="sm" className="bg-bordeaux hover:bg-bordeaux/90 text-white">
                                    Connexion
                                </Button>
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden flex items-center justify-center p-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-b bg-background px-4 py-4 space-y-3">
                        {showNav && (
                            <>
                                <nav className="flex flex-col gap-2">
                                    {navLinks.map((link) => (
                                        <Link
                                            key={link.path}
                                            to={link.path}
                                            className={`text-sm font-medium py-2 px-3 rounded-md transition-colors hover:bg-muted ${isActive(link.path) ? "text-bordeaux bg-bordeaux/5 font-semibold" : "text-muted-foreground"
                                                }`}
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            {link.name}
                                        </Link>
                                    ))}
                                </nav>
                                <hr className="my-2" />
                            </>
                        )}
                        <div className="flex flex-col gap-2 pt-2">
                            {isAuthenticated ? (
                                <>
                                    <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                                        <Button className="w-full bg-bordeaux hover:bg-bordeaux/90 text-white">
                                            Dashboard
                                        </Button>
                                    </Link>
                                    <Button variant="outline" className="w-full" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                                        Déconnexion
                                    </Button>
                                </>
                            ) : (
                                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                                    <Button className="w-full bg-bordeaux hover:bg-bordeaux/90 text-white">
                                        Connexion
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-or text-bordeaux py-12">
                <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                        <Link to="/" className="flex items-center gap-2 font-heading font-bold text-lg text-bordeaux">
                            <LogoEglise className="w-7 h-7 object-contain rounded-md" />
                            <span>{parametres.nom}</span>
                        </Link>
                        <p className="text-sm text-bordeaux/80 max-w-xs">
                            {parametres.description ||
                                "Une église internationale engagée à partager l'amour de Dieu et à faire grandir les disciples."}
                        </p>
                        {reseaux.length > 0 && (
                            <div className="flex items-center gap-3 pt-1">
                                {reseaux.map(({ cle, label, url }) => {
                                    const Icone = ICONES_RESEAUX[cle];
                                    return (
                                        <a
                                            key={cle}
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            aria-label={label}
                                            title={label}
                                            className="text-bordeaux/70 hover:text-bordeaux transition-colors"
                                        >
                                            <Icone className="w-5 h-5" />
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm mb-3">Liens Rapides</h3>
                        <nav className="flex flex-col gap-2 text-sm text-bordeaux/80">
                            <Link to="/a-propos" className="hover:text-bordeaux hover:underline transition-colors">À Propos</Link>
                            <Link to="/evenements" className="hover:text-bordeaux hover:underline transition-colors">Événements</Link>
                            <Link to="/predications" className="hover:text-bordeaux hover:underline transition-colors">Prédications</Link>
                        </nav>
                    </div>
                    <div>
                        <h3 className="font-bold text-sm mb-3">Contact &amp; Cultes</h3>
                        <div className="text-sm text-bordeaux/80 space-y-1">
                            {parametres.horaires && <p>{parametres.horaires}</p>}
                            {adresseComplete && <p>{adresseComplete}</p>}
                            {parametres.telephone && (
                                <p>
                                    <a href={`tel:${parametres.telephone.replace(/\s+/g, "")}`} className="hover:underline">
                                        {parametres.telephone}
                                    </a>
                                </p>
                            )}
                            {parametres.email_contact && (
                                <p>
                                    <a href={`mailto:${parametres.email_contact}`} className="hover:underline">
                                        {parametres.email_contact}
                                    </a>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="container mx-auto px-4 mt-8 pt-6 border-t border-bordeaux/20 text-center text-xs text-bordeaux/70">
                    &copy; {new Date().getFullYear()} {parametres.nom}. Tous droits réservés.
                </div>
            </footer>
        </div>
    );
}
