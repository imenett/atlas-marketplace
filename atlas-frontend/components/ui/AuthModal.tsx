"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { signUp, authClient } from "@/lib/auth-client";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useAuth } from "@/contexts/AuthContext";

// ─── Schemas ────────────────────────────────────────────────────────────────

const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .regex(/[a-z]/, "Le mot de passe doit contenir au moins une lettre minuscule.")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une lettre majuscule.")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.")
  .regex(/[^a-zA-Z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial.");

const registerSchema = z
  .object({
    firstName: z.string().min(1, "Veuillez remplir votre prénom.").trim(),
    lastName: z.string().min(1, "Veuillez remplir votre nom.").trim(),
    email: z.string().trim().toLowerCase().email("Veuillez entrer une adresse email valide."),
    password: passwordSchema,
    confirmPassword: z.string(),
    userType: z.enum(["buyer", "seller"]),
    shopName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: "custom", message: "Les mots de passe ne correspondent pas.", path: ["confirmPassword"] });
    }
    if (data.userType === "seller" && (!data.shopName || data.shopName.trim() === "")) {
      ctx.addIssue({ code: "custom", message: "Veuillez fournir un nom de boutique.", path: ["shopName"] });
    }
  });

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Veuillez entrer une adresse email valide."),
  motDePasse: z.string().min(1, "Veuillez entrer votre mot de passe."),
});

// ─── Shared styles ───────────────────────────────────────────────────────────

const inputClass =
  "w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-zinc-800 text-sm";
const labelClass = "text-sm font-semibold text-zinc-900";

// ─── Login Form ──────────────────────────────────────────────────────────────

/**
 * Formulaire de connexion intégré dans la modale d'authentification.
 *
 * Identique à la page `/login` mais optimisé pour l'affichage en modale :
 * après connexion réussie, ferme la modale puis redirige selon le rôle.
 *
 * @param onSwitchToRegister - Callback pour basculer vers le formulaire d'inscription.
 */
function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { closeModal } = useAuthModal();
  const { refresh } = useAuth() as any;
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = loginSchema.safeParse({ email, motDePasse });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: authError } = await authClient.signIn.email({
        email,
        password: motDePasse,
      });

      if (authError) {
        if (authError.code === "EMAIL_NOT_VERIFIED" || authError.message?.toLowerCase().includes("not verified")) {
          setError("Vous devez vérifier votre adresse email avant de vous connecter.");
        } else {
          setError(authError.message || "Identifiants incorrects.");
        }
      } else if (data?.user) {
        const userRole = (data.user as any).role;
        const isSeller = userRole === "SELLER" || userRole === "VENDEUR";
        closeModal();
        router.refresh();
        router.push(isSeller ? "/dashboard" : "/");
      }
    } catch {
      setError("Email ou mot de passe incorrect.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-extrabold text-zinc-900 mb-1 tracking-tight">Se connecter</h2>
      <p className="text-sm text-zinc-500 mb-6">Accédez à votre espace Atlas</p>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-3.5 py-3 text-[13px] font-medium mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Adresse email <span className="text-red-500">*</span></label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="vous@exemple.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Mot de passe <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className={`${inputClass} pr-12`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 mt-1 shadow-sm shadow-indigo-500/20 cursor-pointer text-sm"
        >
          {isLoading ? "Connexion en cours..." : "Se connecter"}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-zinc-100 text-center text-sm text-zinc-500">
        Pas encore de compte ?{" "}
        <button onClick={() => onSwitchToRegister()} className="text-indigo-600 font-bold hover:underline cursor-pointer">
          S'inscrire
        </button>
      </div>
    </div>
  );
}

// ─── Register Form ───────────────────────────────────────────────────────────

/**
 * Formulaire d'inscription intégré dans la modale d'authentification.
 *
 * Supporte les deux modes Particulier et Professionnel (pré-sélectionné via `registerType`
 * du contexte `AuthModalContext`, par exemple quand l'utilisateur clique sur "Ouvrir ma boutique").
 * Après inscription réussie, ferme la modale et ouvre automatiquement la modale de connexion.
 *
 * @param onSwitchToLogin - Callback pour basculer vers le formulaire de connexion.
 */
