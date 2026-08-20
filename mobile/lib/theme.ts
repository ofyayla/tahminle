// Mirrors the web app's dark/gold palette (app/globals.css) for brand consistency.
export const colors = {
  bg: "#0a0d16",
  bgElevated: "#10131f",
  card: "#141a2b",
  cardBorder: "#232a3d",
  gold: "#f6c945",
  goldDim: "#a98a2e",
  ink: "#f5f6fa",
  inkDim: "#9aa2b8",
  inkFaint: "#616a80",
  green: "#3ecf8e",
  red: "#ef5865",
};

// Tailwind's default border-radius scale (rem * 16px), used verbatim by the
// web app's rounded-lg/xl/2xl/3xl/full classes.
export const radii = { lg: 8, xl: 12, "2xl": 16, "3xl": 24, full: 9999 };

// Matches app/layout.tsx's next/font setup: Archivo Black for `.font-display`
// headings/numbers, Manrope (by weight) for everything else.
export const fonts = {
  display: "ArchivoBlack_400Regular",
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extrabold: "Manrope_800ExtraBold",
};
