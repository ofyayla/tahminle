import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { TEAM_META } from "@/lib/teams";
import { colors, fonts, radii } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { IconCheck, IconLogout, IconPencil, IconX } from "@/components/icons";

export default function HesabimScreen() {
  const { user, rank, totalPlayers, refresh, logout } = useAuth();
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
      <ScrollView contentContainerStyle={styles.list}>
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

        <Pressable style={styles.logoutBtn} onPress={logout}>
          <IconLogout size={16} color={colors.red} />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </Pressable>

        <Text style={styles.disclaimer}>Gerçek para içermez · Tüm bakiyeler ve sonuçlar sanaldır.</Text>
      </ScrollView>
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
  disclaimer: { textAlign: "center", color: colors.inkFaint, fontSize: 11, fontFamily: fonts.regular },
});
