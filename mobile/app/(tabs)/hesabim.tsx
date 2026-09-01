import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { TEAM_META } from "@/lib/teams";
import { colors, fonts, radii } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { IconArrowRight, IconCheck, IconInfo, IconLogout, IconPencil, IconShield, IconX } from "@/components/icons";

// Opened in an in-app browser rather than bundled as a screen: the policy is
// the same document Google Play's store listing points at, so there is only
// ever one copy to keep current (app/gizlilik-politikasi on the backend).
const PRIVACY_POLICY_URL = `${API_BASE_URL}/gizlilik-politikasi`;
// Same page App Store Connect's listing points at as the app's Support URL.
const SUPPORT_URL = `${API_BASE_URL}/destek`;

export default function HesabimScreen() {
  const { user, rank, totalPlayers, refresh, logout, deleteAccount } = useAuth();
  const [loading, setLoading] = useState(true);
  const [titles, setTitles] = useState({ weeklyCount: 0, seasonCount: 0 });

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        refresh(),
        api
          .getArchive()
          .then((a) => setTitles({ weeklyCount: a.myWeeklyTitles, seasonCount: a.mySeasonTitles }))
          .catch(() => {}),
      ]).finally(() => setLoading(false));
    }, [refresh])
  );

  async function saveName() {
    setNameError(null);
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) {
      setNameError("Kullanıcı adı en az 2 karakter olmalı.");
      return;
    }
    setNameSaving(true);
    try {
      await api.updateAccount(trimmed);
      await refresh();
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof ApiError ? err.message : "Kaydedilemedi.");
    } finally {
      setNameSaving(false);
    }
  }

  function cancelDelete() {
    setConfirmingDelete(false);
    setDeleteInput("");
    setDeleteError(null);
  }

  async function submitDelete() {
    if (!user || deleteInput.trim() !== user.displayName) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount(deleteInput.trim());
      // No navigation here on purpose — clearing the user in AuthProvider is
      // what the root layout's gate watches, so it routes to /login itself.
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Hesap silinemedi, tekrar dener misin?");
      setDeleting(false);
    }
  }

  async function savePassword() {
    setPwError(null);
    setPwSaved(false);
    if (newPassword.length < 6) {
      setPwError("Yeni şifre en az 6 karakter olmalı.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Yeni şifreler eşleşmiyor.");
      return;
    }
    setPwSaving(true);
    try {
      await api.changePassword(currentPassword || null, newPassword);
      setPwSaved(true);
      setEditingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Şifre değiştirilemedi.");
    } finally {
      setPwSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <ActivityIndicator color={colors.gold} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const meta = user.favoriteTeam ? TEAM_META[user.favoriteTeam] : null;

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.eyebrow}>Hesap Kontrolü</Text>
        <Text style={styles.title}>Hesabım</Text>

        <View style={[styles.profileCard, meta && { borderColor: `${meta.color}66` }]}>
          {meta && (
            <>
              <Image source={{ uri: meta.banner }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <LinearGradient
                colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.82)", colors.bg]}
                style={StyleSheet.absoluteFill}
              />
            </>
          )}
          <View style={styles.profileContent}>
            <View style={[styles.avatar, !meta && styles.avatarFallback]}>
              {meta ? (
                <Image source={{ uri: meta.logo }} style={{ width: 80, height: 80 }} />
              ) : (
                <Text style={styles.avatarText}>{user.displayName.slice(0, 2).toUpperCase()}</Text>
              )}
            </View>
            <Text style={styles.profileName}>{user.displayName}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            {rank != null && (
              <View style={styles.rankPill}>
                <Text style={styles.rankPillText}>
                  Sıralamada #{rank} · {totalPlayers} taraftar arasında
                </Text>
              </View>
            )}
            {(titles.weeklyCount > 0 || titles.seasonCount > 0) && (
              <View style={styles.titleRow}>
                {titles.seasonCount > 0 && (
                  <View style={styles.titlePillGold}>
                    <Text style={styles.titlePillGoldText}>🏆 {titles.seasonCount} sezon birincisi</Text>
                  </View>
                )}
                {titles.weeklyCount > 0 && (
                  <View style={styles.titlePill}>
                    <Text style={styles.titlePillText}>🏆 {titles.weeklyCount} hafta birincisi</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Hesap Ayarları</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            {editingName ? (
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Kullanıcı adı</Text>
                <View style={styles.editInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={nameInput}
                    onChangeText={(v) => {
                      setNameInput(v);
                      setNameError(null);
                    }}
                    maxLength={40}
                    autoFocus
                  />
                  <Pressable
                    onPress={saveName}
                    disabled={nameSaving || nameInput.trim().length < 2}
                    style={[styles.saveIconBtn, (nameSaving || nameInput.trim().length < 2) && styles.iconBtnDisabled]}
                    hitSlop={6}
                  >
                    <IconCheck size={16} color={colors.bg} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setEditingName(false);
                      setNameError(null);
                    }}
                    style={styles.cancelIconBtn}
                    hitSlop={6}
                  >
                    <IconX size={16} color={colors.inkDim} />
                  </Pressable>
                </View>
                {nameError && <Text style={styles.errorText}>{nameError}</Text>}
              </View>
            ) : (
              <>
                <View>
                  <Text style={styles.infoLabel}>Kullanıcı adı</Text>
                  <Text style={[styles.infoValue, { marginTop: 2 }]}>{user.displayName}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    setNameInput(user.displayName);
                    setEditingName(true);
                  }}
                  style={styles.editIconBtn}
                  hitSlop={8}
                >
                  <IconPencil size={16} color={colors.inkFaint} />
                </Pressable>
              </>
            )}
          </View>
          <View style={[styles.infoRow, styles.infoDivider]}>
            <View>
              <Text style={styles.infoLabel}>E-posta</Text>
              <Text style={[styles.infoValue, { marginTop: 2 }]}>{user.email}</Text>
            </View>
          </View>
          <View style={[styles.infoRow, styles.infoDivider, { flexDirection: "column", alignItems: "stretch" }]}>
            {user.hasPassword === false ? (
              <Text style={styles.infoLabel}>Google/Apple ile giriş yapıyorsun, ayarlı bir şifren yok.</Text>
            ) : !editingPassword ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={styles.infoLabel}>Şifre</Text>
                  <Text style={[styles.infoValue, styles.maskedValue]}>••••••••</Text>
                </View>
                <Pressable onPress={() => setEditingPassword(true)} style={styles.editIconBtn} hitSlop={8}>
                  <IconPencil size={16} color={colors.inkFaint} />
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.infoLabel}>Şifre değiştir</Text>
                  <Pressable
                    onPress={() => {
                      setEditingPassword(false);
                      setPwError(null);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    style={styles.cancelIconBtnSmall}
                    hitSlop={8}
                  >
                    <IconX size={14} color={colors.inkFaint} />
                  </Pressable>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Mevcut şifre"
                  placeholderTextColor={colors.inkFaint}
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Yeni şifre (en az 6 karakter)"
                  placeholderTextColor={colors.inkFaint}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Yeni şifre (tekrar)"
                  placeholderTextColor={colors.inkFaint}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                {pwError && <Text style={styles.errorText}>{pwError}</Text>}
                <Pressable onPress={savePassword} disabled={pwSaving} style={styles.saveBtnFull}>
                  <Text style={styles.saveBtnText}>{pwSaving ? "Kaydediliyor..." : "Şifreyi Kaydet"}</Text>
                </Pressable>
              </View>
            )}
            {pwSaved && <Text style={styles.successText}>Şifren güncellendi.</Text>}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Yardım & Gizlilik</Text>
        <Pressable
          style={[styles.privacyRow, { marginBottom: 10 }]}
          onPress={() => WebBrowser.openBrowserAsync(SUPPORT_URL)}
        >
          <IconInfo size={18} color={colors.gold} />
          <View style={styles.privacyTextWrap}>
            <Text style={styles.privacyTitle}>Destek</Text>
            <Text style={styles.privacySub}>
              Sık sorulan sorular ve bize nasıl ulaşacağın
            </Text>
          </View>
          <IconArrowRight size={16} color={colors.inkFaint} />
        </Pressable>
        <Pressable
          style={[styles.privacyRow, { marginTop: 0 }]}
          onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
        >
          <IconShield size={18} color={colors.gold} />
          <View style={styles.privacyTextWrap}>
            <Text style={styles.privacyTitle}>Gizlilik Politikası</Text>
            <Text style={styles.privacySub}>
              Hangi verileri topluyoruz, neden ve nasıl silebilirsin
            </Text>
          </View>
          <IconArrowRight size={16} color={colors.inkFaint} />
        </Pressable>

        <Pressable style={styles.logoutBtn} onPress={logout}>
          <IconLogout size={16} color={colors.red} />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </Pressable>

        {!confirmingDelete ? (
          <Pressable style={styles.deleteBtn} onPress={() => setConfirmingDelete(true)}>
            <Text style={styles.deleteBtnText}>Hesabımı Sil</Text>
          </Pressable>
        ) : (
          <View style={styles.deleteCard}>
            <Text style={styles.deleteTitle}>Hesabını kalıcı olarak sil</Text>
            <Text style={styles.deleteBody}>
              Tahminlerin, bakiyen, transfer ve hediye geçmişin, lig üyeliklerin ve kazandığın
              kupalar kalıcı olarak silinir. Bu işlem geri alınamaz. Sahibi olduğun ligler, en eski
              üyeye devredilir.
            </Text>
            <Text style={styles.deleteLabel}>
              Onaylamak için kullanıcı adını yaz:{" "}
              <Text style={styles.deleteLabelName}>{user.displayName}</Text>
            </Text>
            <TextInput
              style={styles.input}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={user.displayName}
              placeholderTextColor={colors.inkFaint}
              value={deleteInput}
              onChangeText={(t) => {
                setDeleteInput(t);
                setDeleteError(null);
              }}
            />
            {deleteError && <Text style={styles.errorText}>{deleteError}</Text>}
            <View style={styles.deleteActions}>
              <Pressable
                style={[styles.deleteCancelBtn, deleting && styles.iconBtnDisabled]}
                disabled={deleting}
                onPress={cancelDelete}
              >
                <Text style={styles.deleteCancelText}>Vazgeç</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.deleteConfirmBtn,
                  (deleting || deleteInput.trim() !== user.displayName) && styles.iconBtnDisabled,
                ]}
                disabled={deleting || deleteInput.trim() !== user.displayName}
                onPress={submitDelete}
              >
                <Text style={styles.deleteConfirmText}>
                  {deleting ? "Siliniyor..." : "Kalıcı Olarak Sil"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <Text style={styles.disclaimer}>Gerçek para içermez · Tüm bakiyeler ve sonuçlar sanaldır.</Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 130 },
  eyebrow: { color: colors.gold, fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 28, fontFamily: fonts.display, marginTop: 6, marginBottom: 16 },
  profileCard: { borderRadius: radii["3xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, overflow: "hidden", marginBottom: 20 },
  profileContent: { alignItems: "center", padding: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 12 },
  avatarFallback: { borderWidth: 2, borderColor: colors.inkFaint, backgroundColor: colors.bgElevated },
  avatarText: { color: colors.inkDim, fontFamily: fonts.display, fontSize: 18 },
  profileName: { color: colors.ink, fontSize: 18, fontFamily: fonts.display },
  profileEmail: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular, marginTop: 4 },
  rankPill: { marginTop: 12, borderWidth: 1, borderColor: `${colors.gold}66`, backgroundColor: `${colors.gold}1A`, borderRadius: radii.full, paddingHorizontal: 14, paddingVertical: 6 },
  rankPillText: { color: colors.gold, fontFamily: fonts.bold, fontSize: 12 },
  titleRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 8 },
  titlePillGold: { borderWidth: 1, borderColor: `${colors.gold}66`, backgroundColor: `${colors.gold}1A`, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 5 },
  titlePillGoldText: { color: colors.gold, fontFamily: fonts.bold, fontSize: 11 },
  titlePill: { borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.bgElevated, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 5 },
  titlePillText: { color: colors.inkDim, fontFamily: fonts.bold, fontSize: 11 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontFamily: fonts.display, marginBottom: 4 },
  infoCard: { borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, marginTop: 20, marginBottom: 20 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  infoDivider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  infoLabel: { color: colors.inkDim, fontSize: 13, fontFamily: fonts.regular },
  infoValue: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  maskedValue: { marginTop: 2, letterSpacing: 2 },
  editIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  editInputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  saveIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelIconBtnSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDisabled: { opacity: 0.4 },
  input: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  errorText: { color: colors.red, fontSize: 12, fontFamily: fonts.regular },
  successText: { color: colors.green, fontSize: 12, fontFamily: fonts.regular, marginTop: 8 },
  saveBtnFull: { backgroundColor: colors.gold, borderRadius: radii.lg, paddingVertical: 10, alignItems: "center" },
  saveBtnText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 12 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: `${colors.red}4D`,
    backgroundColor: `${colors.red}1A`,
    paddingVertical: 14,
    marginBottom: 20,
  },
  logoutText: { color: colors.red, fontFamily: fonts.bold, fontSize: 14 },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  privacyTextWrap: { flex: 1 },
  privacyTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  privacySub: { color: colors.inkDim, fontFamily: fonts.regular, fontSize: 11, marginTop: 2 },
  deleteBtn: {
    alignItems: "center",
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingVertical: 14,
    marginBottom: 20,
  },
  deleteBtnText: { color: colors.inkDim, fontFamily: fonts.bold, fontSize: 13 },
  deleteCard: {
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: `${colors.red}4D`,
    backgroundColor: `${colors.red}0F`,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  deleteTitle: { color: colors.red, fontFamily: fonts.display, fontSize: 15 },
  deleteBody: { color: colors.inkDim, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  deleteLabel: { color: colors.inkDim, fontFamily: fonts.regular, fontSize: 12 },
  deleteLabelName: { color: colors.ink, fontFamily: fonts.bold },
  deleteActions: { flexDirection: "row", gap: 8 },
  deleteCancelBtn: {
    flex: 1,
    alignItems: "center",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.bgElevated,
    paddingVertical: 11,
  },
  deleteCancelText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 12 },
  deleteConfirmBtn: {
    flex: 1,
    alignItems: "center",
    borderRadius: radii.lg,
    backgroundColor: colors.red,
    paddingVertical: 11,
  },
  deleteConfirmText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 12 },
  disclaimer: { textAlign: "center", color: colors.inkFaint, fontSize: 11, fontFamily: fonts.regular },
});
