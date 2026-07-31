import React from "react";
import PublicLayout from "@/components/public/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, CreditCard, Building2 } from "lucide-react";

export default function Don() {
    return (
        <PublicLayout>
            <section className="py-16 px-4 max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <Heart className="w-12 h-12 text-bordeaux mx-auto mb-4" />
                    <h1 className="text-3xl md:text-4xl font-heading font-bold text-bordeaux mb-3">Faire un don</h1>
                    <p className="text-gray-600">Votre générosité permet à l'église de continuer sa mission.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardContent className="p-6">
                            <Building2 className="w-8 h-8 text-bordeaux mb-3" />
                            <h3 className="font-bold text-lg mb-2">Virement bancaire</h3>
                            <p className="text-sm text-gray-600 mb-3">Effectuez un virement sur notre compte :</p>
                            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm font-mono">
                                <p><span className="text-gray-400">IBAN :</span> FR76 3000 6000 0112 3456 7890 189</p>
                                <p><span className="text-gray-400">BIC :</span> BNPAFRPPXXX</p>
                                <p><span className="text-gray-400">Titulaire :</span> Rehoboth Church International</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <CreditCard className="w-8 h-8 text-bordeaux mb-3" />
                            <h3 className="font-bold text-lg mb-2">Lors des cultes</h3>
                            <p className="text-sm text-gray-600 mb-3">Des enveloppes de don sont disponibles lors de chaque culte. Vous pouvez glisser votre don dans le sac de collecte.</p>
                            <p className="text-sm text-gray-500">Pour recevoir un reçu fiscal, merci de mentionner votre nom et adresse sur l'enveloppe.</p>
                        </CardContent>
                    </Card>
                </div>

                <p className="text-center text-sm text-gray-400 mt-8">
                    L'église est reconnue comme association cultuelle — vos dons peuvent ouvrir droit à une réduction d'impôt de 66%.
                </p>
            </section>
        </PublicLayout>
    );
}