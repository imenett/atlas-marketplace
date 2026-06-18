/**
 * Layout partagé entre les pages d'authentification (connexion, inscription).
 *
 * Centre verticalement et horizontalement le formulaire affiché, sur un fond uniforme.
 * N'inclut ni le Header ni le Footer car ces pages ont leur propre design autonome.
 *
 * @param children - La page de connexion ou d'inscription à afficher.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        {children}
      </div>
    </div>
  );
}
