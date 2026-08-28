import React from "react";
import PublicLayout from "@/components/public/PublicLayout";
import { useParametres } from "@/hooks/useParametres";
import ResponsableCard from "@/components/public/ResponsableCard";
import { responsables } from "@/data/responsables";
import { Heart, Target, BookOpen } from "lucide-react";

export default function APropos() {
    const { parametres } = useParametres();

    const enAvant = responsables.filter(r => r.miseEnAvant);
    const autres = responsables.filter(r => !r.miseEnAvant);

    return (
        <PublicLayout>
            <section className="py-16 px-4 max-w-4xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-heading font-bold text-bordeaux mb-8 text-center">À propos de nous</h1>

                {parametres.description && (
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
                        <p className="text-gray-600 text-sm">{parametres.vision || "Être une église transformée et transformante dans la ville."}</p>
                    </div>
                    <div className="text-center p-6 rounded-2xl bg-cream md:translate-y-8 transition-transform duration-300 hover:scale-[1.03] hover:shadow-sm">
                        <BookOpen className="w-10 h-10 text-bordeaux mx-auto mb-3" />
                        <h3 className="font-bold text-bordeaux text-lg mb-2">Notre foi</h3>
                        <p className="text-gray-600 text-sm">Une foi ancrée dans la Bible, la grâce et la puissance du Saint-Esprit.</p>
                    </div>
                </div>

                {parametres.histoire && (
                    <div className="mb-16">
                        <h2 className="text-2xl font-heading font-bold text-bordeaux mb-4">Notre histoire</h2>
                        <p className="text-gray-600 leading-relaxed">{parametres.histoire}</p>
                    </div>
                )}

                {/* Nos Responsables */}
                {responsables.length > 0 && (
                    <div className="mt-16 border-t border-gray-100 pt-16">
                        <h2 className="text-3xl font-heading font-bold text-bordeaux mb-4 text-center">Nos Responsables</h2>
                        <p className="text-gray-500 text-center max-w-xl mx-auto mb-12">
                            Découvrez l'équipe dédiée à guider et servir spirituellement la communauté de {parametres.nom}.
                        </p>

                        {enAvant.length > 0 && (
                            <div className="max-w-sm mx-auto mb-10">
                                {enAvant.map((responsable) => (
                                    <ResponsableCard key={responsable.nom} responsable={responsable} enAvant />
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {autres.map((responsable) => (
                                <ResponsableCard key={responsable.nom} responsable={responsable} />
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </PublicLayout>
    );
}