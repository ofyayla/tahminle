import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii } from "@/lib/theme";
import { IconChevronDown, IconInfo } from "./icons";

export default function InfoAccordion({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => setOpen((o) => !o)}>
        <View style={styles.iconWrap}>
          <IconInfo size={16} color={colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={open ? { transform: [{ rotate: "180deg" }] } : undefined}>
          <IconChevronDown size={16} color={colors.inkDim} />
        </View>
      </Pressable>

      {open && (
        <View style={styles.body}>
          <Text style={styles.bodyText}>{children}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${colors.gold}26`, alignItems: "center", justifyContent: "center" },
  title: { color: colors.ink, fontSize: 15, fontFamily: fonts.display },
  subtitle: { color: colors.inkDim, fontSize: 12, fontFamily: fonts.regular, marginTop: 2 },
  body: { marginTop: 12, backgroundColor: colors.bgElevated, borderRadius: radii.xl, padding: 14 },
  bodyText: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, lineHeight: 19 },
});
