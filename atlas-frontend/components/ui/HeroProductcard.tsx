// components/hero/HeroProductCard.tsx

/** Props du composant HeroProductCard utilisé dans la section héro de la page d'accueil. */
interface HeroProductCardProps {
  image: string;
  nom: string;
  prix: number;
  boutique: string;
  note: number;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Carte produit décorative affichée dans la section héro de la page d'accueil.
 *
 * Affiche une image de produit, son nom, son prix, la boutique vendeur et la note en étoiles.
 * Conçue pour être superposée sur l'arrière-plan du héro avec des styles inline personnalisables.
 *
 * @param image - URL de l'image du produit.
 * @param nom - Nom du produit affiché sous l'image.
 * @param prix - Prix du produit affiché en euros.
 * @param boutique - Nom de la boutique vendeur.
 * @param note - Note du produit sur 5 (nombre d'étoiles pleines affichées).
 * @param style - Styles CSS inline additionnels pour le positionnement dans le héro.
 * @param className - Classes Tailwind CSS additionnelles.
 */
export default function HeroProductCard({
  image,
  nom,
  prix,
  boutique,
  note,
  style,
  className,
}: HeroProductCardProps) {
  return (
    <div
      className={className}
      style={{
        background: "white",
        borderRadius: "16px",
        padding: "14px",
        width: "190px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        ...style,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "120px",
          borderRadius: "10px",
          overflow: "hidden",
          marginBottom: "12px",
          background: "#f3f4f6",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={nom}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: "600", fontSize: "14px", color: "#111", marginBottom: "5px" }}>
        {nom}
      </div>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: "700", fontSize: "16px", color: "#3b6bff", marginBottom: "6px" }}>
        {prix} €
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
        <div
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #3b6bff, #7b9fff)",
          }}
        />
        <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "11px", color: "#888" }}>
          {boutique}
        </span>
      </div>
      <div style={{ color: "#f59e0b", fontSize: "12px" }}>
        {"★".repeat(note)}{"☆".repeat(5 - note)}
      </div>
    </div>
  );
}