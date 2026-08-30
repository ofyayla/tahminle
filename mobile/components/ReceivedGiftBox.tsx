import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api, ApiError, type ReceivedGift } from "@/lib/api";
import { formatMatchDate, formatOdds, formatTL } from "@/lib/format";
import { colors, fonts, radii } from "@/lib/theme";
import { IconGift } from "./icons";

// One received surprise coupon, unopened (a box to tap) or revealed (the pick
// it turned into). Owns the open request so both entry points — the wallet
// inbox banner and the gift screen's history — behave identically.
export default function ReceivedGiftBox({
  gift,
  onOpened,
}: {
  gift: ReceivedGift;
  onOpened: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      await api.openGift(gift.id);
      onOpened(gift.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Hediye açılamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.box}>
      <View style={styles.topRow}>
        <Text style={styles.from} numberOfLines={1}>
          <Text style={{ color: colors.gold, fontFamily: fonts.bold }}>{gift.from}</Text>
          <Text style={{ color: colors.inkDim }}> → sürpriz kupon</Text>
        </Text>
        <Text style={styles.stake}>{formatTL(gift.stake)}</Text>
      </View>

      {gift.opened && gift.pick ? (
        <View style={styles.pickBox}>
          <Text style={styles.pickMatch}>{gift.pick.match}</Text>
          <View style={styles.pickRow}>
            <Text style={styles.pickLabel}>{gift.pick.label}</Text>
            <Text style={styles.pickOdds}>{formatOdds(gift.pick.odds)}</Text>
          </View>
          <Text style={styles.pickMeta}>
            {gift.pick.market} · {formatMatchDate(new Date(gift.pick.kickoff))}
          </Text>
          {gift.pick.status !== "open" && (
            <Text style={[styles.pickResult, { color: gift.pick.status === "won" ? colors.green : colors.red }]}>
              {gift.pick.status === "won" ? `Kazandı · +${formatTL(gift.pick.payout ?? 0)}` : "Kaybetti"}
            </Text>
          )}
        </View>
      ) : (
        <Pressable style={[styles.openBtn, busy && { opacity: 0.5 }]} disabled={busy} onPress={open}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.bg} />
          ) : (
            <>
              <IconGift size={15} color={colors.bg} />
              <Text style={styles.openBtnText}>Kutuyu Aç</Text>
            </>
          )}
        </Pressable>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radii.xl, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.bgElevated, padding: 12 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  from: { flex: 1, fontSize: 13, fontFamily: fonts.regular },
  stake: { color: colors.gold, fontSize: 13, fontFamily: fonts.display },
  pickBox: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 8 },
  pickMatch: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
  pickRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 2 },
  pickLabel: { flex: 1, color: colors.ink, fontSize: 13, fontFamily: fonts.bold },
  pickOdds: { backgroundColor: `${colors.gold}26`, color: colors.gold, fontSize: 12, fontFamily: fonts.display, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.lg, overflow: "hidden" },
  pickMeta: { color: colors.inkFaint, fontSize: 11, fontFamily: fonts.regular, marginTop: 4 },
  pickResult: { fontSize: 12, fontFamily: fonts.bold, marginTop: 6 },
  openBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, borderRadius: radii.lg, backgroundColor: colors.gold, paddingVertical: 9 },
  openBtnText: { color: colors.bg, fontSize: 13, fontFamily: fonts.bold },
  error: { color: colors.red, fontSize: 12, fontFamily: fonts.regular, marginTop: 8 },
});
