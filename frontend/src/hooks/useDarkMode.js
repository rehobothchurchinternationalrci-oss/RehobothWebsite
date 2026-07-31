import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'admin_theme';

/**
 * Mode sombre limité à l'espace admin.
 *
 * La classe `dark` est posée sur <html> tant que le composant qui appelle
 * ce hook est monté (le DashboardLayout), et retirée au démontage : le site
 * public n'est donc jamais affecté, et les portails Radix (dialogs, popovers,
 * rendus hors de l'arbre du dashboard) héritent bien du thème.
 */
export function useDarkMode() {
    const [isDark, setIsDark] = useState(
        () => typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'dark'
    );

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('dark', isDark);
        localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');

        // Nettoyage : on quitte le dashboard → retour au thème clair du site public
        return () => root.classList.remove('dark');
    }, [isDark]);

    const toggle = useCallback(() => setIsDark(prev => !prev), []);

    return { isDark, toggle };
}
