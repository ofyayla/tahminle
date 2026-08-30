import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconArrowRight, IconPeople } from "./icons";
import { colors, fonts, radii } from "@/lib/theme";

// A sample table rather than a blank "henüz kimse yok" — the pitch is what
// the screen looks like once friends are in it, shown with fabricated rows
// (not "..." skeletons — an actual filled-in scene reads as a promise, a
// skeleton reads as "still loading").
const SAMPLE_ROWS = [
  { rank: "🥇", name: "Sen", net: "+₺450" },
  { rank: "🥈", name: "Arkadaşın", net: "+₺120" },
  { rank: "🥉", name: "Arkadaşın", net: "−₺80" },
];

// Shown in the Sıralama tab's "Arkadaşlarım" segment when the account has no
// friend league yet. The entry point used to be a small 👥 card buried under
// the global board; this is the segment's entire content instead, so the
// pitch gets the same weight the feature is supposed to have.
export default function InviteFriendsCard() {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <View style={styles.sample}>
        {SAMPLE_ROWS.map((r, i) => (
          <View key={i} style={[styles.sampleRow, i > 0 && styles.sampleDivider]}>
            <Text style={styles.sampleRank}>{r.rank}</Text>
            <Text style={styles.sampleName}>{r.name}</Text>
            <Text style={[styles.sampleNet, { color: r.net.startsWith("−") ? colors.red : colors.green }]}>
              {r.net}
            </Text>
          </View>
        ))}
        <View style={[StyleSheet.absoluteFillObject, styles.sampleOverlay]} />
      </View>

      <View style={styles.iconWrap}>
        <IconPeople size={20} color={colors.gold} />
      </View>
      <Text style={styles.title}>Kendi ligini kur</Text>
      <Text style={styles.note}>
        Global sıralama binlerce kişi arasında kaybolur. Arkadaşlarınla aynı kasada, sadece aranızda bir
        sıralama kur — kim daha iyi tahmin ediyor, gerçekten görün.
      </Text>

      <Pressable style={styles.cta} onPress={() => router.push({ pathname: "/ligler", params: { mode: "create" } })}>
        <Text style={styles.ctaText}>Lig Kur, Arkadaşlarını Davet Et</Text>
        <IconArrowRight size={15} color={colors.bg} />
      </Pressable>
      <Text style={styles.bonusNote}>Katılan her arkadaşınla ikinize de ₺100 bonus.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 20,
    alignItems: "center",
  },
  sample: {
    width: "100%",
    borderRadius: radii.xl,
    backgroundColor: colors.bgElevated,
    marginBottom: 16,
    overflow: "hidden",
  },
  sampleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  sampleDivider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  sampleRank: { fontSize: 14, width: 20 },
  sampleName: { flex: 1, color: colors.ink, fontFamily: fonts.semibold, fontSize: 12 },
  sampleNet: { fontFamily: fonts.display, fontSize: 12 },
  // A soft fade over the sample rows — legible enough to read as "this could
  // be your group", faint enough to read as illustrative, not live data.
  sampleOverlay: { backgroundColor: `${colors.card}4D` },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.gold}1F`, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { color: colors.ink, fontSize: 18, fontFamily: fonts.display, textAlign: "center" },
  note: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, textAlign: "center", marginTop: 8, lineHeight: 19, paddingHorizontal: 4 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.gold,
    borderRadius: radii.xl,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 18,
    alignSelf: "stretch",
  },
  ctaText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 14 },
  bonusNote: { color: colors.goldDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 10 },
});
