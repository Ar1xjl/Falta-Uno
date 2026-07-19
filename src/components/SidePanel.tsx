interface Mockup {
  emoji: string
  label: string
  bg: string
}

/** Decorative desktop-only mockups — reserved space for future real sponsor/ad slots, not wired to anything yet. */
export const SPORT_MOCKUPS: Mockup[] = [
  { emoji: '🎾', label: 'Padel / Tenis', bg: 'linear-gradient(135deg, #16a34a, #15803d)' },
  { emoji: '⚽', label: 'Fútbol', bg: 'linear-gradient(135deg, #ea580c, #c2410c)' },
  { emoji: '⛳', label: 'Golf', bg: 'linear-gradient(135deg, #0ea5e9, #0369a1)' },
  { emoji: '🏆', label: 'Tu club acá', bg: 'linear-gradient(135deg, #7c3aed, #5b21b6)' },
]

export default function SidePanel({ items }: { items: Mockup[] }) {
  return (
    <aside className="side-banner">
      {items.map((m, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-[10px] p-4 text-white"
          style={{ background: m.bg, minHeight: 200 }}
        >
          <span
            className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold"
            style={{ background: 'rgba(255,255,255,0.25)' }}
          >
            Espacio publicitario
          </span>
          <div className="mt-10 text-3xl">{m.emoji}</div>
          <p className="mt-2 text-sm font-bold">{m.label}</p>
          <p className="text-xs opacity-80">Próximamente</p>
        </div>
      ))}
    </aside>
  )
}
