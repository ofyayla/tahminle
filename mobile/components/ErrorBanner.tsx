import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii } from "@/lib/theme";
import { IconInfo } from "./icons";

export default function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.banner}>
      <IconInfo size={14} color={colors.red} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: `${colors.red}4D`,
    backgroundColor: `${colors.red}1A`,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  text: { flex: 1, color: colors.red, fontSize: 13, fontFamily: fonts.regular },
});
