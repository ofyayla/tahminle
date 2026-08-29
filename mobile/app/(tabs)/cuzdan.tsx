import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InfoAccordion from "@/components/InfoAccordion";
import TransferPanel from "@/components/TransferPanel";
import GiftPanel from "@/components/GiftPanel";
import { IconCheck, IconCirclePlus, IconInfo, IconLock, IconShield, IconTrendUpArrow, IconWallet, IconX } from "@/components/icons";
import ErrorBanner from "@/components/ErrorBanner";
import { api } from "@/lib/api";
import { useScreenLoad } from "@/lib/useScreenLoad";
import { formatMatchDate, formatTime, formatTL } from "@/lib/format";
import { colors, fonts, radii } from "@/lib/theme";

type WalletData = Awaited<ReturnType<typeof api.getWallet>>;
type TransferData = Awaited<ReturnType<typeof api.getTransfers>>;
type GiftData = Awaited<ReturnType<typeof api.getGifts>>;

const ACTIVITY_ICON: Record<string, { Icon: (p: { size: number; color: string }) => React.ReactNode; bg: string; color: string }> = {
  lock: { Icon: IconLock, bg: `${colors.red}1A`, color: colors.red },
  win: { Icon: IconTrendUpArrow, bg: `${colors.green}1A`, color: colors.green },
  loss: { Icon: IconX, bg: `${colors.red}1A`, color: colors.red },
  system: { Icon: IconInfo, bg: `${colors.gold}26`, color: colors.gold },
};

