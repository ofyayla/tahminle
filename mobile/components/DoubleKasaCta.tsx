import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api, ApiError, type UserPerkStatus } from "@/lib/api";
import { formatTL } from "@/lib/format";
import { colors, fonts, radii } from "@/lib/theme";
import { IconWallet } from "./icons";

// Çifte Kasa doubles this week's kasa, so it lives inside the kasa card rather
// than in a perks drawer — the joker becomes visible at the moment it is worth
// something. It stays quiet early in the week and turns into a filled CTA once
// the budget is actually running out.
const URGENT_AT = 0.6;

export default function DoubleKasaCta({
  perks,
  cap,
  used,
  overCap,
  onActivated,
}: {
  perks: UserPerkStatus;
  cap: number;
  used: number;
  overCap: boolean;
  onActivated: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!perks.doubleKasa.available) return null;

  const urgent = overCap || (cap > 0 && used / cap >= URGENT_AT);
  const boosted = cap * 2;

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      await api.activateDoubleKasa();
      setConfirming(false);
      onActivated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Joker kullanılamadı.");
    } finally {
      setBusy(false);
    }
  }

  if (confirming) {
    return (
      <View style={[styles.wrap, styles.wrapUrgent]}>
        <Text style={styles.confirmText}>
          Sezonluk tek <Text style={{ fontFamily: fonts.bold }}>Çifte Kasa</Text> hakkını bu hafta için
          kullanacaksın. Kasan{" "}
          <Text style={{ color: colors.gold, fontFamily: fonts.bold }}>{formatTL(boosted)}</Text> olacak ve bu
          işlem geri alınamaz.
        </Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.confirmRow}>
          <Pressable
            style={[styles.cancelBtn, busy && { opacity: 0.5 }]}
            disabled={busy}
            onPress={() => setConfirming(false)}
          >
            <Text style={styles.cancelText}>Vazgeç</Text>
          </Pressable>
          <Pressable style={[styles.filledBtn, { flex: 1 }, busy && { opacity: 0.5 }]} disabled={busy} onPress={activate}>
            {busy ? <ActivityIndicator size="small" color={colors.bg} /> : <Text style={styles.filledText}>Onayla</Text>}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, urgent && styles.wrapUrgent]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, urgent && { backgroundColor: `${colors.gold}26` }]}>
          <IconWallet size={15} color={urgent ? colors.gold : colors.inkDim} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {overCap ? "Kasan doldu" : urgent ? "Kasan dolmak üzere" : "Çifte Kasa jokerin hazır"}
          </Text>
          <Text style={styles.note}>Bu haftaki kasanı {formatTL(boosted)} yapar · sezonda bir kez</Text>
        </View>
        <Pressable
          style={urgent ? styles.filledBtn : styles.ghostBtn}
          onPress={() => {
            setError(null);
            setConfirming(true);
          }}
        >
          <Text style={urgent ? styles.filledText : styles.ghostText}>Kullan</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.bgElevated,
    padding: 12,
    marginTop: 12,
  },
  wrapUrgent: { borderColor: `${colors.gold}59`, backgroundColor: `${colors.gold}0D` },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: `${colors.inkDim}1A`, alignItems: "center", justifyContent: "center" },
  title: { color: colors.ink, fontSize: 13, fontFamily: fonts.bold },
  note: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 3 },
  ghostBtn: { borderRadius: radii.lg, borderWidth: 1, borderColor: `${colors.gold}66`, paddingHorizontal: 12, paddingVertical: 7 },
  ghostText: { color: colors.gold, fontSize: 12, fontFamily: fonts.bold },
  filledBtn: { alignItems: "center", justifyContent: "center", borderRadius: radii.lg, backgroundColor: colors.gold, paddingHorizontal: 14, paddingVertical: 9 },
  filledText: { color: colors.bg, fontSize: 12, fontFamily: fonts.bold },
  confirmText: { color: colors.ink, fontSize: 13, fontFamily: fonts.regular, lineHeight: 19 },
  confirmRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  cancelBtn: { flex: 1, alignItems: "center", borderRadius: radii.lg, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, paddingVertical: 9 },
  cancelText: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.bold },
  error: { color: colors.red, fontSize: 12, fontFamily: fonts.regular, marginTop: 8 },
});
