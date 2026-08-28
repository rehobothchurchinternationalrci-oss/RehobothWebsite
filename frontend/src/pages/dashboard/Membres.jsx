import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GENRES } from "@/lib/civilite";
import { 
    Plus, Search, Edit, Trash2, User, Shield, Mail, 
    Phone, MapPin
} from "lucide-react";

const STATUT_COLORS = {
    membre_actif: "bg-primary text-primary-foreground border-transparent",
    membre_inactif: "bg-muted text-muted-foreground border border-border",
    visiteur: "bg-secondary text-secondary-foreground border border-border"
};
const STATUT_LABELS = { 
    membre_actif: "Membre Actif", 
    membre_inactif: "Inactif", 
    visiteur: "Visiteur" 
};

const EMPTY = { 
    prenom: "", 
    nom: "", 
    email: "", 
    telephone: "", 
    adresse: "", 
    quartier: "", 
    date_naissance: "",
    genre: "",
    statut: "visiteur",
    date_adhesion: "", 
    notes: "" 
};

export default function Membres() {
    const [membres, setMembres] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        apiClient.entities.Membre.list("-created_at")
            .then(setMembres)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const openCreate = () => { 
        setEditing(null); 
        setForm(EMPTY); 
        setDialogOpen(true); 
    };
    
    const openEdit = (m) => { 
        setEditing(m); 
        setForm({ ...m }); 
        setDialogOpen(true); 
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // genre n'accepte que 'M', 'F' ou NULL (contrainte chk_membres_genre) :
            // une chaîne vide serait rejetée par la base.
            const payload = { ...form, genre: form.genre || null };
            if (editing) {
                await apiClient.entities.Membre.update(editing.id, payload);
            } else {
                await apiClient.entities.Membre.create(payload);
            }
            setDialogOpen(false);
            load();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'enregistrement");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Supprimer définitivement ce membre de la base de données ?")) return;
        try {
            await apiClient.entities.Membre.delete(id);
            load();
        } catch (err) {
            console.error(err);
            alert("Impossible de supprimer le membre");
        }
    };

    const filtered = membres.filter(m =>
        `${m.prenom} ${m.nom} ${m.email || ""} ${m.quartier || ""}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
                {/* En-tête */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                            Membres
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Supervisez l'annuaire des fidèles, gérez les statuts d'adhésion et éditez les profils.
                        </p>
                    </div>
                    <Button onClick={openCreate} className="shrink-0">
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter un fidèle
                    </Button>
                </div>

                {/* Recherche */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        className="pl-10 h-11 rounded-lg"
                        placeholder="Rechercher par prénom, nom, email, quartier..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Liste */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-10 h-10 border-2 border-muted border-t-foreground rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">Chargement de l'annuaire…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200 p-8 shadow-sm">
                        <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="font-heading text-lg font-bold text-gray-800">Aucun fidèle trouvé</h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1 mb-6">
                            Ajustez votre recherche ou ajoutez un nouveau membre à la base de données.
                        </p>
                        <Button onClick={openCreate} className="bg-bordeaux hover:bg-bordeaux/90 rounded-xl">
                            <Plus className="w-4 h-4 mr-2" /> Créer une fiche membre
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(m => (
                            <Card key={m.id} className="overflow-hidden rounded-2xl border border-gray-150 bg-white group flex flex-col justify-between">
                                <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
                                    <div className="space-y-4">
                                        {/* Header area */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-full bg-bordeaux/15 text-bordeaux flex items-center justify-center font-bold overflow-hidden shadow-inner border border-bordeaux/5 shrink-0">
                                                    {m.photo_url ? (
                                                        <img src={m.photo_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        m.prenom.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-heading text-base font-extrabold text-gray-900 truncate leading-snug">
                                                        {m.prenom} {m.nom}
                                                    </h3>
                                                    <span className="text-[10px] text-gray-400 font-light block">ID: {m.id.substring(0, 8)}...</span>
                                                </div>
                                            </div>
                                            <Badge className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border-0 ${STATUT_COLORS[m.statut] || STATUT_COLORS.visiteur}`}>
                                                {STATUT_LABELS[m.statut] || "Visiteur"}
                                            </Badge>
                                        </div>

                                        {/* Contact detail fields */}
                                        <div className="space-y-2 text-xs text-gray-600 border-t pt-4 border-gray-100/60">
                                            {m.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-3.5 h-3.5 text-bordeaux/60" />
                                                    <span className="truncate">{m.email}</span>
                                                </div>
                                            )}
                                            {m.telephone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-3.5 h-3.5 text-bordeaux/60" />
                                                    <span>{m.telephone}</span>
                                                </div>
                                            )}
                                            {m.quartier && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-bordeaux/60" />
                                                    <span>Quartier : {m.quartier}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-2 pt-2">
                                        <Button 
                                            variant="outline" 
                                            className="flex-1 h-9 rounded-xl text-xs font-semibold border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-1.5"
                                            onClick={() => openEdit(m)}
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                            Modifier le profil
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className="h-9 w-9 rounded-xl border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-600 flex items-center justify-center shrink-0"
                                            onClick={() => handleDelete(m.id)}
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

            {/* Dialog Form with Premium Styling */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg rounded-2xl overflow-hidden p-0 border-0 shadow-2xl max-h-[90vh] flex flex-col justify-between">
                    <div className="bg-gradient-to-r from-bordeaux to-bordeaux-dark p-6 text-white shrink-0">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-heading font-black tracking-tight text-white flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                {editing ? "Modifier la fiche membre" : "Ajouter un nouveau membre"}
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-white/80 text-xs mt-1.5 font-light leading-relaxed">
                            Renseignez les données personnelles et le statut d'intégration de ce fidèle.
                        </p>
                    </div>

                    <div className="space-y-4 p-6 bg-white overflow-y-auto flex-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Prénom *</Label>
                                <Input 
                                    placeholder="Ex: Jean" 
                                    className="rounded-xl border-gray-200 focus:border-bordeaux focus:ring-bordeaux/20 h-11"
                                    value={form.prenom} 
                                    onChange={e => setForm({ ...form, prenom: e.target.value })} 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nom *</Label>
                                <Input 
                                    placeholder="Ex: Dupont" 
                                    className="rounded-xl border-gray-200 focus:border-bordeaux focus:ring-bordeaux/20 h-11"
                                    value={form.nom} 
                                    onChange={e => setForm({ ...form, nom: e.target.value })} 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Email</Label>
                                <Input 
                                    type="email" 
                                    placeholder="jean.dupont@email.com" 
                                    className="rounded-xl border-gray-200 h-11"
                                    value={form.email} 
                                    onChange={e => setForm({ ...form, email: e.target.value })} 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Téléphone</Label>
                                <Input 
                                    placeholder="+33 6 12 34 56 78" 
                                    className="rounded-xl border-gray-200 h-11"
                                    value={form.telephone} 
                                    onChange={e => setForm({ ...form, telephone: e.target.value })} 
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Adresse domicile</Label>
                            <Input 
                                placeholder="Numéro, rue, appartement..." 
                                className="rounded-xl border-gray-200 h-11"
                                value={form.adresse} 
                                onChange={e => setForm({ ...form, adresse: e.target.value })} 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Quartier</Label>
                                <Input 
                                    placeholder="Ex: Centre-ville" 
                                    className="rounded-xl border-gray-200 h-11"
                                    value={form.quartier} 
                                    onChange={e => setForm({ ...form, quartier: e.target.value })} 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date de naissance</Label>
                                <Input
                                    type="date"
                                    className="rounded-xl border-gray-200 h-11"
                                    value={form.date_naissance}
                                    onChange={e => setForm({ ...form, date_naissance: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Appellation</Label>
                                <Select
                                    value={form.genre || "non_renseigne"}
                                    onValueChange={v => setForm({ ...form, genre: v === "non_renseigne" ? "" : v })}
                                >
                                    <SelectTrigger className="rounded-xl border-gray-200 h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="non_renseigne">Non renseignée</SelectItem>
                                        {GENRES.map(g => (
                                            <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Statut communautaire</Label>
                                <Select value={form.statut} onValueChange={v => setForm({ ...form, statut: v })}>
                                    <SelectTrigger className="rounded-xl border-gray-200 h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="visiteur">Visiteur</SelectItem>
                                        <SelectItem value="membre_actif">Membre actif</SelectItem>
                                        <SelectItem value="membre_inactif">Membre inactif</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date d'adhésion</Label>
                                <Input 
                                    type="date" 
                                    className="rounded-xl border-gray-200 h-11"
                                    value={form.date_adhesion} 
                                    onChange={e => setForm({ ...form, date_adhesion: e.target.value })} 
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Notes & Remarques (Confidentialité Pasteur/Admin)</Label>
                            <Textarea 
                                placeholder="Informations complémentaires, historique..." 
                                rows={2} 
                                className="rounded-xl border-gray-200"
                                value={form.notes} 
                                onChange={e => setForm({ ...form, notes: e.target.value })} 
                            />
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-150 shrink-0">
                        <Button 
                            onClick={handleSave} 
                            disabled={saving || !form.prenom || !form.nom} 
                            className="w-full bg-gradient-to-r from-bordeaux to-bordeaux-dark text-white font-bold h-12 rounded-xl shadow-md"
                        >
                            {saving ? "Enregistrement en cours..." : "Enregistrer la fiche membre"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}