function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {

  const router = useRouter();

  const { closeModal, openLogin, registerType } = useAuthModal();
  const [userType, setUserType] = useState<"buyer" | "seller">(registerType || "buyer");
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

  useEffect(() => {
    if (registerType) {
      setUserType(registerType);
    }
  }, [registerType]);

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

      closeModal();
      openLogin();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Toggle Particulier / Professionnel */}
      <div className="flex justify-center mb-5">
        <div className="flex bg-zinc-100 rounded-full p-1 w-fit" role="tablist">
          {(["buyer", "seller"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={userType === r}
              onClick={() => { setUserType(r); setError(""); }}
              className={`px-7 py-2 rounded-full text-[14px] font-semibold transition-all duration-200 cursor-pointer
                ${userType === r ? "bg-indigo-600 text-white shadow-md" : "bg-transparent text-zinc-500 hover:text-zinc-800"}`}
            >
              {r === "buyer" ? "Particulier" : "Professionnel"}
            </button>
          ))}
        </div>
      </div>

      <h2 className="text-2xl font-extrabold text-zinc-900 mb-1 tracking-tight text-center">Créer un compte</h2>
      <p className="text-sm text-zinc-500 mb-5 text-center">Rejoignez Atlas et découvrez notre marketplace</p>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-3.5 py-3 text-[13px] font-medium mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleRegistration} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Prénom <span className="text-red-500">*</span></label>
            <input type="text" placeholder="Jean" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Nom <span className="text-red-500">*</span></label>
            <input type="text" placeholder="Dupont" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Adresse email <span className="text-red-500">*</span></label>
          <input type="email" placeholder="jean.dupont@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Mot de passe <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Confirmation <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`${inputClass} pr-10`} />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {userType === "seller" && (
          <div className="border-t border-zinc-100 pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Informations de la boutique</h3>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Nom de la boutique <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Ex: Tech Paradise" value={shopName} onChange={(e) => setShopName(e.target.value)} className={inputClass} />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password || !firstName || !lastName || (userType === "seller" && !shopName.trim())}
          className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 mt-1 shadow-sm shadow-indigo-500/20 cursor-pointer text-sm"
        >
          {loading ? "Création en cours..." : userType === "seller" ? "Créer ma boutique" : "Créer mon compte"}
        </button>
      </form>

      <div className="mt-5 pt-5 border-t border-zinc-100 text-center text-sm text-zinc-500">
        Déjà un compte ?{" "}
        <button onClick={onSwitchToLogin} className="text-indigo-600 font-bold hover:underline cursor-pointer">
          Se connecter
        </button>
      </div>
    </div>
  );
}

// ─── Modal Wrapper ───────────────────────────────────────────────────────────

/**
 * Modale d'authentification globale de l'application.
 *
 * Affichée en superposition sur toute la page. Son état (ouverte/fermée, vue active)
 * est entièrement contrôlé par `AuthModalContext`.
 *
 * Comportement :
 * - Fermeture par clic sur le fond, ou touche `Escape`.
 * - Empêche le défilement du body quand ouverte.
 * - Bascule entre `LoginForm` et `RegisterForm` sans rechargement de page.
 * - Animation d'entrée CSS (`modalIn` keyframe).
 *
 * @returns La modale avec le formulaire actif, ou `null` si fermée.
 */
export function AuthModal() {
  const { modalView, closeModal, openLogin, openRegister } = useAuthModal();
  const isOpen = modalView !== null;

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, closeModal]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-y-auto max-h-[90vh]"
        style={{ animation: "modalIn 0.2s ease-out" }}
      >
        {/* Close button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all z-10 cursor-pointer"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-8 py-8">
          {modalView === "login" ? (
            <LoginForm onSwitchToRegister={openRegister} />
          ) : (
            <RegisterForm onSwitchToLogin={openLogin} />
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}