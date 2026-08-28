import React, { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/apiClient";
import { PARAMETRES_QUERY_KEY } from "@/hooks/useParametres";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Save, Church, Globe, Clock, Sparkles, Check, Settings2, Loader2, Compass } from "lucide-react";

const EMPTY = { 
    nom: "", 
    adresse: "", 
    ville: "", 
    telephone: "", 
    email_contact: "", 
    site_web: "", 
    facebook: "", 
    youtube: "", 
    instagram: "", 
    horaires: "", 
    description: "", 
    vision: "", 
    histoire: "", 
    logo_url: "" 
};

/**
 * Champ texte du formulaire.
 *
 * Défini au niveau du module, et non dans le corps de `Parametres` : une
 * déclaration interne recrée le type du composant à chaque rendu, React
 * démonte alors l'input et le champ perd le focus à chaque caractère saisi.
 */
function F({ label, field, type = "text", placeholder = "", value, onChange }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</Label>
            <Input
                type={type}
                placeholder={placeholder}
                className="rounded-xl border-gray-205 h-11 focus:border-bordeaux focus:ring-bordeaux/20"
                value={value || ""}
                onChange={e => onChange(field, e.target.value)}
            />
        </div>
    );
}

export default function Parametres() {
    const [form, setForm] = useState(EMPTY);
    const [recordId, setRecordId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const queryClient = useQueryClient();

    const setChamp = useCallback(
        (field, value) => setForm(prev => ({ ...prev, [field]: value })),
        []
    );

    useEffect(() => {
        apiClient.entities.EgliseParametres.list()
            .then(p => {
                if (p.length) { 
                    setForm({ ...EMPTY, ...p[0] }); 
                    setRecordId(p[0].id); 
                }
                setLoading(false);
            })
            .catch(console.error);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            if (recordId) {
                await apiClient.entities.EgliseParametres.update(recordId, form);
            } else {
                const r = await apiClient.entities.EgliseParametres.create(form);
                setRecordId(r.id);
            }
            await queryClient.invalidateQueries({ queryKey: PARAMETRES_QUERY_KEY });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'enregistrement des paramètres");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-bordeaux" />
                    <p className="text-sm text-gray-500 animate-pulse">Chargement de la configuration...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
                {/* En-tête */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                            Paramètres
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Configurez les coordonnées, les réseaux sociaux et la présentation de l'église.
                        </p>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="shrink-0">
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sauvegarde…
                            </>
                        ) : saved ? (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Enregistré !
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Enregistrer
                            </>
                        )}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Information cards */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Général */}
                        <Card className="border border-gray-150 rounded-2xl bg-white shadow-sm overflow-hidden">
                            <CardHeader className="border-b border-gray-100 p-6 bg-gray-50/40">
                                <CardTitle className="text-lg font-heading font-extrabold text-gray-900 flex items-center gap-2">
                                    <Church className="w-5 h-5 text-bordeaux" />
                                    Informations de l'établissement
                                </CardTitle>
                                <CardDescription className="text-xs text-gray-500">Coordonnées de l'église affichées publiquement sur le site.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <F label="Nom officiel de l'église *" field="nom" placeholder="Ex: Rehoboth Church International" value={form.nom} onChange={setChamp} />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <F label="Adresse physique" field="adresse" placeholder="123 Rue de la Paix" value={form.adresse} onChange={setChamp} />
                                    <F label="Ville & Code Postal" field="ville" placeholder="75000 Paris" value={form.ville} onChange={setChamp} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <F label="Téléphone officiel" field="telephone" placeholder="+33 1 23 45 67 89" value={form.telephone} onChange={setChamp} />
                                    <F label="Adresse Email de contact" field="email_contact" type="email" placeholder="contact@rehoboth.com" value={form.email_contact} onChange={setChamp} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Logo de l'église (URL de l'image)</Label>
                                    <Input 
                                        value={form.logo_url || ""} 
                                        onChange={e => setForm({ ...form, logo_url: e.target.value })} 
                                        placeholder="https://serveur.com/logo.png" 
                                        className="rounded-xl border-gray-205 h-11"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Description & Vision */}
                        <Card className="border border-gray-150 rounded-2xl bg-white shadow-sm overflow-hidden">
                            <CardHeader className="border-b border-gray-100 p-6 bg-gray-50/40">
                                <CardTitle className="text-lg font-heading font-extrabold text-gray-900 flex items-center gap-2">
                                    <Compass className="w-5 h-5 text-bordeaux" />
                                    Cultes, Vision & Histoire
                                </CardTitle>
                                <CardDescription className="text-xs text-gray-500">Présentation théologique et historique pour la vitrine.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-bordeaux/60" />
                                        Horaires de rassemblement
                                    </Label>
                                    <Input 
                                        value={form.horaires || ""} 
                                        onChange={e => setForm({ ...form, horaires: e.target.value })} 
                                        placeholder="Ex: Dimanche 10h00 (Culte principal) & Mercredi 19h00 (Intercession)" 
                                        className="rounded-xl border-gray-205 h-11"
                                    />
                                </div>
                                
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Présentation générale (Description)</Label>
                                    <Textarea 
                                        rows={3} 
                                        className="rounded-xl border-gray-200"
                                        placeholder="Une description engageante de l'église..."
                                        value={form.description || ""} 
                                        onChange={e => setForm({ ...form, description: e.target.value })} 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Notre Vision & Mission</Label>
                                    <Textarea 
                                        rows={2.5} 
                                        className="rounded-xl border-gray-200"
                                        placeholder="La vision spirituelle et sociale de la communauté..."
                                        value={form.vision || ""} 
                                        onChange={e => setForm({ ...form, vision: e.target.value })} 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Notre Histoire</Label>
                                    <Textarea 
                                        rows={3.5} 
                                        className="rounded-xl border-gray-200"
                                        placeholder="Racontez la genèse de l'église Rehoboth..."
                                        value={form.histoire || ""} 
                                        onChange={e => setForm({ ...form, histoire: e.target.value })} 
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Social Media Column */}
                    <div className="lg:col-span-4 h-full">
                        <Card className="border border-gray-150 rounded-2xl bg-white shadow-sm overflow-hidden h-fit">
                            <CardHeader className="border-b border-gray-100 p-6 bg-gray-50/40">
                                <CardTitle className="text-lg font-heading font-extrabold text-gray-900 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-bordeaux" />
                                    Présence numérique
                                </CardTitle>
                                <CardDescription className="text-xs text-gray-500">Réseaux sociaux et site web externe.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <F label="Site internet officiel" field="site_web" placeholder="https://www.rehoboth.org" value={form.site_web} onChange={setChamp} />
                                <F label="Page Facebook" field="facebook" placeholder="https://facebook.com/rehoboth" value={form.facebook} onChange={setChamp} />
                                <F label="Chaîne YouTube" field="youtube" placeholder="https://youtube.com/rehoboth" value={form.youtube} onChange={setChamp} />
                                <F label="Compte Instagram" field="instagram" placeholder="https://instagram.com/rehoboth" value={form.instagram} onChange={setChamp} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}