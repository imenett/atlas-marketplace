"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  Upload,
  Image as ImageIcon,
  Store,
  Star,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { SellerSidebar } from "@/app/(vendor)/dashboard/SellerSidebar";

/** Données de la boutique du vendeur récupérées depuis l'API `/api/vendor/shop`. */
interface ShopData {
  id: number;
  ownerId: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  status: string;
  iban: string | null;
  averageRating: number;
  reviewCount: number;
  productCount: number;
  salesCount: number;
  createdAt: string;
}

/**
 * Page de gestion de la boutique du vendeur.
 *
 * Permet de modifier les informations de la boutique en deux sections :
 * - **Visuels** : logo et image de couverture (upload direct vers Supabase Storage).
 * - **Informations** : nom de la boutique, description, IBAN.
 *
 * Affiche également des statistiques en lecture seule : note moyenne, avis,
 * nombre de produits et ventes.
 *
 * @returns La page paramètres de la boutique vendeur.
 */
export default function SellerStorePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [iban, setIban] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingVisuals, setSavingVisuals] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [shopStatus, setShopStatus] = useState<string>("EN_ATTENTE");
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const backendUrl = "";
  // Gestion de l'enregistrement automatique des visuels
  const handleSaveVisuals = async (newLogoUrl?: string, newCoverUrl?: string) => {
    setSuccessMsg("");
    setErrorMsg("");

    setSavingVisuals(true);
    try {
      const finalLogoUrl = newLogoUrl !== undefined ? newLogoUrl : logoUrl;
      const finalCoverUrl = newCoverUrl !== undefined ? newCoverUrl : coverImageUrl;

      const response = await fetch(`${backendUrl}/api/vendor/shop/visuals`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          logoUrl: finalLogoUrl.trim() || null,
          coverImageUrl: finalCoverUrl.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur serveur");
      }

      const result = await response.json();
      setShopStatus(result.shop.status);
      setAverageRating(result.shop.averageRating);
      setSuccessMsg("Visuels enregistrés avec succès !");
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue lors de l'enregistrement des visuels.");
    } finally {
      setSavingVisuals(false);
    }
  };

  // Upload image vers le backend qui la transmet à Supabase Storage avec la clé service_role (contourne le RLS).
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: React.Dispatch<React.SetStateAction<string>>,
    type: "logo" | "cover"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("L'image est trop grande (max 5 MB).");
      return;
    }

    const setUploading = type === "logo" ? setUploadingLogo : setUploadingCover;
    setUploading(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(
        `${backendUrl}/api/vendor/shop/upload?type=${type}`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors du téléversement.");
      }

      const { url } = await response.json();
      setImage(url);
      
      // Auto-save the visuals
      await handleSaveVisuals(
        type === "logo" ? url : undefined,
        type === "cover" ? url : undefined
      );

    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors du téléversement de l'image.");
    } finally {
      setUploading(false);
    }
  };

  // Redirection si pas vendeur (désormais gérée par le layout global)

  // Récupération des données de la boutique ------------------------------------------------
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const fetchShop = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/vendor/shop/me`, {
          credentials: "include",
        });
        if (response.ok) {
          const data: ShopData = await response.json();
          setShopName(data.name || "");
          setDescription(data.description || "");
          setIban(data.iban || "");
          setLogoUrl(data.logoUrl || "");
          setCoverImageUrl(data.coverImageUrl || "");
          setShopStatus(data.status || "EN_ATTENTE");
        }

        const statsResponse = await fetch(`${backendUrl}/api/vendor/shop/stats`, {
          credentials: "include",
        });
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setAverageRating(statsData.averageRating || 0);
          setReviewCount(statsData.reviewCount || 0);
          setProductCount(statsData.productCount || 0);
          setSalesCount(statsData.salesCount || 0);
        }
      } catch (err) {
        setErrorMsg("Impossible de charger les informations de la boutique.");
      } finally {
        setLoading(false);
      }
    };
    fetchShop();
  }, [backendUrl, authLoading, isAuthenticated]);

  // Gestion de l'enregistrement des informations ------------------------------------------------
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!shopName.trim()) {
      setErrorMsg("Le nom de la boutique est obligatoire.");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("La description est obligatoire.");
      return;
    }
    const normalizedIban = iban.trim().replace(/[\s-]/g, "").toUpperCase();
    if (!normalizedIban) {
      setErrorMsg("L'IBAN est obligatoire.");
      return;
    }
    if (!/^FR\d{2}\d{5}\d{5}[0-9A-Z]{11}\d{2}$/.test(normalizedIban)) {
      setErrorMsg("L'IBAN doit être un IBAN français valide (ex : FR7630006000011234567890189).");
      return;
    }

    setSavingInfo(true);
    try {
      const response = await fetch(`${backendUrl}/api/vendor/shop/info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: shopName.trim(),
          description: description.trim(),
          iban: normalizedIban,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur serveur");
      }

      const result = await response.json();
      setShopStatus(result.shop.status);
      setAverageRating(result.shop.averageRating);
      setSuccessMsg("Informations enregistrées avec succès !");
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue.");
    } finally {
      setSavingInfo(false);
    }
  };


  if (authLoading || loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen" style={{ backgroundColor: "#F8F9FB" }}>
        <SellerSidebar sellerName="Ma Boutique" />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </main>
      </div>
    );
  }

  const statusBadge: Record<string, { label: string; color: string; bg: string }> = {
    EN_ATTENTE: { label: "En attente", color: "#D97706", bg: "rgba(217,119,6,0.12)" },
    ACTIVE: { label: "Active", color: "#059669", bg: "rgba(5,150,105,0.12)" },
    SUSSPENDUE: { label: "Suspendue", color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
    BANNIE: { label: "Bannie", color: "#7C2D12", bg: "rgba(124,45,18,0.12)" },
  };

  const badge = statusBadge[shopStatus] || { label: shopStatus || "Inconnu", color: "#6F727B", bg: "rgba(111,114,123,0.12)" };

  return (
    <div className="flex flex-col md:flex-row min-h-screen" style={{ backgroundColor: "#F8F9FB" }}>
      {/* Sidebar added here */}
      <SellerSidebar sellerName={shopName || "Ma Boutique"} />

      {/* Main container adjusted for mobile top bar (pt-16) and desktop layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 pt-20 md:pt-8">
        {/* Header de la page */}
        <div className="mb-8">
          <h1
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ color: "#0D1B3E" }}
          >
            Ma Boutique
          </h1>
          <p className="text-sm" style={{ color: "#6F727B" }}>
            Gérez les informations de votre boutique
          </p>
        </div>

        {/* Alerte profil incomplet */}
        {shopStatus === "EN_ATTENTE" && (
          <div
            className="mb-6 flex items-start gap-3 p-4 rounded-lg border"
            style={{
              backgroundColor: "rgba(79,70,229,0.05)",
              borderColor: "rgba(79,70,229,0.25)",
            }}
          >
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#4F46E5" }} />
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "#0D1B3E" }}
              >
                Votre boutique est incomplète
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#6F727B" }}>
                Veuillez remplir le nom, la description, l'IBAN, le logo et la bannière pour que votre boutique puisse être activée et que vous puissiez commencer à vendre.
              </p>
            </div>
          </div>
        )}

        {/* Messages de succès / erreur */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
            {errorMsg}
          </div>
        )}

        {/* Layout en deux colonnes : Stacked on mobile, side-by-side on lg screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Gauche: Formulaire - Order 2 on mobile to show preview first if preferred, or keep as is */}
          <div className="space-y-6 order-2 lg:order-1">
            {/* Informations */}
            <form
              onSubmit={handleSaveInfo}
              className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm"
            >
              <h2
                className="text-xl font-semibold mb-6"
                style={{ color: "#0D1B3E" }}
              >
                Informations de la boutique
              </h2>

              <div className="space-y-5">
                {/* Nom de la boutique */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="shopName"
                    className="text-sm font-semibold"
                    style={{ color: "#0D1B3E" }}
                  >
                    Nom de la boutique <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="shopName"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                    style={{ color: "#0D1B3E" }}
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="description"
                    className="text-sm font-semibold"
                    style={{ color: "#0D1B3E" }}
                  >
                    Description / À propos <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm resize-y"
                    style={{ color: "#0D1B3E" }}
                  />
                  <p className="text-xs" style={{ color: "#6F727B" }}>
                    Décrivez votre boutique et ce qui la rend unique
                  </p>
                </div>

                {/* IBAN */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="iban"
                    className="text-sm font-semibold"
                    style={{ color: "#0D1B3E" }}
                  >
                    IBAN <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="iban"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="FR76 3000 6000 0112 3456 7890 189"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                    style={{ color: "#0D1B3E" }}
                  />
                  <p className="text-xs" style={{ color: "#6F727B" }}>
                    IBAN français (FR + 25 caractères) pour recevoir les paiements
                  </p>
                </div>

                {/* Bouton Enregistrer */}
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="w-full py-3 text-white font-semibold rounded-lg transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: "#4F46E5" }}
                >
                  {savingInfo ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>


          </div>

          {/* Droite: Aperçu sur la boutique - Sticky on desktop, top of grid on mobile */}
          <div className="space-y-6 order-1 lg:order-2">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden lg:sticky lg:top-8">
              <div
                className="px-6 py-4 border-b border-gray-200 bg-gray-50/50"
              >
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "#0D1B3E" }}
                >
                  Aperçu de la boutique
                </h2>
              </div>

              <div className="p-4 md:p-6">
                <div className="rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                  {/* Bannière */}
                  <div 
                    className="relative h-32 md:h-40 overflow-hidden group cursor-pointer"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      ref={coverInputRef}
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, setCoverImageUrl, "cover")}
                    />
                    {uploadingCover && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
                        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#4F46E5" }} />
                      </div>
                    )}
                    {coverImageUrl ? (
                      <img
                        src={coverImageUrl}
                        alt="Bannière"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).parentElement!.innerHTML = `
                            <div class="h-40 flex items-center justify-center" style="background: linear-gradient(135deg, #4F46E5, #7C3AED)">
                              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                            </div>`;
                        }}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                        }}
                      >
                        <ImageIcon className="h-10 w-10 text-white/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full backdrop-blur-sm transition-colors flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm font-medium">Changer la bannière</span>
                      </div>
                    </div>
                  </div>

                  {/* Logo */}
                  <div className="px-6 -mt-10 md:-mt-12 mb-4 relative z-20">
                    <div
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white shadow-lg flex items-center justify-center overflow-hidden cursor-pointer group relative bg-white"
                      style={{ backgroundColor: logoUrl ? "#fff" : "#4F46E5" }}
                      onClick={(e) => { e.stopPropagation(); logoInputRef.current?.click(); }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        ref={logoInputRef}
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, setLogoUrl, "logo")}
                      />
                      {uploadingLogo && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#4F46E5" }} />
                        </div>
                      )}
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Logo"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                            (
                              e.target as HTMLImageElement
                            ).parentElement!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><rect width="20" height="5" x="2" y="7"/></svg>`;
                          }}
                        />
                      ) : (
                        <Store className="h-8 w-8 md:h-10 md:w-10 text-white" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Informations sur la boutique */}
                  <div className="px-6 pb-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-4">
                      <div className="min-w-0 w-full">
                        <h3
                          className="text-xl md:text-2xl font-bold mb-2 truncate"
                          style={{ color: "#0D1B3E" }}
                        >
                          {shopName || "Nom de la boutique"}
                        </h3>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3.5 w-3.5 ${
                                  star <= Math.round(averageRating)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span
                            className="text-sm font-semibold"
                            style={{ color: "#0D1B3E" }}
                          >
                            {averageRating.toFixed(1)}
                          </span>
                          <span
                            className="text-xs"
                            style={{ color: "#6F727B" }}
                          >
                            ({reviewCount} avis)
                          </span>
                        </div>
                      </div>
                      <span
                        className="text-[10px] md:text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap"
                        style={{
                          color: badge.color,
                          backgroundColor: badge.bg,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <p
                      className="text-sm mb-6 line-clamp-3 md:line-clamp-none"
                      style={{ color: "#6F727B" }}
                    >
                      {description || "Aucune description renseignée"}
                    </p>

                    <div className="grid grid-cols-2 gap-2 md:gap-4 mb-2 py-4 border-y border-gray-200 text-center">
                      <div>
                        <div
                          className="text-lg md:text-2xl font-bold mb-0.5"
                          style={{ color: "#0D1B3E" }}
                        >
                          {productCount}
                        </div>
                        <div
                          className="text-[10px] md:text-xs"
                          style={{ color: "#6F727B" }}
                        >
                          Produits
                        </div>
                      </div>
                      <div className="border-l border-gray-200">
                        <div
                          className="text-lg md:text-2xl font-bold mb-0.5"
                          style={{ color: "#0D1B3E" }}
                        >
                          {salesCount}
                        </div>
                        <div
                          className="text-[10px] md:text-xs"
                          style={{ color: "#6F727B" }}
                        >
                          Ventes
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}