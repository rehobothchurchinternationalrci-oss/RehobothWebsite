import React, { useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import {
    LayoutDashboard,
    Users,
    Users2,
    Calendar,
    CheckSquare,
    BookOpen,
    Send,
    Settings,
    LogOut,
    User,
    Church,
    Camera,
    Loader2,
    ChevronDown,
    Search,
    Bell,
    Sun,
    Moon
} from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/api/apiClient";
import config from "@/config";
import { GENRES, avecCivilite } from "@/lib/civilite";
import { Badge } from "@/components/ui/badge";
import { useParametres } from "@/hooks/useParametres";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

export default function DashboardLayout({ children }) {
    const { user, logout, checkAuth } = useAuthStore();
    const { parametres, logoUrl } = useParametres();
    const { isDark, toggle: toggleDarkMode } = useDarkMode();
    const location = useLocation();
    const isChef = user?.role === "CHEF_DEPARTEMENT";
    const deptName = user?.managed_departments?.[0]?.nom;

    const [profileDialogOpen, setProfileDialogOpen] = useState(false);
    const [profileForm, setProfileForm] = useState({ prenom: "", nom: "", photo_url: "", genre: "" });
    const [savingProfile, setSavingProfile] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const openProfileDialog = () => {
        setProfileForm({
            prenom: user?.prenom || "",
            nom: user?.nom || "",
            photo_url: user?.photo_url || "",
            genre: user?.genre || ""
        });
        setProfileDialogOpen(true);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucket", "photos-membres");

        setUploading(true);
        try {
            const token = localStorage.getItem(config.auth.tokenKey);
            const response = await fetch(`${config.api.baseUrl}/auth/upload`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });
            const data = await response.json();
            if (data && data.success) {
                setProfileForm(prev => ({ ...prev, photo_url: data.data.url }));
            } else {
                alert(data.message || "Impossible de charger l'image");
            }
        } catch (err) {
            console.error(err);
            alert("Erreur lors du chargement du fichier");
        } finally {
            setUploading(false);
        }
    };

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            let id = user?.member_id;
            if (!id) {
                const members = await apiClient.entities.Membre.filter({ email: user.email });
                if (members && members.length > 0) {
                    id = members[0].id;
                }
            }
            if (id) {
                const fullMember = await apiClient.entities.Membre.get(id);
                const updatedMember = {
                    ...fullMember,
                    prenom: profileForm.prenom,
                    nom: profileForm.nom,
                    photo_url: profileForm.photo_url,
                    genre: profileForm.genre || null
                };
                await apiClient.entities.Membre.update(id, updatedMember);
                await checkAuth();
                setProfileDialogOpen(false);
            } else {
                alert("Compte membre introuvable");
            }
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la mise à jour du profil");
        } finally {
            setSavingProfile(false);
        }
    };

    const menuItems = [
        { name: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
        { name: "Membres", path: "/dashboard/membres", icon: Users, roles: ['SUPER_ADMIN', 'PASTEUR', 'SECRETAIRE'] },
        { name: "Départements", path: "/dashboard/departements", icon: Users2, roles: ['SUPER_ADMIN', 'PASTEUR', 'SECRETAIRE', 'CHEF_DEPARTEMENT'] },
        { name: "Événements", path: "/dashboard/evenements", icon: Calendar, roles: ['SUPER_ADMIN', 'PASTEUR', 'SECRETAIRE', 'EQUIPE_MEDIA', 'CHEF_DEPARTEMENT'] },
        { name: "Présences", path: "/dashboard/presences", icon: CheckSquare, roles: ['SUPER_ADMIN', 'PASTEUR', 'SECRETAIRE', 'CHEF_DEPARTEMENT'] },
        { name: "Prédications", path: "/dashboard/predications", icon: BookOpen, roles: ['SUPER_ADMIN', 'PASTEUR', 'EQUIPE_MEDIA'] },
        { name: "Communication", path: "/dashboard/communication", icon: Send, roles: ['SUPER_ADMIN', 'PASTEUR', 'SECRETAIRE', 'CHEF_DEPARTEMENT'] },
        { name: "Paramètres", path: "/dashboard/parametres", icon: Settings, roles: ['SUPER_ADMIN', 'PASTEUR'] },
    ];

    const filteredMenuItems = menuItems.filter(item => !item.roles || (user && item.roles.includes(user.role)));

    const isActive = (path) => location.pathname === path;

    const getBreadcrumbName = (pathname) => {
        if (pathname === "/dashboard") return "Tableau de bord";
        if (pathname === "/dashboard/membres") return "Membres";
        if (pathname === "/dashboard/departements") return "Départements";
        if (pathname === "/dashboard/evenements") return "Événements";
        if (pathname === "/dashboard/presences") return "Présences";
        if (pathname === "/dashboard/predications") return "Prédications";
        if (pathname === "/dashboard/communication") return "Communication";
        if (pathname === "/dashboard/parametres") return "Paramètres";
        if (pathname.includes("/workspace")) return "Espace de travail";
        return "";
    };

    const currentBreadcrumb = getBreadcrumbName(location.pathname);

    // Structure shadcn standard : icône + label. En mode réduit (icon rail),
    // la largeur passe à --sidebar-width-icon, le label est masqué et le
    // `tooltip` s'affiche au survol. Pas de padding custom sur le <Link> pour
    // que le repli en icône reste centré.
    const navButtonClass =
        "h-10 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground " +
        "data-[active=true]:bg-[hsl(var(--church-blue)/0.14)] data-[active=true]:text-foreground data-[active=true]:font-bold " +
        "[&[data-active=true]>svg]:text-[hsl(var(--church-gold))]";

    const renderNavItem = (item) => (
        <SidebarMenuItem key={item.path}>
            <SidebarMenuButton asChild isActive={isActive(item.path)} tooltip={item.name} className={navButtonClass}>
                <Link to={item.path}>
                    <item.icon />
                    <span>{item.name}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );

    const settingsItem = filteredMenuItems.find(item => item.path === "/dashboard/parametres");

    return (
        <SidebarProvider>
            <div className="admin-neutral min-h-screen flex w-full bg-background text-foreground">
                {/* Shadcn Sidebar — repli en rail d'icônes */}
                <Sidebar collapsible="icon" className="border-r border-sidebar-border">
                    <SidebarHeader className="h-16 px-4 border-b border-sidebar-border flex flex-row items-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center overflow-hidden border border-border shrink-0">
                                <img src={logoUrl} alt="" className="w-full h-full object-contain p-0.5" />
                            </div>
                            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                                <span className="font-heading font-black text-sm text-sidebar-foreground uppercase tracking-wide leading-none truncate">{parametres.nom}</span>
                                {isChef && deptName ? (
                                    <span className="text-[9px] text-muted-foreground font-bold tracking-wider truncate max-w-[130px] mt-0.5">
                                        {deptName}
                                    </span>
                                ) : (
                                    <span className="text-[9px] text-muted-foreground font-bold tracking-widest uppercase mt-0.5">Admin</span>
                                )}
                            </div>
                        </div>
                    </SidebarHeader>

                    <SidebarContent className="px-3 py-4 space-y-4 group-data-[collapsible=icon]:px-1.5">
                        {/* Navigation groups */}
                        <SidebarGroup>
                            <SidebarGroupLabel className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">Général</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu className="space-y-0.5">
                                    {filteredMenuItems.filter(item => ["/dashboard", "/dashboard/membres", "/dashboard/departements"].includes(item.path)).map(renderNavItem)}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        <SidebarGroup>
                            <SidebarGroupLabel className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">Gestion</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu className="space-y-0.5">
                                    {filteredMenuItems.filter(item => ["/dashboard/evenements", "/dashboard/presences"].includes(item.path)).map(renderNavItem)}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        <SidebarGroup>
                            <SidebarGroupLabel className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">Médias & Com</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu className="space-y-0.5">
                                    {filteredMenuItems.filter(item => ["/dashboard/predications", "/dashboard/communication"].includes(item.path)).map(renderNavItem)}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>

                    <SidebarFooter className="p-2 border-t border-sidebar-border bg-sidebar">
                        <SidebarMenu>
                            {settingsItem && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive(settingsItem.path)} tooltip={settingsItem.name} className="text-muted-foreground hover:bg-accent hover:text-accent-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground">
                                        <Link to={settingsItem.path}>
                                            <Settings />
                                            <span>{settingsItem.name}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}
                            <SidebarMenuItem>
                                <SidebarMenuButton onClick={openProfileDialog} tooltip="Mon Profil" className="text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                    <User />
                                    <span>Mon Profil</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton onClick={logout} tooltip="Déconnexion" className="text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                    <LogOut />
                                    <span>Déconnexion</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarFooter>

                    <SidebarRail />
                </Sidebar>

                {/* Main Content Area */}
                <SidebarInset className="flex-1 flex flex-col min-w-0 bg-background">
                    {/* Header bar styled like shadcn block header */}
                    <header className="h-16 border-b border-border bg-background/70 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30 w-full shrink-0">
                        <div className="flex items-center gap-3">
                            <SidebarTrigger className="text-muted-foreground p-1 -ml-1 h-8 w-8 hover:bg-accent rounded-lg" />
                            <Separator orientation="vertical" className="h-4 bg-border" />
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink asChild>
                                            <span className="text-xs font-semibold text-muted-foreground">Rehoboth</span>
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    {currentBreadcrumb && (
                                        <>
                                            <BreadcrumbSeparator className="text-muted-foreground/60" />
                                            <BreadcrumbItem>
                                                <BreadcrumbPage className="text-xs font-black text-foreground">
                                                    {currentBreadcrumb}
                                                </BreadcrumbPage>
                                            </BreadcrumbItem>
                                        </>
                                    )}
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>

                        {/* Search, Notifications & User info */}
                        <div className="flex items-center gap-4 ml-auto">
                            <div className="relative w-60 hidden sm:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input type="search" placeholder="Rechercher..." className="pl-9 h-8 rounded-lg border-border bg-muted/30 text-xs font-medium focus-visible:ring-ring/20" />
                            </div>

                            <button
                                onClick={toggleDarkMode}
                                aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
                                title={isDark ? "Mode clair" : "Mode sombre"}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg shrink-0 focus:outline-none"
                            >
                                {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                            </button>

                            <button className="relative p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg shrink-0 focus:outline-none">
                                <Bell className="w-4.5 h-4.5" />
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-foreground" />
                            </button>

                            <button
                                onClick={openProfileDialog}
                                className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-accent shrink-0 focus:outline-none"
                            >
                                <div className="w-7 h-7 rounded-full bg-muted text-foreground flex items-center justify-center font-semibold text-xs overflow-hidden shrink-0">
                                    {user?.photo_url ? (
                                        <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        user?.prenom?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()
                                    )}
                                </div>
                                <span className="hidden md:inline-block font-medium text-foreground text-sm">
                                    {user?.prenom || user?.nom
                                        ? avecCivilite(user.genre, `${user.prenom || ''} ${user.nom || ''}`.trim())
                                        : user?.email}
                                </span>
                            </button>
                        </div>
                    </header>

                    {/* Page Content */}
                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </SidebarInset>
            </div>

            {/* Profile Dialog */}
            <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl overflow-hidden p-0 border border-border shadow-2xl">
                    <div className="bg-primary p-6 text-primary-foreground text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Church className="w-36 h-36" />
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-heading font-black tracking-tight text-primary-foreground">Mon Profil Rehoboth</DialogTitle>
                        </DialogHeader>
                        <p className="text-primary-foreground/80 text-xs mt-1.5 font-light">Gérez votre photo et vos informations personnelles.</p>
                    </div>

                    <div className="space-y-5 p-6 bg-card">
                        {/* Profile Photo Upload */}
                        <div className="flex flex-col items-center gap-3.5">
                            <div className="relative w-24 h-24 rounded-full bg-muted text-foreground flex items-center justify-center font-black text-2xl overflow-hidden border-4 border-border group shadow-inner">
                                {profileForm.photo_url ? (
                                    <img src={profileForm.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    profileForm.prenom?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                                        <Loader2 className="w-7 h-7 animate-spin text-white" />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading || savingProfile}
                                    className="h-9 rounded-xl text-xs font-semibold border-border"
                                >
                                    <Camera className="w-4 h-4 mr-1.5" />
                                    Changer la photo
                                </Button>
                                {profileForm.photo_url && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-750 hover:bg-red-50 h-9 rounded-xl text-xs font-semibold"
                                        onClick={() => setProfileForm(prev => ({ ...prev, photo_url: "" }))}
                                        disabled={uploading || savingProfile}
                                    >
                                        Supprimer
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Adresse email (Lecture seule)</Label>
                            <Input value={user?.email || ""} disabled className="bg-gray-50 text-gray-500 rounded-xl h-11 border-gray-150" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Prénom</Label>
                                <Input
                                    value={profileForm.prenom}
                                    onChange={e => setProfileForm(prev => ({ ...prev, prenom: e.target.value }))}
                                    disabled={savingProfile || uploading}
                                    className="rounded-xl h-11 border-border focus:border-ring focus:ring-ring/20"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nom</Label>
                                <Input
                                    value={profileForm.nom}
                                    onChange={e => setProfileForm(prev => ({ ...prev, nom: e.target.value }))}
                                    disabled={savingProfile || uploading}
                                    className="rounded-xl h-11 border-border focus:border-ring focus:ring-ring/20"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Appellation</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {GENRES.map(g => (
                                    <button
                                        key={g.value}
                                        type="button"
                                        disabled={savingProfile || uploading}
                                        onClick={() => setProfileForm(prev => ({
                                            ...prev,
                                            genre: prev.genre === g.value ? "" : g.value
                                        }))}
                                        className={`h-11 rounded-xl border font-semibold text-sm transition-colors ${
                                            profileForm.genre === g.value
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border text-muted-foreground hover:bg-secondary"
                                        }`}
                                    >
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Utilisée pour vous accueillir : « Bonjour, {avecCivilite(profileForm.genre, profileForm.prenom || "…")} ».
                            </p>
                        </div>

                        <Button
                            onClick={handleSaveProfile}
                            disabled={savingProfile || uploading || !profileForm.prenom || !profileForm.nom}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-12 rounded-xl shadow-md mt-3"
                        >
                            {savingProfile ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Enregistrement...
                                </>
                            ) : (
                                "Enregistrer les modifications"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </SidebarProvider>
    );
}
