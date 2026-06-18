'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Store,
  LogOut,
  BarChart2,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import logo from '@/assets/Atlas_logo_blanc.png';

/** Props du composant `SellerSidebar`. */
interface SellerSidebarProps {
  /** Nom de la boutique affiché dans l'en-tête de la sidebar. Par défaut `"Ma Boutique"`. */
  sellerName?: string;
}

/**
 * Sidebar de navigation du tableau de bord vendeur.
 *
 * Affiche les liens de navigation (Tableau de bord, Mes produits, Ma boutique, Mes ventes)
 * avec indication visuelle de la page active (bordure indigo + fond semi-transparent).
 *
 * Disponible en deux variantes :
 * - **Desktop** : sidebar latérale sticky avec mode réduit (icônes uniquement) toggle.
 * - **Mobile** : barre supérieure fixe + tiroir latéral animé.
 *
 * @param sellerName - Nom de la boutique du vendeur connecté.
 */
export function SellerSidebar({ sellerName = 'Ma Boutique' }: SellerSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();

  const navItems = [
    { label: 'Tableau de bord', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Mes produits',    icon: Package,         href: '/products'  },
    { label: 'Ma boutique',     icon: Store,           href: '/shop'      },
    { label: 'Mes ventes',      icon: BarChart2,       href: '/dashboard/orders' },
  ];

  const isActive = (href: string) => pathname === href;

  const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {navItems.map((item) => {
        const Icon   = item.icon;
        const active = isActive(item.href);
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate}>
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group`}
              style={
                active
                  ? {
                      borderLeft:      '3px solid #4F46E5',
                      paddingLeft:     'calc(0.75rem - 3px)',
                      backgroundColor: 'rgba(79, 70, 229, 0.15)',
                    }
                  : {}
              }
            >
              <Icon
                className="h-5 w-5 flex-shrink-0"
                style={{ color: active ? '#4F46E5' : 'rgba(255,255,255,0.6)', strokeWidth: 2 }}
              />
              {!collapsed && (
                <span className="text-sm font-medium" style={{ color: active ? '#ffffff' : 'rgba(255,255,255,0.6)' }}>
                  {item.label}
                </span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden md:flex ${collapsed ? 'w-20' : 'w-64'} h-screen sticky top-0 flex-col transition-all duration-300 z-40`}
        style={{ backgroundColor: '#19244B' }}
      >
        {/* Logo & Toggle Header */}
        <div
          className={`flex py-4 border-b ${collapsed ? 'flex-col items-center gap-4 px-0' : 'items-center justify-between px-5'}`}
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <Link href="/dashboard" className={`flex items-center gap-2.5 shrink-0 ${collapsed ? 'justify-center' : ''}`}>
            <Image src={logo} alt="Atlas" width={32} height={32} className="shrink-0" />
            {!collapsed && (
              <div className="relative">
                <span className="text-xl font-semibold text-white">Atlas</span>
                <div
                  className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #4F46E5 0%, #2563EB 100%)' }}
                />
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title={collapsed ? "Agrandir le menu" : "Minimiser le menu"}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>

        {/* Shop badge */}
        <div className={`p-4 border-b ${collapsed ? 'px-4' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 rounded-lg h-9 w-9 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm">
              {sellerName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{sellerName}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Espace vendeur</div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className={`flex-1 p-4 space-y-1 ${collapsed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <NavItems />
        </nav>

        {/* Footer */}
        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="p-4">
            <Button
              variant="ghost"
              className={`w-full ${collapsed ? 'justify-center px-0' : 'justify-start gap-3'} hover:bg-white/10`}
              style={{ color: 'rgba(255,255,255,0.6)' }}
              onClick={() => logout()}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" style={{ strokeWidth: 2 }} />
              {!collapsed && <span className="text-sm font-medium cursor-pointer">Déconnexion</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: '#19244B', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src={logo} alt="Atlas" width={28} height={28} />
          <span className="text-white font-semibold text-base">Atlas</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div
            className="absolute left-0 top-0 bottom-0 w-[75%] max-w-xs flex flex-col"
            style={{ backgroundColor: '#19244B' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="flex items-center gap-2.5">
                <Image src={logo} alt="Atlas" width={32} height={32} />
                <span className="text-white font-semibold text-lg">Atlas</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500 rounded-lg h-9 w-9 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm">
                  {sellerName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{sellerName}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Espace vendeur</div>
                </div>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              <NavItems onNavigate={() => setMobileOpen(false)} />
            </nav>
            <div className="border-t p-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.6)' }}
                onClick={() => { logout(); setMobileOpen(false); }}
              >
                <LogOut className="h-5 w-5 flex-shrink-0" style={{ strokeWidth: 2 }} />
                <span className="text-sm font-medium">Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}