"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuthModal } from "@/contexts/AuthModalContext";
import {
  ShoppingCart,
  User,
  Menu,
  LogOut,
  Package,
  ShieldCheck,
  Store,
  Users,
  LayoutDashboard,
  BarChart2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import Image from "next/image";
import logo from "@/assets/Atlas_logo_blanc.png";

/** Rôles utilisateurs possibles dans l'application. `null` si non authentifié. */
type Role = "CLIENT" | "VENDEUR" | "ADMIN" | null;

/** Props du composant `Header`. */
interface HeaderProps {
  /** @deprecated Utiliser le CartContext à la place. Ce prop est ignoré. */
  cartCount?: number;
}

/**
 * Liens de navigation affichés selon le rôle de l'utilisateur connecté.
 * Les vendeurs n'ont pas de liens dans le header public car ils ont leur propre sidebar.
 */
const NAV_LINKS: Record<NonNullable<Role> | "VISITOR", { label: string; href: string }[]> = {
  VISITOR: [
    { label: "Home", href: "/" },
    { label: "Catalogue", href: "/catalogue" },
    { label: "Vendeurs", href: "/vendeurs" },
    { label: "À propos", href: "/about" },
  ],
  CLIENT: [
    { label: "Home", href: "/" },
    { label: "Catalogue", href: "/catalogue" },
    { label: "Vendeurs", href: "/vendeurs" },
    { label: "À propos", href: "/about" },
  ],
  VENDEUR: [],
  ADMIN: [
    { label: "Home", href: "/" },
    { label: "Utilisateurs", href: "/admin/users" },
    { label: "Produits", href: "/admin/products" },
    { label: "Vendeurs", href: "/admin/sellers" },
  ],
};

/** Styles CSS inline du header selon le rôle (fond foncé pour tous sauf ADMIN qui a un fond rouge). */
const HEADER_STYLE: Record<NonNullable<Role> | "VISITOR", React.CSSProperties> = {
  VISITOR: {
    background: "rgba(13, 27, 62, 0.8)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  },
  CLIENT: {
    background: "rgba(13, 27, 62, 0.8)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  },
  VENDEUR: {},
  ADMIN: {
    background: "rgba(30, 10, 10, 0.92)",
    backdropFilter: "blur(12px)",
    borderBottom: "2px solid rgba(239, 68, 68, 0.5)",
  },
};

/**
 * En-tête global de l'application, présent sur toutes les pages publiques et client.
 *
 * Adapte son contenu selon le rôle de l'utilisateur :
 * - **Visiteur** : liens catalogue/vendeurs/à propos + boutons Connexion/Inscription.
 * - **CLIENT** : mêmes liens + icône panier avec badge + menu déroulant (profil, commandes).
 * - **ADMIN** : liens admin + badge rouge "Admin" + menu déroulant d'administration.
 * - **VENDEUR** : header masqué sur les pages vendeur (`/dashboard`, `/products`, etc.).
 *
 * Inclut un menu mobile hamburger pour les écrans de petite taille.
 *
 * @param cartCount - Nombre d'articles dans le panier (affichés en badge sur l'icône).
 */
export function Header({}: HeaderProps) {
  const { user, isAuthenticated, logout , isLoading  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { openLogin, openRegister } = useAuthModal();
  const { cartCount } = useCart();
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const VALID_ROLES: Role[] = ["CLIENT", "VENDEUR", "ADMIN"];
  const rawRole = user?.role?.toString()?.trim()?.toUpperCase() as Role;
  const role = VALID_ROLES.includes(rawRole) ? rawRole : null;

  // Only hide header on vendor-specific pages, NOT on public /products/[id]
  const isVendeurPage =
    pathname.startsWith("/dashboard") ||
    pathname === "/products" ||           // exact match: vendor product list
    pathname.startsWith("/shop") ||
    pathname.startsWith("/ventes");
    
  if (isVendeurPage) return null;

  // On vendor pages the header is hidden; on any other page treat VENDEUR as VISITOR
  // (guards against stale BetterAuth localStorage cache returning a VENDEUR session
  //  while the real CLIENT session is being verified in the background)
  const roleKey: NonNullable<Role> | "VISITOR" =
    isAuthenticated && role
      ? role === "VENDEUR" && !isVendeurPage
        ? "VISITOR"
        : role
      : "VISITOR";


  if (isLoading) {
    if (isVendeurPage) return null;

    return (
      <header className="sticky top-0 z-50 w-full" style={HEADER_STYLE["VISITOR"]}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image src={logo} alt="Atlas" width={50} height={50} />
              <div className="relative">
                <span className="text-2xl font-semibold text-white">Atlas</span>
                <div
                  className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: "linear-gradient(90deg, #4F46E5 0%, #2563EB 100%)" }}
                />
              </div>
            </Link>
            <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8">
              {NAV_LINKS["VISITOR"].map(({ label, href }) => (
                <Link key={label} href={href} className="text-white/80 hover:text-white transition-colors font-medium" style={{ fontSize: "15px" }}>
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
    );
  }

  if (roleKey === "VENDEUR") return null;

  const userName = user?.name || "Utilisateur";
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const navLinks = NAV_LINKS[roleKey] ?? NAV_LINKS["VISITOR"];
  const headerStyle = HEADER_STYLE[roleKey];


  return (
    <header className="sticky top-0 z-50 w-full" style={headerStyle}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src={logo} alt="Atlas" width={50} height={50} />
            <div className="relative">
              <span className="text-2xl font-semibold text-white">Atlas</span>
              <div
                className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                style={{
                  background:
                    roleKey === "ADMIN"
                      ? "linear-gradient(90deg, #EF4444 0%, #B91C1C 100%)"
                      : "linear-gradient(90deg, #4F46E5 0%, #2563EB 100%)",
                }}
              />
            </div>
          </Link>

          {/* Role badge (ADMIN only) */}
          {roleKey === "ADMIN" && (
            <span className="hidden md:flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-red-400 border border-red-500/40 rounded-full px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </span>
          )}

          {/* Nav */}
          {navLinks.length > 0 && (
            <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8">
              {navLinks.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="text-white/80 hover:text-white transition-colors font-medium"
                  style={{ fontSize: "15px" }}
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right-side actions */}
          <div className="flex items-center gap-3">

            {/* Inscription / Connexion — non authentifié seulement, hidden on auth pages */}
            {!isAuthenticated && !isAuthPage && (
              <div className="hidden md:flex items-center gap-2">
                {/* Connexion — ghost outline */}
                
                  <button
                    onClick={openLogin}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.3)",
                      color: "white",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    Connexion
                  </button>
                

                {/* Inscription — solid filled */}
                
                  <button
                    onClick={() => openRegister()}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      background: "#4F46E5",
                      border: "1px solid transparent",
                      color: "white",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#4338CA";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#4F46E5";
                    }}
                  >
                    Inscription
                  </button>
                
              </div>
            )}

            {/* Vendor on public pages — link back to dashboard */}
            {isAuthenticated && role === "VENDEUR" && !isVendeurPage && (
              <Link href="/dashboard">
                <button
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    background: "#4F46E5",
                    border: "1px solid transparent",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <LayoutDashboard style={{ width: "15px", height: "15px" }} />
                  Tableau de bord
                </button>
              </Link>
            )}

            {/* Cart — CLIENT only */}
            {roleKey === "CLIENT" && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white hover:bg-white/10 relative"
                asChild
              >
                <Link href="/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-blue-500 border border-[rgba(13,27,62,0.8)]"></span>
                  )}
                  <span className="sr-only">Panier</span>
                </Link>
              </Button>
            )}

            {/* Authenticated — Avatar dropdown (CLIENT + ADMIN only) */}
            {(roleKey === "CLIENT" || roleKey === "ADMIN") && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-0.5 transition-colors cursor-pointer">
                    <Avatar className="h-9 w-9">
                      {user?.url_avatar && (
                        <AvatarImage src={user.url_avatar} alt={userName} className="object-cover" />
                      )}
                      <AvatarFallback
                        className="text-white"
                        style={{
                          background: roleKey === "ADMIN" ? "#EF4444" : "#4F46E5",
                        }}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Menu utilisateur</span>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white border-border"
                  style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--border-section)" }}
                >
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                    <p className="text-xs text-gray-400 capitalize">{roleKey.toLowerCase()}</p>
                  </div>

                  {/* CLIENT items */}
                  {roleKey === "CLIENT" && (
                    <>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/profile" className="flex items-center">
                          <User className="mr-2 h-4 w-4 text-gray-600" />
                          Mon profil
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/orders" className="flex items-center">
                          <Package className="mr-2 h-4 w-4 text-gray-600" />
                          Mes commandes
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* ADMIN items */}
                  {roleKey === "ADMIN" && (
                    <>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/admin/dashboard" className="flex items-center">
                          <ShieldCheck className="mr-2 h-4 w-4 text-red-500" />
                          Dashboard admin
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/admin/users" className="flex items-center">
                          <Users className="mr-2 h-4 w-4 text-gray-600" />
                          Utilisateurs
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/admin/products" className="flex items-center">
                          <Package className="mr-2 h-4 w-4 text-gray-600" />
                          Produits
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/admin/sellers" className="flex items-center">
                          <Store className="mr-2 h-4 w-4 text-gray-600" />
                          Vendeurs
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <Menu className="h-5 w-5" />
              )}
              <span className="sr-only">Menu</span>
            </Button>

          </div>
        </div>

        {/* ── Mobile Menu Drawer ── */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 mt-3 pt-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-1">
              {navLinks.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-xl transition-colors font-medium text-sm"
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Mobile auth buttons — non authentifié seulement */}
            {!isAuthenticated && !isAuthPage && (
              <div className="flex gap-2 mt-4 px-4">
                <button
                  onClick={() => { setMobileMenuOpen(false); openLogin(); }}
                  className="flex-1 w-full py-2.5 rounded-xl text-sm font-medium bg-transparent border border-white/30 text-white cursor-pointer hover:bg-white/10 transition-colors"
                >
                  Connexion
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); openRegister(); }}
                  className="flex-1 w-full py-2.5 rounded-xl text-sm font-medium bg-[#4F46E5] text-white border border-transparent cursor-pointer hover:bg-[#4338CA] transition-colors"
                >
                  Inscription
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}