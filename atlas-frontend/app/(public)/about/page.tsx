import Link from "next/link";
import {
  ShoppingBag, Users, Shield, Zap, Globe,
  ArrowRight, Package, HeartHandshake, ShieldCheck,
  Truck, MessageCircle, BadgeCheck, Sparkles,
} from "lucide-react";
import { VendorCTA } from "./VendorCTA";

export const metadata = {
  title: "À propos d'Atlas — La plateforme multi-vendeurs",
  description:
    "Atlas est une marketplace française qui connecte des vendeurs indépendants avec des acheteurs. Découvrez notre mission, nos valeurs et notre équipe.",
};

function Store(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" />
    </svg>
  );
}

const STATS = [
  { label: "Boutiques partenaires", value: "50+",     icon: Store   },
  { label: "Produits disponibles",  value: "2 000+",  icon: Package },
  { label: "Clients satisfaits",    value: "10 000+", icon: Users   },
];

const VALUES = [
  {
    icon: HeartHandshake,
    title: "Authenticité",
    description: "Nous sélectionnons rigoureusement chaque vendeur pour vous garantir des produits authentiques et de haute qualité.",
  },
  {
    icon: Shield,
    title: "Confiance & Sécurité",
    description: "Vos paiements sont 100% sécurisés. Nous garantissons chaque transaction et protégeons vos données personnelles.",
  },
  {
    icon: Zap,
    title: "Simplicité",
    description: "Une expérience d'achat fluide, rapide et intuitive — depuis la recherche du produit jusqu'à la livraison à votre porte.",
  },
  {
    icon: Globe,
    title: "Communauté",
    description: "Atlas, c'est une communauté de passionnés : des vendeurs qui aiment leur métier et des acheteurs qui cherchent le meilleur.",
  },
];

export default function AboutPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(180deg, #1C3461 0%, #243D75 25%, #2D4A8A 45%, #C7D4F0 65%, #EEF2FF 82%, #F5F6FA 100%)",
      }}
    >
      {/*  Hero ---------------------------------------------- */}
      <section className="relative pt-20 pb-40 px-4 text-center overflow-hidden">

        {/* Bulles lumineuses */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute top-10 right-1/4 w-64 h-64 rounded-full bg-indigo-300/15 blur-3xl" />
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[700px] h-48 rounded-full bg-indigo-200/20 blur-2xl" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
            <span className="text-white/85 text-xs font-medium tracking-wide uppercase">Notre histoire</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-5 drop-shadow-sm">
            La marketplace qui{" "}
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #A5B4FC, #C7D4FF)" }}
            >
              connecte
            </span>{" "}
            tout le monde
          </h1>

          <p className="text-white text-xl leading-relaxed max-w-xl mx-auto font-medium mb-8">
            Atlas est né d'une idée simple : créer un espace où des vendeurs
            passionnés rencontrent des acheteurs qui cherchent l'authenticité.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/catalogue"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#1C3461] hover:bg-white/90 font-semibold px-6 py-3 rounded-xl transition-colors text-sm w-full sm:w-auto shadow-lg"
            >
              Explorer le catalogue
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/vendeurs"
              className="inline-flex items-center justify-center gap-2 border border-white/30 hover:border-white/50 hover:bg-white/10 text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm w-full sm:w-auto"
            >
              Nos vendeurs
            </Link>
          </div>
        </div>
      </section>

      {/*  Stats --------------------------------------------------------- */}
      <section className="relative max-w-5xl mx-auto px-4 pb-12" style={{ marginTop: "-5rem" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                <Icon className="h-6 w-6 text-indigo-600" />
              </div>
              <p className="text-3xl font-bold text-[#1C3461]">{value}</p>
              <p className="text-sm font-medium text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/*  Mission -------------------------------------------------------- */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-indigo-600 text-sm font-semibold uppercase tracking-widest mb-3">
                Notre mission
              </p>
              <h2 className="text-3xl font-bold text-[#1C3461] mb-5 leading-snug">
                Simplifier le commerce, amplifier les passions
              </h2>
              <p className="text-slate-500 leading-relaxed mb-4">
                Atlas est une plateforme multi-vendeurs conçue pour donner une vitrine
                numérique moderne à chaque entrepreneur — qu'il soit artisan, revendeur
                ou créateur indépendant.
              </p>
              <p className="text-slate-500 leading-relaxed">
                Nous croyons que le commerce en ligne doit rester humain. C'est pourquoi
                chaque boutique présente sur Atlas est vérifiée, accompagnée et encouragée
                à offrir la meilleure expérience possible à ses clients.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { Icon: ShieldCheck,    label: "Achat sécurisé"    },
                { Icon: Truck,          label: "Livraison rapide"   },
                { Icon: MessageCircle,  label: "Support réactif"    },
                { Icon: BadgeCheck,     label: "Vendeurs vérifiés"  },
              ].map(({ Icon, label }) => (
                <div
                  key={label}
                  className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex flex-col items-center text-center gap-2"
                >
                  <Icon className="h-8 w-8 text-indigo-500" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values --------------------------------------------------------- */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-2">
            Ce qui nous guide
          </p>
          <h2 className="text-3xl font-bold text-slate-700">Nos valeurs</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Vendeur ---------------------------------------------------- */}
      <section className="max-w-5xl mx-auto px-4 py-12 pb-20">
        <div
          className="rounded-2xl px-8 py-14 text-center relative overflow-hidden shadow-lg"
          style={{ background: "linear-gradient(135deg, #1C3461 0%, #2D4A8A 50%, #4F46E5 100%)" }}
        >
          {/* Bulles déco */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
              <span className="text-white/85 text-xs font-medium tracking-wide uppercase">Rejoignez-nous</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Vous êtes vendeur ?
            </h2>
            <p className="text-white/80 max-w-md mx-auto mb-8 text-base font-medium">
              Rejoignez Atlas et profitez d'une vitrine en ligne moderne, d'outils de
              gestion intuitifs, et d'une communauté d'acheteurs engagés.
            </p>
            <VendorCTA />
          </div>
        </div>
      </section>
    </div>
  );
}