import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Users, Calendar, DollarSign, BookOpen, Heart,
    ShieldAlert, FileText
} from "lucide-react";
import moment from "moment";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";
import DepartementWorkspace from "./DepartementWorkspace";
import { ouvrirFichier } from "@/lib/fichiers";
import { avecCivilite } from "@/lib/civilite";

export default function Dashboard() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState({ membres: 0, evenements: 0, dons: 0, predications: 0 });
    const [recentDons, setRecentDons] = useState([]);
    // null tant qu'on ne sait pas ; false si l'API a refusé la lecture des dons.
    const [peutVoirDons, setPeutVoirDons] = useState(false);
    const [prochainEv, setProchainEv] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    const isChef = user?.role === "CHEF_DEPARTEMENT";
    const deptId = user?.managed_departments?.[0]?.id;

    useEffect(() => {
        setLoading(true);
        if (isChef && deptId) {
            Promise.all([
                apiClient.entities.Departement.getMembres(deptId).catch(() => []),
                apiClient.entities.Departement.getReunions(deptId).catch(() => []),
                apiClient.entities.Departement.getDocuments(deptId).catch(() => []),
            ]).then(([membres, reunions, docs]) => {
                setStats({
                    membres: membres.length,
                    evenements: reunions.length,
                    dons: 0,
                    predications: 0
                });
                setProchainEv(reunions);
                setDocuments(docs || []);
            }).catch(console.error)
                .finally(() => setLoading(false));
        } else {
            // L'annuaire et les dons sont désormais réservés à l'encadrement :
            // l'API répond 403 aux autres rôles. On neutralise chaque appel
            // individuellement, sinon un seul refus ferait échouer tout le
            // Promise.all et viderait le tableau de bord.
            Promise.all([
                apiClient.entities.Membre.filter({ statut: "membre_actif" }).catch(() => null),
                apiClient.entities.Evenement.list().catch(() => []),
                apiClient.entities.Don.list("-date", 5).catch(() => null),
                apiClient.entities.Predication.list("-date", 1).catch(() => []),
                apiClient.entities.Evenement.filter({ public: true }, "date_debut", 3).catch(() => []),
            ]).then(([membres, evs, dons, preds, prochains]) => {
                setStats({
                    membres: membres ? membres.length : null,
                    evenements: evs.length,
                    dons: dons ? dons.reduce((s, d) => s + (d.montant || 0), 0) : null,
                    predications: preds.length,
                });
                setRecentDons(dons || []);
                setPeutVoirDons(dons !== null);
                setProchainEv(prochains);
            }).catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isChef, deptId]);

    if (isChef) {
        if (deptId) {
            return <DepartementWorkspace id={deptId} isDashboard={true} />;
        } else {
            return (
                <DashboardLayout>
                    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 px-4 text-center">
                        <ShieldAlert className="w-16 h-16 text-muted-foreground" />
                        <h3 className="text-xl font-bold text-foreground tracking-tight">Aucun département assigné</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                            Vous êtes connecté en tant que Chef de département, mais vous n'avez pas encore été assigné à un département par l'administrateur. Veuillez contacter l'administration de l'église.
                        </p>
                    </div>
                </DashboardLayout>
            );
        }
    }

    const hour = new Date().getHours();
    const greeting = hour < 18 ? "Bonjour" : "Bonsoir";

    const statsCards = isChef ? [
        { label: "Membres actifs du département", value: stats.membres, icon: Users, desc: "Membres dans ce département" },
        { label: "Réunions planifiées", value: stats.evenements, icon: Calendar, desc: "Total des réunions" }
    ] : [
        // Une carte dont la donnée est refusée par l'API (403) est retirée,
        // plutôt qu'affichée à 0 — ce qui laisserait croire à une valeur réelle.
        stats.membres !== null &&
            { label: "Membres actifs", value: stats.membres, icon: Users, desc: "Fidèles enregistrés" },
        { label: "Événements", value: stats.evenements, icon: Calendar, desc: "Planifiés cette année" },
        peutVoirDons &&
            { label: "Dons récents (top 5)", value: `${stats.dons}€`, icon: DollarSign, desc: "Total des dons récents" },
        { label: "Prédications", value: stats.predications, icon: BookOpen, desc: "Médias en ligne" }
    ].filter(Boolean);

    return (
        <DashboardLayout>
            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
                {/* En-tête */}
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        {greeting}, {avecCivilite(user?.genre, user?.prenom) || "Responsable"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {isChef
                            ? `Aperçu des activités de votre département${user?.managed_departments?.[0]?.nom ? ` (${user.managed_departments[0].nom})` : ""}.`
                            : "Aperçu des activités de l'Église Rehoboth International."}
                    </p>
                </div>

                {/* Tuiles de statistiques */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${isChef ? "lg:grid-cols-2" : "lg:grid-cols-4"} gap-4`}>
                    {statsCards.map(s => (
                        <Card key={s.label} className="rounded-xl">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                                    <s.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                                </div>
                                <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                                    {loading ? <span className="block h-8 w-20 rounded bg-muted animate-pulse" /> : s.value}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Deux colonnes détaillées */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Prochains événements / Réunions */}
                    <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                {isChef ? "Prochaines réunions" : "Prochains événements"}
                            </CardTitle>
                            <CardDescription>
                                {isChef ? "Réunions planifiées pour le département." : "Dates clés à retenir pour la communauté."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {prochainEv.length === 0 ? (
                                <div className="text-center py-10">
                                    <Calendar className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                                    <p className="text-sm text-muted-foreground">Aucun événement planifié</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {prochainEv.slice(0, 3).map(ev => {
                                        const dateStr = ev.date_debut || ev.date_reunion;
                                        const eventDate = moment(dateStr);
                                        return (
                                            <div key={ev.id} className="flex items-center gap-4 p-3 border border-border rounded-lg">
                                                <div className="w-12 h-12 rounded-lg bg-muted flex flex-col items-center justify-center text-foreground shrink-0">
                                                    <span className="text-base font-bold leading-none">{eventDate.format("D")}</span>
                                                    <span className="text-[9px] uppercase font-bold tracking-wider mt-0.5 text-muted-foreground">{eventDate.format("MMM")}</span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-sm text-foreground truncate">{ev.titre}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                                        <span>{eventDate.isValid() ? eventDate.format("HH[h]mm") : "—"}</span>
                                                        {ev.lieu && (
                                                            <>
                                                                <span className="text-muted-foreground/40">•</span>
                                                                <span className="truncate">{ev.lieu}</span>
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Documents (chef) ou Dons (admin) */}
                    {isChef ? (
                        <Card className="rounded-xl">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    Documents du département
                                </CardTitle>
                                <CardDescription>Les documents et ressources partagés du département.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {documents.length === 0 ? (
                                    <div className="text-center py-10">
                                        <FileText className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                                        <p className="text-sm text-muted-foreground">Aucun document partagé</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {documents.slice(0, 5).map(doc => (
                                            <div key={doc.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-foreground truncate">{doc.nom}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            Ajouté le {moment(doc.created_at).format("D MMM YYYY")}
                                                        </p>
                                                    </div>
                                                </div>
                                                {doc.fichier_url && (
                                                    <button
                                                        type="button"
                                                        onClick={() => ouvrirFichier(doc.fichier_url)}
                                                        className="text-xs font-semibold text-foreground shrink-0 px-3 py-1 bg-secondary rounded-md border border-border"
                                                    >
                                                        Voir
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : !peutVoirDons ? null : (
                        <Card className="rounded-xl">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Heart className="w-4 h-4 text-muted-foreground" />
                                    Dons récents
                                </CardTitle>
                                <CardDescription>Les dernières offrandes et contributions reçues.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {recentDons.length === 0 ? (
                                    <div className="text-center py-10">
                                        <Heart className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                                        <p className="text-sm text-muted-foreground">Aucune contribution récente</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {recentDons.map(d => (
                                            <div key={d.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-muted text-foreground flex items-center justify-center font-semibold text-xs">
                                                        {d.anonyme ? "A" : (d.membre_nom?.charAt(0) || "—")}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground">
                                                            {d.anonyme ? "Donateur anonyme" : (d.membre_nom || "Donateur")}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {moment(d.date).format("D MMM YYYY")} • {d.type}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant="secondary" className="font-semibold rounded-full">
                                                    +{d.montant}€
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
