import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
    Plus, Edit, Trash2, DollarSign, TrendingUp, Sparkles, 
    Heart, Calendar, Receipt, ClipboardList, Wallet, UserCheck, Loader2
} from "lucide-react";
import moment from "moment";

const TYPE_LABELS = { 
    dime: "Dîme", 
    offrande: "Offrande", 
    don_special: "Don spécial" 
};

const TYPE_COLORS = {
    dime: "bg-secondary text-secondary-foreground border border-border",
    offrande: "bg-muted text-muted-foreground border border-border",
    don_special: "bg-primary text-primary-foreground border-transparent"
};

const EMPTY = { 
    membre_nom: "", 
    montant: "", 
    date: moment().format("YYYY-MM-DD"), 
    type: "offrande", 
    anonyme: false, 
    note: "" 
};

export default function Dons() {
    const [dons, setDons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        apiClient.entities.Don.list("-date")
            .then(setDons)
            .catch(console.error)
            .finally(() => setLoading(false));
    };
    
    useEffect(load, []);

    const total = dons.reduce((s, d) => s + (d.montant || 0), 0);
    const moisActuel = dons.filter(d => moment(d.date).isSame(moment(), "month")).reduce((s, d) => s + (d.montant || 0), 0);

    const openCreate = () => { 
        setEditing(null); 
        setForm(EMPTY); 
        setDialogOpen(true); 
    };
    
    const openEdit = (d) => { 
        setEditing(d); 
        setForm({ ...d }); 
        setDialogOpen(true); 
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const data = { ...form, montant: parseFloat(form.montant) || 0 };
            if (editing) {
                await apiClient.entities.Don.update(editing.id, data);
            } else {
                await apiClient.entities.Don.create(data);
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
        if (!confirm("Supprimer l'enregistrement de ce don ?")) return;
        try {
            await apiClient.entities.Don.delete(id);
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
                            Dons
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Enregistrez et assurez la transparence des dîmes, offrandes et contributions.
                        </p>
                    </div>
                    <Button onClick={openCreate} className="shrink-0">
                        <Plus className="w-4 h-4 mr-2" />
                        Enregistrer une offrande
                    </Button>
                </div>

                {/* Tuiles de statistiques */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="rounded-xl">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-muted-foreground">Total cumulé</p>
                                <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
                            </div>
                            <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">{total.toLocaleString('fr-FR')}€</div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-xl">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-muted-foreground">Ce mois-ci</p>
                                <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
                            </div>
                            <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">{moisActuel.toLocaleString('fr-FR')}€</div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-xl">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                                <ClipboardList className="w-4 h-4 text-muted-foreground shrink-0" />
                            </div>
                            <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">{dons.length}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Liste */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-10 h-10 border-2 border-muted border-t-foreground rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">Chargement du grand livre…</p>
                    </div>
                ) : dons.length === 0 ? (
                    <Card className="rounded-xl border-dashed">
                        <CardContent className="text-center py-20">
                            <DollarSign className="w-14 h-14 mx-auto text-muted-foreground/40 mb-4" />
                            <h3 className="text-lg font-semibold text-foreground">Aucune transaction enregistrée</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
                                Commencez à archiver les offrandes reçues lors des cultes ou événements spéciaux.
                            </p>
                            <Button onClick={openCreate}>
                                <Plus className="w-4 h-4 mr-2" /> Enregistrer un don
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {dons.map(d => (
                            <Card key={d.id} className="rounded-xl">
                                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0">
                                            <Heart className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-extrabold text-sm text-gray-900">
                                                    {d.anonyme ? "Donateur Anonyme" : (d.membre_nom || "—")}
                                                </span>
                                                <Badge className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border-0 ${TYPE_COLORS[d.type] || TYPE_COLORS.offrande}`}>
                                                    {TYPE_LABELS[d.type] || "Offrande"}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-gray-450 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{moment(d.date).format("D MMMM YYYY")}</span>
                                                {d.numero_recu && <span className="flex items-center gap-1"><Receipt className="w-3.5 h-3.5" />Reçu : {d.numero_recu}</span>}
                                                {d.note && <span className="italic text-gray-400 font-light truncate">({d.note})</span>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                                        <span className="font-bold text-foreground text-xl tracking-tight">+{d.montant.toLocaleString('fr-FR')}€</span>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                className="h-9 w-9 rounded-xl border-gray-250 hover:bg-gray-50 text-gray-500 flex items-center justify-center"
                                                onClick={() => openEdit(d)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                className="h-9 w-9 rounded-xl border-gray-250 hover:bg-red-50 text-gray-400 hover:text-red-650 flex items-center justify-center"
                                                onClick={() => handleDelete(d.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Dialog Form */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
                    <div className="bg-gradient-to-r from-bordeaux to-bordeaux-dark p-6 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-heading font-black tracking-tight text-white flex items-center gap-2">
                                <Receipt className="w-5 h-5" />
                                {editing ? "Modifier la fiche de don" : "Enregistrer un don"}
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-white/80 text-xs mt-1.5 font-light">Comptabilisez fidèlement les entrées financières.</p>
                    </div>

                    <div className="space-y-4 p-6 bg-white">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <Switch checked={form.anonyme} onCheckedChange={v => setForm({ ...form, anonyme: v })} />
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 cursor-pointer select-none">Donation anonyme</Label>
                        </div>

                        {!form.anonyme && (
                            <div className="space-y-1.5 In">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nom du donateur *</Label>
                                <Input 
                                    placeholder="Nom du membre ou visiteur..." 
                                    className="rounded-xl border-gray-200 h-11"
                                    value={form.membre_nom || ""} 
                                    onChange={e => setForm({ ...form, membre_nom: e.target.value })} 
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Montant (€) *</Label>
                                <Input 
                                    type="number" 
                                    min="0" 
                                    placeholder="100" 
                                    className="rounded-xl border-gray-200 h-11"
                                    value={form.montant} 
                                    onChange={e => setForm({ ...form, montant: e.target.value })} 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date *</Label>
                                <Input 
                                    type="date" 
                                    className="rounded-xl border-gray-200 h-11"
                                    value={form.date} 
                                    onChange={e => setForm({ ...form, date: e.target.value })} 
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Type de versement</Label>
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
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Note ou Référence du reçu</Label>
                            <Input 
                                placeholder="Numéro de chèque, virement, occasion..." 
                                className="rounded-xl border-gray-200 h-11"
                                value={form.note || ""} 
                                onChange={e => setForm({ ...form, note: e.target.value })} 
                            />
                        </div>

                        <Button 
                            onClick={handleSave} 
                            disabled={saving || !form.montant || !form.date || (!form.anonyme && !form.membre_nom)} 
                            className="w-full bg-gradient-to-r from-bordeaux to-bordeaux-dark text-white font-bold h-12 rounded-xl shadow-md mt-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Enregistrement...
                                </>
                            ) : (
                                "Valider l'enregistrement"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}