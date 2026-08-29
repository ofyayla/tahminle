import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api, ApiError, type ReceivedGift, type SentGift, type TransferTarget } from "@/lib/api";
import { formatMatchDate, formatOdds, formatTL } from "@/lib/format";
import { colors, fonts, radii } from "@/lib/theme";
import { IconChevronDown, IconGift } from "./icons";

const PRESETS = [100, 250, 500];

export default function GiftPanel({
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
  const [open, setOpen] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [price, setPrice] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const recipient = targets.find((t) => t.id === recipientId);
  const fee = Math.max(5, Math.round(price * 0.1));
  const canSubmit = !!recipient && price >= 50 && price <= available;
  const unopened = received.filter((g) => !g.opened);

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

  async function openBox(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api.openGift(id);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Hediye açılamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => setOpen((o) => !o)}>
        <View style={styles.iconWrap}>
          <IconGift size={16} color={colors.gold} />
          {unopened.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unopened.length}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Sürpriz Kupon</Text>
          <Text style={styles.subtitle}>
            {unopened.length > 0
              ? `${unopened.length} açılmamış hediyen var!`
              : "Bir taraftara rastgele bir kupon hediye et"}
          </Text>
        </View>
        <View style={open ? { transform: [{ rotate: "180deg" }] } : undefined}>
          <IconChevronDown size={16} color={colors.inkDim} />
        </View>
      </Pressable>

      {open && (
        <View style={{ marginTop: 16, gap: 16 }}>
          {received.length > 0 && (
            <View>
              <Text style={styles.label}>Sana Gelenler</Text>
              <View style={{ gap: 8 }}>
                {received.map((g) => (
                  <View key={g.id} style={styles.giftBox}>
                    <View style={styles.giftTopRow}>
                      <Text style={styles.giftFrom} numberOfLines={1}>
                        <Text style={{ color: colors.gold, fontFamily: fonts.bold }}>{g.from}</Text>
                        <Text style={{ color: colors.inkDim }}> → sürpriz kupon</Text>
                      </Text>
                      <Text style={styles.giftStake}>{formatTL(g.stake)}</Text>
                    </View>

                    {g.opened && g.pick ? (
                      <View style={styles.pickBox}>
                        <Text style={styles.pickMatch}>{g.pick.match}</Text>
                        <View style={styles.pickRow}>
                          <Text style={styles.pickLabel}>{g.pick.label}</Text>
                          <Text style={styles.pickOdds}>{formatOdds(g.pick.odds)}</Text>
                        </View>
                        <Text style={styles.pickMeta}>
                          {g.pick.market} · {formatMatchDate(new Date(g.pick.kickoff))}
                        </Text>
                        {g.pick.status !== "open" && (
                          <Text
                            style={[
                              styles.pickResult,
                              { color: g.pick.status === "won" ? colors.green : colors.red },
                            ]}
                          >
                            {g.pick.status === "won"
                              ? `Kazandı · +${formatTL(g.pick.payout ?? 0)}`
                              : "Kaybetti"}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Pressable
                        style={[styles.openBtn, busy && { opacity: 0.5 }]}
                        disabled={busy}
                        onPress={() => openBox(g.id)}
                      >
                        <Text style={styles.openBtnText}>🎁 Kutuyu Aç</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.divider}>
            <Text style={styles.label}>Kime</Text>
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
              <Text style={{ color: colors.inkDim }}>{formatTL(price - fee)}</Text> kupona yatırılır.
              Kupon rastgele seçilir (Maç Sonucu, 2.5 Alt/Üst, Karşılıklı Gol veya Çifte Şans) ve
              kazanırsa tamamı alıcıya gider.
            </Text>
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

          {sent.length > 0 && (
            <View style={styles.divider}>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${colors.gold}26`, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", right: -4, top: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.red, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: fonts.bold },
  title: { color: colors.ink, fontSize: 15, fontFamily: fonts.display },
  subtitle: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.regular, marginTop: 2 },
  label: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 },
  divider: { borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 12 },
  giftBox: { borderRadius: radii.xl, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.bgElevated, padding: 12 },
  giftTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  giftFrom: { flex: 1, fontSize: 13, fontFamily: fonts.regular },
  giftStake: { color: colors.gold, fontSize: 13, fontFamily: fonts.display },
  pickBox: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 8 },
  pickMatch: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
  pickRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 2 },
  pickLabel: { flex: 1, color: colors.ink, fontSize: 13, fontFamily: fonts.bold },
  pickOdds: { backgroundColor: `${colors.gold}26`, color: colors.gold, fontSize: 12, fontFamily: fonts.display, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.lg, overflow: "hidden" },
  pickMeta: { color: colors.inkFaint, fontSize: 11, fontFamily: fonts.regular, marginTop: 4 },
  pickResult: { fontSize: 12, fontFamily: fonts.bold, marginTop: 6 },
  openBtn: { marginTop: 8, alignItems: "center", borderRadius: radii.lg, backgroundColor: colors.gold, paddingVertical: 8 },
  openBtnText: { color: colors.bg, fontSize: 13, fontFamily: fonts.bold },
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
