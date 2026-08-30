import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api, ApiError, type UserPerkStatus } from "@/lib/api";
import { colors, fonts, radii } from "@/lib/theme";

export default function PerksPanel({ perks, onChanged }: { perks: UserPerkStatus; onChanged: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activateDoubleKasa() {
    setError(null);
    setLoading(true);
    try {
      await api.activateDoubleKasa();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Joker kullanılamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Jokerler</Text>
      <Text style={styles.title}>Sezonda bir kez</Text>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>💰 Çifte Kasa</Text>
          <Text style={styles.rowNote}>
            {perks.doubleKasa.available ? "Bu haftaki kasan ₺2.000'e çıkar" : "Bu sezon kullanıldı"}
          </Text>
        </View>
        {perks.doubleKasa.available ? (
          <Pressable style={styles.btn} onPress={activateDoubleKasa} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color={colors.bg} /> : <Text style={styles.btnText}>Kullan</Text>}
          </Pressable>
        ) : (
          <View style={styles.usedChip}>
            <Text style={styles.usedChipText}>Kullanıldı</Text>
          </View>
        )}
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>🛡 Sigorta</Text>
          <Text style={styles.rowNote}>
            {perks.insurance.available ? "Bir tahminini kaybedersen iade alırsın" : "Bu sezon kullanıldı"}
          </Text>
        </View>
        <View style={styles.usedChip}>
          <Text style={styles.usedChipText}>{perks.insurance.available ? "Tahminler'den seç" : "Kullanıldı"}</Text>
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 16, marginBottom: 20 },
  eyebrow: { fontSize: 11, fontFamily: fonts.bold, color: colors.inkDim, textTransform: "uppercase" },
  title: { fontSize: 17, fontFamily: fonts.display, color: colors.ink, marginTop: 2, marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    padding: 14,
    marginBottom: 10,
  },
  rowTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  rowNote: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 3 },
  btn: { backgroundColor: colors.gold, borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 9 },
  btnText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 12 },
  usedChip: { backgroundColor: colors.bg, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 8 },
  usedChipText: { color: colors.inkFaint, fontFamily: fonts.bold, fontSize: 11 },
  error: { color: colors.red, fontSize: 11, fontFamily: fonts.regular, marginTop: 4 },
});
