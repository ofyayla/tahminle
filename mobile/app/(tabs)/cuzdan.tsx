import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InfoAccordion from "@/components/InfoAccordion";
import GoldGlow from "@/components/GoldGlow";
import GiftInbox from "@/components/GiftInbox";
import WalletQuickActions from "@/components/WalletQuickActions";
import {
  IconArrowRight,
  IconClock,
  IconGift,
  IconInfo,
  IconLock,
  IconShield,
  IconTrendUpArrow,
  IconUndo,
  IconWallet,
  IconX,
} from "@/components/icons";
import ErrorBanner from "@/components/ErrorBanner";
import { api } from "@/lib/api";
import { useScreenLoad } from "@/lib/useScreenLoad";
import { formatMatchDate, formatTime, formatTL } from "@/lib/format";
import { colors, fonts, radii } from "@/lib/theme";

type WalletData = Awaited<ReturnType<typeof api.getWallet>>;
type GiftData = Awaited<ReturnType<typeof api.getGifts>>;

const ACTIVITY_ICON: Record<string, { Icon: (p: { size: number; color: string }) => React.ReactNode; bg: string; color: string }> = {
  lock: { Icon: IconLock, bg: `${colors.red}1A`, color: colors.red },
  win: { Icon: IconTrendUpArrow, bg: `${colors.green}1A`, color: colors.green },
  loss: { Icon: IconX, bg: `${colors.red}1A`, color: colors.red },
  cancel: { Icon: IconUndo, bg: `${colors.inkDim}1A`, color: colors.inkDim },
  system: { Icon: IconInfo, bg: `${colors.gold}26`, color: colors.gold },
};

export default function CuzdanScreen() {
  const router = useRouter();
  const [data, setData] = useState<WalletData | null>(null);
  const [gifts, setGifts] = useState<GiftData | null>(null);

  // Transfers and gifts are composed on their own screens now — this one only
  // needs the gift inbox, so the transfer request is gone from the tab's
  // critical path.
  const load = useCallback(async () => {
    const [wallet, giftData] = await Promise.all([api.getWallet(), api.getGifts()]);
    setData(wallet);
    setGifts(giftData);
  }, []);

  const { loading, refreshing, error, refresh, reload } = useScreenLoad(load);

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
  const unopenedGifts = gifts?.received.filter((g) => !g.opened).length ?? 0;

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl tintColor={colors.gold} refreshing={refreshing} onRefresh={refresh} />}
      >
        <Text style={styles.eyebrow}>Cüzdan Kontrolü</Text>
        <Text style={styles.title}>Sanal Bakiye</Text>

        <View style={styles.heroCard}>
          <GoldGlow size={200} />
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

        {/* Shortcuts sit directly under the balance, where a wallet's actions
            are expected to be, and open their own screens instead of pushing
            the rest of the page down. */}
        <WalletQuickActions
          actions={[
            {
              key: "gonder",
              label: "Gönder",
              Icon: IconArrowRight,
              color: colors.green,
              onPress: () => router.push("/gonder"),
            },
            {
              key: "hediye",
              label: "Hediye",
              Icon: IconGift,
              color: colors.gold,
              badge: unopenedGifts,
              onPress: () => router.push("/hediye"),
            },
            {
              key: "gecmis",
              label: "Geçmiş",
              Icon: IconClock,
              color: colors.inkDim,
              onPress: () => router.push("/hareketler"),
            },
          ]}
        />

        {gifts && <GiftInbox received={gifts.received} onChanged={reload} />}

        <View style={styles.flowHeaderRow}>
          <Text style={styles.sectionTitle}>Son Hareketler</Text>
          <Pressable onPress={() => router.push("/hareketler")} hitSlop={8}>
            <Text style={styles.viewAllText}>Tümünü gör</Text>
          </Pressable>
        </View>
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
          <InfoAccordion title="Nasıl hesaplanır?" subtitle="Sanal getirinin kısa açıklaması" defaultOpen={false}>
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
  // Tighter than the other blocks: the quick-action row reads as part of the
  // hero rather than as the next card down.
  heroCard: { borderRadius: radii["3xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 20, marginBottom: 12, overflow: "hidden" },
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
  viewAllText: { color: colors.gold, fontSize: 12, fontFamily: fonts.bold },
  gridLabel: { color: colors.inkDim, fontSize: 10, fontFamily: fonts.bold, textTransform: "uppercase" },
  gridFooterText: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 8 },
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
