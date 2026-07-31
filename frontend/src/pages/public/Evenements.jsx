import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import PublicLayout from "@/components/public/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock } from "lucide-react";
import moment from "moment";

const TYPE_LABELS = {
    culte: "Culte", cellule: "Cellule", conference: "Conférence",
    jeunesse: "Jeunesse", concert: "Concert", formation: "Formation", autre: "Autre"
};

export default function Evenements() {
    const [evenements, setEvenements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.entities.Evenement.filter({ public: true }, "date_debut")
            .then(setEvenements).finally(() => setLoading(false));
    }, []);

    return (
        <PublicLayout>
            <section className="py-16 px-4 max-w-5xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-heading font-bold text-bordeaux mb-2 text-center">Événements</h1>
                <p className="text-gray-500 text-center mb-12">Rejoignez-nous pour nos prochaines rencontres</p>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-bordeaux/30 border-t-bordeaux rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {evenements.map(ev => (
                            <Card key={ev.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                {ev.image_url && <img src={ev.image_url} alt={ev.titre} className="w-full h-44 object-cover" />}
                                <CardContent className="p-5">
                                    <Badge className="mb-2 bg-bordeaux/10 text-bordeaux border-0 capitalize">{TYPE_LABELS[ev.type] || ev.type}</Badge>
                                    <h3 className="font-bold text-gray-800 mb-3">{ev.titre}</h3>
                                    {ev.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ev.description}</p>}
                                    <div className="space-y-1 text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-bordeaux" />
                                            {moment(ev.date_debut).format("dddd D MMMM YYYY")}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-bordeaux" />
                                            {moment(ev.date_debut).format("HH[h]mm")}
                                            {ev.date_fin && ` – ${moment(ev.date_fin).format("HH[h]mm")}`}
                                        </div>
                                        {ev.lieu && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-bordeaux" />
                                                {ev.lieu}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {evenements.length === 0 && (
                            <p className="col-span-3 text-center text-gray-400 py-16">Aucun événement à venir pour le moment.</p>
                        )}
                    </div>
                )}
            </section>
        </PublicLayout>
    );
}