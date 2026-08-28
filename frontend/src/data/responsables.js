/**
 * Équipe pastorale affichée sur la page « À propos ».
 *
 * Liste maintenue dans le code : elle change rarement et n'a pas d'écran de
 * gestion dans le dashboard. Pour ajouter ou retirer un responsable, éditer
 * ce tableau puis redéployer le frontend.
 *
 * Champs :
 *   nom          — affiché tel quel, civilité comprise ("Pasteur Untel")
 *   fonction     — intitulé affiché sous le nom
 *   description  — une ou deux phrases de présentation
 *   email, tel   — optionnels ; le bloc de contact disparaît si les deux manquent
 *   miseEnAvant  — true place la personne dans la carte large, seule, en haut
 */
export const responsables = [
    {
        nom: "Pasteur Samuel Marhegane",
        fonction: "Visionnaire",
        description:
            "Porteur de la vision de Rehoboth, il veille sur l'orientation spirituelle de l'œuvre.",
        miseEnAvant: true,
    },
    {
        nom: "Pasteur Henoc Kaniki",
        fonction: "Pasteur résident",
        description:
            "Assure la conduite pastorale quotidienne et l'accompagnement de la communauté.",
    },
    {
        nom: "Pasteur Henock Ngitukulu",
        fonction: "Pasteur",
        description:
            "Engagé dans l'enseignement de la Parole et le service de la communauté.",
    },
    {
        nom: "Pasteur Joshua Kipulu",
        fonction: "Pasteur",
        description:
            "Engagé dans l'enseignement de la Parole et le service de la communauté.",
    },
];
