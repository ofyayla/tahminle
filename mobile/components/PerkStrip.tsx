import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { UserPerkStatus } from "@/lib/api";
import { colors, fonts, radii } from "@/lib/theme";
import { IconArrowRight, IconChevronDown, IconShield, IconSparkle, IconWallet } from "./icons";

// The perks themselves are used where they apply — Çifte Kasa from the kasa
// card, Sigorta from a prediction — so all this needs to do is answer "what do
// I still have?". One line closed, two explanations open.
export default function PerkStrip({ perks }: { perks: UserPerkStatus }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const remaining = (perks.doubleKasa.available ? 1 : 0) + (perks.insurance.available ? 1 : 0);

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => setOpen((o) => !o)} hitSlop={6}>
        <View style={styles.iconWrap}>
          <IconSparkle size={14} color={remaining > 0 ? colors.gold : colors.inkFaint} />
        </View>
        <Text style={styles.title}>Jokerlerim</Text>
        <Text style={[styles.count, remaining === 0 && { color: colors.inkFaint }]}>
          {remaining > 0 ? `${remaining} hak` : "Hakkın kalmadı"}
        </Text>
        <View style={open ? { transform: [{ rotate: "180deg" }] } : undefined}>
          <IconChevronDown size={14} color={colors.inkDim} />
        </View>
      </Pressable>

      {open && (
        <View style={styles.body}>
          <PerkRow
            Icon={IconWallet}
            name="Çifte Kasa"
            available={perks.doubleKasa.available}
            note="Haftalık kasanı ikiye katlar. Yukarıdaki kasa kartından kullanabilirsin."
          />
          <PerkRow
            Icon={IconShield}
            name="Sigorta"
            available={perks.insurance.available}
            note="Kaybeden bir tahmininin tutarını geri alırsın."
            action={{ label: "Tahminler'den bir tahmine uygula", onPress: () => router.navigate("/(tabs)/tahminler") }}
          />
        </View>
      )}
    </View>
  );
}

function PerkRow({
  Icon,
  name,
  available,
  note,
  action,
}: {
  Icon: (p: { size: number; color: string }) => React.ReactNode;
  name: string;
  available: boolean;
  note: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.perkRow}>
      <View style={styles.perkIcon}>
        <Icon size={14} color={available ? colors.gold : colors.inkFaint} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.perkTitleRow}>
          <Text style={[styles.perkName, !available && { color: colors.inkFaint }]}>{name}</Text>
          {!available && <Text style={styles.usedTag}>Bu sezon kullanıldı</Text>}
        </View>
        <Text style={styles.perkNote}>{available ? note : "Sezonluk hakkın harcandı."}</Text>
        {available && action && (
          // A real link, not a chip that looks like a disabled button.
          <Pressable style={styles.linkRow} onPress={action.onPress} hitSlop={6}>
            <Text style={styles.linkText}>{action.label}</Text>
            <IconArrowRight size={12} color={colors.gold} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 26, height: 26, borderRadius: 13, backgroundColor: `${colors.gold}1F`, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, color: colors.ink, fontSize: 13, fontFamily: fonts.bold },
  count: { color: colors.gold, fontSize: 12, fontFamily: fonts.bold },
  body: { marginTop: 12, gap: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 12 },
  perkRow: { flexDirection: "row", gap: 10 },
  perkIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center" },
  perkTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  perkName: { color: colors.ink, fontSize: 13, fontFamily: fonts.bold },
  usedTag: { color: colors.inkFaint, fontSize: 10, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.3 },
  perkNote: { color: colors.inkDim, fontSize: 11, fontFamily: fonts.regular, marginTop: 3, lineHeight: 16 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 7 },
  linkText: { color: colors.gold, fontSize: 12, fontFamily: fonts.bold },
});
