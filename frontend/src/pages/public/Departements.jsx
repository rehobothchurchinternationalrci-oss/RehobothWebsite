import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import PublicLayout from "@/components/public/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Clock, MapPin, User, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { iconeDepartement, couleursDepartement } from "@/lib/departementVisuel";

const TYPE_LABELS = {
    cellule: "Cellule", equipe_service: "Équipe de service",
    chorale: "Chorale", jeunesse: "Jeunesse", autre: "Autre"
};

// Nombre de départements affichés avant d'appuyer sur « Voir plus ».
const PAS_AFFICHAGE = 3;

export default function Departements() {
    const [departements, setDepartements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [visibles, setVisibles] = useState(PAS_AFFICHAGE);

    useEffect(() => {
        apiClient.entities.Departement.filter({ actif: true }, "nom")
            .then(setDepartements).finally(() => setLoading(false));
    }, []);

    const affiches = departements.slice(0, visibles);
    const restants = departements.length - affiches.length;

    return (
        <PublicLayout>
            <section className="py-16 px-4 max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-or mb-3">
                        Servir ensemble
                    </span>
                    <h1 className="text-3xl md:text-4xl font-heading font-bold text-bordeaux mb-3">Nos départements</h1>
                    <div className="w-16 h-0.5 bg-or/70 mx-auto mb-4" />
                    <p className="text-gray-500 max-w-xl mx-auto">
                        Découvrez les différents départements et ministères de notre église,
                        et trouvez celui où mettre vos dons au service de l'œuvre.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-bordeaux/30 border-t-bordeaux rounded-full animate-spin" />
                    </div>
                ) : departements.length === 0 ? (
                    <p className="text-center text-gray-400 py-16">Aucun département n'est publié pour le moment.</p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {affiches.map(g => {
                                const Icone = iconeDepartement(g);
                                return (
                                <article
                                    key={g.id}
                                    style={couleursDepartement(g.couleur)}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelected(g)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setSelected(g);
                                        }
                                    }}
                                    className="group relative flex flex-col h-full cursor-pointer overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm
                                               transition-shadow duration-300 hover:shadow-xl
                                               focus:outline-none focus-visible:ring-2 focus-visible:ring-bordeaux focus-visible:ring-offset-2"
                                >
                                    <span className="absolute inset-x-0 top-0 h-1 bg-[var(--dep)]" />

                                    <div className="p-6 flex flex-col h-full">
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-[var(--dep-soft)] flex items-center justify-center">
                                                <Icone className="w-5 h-5 text-[var(--dep)]" />
                                            </div>
                                            <Badge className="bg-[var(--dep-soft)] text-[var(--dep)] border-0 font-medium">
                                                {TYPE_LABELS[g.type] || g.type}
                                            </Badge>
                                        </div>

                                        <h3 className="font-heading font-bold text-lg text-gray-800 mb-2">
                                            {g.nom}
                                        </h3>
                                        {g.description && (
                                            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{g.description}</p>
                                        )}

                                        {(g.responsable_nom || (g.jour_reunion && g.heure_reunion) || g.lieu_reunion) && (
                                            <div className="mt-4 space-y-1.5 text-sm text-gray-500">
                                                {g.responsable_nom && (
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-3.5 h-3.5 text-[var(--dep)] shrink-0" />
                                                        <span className="truncate">{g.responsable_nom}</span>
                                                    </div>
                                                )}
                                                {g.jour_reunion && g.heure_reunion && (
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-3.5 h-3.5 text-[var(--dep)] shrink-0" />
                                                        <span className="truncate">{g.jour_reunion} à {g.heure_reunion}</span>
                                                    </div>
                                                )}
                                                {g.lieu_reunion && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-3.5 h-3.5 text-[var(--dep)] shrink-0" />
                                                        <span className="truncate">{g.lieu_reunion}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-auto pt-5">
                                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--dep)]">
                                                Voir les détails
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </span>
                                        </div>
                                    </div>
                                </article>
                                );
                            })}
                        </div>

                        {departements.length > PAS_AFFICHAGE && (
                            <div className="flex justify-center mt-10">
                                {restants > 0 ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => setVisibles(v => v + PAS_AFFICHAGE)}
                                        className="rounded-full border-bordeaux/30 text-bordeaux hover:bg-bordeaux hover:text-white font-semibold px-6"
                                    >
                                        Voir plus
                                        <span className="ml-1.5 opacity-70">({restants})</span>
                                        <ChevronDown className="w-4 h-4 ml-1.5" />
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={() => setVisibles(PAS_AFFICHAGE)}
                                        className="rounded-full border-bordeaux/30 text-bordeaux hover:bg-bordeaux hover:text-white font-semibold px-6"
                                    >
                                        Voir moins
                                        <ChevronUp className="w-4 h-4 ml-1.5" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* Détails du département */}
            <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
                <DialogContent className="max-w-lg" style={couleursDepartement(selected?.couleur)}>
                    {selected && (
                        <>
                            <DialogHeader>
                                <div className="w-12 h-12 rounded-xl bg-[var(--dep-soft)] flex items-center justify-center mb-2">
                                    {React.createElement(iconeDepartement(selected), { className: "w-6 h-6 text-[var(--dep)]" })}
                                </div>
                                <Badge className="w-fit bg-[var(--dep-soft)] text-[var(--dep)] border-0">{TYPE_LABELS[selected.type] || selected.type}</Badge>
                                <DialogTitle className="text-2xl font-heading text-[var(--dep)]">{selected.nom}</DialogTitle>
                                {selected.description && (
                                    <DialogDescription className="text-gray-600 leading-relaxed">
                                        {selected.description}
                                    </DialogDescription>
                                )}
                            </DialogHeader>

                            <div className="space-y-3 py-2 text-sm">
                                {selected.responsable_nom && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <User className="w-4 h-4 text-[var(--dep)] shrink-0" />
                                        <span>Responsable : <span className="font-semibold">{selected.responsable_nom}</span></span>
                                    </div>
                                )}
                                {selected.jour_reunion && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <Clock className="w-4 h-4 text-[var(--dep)] shrink-0" />
                                        <span>Réunion : <span className="font-semibold">{selected.jour_reunion}</span>{selected.heure_reunion ? ` à ${selected.heure_reunion}` : ""}</span>
                                    </div>
                                )}
                                {selected.lieu_reunion && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <MapPin className="w-4 h-4 text-[var(--dep)] shrink-0" />
                                        <span>Lieu : <span className="font-semibold">{selected.lieu_reunion}</span></span>
                                    </div>
                                )}
                                {!selected.responsable_nom && !selected.jour_reunion && !selected.lieu_reunion && (
                                    <p className="text-gray-400 italic">Les informations pratiques de ce département seront bientôt disponibles.</p>
                                )}
                            </div>

                            <Button asChild className="w-full bg-bordeaux hover:bg-bordeaux/90 text-white font-semibold">
                                <Link to={`/departements/${selected.id}/rejoindre`}>
                                    Rejoindre ce département
                                    <ArrowRight className="w-4 h-4 ml-1.5" />
                                </Link>
                            </Button>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </PublicLayout>
    );
}
