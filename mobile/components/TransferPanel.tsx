import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api, ApiError, type TransferHistoryItem, type TransferTarget } from "@/lib/api";
import { formatTL } from "@/lib/format";
import { colors, fonts, radii } from "@/lib/theme";
import { IconArrowRight, IconChevronDown } from "./icons";

const PRESETS = [50, 100, 250, 500];

export default function TransferPanel({
  targets,
  history,
  available,
  onDone,
}: {
  targets: TransferTarget[];
  history: TransferHistoryItem[];
  available: number;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("100");
  const [note, setNote] = useState("");
  // A transfer can't be undone, so the button never fires the request
  // directly — it flips into an explicit confirm step first.
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const amountNum = Math.floor(Number(amount) || 0);
  const recipient = targets.find((t) => t.id === recipientId);
  const canSubmit = !!recipient && amountNum >= 10 && amountNum <= available;

  const reset = () => setConfirming(false);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await api.sendTransfer(recipientId, amountNum, note || null);
      setDone(`${formatTL(amountNum)} → ${recipient!.displayName}`);
      setRecipientId("");
      setNote("");
      setConfirming(false);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Bağlantı hatası, tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => setOpen((o) => !o)}>
        <View style={styles.iconWrap}>
          <IconArrowRight size={16} color={colors.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Bakiye Gönder</Text>
          <Text style={styles.subtitle}>Başka bir taraftara sanal bakiye aktar</Text>
        </View>
        <View style={open ? { transform: [{ rotate: "180deg" }] } : undefined}>
          <IconChevronDown size={16} color={colors.inkDim} />
        </View>
      </Pressable>

      {open && (
        <View style={{ marginTop: 16, gap: 16 }}>
          <View>
            <Text style={styles.label}>Kime</Text>
            <View style={styles.grid}>
              {targets.map((t) => {
                const active = recipientId === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      setRecipientId(active ? "" : t.id);
                      reset();
                    }}
                    style={[styles.chip, active && styles.chipActiveGreen]}
                  >
                    <Text style={[styles.chipText, active && { color: colors.green }]} numberOfLines={1}>
                      {t.displayName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Tutar</Text>
            <View style={styles.presetRow}>
              {PRESETS.map((p) => {
                const active = amountNum === p;
                const tooMuch = p > available;
                return (
                  <Pressable
                    key={p}
                    disabled={tooMuch}
                    onPress={() => {
                      setAmount(String(p));
                      reset();
                    }}
                    style={[styles.preset, active && styles.presetActive, tooMuch && { opacity: 0.35 }]}
                  >
                    <Text style={[styles.presetText, active && { color: colors.gold }]}>₺{p}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={amount}
              onChangeText={(v) => {
                setAmount(v);
                reset();
              }}
            />
            <Text style={styles.hint}>Kullanılabilir: {formatTL(available)}</Text>
          </View>

          <View>
            <Text style={styles.label}>
              Not <Text style={styles.labelOptional}>(isteğe bağlı)</Text>
            </Text>
            <TextInput
              style={styles.input}
              maxLength={140}
              value={note}
              onChangeText={setNote}
              placeholder="Bol şans!"
              placeholderTextColor={colors.inkFaint}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
          {done && <Text style={styles.success}>Gönderildi: {done}</Text>}

          {confirming ? (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>
                <Text style={{ color: colors.gold, fontFamily: fonts.bold }}>{formatTL(amountNum)}</Text> tutarını{" "}
                <Text style={{ fontFamily: fonts.bold }}>{recipient?.displayName}</Text> adlı oyuncuya
                göndereceksin. Bu işlem geri alınamaz.
              </Text>
              <View style={styles.confirmRow}>
                <Pressable
                  style={[styles.cancelBtn, busy && { opacity: 0.5 }]}
                  disabled={busy}
                  onPress={() => setConfirming(false)}
                >
                  <Text style={styles.cancelText}>Vazgeç</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryBtn, { flex: 1 }, busy && { opacity: 0.5 }]}
                  disabled={busy}
                  onPress={submit}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.bg} />
                  ) : (
                    <Text style={styles.primaryText}>Onayla ve Gönder</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={[styles.primaryBtn, !canSubmit && { opacity: 0.35 }]}
              disabled={!canSubmit}
              onPress={() => {
                setDone(null);
                setError(null);
                setConfirming(true);
              }}
            >
              <Text style={styles.primaryText}>
                {!recipient ? "Önce alıcı seç" : amountNum > available ? "Bakiye yetersiz" : "Devam"}
              </Text>
            </Pressable>
          )}

          {history.length > 0 && (
            <View style={styles.historyWrap}>
              <Text style={styles.label}>Transfer Geçmişi</Text>
              <View style={{ gap: 8 }}>
                {history.map((h) => (
                  <View key={h.id} style={styles.historyRow}>
                    <Text style={styles.historyLabel} numberOfLines={1}>
                      {h.direction === "out" ? "→ " : "← "}
                      <Text style={{ color: colors.ink }}>{h.counterparty}</Text>
                      {h.note ? <Text style={{ color: colors.inkFaint }}> · {h.note}</Text> : null}
                    </Text>
                    <Text
                      style={[
                        styles.historyAmount,
                        { color: h.direction === "out" ? colors.red : colors.green },
                      ]}
                    >
                      {h.direction === "out" ? "−" : "+"}
                      {formatTL(h.amount)}
                    </Text>
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
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${colors.green}26`, alignItems: "center", justifyContent: "center" },
  title: { color: colors.ink, fontSize: 15, fontFamily: fonts.display },
  subtitle: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.regular, marginTop: 2 },
  label: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 },
  labelOptional: { color: colors.inkFaint, fontFamily: fonts.regular, textTransform: "none" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { width: "47%", borderRadius: radii.xl, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.bgElevated, paddingHorizontal: 12, paddingVertical: 10 },
  chipActiveGreen: { borderColor: colors.green, backgroundColor: `${colors.green}1A` },
  chipText: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.semibold },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  preset: { flex: 1, alignItems: "center", borderRadius: radii.xl, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.bgElevated, paddingVertical: 8 },
  presetActive: { borderColor: colors.gold, backgroundColor: `${colors.gold}1A` },
  presetText: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.bold },
  input: { borderRadius: radii.xl, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.bgElevated, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontSize: 13, fontFamily: fonts.regular },
  hint: { color: colors.inkFaint, fontSize: 11, fontFamily: fonts.regular, marginTop: 6 },
  error: { color: colors.red, fontSize: 13, fontFamily: fonts.regular, backgroundColor: `${colors.red}1A`, borderRadius: radii.xl, paddingHorizontal: 12, paddingVertical: 8 },
  success: { color: colors.green, fontSize: 13, fontFamily: fonts.regular, backgroundColor: `${colors.green}1A`, borderRadius: radii.xl, paddingHorizontal: 12, paddingVertical: 8 },
  confirmBox: { borderRadius: radii.xl, borderWidth: 1, borderColor: `${colors.gold}66`, backgroundColor: `${colors.gold}0D`, padding: 12 },
  confirmText: { color: colors.ink, fontSize: 13, fontFamily: fonts.regular, lineHeight: 19 },
  confirmRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  cancelBtn: { flex: 1, alignItems: "center", borderRadius: radii.xl, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.bgElevated, paddingVertical: 10 },
  cancelText: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.bold },
  primaryBtn: { alignItems: "center", justifyContent: "center", borderRadius: radii.xl, backgroundColor: colors.gold, paddingVertical: 12 },
  primaryText: { color: colors.bg, fontSize: 13, fontFamily: fonts.bold },
  historyWrap: { borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 12 },
  historyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  historyLabel: { flex: 1, color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
  historyAmount: { fontSize: 13, fontFamily: fonts.display },
});
