/**
 * Appellation fraternelle à partir du genre du membre.
 *
 * `genre` vaut 'M', 'F' ou rien (colonne membres.genre, contrainte
 * chk_membres_genre). Tant qu'il n'est pas renseigné, on ne devine pas :
 * l'appellation est simplement omise, ce qui donne « Bonjour, Timothée »
 * au lieu d'un titre potentiellement faux.
 */

export const GENRES = [
    { value: "M", label: "Frère" },
    { value: "F", label: "Sœur" },
];

/** "Frère" | "Sœur" | "" */
export function civilite(genre) {
    const g = (genre || "").trim().toUpperCase();
    if (g === "M") return "Frère";
    if (g === "F") return "Sœur";
    return "";
}

/**
 * Nom précédé de l'appellation : « Frère Timothée ».
 * Sans genre renseigné, renvoie le nom seul.
 */
export function avecCivilite(genre, nom) {
    const titre = civilite(genre);
    if (!nom) return titre;
    return titre ? `${titre} ${nom}` : nom;
}
