import { ActivityIndicator, StyleSheet, View, type ViewProps } from "react-native";
import { colors } from "@/lib/theme";

// The JS side of the launch splash. In the normal flow the native splash
// (app.json -> expo-splash-screen: the gold mark on #0a0d16) stays up until
// AppGate has everything and fades it out, so this is only ever seen as the
// fallback when the native module isn't in the running binary yet. It keeps
// the same #0a0d16 field so that hand-off is seamless, with a gold spinner as
// the only "still working" signal — matching the app's other loading states.
export default function BootSplash({ onLayout }: { onLayout?: ViewProps["onLayout"] }) {
  return (
    <View style={styles.fill} onLayout={onLayout}>
      <ActivityIndicator color={colors.gold} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
});
