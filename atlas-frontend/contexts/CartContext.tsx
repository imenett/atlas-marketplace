"use client";

/**
 * @file contexts/CartContext.tsx
 * @description Contexte React pour le compteur d'articles du panier.
 * Effectue un fetch initial au montage et expose `refreshCart` pour déclencher
 * une mise à jour après un ajout/suppression d'article.
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";

/** Valeur exposée par CartContext */
interface CartContextType {
  /** Nombre total d'articles dans le panier (somme des quantités) */
  cartCount: number;
  /** Recharge le compteur depuis l'API (à appeler après ajout/suppression) */
  refreshCart: () => void;
  /** Réinitialise immédiatement le compteur à 0 (à appeler après une commande confirmée) */
  clearCart: () => void;
}

const CartContext = createContext<CartContextType>({ cartCount: 0, refreshCart: () => {}, clearCart: () => {} });

/**
 * Fournisseur du contexte panier.
 * Charge le nombre d'articles au montage et expose `refreshCart`.
 * Silencieux en cas d'erreur (ex: utilisateur non connecté → cartCount = 0).
 * @param {{ children: React.ReactNode }} props
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartCount, setCartCount] = useState(0);

  /**
   * Récupère le panier depuis l'API et met à jour le compteur.
   * Stabilisé avec `useCallback` pour éviter des re-fetches inutiles.
   */
  const refreshCart = useCallback(() => {
    fetch('/api/cart', {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        const total = (data.articles || []).reduce(
          (acc: number, item: any) => acc + item.quantite, 0
        );
        setCartCount(total);
      })
      .catch(() => setCartCount(0));
  }, []);

  const clearCart = useCallback(() => {
    setCartCount(0);
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  return (
    <CartContext.Provider value={{ cartCount, refreshCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

/**
 * Hook pour accéder au compteur panier et à la fonction de rafraîchissement.
 * @returns {CartContextType} Compteur et fonction de refresh
 */
export function useCart() {
  return useContext(CartContext);
}
