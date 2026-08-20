import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radii } from "@/lib/theme";
import { IconClock, IconPerson, IconTicket, IconTrendBars, IconWalletDetailed } from "@/components/icons";

const ICONS: Record<string, (props: { size: number; color: string }) => React.ReactNode> = {
  index: (p) => <IconClock {...p} />,
  tahminler: (p) => <IconTicket {...p} />,
  cuzdan: (p) => <IconWalletDetailed {...p} />,
  siralama: (p) => <IconTrendBars {...p} />,
  hesabim: (p) => <IconPerson {...p} />,
};

const LABELS: Record<string, string> = {
  index: "Maç Günü",
  tahminler: "Tahminler",
  cuzdan: "Cüzdan",
  siralama: "Sıralama",
  hesabim: "Hesabım",
};

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const iconColor = focused ? colors.bg : colors.inkDim;
          return (
            <Pressable key={route.key} onPress={onPress} style={[styles.item, focused && styles.itemActive]}>
              {ICONS[route.name]?.({ size: 20, color: iconColor })}
              <Text style={[styles.label, { color: iconColor }]}>{LABELS[route.name]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tahminler" />
      <Tabs.Screen name="cuzdan" />
      <Tabs.Screen name="siralama" />
      <Tabs.Screen name="hesabim" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", paddingHorizontal: 12, paddingTop: 12 },
  bar: {
    width: "100%",
    maxWidth: 448,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: "rgba(16,19,31,0.97)",
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 12,
  },
  item: { flex: 1, alignItems: "center", gap: 4, borderRadius: radii.xl, paddingVertical: 8 },
  itemActive: { backgroundColor: colors.gold },
  label: { fontSize: 11, fontFamily: fonts.semibold },
});
