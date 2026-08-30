import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api, ApiError, type ReceivedGift, type SentGift, type TransferTarget } from "@/lib/api";
import { formatTL } from "@/lib/format";
import { colors, fonts, radii } from "@/lib/theme";
import ReceivedGiftBox from "./ReceivedGiftBox";

const PRESETS = [100, 250, 500];

export default function GiftForm({
  targets,
  received,
  sent,
  available,
  onDone,
}: {
  targets: TransferTarget[];
  received: ReceivedGift[];
  sent: SentGift[];
  available: number;
  onDone: () => void;
}) {
  const [recipientId, setRecipientId] = useState("");
  const [price, setPrice] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const recipient = targets.find((t) => t.id === recipientId);
  const fee = Math.max(5, Math.round(price * 0.1));
  const canSubmit = !!recipient && price >= 50 && price <= available;

  async function send() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await api.sendGift(recipientId, price);
      setDone(`${recipient!.displayName} adlı oyuncuya sürpriz kupon gönderildi.`);
      setRecipientId("");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Bağlantı hatası, tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 20 }}>
      <View>
        <Text style={styles.label}>Kime</Text>
        {targets.length === 0 ? (
          <Text style={styles.empty}>Hediye gönderebileceğin bir taraftar yok.</Text>
        ) : (
          <View style={styles.grid}>
            {targets.map((t) => {
              const active = recipientId === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setRecipientId(active ? "" : t.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && { color: colors.gold }]} numberOfLines={1}>
                    {t.displayName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View>
        <Text style={styles.label}>Paket</Text>
        <View style={styles.presetRow}>
          {PRESETS.map((p) => {
            const active = price === p;
            const tooMuch = p > available;
            return (
              <Pressable
                key={p}
                disabled={tooMuch}
                onPress={() => setPrice(p)}
                style={[styles.preset, active && styles.presetActive, tooMuch && { opacity: 0.35 }]}
              >
                <Text style={[styles.presetText, active && { color: colors.gold }]}>₺{p}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>
          {formatTL(price)} ödersin · {formatTL(fee)} paketleme ücreti ·{" "}
          <Text style={{ color: colors.inkDim }}>{formatTL(price - fee)}</Text> kupona yatırılır. Kupon rastgele
          seçilir (Maç Sonucu, 2.5 Alt/Üst, Karşılıklı Gol veya Çifte Şans) ve kazanırsa tamamı alıcıya gider.
        </Text>
        <Text style={styles.hint}>Kullanılabilir: {formatTL(available)}</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {done && <Text style={styles.success}>{done}</Text>}

      <Pressable
        style={[styles.primaryBtn, (!canSubmit || busy) && { opacity: 0.35 }]}
        disabled={!canSubmit || busy}
        onPress={send}
      >
        {busy ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.primaryText}>
            {!recipient ? "Önce alıcı seç" : price > available ? "Bakiye yetersiz" : "Hediyeyi Gönder"}
          </Text>
        )}
      </Pressable>

      {received.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Sana Gelenler</Text>
          <View style={{ gap: 8 }}>
            {received.map((g) => (
              <ReceivedGiftBox key={g.id} gift={g} onOpened={onDone} />
            ))}
          </View>
        </View>
      )}

      {sent.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Gönderdiklerin</Text>
          <View style={{ gap: 8 }}>
            {sent.map((g) => (
              <View key={g.id} style={styles.historyRow}>
                <Text style={styles.historyLabel} numberOfLines={1}>
                  → <Text style={{ color: colors.ink }}>{g.to}</Text>
                  <Text style={{ color: colors.inkFaint }}> · {g.opened ? g.label : "açılmadı"}</Text>
                </Text>
                <Text style={[styles.historyAmount, { color: colors.red }]}>−{formatTL(g.price)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 },
  empty: { color: colors.inkFaint, fontSize: 13, fontFamily: fonts.regular },
  section: { borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { width: "47%", borderRadius: radii.xl, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.bgElevated, paddingHorizontal: 12, paddingVertical: 10 },
  chipActive: { borderColor: colors.gold, backgroundColor: `${colors.gold}1A` },
  chipText: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.semibold },
  presetRow: { flexDirection: "row", gap: 8 },
  preset: { flex: 1, alignItems: "center", borderRadius: radii.xl, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.bgElevated, paddingVertical: 8 },
  presetActive: { borderColor: colors.gold, backgroundColor: `${colors.gold}1A` },
  presetText: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.bold },
  hint: { color: colors.inkFaint, fontSize: 11, fontFamily: fonts.regular, lineHeight: 16, marginTop: 8 },
  error: { color: colors.red, fontSize: 13, fontFamily: fonts.regular, backgroundColor: `${colors.red}1A`, borderRadius: radii.xl, paddingHorizontal: 12, paddingVertical: 8 },
  success: { color: colors.green, fontSize: 13, fontFamily: fonts.regular, backgroundColor: `${colors.green}1A`, borderRadius: radii.xl, paddingHorizontal: 12, paddingVertical: 8 },
  primaryBtn: { alignItems: "center", justifyContent: "center", borderRadius: radii.xl, backgroundColor: colors.gold, paddingVertical: 12 },
  primaryText: { color: colors.bg, fontSize: 13, fontFamily: fonts.bold },
  historyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  historyLabel: { flex: 1, color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
  historyAmount: { fontSize: 13, fontFamily: fonts.display },
});
