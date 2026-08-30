import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { formatDateRange, formatTL } from "@/lib/format";
import { TEAM_META, type TeamCode } from "@/lib/teams";
import { colors, fonts, radii } from "@/lib/theme";
import type { LeaderboardRow, LeaderboardScope } from "@/lib/api";

const MEDAL = ["🥇", "🥈", "🥉"];
const FILTERS: { code: TeamCode | "ALL"; label: string }[] = [
  { code: "ALL", label: "Tümü" },
  { code: "GS", label: "GS" },
  { code: "FB", label: "FB" },
  { code: "BJK", label: "BJK" },
];
const SCOPES: { key: "week" | "season"; label: string }[] = [
  { key: "week", label: "Bu Hafta" },
  { key: "season", label: "Sezon" },
];

function NetAmount({ net, style }: { net: number; style: object }) {
  const color = net >= 0 ? colors.green : colors.red;
  return (
    <Text style={[style, { color }]}>
      {net >= 0 ? "+" : "−"}
      {formatTL(Math.abs(net))}
    </Text>
  );
}

// A self-contained hafta/sezon toggle + hero-rank card + team-filtered row
// list, sharing the exact rendering the main Sıralama tab uses — a league's
// board is the same component fed a member-scoped LeaderboardScope pair.
export default function LeaderboardBoard({ week, season }: { week: LeaderboardScope; season: LeaderboardScope }) {
  const [scope, setScope] = useState<"week" | "season">("week");
  const [filter, setFilter] = useState<TeamCode | "ALL">("ALL");

  const data = scope === "week" ? week : season;
  const visible = useMemo(
    () => (filter === "ALL" ? data.ranked : data.ranked.filter((r) => r.favoriteTeam === filter)),
    [data, filter]
  );
  const emptyRowLabel = scope === "week" ? "Bu hafta henüz tahmin yok" : "Bu sezon henüz tahmin yok";

  return (
    <View>
      <View style={styles.scopeRow}>
        {SCOPES.map((s) => (
          <Pressable key={s.key} onPress={() => setScope(s.key)} style={[styles.scopeChip, scope === s.key && styles.scopeChipActive]}>
            <Text style={[styles.scopeText, scope === s.key && styles.scopeTextActive]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {data.you && (
        <View style={styles.youCard}>
          <View style={styles.youTopRow}>
            <View>
              <Text style={styles.youLabel}>Senin Sıran</Text>
              <Text style={styles.youRank}>#{data.you.rank}</Text>
              <Text style={styles.youTotal}>{data.totalPlayers} taraftar arasında</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <NetAmount net={data.you.net} style={styles.youNet} />
              <Text style={styles.youTotal}>net kâr</Text>
              <Text style={styles.youTotal}>
                {data.you.total > 0 ? `${data.you.correct}/${data.you.total} · %${data.you.accuracy}` : "tahmin yok"}
              </Text>
            </View>
          </View>
          <Text style={styles.seasonNote}>{formatDateRange(new Date(data.rangeStart), new Date(data.rangeEnd))}</Text>
        </View>
      )}

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable key={f.code} onPress={() => setFilter(f.code)} style={[styles.filterChip, filter === f.code && styles.filterChipActive]}>
            <Text style={[styles.filterText, filter === f.code && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {visible.length === 0 ? (
        <Text style={styles.empty}>Bu filtrede henüz taraftar yok.</Text>
      ) : (
        visible.map((item: LeaderboardRow) => {
          const meta = item.favoriteTeam ? TEAM_META[item.favoriteTeam as TeamCode] : null;
          return (
            <View key={item.id} style={[styles.row, item.isYou && styles.rowYou]}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{item.rank <= 3 ? MEDAL[item.rank - 1] : `#${item.rank}`}</Text>
              </View>
              <View style={styles.avatar}>
                {meta ? (
                  <Image source={{ uri: meta.logo }} style={{ width: 40, height: 40 }} />
                ) : (
                  <Text style={styles.avatarText}>{item.displayName.slice(0, 2).toUpperCase()}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.displayName} {item.isYou && <Text style={{ color: colors.gold }}>(Sen)</Text>}
                </Text>
                <Text style={styles.rowTeam}>
                  {item.total > 0 ? `${item.correct}/${item.total} doğru · %${item.accuracy} isabet` : emptyRowLabel}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <NetAmount net={item.net} style={styles.rowBalance} />
                <Text style={styles.rowBalanceLabel}>net kâr</Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scopeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  scopeChip: { flex: 1, alignItems: "center", borderRadius: radii.xl, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, paddingVertical: 10 },
  scopeChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  scopeText: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.bold },
  scopeTextActive: { color: colors.bg },
  youCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: `${colors.gold}66`, backgroundColor: `${colors.gold}1A`, padding: 16, marginBottom: 16 },
  youTopRow: { flexDirection: "row", justifyContent: "space-between" },
  youLabel: { color: colors.goldDim, fontSize: 10, fontFamily: fonts.bold, textTransform: "uppercase" },
  youRank: { color: colors.ink, fontSize: 24, fontFamily: fonts.display, marginTop: 2 },
  youNet: { fontSize: 24, fontFamily: fonts.display },
  youTotal: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },
  seasonNote: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 12, borderTopWidth: 1, borderTopColor: `${colors.gold}33`, paddingTop: 12 },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  filterChip: { borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, borderRadius: radii.full, paddingHorizontal: 16, paddingVertical: 8 },
  filterChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  filterText: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.bold },
  filterTextActive: { color: colors.bg },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 14, marginBottom: 8 },
  rowYou: { borderColor: colors.gold, backgroundColor: `${colors.gold}1A` },
  rankBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center" },
  rankText: { color: colors.ink, fontFamily: fonts.display, fontSize: 13 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarText: { color: colors.inkDim, fontFamily: fonts.display, fontSize: 11 },
  rowName: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  rowTeam: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },
  rowBalance: { fontFamily: fonts.display, fontSize: 13 },
  rowBalanceLabel: { color: colors.inkFaint, fontSize: 10, fontFamily: fonts.regular, marginTop: 2 },
  empty: { textAlign: "center", color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginVertical: 12 },
});
