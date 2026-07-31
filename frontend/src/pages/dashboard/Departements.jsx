import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import { useAuthStore } from "@/store/authStore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Plus, Edit, Trash2, Users2, MapPin, ArrowRight,
    Bookmark, Info, CalendarClock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS = {
    cellule: "Cellule de prière",
    equipe_service: "Équipe de service",
    chorale: "Chorale & Louange",
    jeunesse: "Jeunesse",
    autre: "Autre département"
};

const EMPTY = {
    nom: "",
    description: "",
    type: "cellule",
    responsable_nom: "",
    jour_reunion: "",
    heure_reunion: "",
    lieu_reunion: "",
    actif: true,
    chef_prenom: "",
    chef_nom: "",
    chef_email: ""
};

export default function Departements() {
    const { user } = useAuthStore();
    const isAdmin = ["SUPER_ADMIN", "PASTEUR", "SECRETAIRE"].includes(user?.role);
    const isChef = user?.role === "CHEF_DEPARTEMENT";

    const [departements, setDepartements] = useState([]);
    const [membres, setMembres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [selectedChefId, setSelectedChefId] = useState("");
    const [createNewChef, setCreateNewChef] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        apiClient.entities.Departement.list("nom")
            .then(data => {
                if (isChef && user?.managed_departments) {
                    const managedIds = user.managed_departments.map(d => d.id);
                    setDepartements(data.filter(d => managedIds.includes(d.id)));
                } else {
                    setDepartements(data);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));

        if (isAdmin) {
            apiClient.entities.Membre.list("nom")
                .then(setMembres)
                .catch(console.error);
        }
    };

    useEffect(load, [user]);

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY);
        setSelectedChefId("");
        setCreateNewChef(false);
        setDialogOpen(true);
    };

    const openEdit = async (g) => {
        setEditing(g);
        setForm({ ...g });
        setSelectedChefId("");
        setCreateNewChef(false);
        setDialogOpen(true);

        try {
            const deptMembres = await apiClient.entities.Departement.getMembres(g.id);
            const chef = deptMembres.find(m => m.est_chef);
            if (chef) {
                setSelectedChefId(chef.id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            let deptId = editing?.id;
            if (editing) {
                await apiClient.entities.Departement.update(editing.id, form);
            } else {
                const savePayload = { ...form };
                if (!createNewChef) {
                    delete savePayload.chef_prenom;
                    delete savePayload.chef_nom;
                    delete savePayload.chef_email;
                }
                const newDept = await apiClient.entities.Departement.create(savePayload);
                deptId = newDept.id;
            }

            if (deptId && !createNewChef && selectedChefId && selectedChefId !== "none") {
                await apiClient.entities.Departement.setChef(deptId, selectedChefId);
            }

            setDialogOpen(false);
            load();
        } catch (err) {
            console.error(err);
            // Afficher le message du serveur : « ce membre n'a pas d'email »
            // est autrement invisible, il faut aller lire les logs backend.
            alert(err?.message || "Erreur lors de l'enregistrement");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Supprimer ce département ?")) return;
        try {
            await apiClient.entities.Departement.delete(id);
            load();
        } catch (err) {
            console.error(err);
            alert("Impossible de supprimer le département");
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
                {/* En-tête */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                            Départements
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isAdmin
                                ? "Supervisez les ministères, chorales, départements et cellules de l'église."
                                : "Accédez à votre espace de travail départemental pour gérer vos membres."}
                        </p>
                    </div>
                    {isAdmin && (
                        <Button onClick={openCreate} className="shrink-0">
                            <Plus className="w-4 h-4 mr-2" />
                            Ajouter un département
                        </Button>
                    )}
                </div>

                {/* Contenu */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-10 h-10 border-2 border-muted border-t-foreground rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">Chargement des départements…</p>
                    </div>
                ) : departements.length === 0 ? (
                    <Card className="rounded-xl border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                            <Users2 className="w-14 h-14 text-muted-foreground/40 mb-4" />
                            <h3 className="text-lg font-semibold text-foreground">Aucun département disponible</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
                                Créez des départements ou des cellules pour structurer les activités de l'église.
                            </p>
                            {isAdmin && (
                                <Button onClick={openCreate}>
                                    <Plus className="w-4 h-4 mr-2" /> Créer le premier département
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {departements.map(g => {
                            const typeKey = g.type || "autre";
                            return (
                                <Card key={g.id} className={`rounded-xl flex flex-col ${!g.actif ? "opacity-60" : ""}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <Badge variant="secondary" className="rounded-full font-medium">
                                                {TYPE_LABELS[typeKey]}
                                            </Badge>
                                            <Badge variant={g.actif ? "secondary" : "outline"} className="rounded-full text-[10px] uppercase font-bold">
                                                {g.actif ? "Actif" : "Inactif"}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-lg mt-3">{g.nom}</CardTitle>
                                        <CardDescription className="line-clamp-2">
                                            {g.description || "Aucune description fournie."}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="flex-1 flex flex-col justify-between gap-6">
                                        <div className="space-y-2.5 text-xs text-muted-foreground border-t border-border pt-4">
                                            {g.responsable_nom && (
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-5 h-5 rounded-full bg-muted text-foreground flex items-center justify-center font-semibold text-[10px] shrink-0">
                                                        {g.responsable_nom.charAt(0)}
                                                    </div>
                                                    <span>Responsable : <span className="font-medium text-foreground">{g.responsable_nom}</span></span>
                                                </div>
                                            )}
                                            {g.jour_reunion && (
                                                <div className="flex items-center gap-2.5">
                                                    <CalendarClock className="w-4 h-4 shrink-0" />
                                                    <span>Réunion : <span className="font-medium text-foreground">{g.jour_reunion}</span> à {g.heure_reunion || "N/A"}</span>
                                                </div>
                                            )}
                                            {g.lieu_reunion && (
                                                <div className="flex items-center gap-2.5">
                                                    <MapPin className="w-4 h-4 shrink-0" />
                                                    <span className="truncate">Lieu : {g.lieu_reunion}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2 mt-auto">
                                            <Link to={`/dashboard/departements/${g.id}/workspace`} className="block w-full">
                                                <Button className="w-full flex items-center justify-center gap-2">
                                                    Espace de travail
                                                    <ArrowRight className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            {isAdmin && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1 h-9 text-xs font-semibold flex items-center justify-center gap-1.5"
                                                        onClick={() => openEdit(g)}
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                        Modifier
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive flex items-center justify-center shrink-0"
                                                        onClick={() => handleDelete(g.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Dialog Form with Premium Styling */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
                    <div className="bg-gradient-to-r from-bordeaux to-bordeaux-dark p-6 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-heading font-black tracking-tight text-white flex items-center gap-2">
                                <Bookmark className="w-5 h-5" />
                                {editing ? "Modifier le département" : "Créer un nouveau département"}
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-white/80 text-xs mt-1.5 font-light leading-relaxed">
                            Remplissez les informations ci-dessous pour configurer l'espace de travail.
                        </p>
                    </div>

                    <div className="space-y-5 p-6 bg-white">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nom du département *</Label>
                            <Input
                                placeholder="Ex: Chorale El-Shaddai, Cellule Nazareth..."
                                className="rounded-xl border-gray-200 focus:border-bordeaux focus:ring-bordeaux/20 h-11"
                                value={form.nom}
                                onChange={e => setForm({ ...form, nom: e.target.value })}
                            />
                        </div>

                        {editing && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Type de structure</Label>
                                        <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                                            <SelectTrigger className="rounded-xl border-gray-200 h-11 focus:ring-bordeaux/20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                                                    <SelectItem key={v} value={v}>{l}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Statut initial</Label>
                                        <div className="flex items-center gap-3 h-11 border border-gray-100 rounded-xl px-3 bg-gray-50/50">
                                            <Switch checked={form.actif} onCheckedChange={v => setForm({ ...form, actif: v })} />
                                            <span className="text-xs font-semibold text-gray-600">Département actif</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Description / Rôle</Label>
                                    <Textarea
                                        placeholder="Objectifs et responsabilités du département..."
                                        rows={3}
                                        className="rounded-xl border-gray-200 focus:border-bordeaux focus:ring-bordeaux/20"
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                            </>
                        )}

                        {isAdmin && !editing && (
                            <div className="space-y-4 border-t border-gray-100 pt-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Chef de département (Responsable)</Label>
                                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            className="rounded text-bordeaux focus:ring-bordeaux h-3.5 w-3.5"
                                            checked={createNewChef}
                                            onChange={e => {
                                                setCreateNewChef(e.target.checked);
                                                setSelectedChefId(e.target.checked ? "none" : "");
                                            }}
                                        />
                                        <span className="text-[11px] text-gray-600 font-medium">Nouveau responsable</span>
                                    </label>
                                </div>

                                {!createNewChef ? (
                                    <div className="space-y-1.5">
                                        <Select value={selectedChefId} onValueChange={setSelectedChefId}>
                                            <SelectTrigger className="rounded-xl border-gray-200 h-11 focus:ring-bordeaux/20">
                                                <SelectValue placeholder="Sélectionner un responsable" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Aucun (Pas de chef désigné)</SelectItem>
                                                {membres.map(m => (
                                                    <SelectItem key={m.id} value={m.id}>
                                                        {m.prenom} {m.nom}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="flex items-start gap-1.5 text-[10px] text-gray-400 mt-1">
                                            <Info className="w-3.5 h-3.5 text-bordeaux/60 shrink-0" />
                                            <span>L'attribution d'un chef lui donnera automatiquement accès aux responsabilités de l'espace de travail.</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold uppercase text-gray-500">Prénom du Chef *</Label>
                                                <Input
                                                    placeholder="Prénom"
                                                    className="rounded-lg border-gray-200 bg-white h-10 text-sm focus:border-bordeaux focus:ring-bordeaux/20"
                                                    value={form.chef_prenom || ""}
                                                    onChange={e => setForm({ ...form, chef_prenom: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold uppercase text-gray-500">Nom du Chef *</Label>
                                                <Input
                                                    placeholder="Nom"
                                                    className="rounded-lg border-gray-200 bg-white h-10 text-sm focus:border-bordeaux focus:ring-bordeaux/20"
                                                    value={form.chef_nom || ""}
                                                    onChange={e => setForm({ ...form, chef_nom: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-bold uppercase text-gray-500">Email du Chef *</Label>
                                            <Input
                                                type="email"
                                                placeholder="chef.email@rehoboth.org"
                                                className="rounded-lg border-gray-200 bg-white h-10 text-sm focus:border-bordeaux focus:ring-bordeaux/20"
                                                value={form.chef_email || ""}
                                                onChange={e => setForm({ ...form, chef_email: e.target.value })}
                                            />
                                        </div>
                                        <div className="text-[10px] text-gray-400 leading-normal">
                                            Un compte utilisateur sera généré automatiquement et des identifiants lui seront envoyés par e-mail.
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {isAdmin && editing && (
                            <div className="space-y-1.5 border-t border-gray-100 pt-4">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Chef de département (Responsable)</Label>
                                <Select value={selectedChefId} onValueChange={setSelectedChefId}>
                                    <SelectTrigger className="rounded-xl border-gray-200 h-11 focus:ring-bordeaux/20">
                                        <SelectValue placeholder="Sélectionner un responsable" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Aucun (Pas de chef désigné)</SelectItem>
                                        {membres.map(m => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.prenom} {m.nom}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {editing && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Jour de réunion</Label>
                                        <Input
                                            placeholder="Ex: Samedi, Vendredi..."
                                            className="rounded-xl border-gray-200 h-11"
                                            value={form.jour_reunion}
                                            onChange={e => setForm({ ...form, jour_reunion: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Heure de début</Label>
                                        <Input
                                            placeholder="Ex: 18:00, 16h30..."
                                            className="rounded-xl border-gray-200 h-11"
                                            value={form.heure_reunion}
                                            onChange={e => setForm({ ...form, heure_reunion: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 pb-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Lieu de réunion physique / Virtuel</Label>
                                    <Input
                                        placeholder="Ex: Salle A, Temple Principal, Zoom..."
                                        className="rounded-xl border-gray-200 h-11"
                                        value={form.lieu_reunion}
                                        onChange={e => setForm({ ...form, lieu_reunion: e.target.value })}
                                    />
                                </div>
                            </>
                        )}

                        <Button
                            onClick={handleSave}
                            disabled={saving || !form.nom}
                            className="w-full bg-gradient-to-r from-bordeaux to-bordeaux-dark text-white font-bold h-12 rounded-xl shadow-md mt-2"
                        >
                            {saving ? "Enregistrement en cours..." : "Valider et Enregistrer"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}