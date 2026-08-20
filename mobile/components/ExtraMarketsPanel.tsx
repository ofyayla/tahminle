import { useState } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { formatOdds } from "@/lib/format";
import type { MarketCode } from "@/lib/markets";
import type { MatchDTO } from "@/lib/types";
import { colors, fonts, radii } from "@/lib/theme";
import { IconChevronDown } from "./icons";

const SCORE_LABEL_PATTERN = /^Maç Skoru \(\d+:\d+\)$/;

function MarketRow({
  title,
  market,
  disabled,
  selectedChoice,
  onPick,
  items,
}: {
  title: string;
  market: MarketCode;
  disabled: boolean;
  selectedChoice: string | null;
  onPick: (market: MarketCode, choice: string) => void;
  items: { label: string; choice: string; value: number | null }[];
}) {
  const visible = items.filter((i) => i.value != null);
  if (visible.length === 0) return null;

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.rowTitle}>{title}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {visible.map((i) => {
          const selected = selectedChoice === i.choice;
          return (
            <Pressable
              key={i.choice}
              disabled={disabled}
              onPress={() => onPick(market, i.choice)}
              style={[styles.chip, selected && styles.chipSelected, disabled && !selected && styles.chipDisabled]}
            >
              <Text style={[styles.chipLabel, selected && { color: colors.gold }]}>{i.label}</Text>
              <Text style={styles.chipValue}>{formatOdds(i.value!)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ExtraMarketsPanel({
  match,
  matchClosed,
  onPick,
}: {
  match: MatchDTO;
  matchClosed: boolean;
  onPick: (market: MarketCode, choice: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { extraOdds } = match;
  const disabledFor = (market: MarketCode) => matchClosed || match.openByMarket[market] != null;

  const structuredCount = [
    extraOdds.over25,
    extraOdds.under25,
    extraOdds.bttsYes,
    extraOdds.bttsNo,
    extraOdds.dc1X,
    extraOdds.dc12,
    extraOdds.dcX2,
  ].filter((v) => v != null).length;

  const scoreEntries = extraOdds.extraMarkets
    ? Object.entries(extraOdds.extraMarkets)
        .filter(([label]) => SCORE_LABEL_PATTERN.test(label))
        .sort(([, a], [, b]) => a - b)
    : [];

  const totalCount = structuredCount + scoreEntries.length;
  if (totalCount === 0) return null;

  const selectedFor = (market: MarketCode) => match.openByMarket[market] ?? null;

  return (
    <View style={styles.container}>
      <Pressable style={styles.toggle} onPress={() => setOpen((o) => !o)}>
        {open ? (
          <>
            <Text style={styles.toggleText}>Daha Az Göster</Text>
            <View style={{ transform: [{ rotate: "180deg" }] }}>
              <IconChevronDown size={14} color={colors.inkDim} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.plusBadge}>
              <Text style={styles.plusBadgeText}>+</Text>
            </View>
            <Text style={styles.toggleText}>{totalCount} Oran Daha</Text>
            <IconChevronDown size={14} color={colors.inkDim} />
          </>
        )}
      </Pressable>

      {open && (
        <View style={{ marginTop: 12 }}>
          <MarketRow
            title="2.5 Gol Alt/Üst"
            market="OU25"
            disabled={disabledFor("OU25")}
            selectedChoice={selectedFor("OU25")}
            onPick={onPick}
            items={[
              { label: "Alt", choice: "UNDER", value: extraOdds.under25 },
              { label: "Üst", choice: "OVER", value: extraOdds.over25 },
            ]}
          />
          <MarketRow
            title="Karşılıklı Gol"
            market="BTTS"
            disabled={disabledFor("BTTS")}
            selectedChoice={selectedFor("BTTS")}
            onPick={onPick}
            items={[
              { label: "Var", choice: "YES", value: extraOdds.bttsYes },
              { label: "Yok", choice: "NO", value: extraOdds.bttsNo },
            ]}
          />
          <MarketRow
            title="Çifte Şans"
            market="DC"
            disabled={disabledFor("DC")}
            selectedChoice={selectedFor("DC")}
            onPick={onPick}
            items={[
              { label: "1-X", choice: "1X", value: extraOdds.dc1X },
              { label: "1-2", choice: "12", value: extraOdds.dc12 },
              { label: "X-2", choice: "X2", value: extraOdds.dcX2 },
            ]}
          />

          {scoreEntries.length > 0 && (
            <View>
              <Text style={styles.rowTitle}>Maç Skoru ({scoreEntries.length})</Text>
              <ScrollView style={styles.scoreList} nestedScrollEnabled>
                {scoreEntries.map(([label, value]) => {
                  const scoreDisabled = disabledFor("EXTRA");
                  const selected = match.openByMarket.EXTRA === label;
                  return (
                    <Pressable
                      key={label}
                      disabled={scoreDisabled}
                      onPress={() => onPick("EXTRA", label)}
                      style={[styles.scoreRow, selected && styles.scoreRowSelected]}
                    >
                      <Text style={[styles.scoreLabel, selected && { color: colors.gold }]}>{label}</Text>
                      <Text style={styles.scoreValue}>{formatOdds(value)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.scoreHint}>Maç skoru tahminleri gerçek maç sonucuyla eşleşerek sonuçlanır.</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 12 },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.bgElevated,
    paddingVertical: 10,
  },
  toggleText: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.bold },
  plusBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: `${colors.gold}33`, alignItems: "center", justifyContent: "center" },
  plusBadgeText: { color: colors.gold, fontSize: 10, fontFamily: fonts.bold, lineHeight: 12 },
  rowTitle: { fontSize: 10, fontFamily: fonts.bold, color: colors.inkDim, textTransform: "uppercase", marginBottom: 6 },
  chip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  chipSelected: { borderWidth: 2, borderColor: colors.gold, backgroundColor: `${colors.gold}1A` },
  chipDisabled: { opacity: 0.4 },
  chipLabel: { fontSize: 10, fontFamily: fonts.regular, color: colors.inkFaint },
  chipValue: { fontSize: 13, color: colors.ink, fontFamily: fonts.display, marginTop: 2 },
  scoreList: { maxHeight: 180, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.lg, backgroundColor: colors.card, padding: 4 },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.lg,
  },
  scoreRowSelected: { backgroundColor: `${colors.gold}1A` },
  scoreLabel: { fontSize: 12, fontFamily: fonts.regular, color: colors.inkDim },
  scoreValue: { fontSize: 13, color: colors.ink, fontFamily: fonts.display },
  scoreHint: { marginTop: 6, textAlign: "center", fontSize: 10, fontFamily: fonts.regular, color: colors.inkFaint },
});
