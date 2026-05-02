import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="glass rounded-[20px] p-8 max-w-xs w-full">
        <WifiOff
          className="w-16 h-16 mx-auto mb-4"
          style={{ color: "var(--text-tertiary)" }}
        />
        <h2
          className="text-[17px] font-bold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          You are offline
        </h2>
        <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
          Please check your internet connection and try again.
        </p>
      </div>
    </div>
  );
}
