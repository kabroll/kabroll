// Image Open Graph dynamique (1200×630) générée à la volée.
// Affichée lors du partage du site sur les réseaux sociaux.

import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
          color: "white",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Motif de pixels en fond */}
        <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
          {["#ffffff", "#ffffff66", "#ffffff66", "#ffffff"].map((c, i) => (
            <div
              key={i}
              style={{ width: 64, height: 64, background: c, borderRadius: 12 }}
            />
          ))}
        </div>
        <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2 }}>
          unmillion.fr
        </div>
        <div style={{ fontSize: 34, opacity: 0.85, marginTop: 8 }}>
          1 000 000 de pixels · à vous d&apos;en posséder un
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
