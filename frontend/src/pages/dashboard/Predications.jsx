import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
    Plus, Edit, Trash2, BookOpen, Play, User, 
    Calendar, Video, AudioLines, Bookmark, Globe, Loader2
} from "lucide-react";
import moment from "moment";

const EMPTY = { 
    titre: "", 
    predicateur: "", 
    date: moment().format("YYYY-MM-DD"), 
    serie: "", 
    resume: "", 
    fichier_url: "", 
    youtube_url: "", 
    publie: false 
};

export default function Predications() {
    const [predications, setPredications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        apiClient.entities.Predication.list("-date")
            .then(setPredications)
            .catch(console.error)
            .finally(() => setLoading(false));
    };
    
    useEffect(load, []);

    const openCreate = () => { 
        setEditing(null); 
        setForm(EMPTY); 
        setDialogOpen(true); 
    };
    
    const openEdit = (p) => { 
        setEditing(p); 
        setForm({ ...p }); 
        setDialogOpen(true); 
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editing) {
                await apiClient.entities.Predication.update(editing.id, form);
            } else {
                await apiClient.entities.Predication.create(form);
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
        if (!confirm("Supprimer cette prédication ?")) return;
        try {
            await apiClient.entities.Predication.delete(id);
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
                            Prédications
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Diffusez les messages dominicaux et enseignements sur les plateformes numériques.
                        </p>
                    </div>
                    <Button onClick={openCreate} className="shrink-0">
                        <Plus className="w-4 h-4 mr-2" />
                        Publier une prédication
                    </Button>
                </div>

                {/* Liste */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-10 h-10 border-2 border-muted border-t-foreground rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">Chargement de la médiathèque…</p>
                    </div>
                ) : predications.length === 0 ? (
                    <Card className="rounded-xl border-dashed">
                        <CardContent className="text-center py-20">
                        <BookOpen className="w-14 h-14 mx-auto text-muted-foreground/40 mb-4" />
                        <h3 className="text-lg font-semibold text-foreground">Aucun enregistrement média</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
                            Ajoutez des vidéos YouTube ou des audios MP3 pour que la communauté puisse réécouter les sermons.
                        </p>
                        <Button onClick={openCreate}>
                            <Plus className="w-4 h-4 mr-2" /> Ajouter la première prédication
                        </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {predications.map(p => (
                            <Card key={p.id} className="rounded-xl">
                                <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                                    <div className="flex items-start md:items-center gap-4 min-w-0">
                                        <div className="w-12 h-12 rounded-xl bg-muted text-foreground flex items-center justify-center shrink-0">
                                            <BookOpen className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-extrabold text-base text-gray-900 group-hover:text-bordeaux leading-snug">{p.titre}</h3>
                                                {p.publie ? (
                                                    <Badge variant="secondary" className="text-[10px] uppercase font-bold py-0.5 px-2 rounded-full">Publié</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5 px-2 rounded-full text-muted-foreground">Brouillon</Badge>
                                                )}
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                                                <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-bordeaux/60" />{p.predicateur}</span>
                                                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-bordeaux/60" />{moment(p.date).format("D MMMM YYYY")}</span>
                                                {p.serie && <Badge variant="outline" className="text-bordeaux border-bordeaux/20 text-[10px] rounded-full">{p.serie}</Badge>}
                                            </div>

                                            {p.youtube_url && (
                                                <a href={p.youtube_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-red-650 hover:underline pt-1">
                                                    <Play className="w-3.5 h-3.5 fill-red-650" />
                                                    Voir sur YouTube
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2.5 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 shrink-0">
                                        <Button 
                                            variant="outline" 
                                            className="flex-1 md:flex-none h-9 px-4 rounded-xl text-xs font-bold border-gray-250 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-1.5"
                                            onClick={() => openEdit(p)}
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                            Modifier
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className="h-9 w-9 rounded-xl border-gray-250 hover:bg-red-50 text-gray-400 hover:text-red-650 flex items-center justify-center shrink-0"
                                            onClick={() => handleDelete(p.id)}
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
                                <Bookmark className="w-5 h-5" />
                                {editing ? "Modifier la fiche média" : "Publier une nouvelle prédication"}
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-white/80 text-xs mt-1.5 font-light">Partagez vos fichiers multimédias avec les fidèles.</p>
                    </div>

                    <div className="space-y-4 p-6 bg-white overflow-y-auto flex-1">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Titre de la prédication *</Label>
                            <Input 
                                placeholder="Ex: La puissance de la foi agissante" 
                                className="rounded-xl border-gray-200 h-11 focus:border-bordeaux focus:ring-bordeaux/20"
                                value={form.titre} 
                                onChange={e => setForm({ ...form, titre: e.target.value })} 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Prédicateur (Orateur) *</Label>
                                <Input 
                                    placeholder="Ex: Pasteur Jean-Paul" 
                                    className="rounded-xl border-gray-200 h-11"
                                    value={form.predicateur} 
                                    onChange={e => setForm({ ...form, predicateur: e.target.value })} 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date du sermon *</Label>
                                <Input 
                                    type="date" 
                                    className="rounded-xl border-gray-200 h-11"
                                    value={form.date} 
                                    onChange={e => setForm({ ...form, date: e.target.value })} 
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Série ou Thématique</Label>
                            <Input 
                                placeholder="Ex: Grandir Spirituellement, Famille..." 
                                className="rounded-xl border-gray-200 h-11"
                                value={form.serie || ""} 
                                onChange={e => setForm({ ...form, serie: e.target.value })} 
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Résumé du sermon</Label>
                            <Textarea 
                                placeholder="Un court résumé des points clés abordés pendant le sermon..." 
                                rows={3} 
                                className="rounded-xl border-gray-200"
                                value={form.resume || ""} 
                                onChange={e => setForm({ ...form, resume: e.target.value })} 
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1"><Video className="w-4 h-4 text-bordeaux/60" />Lien Vidéo YouTube</Label>
                            <Input 
                                placeholder="https://youtube.com/watch?v=..." 
                                className="rounded-xl border-gray-200 h-11"
                                value={form.youtube_url || ""} 
                                onChange={e => setForm({ ...form, youtube_url: e.target.value })} 
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1"><AudioLines className="w-4 h-4 text-bordeaux/60" />Lien Fichier Audio MP3</Label>
                            <Input 
                                placeholder="https://serveur.com/audio.mp3" 
                                className="rounded-xl border-gray-200 h-11"
                                value={form.fichier_url || ""} 
                                onChange={e => setForm({ ...form, fichier_url: e.target.value })} 
                            />
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-150">
                            <Switch checked={form.publie} onCheckedChange={v => setForm({ ...form, publie: v })} />
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 cursor-pointer select-none">
                                <Globe className="w-4 h-4 text-emerald-500" />
                                Publier publiquement sur le site internet
                            </Label>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-150 shrink-0">
                        <Button 
                            onClick={handleSave} 
                            disabled={saving || !form.titre || !form.predicateur || !form.date} 
                            className="w-full bg-gradient-to-r from-bordeaux to-bordeaux-dark text-white font-bold h-12 rounded-xl shadow-md"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Publication en cours...
                                </>
                            ) : (
                                "Enregistrer et publier"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}