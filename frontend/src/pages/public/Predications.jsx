import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import PublicLayout from "@/components/public/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { BookOpen, Play, User, Calendar, FileText, ChevronRight } from "lucide-react";
import moment from "moment";

export default function Predications() {
    const [predications, setPredications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        apiClient.entities.Predication.filter({ publie: true }, "-date")
            .then(setPredications).finally(() => setLoading(false));
    }, []);

    return (
        <PublicLayout>
            <section className="py-16 px-4 max-w-5xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-heading font-bold text-bordeaux mb-2 text-center">Prédications</h1>
                <p className="text-gray-500 text-center mb-12">Retrouvez les messages de notre église</p>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-bordeaux/30 border-t-bordeaux rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {predications.map(p => (
                            <Card
                                key={p.id}
                                onClick={() => setSelected(p)}
                                className="group cursor-pointer hover:shadow-lg transition-shadow"
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-bordeaux/10 flex items-center justify-center shrink-0">
                                            <BookOpen className="w-6 h-6 text-bordeaux" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {p.serie && <Badge className="mb-1 bg-or/20 text-bordeaux border-0 text-xs">{p.serie}</Badge>}
                                            <h3 className="font-bold text-gray-800 mb-1">{p.titre}</h3>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                                                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{p.predicateur}</span>
                                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{moment(p.date).format("D MMM YYYY")}</span>
                                            </div>
                                            {p.resume && <p className="text-sm text-gray-600 line-clamp-2">{p.resume}</p>}
                                            <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-bordeaux">
                                                Lire la prédication
                                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {predications.length === 0 && (
                            <p className="col-span-2 text-center text-gray-400 py-16">Aucune prédication disponible.</p>
                        )}
                    </div>
                )}
            </section>

            {/* Prédication complète */}
            <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    {selected && (
                        <>
                            <DialogHeader>
                                <div className="w-12 h-12 rounded-full bg-bordeaux/10 flex items-center justify-center mb-2">
                                    <BookOpen className="w-6 h-6 text-bordeaux" />
                                </div>
                                {selected.serie && (
                                    <Badge className="w-fit bg-or/20 text-bordeaux border-0 text-xs">{selected.serie}</Badge>
                                )}
                                <DialogTitle className="text-2xl font-heading text-bordeaux">{selected.titre}</DialogTitle>
                                <DialogDescription className="flex flex-wrap items-center gap-3 text-gray-500">
                                    <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{selected.predicateur}</span>
                                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{moment(selected.date).format("D MMMM YYYY")}</span>
                                </DialogDescription>
                            </DialogHeader>

                            {selected.resume ? (
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line py-2">
                                    {selected.resume}
                                </p>
                            ) : (
                                <p className="text-gray-400 italic py-2">Le résumé de cette prédication n'est pas encore disponible.</p>
                            )}

                            {(selected.youtube_url || selected.fichier_url) && (
                                <div className="flex flex-wrap gap-3 pt-2">
                                    {selected.youtube_url && (
                                        <Button asChild className="bg-bordeaux hover:bg-bordeaux/90 text-white font-semibold">
                                            <a href={selected.youtube_url} target="_blank" rel="noreferrer">
                                                <Play className="w-4 h-4 mr-1.5" /> Écouter / Regarder
                                            </a>
                                        </Button>
                                    )}
                                    {selected.fichier_url && (
                                        <Button asChild variant="outline" className="border-bordeaux text-bordeaux hover:bg-bordeaux/5 font-semibold">
                                            <a href={selected.fichier_url} target="_blank" rel="noreferrer">
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
