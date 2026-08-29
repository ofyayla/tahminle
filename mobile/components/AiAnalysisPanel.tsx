import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii } from "@/lib/theme";
import { IconChevronDown, IconInfo, IconSparkle } from "./icons";

// The model's note comes back as a short paragraph followed by "•" bullets,
// so the bullets are split out rather than dumped as one blob.
function parseNote(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    paragraphs: lines.filter((l) => !l.startsWith("•")),
    bullets: lines.filter((l) => l.startsWith("•")).map((l) => l.replace(/^•\s*/, "")),
  };
}

export default function AiAnalysisPanel({ analysis }: { analysis: string | null }) {
  const [open, setOpen] = useState(false);

  if (!analysis) return null;

  const { paragraphs, bullets } = parseNote(analysis);

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => setOpen((o) => !o)}>
        <View style={styles.iconWrap}>
          <IconSparkle size={14} color={colors.gold} />
        </View>
        <Text style={styles.title}>Maç Analizi</Text>
        <View style={open ? { transform: [{ rotate: "180deg" }] } : undefined}>
          <IconChevronDown size={16} color={colors.inkDim} />
        </View>
      </Pressable>

      {open && (
        <View style={styles.body}>
          {paragraphs.map((p, i) => (
            <Text key={i} style={[styles.paragraph, i > 0 && { marginTop: 8 }]}>
              {p}
            </Text>
          ))}

          {bullets.length > 0 && (
            <View style={styles.bulletList}>
              {bullets.map((b, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.disclaimerRow}>
            <IconInfo size={12} color={colors.inkFaint} />
            <Text style={styles.disclaimer}>
              Yapay zeka tarafından, maçın bahis oranlarına dayanılarak yazıldı. Tahmin tavsiyesi değildir.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: radii.lg,
    backgroundColor: `${colors.gold}26`,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    color: colors.inkDim,
    fontSize: 12,
    fontFamily: fonts.bold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  body: { marginTop: 10, backgroundColor: colors.bgElevated, borderRadius: radii.xl, padding: 14 },
  paragraph: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, lineHeight: 19 },
  bulletList: { marginTop: 10, gap: 6 },
  bulletRow: { flexDirection: "row", gap: 8 },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.gold, marginTop: 7 },
  bulletText: { flex: 1, color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, lineHeight: 19 },
  disclaimerRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 10,
  },
  disclaimer: { flex: 1, color: colors.inkFaint, fontSize: 11, fontFamily: fonts.regular, lineHeight: 15 },
});
