"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function EditIconButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-bg-elevated hover:text-gold"
    >
      <PencilIcon />
    </button>
  );
}

export default function AccountSettings({
  displayName,
  email,
  hasPassword,
}: {
  displayName: string;
  email: string;
  hasPassword: boolean;
}) {
  const router = useRouter();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(displayName);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  function startEditingName() {
    setName(displayName);
    setNameError(null);
    setNameSaved(false);
    setEditingName(true);
  }

  function cancelEditingName() {
    setEditingName(false);
    setNameError(null);
    setName(displayName);
  }

  async function saveName() {
    const trimmed = name.trim();
    if (trimmed === displayName) {
      setEditingName(false);
      return;
    }
    if (trimmed.length < 2) {
      setNameError("En az 2 karakter olmalı.");
      return;
    }
    setNameError(null);
    setNameSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameError(data.error ?? "Kaydedilemedi.");
        return;
      }
      setEditingName(false);
      setNameSaved(true);
      router.refresh();
    } finally {
      setNameSaving(false);
    }
  }

  function cancelPasswordForm() {
    setShowPasswordForm(false);
    setPwError(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
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
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error ?? "Şifre değiştirilemedi.");
        return;
      }
      setPwSaved(true);
      cancelPasswordForm();
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 font-display text-xl">Hesap Ayarları</h2>
      <div className="divide-y divide-card-border rounded-2xl border border-card-border bg-card">
        {/* Kullanıcı adı */}
        <div className="px-4 py-3.5">
          {!editingName ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-ink-dim">Kullanıcı adı</div>
                <div className="mt-0.5 truncate text-sm font-bold">{displayName}</div>
              </div>
              <EditIconButton onClick={startEditingName} label="Kullanıcı adını değiştir" />
            </div>
          ) : (
            <div>
              <div className="mb-1.5 text-xs text-ink-dim">Kullanıcı adı</div>
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") cancelEditingName();
                  }}
                  maxLength={40}
                  className="min-w-0 flex-1 rounded-xl border border-gold/50 bg-bg-elevated px-3 py-2 text-sm font-bold outline-none focus:border-gold"
                />
                <button
                  type="button"
                  onClick={saveName}
                  disabled={nameSaving || name.trim().length < 2}
                  aria-label="Kaydet"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold text-bg transition-opacity disabled:opacity-40"
                >
                  <CheckIcon />
                </button>
                <button
                  type="button"
                  onClick={cancelEditingName}
                  aria-label="Vazgeç"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-ink-dim transition-colors hover:bg-bg-elevated"
                >
                  <XIcon />
                </button>
              </div>
            </div>
          )}
          {nameError && <p className="mt-2 text-xs text-red">{nameError}</p>}
          {nameSaved && !editingName && <p className="mt-2 text-xs text-green">Kullanıcı adın güncellendi.</p>}
        </div>

        {/* E-posta */}
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <div className="text-xs text-ink-dim">E-posta</div>
            <div className="mt-0.5 truncate text-sm font-bold">{email}</div>
          </div>
        </div>

        {/* Şifre */}
        <div className="px-4 py-3.5">
          {!hasPassword ? (
            <div>
              <div className="text-xs text-ink-dim">Şifre</div>
              <p className="mt-1 text-xs text-ink-dim">Google/Apple ile giriş yapıyorsun, ayarlı bir şifren yok.</p>
            </div>
          ) : !showPasswordForm ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-ink-dim">Şifre</div>
                <div className="mt-0.5 text-sm font-bold tracking-widest">••••••••</div>
              </div>
              <EditIconButton onClick={() => setShowPasswordForm(true)} label="Şifreni değiştir" />
            </div>
          ) : (
            <form onSubmit={savePassword} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-dim">Şifre değiştir</span>
                <button
                  type="button"
                  onClick={cancelPasswordForm}
                  aria-label="Vazgeç"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-bg-elevated hover:text-ink-dim"
                >
                  <XIcon />
                </button>
              </div>
              <input
                type="password"
                autoFocus
                placeholder="Mevcut şifre"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-card-border bg-bg-elevated px-3 py-2.5 text-sm outline-none focus:border-gold"
              />
              <input
                type="password"
                placeholder="Yeni şifre (en az 6 karakter)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-card-border bg-bg-elevated px-3 py-2.5 text-sm outline-none focus:border-gold"
              />
              <input
                type="password"
                placeholder="Yeni şifre (tekrar)"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-card-border bg-bg-elevated px-3 py-2.5 text-sm outline-none focus:border-gold"
              />
              {pwError && <p className="text-xs text-red">{pwError}</p>}
              <button
                type="submit"
                disabled={pwSaving}
                className="w-full rounded-xl bg-gold py-2.5 text-xs font-bold text-bg disabled:opacity-60"
              >
                {pwSaving ? "Kaydediliyor..." : "Şifreyi Kaydet"}
              </button>
            </form>
          )}
          {pwSaved && !showPasswordForm && <p className="mt-2 text-xs text-green">Şifren güncellendi.</p>}
        </div>
      </div>
    </section>
  );
}
