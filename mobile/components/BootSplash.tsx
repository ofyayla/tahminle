import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View, type ViewProps } from "react-native";
import Wordmark from "@/components/Wordmark";
import { colors } from "@/lib/theme";

type Props = {
  onLayout?: ViewProps["onLayout"];
  // Held at 0 while the splash waits; AppGate drives it 0 -> 1 to play the
  // zoom-through hand-off (the wordmark blows up past the screen, X-style).
  exit?: Animated.Value;
};

// The JS side of the launch splash: the gold "TAHMİNLE" wordmark on the same
// #0a0d16 field as the native splash, a low-key three-dot pulse beneath it so
// the 1.5–4s warm-up hold never looks frozen, and an X-app-style exit where
// the wordmark scales up through the screen as the field dissolves to reveal
// the app.
export default function BootSplash({ onLayout, exit }: Props) {
  const idle = useRef(new Animated.Value(0)).current;
  const e = exit ?? idle;
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));

  useEffect(() => {
    const STEP = 160; // stagger between dots
    const PULSE = 420; // fade up / fade down, each
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * STEP),
          Animated.timing(v, { toValue: 1, duration: PULSE, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: PULSE, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          // Pad the tail so every dot's cycle is the same length — the wave never drifts.
          Animated.delay((dots.length - 1 - i) * STEP),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots]);

  // A small anticipatory dip, then the wordmark rushes toward the viewer.
  const markScale = e.interpolate({ inputRange: [0, 0.18, 1], outputRange: [1, 0.94, 22] });
  const markOpacity = e.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 1, 0] });
  // The dots drop out the instant the hand-off begins.
  const dotsExit = e.interpolate({ inputRange: [0, 0.1], outputRange: [1, 0], extrapolate: "clamp" });

  return (
    <View style={styles.fill} onLayout={onLayout}>
      <Animated.View style={{ opacity: markOpacity, transform: [{ scale: markScale }] }}>
        <Wordmark width={240} />
      </Animated.View>
      <Animated.View style={[styles.dots, { opacity: dotsExit }]}>
        {dots.map((v, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.22, 1] }),
                transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }) }],
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  // Anchored below the screen's centre (where the wordmark sits) so the wordmark
  // stays pixel-aligned with the native splash and the dots don't shift it.
  dots: { position: "absolute", top: "50%", marginTop: 52, flexDirection: "row", gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: colors.gold },
});
