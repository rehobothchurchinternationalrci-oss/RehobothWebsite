import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Users, Save, CalendarClock, Loader2 } from "lucide-react";
import moment from "moment";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";

export default function Presences() {
    const { user } = useAuthStore();
    const [evenements, setEvenements] = useState([]);
    const [membres, setMembres] = useState([]);
    const [selectedEv, setSelectedEv] = useState("");
    const [attendanceMap, setAttendanceMap] = useState({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const isChef = user?.role === "CHEF_DEPARTEMENT";
    const deptId = user?.managed_departments?.[0]?.id;

    useEffect(() => {
        setLoading(true);
        if (isChef && deptId) {
            Promise.all([
                apiClient.entities.Departement.getReunions(deptId).catch(() => []),
                apiClient.entities.Departement.getMembres(deptId).catch(() => []),
            ]).then(([reunions, mbs]) => {
                // Map reunions to look like evenements
                const mappedEvs = reunions.map(r => ({
                    id: r.id,
                    titre: r.titre,
                    date_debut: r.date_reunion
                }));
                setEvenements(mappedEvs);
                setMembres(mbs);
            }).catch(console.error).finally(() => setLoading(false));
        } else {
            Promise.all([
                apiClient.entities.Evenement.list("date_debut"),
                apiClient.entities.Membre.filter({ statut: "membre_actif" }, "nom"),
            ]).then(([evs, mbs]) => {
                setEvenements(evs);
                setMembres(mbs);
            }).catch(console.error).finally(() => setLoading(false));
        }
    }, [isChef, deptId]);

    const loadPresences = async (evId) => {
        try {
            if (isChef && deptId) {
                const ps = await apiClient.entities.Departement.getReunionPresences(deptId, evId);
                const map = {};
                ps.forEach(p => {
                    map[p.membre_id] = {
                        id: p.membre_id,
                        membre_id: p.membre_id,
                        present: p.statut === "PRESENT",
                        note: p.note
                    };
                });
                setAttendanceMap(map);
            } else {
                const ps = await apiClient.entities.Presence.filter({ evenement_id: evId });
                const map = {};
                ps.forEach(p => { map[p.membre_id] = p; });
                setAttendanceMap(map);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleEvChange = (evId) => {
        setSelectedEv(evId);
        loadPresences(evId);
    };

    const toggle = (membreId) => {
        setAttendanceMap(prev => {
            const curr = prev[membreId];
            return { ...prev, [membreId]: curr ? { ...curr, present: !curr.present } : { present: true, _new: true } };
        });
    };

    const handleSave = async () => {
        if (!selectedEv) return;
        setSaving(true);
        try {
            if (isChef && deptId) {
                const presencesList = membres.map(m => {
                    const entry = attendanceMap[m.id];
                    const present = entry?.present || false;
                    return {
                        membre_id: m.id,
                        statut: present ? "PRESENT" : "ABSENT",
                        note: entry?.note || ""
                    };
                });
                await apiClient.entities.Departement.saveReunionPresences(deptId, selectedEv, presencesList);
            } else {
                const ev = evenements.find(e => e.id === selectedEv);
                for (const m of membres) {
                    const entry = attendanceMap[m.id];
                    const present = entry?.present || false;
                    if (entry?.id && !entry._new) {
                        await apiClient.entities.Presence.update(entry.id, { present });
                    } else {
                        await apiClient.entities.Presence.create({
                            membre_id: m.id,
                            membre_nom: `${m.prenom} ${m.nom}`,
                            evenement_id: selectedEv,
                            evenement_titre: ev?.titre || "",
                            evenement_date: ev?.date_debut || "",
                            present,
                        });
                    }
                }
            }
            await loadPresences(selectedEv);
            alert("Présences enregistrées avec succès !");
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la sauvegarde");
        } finally {
            setSaving(false);
        }
    };

    const presentCount = Object.values(attendanceMap).filter(p => p.present).length;

    return (
        <DashboardLayout>
            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
                {/* En-tête */}
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        {isChef ? "Présences du département" : "Présences"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {isChef
                            ? "Sélectionnez une réunion de votre département pour enregistrer les présences."
                            : "Sélectionnez un culte ou un événement pour faire l'appel et enregistrer la participation."}
                    </p>
                </div>

                {/* Sélecteur d'événement */}
                <Card className="rounded-xl">
                    <CardContent className="p-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                {isChef ? "Sélectionner une réunion" : "Sélectionner un événement"}
                            </Label>
                            <Select value={selectedEv} onValueChange={handleEvChange} disabled={loading}>
                                <SelectTrigger className="max-w-md h-11 rounded-lg">
                                    <SelectValue placeholder={isChef ? "Choisir une réunion..." : "Choisir un événement..."} />
                                </SelectTrigger>
                                <SelectContent className="max-h-60 rounded-xl">
                                    {evenements.length === 0 ? (
                                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                                            {isChef
                                                ? "Aucune réunion enregistrée pour votre département."
                                                : "Aucun événement enregistré. Créez-en un depuis la page Événements."}
                                        </div>
                                    ) : evenements.map(ev => (
                                        <SelectItem key={ev.id} value={ev.id} className="rounded-lg">
                                            {ev.titre} — {moment(ev.date_debut).format("D MMM YYYY")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 className="w-10 h-10 animate-spin text-bordeaux" />
                        <p className="text-sm text-gray-500 animate-pulse">Chargement des présences...</p>
                    </div>
                ) : selectedEv ? (
                    <div className="space-y-6">
                        {/* Summary Info Row */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 border border-gray-150 rounded-2xl shadow-sm">
                            <div className="space-y-1">
                                <h3 className="font-heading font-extrabold text-base text-gray-900">Appel en cours</h3>
                                <div className="flex flex-wrap gap-2 pt-0.5">
                                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-xs py-1 px-3 rounded-full">
                                        <Users className="w-3.5 h-3.5 mr-1" />
                                        {presentCount} / {membres.length} Présents
                                    </Badge>
                                    <Badge className="bg-red-50 text-red-700 border border-red-100 font-bold text-xs py-1 px-3 rounded-full">
                                        {membres.length - presentCount} Absents
                                    </Badge>
                                </div>
                            </div>
                            <Button 
                                onClick={handleSave} 
                                disabled={saving} 
                                className="bg-gradient-to-r from-bordeaux to-bordeaux-dark text-white font-bold h-11 px-5 rounded-xl shadow-md flex items-center gap-1.5"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sauvegarde...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4.5 h-4.5" />
                                        Enregistrer les présences
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Members Check List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {membres.map(m => {
                                const present = attendanceMap[m.id]?.present || false;
                                return (
                                    <div 
                                        key={m.id} 
                                        onClick={() => toggle(m.id)}
                                        className={`flex items-center justify-between p-4.5 rounded-2xl border cursor-pointer select-none ${ present ? "bg-emerald-50/50 border-emerald-250 shadow-sm" : "bg-white border-gray-150 " }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-inner border shrink-0 ${ present ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200" }`}>
                                                {m.prenom.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-extrabold text-sm text-gray-900">{m.prenom} {m.nom}</span>
                                        </div>
                                        <Switch 
                                            checked={present} 
                                            onCheckedChange={() => toggle(m.id)} 
                                            onClick={(e) => e.stopPropagation()} 
                                            className="data-[state=checked]:bg-emerald-600"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    /* Initial State Empty Placeholder */
                    <div className="text-center py-20 bg-white border border-gray-150 rounded-2xl p-8 shadow-sm">
                        <CalendarClock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h4 className="font-heading text-lg font-bold text-gray-800">Aucun appel en cours</h4>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
                            Veuillez sélectionner un événement dans le panneau supérieur pour charger la liste d'appel des membres actifs.
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}