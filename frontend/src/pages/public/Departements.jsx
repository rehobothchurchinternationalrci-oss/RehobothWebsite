import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import PublicLayout from "@/components/public/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Users, Clock, MapPin, User, ChevronRight, ArrowRight } from "lucide-react";

const TYPE_LABELS = {
    cellule: "Cellule", equipe_service: "Équipe de service",
    chorale: "Chorale", jeunesse: "Jeunesse", autre: "Autre"
};

export default function Departements() {
    const [departements, setDepartements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        apiClient.entities.Departement.filter({ actif: true }, "nom")
            .then(setDepartements).finally(() => setLoading(false));
    }, []);

    return (
        <PublicLayout>
            <section className="py-16 px-4 max-w-5xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-heading font-bold text-bordeaux mb-2 text-center">Nos départements</h1>
                <p className="text-gray-500 text-center mb-12">Découvrez les différents départements et ministères de notre église</p>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-bordeaux/30 border-t-bordeaux rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {departements.map(g => (
                            <Card
                                key={g.id}
                                onClick={() => setSelected(g)}
                                className="group cursor-pointer hover:shadow-lg transition-shadow"
                            >
                                <CardContent className="p-6">
                                    <div className="w-10 h-10 rounded-full bg-bordeaux/10 flex items-center justify-center mb-3">
                                        <Users className="w-5 h-5 text-bordeaux" />
                                    </div>
                                    <Badge className="mb-2 bg-bordeaux/10 text-bordeaux border-0">{TYPE_LABELS[g.type] || g.type}</Badge>
                                    <h3 className="font-bold text-gray-800 mb-2">{g.nom}</h3>
                                    {g.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{g.description}</p>}
                                    <div className="space-y-1 text-sm text-gray-500">
                                        {g.responsable_nom && <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-bordeaux" />{g.responsable_nom}</div>}
                                        {g.jour_reunion && g.heure_reunion && <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-bordeaux" />{g.jour_reunion} à {g.heure_reunion}</div>}
                                        {g.lieu_reunion && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-bordeaux" />{g.lieu_reunion}</div>}
                                    </div>
                                    <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-bordeaux">
                                        Voir les détails
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {/* Détails du département */}
            <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
                <DialogContent className="max-w-lg">
                    {selected && (
                        <>
                            <DialogHeader>
                                <div className="w-12 h-12 rounded-full bg-bordeaux/10 flex items-center justify-center mb-2">
                                    <Users className="w-6 h-6 text-bordeaux" />
                                </div>
                                <Badge className="w-fit bg-bordeaux/10 text-bordeaux border-0">{TYPE_LABELS[selected.type] || selected.type}</Badge>
                                <DialogTitle className="text-2xl font-heading text-bordeaux">{selected.nom}</DialogTitle>
                                {selected.description && (
                                    <DialogDescription className="text-gray-600 leading-relaxed">
                                        {selected.description}
                                    </DialogDescription>
                                )}
                            </DialogHeader>

                            <div className="space-y-3 py-2 text-sm">
                                {selected.responsable_nom && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <User className="w-4 h-4 text-bordeaux shrink-0" />
                                        <span>Responsable : <span className="font-semibold">{selected.responsable_nom}</span></span>
                                    </div>
                                )}
                                {selected.jour_reunion && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <Clock className="w-4 h-4 text-bordeaux shrink-0" />
                                        <span>Réunion : <span className="font-semibold">{selected.jour_reunion}</span>{selected.heure_reunion ? ` à ${selected.heure_reunion}` : ""}</span>
                                    </div>
                                )}
                                {selected.lieu_reunion && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <MapPin className="w-4 h-4 text-bordeaux shrink-0" />
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
