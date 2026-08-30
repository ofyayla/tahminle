import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import ErrorBanner from "@/components/ErrorBanner";
import GiftForm from "@/components/GiftForm";
import ModalScreen from "@/components/ModalScreen";
import { api, type ReceivedGift, type SentGift, type TransferTarget } from "@/lib/api";
import { useScreenLoad } from "@/lib/useScreenLoad";
import { colors, fonts, radii } from "@/lib/theme";

type Data = { targets: TransferTarget[]; received: ReceivedGift[]; sent: SentGift[]; available: number };

export default function HediyeScreen() {
  const [data, setData] = useState<Data | null>(null);

  const load = useCallback(async () => {
    const [gifts, transfers, wallet] = await Promise.all([api.getGifts(), api.getTransfers(), api.getWallet()]);
    setData({
      targets: transfers.targets,
      received: gifts.received,
      sent: gifts.sent,
      available: wallet.wallet.available,
    });
  }, []);

  const { loading, error, reload } = useScreenLoad(load);

  return (
    <ModalScreen
      eyebrow="Cüzdan"
      title="Sürpriz Kupon"
      subtitle="Bir taraftara rastgele bir kupon hediye et. Kazanırsa tamamı ona gider."
    >
      {loading && !data ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
      ) : !data ? (
        <View style={{ gap: 12 }}>
          <ErrorBanner message={error ?? "Veri alınamadı."} />
          <Pressable style={styles.retryBtn} onPress={reload}>
            <Text style={styles.retryText}>Tekrar dene</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ErrorBanner message={error} />
          <GiftForm
            targets={data.targets}
            received={data.received}
            sent={data.sent}
            available={data.available}
            onDone={reload}
          />
        </>
      )}
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  retryBtn: { alignItems: "center", borderRadius: radii.xl, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, paddingVertical: 12 },
  retryText: { color: colors.ink, fontSize: 13, fontFamily: fonts.bold },
});
