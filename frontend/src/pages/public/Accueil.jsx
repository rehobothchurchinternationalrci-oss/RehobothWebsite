import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, BookOpen, Heart, MapPin, Clock, ChevronRight, Building2, User, Play, FileText } from "lucide-react";
import PublicLayout from "@/components/public/PublicLayout";
import moment from "moment";
import backgroundImage from "@/images/image.png";
import { extensions } from "@/data/extensions";

function ExtensionCard({ extension }) {
    return (
        <Link to={`/extensions/${extension.slug}`} className="group block h-full">
            <Card className="h-full overflow-hidden border-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="relative h-40 overflow-hidden bg-cream">
                    <img
                        src={extension.imageUrl}
                        alt={extension.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bordeaux/70 to-transparent" />
                    <img
                        src={extension.logoUrl}
                        alt=""
                        className="absolute bottom-4 left-4 w-12 h-12 rounded-xl bg-white object-contain p-1.5 shadow-sm"
                    />
                </div>
                <CardContent className="p-5">
                    <Badge className="mb-3 bg-bordeaux/10 text-bordeaux border-0">{extension.type}</Badge>
                    <h3 className="font-heading font-bold text-lg text-or mb-2">{extension.name}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">{extension.description}</p>
                    <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="inline-flex items-center gap-1.5 text-gray-500">
                            <MapPin className="w-4 h-4 text-bordeaux" />
                            {extension.city}
                        </span>
                        <span className="inline-flex items-center gap-1 text-bordeaux font-medium">
                            Découvrir
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export default function Accueil() {
    const [evenements, setEvenements] = useState([]);
    const [predications, setPredications] = useState([]);
    const [parametres, setParametres] = useState(null);
    const [selectedPred, setSelectedPred] = useState(null);

    useEffect(() => {
        apiClient.entities.Evenement.filter({ public: true }, "date_debut", 3).then(setEvenements);
        apiClient.entities.Predication.filter({ publie: true }, "-date", 3).then(setPredications);
        apiClient.entities.EgliseParametres.list().then(p => p.length && setParametres(p[0]));
    }, []);

    return (
        <PublicLayout showNav={false}>
            {/* Hero */}
            <section className="relative bg-gradient-to-br from-bordeaux via-bordeaux-dark to-or/20 text-white py-24 sm:py-32 lg:py-48 px-4 sm:px-6 text-center overflow-hidden">
                <div
                    className="absolute inset-0 opacity-50 bg-cover bg-center"
                    style={{ backgroundImage: `url(${backgroundImage})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-bordeaux/30 via-transparent to-or/25 pointer-events-none" />
                <div className="relative max-w-5xl mx-auto">
                    <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-heading font-bold mb-6 sm:mb-10 lg:mb-12 tracking-tight">
                        {parametres?.nom || "Rehoboth Church International"}
                    </h1>
                    <p className="text-lg sm:text-2xl md:text-3xl lg:text-4xl text-white/90 mb-10 sm:mb-14 lg:mb-16 max-w-4xl mx-auto leading-relaxed font-light">
                        Une communauté fondée sur l'amour, la foi et la grâce de Dieu
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
                        <Button asChild size="lg" className="w-full sm:w-auto bg-or text-bordeaux hover:bg-or/90 font-semibold h-12 sm:h-16 px-8 sm:px-10 text-base sm:text-lg rounded-xl shadow-lg hover:shadow-or/20 hover:-translate-y-0.5 transition-all duration-200">
                            <Link to="/evenements">Nos événements</Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white/10 h-12 sm:h-16 px-8 sm:px-10 text-base sm:text-lg rounded-xl hover:-translate-y-0.5 transition-all duration-200">
                            <Link to="/a-propos">Nous découvrir</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Infos pratiques */}
            <section className="bg-cream py-12 px-4">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-start gap-4">
                        <Clock className="w-8 h-8 text-bordeaux mt-1 shrink-0" />
                        <div>
                            <h3 className="font-semibold text-or mb-1">Cultes</h3>
                            <p className="text-gray-600 text-sm">{parametres?.horaires || "Lundi 18h30 (intercession) · Jeudi 18h30 (enseignement) · Dimanche 11h00 (culte dominical)"}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <MapPin className="w-8 h-8 text-bordeaux mt-1 shrink-0" />
                        <div>
                            <h3 className="font-semibold text-or mb-1">Adresse</h3>
                            <p className="text-gray-600 text-sm">{parametres?.adresse ? `${parametres.adresse}, ${parametres.ville || "Paris"}` : "12 Rue de la Paix, Paris 1er"}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <Heart className="w-8 h-8 text-bordeaux mt-1 shrink-0" />
                        <div>
                            <h3 className="font-semibold text-or mb-1">Bienvenue</h3>
                            <p className="text-gray-600 text-sm">Venez tel que vous êtes. Vous êtes les bienvenus !</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Extensions */}
            <section id="extensions" className="py-16 px-4 max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                    <div>
                        <div className="inline-flex items-center gap-2 text-bordeaux font-semibold text-sm mb-3">
                            <Building2 className="w-4 h-4" />
                            Extensions
                        </div>
                        <h2 className="text-2xl md:text-3xl font-heading font-bold text-bordeaux">
                            Nos extensions locales
                        </h2>
                        <p className="text-gray-600 mt-2 max-w-2xl">
                            Découvrez les communautés Rehoboth proches de vous et accédez à leur page dédiée.
                        </p>
                    </div>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full md:w-auto border-bordeaux text-bordeaux hover:bg-bordeaux/5">
                                Voir toutes les extensions
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-heading text-bordeaux">Extensions Rehoboth</DialogTitle>
                                <DialogDescription>
                                    Sélectionnez une extension pour ouvrir sa page d'accueil dédiée.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                                {extensions.map((extension) => (
                                    <ExtensionCard key={extension.slug} extension={extension} />
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {extensions.slice(0, 3).map((extension) => (
                        <ExtensionCard key={extension.slug} extension={extension} />
                    ))}
                </div>
            </section>

            {/* Prochains événements */}
            <section className="py-16 px-4 max-w-5xl mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
                    <h2 className="text-2xl md:text-3xl font-heading font-bold text-bordeaux">Prochains événements</h2>
                    <Link to="/evenements" className="text-bordeaux hover:underline flex items-center gap-1 text-sm shrink-0">
                        Tout voir <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {evenements.map(ev => (
                        <Card key={ev.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                            {ev.image_url && <img src={ev.image_url} alt={ev.titre} className="w-full h-40 object-cover" />}
                            <CardContent className="p-4">
                                <Badge className="mb-2 bg-bordeaux/10 text-bordeaux border-0">{ev.type}</Badge>
                                <h3 className="font-semibold text-gray-800 mb-1">{ev.titre}</h3>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {moment(ev.date_debut).format("dddd D MMMM YYYY")}
                                </p>
                                {ev.lieu && <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" />{ev.lieu}</p>}
                            </CardContent>
                        </Card>
                    ))}
                    {evenements.length === 0 && (
                        <p className="text-gray-400 col-span-full text-center py-8">Aucun événement à venir</p>
                    )}
                </div>
            </section>

            {/* Prédications récentes */}
            <section className="py-16 px-4 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
                        <h2 className="text-2xl md:text-3xl font-heading font-bold text-bordeaux">Prédications récentes</h2>
                        <Link to="/predications" className="text-bordeaux hover:underline flex items-center gap-1 text-sm shrink-0">
                            Tout voir <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {predications.map(p => (
                            <Card
                                key={p.id}
                                onClick={() => setSelectedPred(p)}
                                className="cursor-pointer hover:shadow-lg transition-shadow"
                            >
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
                </div>
            </section>

            {/* Prédication complète */}
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
        </PublicLayout>
    );
}
