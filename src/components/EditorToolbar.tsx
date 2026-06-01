"use client";

// Barre d'outils flottante en bas du canvas :
//   outils (Pixel / Zone / Gomme / Pipette / Déplacer) + palette de couleurs
//   + sélecteur de couleur libre + bouton "Tout effacer".

import { useEditor, type Tool } from "@/components/EditorProvider";

const TOOLS: { id: Tool; label: string; icon: React.ReactNode }[] = [
  {
    id: "pixel",
    label: "Pixel",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3M12 19v3M2 12h3M19 12h3M12 9a3 3 0 100 6 3 3 0 000-6z" />,
  },
  {
    id: "zone",
    label: "Zone",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" />,
  },
  {
    id: "erase",
    label: "Gomme",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16 3l5 5L10 19H5l-2-2a2 2 0 010-3L13 4M8 21h12" />,
  },
  {
    id: "picker",
    label: "Pipette",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15 4l5 5M18 6l-9 9-4 1 1-4 9-9M3 21l3-1" />,
  },
  {
    id: "move",
    label: "Déplacer",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4" />,
  },
];

export default function EditorToolbar() {
  const { tool, setTool, color, setColor, palette, count, clearPainted, pushPaletteColor } = useEditor();

  function pick(c: string) {
    setColor(c);
    pushPaletteColor(c);
    if (tool === "move" || tool === "erase" || tool === "picker") setTool("pixel");
  }

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(680px,calc(100%-1.5rem))] animate-fade-in">
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-lg border border-black/[0.06] px-2 py-2 flex flex-col gap-2">
        {/* Ligne outils */}
        <div className="flex items-center justify-center gap-1">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              aria-label={t.label}
              aria-pressed={tool === t.id}
              className={
                "flex flex-col items-center justify-center gap-0.5 w-[58px] h-11 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 " +
                (tool === t.id ? "bg-accent text-white" : "text-black/55 hover:bg-black/[0.05]")
              }
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {t.icon}
              </svg>
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}

          {count > 0 && (
            <>
              <span className="w-px h-9 bg-black/10 mx-1" />
              <button
                onClick={clearPainted}
                title="Tout effacer"
                aria-label="Tout effacer"
                className="flex flex-col items-center justify-center gap-0.5 w-[58px] h-11 rounded-xl text-black/55 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 4v6m4-6v6M5 7l1 13a1 1 0 001 1h10a1 1 0 001-1l1-13" />
                </svg>
                <span className="text-[10px] font-medium">Effacer</span>
              </button>
            </>
          )}
        </div>

        {/* Ligne palette */}
        <div className="flex items-center gap-1.5 px-1 overflow-x-auto scrollbar-thin">
          {/* Sélecteur libre */}
          <label
            className="relative w-7 h-7 rounded-lg border-2 border-white shadow ring-1 ring-black/10 shrink-0 cursor-pointer overflow-hidden"
            title="Couleur personnalisée"
            style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
          >
            <input
              type="color"
              value={color}
              onChange={(e) => pick(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>

          <span className="w-px h-6 bg-black/10 shrink-0" />

          {palette.map((c) => {
            const active = c.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={c}
                onClick={() => pick(c)}
                title={c}
                aria-label={`Couleur ${c}`}
                className={
                  "w-7 h-7 rounded-lg shrink-0 transition-transform " +
                  (active ? "ring-2 ring-accent ring-offset-1 scale-110" : "ring-1 ring-black/10 hover:scale-105")
                }
                style={{ backgroundColor: c }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
