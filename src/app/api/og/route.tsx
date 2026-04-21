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
          background: "#0a1b3d",
          fontFamily: "system-ui, sans-serif",
          padding: "80px",
        }}
      >
        {/* Logo circle */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "3px solid rgba(255,255,255,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            fontWeight: "bold",
            color: "white",
            marginBottom: 40,
          }}
        >
          NSC
        </div>

        <div
          style={{
            fontSize: 56,
            fontWeight: "bold",
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          Nefyn Sailing Club
        </div>

        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.7)",
            textAlign: "center",
          }}
        >
          Race Management &amp; Results
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 48,
            fontSize: 20,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          nefynsailing.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
