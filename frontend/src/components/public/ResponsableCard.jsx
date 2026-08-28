import React from "react";
import { Mail, Phone } from "lucide-react";

// Titres de civilité écartés du calcul des initiales : « Pasteur Samuel
// Marhegane » doit donner « SM », pas « PS ».
const CIVILITES = [
    "pasteur", "pastor", "past", "frère", "frere", "sœur", "soeur",
    "révérend", "reverend", "rév", "rev", "dr",
];

function initiales(nom) {
    return (nom || "")
        .split(" ")
        .filter(Boolean)
        .filter((mot) => !CIVILITES.includes(mot.toLowerCase().replace(/\.$/, "")))
        .map((mot) => mot[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

/**
 * Carte d'un responsable de l'église.
 *
 * `enAvant` produit la variante large et cerclée d'or utilisée pour la
 * personne placée seule en tête de la section.
 */
export default function ResponsableCard({ responsable, enAvant = false }) {
    const { nom, fonction, description, email, tel } = responsable;

    return (
        <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${enAvant ? "border-or/60 ring-1 ring-or/30" : "border-gray-100"}`}>
            <div className="p-6 text-center">
                <div className={`mx-auto mb-4 rounded-full bg-bordeaux/10 text-bordeaux flex items-center justify-center font-bold ${enAvant ? "w-28 h-28 text-3xl" : "w-24 h-24 text-2xl"}`}>
                    {initiales(nom)}
                </div>
                <h3 className={`font-bold text-bordeaux mb-1 ${enAvant ? "text-xl" : "text-lg"}`}>{nom}</h3>
                <p className="text-sm font-semibold text-gray-500 mb-3">{fonction}</p>
                <p className="text-sm text-gray-600 mb-4">{description}</p>
                {(email || tel) && (
                    <div className="pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-500">
                        {email && (
                            <div className="flex items-center justify-center gap-1.5 hover:text-bordeaux transition-colors">
                                <Mail className="w-3.5 h-3.5" />
                                <a href={`mailto:${email}`}>{email}</a>
                            </div>
                        )}
                        {tel && (
                            <div className="flex items-center justify-center gap-1.5 hover:text-bordeaux transition-colors">
                                <Phone className="w-3.5 h-3.5" />
                                <a href={`tel:${tel.replace(/\s+/g, "")}`}>{tel}</a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
