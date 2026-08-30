import BrandLogo from "@/components/BrandLogo";

// Suspense fallback for the Maç Günü page. On a cold open (or a hard reload of
// "/") Next streams this instantly while the server renders the fully-populated
// page behind it, then swaps the real screen in once every query has resolved —
// so the splash only ever gives way to a ready screen. Scoped to the (home)
// route group so switching between the other tabs doesn't trigger it.
export default function Loading() {
  return (
    <div className="splash-root">
      <div className="splash-body">
        <BrandLogo width={150} />
        <div className="splash-bar" />
      </div>
    </div>
  );
}
