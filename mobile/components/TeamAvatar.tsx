import { Image, Text, View } from "react-native";
import { teamCodeFromName, TEAM_META } from "@/lib/teams";
import { getClubLogo } from "@/lib/clubLogos";
import { colors, fonts } from "@/lib/theme";

export default function TeamAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const code = teamCodeFromName(name);
  const logo = code ? TEAM_META[code].logo : getClubLogo(name);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        ...(logo
          ? null
          : { backgroundColor: colors.bgElevated, borderWidth: 2, borderColor: colors.inkFaint }),
      }}
    >
      {logo ? (
        <Image source={{ uri: logo }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text style={{ color: colors.inkDim, fontFamily: fonts.display, fontSize: size * 0.24 }}>
          {name.slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
}
