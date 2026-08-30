import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ErrorBanner from "@/components/ErrorBanner";
import { IconInfo, IconLock, IconTrendUpArrow, IconUndo, IconX } from "@/components/icons";
import { api, ApiError } from "@/lib/api";
import { formatMatchDate, formatTL, formatTime } from "@/lib/format";
import { colors, fonts, radii } from "@/lib/theme";

type ActivityItem = Awaited<ReturnType<typeof api.getActivity>>["activity"][number];

const ACTIVITY_ICON: Record<string, { Icon: (p: { size: number; color: string }) => React.ReactNode; bg: string; color: string }> = {
  lock: { Icon: IconLock, bg: `${colors.red}1A`, color: colors.red },
  win: { Icon: IconTrendUpArrow, bg: `${colors.green}1A`, color: colors.green },
  loss: { Icon: IconX, bg: `${colors.red}1A`, color: colors.red },
  cancel: { Icon: IconUndo, bg: `${colors.inkDim}1A`, color: colors.inkDim },
  insured: { Icon: IconUndo, bg: `${colors.gold}26`, color: colors.gold },
  system: { Icon: IconInfo, bg: `${colors.gold}26`, color: colors.gold },
};

export default function TumHareketlerScreen() {
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getActivity();
      setActivity(data.activity);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Hareketler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Cüzdan Kontrolü</Text>
            <Text style={styles.title}>Tüm Hareketler</Text>
          </View>
        </View>

        <ErrorBanner message={error} />

        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
        ) : activity.length === 0 ? (
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 60 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  backText: { color: colors.inkDim, fontSize: 22, lineHeight: 22, marginTop: -2 },
  eyebrow: { color: colors.gold, fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 24, fontFamily: fonts.display, marginTop: 2 },
  empty: { textAlign: "center", color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginVertical: 12 },
  activityCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  activityDivider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  activityIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  activityTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  activitySub: { color: colors.inkFaint, fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },
  activityAmount: { fontFamily: fonts.display, fontSize: 13 },
});
