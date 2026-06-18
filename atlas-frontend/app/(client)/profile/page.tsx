"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  User,
  MapPin,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Home,
  Check,
  Star,
  Save,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Représente une adresse de livraison ou de facturation de l'utilisateur. */
interface Address {
  id: number;
  nom: string;
  rue: string;
  ville: string;
  code_postal: string;
  pays: string;
  par_defaut: boolean;
}

/** Informations du profil de l'utilisateur affichées dans l'onglet "Profil". */
interface ProfileInfo {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
}

type Tab = "profil" | "adresses";

// ─── API helpers ──────────────────────────────────────────────────────────────

const API_BASE = "";

/**
 * Utilitaire HTTP générique pour les appels API du profil.
 * Envoie automatiquement les cookies de session et le header `Content-Type: application/json`.
 * Lance une erreur avec le message du serveur si la réponse n'est pas OK.
 *
 * @template T - Type de la réponse attendue.
 * @param path - Chemin relatif de l'endpoint (ex: `/api/profile`).
 * @param options - Options de la requête `fetch` (méthode, corps, headers...).
 * @returns La réponse JSON typée.
 * @throws {Error} Si le serveur retourne un statut d'erreur.
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `Erreur ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

/**
 * Élément de navigation de la sidebar de la page profil.
 * Met en surbrillance l'onglet actif et affiche un badge optionnel (ex: nombre d'adresses).
 *
 * @param icon - Icône Lucide à afficher à gauche du label.
 * @param label - Texte de l'onglet.
 * @param active - Indique si cet onglet est actuellement sélectionné.
 * @param onClick - Fonction appelée au clic sur l'onglet.
 * @param badge - Nombre optionnel affiché en badge (ex: nombre d'adresses enregistrées).
 */
