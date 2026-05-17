import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PFinTrack — Personal Finance Tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          background: "linear-gradient(135deg, #2196F3 0%, #1565C0 100%)",
          fontFamily: "sans-serif",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            opacity: 0.9,
            marginBottom: 24,
            letterSpacing: "0.05em",
          }}
        >
          PFinTrack
        </div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            lineHeight: 1.05,
            marginBottom: 32,
            maxWidth: 980,
          }}
        >
          Personal Finance Tracker
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 400,
            opacity: 0.92,
            lineHeight: 1.3,
            maxWidth: 980,
          }}
        >
          Catat dompet, transaksi, pinjaman, dan laporan keuangan pribadi — gratis, tanpa daftar.
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 80,
            fontSize: 24,
            opacity: 0.7,
          }}
        >
          pfintrack.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
