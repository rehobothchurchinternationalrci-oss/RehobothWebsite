import {
    Baby, BookOpen, Church, ConciergeBell, Drama, HandCoins, Handshake,
    HeartHandshake, Languages, Megaphone, Mic, Music, PenLine, Sparkles,
    Users, Video,
} from "lucide-react";

/**
 * Identité visuelle d'un département : une icône propre à chacun et sa
 * couleur, pour que les cartes ne soient plus neuf fois le même pictogramme.
 *
 * La table `departements` porte une colonne `icone` (migration 001) restée
 * vide sur les départements semés par la migration 005 : la reconnaissance se
 * fait donc d'abord sur cette colonne si elle est renseignée, puis sur le nom,
 * puis sur le type. `Users` reste le repli pour tout département créé plus
 * tard depuis le tableau de bord.
 */

// Clés normalisées : minuscules, sans accents ni séparateurs.
const PAR_NOM = {
    chorale: Music,
    louange: Music,
    louangeetadoration: Music,
    protocol: ConciergeBell,
    protocole: ConciergeBell,
    media: Video,
    medias: Video,
    evangelisation: Megaphone,
    social: HeartHandshake,
    drama: Drama,
    theatre: Drama,
    redaction: PenLine,
    partenaire: Handshake,
    partenariat: Handshake,
    interpretariat: Languages,
    traduction: Languages,
    intercession: Church,
    priere: Church,
    enseignement: BookOpen,
    ecoledudimanche: Baby,
    enfants: Baby,
    jeunesse: Sparkles,
    finances: HandCoins,
    sonorisation: Mic,
};

const PAR_TYPE = {
    chorale: Music,
    jeunesse: Sparkles,
    cellule: Users,
    equipe_service: Users,
    autre: Users,
};

function normaliser(valeur) {
    return (valeur || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

export function iconeDepartement(departement = {}) {
    const { icone, nom, type } = departement;
    return PAR_NOM[normaliser(icone)]
        || PAR_NOM[normaliser(nom)]
        || PAR_TYPE[normaliser(type)]
        || Users;
}

/**
 * Variables CSS de la couleur du département, à poser en `style` sur la carte :
 * les classes utilitaires (`bg-[var(--dep-soft)]`, `text-[var(--dep)]`…) s'en
 * servent ensuite, y compris dans les états `group-hover` qu'un style inline ne
 * saurait pas exprimer. Repli sur le bordeaux du thème si `couleur` est vide ou
 * mal formée.
 */
export function couleursDepartement(couleur) {
    const hex = /^#([0-9a-f]{6})$/i.exec((couleur || "").trim());
    if (!hex) {
        return { "--dep": "hsl(var(--bordeaux))", "--dep-soft": "hsl(var(--bordeaux) / 0.1)" };
    }
    const [r, g, b] = [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16));
    return { "--dep": `rgb(${r} ${g} ${b})`, "--dep-soft": `rgba(${r}, ${g}, ${b}, 0.1)` };
}
