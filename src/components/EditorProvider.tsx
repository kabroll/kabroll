"use client";

// État partagé de l'éditeur de pixels (le "mini-Paint").
// - painted : Map "x,y" -> couleur hex (peinture multi-couleurs en cours)
// - tool    : outil actif (pixel / zone / gomme / déplacer / pipette)
// - color   : couleur courante du pinceau
// - palette : couleurs récemment utilisées
// - mode image : pose d'une image (gérée à part du painted)

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Tool = "pixel" | "zone" | "erase" | "move" | "picker";

export const DEFAULT_PALETTE = [
  "#111111", "#ffffff", "#ef4444", "#f59e0b", "#facc15",
  "#22c55e", "#06b6d4", "#3b82f6", "#4f46e5", "#a855f7",
  "#ec4899", "#92400e",
];

interface EditorState {
  painted: Map<string, string>;
  setPainted: (next: Map<string, string>) => void;
  clearPainted: () => void;

  tool: Tool;
  setTool: (t: Tool) => void;

  color: string;
  setColor: (c: string) => void;

  palette: string[];
  pushPaletteColor: (c: string) => void;

  count: number;
}

const EditorContext = createContext<EditorState | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [painted, setPaintedState] = useState<Map<string, string>>(new Map());
  const [tool, setTool] = useState<Tool>("pixel");
  const [color, setColor] = useState("#4f46e5");
  const [palette, setPalette] = useState<string[]>(DEFAULT_PALETTE);
  const lastColors = useRef<Set<string>>(new Set(DEFAULT_PALETTE));

  const setPainted = useCallback((next: Map<string, string>) => {
    setPaintedState(new Map(next));
  }, []);

  const clearPainted = useCallback(() => setPaintedState(new Map()), []);

  const pushPaletteColor = useCallback((c: string) => {
    if (lastColors.current.has(c)) return;
    lastColors.current.add(c);
    setPalette((p) => [c, ...p].slice(0, 18));
  }, []);

  const value = useMemo<EditorState>(
    () => ({
      painted,
      setPainted,
      clearPainted,
      tool,
      setTool,
      color,
      setColor,
      palette,
      pushPaletteColor,
      count: painted.size,
    }),
    [painted, setPainted, clearPainted, tool, color, palette, pushPaletteColor],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor doit être utilisé dans <EditorProvider>");
  return ctx;
}
