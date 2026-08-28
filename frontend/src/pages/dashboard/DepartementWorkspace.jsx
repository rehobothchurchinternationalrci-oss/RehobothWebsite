import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import { useAuthStore } from "@/store/authStore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    Calendar,
    Clock,
    MapPin,
    Send,
    FileText,
    FolderOpen,
    Plus,
    Trash2,
    Check,
    Loader2,
    ChevronLeft,
    CheckCircle,
    UserCheck,
    Mail,
    FileUp,
    AlertCircle,
    DownloadCloud,
    Link2,
    Copy
} from "lucide-react";
import config from "@/config";
import { ouvrirFichier } from "@/lib/fichiers";

const TYPE_LABELS = {
    cellule: "Cellule de prière",
    equipe_service: "Équipe de service",
    chorale: "Chorale & Louange",
    jeunesse: "Jeunesse",
    autre: "Autre"
};

export default function DepartementWorkspace({ id: propId, isDashboard = false }) {
    const { id: paramId } = useParams();
    const id = propId || paramId;
    const { user } = useAuthStore();
    const isAdmin = ["SUPER_ADMIN", "PASTEUR", "SECRETAIRE"].includes(user?.role);

    const [departement, setDepartement] = useState(null);
    const [loadingDept, setLoadingDept] = useState(true);

    // Tab 1: Membres
    const [deptMembres, setDeptMembres] = useState([]);
    const [allMembres, setAllMembres] = useState([]);
    const [loadingMembres, setLoadingMembres] = useState(true);
    const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
    const [selectedMemberToAdd, setSelectedMemberToAdd] = useState("");
    const [addingMember, setAddingMember] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [promotingId, setPromotingId] = useState(null);
    const [chefStatus, setChefStatus] = useState(null);

    // Tab 2: Réunions & Présences
    const [reunions, setReunions] = useState([]);
    const [loadingReunions, setLoadingReunions] = useState(true);
    const [createReunionDialogOpen, setCreateReunionDialogOpen] = useState(false);
    const [reunionForm, setReunionForm] = useState({ titre: "", description: "", date_reunion: "", lieu: "", is_en_ligne: false, lien_reunion: "" });
    const [creatingReunion, setCreatingReunion] = useState(false);

    // Presence Dialog
    const [presenceDialogOpen, setPresenceDialogOpen] = useState(false);
    const [activeReunion, setActiveReunion] = useState(null);
    const [presenceList, setPresenceList] = useState([]);
    const [loadingPresences, setLoadingPresences] = useState(false);
    const [savingPresences, setSavingPresences] = useState(false);

    // Tab 3: Communication
    const [notificationForm, setNotificationForm] = useState({ sujet: "", contenu: "" });
    const [sendingNotification, setSendingNotification] = useState(false);
    const [notificationStatus, setNotificationStatus] = useState(null);

    // Tab 4: Rapports
    const [rapports, setRapports] = useState([]);
    const [loadingRapports, setLoadingRapports] = useState(true);
    const [submitRapportDialogOpen, setSubmitRapportDialogOpen] = useState(false);
    const [rapportForm, setRapportForm] = useState({ mois: String(new Date().getMonth() + 1), annee: String(new Date().getFullYear()), contenu: "" });
    const [submittingRapport, setSubmittingRapport] = useState(false);

    // Tab 5: Ressources
    const [documents, setDocuments] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [docForm, setDocForm] = useState({ nom: "", description: "", fichier_url: "", type_mime: "" });
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [savingDoc, setSavingDoc] = useState(false);
    const docInputRef = useRef(null);

    const loadDeptDetails = async () => {
        try {
            const d = await apiClient.entities.Departement.get(id);
            setDepartement(d);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDept(false);
        }
    };

    const loadMembres = async () => {
        setLoadingMembres(true);
        try {
            const list = await apiClient.entities.Departement.getMembres(id);
            setDeptMembres(list);

            if (isAdmin || user?.role === "CHEF_DEPARTEMENT") {
                const all = await apiClient.entities.Membre.list("nom");
                const addedIds = list.map(m => m.id);
                setAllMembres(all.filter(m => !addedIds.includes(m.id)));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingMembres(false);
        }
    };

    const loadReunions = async () => {
        setLoadingReunions(true);
        try {
            const list = await apiClient.entities.Departement.getReunions(id);
            setReunions(list);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingReunions(false);
        }
    };

    const loadRapports = async () => {
        setLoadingRapports(true);
        try {
            const list = await apiClient.entities.Departement.getRapports(id);
            setRapports(list);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingRapports(false);
        }
    };

    const loadDocuments = async () => {
        setLoadingDocs(true);
        try {
            const list = await apiClient.entities.Departement.getDocuments(id);
            setDocuments(list);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDocs(false);
        }
    };

    useEffect(() => {
        loadDeptDetails();
        loadMembres();
        loadReunions();
        loadRapports();
        loadDocuments();
    }, [id]);

    const copyJoinLink = () => {
        const link = `${window.location.origin}/departements/${id}/rejoindre`;
        navigator.clipboard.writeText(link)
            .then(() => {
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
            })
            .catch(err => console.error("Could not copy text: ", err));
    };

    const handleAddMember = async () => {
        if (!selectedMemberToAdd) return;
        setAddingMember(true);
        try {
            await apiClient.entities.Departement.addMembre(id, selectedMemberToAdd);
            setAddMemberDialogOpen(false);
            setSelectedMemberToAdd("");
            loadMembres();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'ajout du membre");
        } finally {
            setAddingMember(false);
        }
    };

    // Désigner un chef ouvre un accès : le backend crée le compte s'il n'existe
    // pas et envoie ses identifiants. D'où la confirmation explicite.
    const handleSetChef = async (membre) => {
        if (!membre.email) {
            setChefStatus({
                success: false,
                message: `${membre.prenom} ${membre.nom} n'a pas d'adresse email : renseignez-la dans sa fiche membre pour pouvoir lui créer un accès.`
            });
            return;
        }
        if (!confirm(
            `Désigner ${membre.prenom} ${membre.nom} comme chef responsable de ce département ?\n\n` +
            `Un accès à cet espace de travail lui sera ouvert et ses identifiants de connexion seront envoyés à ${membre.email}.`
        )) return;

        setPromotingId(membre.id);
        setChefStatus(null);
        try {
            const res = await apiClient.entities.Departement.setChef(id, membre.id);
            const data = res?.data ?? res;
            await Promise.all([loadDeptDetails(), loadMembres()]);
            setChefStatus({ success: true, message: data?.message || "Chef de département désigné." });
        } catch (err) {
            console.error(err);
            setChefStatus({ success: false, message: err?.message || "Erreur lors de la désignation du chef" });
        } finally {
            setPromotingId(null);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!confirm("Retirer ce membre de ce département ?")) return;
        try {
            await apiClient.entities.Departement.removeMembre(id, memberId);
            loadMembres();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la suppression du membre");
        }
    };

    const handleCreateReunion = async () => {
        if (!reunionForm.titre || !reunionForm.date_reunion) return;
        setCreatingReunion(true);
        try {
            await apiClient.entities.Departement.createReunion(id, reunionForm);
            setCreateReunionDialogOpen(false);
            setReunionForm({ titre: "", description: "", date_reunion: "", lieu: "", is_en_ligne: false, lien_reunion: "" });
            loadReunions();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la création de la réunion");
        } finally {
            setCreatingReunion(false);
        }
    };

    const openPresences = async (reunion) => {
        setActiveReunion(reunion);
        setPresenceDialogOpen(true);
        setLoadingPresences(true);
        try {
            const list = await apiClient.entities.Departement.getReunionPresences(id, reunion.id);
            setPresenceList(list);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingPresences(false);
        }
    };

    const handleStatutChange = (membreId, statut) => {
        setPresenceList(prev => prev.map(p => p.membre_id === membreId ? { ...p, statut } : p));
    };

    const handleNoteChange = (membreId, note) => {
        setPresenceList(prev => prev.map(p => p.membre_id === membreId ? { ...p, note } : p));
    };

    const handleSavePresences = async () => {
        setSavingPresences(true);
        try {
            await apiClient.entities.Departement.saveReunionPresences(id, activeReunion.id, presenceList);
            setPresenceDialogOpen(false);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la sauvegarde des présences");
        } finally {
            setSavingPresences(false);
        }
    };

    const handleSendNotification = async (e) => {
        e.preventDefault();
        if (!notificationForm.sujet || !notificationForm.contenu) return;
        setSendingNotification(true);
        setNotificationStatus(null);
        try {
            const res = await apiClient.entities.Departement.sendNotifications(id, notificationForm.sujet, notificationForm.contenu);
            setNotificationStatus({ success: true, message: res.message || "Message envoyé avec succès" });
            setNotificationForm({ sujet: "", contenu: "" });
        } catch (err) {
            console.error(err);
            setNotificationStatus({ success: false, message: "Erreur lors de l'envoi de la notification" });
        } finally {
            setSendingNotification(false);
        }
    };

    const handleSubmitRapport = async () => {
        if (!rapportForm.contenu) return;
        setSubmittingRapport(true);
        try {
            await apiClient.entities.Departement.submitRapport(id, {
                mois: parseInt(rapportForm.mois),
                annee: parseInt(rapportForm.annee),
                contenu: rapportForm.contenu
            });
            setSubmitRapportDialogOpen(false);
            setRapportForm({ mois: String(new Date().getMonth() + 1), annee: String(new Date().getFullYear()), contenu: "" });
            loadRapports();
        } catch (err) {
            console.error(err);
            alert(err.message || "Erreur lors de la soumission du rapport");
        } finally {
            setSubmittingRapport(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucket", "documents");

        setUploadingDoc(true);
        try {
            const token = localStorage.getItem(config.auth.tokenKey);
            const response = await fetch(`${config.api.baseUrl}/auth/upload`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });
            const res = await response.json();
            if (res.success) {
                setDocForm(prev => ({
                    ...prev,
                    nom: file.name,
                    // Bucket privé : on garde le chemin, l'URL signée expire.
                    fichier_url: res.data.public ? res.data.url : res.data.path,
                    type_mime: file.type || "application/octet-stream"
                }));
            } else {
                alert("Erreur de chargement");
            }
        } catch (err) {
            console.error(err);
            alert("Erreur de réseau");
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleSaveDoc = async () => {
        if (!docForm.nom || !docForm.fichier_url) return;
        setSavingDoc(true);
        try {
            await apiClient.entities.Departement.addDocument(id, docForm);
            setUploadDialogOpen(false);
            setDocForm({ nom: "", description: "", fichier_url: "", type_mime: "" });
            loadDocuments();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la sauvegarde du document");
        } finally {
            setSavingDoc(false);
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!confirm("Supprimer cette ressource ?")) return;
        try {
            await apiClient.entities.Departement.deleteDocument(id, docId);
            loadDocuments();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la suppression de la ressource");
        }
    };

    if (loadingDept) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground animate-pulse">Chargement de votre espace de travail...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
                {/* En-tête */}
                <div className="flex flex-col gap-4 border-b pb-6 border-border">
                    {!isDashboard && (
                        <div className="flex items-center gap-2">
                            <Link to="/dashboard/departements" className="text-muted-foreground hover:text-foreground flex items-center text-xs font-bold uppercase tracking-wider">
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Retour aux départements
                            </Link>
                        </div>
                    )}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-1">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                                    {departement?.nom}
                                </h1>
                                <Badge variant="secondary" className="font-medium">
                                    Espace de travail
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Type : <strong className="text-foreground font-medium">{TYPE_LABELS[departement?.type] || departement?.type}</strong> · Chef : <strong className="text-foreground font-medium">{departement?.responsable_nom || "Non assigné"}</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Onglets */}
                <Tabs defaultValue="membres" className="w-full space-y-6">
                    <TabsList className="flex flex-wrap h-auto gap-1">
                        <TabsTrigger value="membres" className="flex items-center gap-2"><Users className="w-4 h-4" /> Membres ({deptMembres.length})</TabsTrigger>
                        <TabsTrigger value="reunions" className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Réunions & Présences</TabsTrigger>
                        <TabsTrigger value="communication" className="flex items-center gap-2"><Mail className="w-4 h-4" /> Communication</TabsTrigger>
                        <TabsTrigger value="rapports" className="flex items-center gap-2"><FileText className="w-4 h-4" /> Rapports ({rapports.length})</TabsTrigger>
                        <TabsTrigger value="ressources" className="flex items-center gap-2"><FolderOpen className="w-4 h-4" /> Ressources ({documents.length})</TabsTrigger>
                    </TabsList>

                    {/* TAB 1: MEMBERS */}
                    <TabsContent value="membres" className="focus-visible:outline-none">
                        {/* Lien d'adhésion publique */}
                        <div className="mb-6 p-5 rounded-xl bg-muted/50 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                    <Link2 className="w-4 h-4" /> Lien d'adhésion publique
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    Partagez ce lien avec les fidèles pour qu'ils rejoignent directement le département.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono select-all text-muted-foreground max-w-[200px] md:max-w-xs truncate">
                                    {window.location.origin}/departements/{id}/rejoindre
                                </span>
                                <Button
                                    variant="outline"
                                    onClick={copyJoinLink}
                                    className="rounded-lg text-xs font-semibold shrink-0 h-10 px-4 flex items-center gap-1.5"
                                >
                                    {copiedLink ? (
                                        <><Check className="w-4 h-4" /> Copié !</>
                                    ) : (
                                        <><Copy className="w-4 h-4" /> Copier</>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {chefStatus && (
                            <div className={`mb-6 p-4 rounded-xl border text-sm flex items-start gap-2.5 ${chefStatus.success
                                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                : "bg-destructive/5 border-destructive/20 text-destructive"}`}>
                                {chefStatus.success
                                    ? <CheckCircle className="w-4.5 h-4.5 shrink-0 mt-px" />
                                    : <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-px" />}
                                <span>{chefStatus.message}</span>
                            </div>
                        )}

                        <Card className="rounded-xl">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
                                <div>
                                    <CardTitle className="font-heading font-extrabold text-xl text-foreground">Membres inscrits</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">Inscrire des fidèles aux activités et à l'administration du département.</CardDescription>
                                </div>
                                <Button onClick={() => setAddMemberDialogOpen(true)} className="rounded-xl font-bold h-10 shadow-sm">
                                    <Plus className="w-4.5 h-4.5 mr-1.5" /> Inscrire un membre
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loadingMembres ? (
                                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                                ) : deptMembres.length === 0 ? (
                                    <div className="text-center py-20 px-4">
                                        <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                                        <h4 className="font-heading text-lg font-bold text-foreground">Aucun membre dans ce département</h4>
                                        <p className="text-sm text-muted-foreground mt-1 mb-6">Ajoutez les premiers membres pour pouvoir planifier les activités et faire l'appel.</p>
                                        <Button onClick={() => setAddMemberDialogOpen(true)} className="rounded-xl">
                                            <Plus className="w-4 h-4 mr-1.5" /> Ajouter un membre
                                        </Button>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-gray-50/70">
                                            <TableRow>
                                                <TableHead className="font-bold text-foreground h-12 px-6">Identité</TableHead>
                                                <TableHead className="font-bold text-foreground h-12 px-6">Email</TableHead>
                                                <TableHead className="font-bold text-foreground h-12 px-6">Téléphone</TableHead>
                                                <TableHead className="font-bold text-foreground h-12 px-6">Statut / Rôle</TableHead>
                                                <TableHead className="font-bold text-foreground h-12 px-6 text-right w-56"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {deptMembres.map(m => (
                                                <TableRow key={m.id} className="hover:bg-gray-50/50 border-b border-gray-100">
                                                    <TableCell className="px-6 py-4 font-semibold text-foreground flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-bordeaux/10 text-bordeaux flex items-center justify-center font-bold overflow-hidden shadow-inner border border-bordeaux/5">
                                                            {m.photo_url ? (
                                                                <img src={m.photo_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                m.prenom.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-extrabold">{m.prenom} {m.nom}</div>
                                                            <div className="text-[10px] text-muted-foreground font-light">ID: {m.id.substring(0, 8)}...</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">{m.email || "-"}</TableCell>
                                                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">{m.telephone || "-"}</TableCell>
                                                    <TableCell className="px-6 py-4">
                                                        {m.est_chef ? (
                                                            <Badge variant="secondary" className="font-bold text-xs rounded-full">Chef Responsable</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-muted-foreground border-gray-200 text-xs rounded-full">Membre</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 text-right">
                                                        {!m.est_chef && (
                                                            <div className="flex items-center justify-end gap-1">
                                                                {isAdmin && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        disabled={promotingId !== null}
                                                                        className="h-8 rounded-xl text-xs font-semibold"
                                                                        onClick={() => handleSetChef(m)}
                                                                        title="Créer son accès et lui confier la gestion du département"
                                                                    >
                                                                        {promotingId === m.id ? (
                                                                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Envoi…</>
                                                                        ) : (
                                                                            <><UserCheck className="w-3.5 h-3.5 mr-1.5" /> Désigner chef</>
                                                                        )}
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                                                                    onClick={() => handleRemoveMember(m.id)}
                                                                >
                                                                    <Trash2 className="w-4.5 h-4.5" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 2: MEETINGS & ATTENDANCE */}
                    <TabsContent value="reunions" className="focus-visible:outline-none">
                        <Card className="rounded-xl">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
                                <div>
                                    <CardTitle className="font-heading font-extrabold text-xl text-foreground">Réunions du département</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">Programmez les réunions de travail ou de prière et gérez la présence des membres.</CardDescription>
                                </div>
                                <Button onClick={() => setCreateReunionDialogOpen(true)} className="rounded-xl font-bold h-10 shadow-sm">
                                    <Plus className="w-4.5 h-4.5 mr-1.5" /> Planifier une réunion
                                </Button>
                            </CardHeader>
                            <CardContent className="p-6">
                                {loadingReunions ? (
                                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                                ) : reunions.length === 0 ? (
                                    <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                                        <Calendar className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                                        <h4 className="font-heading text-lg font-bold text-foreground">Aucune réunion au calendrier</h4>
                                        <p className="text-sm text-muted-foreground mt-1 mb-6">Commencez par planifier une réunion de service pour rassembler vos membres.</p>
                                        <Button onClick={() => setCreateReunionDialogOpen(true)} className="rounded-xl">
                                            <Plus className="w-4 h-4 mr-1.5" /> Planifier la première réunion
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {reunions.map(r => (
                                            <div 
                                                key={r.id} 
                                                className="p-5 border border-gray-150 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white"
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-heading font-extrabold text-lg text-foreground leading-snug">{r.titre}</h4>
                                                        {r.is_en_ligne && (
                                                            <Badge variant="secondary" className="text-[10px] rounded-full">Visioconférence</Badge>
                                                        )}
                                                    </div>
                                                    {r.description && <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed max-w-2xl">{r.description}</p>}
                                                    <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1.5 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1.5">
                                                            <Clock className="w-4 h-4 text-muted-foreground" /> 
                                                            {r.date_reunion ? new Date(r.date_reunion).toLocaleString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Date non définie"}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <MapPin className="w-4 h-4 text-muted-foreground" /> 
                                                            {r.is_en_ligne ? (
                                                                <a href={r.lien_reunion} target="_blank" rel="noopener noreferrer" className="text-foreground underline font-semibold">Rejoindre la réunion en ligne</a>
                                                            ) : (
                                                                r.lieu || "Lieu non spécifié"
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="bg-secondary text-secondary-foreground rounded-xl font-bold h-10 px-4 flex items-center gap-1.5 shrink-0"
                                                    onClick={() => openPresences(r)}
                                                >
                                                    <UserCheck className="w-4.5 h-4.5" /> Faire l'appel (Présences)
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 3: COMMUNICATION */}
                    <TabsContent value="communication" className="focus-visible:outline-none">
                        <Card className="rounded-xl max-w-3xl">
                            <CardHeader className="border-b border-border">
                                <CardTitle className="font-heading font-extrabold text-xl text-foreground">Envoi de notification de masse</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Un e-mail sera envoyé instantanément à l'ensemble des membres inscrits dans votre département.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <form onSubmit={handleSendNotification} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sujet de l'email *</Label>
                                        <Input
                                            placeholder="Ex: Rappel important : Répétition générale ce samedi"
                                            className="rounded-xl border-gray-200 h-11"
                                            value={notificationForm.sujet}
                                            onChange={e => setNotificationForm(prev => ({ ...prev, sujet: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contenu du message *</Label>
                                        <Textarea
                                            placeholder="Bonjour à tous, ..."
                                            rows={6}
                                            className="rounded-xl border-gray-200"
                                            value={notificationForm.contenu}
                                            onChange={e => setNotificationForm(prev => ({ ...prev, contenu: e.target.value }))}
                                            required
                                        />
                                    </div>

                                    {notificationStatus && (
                                        <div className={`p-4 rounded-xl text-sm flex items-start gap-2.5 ${notificationStatus.success ? "bg-green-50 text-green-800 border border-green-150" : "bg-red-50 text-red-800 border border-red-150"}`}>
                                            {notificationStatus.success ? (
                                                <CheckCircle className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
                                            ) : (
                                                <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                                            )}
                                            <div>{notificationStatus.message}</div>
                                        </div>
                                    )}

                                    <Button type="submit" disabled={sendingNotification || !notificationForm.sujet || !notificationForm.contenu} className="rounded-xl font-bold h-11 px-5 shadow-md">
                                        {sendingNotification ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Envoi en cours aux membres...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4 mr-2" /> Envoyer la communication
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 4: REPORTS */}
                    <TabsContent value="rapports" className="focus-visible:outline-none">
                        <Card className="rounded-xl">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
                                <div>
                                    <CardTitle className="font-heading font-extrabold text-xl text-foreground">Rapports mensuels d'activité</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">Rédigez les bilans mensuels pour informer l'administration générale et les pasteurs.</CardDescription>
                                </div>
                                <Button onClick={() => setSubmitRapportDialogOpen(true)} className="rounded-xl font-bold h-10 shadow-sm">
                                    <Plus className="w-4.5 h-4.5 mr-1.5" /> Soumettre un rapport
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loadingRapports ? (
                                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                                ) : rapports.length === 0 ? (
                                    <div className="text-center py-20 px-4">
                                        <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                                        <h4 className="font-heading text-lg font-bold text-foreground">Aucun rapport soumis</h4>
                                        <p className="text-sm text-muted-foreground mt-1 mb-6">Aucun bilan mensuel n'a été rédigé pour le moment.</p>
                                        <Button onClick={() => setSubmitRapportDialogOpen(true)} className="rounded-xl">
                                            <Plus className="w-4 h-4 mr-1.5" /> Rédiger le premier rapport
                                        </Button>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-gray-50/70">
                                            <TableRow>
                                                <TableHead className="font-bold text-foreground h-12 px-6">Mois / Année</TableHead>
                                                <TableHead className="font-bold text-foreground h-12 px-6">Membres (à la soumission)</TableHead>
                                                <TableHead className="font-bold text-foreground h-12 px-6">Réunions menées</TableHead>
                                                <TableHead className="font-bold text-foreground h-12 px-6">Soumis le</TableHead>
                                                <TableHead className="font-bold text-foreground h-12 px-6">Soumis par</TableHead>
                                                <TableHead className="font-bold text-foreground h-12 px-6">Description / Bilan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rapports.map(r => (
                                                <TableRow key={r.id} className="hover:bg-gray-50/50 border-b border-gray-100">
                                                    <TableCell className="px-6 py-4 font-extrabold text-foreground">
                                                        {new Date(2026, parseInt(r.mois) - 1).toLocaleString('fr-FR', { month: 'long' })} {r.annee}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 text-sm text-gray-650">{r.nb_membres} membres</TableCell>
                                                    <TableCell className="px-6 py-4 text-sm text-gray-650">{r.nb_reunions} réunions</TableCell>
                                                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">{r.soumis_le ? new Date(r.soumis_le).toLocaleDateString() : "-"}</TableCell>
                                                    <TableCell className="px-6 py-4 text-sm text-gray-705 font-medium">{r.soumis_par}</TableCell>
                                                    <TableCell className="px-6 py-4 text-xs text-muted-foreground max-w-sm truncate font-normal leading-relaxed">{r.contenu}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 5: RESOURCES */}
                    <TabsContent value="ressources" className="focus-visible:outline-none">
                        <Card className="rounded-xl">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
                                <div>
                                    <CardTitle className="font-heading font-extrabold text-xl text-foreground">Documents & Supports</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">Uploadez des ressources et documents utiles pour l'équipe (plannings, chants, cours).</CardDescription>
                                </div>
                                <Button onClick={() => setUploadDialogOpen(true)} className="rounded-xl font-bold h-10 shadow-sm">
                                    <FileUp className="w-4.5 h-4.5 mr-1.5" /> Uploader un document
                                </Button>
                            </CardHeader>
                            <CardContent className="p-6">
                                {loadingDocs ? (
                                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                                ) : documents.length === 0 ? (
                                    <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                                        <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                                        <h4 className="font-heading text-lg font-bold text-foreground">Aucun fichier partagé</h4>
                                        <p className="text-sm text-muted-foreground mt-1 mb-6">Partagez vos premiers documents de travail avec les membres.</p>
                                        <Button onClick={() => setUploadDialogOpen(true)} className="rounded-xl">
                                            <FileUp className="w-4 h-4 mr-1.5" /> Uploader un document
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {documents.map(doc => (
                                            <Card key={doc.id} className="border border-gray-150 rounded-2xl overflow-hidden flex flex-col justify-between bg-white">
                                                <div className="p-5 space-y-3">
                                                    <div className="w-10 h-10 rounded-xl bg-muted text-foreground flex items-center justify-center">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-heading font-extrabold text-foreground line-clamp-1 leading-snug">{doc.nom}</h4>
                                                        {doc.description && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{doc.description}</p>}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground space-y-0.5 border-t pt-2 mt-2">
                                                        <div>Mis en ligne le : {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "-"}</div>
                                                        <div>Par : <span className="font-medium text-foreground">{doc.uploade_par}</span></div>
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex gap-2">
                                                    <div className="flex-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => ouvrirFichier(doc.fichier_url)}
                                                            className="w-full text-xs h-9 rounded-xl border-gray-200 hover:bg-gray-100 font-semibold flex items-center justify-center gap-1.5"
                                                        >
                                                            <DownloadCloud className="w-4 h-4" /> Télécharger
                                                        </Button>
                                                    </div>
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl shrink-0" 
                                                        onClick={() => handleDeleteDoc(doc.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Dialog: Add Member */}
            <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
                    <div className="bg-gradient-to-r from-bordeaux to-bordeaux-dark p-6 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-heading font-black tracking-tight text-white flex items-center gap-2">
                                <Users className="w-5 h-5" /> Inscrire un membre
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-white/80 text-xs mt-1.5 font-light">Associez un fidèle de la base de données à ce département.</p>
                    </div>
                    <div className="space-y-4 p-6 bg-white">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Choisir parmi les membres</Label>
                            <Select value={selectedMemberToAdd} onValueChange={setSelectedMemberToAdd}>
                                <SelectTrigger className="rounded-xl border-gray-200 h-11 focus:ring-bordeaux/20">
                                    <SelectValue placeholder="Rechercher un fidèle..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {allMembres.map(m => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.prenom} {m.nom} ({m.email || "Pas d'email"})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleAddMember} disabled={addingMember || !selectedMemberToAdd} className="w-full bg-gradient-to-r from-bordeaux to-bordeaux-dark text-white font-bold h-12 rounded-xl shadow-md mt-2">
                            {addingMember ? "Inscription en cours..." : "Valider l'inscription"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog: Create Meeting */}
            <Dialog open={createReunionDialogOpen} onOpenChange={setCreateReunionDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
                    <div className="bg-gradient-to-r from-bordeaux to-bordeaux-dark p-6 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-heading font-black tracking-tight text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5" /> Planifier une réunion
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-white/80 text-xs mt-1.5 font-light">Créez une séance de travail ou de prière.</p>
                    </div>
                    <div className="space-y-4 p-6 bg-white">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Titre de la réunion *</Label>
                            <Input placeholder="Ex: Séance de préparation..." className="rounded-xl border-gray-200 h-11" value={reunionForm.titre} onChange={e => setReunionForm(prev => ({ ...prev, titre: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                            <Textarea placeholder="Ordre du jour, préparatifs..." rows={2} className="rounded-xl border-gray-200" value={reunionForm.description} onChange={e => setReunionForm(prev => ({ ...prev, description: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date et heure *</Label>
                            <Input type="datetime-local" className="rounded-xl border-gray-200 h-11" value={reunionForm.date_reunion} onChange={e => setReunionForm(prev => ({ ...prev, date_reunion: e.target.value }))} />
                        </div>
                        <div className="flex items-center gap-3 py-1 bg-gray-50 rounded-xl px-3 border border-gray-100">
                            <Switch checked={reunionForm.is_en_ligne} onCheckedChange={v => setReunionForm(prev => ({ ...prev, is_en_ligne: v }))} />
                            <Label className="text-xs font-semibold text-muted-foreground">Réunion virtuelle (Vidéoconférence)</Label>
                        </div>
                        {reunionForm.is_en_ligne ? (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lien de la visioconférence</Label>
                                <Input placeholder="Ex: https://zoom.us/j/..." className="rounded-xl border-gray-200 h-11" value={reunionForm.lien_reunion} onChange={e => setReunionForm(prev => ({ ...prev, lien_reunion: e.target.value }))} />
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lieu physique</Label>
                                <Input placeholder="Ex: Salle Nazareth, Bureau B..." className="rounded-xl border-gray-200 h-11" value={reunionForm.lieu} onChange={e => setReunionForm(prev => ({ ...prev, lieu: e.target.value }))} />
                            </div>
                        )}
                        <Button onClick={handleCreateReunion} disabled={creatingReunion || !reunionForm.titre || !reunionForm.date_reunion} className="w-full bg-gradient-to-r from-bordeaux to-bordeaux-dark text-white font-bold h-12 rounded-xl shadow-md mt-2">
                            {creatingReunion ? "Planification..." : "Planifier la réunion"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog: Presence Sheet */}
            <Dialog open={presenceDialogOpen} onOpenChange={setPresenceDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col justify-between rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
                    <div className="bg-gradient-to-r from-bordeaux to-bordeaux-dark p-6 text-white shrink-0">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-heading font-black tracking-tight text-white flex items-center gap-2">
                                <UserCheck className="w-5 h-5" /> Feuille de présence
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-white/80 text-xs mt-1.5 font-light">Réunion : <strong className="text-white font-semibold">{activeReunion?.titre}</strong></p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {loadingPresences ? (
                            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                        ) : presenceList.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm py-8">Inscrivez d'abord des membres au département pour pouvoir faire l'appel.</p>
                        ) : (
                            <div className="space-y-3">
                                {presenceList.map(p => (
                                    <div key={p.membre_id} className="p-3.5 border border-gray-150 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 hover:bg-gray-50">
                                        <div className="font-extrabold text-sm text-foreground">{p.prenom} {p.nom}</div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                                <button
                                                    type="button"
                                                    className={`px-3.5 py-2 text-xs font-bold ${p.statut === "PRESENT" ? "bg-emerald-600 text-white" : "bg-white text-muted-foreground hover:bg-gray-100"}`}
                                                    onClick={() => handleStatutChange(p.membre_id, "PRESENT")}
                                                >
                                                    Présent
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`px-3.5 py-2 text-xs font-bold ${p.statut === "ABSENT" ? "bg-red-650 text-white" : "bg-white text-muted-foreground hover:bg-gray-100"}`}
                                                    onClick={() => handleStatutChange(p.membre_id, "ABSENT")}
                                                >
                                                    Absent
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`px-3.5 py-2 text-xs font-bold ${p.statut === "EXCUSE" ? "bg-amber-500 text-white" : "bg-white text-muted-foreground hover:bg-gray-100"}`}
                                                    onClick={() => handleStatutChange(p.membre_id, "EXCUSE")}
                                                >
                                                    Excusé
                                                </button>
                                            </div>
                                            <Input
                                                placeholder="Note (facultatif)"
                                                className="w-full sm:w-44 h-9 text-xs rounded-lg border-gray-200"
                                                value={p.note}
                                                onChange={e => handleNoteChange(p.membre_id, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-150 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                        <Button variant="outline" size="sm" className="rounded-xl h-11 px-5 border-gray-200 text-foreground font-semibold" onClick={() => setPresenceDialogOpen(false)}>Annuler</Button>
                        <Button size="sm" className="rounded-xl h-11 px-5 font-bold shadow-md" onClick={handleSavePresences} disabled={savingPresences || presenceList.length === 0}>
                            {savingPresences ? "Sauvegarde..." : "Enregistrer la feuille de présence"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog: Submit Report */}
            <Dialog open={submitRapportDialogOpen} onOpenChange={setSubmitRapportDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
                    <div className="bg-gradient-to-r from-bordeaux to-bordeaux-dark p-6 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-heading font-black tracking-tight text-white flex items-center gap-2">
                                <FileText className="w-5 h-5" /> Soumettre un rapport mensuel
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-white/80 text-xs mt-1.5 font-light">Soumettez le bilan d'activité du département aux pasteurs.</p>
                    </div>
                    <div className="space-y-4 p-6 bg-white">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mois d'activité</Label>
                                <Select value={rapportForm.mois} onValueChange={v => setRapportForm(prev => ({ ...prev, mois: v }))}>
                                    <SelectTrigger className="rounded-xl border-gray-200 h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(m => (
                                            <SelectItem key={m} value={m}>{new Date(2026, parseInt(m) - 1).toLocaleString('fr-FR', { month: 'long' })}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Année</Label>
                                <Input type="number" className="rounded-xl border-gray-200 h-11" value={rapportForm.annee} onChange={e => setRapportForm(prev => ({ ...prev, annee: e.target.value }))} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contenu / Bilan général *</Label>
                            <Textarea rows={6} placeholder="Détaillez les points forts, réunions tenues, décisions, difficultés et requêtes de prière..." className="rounded-xl border-gray-200" value={rapportForm.contenu} onChange={e => setRapportForm(prev => ({ ...prev, contenu: e.target.value }))} />
                        </div>
                        <Button onClick={handleSubmitRapport} disabled={submittingRapport || !rapportForm.contenu} className="w-full bg-gradient-to-r from-bordeaux to-bordeaux-dark text-white font-bold h-12 rounded-xl shadow-md mt-2">
                            {submittingRapport ? "Soumission..." : "Soumettre le rapport"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog: Upload Document */}
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
                    <div className="bg-gradient-to-r from-bordeaux to-bordeaux-dark p-6 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-heading font-black tracking-tight text-white flex items-center gap-2">
                                <FolderOpen className="w-5 h-5" /> Partager un document
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-white/80 text-xs mt-1.5 font-light">Mettez à disposition des membres un support de travail ou de prière.</p>
                    </div>
                    <div className="space-y-4 p-6 bg-white">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fichier *</Label>
                            <div className="flex items-center gap-3">
                                <input type="file" ref={docInputRef} onChange={handleFileUpload} className="hidden" />
                                <Button type="button" variant="outline" className="w-full h-11 border-dashed border-gray-300 rounded-xl" onClick={() => docInputRef.current?.click()} disabled={uploadingDoc}>
                                    {uploadingDoc ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-muted-foreground" /> : <FileUp className="w-4 h-4 mr-2 text-bordeaux" />}
                                    {docForm.fichier_url ? "Fichier chargé (Cliquez pour changer)" : "Sélectionner un document"}
                                </Button>
                            </div>
                            {docForm.nom && (
                                <p className="text-xs text-green-600 font-semibold truncate bg-green-50 p-2 rounded-lg border border-green-100 flex items-center gap-1.5 mt-2">
                                    <Check className="w-4 h-4 shrink-0" />
                                    {docForm.nom}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nom d'affichage *</Label>
                            <Input placeholder="Ex: Planning Répétitions Juillet 2026" className="rounded-xl border-gray-200 h-11" value={docForm.nom} onChange={e => setDocForm(prev => ({ ...prev, nom: e.target.value }))} />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                            <Textarea rows={3} placeholder="Description de l'usage ou du contenu de ce fichier..." className="rounded-xl border-gray-200" value={docForm.description} onChange={e => setDocForm(prev => ({ ...prev, description: e.target.value }))} />
                        </div>

                        <Button onClick={handleSaveDoc} disabled={savingDoc || uploadingDoc || !docForm.nom || !docForm.fichier_url} className="w-full bg-gradient-to-r from-bordeaux to-bordeaux-dark text-white font-bold h-12 rounded-xl shadow-md mt-2">
                            {savingDoc ? "Enregistrement en cours..." : "Enregistrer la ressource"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
