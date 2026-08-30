import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ReceivedGift } from "@/lib/api";
import { colors, fonts, radii } from "@/lib/theme";
import { IconGift } from "./icons";
import ReceivedGiftBox from "./ReceivedGiftBox";

// Arriving gifts are the one thing on this screen worth interrupting for, so
// they get their own gold-bordered card right under the balance instead of
// sharing a collapsed panel with the send-a-gift form. Renders nothing when
// there is nothing to open — the row simply isn't there most weeks.
export default function GiftInbox({
  received,
  onChanged,
}: {
  received: ReceivedGift[];
  onChanged: () => void;
}) {
  // Opening a gift flips it to `opened` on the next reload, which would drop it
  // out of this card the instant the reveal lands. Anything opened while the
  // screen has been up stays until the user leaves.
  const [revealed, setRevealed] = useState<string[]>([]);

  const shown = received.filter((g) => !g.opened || revealed.includes(g.id));
  if (shown.length === 0) return null;

  const waiting = shown.filter((g) => !g.opened).length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <IconGift size={18} color={colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{waiting > 0 ? "Sana hediye var" : "Kuponun hazır"}</Text>
          <Text style={styles.subtitle}>
            {waiting > 0
              ? `${waiting} sürpriz kupon seni bekliyor`
              : "Sonuç maç bitince bakiyene işlenir"}
          </Text>
        </View>
      </View>

      <View style={styles.boxes}>
        {shown.map((g) => (
          <ReceivedGiftBox
            key={g.id}
            gift={g}
            onOpened={(id) => {
              setRevealed((r) => (r.includes(id) ? r : [...r, id]));
              onChanged();
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: `${colors.gold}59`,
    backgroundColor: `${colors.gold}0D`,
    padding: 16,
    marginBottom: 20,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: `${colors.gold}26`, alignItems: "center", justifyContent: "center" },
  title: { color: colors.ink, fontSize: 15, fontFamily: fonts.display },
  subtitle: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.regular, marginTop: 2 },
  boxes: { gap: 8, marginTop: 14 },
});
