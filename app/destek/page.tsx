import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

// Public, unauthenticated support page. App Store Connect's listing asks for
// a live "Support URL" that shows people how to get help with the app, so
// this must render for signed-out visitors (a reviewer) AND signed-in ones
// (someone tapping "Yardım" from inside the app) — hence proxy.ts's
// OPEN_PREFIXES rather than PUBLIC_PATHS, which would bounce an
// authenticated visitor home before they could read it.

export const metadata: Metadata = {
  title: "Destek — Tahminle",
  description:
    "Tahminle ile ilgili yardım, sık sorulan sorular ve bize nasıl ulaşacağın.",
};

const CONTACT_EMAIL = "destek@tahminle.app";

const FAQ = [
  {
    q: "Tahminle gerçek para ile mi oynanıyor?",
    a: "Hayır. Tahminle tamamen sanal bakiye ile oynanan bir tahmin oyunudur. Hiçbir gerçek para yatırılmaz, çekilmez ya da kazanılmaz; uygulamada ödeme bilgisi de istenmez.",
  },
  {
    q: "Şifremi unuttum, ne yapmalıyım?",
    a: "Giriş ekranındaki \"Şifremi unuttum\" bağlantısını kullanarak hesabına kayıtlı e-posta adresine sıfırlama bağlantısı isteyebilirsin. Bağlantı gelmezse spam klasörünü kontrol et ya da aşağıdaki adresten bize yaz.",
  },
  {
    q: "Google / Apple ile giriş yapıyorum ama hesabıma ulaşamıyorum.",
    a: "Her zaman ilk kayıt olurken kullandığın yöntemle (Google, Apple veya e-posta) giriş yaptığından emin ol. Farklı bir yöntem yeni bir hesap oluşturur. Sorun sürerse hesabına bağlı e-posta adresinden bize ulaş.",
  },
  {
    q: "Sanal bakiyem yanlış görünüyor / bir tahminim sonuçlanmadı.",
    a: "Maç sonuçları resmî skor kesinleştikten kısa süre sonra işlenir; bazen birkaç saat gecikebilir. 24 saat geçtiği hâlde bir kupon hâlâ bekliyorsa, kupon detayının ekran görüntüsüyle birlikte bize yaz.",
  },
  {
    q: "Bildirimleri nasıl açar / kapatırım?",
    a: "Uygulama içindeki Bildirimler ekranından ya da cihazının sistem ayarlarından istediğin an değiştirebilirsin.",
  },
  {
    q: "Hesabımı nasıl silerim?",
    a: "Uygulamada Hesabım ekranının en altındaki \"Hesabımı Sil\" butonunu kullanabilir ya da Hesap ve Veri Silme sayfamızdaki adımları izleyebilirsin.",
  },
];

export default function DestekPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-10 text-center">
        <Link href="/" aria-label="Tahminle ana sayfa">
          <BrandLogo className="mx-auto mb-5" width={170} />
        </Link>
        <h1 className="font-display text-3xl sm:text-4xl">Destek</h1>
        <p className="mt-3 text-sm text-ink-dim">
          Yardıma mı ihtiyacın var? Doğru yerdesin.
        </p>
      </header>

      <Callout>
        <p className="font-semibold text-ink">Bize ulaş</p>
        <p className="mt-2">
          Her türlü soru, sorun ve geri bildirim için:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Tahminle%20Destek`}
            className="font-semibold text-gold underline underline-offset-2 transition-opacity hover:opacity-80"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="mt-2">
          Genellikle <strong className="text-ink">2 iş günü</strong> içinde
          yanıt veriyoruz. Bir hata bildiriyorsan cihaz modelin, işletim
          sistemi sürümün ve mümkünse bir ekran görüntüsü çözümü hızlandırır.
        </p>
      </Callout>

      <section className="mt-10">
        <h2 className="font-display text-xl sm:text-2xl">Sık sorulan sorular</h2>
        <div className="mt-5 space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-card-border bg-card p-5"
            >
              <summary className="cursor-pointer list-none font-semibold text-ink marker:content-none">
                <span className="mr-2 text-gold group-open:hidden">+</span>
                <span className="mr-2 hidden text-gold group-open:inline">–</span>
                {item.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-dim">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-card-border pt-8">
        <h2 className="font-display text-xl sm:text-2xl">Faydalı bağlantılar</h2>
        <ul className="mt-4 space-y-2.5 text-sm text-ink-dim">
          <li className="flex gap-3">
            <span aria-hidden className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-gold" />
            <Link
              href="/gizlilik-politikasi"
              className="font-semibold text-gold underline underline-offset-2 hover:opacity-80"
            >
              Gizlilik Politikası
            </Link>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-gold" />
            <Link
              href="/hesap-silme"
              className="font-semibold text-gold underline underline-offset-2 hover:opacity-80"
            >
              Hesap ve Veri Silme Talebi
            </Link>
          </li>
        </ul>
      </section>

      <footer className="mt-10 border-t border-card-border pt-6 text-center">
        <p className="text-xs text-ink-faint">
          Tahminle gerçek para ile oynanan bir bahis uygulaması değildir.
          Tamamen sanal bakiye ile oynanan bir tahmin oyunudur.
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
