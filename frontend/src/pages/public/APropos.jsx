import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import PublicLayout from "@/components/public/PublicLayout";
import { Heart, Target, BookOpen, Mail, Phone } from "lucide-react";

export default function APropos() {
    const [parametres, setParametres] = useState(null);

    useEffect(() => {
        apiClient.entities.EgliseParametres.list().then(p => p.length && setParametres(p[0]));
    }, []);

    return (
        <PublicLayout>
            <section className="py-16 px-4 max-w-4xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-heading font-bold text-bordeaux mb-8 text-center">À propos de nous</h1>

                {parametres?.description && (
                    <div className="mb-12 text-lg text-gray-600 text-center">{parametres.description}</div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 md:mb-24">
                    <div className="text-center p-6 rounded-2xl bg-cream md:translate-y-8 transition-transform duration-300 hover:scale-[1.03] hover:shadow-sm">
                        <Heart className="w-10 h-10 text-bordeaux mx-auto mb-3" />
                        <h3 className="font-bold text-bordeaux text-lg mb-2">Notre mission</h3>
                        <p className="text-gray-600 text-sm">Aimer Dieu, aimer les autres et faire des disciples.</p>
                    </div>
                    <div className="text-center p-6 rounded-2xl bg-cream transition-transform duration-300 hover:scale-[1.03] hover:shadow-sm">
                        <Target className="w-10 h-10 text-bordeaux mx-auto mb-3" />
                        <h3 className="font-bold text-bordeaux text-lg mb-2">Notre vision</h3>
                        <p className="text-gray-600 text-sm">{parametres?.vision || "Être une église transformée et transformante dans la ville."}</p>
                    </div>
                    <div className="text-center p-6 rounded-2xl bg-cream md:translate-y-8 transition-transform duration-300 hover:scale-[1.03] hover:shadow-sm">
                        <BookOpen className="w-10 h-10 text-bordeaux mx-auto mb-3" />
                        <h3 className="font-bold text-bordeaux text-lg mb-2">Notre foi</h3>
                        <p className="text-gray-600 text-sm">Une foi ancrée dans la Bible, la grâce et la puissance du Saint-Esprit.</p>
                    </div>
                </div>

                {parametres?.histoire && (
                    <div className="mb-16">
                        <h2 className="text-2xl font-heading font-bold text-bordeaux mb-4">Notre histoire</h2>
                        <p className="text-gray-600 leading-relaxed">{parametres.histoire}</p>
                    </div>
                )}

                {/* Notre Pasteur Fondateur */}
                <div className="mt-16 border-t border-gray-100 pt-16">
                    <h2 className="text-3xl font-heading font-bold text-bordeaux mb-4 text-center">Notre Pasteur Fondateur</h2>
                    <p className="text-gray-500 text-center max-w-xl mx-auto mb-12">
                        Découvrez le pasteur principal et fondateur dédié à guider et nourrir spirituellement la communauté de Rehoboth Church International.
                    </p>

                    <div className="max-w-md mx-auto">
                        {/* Pastor 1 */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 text-center">
                                <div className="w-28 h-28 mx-auto mb-4 rounded-full bg-bordeaux/10 text-bordeaux flex items-center justify-center text-3xl font-bold">
                                    SM
                                </div>
                                <h3 className="font-bold text-lg text-bordeaux mb-1">Pasteur Samuel Marhegane</h3>
                                <p className="text-sm font-semibold text-gray-500 mb-3">Pasteur Principal & Fondateur</p>
                                <p className="text-sm text-gray-600 mb-4">
                                    Leader visionnaire dévoué à l'expansion du Royaume de Dieu et à la formation de disciples passionnés.
                                </p>
                                <div className="pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-500">
                                    <div className="flex items-center justify-center gap-1.5 hover:text-bordeaux transition-colors">
                                        <Mail className="w-3.5 h-3.5" />
                                        <a href="mailto:s.marhegane@rehoboth.org">s.marhegane@rehoboth.org</a>
                                    </div>
                                    <div className="flex items-center justify-center gap-1.5 hover:text-bordeaux transition-colors">
                                        <Phone className="w-3.5 h-3.5" />
                                        <a href="tel:+33123456789">+33 1 23 45 67 89</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}