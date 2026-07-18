interface BannerContent {
  emoji: string
  headline: string
  sub: string
  bg: string
}

const SPORT_BANNERS: Record<string, BannerContent> = {
  padel: {
    emoji: '🎾',
    headline: '¡Aprovechá antes de tu próximo partido!',
    sub: 'Paletas y pelotas de Padel — hasta 20% OFF',
    bg: 'linear-gradient(135deg, #16a34a, #15803d)',
  },
  tennis_singles: {
    emoji: '🎾',
    headline: 'Prepará tu próximo partido',
    sub: 'Encordado de raquetas con descuento',
    bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  },
  tennis_doubles: {
    emoji: '🎾',
    headline: 'Prepará tu próximo partido',
    sub: 'Encordado de raquetas con descuento',
    bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  },
  football_5: {
    emoji: '⚽',
    headline: '¿Listo para el partido?',
    sub: 'Botines y pelotas de Fútbol — envío gratis',
    bg: 'linear-gradient(135deg, #ea580c, #c2410c)',
  },
  football_11: {
    emoji: '⚽',
    headline: '¿Listo para el partido?',
    sub: 'Botines y pelotas de Fútbol — envío gratis',
    bg: 'linear-gradient(135deg, #ea580c, #c2410c)',
  },
}

const DEFAULT_BANNER: BannerContent = {
  emoji: '🏆',
  headline: 'FaltaUno!!',
  sub: 'Organizá tu próximo partido en segundos',
  bg: 'linear-gradient(135deg, #16a34a, #15803d)',
}

/** Draft/mock ad space — themed to the sport of the next upcoming event. No real ad-serving logic yet. */
export default function AdBanner({ sportId }: { sportId?: string }) {
  const content = (sportId && SPORT_BANNERS[sportId]) || DEFAULT_BANNER

  return (
    <div className="relative overflow-hidden rounded-[10px] p-4 text-white" style={{ background: content.bg }}>
      <span
        className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[0.62rem] font-semibold"
        style={{ background: 'rgba(255,255,255,0.25)' }}
      >
        Publicidad (mock)
      </span>
      <div className="text-2xl">{content.emoji}</div>
      <p className="mt-1 text-base font-bold">{content.headline}</p>
      <p className="text-sm opacity-90">{content.sub}</p>
    </div>
  )
}
