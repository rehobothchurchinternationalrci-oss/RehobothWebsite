import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
    Plus, Edit, Trash2, Calendar, MapPin, Clock, Sparkles, 
    Globe, Bookmark, Info, CalendarPlus, Loader2
} from "lucide-react";
import moment from "moment";

const TYPE_LABELS = { 
    culte: "Culte", 
    cellule: "Cellule", 
    conference: "Conférence", 
    jeunesse: "Jeunesse", 
    concert: "Concert", 
    formation: "Formation", 
    autre: "Autre" 
};

const BADGE_NEUTRAL = "bg-secondary text-secondary-foreground border border-border";
const TYPE_COLORS = {
    culte: BADGE_NEUTRAL,
    cellule: BADGE_NEUTRAL,
    conference: BADGE_NEUTRAL,
    jeunesse: BADGE_NEUTRAL,
    concert: BADGE_NEUTRAL,
    formation: BADGE_NEUTRAL,
    autre: BADGE_NEUTRAL
};

const EMPTY = { 
    titre: "", 
    description: "", 
    date_debut: "", 
    date_fin: "", 
    lieu: "", 
    type: "culte", 
    public: true 
};

export default function Evenements() {
    const [evenements, setEvenements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        apiClient.entities.Evenement.list("date_debut")
            .then(setEvenements)
            .catch(console.error)
            .finally(() => setLoading(false));
    };
    
    useEffect(load, []);

    const openCreate = () => { 
        setEditing(null); 
        setForm(EMPTY); 
        setDialogOpen(true); 
    };
    
    const openEdit = (e) => { 
        setEditing(e); 
        setForm({ ...e }); 
        setDialogOpen(true); 
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editing) {
                await apiClient.entities.Evenement.update(editing.id, form);
            } else {
                await apiClient.entities.Evenement.create(form);
            }
            setDialogOpen(false);
            load();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la sauvegarde");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Supprimer définitivement cet événement ?")) return;
        try {
            await apiClient.entities.Evenement.delete(id);
            load();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la suppression");
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
                {/* En-tête */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                            Événements
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Planifiez les cultes, veillées de prière, formations et réunions de départements.
                        </p>
                    </div>
                    <Button onClick={openCreate} className="shrink-0">
                        <Plus className="w-4 h-4 mr-2" />
                        Créer un événement
                    </Button>
                </div>

                {/* Liste */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-10 h-10 border-2 border-muted border-t-foreground rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">Chargement du calendrier…</p>
                    </div>
                ) : evenements.length === 0 ? (
                    <Card className="rounded-xl border-dashed">
                        <CardContent className="text-center py-20">
                        <Calendar className="w-14 h-14 mx-auto text-muted-foreground/40 mb-4" />
                        <h3 className="text-lg font-semibold text-foreground">Aucun événement enregistré</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
                            Commencez à planifier les célébrations et les rencontres régulières de l'église.
                        </p>
                        <Button onClick={openCreate}>
                            <Plus className="w-4 h-4 mr-2" /> Planifier le premier événement
                        </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {evenements.map(ev => (
                            <Card key={ev.id} className="rounded-xl">
                                <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                                    <div className="flex items-start md:items-center gap-4 min-w-0">
                                        {/* Date Badge */}
                                        <div className="w-14 h-14 rounded-xl bg-muted text-foreground flex flex-col items-center justify-center shrink-0">
                                            <span className="text-xl font-bold leading-none">{moment(ev.date_debut).format("D")}</span>
                                            <span className="text-[10px] uppercase font-bold tracking-wider mt-0.5 text-muted-foreground">{moment(ev.date_debut).format("MMM")}</span>
                                        </div>

                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-bold text-base text-foreground leading-snug">{ev.titre}</h3>
                                                <Badge className={`text-[10px] uppercase font-bold py-0.5 px-2 rounded-full border-0 ${TYPE_COLORS[ev.type] || TYPE_COLORS.culte}`}>
                                                    {TYPE_LABELS[ev.type] || "Culte"}
                                                </Badge>
                                                {ev.public && (
                                                    <Badge variant="secondary" className="text-[10px] uppercase font-bold py-0.5 px-2 rounded-full">
                                                        Visible Public
                                                    </Badge>
                                                )}
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                                                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-bordeaux/60" />{moment(ev.date_debut).format("HH[h]mm")}</span>
                                                {ev.lieu && (
                                                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-bordeaux/60" />{ev.lieu}</span>
                                                )}
                                            </div>
                                            {ev.description && (
                                                <p className="text-xs text-gray-450 font-light truncate max-w-xl">{ev.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2.5 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 shrink-0">
                                        <Button 
                                            variant="outline" 
                                            className="flex-1 md:flex-none h-9 px-4 rounded-xl text-xs font-bold border-gray-250 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-1.5"
                                            onClick={() => openEdit(ev)}
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                            Modifier
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className="h-9 w-9 rounded-xl border-gray-250 hover:bg-red-50 text-gray-400 hover:text-red-650 flex items-center justify-center shrink-0"
                                            onClick={() => handleDelete(ev.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Dialog Form */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg rounded-2xl overflow-hidden p-0 border-0 shadow-2xl max-h-[90vh] flex flex-col justify-between">
                    <div className="bg-gradient-to-r from-bordeaux to-bordeaux-dark p-6 text-white shrink-0">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-heading font-black tracking-tight text-white flex items-center gap-2">
                                <CalendarPlus className="w-5 h-5" />
                                {editing ? "Modifier l'événement" : "Planifier un événement"}
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-white/80 text-xs mt-1.5 font-light">Définissez les détails et les horaires de la rencontre.</p>
                    </div>

                    <div className="space-y-4 p-6 bg-white overflow-y-auto flex-1">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Titre de l'événement *</Label>
                            <Input 
                                placeholder="Ex: Culte de louange et d'adoration" 
                                className="rounded-xl border-gray-200 h-11 focus:border-bordeaux focus:ring-bordeaux/20"
                                value={form.titre} 
                                onChange={e => setForm({ ...form, titre: e.target.value })} 
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Type de rencontre</Label>
                            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                                <SelectTrigger className="rounded-xl border-gray-200 h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                                        <SelectItem key={v} value={v} className="rounded-lg">{l}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Description ou Ordre du jour</Label>
                            <Textarea 
                                placeholder="Détails du programme, orateurs invités, consignes particulières..." 
                                rows={2} 
                                className="rounded-xl border-gray-200"
                                value={form.description} 
                                onChange={e => setForm({ ...form, description: e.target.value })} 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date & heure début *</Label>
                                <Input 
                                    type="datetime-local" 
                                    className="rounded-xl border-gray-200 h-11"
                                    value={form.date_debut} 
                                    onChange={e => setForm({ ...form, date_debut: e.target.value })} 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date & heure fin</Label>
                                <Input 
                                    type="datetime-local" 
                                    className="rounded-xl border-gray-200 h-11"
                                    value={form.date_fin} 
                                    onChange={e => setForm({ ...form, date_fin: e.target.value })} 
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Lieu (Adresse physique ou lien Zoom)</Label>
                            <Input 
                                placeholder="Ex: Temple principal ou En ligne" 
                                className="rounded-xl border-gray-200 h-11"
                                value={form.lieu} 
                                onChange={e => setForm({ ...form, lieu: e.target.value })} 
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">URL de l'affiche / Bannière (Optionnel)</Label>
                            <Input 
                                placeholder="https://serveur.com/image.jpg" 
                                className="rounded-xl border-gray-200 h-11"
                                value={form.image_url || ""} 
                                onChange={e => setForm({ ...form, image_url: e.target.value })} 
                            />
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-150">
                            <Switch checked={form.public} onCheckedChange={v => setForm({ ...form, public: v })} />
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 cursor-pointer select-none">
                                <Globe className="w-4 h-4 text-emerald-500" />
                                Afficher sur l'agenda public du site
                            </Label>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-150 shrink-0">
                        <Button 
                            onClick={handleSave} 
                            disabled={saving || !form.titre || !form.date_debut} 
                            className="w-full bg-gradient-to-r from-bordeaux to-bordeaux-dark text-white font-bold h-12 rounded-xl shadow-md"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Planification...
                                </>
                            ) : (
                                "Confirmer la planification"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}