"use client";

/**
 * Liste des arguments marketing affichés dans la section "Pourquoi Atlas ?".
 * Chaque entrée contient une icône SVG, un titre court et une description.
 */
const reasons = [
  {
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#3b6bff" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    title: "Multi-vendeurs",
    description: "Accédez à des milliers de vendeurs indépendants qui proposent des produits uniques et variés.",
  },
  {
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#3b6bff" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Paiement sécurisé",
    description: "Vos transactions sont protégées et sécurisées grâce à notre système de paiement avancé.",
  },
  {
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#3b6bff" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Livraison rapide",
    description: "Bénéficiez d'une livraison rapide et suivez vos commandes en temps réel.",
  },
];

/**
 * Section "Pourquoi Atlas ?" de la page d'accueil.
 *
 * Affiche trois cartes animées présentant les avantages clés de la plateforme :
 * multi-vendeurs, paiement sécurisé, et livraison rapide.
 * La grille passe de 1 colonne (mobile) à 3 colonnes (desktop).
 *
 * @returns La section marketing avec les trois cartes d'avantages.
 */
export default function WhyAtlas() {
  return (
    <section className="bg-white py-12 px-4 sm:py-16 sm:px-8 md:py-20 md:px-20">
      <div className="max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="text-center mb-10 sm:mb-12">
          <h2
            className="text-xl sm:text-2xl font-bold text-[#111] mb-2"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Pourquoi Atlas ?
          </h2>
          <p
            className="text-xs sm:text-sm text-[#888]"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Une marketplace qui fait la différence
          </p>
        </div>

        {/* Cards grid — 1 col mobile, 3 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              className="border border-[#e8eaf0] rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-[rgba(59,107,255,0.1)] hover:border-[#3b6bff]"
            >
              {/* Icon container */}
              <div className="w-14 h-14 rounded-2xl bg-[rgba(59,107,255,0.08)] flex items-center justify-center">
                {reason.icon}
              </div>

              {/* Title */}
              <div
                className="text-sm sm:text-base font-bold text-[#111]"
                style={{ fontFamily: "Syne, sans-serif" }}
              >
                {reason.title}
              </div>

              {/* Description */}
              <p
                className="text-xs sm:text-[13px] text-[#777] leading-relaxed"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}