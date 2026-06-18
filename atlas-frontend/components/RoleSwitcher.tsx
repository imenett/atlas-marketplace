'use client';

/**
 * @file components/RoleSwitcher.tsx
 * @description Widget de développement fixé en bas à droite.
 * Affiche le rôle actuel de l'utilisateur et propose une déconnexion rapide.
 * Invisible si aucun utilisateur n'est connecté.
 */

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Bouton flottant affichant le rôle de l'utilisateur connecté (CLIENT ou VENDEUR)
 * avec un menu déroulant pour se déconnecter.
 * Rendu nul si aucun utilisateur n'est connecté.
 */
export function RoleSwitcher() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // ── Guard before any user access ────────────────────────────────────────────
  if (!user) return null;

  const isVendor = user.role === 'VENDEUR';
  

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-[20px] right-[20px] z-[9999] gap-2 bg-[#4F46E5] text-white border-[#4F46E5] hover:bg-[#4338ca] hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Afficher mon rôle</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <span>Rôle actuel :</span>
            <Badge
              className={
                isVendor
                  ? 'bg-purple-500/20 text-purple-700 hover:bg-purple-500/20'
                  : 'bg-blue-500/20 text-blue-700 hover:bg-blue-500/20'
              }
            >
              {isVendor ? 'Vendeur' : 'Acheteur'}
            </Badge>
          </div>
          {user.name && (
            <div className="text-xs text-muted-foreground mt-1">{user.name}</div>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-600 focus:text-red-600"
        >
          <span>Se déconnecter</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}