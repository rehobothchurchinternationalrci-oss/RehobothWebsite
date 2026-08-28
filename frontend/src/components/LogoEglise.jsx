import React, { useEffect, useState } from "react";
import logoParDefaut from "@/images/logo.jpeg";
import { useParametres } from "@/hooks/useParametres";

/**
 * Logo de l'église, à utiliser partout plutôt qu'un <img> sur le fichier local.
 *
 * Affiche le logo configuré dans /dashboard/parametres et retombe sur celui
 * livré avec l'application dès que celui-ci pose problème : URL injoignable,
 * 404, hotlink refusé par le serveur distant. Sans ce repli, le navigateur
 * affiche une icône d'image brisée à la place de l'identité de l'église, sur
 * toutes les pages à la fois puisque le logo est dans l'en-tête.
 */
export default function LogoEglise({ className = "", alt = "" }) {
    const { logoUrl } = useParametres();
    const [source, setSource] = useState(logoUrl);

    // `logoUrl` vaut d'abord le logo par défaut, puis la valeur des paramètres
    // une fois la requête revenue : sans cette synchronisation, un logo
    // personnalisé ne remplacerait jamais celui du premier rendu.
    useEffect(() => setSource(logoUrl), [logoUrl]);

    return (
        <img
            src={source}
            alt={alt}
            className={className}
            onError={() => setSource(logoParDefaut)}
        />
    );
}
