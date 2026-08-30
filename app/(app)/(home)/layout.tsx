import SplashOverlay from "@/components/SplashOverlay";

// Sits above the (app) layout so the splash overlay renders immediately on a
// cold load — outside the Suspense boundary that loading.tsx fills — and stays
// put across the loading.tsx -> page.tsx swap, holding until it fades itself.
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SplashOverlay />
    </>
  );
}
