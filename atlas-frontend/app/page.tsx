
import Hero from "@/components/ui/Hero";
import Categories from "@/components/ui/Categories";
import ProduitVedette from "@/components/ui/ProduitVedette";
import WhyAtlas from "@/components/ui/WhyAtlas";

/**
 * Page d'accueil publique de l'application Atlas.
 *
 * Assemble les quatre sections principales de la landing page :
 * hero avec recherche, grille de catégories, produits en vedette,
 * et section argumentaire "Pourquoi Atlas ?".
 *
 * @returns La page d'accueil complète.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0f2e]">
      <Hero />
      <Categories />
      <ProduitVedette /> 
      <WhyAtlas />
    </main>
  );
}