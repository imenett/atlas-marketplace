"use client";

import { useState, Suspense } from "react"; // 1. Ajout de Suspense
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

/**
 * Schéma Zod de validation du mot de passe.
 * Exige au moins 8 caractères, une minuscule, une majuscule, un chiffre
 * et un caractère spécial.
 */
const passwordSchema = z.string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .regex(/[a-z]/, "Le mot de passe doit contenir au moins une lettre minuscule.")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une lettre majuscule.")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.")
  .regex(/[^a-zA-Z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial.");

/**
 * Schéma Zod global du formulaire d'inscription.
 * Valide les champs communs + les règles spécifiques au type de compte :
 * - Particulier (buyer) : aucun champ boutique requis.
 * - Professionnel (seller) : `shopName` obligatoire.
 * Vérifie également que les deux mots de passe correspondent.
 */
const registerSchema = z.object({
  firstName: z.string().min(1, "Veuillez remplir votre prénom.").trim(),
  lastName: z.string().min(1, "Veuillez remplir votre nom.").trim(),
  email: z.string().trim().toLowerCase().email("Veuillez entrer une adresse email valide."),
  password: passwordSchema,
  confirmPassword: z.string(),
  userType: z.enum(["buyer", "seller"]),
  shopName: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      message: "Les mots de passe ne correspondent pas.",
      path: ["confirmPassword"]
    });
  }
  if (data.userType === "seller" && (!data.shopName || data.shopName.trim() === "")) {
    ctx.addIssue({
      code: "custom",
      message: "Veuillez fournir un nom de boutique pour un compte professionnel.",
      path: ["shopName"]
    });
  }
});

/**
 * Contenu du formulaire d'inscription (logique et UI).
 *
 * Gère deux modes via un toggle :
 * - **Particulier** : inscription simple via BetterAuth (`signUp.email`).
 * - **Professionnel** : appel à l'endpoint `/api/vendor/register` du backend
 *   pour créer simultanément un compte utilisateur et une boutique.
 *
 * L'URL contient le paramètre `?type=seller` pour pré-sélectionner le mode vendeur
 * (ex : depuis la landing page "Ouvrir ma boutique").
 *
 * @returns Le formulaire d'inscription avec toggle Particulier/Professionnel.
 */
function RegisterFormContent() {
  const searchParams = useSearchParams();
  const [userType, setUserType] = useState<"buyer" | "seller">(
    searchParams.get("type") === "seller" ? "seller" : "buyer"
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = registerSchema.safeParse({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      password,
      confirmPassword,
      userType,
      shopName: shopName.trim(),
    });

    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setLoading(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      if (userType === "seller") {
        const backendUrl = "";

        const response = await fetch(`${backendUrl}/api/vendor/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            name: fullName,
            shopName: shopName.trim(),
            callbackURL: `${window.location.origin}/email-verified`,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Erreur lors de la création de la boutique");
        }
      } else {
        const result = await signUp.email({
          email,
          password,
          name: fullName,
          callbackURL: `${window.location.origin}/email-verified`,
        });

        if (result.error) {
          throw new Error(result.error.message || "Erreur lors de l'inscription");
        }
      }

      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-zinc-800";
  const labelClass = "text-sm font-semibold text-zinc-900";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 py-12 px-4 relative overflow-hidden font-sans w-full">
      <main className="w-full max-w-[600px] z-10 my-8">
        <div className="bg-white rounded-2xl w-full px-10 py-9 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100">

          <div className="flex flex-col items-center">
            <div className="flex bg-zinc-100 rounded-full p-1 w-fit mb-7" role="tablist">
              {(["buyer", "seller"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={userType === r}
                  onClick={() => { setUserType(r); setError(""); }}
                  className={`px-9 py-2.5 rounded-full text-[15px] font-semibold transition-all duration-200 cursor-pointer
                    ${userType === r
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-transparent text-zinc-500 hover:text-zinc-800"
                    }`}
                >
                  {r === "buyer" ? "Particulier" : "Professionnel"}
                </button>
              ))}
            </div>

            <h1 className="text-[30px] font-extrabold text-zinc-900 mb-1.5 tracking-tight text-center">
              Créer un compte
            </h1>
            <p className="text-sm text-zinc-500 mb-7 text-center">
              Rejoignez Atlas et découvrez notre marketplace
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-3.5 py-3 text-[13.5px] font-medium mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleRegistration} className="flex flex-col gap-5" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Prénom <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Jean"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Nom <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Dupont"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Adresse email <span className="text-red-500">*</span></label>
              <input
                type="email"
                placeholder="jean.dupont@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Mot de passe <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass}>Confirmation <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            {userType === "seller" && (
              <div className="border-t border-zinc-100 pt-6 mt-2 space-y-5">
                <h3 className="text-base font-semibold text-gray-900">
                  Informations de la boutique
                </h3>
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Nom de la boutique <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Ex: Tech Paradise"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password || !firstName || !lastName || (userType === "seller" && !shopName.trim())}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 mt-4 shadow-sm shadow-indigo-500/20 cursor-pointer"
            >
              {loading ? "Création en cours..." : userType === "seller" ? "Créer ma boutique" : "Créer mon compte"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-100">
            <p className="text-zinc-500 text-sm text-center">
              Vous avez déjà un compte ?{" "}
              <Link href="/login" className="text-indigo-600 font-bold hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Page d'inscription (export par défaut).
 *
 * Enveloppe `RegisterFormContent` dans un `<Suspense>` car ce composant
 * utilise `useSearchParams()`, qui nécessite le rendu côté client et
 * déclenche une erreur de build sans boundary Suspense.
 *
 * @returns La page d'inscription avec son fallback de chargement.
 */
export default function RegistrationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <p className="text-zinc-400 animate-pulse">Chargement du formulaire...</p>
      </div>
    }>
      <RegisterFormContent />
    </Suspense>
  );
}