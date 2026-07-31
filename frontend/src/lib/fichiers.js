import config from "@/config";

/**
 * Ouvre un fichier stocké dans Supabase Storage.
 *
 * Les buckets publics (photos, images d'événements, médias) donnent une URL
 * permanente : on l'ouvre telle quelle. Le bucket `documents` est privé, la
 * base ne contient donc que le CHEMIN du fichier — il faut demander au backend
 * une URL signée fraîche à chaque consultation, celles-ci expirant au bout
 * d'une heure.
 */
export async function ouvrirFichier(valeur, bucket = "documents") {
    if (!valeur) return;

    // Déjà une URL complète (bucket public, ou ancien fichier /static/uploads)
    if (/^https?:\/\//i.test(valeur)) {
        window.open(valeur, "_blank", "noopener,noreferrer");
        return;
    }

    const token = localStorage.getItem(config.auth.tokenKey);
    const res = await fetch(`${config.api.baseUrl}/auth/file-url`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ bucket, path: valeur }),
    });

    const data = await res.json();
    if (data?.success && data.data?.url) {
        window.open(data.data.url, "_blank", "noopener,noreferrer");
    } else {
        alert(data?.message || "Fichier introuvable");
    }
}
