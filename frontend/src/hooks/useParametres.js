import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/apiClient";
import logoParDefaut from "@/images/logo.jpeg";

/**
 * Source unique des paramètres de l'église (table `eglise_parametres`).
 *
 * Toutes les surfaces du site — en-tête, pied de page, pages publiques,
 * dashboard — lisent ces valeurs via ce hook plutôt que de les coder en dur
 * ou de refaire leur propre appel API. React Query dédoublonne la requête :
 * un seul aller-retour réseau quel que soit le nombre de composants qui
 * l'utilisent, et l'invalidation du cache après un enregistrement dans
 * /dashboard/parametres rafraîchit tout l'écran d'un coup.
 */
export const PARAMETRES_QUERY_KEY = ["eglise-parametres"];

/** Valeurs affichées tant que l'église n'a rien saisi dans les paramètres. */
const DEFAUTS = {
    nom: "Rehoboth Church International",
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
    logo_url: "",
};

/**
 * Retire les champs vides du enregistrement pour que les valeurs par défaut
 * prennent le relais : en base, un champ jamais rempli vaut `null` ou `""`,
 * et afficher une chaîne vide serait pire que le texte de repli.
 */
function sansValeursVides(record) {
    if (!record) return {};
    return Object.fromEntries(
        Object.entries(record).filter(
            ([, v]) => v !== null && v !== undefined && String(v).trim() !== ""
        )
    );
}

// Services d'images de remplacement. Ces hôtes ne servent que des visuels
// génériques (un rectangle gris légendé) : une telle URL en base est un reste
// de données de test, jamais le vrai logo de l'église. On l'ignore, sinon elle
// masque le logo livré avec l'application.
const HOTES_IMAGE_FACTICE = [
    "placehold.co",
    "placeholder.com",
    "dummyimage.com",
    "placekitten.com",
    "picsum.photos",
];

function estImageFactice(url) {
    try {
        const hote = new URL(url).hostname.replace(/^www\./, "");
        return HOTES_IMAGE_FACTICE.some(h => hote === h || hote.endsWith(`.${h}`));
    } catch {
        // Pas une URL absolue (chemin relatif, saisie incomplète) : on laisse
        // passer, le repli à l'affichage prendra le relais si elle est cassée.
        return false;
    }
}

export function useParametres() {
    const { data, isLoading, isError } = useQuery({
        queryKey: PARAMETRES_QUERY_KEY,
        queryFn: async () => {
            const liste = await apiClient.entities.EgliseParametres.list();
            return Array.isArray(liste) && liste.length ? liste[0] : null;
        },
        // Les paramètres changent rarement : inutile de refetch à chaque
        // navigation entre pages.
        staleTime: 5 * 60 * 1000,
    });

    const parametres = { ...DEFAUTS, ...sansValeursVides(data) };

    // "15 Avenue de l'Espérance, 75019 Paris" — en omettant la partie absente.
    const adresseComplete = [parametres.adresse, parametres.ville]
        .filter(Boolean)
        .join(", ");

    // Seuls les réseaux réellement renseignés sont exposés, pour que les
    // layouts n'aient pas à filtrer eux-mêmes.
    const reseaux = [
        { cle: "facebook", label: "Facebook", url: parametres.facebook },
        { cle: "youtube", label: "YouTube", url: parametres.youtube },
        { cle: "instagram", label: "Instagram", url: parametres.instagram },
        { cle: "site_web", label: "Site web", url: parametres.site_web },
    ].filter((r) => Boolean(r.url));

    return {
        parametres,
        /** L'enregistrement brut, sans valeurs de repli (null si aucun). */
        enregistrement: data ?? null,
        adresseComplete,
        reseaux,
        /** Logo configuré, sinon le logo livré avec l'application. */
        logoUrl:
            parametres.logo_url && !estImageFactice(parametres.logo_url)
                ? parametres.logo_url
                : logoParDefaut,
        isLoading,
        isError,
    };
}
