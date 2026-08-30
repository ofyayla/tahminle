import { useRouter } from "expo-router";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { IconArrowRight, IconPeople, IconShare } from "./icons";
import { inviteLink, inviteMessage } from "@/lib/referral";
import type { MyLeague } from "@/lib/api";
import { colors, fonts, radii } from "@/lib/theme";

// A sample table rather than a blank "henüz kimse yok" — the pitch is what
// the screen looks like once friends are in it, shown with fabricated rows
// (not "..." skeletons — an actual filled-in scene reads as a promise, a
// skeleton reads as "still loading"). Kept the same whether or not the
// account already has a league — only the copy and CTA below it change; the
// visual itself is the "representative ranking" and stays constant.
const SAMPLE_ROWS = [
  { rank: "🥇", name: "Sen", net: "+₺450" },
  { rank: "🥈", name: "Arkadaşın", net: "+₺120" },
  { rank: "🥉", name: "Arkadaşın", net: "−₺80" },
];

// Used two places: full-width and always open in the Sıralama tab's
// "Arkadaşlarım" empty state, and as the expandable body of the Maç Günü
// hero's "Arkadaşlarını Davet Et" teaser (mobile/app/(tabs)/index.tsx).
//
// `league` is the account's own first league (from getMyLeagues), if any —
// when present this pitches growing *that* league (real share link, direct
// Share sheet) instead of the "kur" pitch aimed at someone with nothing yet.
export default function InviteFriendsCard({
  league,
  referralCode,
}: {
  league?: MyLeague | null;
  referralCode?: string | null;
}) {
  const router = useRouter();

  async function shareExistingLeague() {
    if (!league) return;
    const link = inviteLink(league.inviteCode, referralCode);
    try {
      await Share.share({ message: inviteMessage(league.name, link) });
    } catch {
      // Dismissed mid-render or an odd OS state — not worth surfacing.
    }
  }

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

      {league ? (
        <>
          <Text style={styles.title} numberOfLines={1}>
            &quot;{league.name}&quot;ni Büyüt
          </Text>
          <Text style={styles.note}>
            Ligindeki herkes aynı kasada oynuyor. Bir arkadaşını daha ekle, rekabet kızışsın.
          </Text>
          <Pressable style={styles.cta} onPress={shareExistingLeague}>
            <IconShare size={15} color={colors.bg} />
            <Text style={styles.ctaText}>Arkadaşını Davet Et</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.title}>Kendi ligini kur</Text>
          <Text style={styles.note}>
            Global sıralama binlerce kişi arasında kaybolur. Arkadaşlarınla aynı kasada, sadece aranızda bir
            sıralama kur — kim daha iyi tahmin ediyor, gerçekten görün.
          </Text>
          <Pressable
            style={styles.cta}
            onPress={() => router.push({ pathname: "/ligler", params: { mode: "create" } })}
          >
            <Text style={styles.ctaText}>Lig Kur, Arkadaşlarını Davet Et</Text>
            <IconArrowRight size={15} color={colors.bg} />
          </Pressable>
        </>
      )}
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
  title: { color: colors.ink, fontSize: 18, fontFamily: fonts.display, textAlign: "center", maxWidth: "100%" },
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
