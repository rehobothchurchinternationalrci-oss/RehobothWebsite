import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import PublicLayout from "@/components/public/PublicLayout";
import ExtensionLayout from "@/components/public/ExtensionLayout";
import { getExtensionBySlug } from "@/data/extensions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
    ArrowLeft, CalendarDays, MapPin, ChevronRight, Mail, Phone,
    BookOpen, Users, User, Calendar, Play, FileText, ArrowRight, Clock,
} from "lucide-react";
import moment from "moment";

const DEPT_TYPE_LABELS = {
    cellule: "Cellule", equipe_service: "Équipe de service",
    chorale: "Chorale", jeunesse: "Jeunesse", autre: "Autre",
};

const HONORIFICS = ["pasteur", "pastor", "past", "frère", "frere", "sœur", "soeur", "révérend", "reverend", "rév", "rev", "dr"];

function getInitials(name) {
    const words = (name || "")
        .split(" ")
        .filter(Boolean)
        .filter((w) => !HONORIFICS.includes(w.toLowerCase().replace(/\.$/, "")));
    return words.map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function LeaderCard({ leader, featured = false }) {
    return (
        <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${featured ? "border-or/60 ring-1 ring-or/30" : "border-gray-100"}`}>
            <div className="p-6 text-center">
                <div className={`mx-auto mb-4 rounded-full bg-bordeaux/10 text-bordeaux flex items-center justify-center font-bold ${featured ? "w-28 h-28 text-3xl" : "w-24 h-24 text-2xl"}`}>
                    {getInitials(leader.name)}
                </div>
                <h3 className={`font-bold text-bordeaux mb-1 ${featured ? "text-xl" : "text-lg"}`}>{leader.name}</h3>
                <p className="text-sm font-semibold text-gray-500 mb-3">{leader.role}</p>
                <p className="text-sm text-gray-600 mb-4">
                    {leader.description}
                </p>
                {(leader.email || leader.phone) && (
                    <div className="pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-500">
                        {leader.email && (
                            <div className="flex items-center justify-center gap-1.5 hover:text-bordeaux transition-colors">
                                <Mail className="w-3.5 h-3.5" />
                                <a href={`mailto:${leader.email}`}>{leader.email}</a>
                            </div>
                        )}
                        {leader.phone && (
                            <div className="flex items-center justify-center gap-1.5 hover:text-bordeaux transition-colors">
                                <Phone className="w-3.5 h-3.5" />
                                <a href={`tel:${leader.phone.replace(/\s+/g, '')}`}>{leader.phone}</a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ExtensionAccueil() {
    const { slug } = useParams();
    const extension = getExtensionBySlug(slug);

    const [predications, setPredications] = useState([]);
    const [departements, setDepartements] = useState([]);
    const [selectedPred, setSelectedPred] = useState(null);
    const [selectedDept, setSelectedDept] = useState(null);

    // Un responsable marqué `featured` est mis en avant seul, au-dessus des autres
    const leaders = extension?.leaders ?? [];
    const featuredLeaders = leaders.filter((l) => l.featured);
    const otherLeaders = leaders.filter((l) => !l.featured);

    useEffect(() => {
        apiClient.entities.Predication.filter({ publie: true }, "-date", 3).then(setPredications).catch(() => {});
        apiClient.entities.Departement.filter({ actif: true }, "nom").then(setDepartements).catch(() => {});
    }, []);

    if (!extension) {
        return (
            <PublicLayout>
                <section className="py-20 px-4 max-w-3xl mx-auto text-center">
                    <h1 className="text-3xl md:text-4xl font-heading font-bold text-bordeaux mb-4">
                        Extension introuvable
                    </h1>
                    <p className="text-gray-600 mb-8">
                        Cette extension n'existe pas encore ou son lien a changé.
                    </p>
                    <Button asChild className="bg-bordeaux hover:bg-bordeaux/90 text-white">
                        <Link to="/#extensions">Voir les extensions</Link>
                    </Button>
                </section>
            </PublicLayout>
        );
    }

    return (
        <ExtensionLayout extension={extension}>
            <section id="top" className="relative overflow-hidden bg-bordeaux text-white scroll-mt-16">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-30"
                    style={{ backgroundImage: `url(${extension.imageUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-bordeaux via-bordeaux/90 to-bordeaux/50" />
                <div className="relative max-w-5xl mx-auto px-4 py-20 md:py-28">
                    <Link to="/#extensions" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-8">
                        <ArrowLeft className="w-4 h-4" />
                        Retour aux extensions
                    </Link>
                    <div className="max-w-3xl">
                        <Badge className="bg-or text-bordeaux border-0 mb-5">{extension.type}</Badge>
                        <div className="flex items-center gap-4 mb-6">
                            <img src={extension.logoUrl} alt="" className="w-14 h-14 rounded-xl object-contain bg-white p-1.5" />
                            <p className="text-white/80 font-medium">{extension.city}</p>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-heading font-bold tracking-tight mb-6">
                            {extension.name}
                        </h1>
                        <p className="text-lg md:text-xl text-white/85 leading-relaxed max-w-2xl">
                            {extension.description}
                        </p>
                    </div>
                </div>
            </section>

            <section id="infos" className="py-16 px-4 bg-cream scroll-mt-16">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                            <MapPin className="w-8 h-8 text-bordeaux mb-4" />
                            <h2 className="font-bold text-bordeaux mb-1">Adresse</h2>
                            <p className="text-sm text-gray-600">{extension.address}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                            <CalendarDays className="w-8 h-8 text-bordeaux mb-4" />
                            <h2 className="font-bold text-bordeaux mb-1">Rencontre</h2>
                            <p className="text-sm text-gray-600">{extension.meetingTime}</p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section className="py-16 px-4 max-w-5xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 items-start">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-heading font-bold text-bordeaux mb-4">
                            Bienvenue à {extension.city}
                        </h2>
                        <p className="text-gray-600 leading-relaxed mb-8">
                            Cette page rassemble les informations principales de l'extension. Elle pourra évoluer avec des annonces, événements, contacts et ressources propres à cette communauté locale.
                        </p>
                        <Button asChild className="bg-bordeaux hover:bg-bordeaux/90 text-white">
                            <Link to="/contact">
                                Contacter l'église
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                        </Button>
                    </div>

                    <Card className="bg-bordeaux text-white border-0 overflow-hidden">
                        <CardContent className="p-6">
                            <h3 className="font-heading font-bold text-xl mb-4">À retrouver</h3>
                            <ul className="space-y-3">
                                {extension.highlights.map((highlight) => (
                                    <li key={highlight} className="flex items-center gap-3 text-sm text-white/85">
                                        <span className="w-2 h-2 rounded-full bg-or shrink-0" />
                                        {highlight}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Prédications */}
            <section id="predications" className="py-16 px-4 bg-white border-t border-gray-100 scroll-mt-16">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
                        <h2 className="text-3xl font-heading font-bold text-bordeaux">Prédications</h2>
                        <Link to="/predications" className="text-bordeaux hover:underline flex items-center gap-1 text-sm shrink-0">
                            Tout voir <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    {predications.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">Aucune prédication disponible pour le moment.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {predications.map(p => (
                                <Card key={p.id} onClick={() => setSelectedPred(p)} className="cursor-pointer hover:shadow-lg transition-shadow">
                                    <CardContent className="p-5">
                                        <div className="w-10 h-10 rounded-full bg-bordeaux/10 flex items-center justify-center mb-3">
                                            <BookOpen className="w-5 h-5 text-bordeaux" />
                                        </div>
                                        {p.serie && <p className="text-xs text-bordeaux font-medium mb-1">{p.serie}</p>}
                                        <h3 className="font-semibold text-gray-800 mb-1">{p.titre}</h3>
                                        <p className="text-sm text-gray-500">{p.predicateur}</p>
                                        <p className="text-xs text-gray-400 mt-1">{moment(p.date).format("D MMMM YYYY")}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Départements */}
            <section id="departements" className="py-16 px-4 bg-cream scroll-mt-16">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
                        <h2 className="text-3xl font-heading font-bold text-bordeaux">Départements</h2>
                        <Link to="/departements" className="text-bordeaux hover:underline flex items-center gap-1 text-sm shrink-0">
                            Tout voir <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    {departements.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">Aucun département disponible pour le moment.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {departements.map(g => (
                                <Card key={g.id} onClick={() => setSelectedDept(g)} className="cursor-pointer bg-white hover:shadow-lg transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="w-10 h-10 rounded-full bg-bordeaux/10 flex items-center justify-center mb-3">
                                            <Users className="w-5 h-5 text-bordeaux" />
                                        </div>
                                        <Badge className="mb-2 bg-bordeaux/10 text-bordeaux border-0">{DEPT_TYPE_LABELS[g.type] || g.type}</Badge>
                                        <h3 className="font-bold text-gray-800 mb-2">{g.nom}</h3>
                                        {g.description && <p className="text-sm text-gray-600 line-clamp-2">{g.description}</p>}
                                        <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-bordeaux">
                                            Voir les détails
                                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Nos Responsables (Team Section) */}
            {extension.leaders && extension.leaders.length > 0 && (
                <section id="responsables" className="py-16 px-4 bg-white border-t border-gray-100 scroll-mt-16">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-3xl font-heading font-bold text-bordeaux mb-4 text-center">Nos Responsables</h2>
                        <p className="text-gray-500 text-center max-w-xl mx-auto mb-12">
                            Découvrez l'équipe dédiée à guider et servir spirituellement la communauté de {extension.name}.
                        </p>

                        {featuredLeaders.length > 0 && (
                            <div className="max-w-sm mx-auto mb-10">
                                {featuredLeaders.map((leader, index) => (
                                    <LeaderCard key={index} leader={leader} featured />
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {otherLeaders.map((leader, index) => (
                                <LeaderCard key={index} leader={leader} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Modale : prédication complète */}
            <Dialog open={!!selectedPred} onOpenChange={(open) => !open && setSelectedPred(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    {selectedPred && (
                        <>
                            <DialogHeader>
                                <div className="w-12 h-12 rounded-full bg-bordeaux/10 flex items-center justify-center mb-2">
                                    <BookOpen className="w-6 h-6 text-bordeaux" />
                                </div>
                                {selectedPred.serie && (
                                    <Badge className="w-fit bg-or/20 text-bordeaux border-0 text-xs">{selectedPred.serie}</Badge>
                                )}
                                <DialogTitle className="text-2xl font-heading text-bordeaux">{selectedPred.titre}</DialogTitle>
                                <DialogDescription className="flex flex-wrap items-center gap-3 text-gray-500">
                                    <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{selectedPred.predicateur}</span>
                                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{moment(selectedPred.date).format("D MMMM YYYY")}</span>
                                </DialogDescription>
                            </DialogHeader>
                            {selectedPred.resume ? (
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line py-2">{selectedPred.resume}</p>
                            ) : (
                                <p className="text-gray-400 italic py-2">Le résumé de cette prédication n'est pas encore disponible.</p>
                            )}
                            {(selectedPred.youtube_url || selectedPred.fichier_url) && (
                                <div className="flex flex-wrap gap-3 pt-2">
                                    {selectedPred.youtube_url && (
                                        <Button asChild className="bg-bordeaux hover:bg-bordeaux/90 text-white font-semibold">
                                            <a href={selectedPred.youtube_url} target="_blank" rel="noreferrer">
                                                <Play className="w-4 h-4 mr-1.5" /> Écouter / Regarder
                                            </a>
                                        </Button>
                                    )}
                                    {selectedPred.fichier_url && (
                                        <Button asChild variant="outline" className="border-bordeaux text-bordeaux hover:bg-bordeaux/5 font-semibold">
                                            <a href={selectedPred.fichier_url} target="_blank" rel="noreferrer">
                                                <FileText className="w-4 h-4 mr-1.5" /> Document
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modale : détails du département */}
            <Dialog open={!!selectedDept} onOpenChange={(open) => !open && setSelectedDept(null)}>
                <DialogContent className="max-w-lg">
                    {selectedDept && (
                        <>
                            <DialogHeader>
                                <div className="w-12 h-12 rounded-full bg-bordeaux/10 flex items-center justify-center mb-2">
                                    <Users className="w-6 h-6 text-bordeaux" />
                                </div>
                                <Badge className="w-fit bg-bordeaux/10 text-bordeaux border-0">{DEPT_TYPE_LABELS[selectedDept.type] || selectedDept.type}</Badge>
                                <DialogTitle className="text-2xl font-heading text-bordeaux">{selectedDept.nom}</DialogTitle>
                                {selectedDept.description && (
                                    <DialogDescription className="text-gray-600 leading-relaxed">{selectedDept.description}</DialogDescription>
                                )}
                            </DialogHeader>
                            <div className="space-y-3 py-2 text-sm">
                                {selectedDept.responsable_nom && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <User className="w-4 h-4 text-bordeaux shrink-0" />
                                        <span>Responsable : <span className="font-semibold">{selectedDept.responsable_nom}</span></span>
                                    </div>
                                )}
                                {selectedDept.jour_reunion && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <Clock className="w-4 h-4 text-bordeaux shrink-0" />
                                        <span>Réunion : <span className="font-semibold">{selectedDept.jour_reunion}</span>{selectedDept.heure_reunion ? ` à ${selectedDept.heure_reunion}` : ""}</span>
                                    </div>
                                )}
                                {selectedDept.lieu_reunion && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <MapPin className="w-4 h-4 text-bordeaux shrink-0" />
                                        <span>Lieu : <span className="font-semibold">{selectedDept.lieu_reunion}</span></span>
                                    </div>
                                )}
                            </div>
                            <Button asChild className="w-full bg-bordeaux hover:bg-bordeaux/90 text-white font-semibold">
                                <Link to={`/departements/${selectedDept.id}/rejoindre`}>
                                    Rejoindre ce département
                                    <ArrowRight className="w-4 h-4 ml-1.5" />
                                </Link>
                            </Button>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </ExtensionLayout>
    );
}
