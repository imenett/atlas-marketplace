"use client";

/**
 * @file contexts/AuthModalContext.tsx
 * @description Contexte React pour contrôler la modale d'authentification (login/register).
 * Permet à n'importe quel composant d'ouvrir la modale sans prop drilling.
 */

import { createContext, useContext, useState } from "react";

/** Vue affichée dans la modale : "login", "register", ou null (fermée) */
type ModalView = "login" | "register" | null;

/** Type d'utilisateur à créer lors de l'inscription */
type UserType = "buyer" | "seller";

/** Valeur exposée par AuthModalContext */
interface AuthModalContextType {
  /** Vue actuellement affichée dans la modale (null = fermée) */
  modalView: ModalView;
  /** Type d'inscription sélectionné : "buyer" (CLIENT) ou "seller" (VENDEUR) */
  registerType: UserType;
  /** Ouvre la modale sur le formulaire de connexion */
  openLogin: () => void;
  /**
   * Ouvre la modale sur le formulaire d'inscription.
   * @param {UserType} [type="buyer"] - Type de compte à créer
   */
  openRegister: (type?: UserType) => void;
  /** Ferme la modale */
  closeModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType>({
  modalView: null,
  registerType: "buyer",
  openLogin: () => {},
  openRegister: () => {},
  closeModal: () => {},
});

/**
 * Fournisseur du contexte de la modale d'authentification.
 * À placer au niveau racine de l'application (dans `providers.tsx`).
 * @param {{ children: React.ReactNode }} props
 */
export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [modalView, setModalView] = useState<ModalView>(null);
  const [registerType, setRegisterType] = useState<UserType>("buyer");

  return (
    <AuthModalContext.Provider
      value={{
        modalView,
        registerType,
        openLogin: () => setModalView("login"),
        openRegister: (type: UserType = "buyer") => {
          setRegisterType(type);
          setModalView("register");
        },
        closeModal: () => setModalView(null),
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

/**
 * Hook pour contrôler la modale d'authentification depuis n'importe quel composant client.
 * @returns {AuthModalContextType} État et actions de la modale
 */
export function useAuthModal() {
  return useContext(AuthModalContext);
}
