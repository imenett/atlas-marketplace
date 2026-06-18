"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

/**
 * Schéma de validation Zod pour le formulaire de connexion.
 * Vérifie que l'email est valide et que le mot de passe n'est pas vide.
 */
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Veuillez entrer une adresse email valide."),
  motDePasse: z.string().min(1, "Veuillez entrer votre mot de passe."),
});

/**
 * Page de connexion à l'espace Atlas.
 *
 * Affiche un formulaire email + mot de passe avec :
 * - Validation côté client via Zod avant tout appel réseau.
 * - Bouton œil pour afficher/masquer le mot de passe.
 * - Redirection automatique : vendeurs → `/dashboard`, clients → `/`.
 * - Gestion des erreurs BetterAuth (email non vérifié, identifiants incorrects).
 *
 * @returns La page de connexion complète.
 */
export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");

  // Cet état gère si on voit les points noirs ou le texte en clair
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
        // Redirige vers le bon tableau de bord en fonction du rôle
        const userRole = (data.user as any).role;
        const isSeller = userRole === "SELLER" || userRole === "VENDEUR";
        router.refresh();
        router.push(isSeller ? "/dashboard" : "/");
      }
    } catch (err) {
      setError("Email ou mot de passe incorrect.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 py-12 px-4 relative overflow-hidden font-sans w-full">
      <main className="w-full max-w-[480px] z-10">
        {/* La carte blanche principale */}
        <div className="bg-white rounded-2xl w-full px-10 py-9 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 animate-slideUp">
          <h1 className="text-[30px] font-extrabold text-zinc-900 mb-1.5 tracking-tight">
            Se connecter
          </h1>
          <p className="text-sm text-zinc-500 mb-7">
            Accédez à votre espace Atlas
          </p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-3.5 py-3 text-[13.5px] font-medium mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>

            {/* Champ Email */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-900">Adresse email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-zinc-800"
                placeholder="vous@exemple.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-900">Mot de passe <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  className="w-full px-4 py-3.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-zinc-800 pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 mt-2 shadow-sm shadow-indigo-500/20 cursor-pointer"
            >
              {isLoading ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-100">
            {/* Séparateur visuel */}
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-zinc-100"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-3 text-sm text-zinc-400 font-medium">ou</span>
              </div>
            </div>
            {/* Lien vers l'inscription */}
            <p className="text-zinc-500 text-sm text-center">
              Pas encore de compte ?{" "}
              <Link href="/register" className="text-indigo-600 font-bold hover:underline">
                S'inscrire
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
