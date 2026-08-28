import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Send, Clock, SendHorizontal, Users, Loader2, Mail
} from "lucide-react";
import moment from "moment";
import { useAuthStore } from "@/store/authStore";

const EMPTY_FORM = {
    sujet: "",
    contenu: "",
    destinataires_type: "tous_actifs",
    departement_id: ""
};

export default function Communication() {
    const { user } = useAuthStore();
    const [communications, setCommunications] = useState([]);
    const [departements, setDepartements] = useState([]);
    const [membres, setMembres] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);

    const isChef = user?.role === "CHEF_DEPARTEMENT";
    const deptId = user?.managed_departments?.[0]?.id;
    const deptNom = user?.managed_departments?.[0]?.nom;

    useEffect(() => {
        setLoading(true);
        if (isChef && deptId) {
            Promise.all([
                apiClient.entities.Communication.list("-created_at"),
                apiClient.entities.Departement.getMembres(deptId).catch(() => []),
            ]).then(([comms, mbs]) => {
                // Filter communications sent for this specific department
                const filteredComms = comms.filter(c => c.departement_id === deptId);
                setCommunications(filteredComms);
                setMembres(mbs);
                setForm(prev => ({
                    ...prev,
                    destinataires_type: "departement",
                    departement_id: deptId
                }));
            }).catch(console.error).finally(() => setLoading(false));
        } else {
            Promise.all([
                apiClient.entities.Communication.list("-created_at"),
                apiClient.entities.Departement.filter({ actif: true }, "nom"),
                apiClient.entities.Membre.filter({ statut: "membre_actif" }),
            ]).then(([comms, depts, mbs]) => {
                setCommunications(comms);
                setDepartements(depts);
                setMembres(mbs);
            }).catch(console.error).finally(() => setLoading(false));
        }
    }, [isChef, deptId]);

    const handleSend = async () => {
        if (!form.sujet || !form.contenu) return;
        setSending(true);

        try {
            let destinataires = membres;
            let departementNom = deptNom || "";

            if (!isChef && form.destinataires_type === "departement" && form.departement_id) {
                const membreDepartements = await apiClient.entities.MembreDepartement.filter({ departement_id: form.departement_id });
                const ids = new Set(membreDepartements.map(mg => mg.membre_id));
                destinataires = membres.filter(m => ids.has(m.id));
                const d = departements.find(d => d.id === form.departement_id);
                departementNom = d?.nom || "";
            }

            const emailsValides = destinataires.filter(m => m.email);

            for (const m of emailsValides) {
                await apiClient.integrations.Core.SendEmail({
                    to: m.email,
                    subject: form.sujet,
                    body: form.contenu,
                });
            }

            await apiClient.entities.Communication.create({
                sujet: form.sujet,
                contenu: form.contenu,
                destinataires_type: form.destinataires_type,
                departement_id: form.departement_id || undefined,
                departement_nom: departementNom || undefined,
                nb_destinataires: emailsValides.length,
                envoye_at: new Date().toISOString(),
                statut: "envoye",
            });

            // Reset form (keeping department attributes pre-selected if chef)
            setForm(() => ({
                ...EMPTY_FORM,
                destinataires_type: isChef ? "departement" : "tous_actifs",
                departement_id: isChef ? deptId : ""
            }));

            const comms = await apiClient.entities.Communication.list("-created_at");
            const filteredComms = isChef ? comms.filter(c => c.departement_id === deptId) : comms;
            setCommunications(filteredComms);
            alert("Communication diffusée avec succès !");
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'envoi de la communication");
        } finally {
            setSending(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
                {/* En-tête */}
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        {isChef ? `Communication — ${deptNom || "Département"}` : "Communication"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {isChef
                            ? `Diffusez des e-mails d'information groupés aux membres actifs du département ${deptNom}.`
                            : "Envoyez des e-mails groupés à tous les fidèles actifs ou à un département spécifique."}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Composer Card */}
                    <Card className="lg:col-span-7 rounded-xl h-fit">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <SendHorizontal className="w-5 h-5 text-bordeaux" />
                                Composer une annonce
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-500">Rédigez et diffusez votre courrier.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-5">
                                {isChef ? (
                                    <div className="p-4 bg-bordeaux/5 rounded-xl border border-bordeaux/10">
                                        <p className="text-xs font-bold uppercase tracking-wider text-bordeaux">Groupe cible des destinataires</p>
                                        <p className="text-sm font-extrabold text-gray-900 mt-1">
                                            Membres actifs du département {deptNom} ({membres.length} membres)
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Groupe cible des destinataires</Label>
                                            <Select value={form.destinataires_type} onValueChange={v => setForm({ ...form, destinataires_type: v, departement_id: "" })}>
                                                <SelectTrigger className="rounded-xl border-gray-200 h-11 bg-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="tous_actifs" className="rounded-lg">Tous les membres actifs ({membres.length})</SelectItem>
                                                    <SelectItem value="departement" className="rounded-lg">Un département spécifique</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {form.destinataires_type === "departement" && (
                                            <div className="space-y-1.5 In">
                                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Choisir le département</Label>
                                                <Select value={form.departement_id} onValueChange={v => setForm({ ...form, departement_id: v })}>
                                                    <SelectTrigger className="rounded-xl border-gray-200 h-11 bg-white">
                                                        <SelectValue placeholder="Sélectionner le département cible..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        {departements.map(d => (
                                                            <SelectItem key={d.id} value={d.id} className="rounded-lg">{d.nom}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Objet du mail (Sujet) *</Label>
                                    <Input
                                        placeholder="Saisissez l'objet du message..."
                                        className="rounded-xl border-gray-200 h-11 focus:border-bordeaux focus:ring-bordeaux/20"
                                        value={form.sujet}
                                        onChange={e => setForm({ ...form, sujet: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Message (Contenu) *</Label>
                                    <Textarea
                                        placeholder="Rédigez votre message ici..."
                                        rows={6}
                                        className="rounded-xl border-gray-200 focus:border-bordeaux focus:ring-bordeaux/20"
                                        value={form.contenu}
                                        onChange={e => setForm({ ...form, contenu: e.target.value })}
                                    />
                                </div>

                                <Button
                                    onClick={handleSend}
                                    disabled={sending || !form.sujet || !form.contenu || (form.destinataires_type === "departement" && !form.departement_id)}
                                    className="w-full bg-gradient-to-r from-bordeaux to-bordeaux-dark text-white font-bold h-12 rounded-xl shadow-md flex items-center justify-center gap-2"
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin text-white" />
                                            Envoi des e-mails en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4.5 h-4.5" />
                                            Diffuser la communication
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* History Column */}
                    <div className="lg:col-span-5 space-y-5">
                        <div className="flex items-center gap-2 text-gray-900 font-heading font-black text-lg">
                            <Clock className="w-5 h-5 text-bordeaux" />
                            Historique des envois
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-3">
                                <Loader2 className="w-8 h-8 animate-spin text-bordeaux" />
                                <p className="text-xs text-gray-400">Chargement de l'historique...</p>
                            </div>
                        ) : communications.length === 0 ? (
                            <div className="text-center py-16 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
                                <Mail className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-sm text-gray-400 font-medium">Aucun message envoyé pour le moment.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                                {communications.map(c => (
                                    <Card key={c.id} className="border border-gray-150 bg-white rounded-xl shadow-sm">
                                        <CardContent className="p-4 space-y-2">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h4 className="font-extrabold text-sm text-gray-950 truncate">{c.sujet}</h4>
                                                    <span className="text-[10px] text-gray-450 block font-medium mt-0.5">
                                                        {moment(c.envoye_at || c.created_at).format("D MMM YYYY [à] HH:mm")}
                                                    </span>
                                                </div>
                                                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] uppercase font-extrabold py-0.5 px-2 rounded-full shrink-0">
                                                    {c.statut === "envoye" ? "Envoyé" : c.statut}
                                                </Badge>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100/60 text-[11px] text-gray-600 font-medium">
                                                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-bordeaux/60" />{c.nb_destinataires} destinataires</span>
                                                {c.departement_nom && (
                                                    <Badge variant="outline" className="text-bordeaux border-bordeaux/15 text-[9px] font-bold rounded-full py-0">
                                                        {c.departement_nom}
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}