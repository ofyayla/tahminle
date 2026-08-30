import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api, ApiError, type LeagueDetail } from "@/lib/api";
import { colors, fonts, radii } from "@/lib/theme";

export default function LeagueAdminPanel({
  league,
  onLeft,
  onDeleted,
  onChanged,
}: {
  league: LeagueDetail;
  onLeft: () => void;
  onDeleted: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function leave() {
    setError(null);
    setBusy("leave");
    try {
      await api.leaveLeague(league.id);
      onLeft();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ayrılamadın.");
    } finally {
      setBusy(null);
    }
  }

  async function kick(userId: string) {
    setError(null);
    setBusy(userId);
    try {
      await api.kickFromLeague(league.id, userId);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Çıkarılamadı.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteLeague() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    setBusy("delete");
    try {
      await api.deleteLeague(league.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lig silinemedi.");
    } finally {
      setBusy(null);
    }
  }

  if (!league.isOwner) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Bu ligden ayrılmak ister misin?</Text>
        <Text style={styles.note}>Tekrar davet koduyla katılabilirsin.</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.dangerBtn} onPress={leave} disabled={busy !== null}>
          {busy === "leave" ? <ActivityIndicator size="small" color={colors.red} /> : <Text style={styles.dangerBtnText}>Ligden Ayrıl</Text>}
        </Pressable>
      </View>
    );
  }

  const members = league.week.ranked.filter((r) => !r.isYou);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Üye Yönetimi</Text>

      {members.length === 0 ? (
        <Text style={styles.note}>Henüz başka üye yok — davet kodunu paylaş.</Text>
      ) : (
        <View style={{ gap: 6, marginTop: 10, marginBottom: 12 }}>
          {members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <Text style={styles.memberName} numberOfLines={1}>{m.displayName}</Text>
              <Pressable style={styles.kickBtn} onPress={() => kick(m.id)} disabled={busy !== null}>
                {busy === m.id ? <ActivityIndicator size="small" color={colors.inkDim} /> : <Text style={styles.kickBtnText}>Çıkar</Text>}
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.dangerBtn, confirmDelete && styles.dangerBtnConfirm]} onPress={deleteLeague} disabled={busy !== null}>
        {busy === "delete" ? (
          <ActivityIndicator size="small" color={confirmDelete ? colors.bg : colors.red} />
        ) : (
          <Text style={[styles.dangerBtnText, confirmDelete && { color: colors.bg }]}>
            {confirmDelete ? "Emin misin? Tekrar dokun, sil" : "Ligi Sil"}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 16 },
  eyebrow: { fontSize: 11, fontFamily: fonts.bold, color: colors.inkDim, textTransform: "uppercase" },
  title: { color: colors.ink, fontSize: 14, fontFamily: fonts.bold, marginBottom: 3 },
  note: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },
  memberRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.bgElevated, borderRadius: radii.xl, paddingHorizontal: 14, paddingVertical: 10 },
  memberName: { flex: 1, color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 },
  kickBtn: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.lg, paddingHorizontal: 12, paddingVertical: 6 },
  kickBtnText: { color: colors.inkDim, fontFamily: fonts.bold, fontSize: 11 },
  error: { color: colors.red, fontSize: 11, fontFamily: fonts.regular, marginTop: 8, marginBottom: 4 },
  dangerBtn: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: `${colors.red}66`, backgroundColor: `${colors.red}1A`, borderRadius: radii.xl, paddingVertical: 12, marginTop: 12 },
  dangerBtnConfirm: { backgroundColor: colors.red, borderColor: colors.red },
  dangerBtnText: { color: colors.red, fontFamily: fonts.bold, fontSize: 12 },
});