function SidebarTab({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
        active
          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <Icon
        className={`h-4 w-4 flex-shrink-0 ${
          active ? "text-white" : "text-gray-400 group-hover:text-gray-600"
        }`}
      />
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
            active ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"
          }`}
        >
          {badge}
        </span>
      )}
      <ChevronRight
        className={`h-3.5 w-3.5 transition-transform ${
          active
            ? "text-white/60"
            : "text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5"
        }`}
      />
    </button>
  );
}

/**
 * Bannière d'erreur rouge affichant un message d'échec d'opération.
 *
 * @param message - Texte de l'erreur à afficher.
 */
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      {message}
    </div>
  );
}

/**
 * Champ de formulaire générique réutilisable dans les onglets profil et adresses.
 *
 * @param label - Libellé affiché au-dessus du champ.
 * @param name - Attribut `name` HTML du champ.
 * @param value - Valeur contrôlée du champ.
 * @param onChange - Handler appelé à chaque modification.
 * @param placeholder - Texte d'indication quand le champ est vide.
 * @param type - Type HTML du champ (`"text"`, `"email"`, etc.). Par défaut `"text"`.
 * @param disabled - Si `true`, le champ est en lecture seule.
 */
function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  required,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

// ─── Tab: Profil ──────────────────────────────────────────────────────────────

/**
 * Onglet "Profil" de la page Mon compte.
 *
 * Permet à l'utilisateur de modifier son prénom, nom, adresse email et téléphone.
 * Charge les données depuis `GET /api/profile` et envoie les modifications via `PATCH /api/profile`.
 *
 * @returns Le formulaire de modification du profil avec bouton de sauvegarde.
 */
function ProfileTab() {
  const { user, updateAvatarUrl } = useAuth();

  const [form, setForm] = useState<ProfileInfo>(() => {
    const parts = (user?.name ?? "").trim().split(" ");
    return {
      prenom: parts[0] ?? "",
      nom: parts.slice(1).join(" "),
      email: user?.email ?? "",
      telephone: (user as { numero_telephone?: string })?.numero_telephone ?? "",
    };
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch<{ url_avatar?: string; numero_telephone?: string }>("/api/profile/me")
      .then((data) => { 
        if (data.url_avatar) setAvatarUrl(data.url_avatar); 
        if (data.numero_telephone) {
          setForm((prev) => ({ ...prev, telephone: data.numero_telephone || "" }));
        }
      })
      .catch(() => {});
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAvatarUrl(data.url);
        updateAvatarUrl(data.url);   // propagate immédiatement au Header via AuthContext
      } else {
        setError(data.message || "Erreur lors du chargement de la photo.");
      }
    } catch {
      setError("Erreur réseau lors du chargement de la photo.");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!form.prenom.trim() || !form.nom.trim()) {
      setError("Le prénom et le nom sont obligatoires.");
      return;
    }
    if (form.telephone && !/^[\d\s+()-]+$/.test(form.telephone)) {
      setError("Le numéro de téléphone n'est pas valide (seuls les chiffres, espaces et +()- sont autorisés).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch<void>("/api/profile/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: `${form.prenom} ${form.nom}`.trim(),
          numero_telephone: form.telephone || null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const initials =
    `${form.prenom[0] ?? ""}${form.nom[0] ?? ""}`.toUpperCase() || "?";

  return (
    <div className="space-y-8">
      {/* Avatar card */}
      <div className="flex items-center gap-5 p-5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-200 overflow-hidden">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Photo de profil" className="w-full h-full object-cover" />
            ) : avatarUploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              initials
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white border-2 border-indigo-100 flex items-center justify-center text-gray-500 hover:text-indigo-600 transition-colors shadow-sm disabled:opacity-50"
          >
            {avatarUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
          </button>
        </div>
        <div>
          <p className="font-semibold text-gray-900">
            {form.prenom} {form.nom}
          </p>
          <p className="text-sm text-gray-500">{form.email}</p>
          {(user as { emailVerified?: boolean })?.emailVerified && (
            <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 mt-1 font-medium">
              <Star className="h-3 w-3 fill-indigo-400 text-indigo-400" />
              Client vérifié
            </span>
          )}
        </div>
      </div>

      {/* Form */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-5">
          Informations personnelles
        </h3>

        {error && <ErrorBanner message={error} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Field label="Prénom" name="prenom" value={form.prenom} onChange={handleChange} placeholder="Votre prénom" disabled={loading} required />
          <Field label="Nom" name="nom" value={form.nom} onChange={handleChange} placeholder="Votre nom" disabled={loading} required />
          <div className="md:col-span-2">
            <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="votre@email.fr" disabled={true} />
            <p className="text-xs text-gray-400 mt-1">L&apos;adresse email ne peut pas être modifiée.</p>
          </div>
          <div className="md:col-span-2">
            <Field label="Téléphone" name="telephone" type="tel" value={form.telephone} onChange={handleChange} placeholder="+33 6 00 00 00 00" disabled={loading} />
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              saved
                ? "bg-green-500 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5"
            } disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Modifications enregistrées" : loading ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Adresses ────────────────────────────────────────────────────────────

/** Valeurs initiales d'un formulaire d'ajout d'adresse (champs vides). */
const EMPTY_FORM = { nom: "", rue: "", ville: "", code_postal: "", pays: "France" };

/** Libellés affichés dans le formulaire d'adresse, indexés par nom de champ. */
const FORM_LABELS: Record<keyof typeof EMPTY_FORM, string> = {
  nom: "Nom de l'adresse",
  rue: "Rue",
  ville: "Ville",
  code_postal: "Code postal",
  pays: "Pays",
};

/** Champs obligatoires dans le formulaire d'adresse. */
const REQUIRED_ADDR_FIELDS = new Set<keyof typeof EMPTY_FORM>(["nom", "rue", "ville", "code_postal"]);

/**
 * Onglet "Mes adresses" de la page Mon compte.
 *
 * Affiche la liste des adresses enregistrées (max 10), avec possibilité de :
 * - Ajouter une nouvelle adresse via un formulaire intégré.
 * - Définir une adresse comme adresse par défaut.
 * - Supprimer une adresse (avec promotion automatique de la suivante si elle était la défaut).
 *
 * @param onCountChange - Callback appelé à chaque changement du nombre d'adresses
 *   (utilisé pour mettre à jour le badge dans la sidebar).
 */
function AddressesTab({ onCountChange }: { onCountChange: (n: number) => void }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [errorList, setErrorList] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newAddr, setNewAddr] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchAddresses = useCallback(async () => {
    setLoadingList(true);
    setErrorList(null);
    try {
      const data = await apiFetch<Address[]>("/api/profile/adresses");
      setAddresses(data);
      onCountChange(data.length);
    } catch (e) {
      setErrorList((e as Error).message);
    } finally {
      setLoadingList(false);
    }
  }, [onCountChange]);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const handleSetDefault = async (id: number) => {
    setActionLoading(id);
    try {
      await apiFetch<void>(`/api/profile/adresses/${id}/default`, { method: "PATCH" });
      setAddresses((prev) => prev.map((a) => ({ ...a, par_defaut: a.id === id })));
    } catch (e) {
      setErrorList((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    setActionLoading(id);
    try {
      await apiFetch<void>(`/api/profile/adresses/${id}`, { method: "DELETE" });
      const updated = addresses.filter((a) => a.id !== id);
      setAddresses(updated);
      onCountChange(updated.length);
    } catch (e) {
      setErrorList((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdd = async () => {
    if (!newAddr.nom.trim() || !newAddr.rue.trim() || !newAddr.ville.trim() || !newAddr.code_postal.trim()) {
      setFormError("Le nom, la rue, la ville et le code postal sont obligatoires.");
      return;
    }
    if (!/^\d{5}$/.test(newAddr.code_postal.trim())) {
      setFormError("Le code postal doit contenir exactement 5 chiffres.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const created = await apiFetch<Address>("/api/profile/adresses", {
        method: "POST",
        body: JSON.stringify({ ...newAddr, par_defaut: addresses.length === 0 }),
      });
      const updated = [...addresses, created];
      setAddresses(updated);
      onCountChange(updated.length);
      setNewAddr(EMPTY_FORM);
      setShowForm(false);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Mes adresses</h3>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(null); }}
          className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="p-5 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 space-y-3">
          <h4 className="text-sm font-semibold text-indigo-700">Nouvelle adresse</h4>
          {formError && <ErrorBanner message={formError} />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(Object.keys(EMPTY_FORM) as (keyof typeof EMPTY_FORM)[]).map((key) => (
              <div key={key} className={key === "rue" ? "md:col-span-2" : ""}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {FORM_LABELS[key]}{REQUIRED_ADDR_FIELDS.has(key) && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                  value={newAddr[key]}
                  onChange={(e) => setNewAddr((prev) => ({ ...prev, [key]: e.target.value }))}
                  disabled={saving}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-50"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Ajouter
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(null); }}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loadingList && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm">Chargement...</span>
        </div>
      )}

      {/* Error */}
      {errorList && !loadingList && <ErrorBanner message={errorList} />}

      {/* Empty */}
      {!loadingList && !errorList && addresses.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune adresse enregistrée</p>
        </div>
      )}

      {/* List */}
      {!loadingList && addresses.map((addr) => (
        <div
          key={addr.id}
          className={`relative p-5 rounded-2xl border transition-all ${
            addr.par_defaut
              ? "border-indigo-200 bg-indigo-50/40"
              : "border-gray-100 bg-white hover:border-gray-200"
          } ${actionLoading === addr.id ? "opacity-60 pointer-events-none" : ""}`}
        >
          {addr.par_defaut && (
            <span className="absolute top-4 right-4 text-xs font-semibold text-indigo-600 bg-indigo-100 rounded-full px-2.5 py-0.5 flex items-center gap-1">
              <Home className="h-3 w-3" />
              Par défaut
            </span>
          )}
          <p className="font-semibold text-sm text-gray-900 mb-1">{addr.nom || "Adresse"}</p>
          <p className="text-sm text-gray-600">{addr.rue}</p>
          <p className="text-sm text-gray-600">{addr.code_postal} {addr.ville}, {addr.pays}</p>
          <div className="flex gap-3 mt-4">
            {!addr.par_defaut && (
              <button
                onClick={() => handleSetDefault(addr.id)}
                className="text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
              >
                Définir par défaut
              </button>
            )}
            <button
              onClick={() => handleDelete(addr.id)}
              className="text-xs text-red-400 font-medium hover:text-red-500 transition-colors flex items-center gap-1"
            >
              {actionLoading === addr.id
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Trash2 className="h-3 w-3" />}
              Supprimer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

/**
 * Page "Mon compte" du client connecté.
 *
 * Affiche une sidebar de navigation à deux onglets :
 * - **Profil** : informations personnelles (nom, email, téléphone).
 * - **Mes adresses** : carnet d'adresses avec ajout, suppression et adresse par défaut.
 *
 * @returns La page profil avec la sidebar et le contenu de l'onglet actif.
 */
export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("profil");
  const [addressCount, setAddressCount] = useState(0);

  return (
    <main className="flex-1 container mx-auto px-4 py-10 max-w-5xl">
      <div className="mb-8">
        <Link
          href="/catalogue"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au catalogue
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Mon compte</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez vos informations et préférences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="md:w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-2 shadow-sm">
            <div className="space-y-0.5">
              <SidebarTab
                icon={User}
                label="Mon profil"
                active={activeTab === "profil"}
                onClick={() => setActiveTab("profil")}
              />
              <SidebarTab
                icon={MapPin}
                label="Mes adresses"
                active={activeTab === "adresses"}
                onClick={() => setActiveTab("adresses")}
                badge={addressCount > 0 ? addressCount : undefined}
              />
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
          {activeTab === "profil" && <ProfileTab />}
          {activeTab === "adresses" && (
            <AddressesTab onCountChange={setAddressCount} />
          )}
        </div>
      </div>
    </main>
  );
}