export default function CuzdanScreen() {
  const [data, setData] = useState<WalletData | null>(null);
  const [transfers, setTransfers] = useState<TransferData | null>(null);
  const [gifts, setGifts] = useState<GiftData | null>(null);

  const load = useCallback(async () => {
    const [wallet, transferData, giftData] = await Promise.all([
      api.getWallet(),
      api.getTransfers(),
      api.getGifts(),
    ]);
    setData(wallet);
    setTransfers(transferData);
    setGifts(giftData);
  }, []);

  const { loading, refreshing, error, refresh } = useScreenLoad(load);

  // On a failed load `data` stays null, so falling through to the spinner
  // would leave the screen spinning forever with nothing to act on.
  if (loading || !data) {
    return (
      <SafeAreaView style={styles.flex} edges={["top"]}>
        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 60 }} />
        ) : (
          <View style={{ padding: 16 }}>
            <ErrorBanner message={error ?? "Veri alınamadı."} />
            <Pressable style={styles.retryBtn} onPress={refresh}>
              <Text style={styles.retryText}>Tekrar dene</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    );
  }

  const { wallet, activity } = data;
  const weekChangePct = data.startBalance > 0 ? (wallet.weekChange / data.startBalance) * 100 : 0;
  // `wallet.total` is now just the available balance — money locked in an open
  // prediction is already spent. The two bars still want to show the split of
  // "what's in play", so they need their own denominator.
  const inPlayTotal = wallet.available + wallet.lockedInOpen;
  const availablePct = inPlayTotal > 0 ? Math.round((wallet.available / inPlayTotal) * 100) : 0;
  const lockedPct = inPlayTotal > 0 ? Math.round((wallet.lockedInOpen / inPlayTotal) * 100) : 0;

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl tintColor={colors.gold} refreshing={refreshing} onRefresh={refresh} />}
      >
        <Text style={styles.eyebrow}>Cüzdan Kontrolü</Text>
        <Text style={styles.title}>Sanal Bakiye</Text>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>Toplam Sanal Bakiyen</Text>
              <Text style={styles.heroValue}>{formatTL(wallet.total)}</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <IconWallet size={20} color={colors.gold} />
            </View>
          </View>
          <View style={styles.heroBottomRow}>
            <View>
              <Text style={styles.heroSubLabel}>Başlangıç Bakiyesi</Text>
              <Text style={styles.heroSubValue}>{formatTL(data.startBalance)}</Text>
            </View>
            <View>
              <Text style={styles.heroSubLabel}>Bu Haftaki Değişim</Text>
              <Text style={[styles.heroSubValue, { color: wallet.weekChange >= 0 ? colors.green : colors.red }]}>
                {wallet.weekChange >= 0 ? "+" : ""}
                {formatTL(wallet.weekChange)}
              </Text>
            </View>
          </View>
          <View style={styles.heroDisclaimer}>
            <IconShield size={14} color={colors.green} />
            <Text style={styles.heroDisclaimerText}>Gerçek para kullanılmaz · yalnızca sanal tahmin</Text>
          </View>
        </View>

        <View style={styles.flowHeaderRow}>
          <Text style={styles.sectionTitle}>Bakiye akışı</Text>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Canlı</Text>
          </View>
        </View>
        <Text style={styles.sectionSub}>Tahminlerin ve sonuçların net görünümü.</Text>

        <View style={styles.grid}>
          <View style={styles.gridCard}>
            <View style={styles.gridHeaderRow}>
              <Text style={styles.gridLabel}>Kullanılabilir</Text>
              <IconCheck size={14} color={colors.green} />
            </View>
            <Text style={styles.gridValue}>{formatTL(wallet.available)}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${availablePct}%`, backgroundColor: colors.green }]} />
            </View>
          </View>

          <View style={styles.gridCard}>
            <View style={styles.gridHeaderRow}>
              <Text style={styles.gridLabel}>Açık Tahminlerde</Text>
              <IconLock size={14} color={colors.gold} />
            </View>
            <Text style={styles.gridValue}>{formatTL(wallet.lockedInOpen)}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${lockedPct}%`, backgroundColor: colors.gold }]} />
            </View>
          </View>

          <View style={styles.gridCard}>
            <View style={styles.gridHeaderRow}>
              <Text style={styles.gridLabel}>Bu Hafta</Text>
              <IconTrendUpArrow size={14} color={colors.green} />
            </View>
            <Text style={[styles.gridValue, { color: wallet.weekChange >= 0 ? colors.green : colors.red }]}>
              {wallet.weekChange >= 0 ? "+" : ""}
              {formatTL(wallet.weekChange)}
            </Text>
            <Text style={styles.gridFooterText}>Son 7 gün · {weekChangePct >= 0 ? "+" : ""}{weekChangePct.toFixed(1)}%</Text>
          </View>

          <View style={styles.gridCard}>
            <View style={styles.gridHeaderRow}>
              <Text style={styles.gridLabel}>Toplam Net</Text>
              <IconCirclePlus size={14} color={colors.gold} />
            </View>
            <Text style={[styles.gridValue, { color: wallet.totalNet >= 0 ? colors.gold : colors.red }]}>
              {wallet.totalNet >= 0 ? "+" : ""}
              {formatTL(wallet.totalNet)}
            </Text>
            <Text style={styles.gridFooterText}>Başlangıçtan beri</Text>
          </View>
        </View>

        {transfers && (
          <View style={{ marginBottom: 12 }}>
            <TransferPanel
              targets={transfers.targets}
              history={transfers.history}
              available={wallet.available}
              onDone={load}
            />
          </View>
        )}

        {gifts && (
          <View style={{ marginBottom: 20 }}>
            <GiftPanel
              targets={transfers?.targets ?? []}
              received={gifts.received}
              sent={gifts.sent}
              available={wallet.available}
              onDone={load}
            />
          </View>
        )}

        <Text style={styles.sectionTitle}>Son Hareketler</Text>
        <Text style={[styles.sectionSub, { marginBottom: 12 }]}>Her işlem bir maç veya sistem olayına bağlıdır.</Text>
        {activity.length === 0 ? (
          <Text style={styles.empty}>Henüz bir hareket yok.</Text>
        ) : (
          <View style={styles.activityCard}>
            {activity.map((item, i) => {
              const date = new Date(item.at);
              const meta = ACTIVITY_ICON[item.kind] ?? ACTIVITY_ICON.system;
              return (
                <View key={item.id} style={[styles.activityRow, i > 0 && styles.activityDivider]}>
                  <View style={[styles.activityIconWrap, { backgroundColor: meta.bg }]}>
                    <meta.Icon size={16} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activitySub}>
                      {formatMatchDate(date)} · {formatTime(date)} · {item.subtitle}
                    </Text>
                  </View>
                  <Text style={[styles.activityAmount, { color: item.amount >= 0 ? colors.green : colors.red }]}>
                    {item.amount >= 0 ? "+" : "−"}
                    {formatTL(Math.abs(item.amount))}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ marginTop: 20 }}>
          <InfoAccordion title="Nasıl hesaplanır?" subtitle="Sanal getirinin kısa açıklaması">
            Tahmin onaylandığında kilitlenen oran kullanılır. Sanal getiri = sanal tahmin tutarı × kilitlenen oran.
            Maç sonucu işlendiğinde tutar bakiyene eklenir veya rezerve edilen sanal bakiye güncellenir.
          </InfoAccordion>
        </View>

        <View style={styles.footerRow}>
          <IconInfo size={14} color={colors.inkFaint} />
          <Text style={styles.disclaimer}>Oranlar yalnızca simülasyon içindir. Gerçek para yatırma veya çekme yoktur.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  retryBtn: {
    alignItems: "center",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingVertical: 12,
  },
  retryText: { color: colors.ink, fontSize: 13, fontFamily: fonts.bold },
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 130 },
  eyebrow: { color: colors.gold, fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 28, fontFamily: fonts.display, marginTop: 6, marginBottom: 16 },
  heroCard: { borderRadius: radii["3xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 20, marginBottom: 20, overflow: "hidden" },
  heroGlow: { position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: colors.gold, opacity: 0.12 },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroLabel: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase" },
  heroValue: { color: colors.gold, fontSize: 32, fontFamily: fonts.display, marginTop: 4 },
  heroIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.gold}26`, alignItems: "center", justifyContent: "center" },
  heroBottomRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 16, marginTop: 20 },
  heroSubLabel: { color: colors.inkDim, fontSize: 10, fontFamily: fonts.bold, textTransform: "uppercase" },
  heroSubValue: { color: colors.ink, fontSize: 15, fontFamily: fonts.semibold, marginTop: 4 },
  heroDisclaimer: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.bgElevated, borderRadius: radii.xl, paddingHorizontal: 12, paddingVertical: 8, marginTop: 16 },
  heroDisclaimerText: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.regular },
  flowHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  sectionTitle: { color: colors.ink, fontSize: 20, fontFamily: fonts.display, marginBottom: 4 },
  sectionSub: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  liveText: { color: colors.green, fontSize: 12, fontFamily: fonts.bold },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12, marginBottom: 20 },
  gridCard: { width: "47%", borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 14 },
  gridHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  gridLabel: { color: colors.inkDim, fontSize: 10, fontFamily: fonts.bold, textTransform: "uppercase" },
  gridValue: { color: colors.ink, fontSize: 18, fontFamily: fonts.display },
  gridFooterText: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 8 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.bgElevated, overflow: "hidden", marginTop: 8 },
  progressFill: { height: "100%", borderRadius: 3 },
  empty: { textAlign: "center", color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginBottom: 12 },
  activityCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  activityDivider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  activityIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  activityTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  activitySub: { color: colors.inkFaint, fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },
  activityAmount: { fontFamily: fonts.display, fontSize: 13 },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 20 },
  disclaimer: { textAlign: "center", color: colors.inkFaint, fontSize: 11, fontFamily: fonts.regular },
});
