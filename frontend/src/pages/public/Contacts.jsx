import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import PublicLayout from "@/components/public/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Mail, Send, CheckCircle } from "lucide-react";

export default function Contact() {
    const [parametres, setParametres] = useState(null);
    const [form, setForm] = useState({ nom: "", email: "", message: "" });
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        apiClient.entities.EgliseParametres.list().then(p => p.length && setParametres(p[0]));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const destinationEmail = parametres?.email_contact || "contact@rehoboth.org";
        await apiClient.integrations.Core.SendEmail({
            to: destinationEmail,
            subject: `Message de contact de ${form.nom}`,
            body: `Nom: ${form.nom}\nEmail: ${form.email}\n\n${form.message}`
        });
        setLoading(false);
        setSent(true);
    };

    return (
        <PublicLayout>
            <section className="py-16 px-4 max-w-5xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-heading font-bold text-bordeaux mb-2 text-center">Contact</h1>
                <p className="text-gray-500 text-center mb-12">Nous serions ravis d'avoir de vos nouvelles</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                        <h2 className="text-2xl font-heading font-bold text-bordeaux mb-8">Nos coordonnées</h2>
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-bordeaux/5 flex items-center justify-center shrink-0">
                                    <MapPin className="w-5 h-5 text-bordeaux" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 text-sm">Adresse</h4>
                                    <p className="text-gray-600 text-sm mt-0.5">
                                        {parametres?.adresse ? `${parametres.adresse}${parametres.ville ? `, ${parametres.ville}` : ""}` : "Girne, Chypre du Nord"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-bordeaux/5 flex items-center justify-center shrink-0">
                                    <Phone className="w-5 h-5 text-bordeaux" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 text-sm">Téléphone</h4>
                                    <p className="text-gray-600 text-sm mt-0.5">
                                        {parametres?.telephone || "+90 533 123 45 67"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-bordeaux/5 flex items-center justify-center shrink-0">
                                    <Mail className="w-5 h-5 text-bordeaux" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 text-sm">Email</h4>
                                    <p className="text-gray-600 text-sm mt-0.5">
                                        <a href={`mailto:${parametres?.email_contact || "contact@rehoboth.org"}`} className="hover:text-bordeaux hover:underline">
                                            {parametres?.email_contact || "contact@rehoboth.org"}
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Card className="shadow-sm border border-gray-100 rounded-2xl">
                        <CardContent className="p-8">
                            {sent ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                                    <h3 className="font-semibold text-lg mb-1 text-gray-800">Message envoyé !</h3>
                                    <p className="text-gray-500 text-sm">Nous vous répondrons dans les plus brefs délais.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-gray-700 text-sm font-medium">Nom</Label>
                                        <Input 
                                            placeholder="Votre nom complet" 
                                            value={form.nom} 
                                            onChange={e => setForm({ ...form, nom: e.target.value })} 
                                            required 
                                            className="rounded-xl border-gray-200 focus:border-bordeaux focus:ring-bordeaux"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-gray-700 text-sm font-medium">Email</Label>
                                        <Input 
                                            type="email" 
                                            placeholder="votre.email@exemple.com" 
                                            value={form.email} 
                                            onChange={e => setForm({ ...form, email: e.target.value })} 
                                            required 
                                            className="rounded-xl border-gray-200 focus:border-bordeaux focus:ring-bordeaux"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-gray-700 text-sm font-medium">Message</Label>
                                        <Textarea 
                                            rows={4} 
                                            placeholder="Écrivez votre message ici..." 
                                            value={form.message} 
                                            onChange={e => setForm({ ...form, message: e.target.value })} 
                                            required 
                                            className="rounded-xl border-gray-200 focus:border-bordeaux focus:ring-bordeaux resize-none"
                                        />
                                    </div>
                                    <Button type="submit" disabled={loading} className="w-full bg-bordeaux hover:bg-bordeaux/90 text-white rounded-xl h-11 font-medium transition-all duration-200">
                                        <Send className="w-4 h-4 mr-2" />
                                        {loading ? "Envoi..." : "Envoyer"}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </section>
        </PublicLayout>
    );
}