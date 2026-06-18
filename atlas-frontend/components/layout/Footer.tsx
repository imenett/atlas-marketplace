import Link from "next/link";
import { SiFacebook, SiX, SiInstagram } from "@icons-pack/react-simple-icons";

/**
 * Pied de page global de l'application, présent sur toutes les pages.
 *
 * Affiche quatre colonnes :
 * - **À propos** : description courte de la plateforme.
 * - **Navigation** : liens principaux (Catalogue, Devenir vendeur, À propos, Contact).
 * - **Légal** : CGU, politique de confidentialité, mentions légales.
 * - **Réseaux sociaux** : icônes Facebook, Twitter (X) et Instagram.
 *
 * @returns Le pied de page complet avec copyright.
 */
export function Footer() {
  return (
    <footer className="border-t border-border bg-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h4 className="mb-4 text-foreground">À propos d'Atlas</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">
              La plateforme multi-vendeurs qui connecte des milliers de vendeurs
              indépendants avec des clients du monde entier.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-4 text-foreground">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/catalogue"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Catalogue
                </Link>
              </li>
              <li>
                <Link
                  href="/vendeurs"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Devenir vendeur
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  À propos
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 text-foreground">Légal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link
                  href="/legal"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Mentions légales
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="mb-4 text-foreground">Suivez-nous</h4>
            <div className="flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary-indigo hover:text-white transition-all"
              >
                <SiFacebook className="h-4 w-4" />
                <span className="sr-only">Facebook</span>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary-indigo hover:text-white transition-all"
              >
                <SiX className="h-4 w-4" />
                <span className="sr-only">Twitter</span>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary-indigo hover:text-white transition-all"
              >
                <SiInstagram className="h-4 w-4" />
                <span className="sr-only">Instagram</span>
              </a>
              
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Atlas. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
