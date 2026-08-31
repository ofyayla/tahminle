import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export const metadata: Metadata = {
  title: "Hesap ve Veri Silme Talebi — Tahminle",
  description:
    "Tahminle hesabınızı ve ilişkili tüm verilerinizi kalıcı olarak nasıl silebileceğinizi öğrenin.",
};

const CONTACT_EMAIL = "destek@tahminle.app";

export default function HesapSilmePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-10 text-center">
        <Link href="/" aria-label="Tahminle ana sayfa">
          <BrandLogo className="mx-auto mb-5" width={170} />
        </Link>
        <h1 className="font-display text-3xl sm:text-4xl">Hesap ve Veri Silme</h1>
        <p className="mt-3 text-sm text-ink-dim">
          Tahminle hesabınızı ve kişisel verilerinizi kalıcı olarak silme rehberi
        </p>
      </header>

      <Callout>
        <p className="font-semibold text-ink">Önemli Bilgilendirme:</p>
        <p className="mt-2">
          Tahminle hesabınızı sildiğinizde, hesabınıza bağlı tüm tahminler, puanlar,
          bakiye hareketleri, lig üyelikleri ve kişisel veriler <strong className="text-ink">kalıcı olarak silinir</strong> ve
          bu işlem geri alınamaz.
        </p>
      </Callout>

      <div className="mt-8 space-y-8">
        <section className="rounded-2xl border border-card-border bg-card p-6">
          <h2 className="font-display text-xl text-ink">
            <span className="mr-2 text-gold">1.</span>
            Uygulama İçinden Doğrudan Silme (Anında)
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-dim">
            Uygulama yüklü ise hesabınızı ve tüm verilerinizi anında silmek için şu adımları izleyebilirsiniz:
          </p>
          <ol className="mt-4 space-y-3 text-sm text-ink-dim">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold/10 font-bold text-xs text-gold">
                1
              </span>
              <span><strong>Tahminle</strong> mobil uygulamasını açın ve giriş yapın.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold/10 font-bold text-xs text-gold">
                2
              </span>
              <span>Alt menüden <strong>Hesabım</strong> sekmesine gidin.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold/10 font-bold text-xs text-gold">
                3
              </span>
              <span>Sayfanın en altındaki kırmızı renkli <strong>Hesabımı Sil</strong> butonuna dokunun.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold/10 font-bold text-xs text-gold">
                4
              </span>
              <span>Güvenlik teyidi amacıyla kullanıcı adınızı yazarak onaylayın. Hesabınız ve tüm verileriniz anında kalıcı olarak silinecektir.</span>
            </li>
          </ol>
        </section>

        <section className="rounded-2xl border border-card-border bg-card p-6">
          <h2 className="font-display text-xl text-ink">
            <span className="mr-2 text-gold">2.</span>
            Web / E-posta Üzerinden Silme Talebi (Uygulama Yüklü Değilse)
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-dim">
            Uygulama cihazınızda yüklü değilse veya erişemiyorsanız, hesabınızın ve verilerinizin silinmesini e-posta yoluyla talep edebilirsiniz:
          </p>
          <div className="mt-4 rounded-xl border border-card-border bg-black/30 p-4 text-sm">
            <p className="text-ink-dim">
              Tahminle hesabınıza kayıtlı olan e-posta adresinizden{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=Hesap%20Silme%20Talebi`}
                className="font-semibold text-gold underline underline-offset-2 hover:opacity-80"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              adresine <strong>&ldquo;Hesap Silme Talebi&rdquo;</strong> konulu bir e-posta gönderin.
            </p>
            <p className="mt-3 text-xs text-ink-faint">
              * Kimlik doğrulaması ve güvenlik amacıyla talep mutlaka hesaba kayıtlı e-posta adresinden iletilmelidir.
              Talebiniz incelenerek en geç <strong>7 iş günü</strong> içerisinde hesabınız ve ilişkili tüm verileriniz sistemlerimizden kalıcı olarak temizlenecektir.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-card-border bg-card p-6">
          <h2 className="font-display text-xl text-ink">
            <span className="mr-2 text-gold">3.</span>
            Hangi Veriler Silinir?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-dim">
            Hesap silme işlemi tamamlandığında aşağıdaki tüm verileriniz veritabanımızdan kalıcı olarak yok edilir:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ink-dim">
            {[
              "E-posta adresiniz ve şifre özetiniz",
              "Görünen adınız ve profil bilgileriniz",
              "Bağlı Google veya Apple giriş kimlikleri",
              "Mobil bildirim (Push Notification) jetonları",
              "Tüm geçmiş maç tahminleriniz ve kuponlarınız",
              "Sanal bakiye hareketleri, transferler ve hediye kayıtları",
              "Katıldığınız arkadaş ligleri ve lig liderlik kayıtları",
              "Kazanılan sezonluk veya haftalık kupalar / rozetler",
            ].map((item, idx) => (
              <li key={idx} className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-card-border bg-card p-6">
          <h2 className="font-display text-xl text-ink">
            <span className="mr-2 text-gold">4.</span>
            Saklanan Veriler ve Saklama Süresi
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-dim">
            Hesabınız silindiğinde kişisel tanımlayıcı tüm verileriniz kaldırılır. Sistem güvenliği, hata ayıklama ve yasal yükümlülükler kapsamında yalnızca anonim sunucu erişim günlükleri (server logs) en fazla <strong>90 gün</strong> süreyle otomatik olarak silinmek üzere tutulur. Bu kayıtlarda kişisel kullanıcı profili bilgisi yer almaz.
          </p>
        </section>
      </div>

      <footer className="mt-10 border-t border-card-border pt-6 text-center">
        <p className="text-xs text-ink-faint">
          Daha fazla bilgi için{" "}
          <Link href="/gizlilik-politikasi" className="text-gold underline underline-offset-2 hover:opacity-80">
            Gizlilik Politikası
          </Link>{" "}
          sayfamızı inceleyebilirsiniz.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-semibold text-gold transition-opacity hover:opacity-80"
        >
          ← Tahminle&apos;ye dön
        </Link>
      </footer>
    </main>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-5 text-sm leading-relaxed text-ink-dim">
      {children}
    </div>
  );
}
