import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import ErrorBanner from "@/components/ErrorBanner";
import ModalScreen from "@/components/ModalScreen";
import TransferForm from "@/components/TransferForm";
import { api, type TransferHistoryItem, type TransferTarget } from "@/lib/api";
import { useScreenLoad } from "@/lib/useScreenLoad";
import { colors, fonts, radii } from "@/lib/theme";

type Data = { targets: TransferTarget[]; history: TransferHistoryItem[]; available: number };

export default function GonderScreen() {
  const [data, setData] = useState<Data | null>(null);

  const load = useCallback(async () => {
    const [transfers, wallet] = await Promise.all([api.getTransfers(), api.getWallet()]);
    setData({ targets: transfers.targets, history: transfers.history, available: wallet.wallet.available });
  }, []);

  const { loading, error, reload } = useScreenLoad(load);

  return (
    <ModalScreen
      eyebrow="Cüzdan"
      title="Bakiye Gönder"
      subtitle="Başka bir taraftara sanal bakiye aktar. Gönderilen bakiye geri alınamaz."
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
          <TransferForm
            targets={data.targets}
            history={data.history}
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
