import { Hammer } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6">
        <Hammer className="w-10 h-10" />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Politique de confidentialité</h1>
      <p className="text-lg text-gray-500 max-w-md mb-8">
        Cette page est actuellement en cours de construction. Revenez très bientôt !
      </p>
      <Link href="/" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
        Retour à l'accueil
      </Link>
    </div>
  );
}
