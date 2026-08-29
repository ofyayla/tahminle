import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ErrorBanner from "@/components/ErrorBanner";
import { api, type NotificationItem } from "@/lib/api";
import { useScreenLoad } from "@/lib/useScreenLoad";
import { markNotificationsSeen } from "@/lib/notificationsSeen";
import { formatMatchDate, formatTime, formatTL } from "@/lib/format";
import { colors, fonts, radii } from "@/lib/theme";
import { IconCheck, IconChevronDown, IconGift, IconTrophy, IconWallet, IconX } from "@/components/icons";

const KIND_META: Record<
  NotificationItem["status"],
  { label: string; accent: string; Icon: (p: { size: number; color: string }) => React.ReactNode }
> = {
  won: { label: "SONUÇ İŞLENDİ", accent: colors.green, Icon: IconTrophy },
  lost: { label: "SONUÇ İŞLENDİ", accent: colors.red, Icon: IconX },
  mixed: { label: "SONUÇ İŞLENDİ", accent: colors.gold, Icon: IconTrophy },
  info: { label: "BİLDİRİM", accent: colors.gold, Icon: IconWallet },
};

function iconFor(item: NotificationItem) {
  if (item.kind === "gift") return { ...KIND_META.info, Icon: IconGift, label: "HEDİYE" };
  if (item.kind === "transfer") return { ...KIND_META.info, label: "TRANSFER" };
  return KIND_META[item.status];
}

export default function BildirimlerScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);

  const load = useCallback(async () => {
    const data = await api.getNotifications();
    setItems(data.items);
    // Opening the screen is what "reading" means here — the badge clears as
    // soon as the newest item has been seen.
    if (data.items.length > 0) await markNotificationsSeen(data.items[0].at);
  }, []);

  const { loading, refreshing, error, refresh } = useScreenLoad(load);

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <View style={{ transform: [{ rotate: "90deg" }] }}>
            <IconChevronDown size={20} color={colors.ink} />
          </View>
        </Pressable>
        <Text style={styles.headerTitle}>Bildirimler</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl tintColor={colors.gold} refreshing={refreshing} onRefresh={refresh} />
        }
        ListHeaderComponent={<ErrorBanner message={error} />}
        renderItem={({ item }) => {
          const meta = iconFor(item);
          const at = new Date(item.at);
          return (
            <View style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: `${meta.accent}26` }]}>
                <meta.Icon size={20} color={meta.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.kicker, { color: meta.accent }]}>{meta.label}</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.time}>
                  {formatMatchDate(at)} · {formatTime(at)}
                </Text>
              </View>
              {item.status === "won" && <IconCheck size={18} color={meta.accent} />}
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 60 }} />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.empty}>Henüz bir bildirimin yok.</Text>
              <Text style={styles.emptySub}>
                Tahminlerin sonuçlandığında, sana hediye ya da bakiye geldiğinde burada görünecek.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.ink, fontSize: 18, fontFamily: fonts.display },
  list: { padding: 16, paddingTop: 4, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 16,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  kicker: { fontSize: 11, fontFamily: fonts.bold, letterSpacing: 1, textTransform: "uppercase" },
  title: { color: colors.ink, fontSize: 16, fontFamily: fonts.display, marginTop: 4 },
  body: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginTop: 4, lineHeight: 19 },
  time: { color: colors.inkFaint, fontSize: 11, fontFamily: fonts.regular, marginTop: 8 },
  emptyCard: {
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 24,
    marginTop: 40,
  },
  empty: { color: colors.ink, fontSize: 15, fontFamily: fonts.display, textAlign: "center" },
  emptySub: {
    color: colors.inkDim,
    fontSize: 13,
    fontFamily: fonts.regular,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },
});
