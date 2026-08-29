import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { colors } from "@/lib/theme";

// The web hero uses a CSS `radial-gradient(circle, rgba(246,201,69,0.35),
// transparent 70%)`. A plain View with a background colour and borderRadius
// can't fade out — it just draws a hard-edged translucent disc, which is what
// the glow looked like on device. This paints the real gradient instead.
export default function GoldGlow({ size = 200 }: { size?: number }) {
  return (
    <Svg width={size} height={size} style={{ position: "absolute", right: -size / 4, top: -size / 4 }}>
      <Defs>
        <RadialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={colors.gold} stopOpacity={0.3} />
          <Stop offset="60%" stopColor={colors.gold} stopOpacity={0.08} />
          <Stop offset="100%" stopColor={colors.gold} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#goldGlow)" />
    </Svg>
  );
}
