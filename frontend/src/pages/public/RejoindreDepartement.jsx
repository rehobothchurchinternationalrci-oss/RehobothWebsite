import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import PublicLayout from "@/components/public/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function RejoindreDepartement() {
    const { id } = useParams();
    const [departement, setDepartement] = useState(null);
    const [loadingDept, setLoadingDept] = useState(true);
    
    const [form, setForm] = useState({ prenom: "", nom: "", email: "", telephone: "", adresse: "" });
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState(null); // { success: boolean, message: string }

    useEffect(() => {
        apiClient.entities.Departement.get(id)
            .then(setDepartement)
            .catch(err => console.error("Erreur de chargement du département", err))
            .finally(() => setLoadingDept(false));
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.prenom || !form.nom || !form.email) return;
        
        setSubmitting(true);
        setStatus(null);
        try {
            const res = await apiClient.entities.Departement.rejoindre(id, form);
            setStatus({ success: true, message: res.message || "Votre inscription a bien été prise en compte." });
            setForm({ prenom: "", nom: "", email: "", telephone: "", adresse: "" });
        } catch (err) {
            console.error(err);
            setStatus({ 
                success: false, 
                message: err.message || "Une erreur est survenue lors de l'adhésion. Veuillez réessayer." 
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingDept) {
        return (
            <PublicLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-bordeaux" />
                    <p className="text-sm text-gray-500">Chargement des informations du département...</p>
                </div>
            </PublicLayout>
        );
    }

    if (!departement) {
        return (
            <PublicLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto px-4 text-center space-y-4">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                    <h1 className="text-2xl font-bold text-gray-800">Département introuvable</h1>
                    <p className="text-gray-500 text-sm">Le lien que vous avez suivi semble invalide ou le département a été supprimé.</p>
                </div>
            </PublicLayout>
        );
    }

    return (
        <PublicLayout>
            <section className="py-16 px-4 max-w-xl mx-auto">
                <Card className="shadow-xl border border-gray-150 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-bordeaux to-[#4a0d18] text-white p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 border border-white/20">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <CardTitle className="font-heading font-black tracking-tight text-2xl">
                            Rejoindre {departement.nom}
                        </CardTitle>
                        <CardDescription className="text-white/80 text-sm mt-1.5 font-light">
                            Devenez membre actif et participez aux activités de ce département
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-8 bg-white space-y-6">
                        {status?.success ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                                <CheckCircle className="w-16 h-16 text-green-500" />
                                <h3 className="font-bold text-xl text-gray-900">Demande enregistrée !</h3>
                                <p className="text-gray-600 text-sm max-w-sm leading-relaxed">
                                    {status.message}
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {status && !status.success && (
                                    <div className="p-4 rounded-xl bg-red-50 text-red-800 border border-red-100 text-sm flex items-start gap-2.5">
                                        <AlertCircle className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
                                        <div>{status.message}</div>
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-gray-700 text-xs font-bold uppercase tracking-wider">Prénom *</Label>
                                        <Input 
                                            placeholder="Ex : Grâce" 
                                            value={form.prenom} 
                                            onChange={e => setForm({ ...form, prenom: e.target.value })} 
                                            required 
                                            className="rounded-xl border-gray-200 h-11 focus:border-bordeaux focus:ring-bordeaux"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-gray-700 text-xs font-bold uppercase tracking-wider">Nom *</Label>
                                        <Input 
                                            placeholder="Ex : Kabila" 
                                            value={form.nom} 
                                            onChange={e => setForm({ ...form, nom: e.target.value })} 
                                            required 
                                            className="rounded-xl border-gray-200 h-11 focus:border-bordeaux focus:ring-bordeaux"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-gray-700 text-xs font-bold uppercase tracking-wider">Adresse E-mail *</Label>
                                    <Input 
                                        type="email"
                                        placeholder="grace.kabila@exemple.com" 
                                        value={form.email} 
                                        onChange={e => setForm({ ...form, email: e.target.value })} 
                                        required 
                                        className="rounded-xl border-gray-200 h-11 focus:border-bordeaux focus:ring-bordeaux"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-gray-700 text-xs font-bold uppercase tracking-wider">Téléphone</Label>
                                    <Input 
                                        placeholder="+90 532 123 45 67" 
                                        value={form.telephone} 
                                        onChange={e => setForm({ ...form, telephone: e.target.value })} 
                                        className="rounded-xl border-gray-200 h-11 focus:border-bordeaux focus:ring-bordeaux"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-gray-700 text-xs font-bold uppercase tracking-wider">Adresse</Label>
                                    <Input 
                                        placeholder="Ex : Fatih, Istanbul" 
                                        value={form.adresse} 
                                        onChange={e => setForm({ ...form, adresse: e.target.value })} 
                                        className="rounded-xl border-gray-200 h-11 focus:border-bordeaux focus:ring-bordeaux"
                                    />
                                </div>

                                <Button 
                                    type="submit" 
                                    disabled={submitting} 
                                    className="w-full bg-bordeaux hover:bg-[#4a0d18] text-white rounded-xl h-12 font-bold transition-all shadow-md mt-4"
                                >
                                    {submitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Inscription...
                                        </span>
                                    ) : (
                                        "Rejoindre le département"
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </section>
        </PublicLayout>
    );
}
