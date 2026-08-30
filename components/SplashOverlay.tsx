"use client";

import { useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";

// Holds for at least MIN_MS from load so a fast render doesn't flash the
// splash, then fades out over FADE_MS to reveal the Maç Günü page that
// rendered behind it.
const MIN_MS = 1500;
const FADE_MS = 350;

// Shown once per full page load. The flag lives at module scope so it survives
// client-side navigation (returning to "/" from another tab doesn't replay the
// splash) but resets on a hard reload — which is exactly when "the app opens".
let shownThisLoad = false;

type Phase = "visible" | "fading" | "gone";

export default function SplashOverlay() {
  const [phase, setPhase] = useState<Phase>(shownThisLoad ? "gone" : "visible");

  useEffect(() => {
    shownThisLoad = true;
  }, []);

  useEffect(() => {
    if (phase !== "visible") return;
    const t = setTimeout(() => setPhase("fading"), MIN_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "fading") return;
    const t = setTimeout(() => setPhase("gone"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div className="splash-root" data-fading={phase === "fading" ? "true" : "false"} aria-hidden={phase === "fading"}>
      <div className="splash-body">
        <BrandLogo width={150} />
        <div className="splash-bar" />
      </div>
    </div>
  );
}
