import Link from 'next/link';
import { Home, Search, AlertCircle } from 'lucide-react';

/**
 * Page 404 affichée automatiquement par Next.js quand une URL n'existe pas.
 *
 * Propose deux boutons de navigation : retour à l'accueil et accès au catalogue.
 *
 * @returns La page d'erreur 404.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-indigo-100/40 border border-slate-100 max-w-lg w-full text-center animate-in fade-in zoom-in duration-300">
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 bg-indigo-50 rounded-full animate-pulse" />
          <div className="absolute inset-4 bg-indigo-100 rounded-full" />
          <Search className="absolute inset-0 m-auto w-12 h-12 text-[#5c59f2]" />
          <div className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        </div>

        <h1 className="text-4xl font-extrabold text-[#19244B] mb-4 tracking-tight">Erreur 404</h1>
        <h2 className="text-xl font-semibold text-slate-700 mb-3">Page introuvable</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Il semblerait que vous vous soyez perdu. La page que vous cherchez n'existe pas, a été déplacée ou vous n'y avez pas accès.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/" className="flex-1">
            <button className="w-full bg-[#5c59f2] hover:bg-[#4a47d1] text-white py-3.5 px-6 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
              <Home className="w-5 h-5" />
              Accueil
            </button>
          </Link>
          <Link href="/catalogue" className="flex-1">
            <button className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-3.5 px-6 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2">
              <Search className="w-5 h-5" />
              Catalogue
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
