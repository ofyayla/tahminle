import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

// Public, unauthenticated policy page. Required by Google Play (the Play
// Console store listing asks for a live privacy policy URL) and by KVKK /
// GDPR, so it has to render for signed-out visitors AND signed-in ones —
// hence proxy.ts's OPEN_PREFIXES rather than PUBLIC_PATHS, which would
// bounce an authenticated visitor home before they could read it.

export const metadata: Metadata = {
  title: "Gizlilik Politikası — Tahminle",
  description:
    "Tahminle'nin hangi verileri topladığı, neden işlediği, kimlerle paylaştığı ve verilerini nasıl silebileceğin.",
};

// Last substantive revision. Shown to the user and bumped by hand whenever
// the text below changes in a way that affects what we do with their data.
const LAST_UPDATED = "31 Ağustos 2026";
const CONTACT_EMAIL = "destek@tahminle.app";

const SECTIONS = [
  { id: "veri-sorumlusu", title: "Veri sorumlusu" },
  { id: "topladigimiz-veriler", title: "Topladığımız veriler" },
  { id: "toplamadigimiz-veriler", title: "Toplamadığımız veriler" },
  { id: "kullanim-amaclari", title: "Verileri ne için kullanıyoruz" },
  { id: "hukuki-dayanak", title: "Hukuki dayanak" },
  { id: "digerlerine-gorunen", title: "Diğer kullanıcılara görünen bilgiler" },
  { id: "ucuncu-taraflar", title: "Hizmet aldığımız üçüncü taraflar" },
  { id: "yurt-disi", title: "Yurt dışına aktarım" },
  { id: "saklama", title: "Saklama süreleri" },
  { id: "silme", title: "Hesabını ve verilerini silme" },
  { id: "bildirimler", title: "Bildirimler" },
  { id: "guvenlik", title: "Güvenlik" },
  { id: "cocuklar", title: "Çocukların gizliliği" },
  { id: "haklarin", title: "Haklarınız" },
  { id: "degisiklikler", title: "Bu politikadaki değişiklikler" },
];

export default function GizlilikPolitikasiPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-10 text-center">
        <Link href="/" aria-label="Tahminle ana sayfa">
          <BrandLogo className="mx-auto mb-5" width={170} />
        </Link>
        <h1 className="font-display text-3xl sm:text-4xl">Gizlilik Politikası</h1>
        <p className="mt-3 text-sm text-ink-dim">
          Son güncelleme: {LAST_UPDATED}
        </p>
      </header>

      <Callout>
        <p className="font-semibold text-ink">Kısaca:</p>
        <p className="mt-2">
          Tahminle, gerçek para kullanılmayan bir <strong className="text-ink">sanal tahmin
          oyunudur</strong>. Hesabını açmak için e-postan, bir görünen adın ve
          (dilersen) favori takımın yeterli. Ödeme bilgisi, kimlik bilgisi,
          konum ya da rehber verisi <strong className="text-ink">hiç toplamıyoruz</strong>.
          Verilerini reklam amacıyla kimseye satmıyor, kiralamıyoruz. Hesabını
          istediğin an sildirebilirsin.
        </p>
      </Callout>

      <nav aria-label="İçindekiler" className="my-8 rounded-2xl border border-card-border bg-card p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">
          İçindekiler
        </p>
        <ol className="space-y-1.5 text-sm text-ink-dim">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="transition-colors hover:text-gold">
                <span className="mr-2 text-ink-faint">{i + 1}.</span>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Section id="veri-sorumlusu" n={1} title="Veri sorumlusu">
        <P>
          Bu politika, <strong className="text-ink">Tahminle</strong> mobil
          uygulaması ve web sitesi (birlikte &ldquo;Uygulama&rdquo;)
          aracılığıyla işlenen kişisel verileri kapsar. 6698 sayılı Kişisel
          Verilerin Korunması Kanunu (KVKK) anlamında veri sorumlusu,
          Uygulama&apos;yı işleten geliştiricidir.
        </P>
        <P>
          Her türlü soru, talep ve veri silme başvurusu için:{" "}
          <MailLink />
        </P>
      </Section>

      <Section id="topladigimiz-veriler" n={2} title="Topladığımız veriler">
        <P>
          Yalnızca Uygulama&apos;nın çalışması için gereken verileri topluyoruz.
          Tamamı aşağıdadır.
        </P>

        <SubTitle>Hesap bilgileri</SubTitle>
        <List
          items={[
            <>
              <B>E-posta adresi</B> — hesabını benzersiz olarak tanımlar ve
              giriş yapmanı sağlar.
            </>,
            <>
              <B>Görünen ad</B> — sıralamalarda ve liglerde diğer kullanıcılara
              gösterilir. Gerçek adın olmak zorunda değil.
            </>,
            <>
              <B>Şifre</B> — e-posta ile kayıt olduysan, şifren yalnızca
              geri döndürülemez biçimde <B>şifrelenmiş özeti (hash)</B> olarak
              saklanır. Şifreni biz de göremeyiz.
            </>,
            <>
              <B>Favori takım</B> — isteğe bağlı; arayüzü kişiselleştirmek ve
              takım sıralamaları için.
            </>,
            <>
              <B>Davet kodu</B> — arkadaş liglerine davet bağlantılarının doğru
              kişiyi ödüllendirmesi için üretilen kişisel kod.
            </>,
          ]}
        />

        <SubTitle>Google veya Apple ile giriş yaptığında</SubTitle>
        <P>
          Sosyal giriş kullanırsan sağlayıcıdan yalnızca şunları alırız:{" "}
          <B>e-posta adresin</B>, <B>adın</B> (yalnızca ilk girişte, görünen
          adını önermek için) ve sağlayıcının sana verdiği{" "}
          <B>değişmeyen kullanıcı kimliği</B>. Bu kimlik, aynı kişinin her
          seferinde aynı hesaba düşmesini sağlar. Google veya Apple hesabının
          şifresine, kişilerine, takvimine ya da başka hiçbir verisine{" "}
          <B>erişimimiz yoktur</B>.
        </P>

        <SubTitle>Uygulama içi aktiviten</SubTitle>
        <List
          items={[
            <>Yaptığın tahminler: maç, seçim, sanal kupon tutarı ve sonucu.</>,
            <>Sanal bakiyen ve bakiye hareketlerin.</>,
            <>Diğer kullanıcılara gönderdiğin/aldığın sanal transferler ve hediyeler (varsa notuyla birlikte).</>,
            <>Kurduğun veya katıldığın arkadaş ligleri ve bu liglerdeki üyeliklerin.</>,
            <>Haftalık ve sezonluk şampiyonluk kayıtların ve kazandığın ödüller.</>,
          ]}
        />

        <SubTitle>Bildirim verileri</SubTitle>
        <P>
          Bildirimlere izin verirsen, cihazına ait{" "}
          <B>anonim bildirim jetonunu (push token)</B> ve platform bilgisini
          (iOS / Android) saklarız. Bu jeton yalnızca sana bildirim
          göndermeye yarar; kimliğini ya da cihazının içeriğini açığa çıkarmaz.
        </P>

        <SubTitle>Teknik veriler</SubTitle>
        <P>
          Sunucularımız, her internet servisinde olduğu gibi, güvenlik ve hata
          ayıklama amacıyla kısa süreli erişim kayıtları (IP adresi, istek
          zamanı, hata bilgisi) tutar. Bu kayıtları profilleme veya reklam için
          kullanmayız.
        </P>
      </Section>

      <Section id="toplamadigimiz-veriler" n={3} title="Toplamadığımız veriler">
        <P>Açıkça belirtmek isteriz — Uygulama şunları toplamaz:</P>
        <List
          items={[
            <>Kredi kartı, banka ya da başka herhangi bir <B>ödeme bilgisi</B>. Uygulamada gerçek para kullanılmaz.</>,
            <>TC kimlik numarası, pasaport ya da başka bir <B>kimlik belgesi</B>.</>,
            <><B>Konum</B> bilgisi.</>,
            <>Telefon <B>rehberin</B>, fotoğrafların, mesajların, mikrofonun veya kameran.</>,
            <>Reklam kimliği; <B>üçüncü taraf reklam ağı ya da davranışsal analiz aracı kullanmıyoruz</B>.</>,
          ]}
        />
        <P>
          Kişisel verilerini hiçbir koşulda satmıyor, kiralamıyor ya da reklam
          amacıyla üçüncü taraflarla paylaşmıyoruz.
        </P>
      </Section>

      <Section id="kullanim-amaclari" n={4} title="Verileri ne için kullanıyoruz">
        <List
          items={[
            <>Hesabını oluşturmak, girişini doğrulamak ve oturumunu sürdürmek.</>,
            <>Tahminlerini kaydetmek, sonuçlandırmak ve sanal bakiyeni hesaplamak.</>,
            <>Genel sıralamayı, takım sıralamalarını ve arkadaş liglerini oluşturmak.</>,
            <>İzin verdiysen maç ve sonuç bildirimlerini göndermek.</>,
            <>Kural ihlallerini, sahte hesapları ve kötüye kullanımı önlemek.</>,
            <>Uygulamadaki hataları gidermek ve performansı iyileştirmek.</>,
          ]}
        />
      </Section>

      <Section id="hukuki-dayanak" n={5} title="Hukuki dayanak">
        <P>
          Verilerini, KVKK m.5 uyarınca <B>bir sözleşmenin kurulması ve
          ifasıyla doğrudan ilgili olması</B> (hesabını açıp Uygulama&apos;yı
          sana sunabilmemiz) ve <B>meşru menfaatimiz</B> (güvenlik, kötüye
          kullanımın önlenmesi) hukuki sebeplerine dayanarak işliyoruz. Avrupa
          Birliği&apos;nden erişiyorsan, GDPR m.6/1-b ve m.6/1-f karşılıkları
          geçerlidir.
        </P>
        <P>
          Bildirimler için dayanağımız <B>açık rızandır</B> (KVKK m.5/1, GDPR
          m.6/1-a). Bu rızayı cihazının ayarlarından ya da uygulama içinden
          istediğin an geri çekebilirsin.
        </P>
      </Section>

      <Section id="digerlerine-gorunen" n={6} title="Diğer kullanıcılara görünen bilgiler">
        <P>
          Tahminle sosyal bir oyun olduğu için bazı bilgilerin diğer
          kullanıcılara açıktır. Bunlar:
        </P>
        <List
          items={[
            <><B>Görünen adın</B> ve <B>favori takımın</B>.</>,
            <><B>Sanal bakiyen, kâr/zararın ve sıralamadaki yerin.</B></>,
            <>Katıldığın <B>arkadaş liglerindeki üyeliğin</B> ve o ligdeki performansın.</>,
            <>Sana sanal transfer ya da hediye gönderen kullanıcılara adın ve işlem notu.</>,
          ]}
        />
        <P>
          <B className="text-gold">E-posta adresin hiçbir zaman başka
          kullanıcılara gösterilmez.</B> Görünen adını, gerçek kimliğinle
          ilişkilendirilmesini istemiyorsan takma ad olarak seçebilirsin.
        </P>
      </Section>

      <Section id="ucuncu-taraflar" n={7} title="Hizmet aldığımız üçüncü taraflar">
        <P>
          Uygulama&apos;yı çalıştırmak için aşağıdaki altyapı sağlayıcılarını
          kullanıyoruz. Her biri yalnızca kendi hizmetini vermek için gereken
          asgari veriyi işler.
        </P>
        <List
          items={[
            <><B>Vercel</B> — web sitesini ve sunucu tarafındaki uygulama katmanını barındırır.</>,
            <><B>Supabase</B> — hesabını ve oyun verilerini tutan veritabanını sağlar.</>,
            <><B>Expo</B> ile <B>Apple Push Notification service</B> ve <B>Firebase Cloud Messaging</B> — bildirimleri cihazına iletir. Bunlara yalnızca bildirim jetonun ve bildirim metni gider.</>,
            <><B>Google</B> ve <B>Apple</B> — yalnızca sosyal giriş kullanırsan, kimliğini doğrulamak için.</>,
            <><B>Groq</B> — maç yorumlarını üretmek için kullandığımız yapay zekâ servisi. Bu servise <B>yalnızca maça ait genel bilgiler (takımlar, oranlar) gönderilir; hiçbir kullanıcı verisi gönderilmez.</B></>,
          ]}
        />
        <P>
          Bunların dışında, kişisel verilerini yalnızca yasal olarak zorunlu
          olduğumuz hallerde (yetkili kamu kurumlarının usulüne uygun talebi)
          paylaşırız.
        </P>
      </Section>

      <Section id="yurt-disi" n={8} title="Yurt dışına aktarım">
        <P>
          Yukarıdaki sağlayıcıların sunucuları Türkiye dışında bulunabilir. Bu
          nedenle verilerin, Uygulama&apos;nın sana sunulabilmesi amacıyla yurt
          dışındaki sunucularda işlenebilir. Hesap oluşturarak bu aktarıma
          ilişkin bilgilendirildiğini kabul etmiş olursun.
        </P>
      </Section>

      <Section id="saklama" n={9} title="Saklama süreleri">
        <P>
          Hesap ve oyun verilerini, hesabın <B>açık kaldığı sürece</B> saklarız —
          geçmiş tahminlerin, sıralama geçmişin ve şampiyonluk kayıtların
          anlamını bundan alır.
        </P>
        <P>
          Hesabını sildiğinde verilerin <B>en geç 30 gün içinde</B> kalıcı
          olarak silinir. Teknik erişim kayıtları en fazla <B>90 gün</B>{" "}
          tutulur. Bildirim jetonun, bildirim iznini geri çektiğinde ya da
          jeton geçersizleştiğinde silinir.
        </P>
      </Section>

      <Section id="silme" n={10} title="Hesabını ve verilerini silme">
        <P>
          Hesabını ve ona bağlı tüm kişisel verileri istediğin an sildirebilirsin.
        </P>
        <List
          items={[
            <>
              Uygulama içinde <B>Hesabım</B> ekranından hesap silme talebinde
              bulunabilirsin.
            </>,
            <>
              Ya da <MailLink /> adresine hesabına kayıtlı e-posta adresinden mesaj gönderebilir veya{" "}
              <Link href="/hesap-silme" className="font-semibold text-gold underline underline-offset-2 hover:opacity-80">
                Hesap ve Veri Silme Talebi
              </Link>{" "}
              sayfamızdaki adımları takip edebilirsin.
            </>,
          ]}
        />
        <P>
          Silme işleminde <B>e-postan, görünen adın, şifre özetin, favori
          takımın, bağlı Google/Apple kimliklerin, bildirim jetonların,
          tahminlerin, bakiye hareketlerin, transfer ve hediye kayıtların ile
          lig üyeliklerin</B> kalıcı olarak kaldırılır. Bu işlem geri alınamaz.
        </P>
        <P>
          Talebini en geç <B>30 gün</B> içinde sonuçlandırırız. Geçmiş
          sıralama tablolarında adın yerine anonim bir ifade görünebilir.
        </P>
      </Section>

      <Section id="bildirimler" n={11} title="Bildirimler">
        <P>
          Bildirimler tamamen isteğe bağlıdır. Maç başlangıcı, tahmin sonucu,
          haftalık şampiyonluk ve lig hareketleri için bildirim göndeririz.
          Uygulama içindeki <B>Bildirimler</B> ayarlarından ya da cihazının
          sistem ayarlarından istediğin an kapatabilirsin. Bildirimleri
          pazarlama veya reklam amacıyla kullanmıyoruz.
        </P>
      </Section>

      <Section id="guvenlik" n={12} title="Güvenlik">
        <P>
          Uygulama ile sunucularımız arasındaki tüm trafik <B>HTTPS</B> ile
          şifrelenir. Şifreler yalnızca geri döndürülemez özet (hash) olarak
          saklanır. Oturum bilgilerin mobil cihazında işletim sisteminin
          güvenli anahtarlığında (iOS Keychain / Android Keystore) tutulur.
          Veritabanına erişim yetkilendirilmiş bağlantılarla sınırlıdır.
        </P>
        <P>
          Hiçbir sistem %100 güvenli olmadığı için, verilerini etkileyen bir
          güvenlik ihlali yaşanırsa seni ve yetkili makamları mevzuatın
          öngördüğü sürede bilgilendiririz.
        </P>
      </Section>

      <Section id="cocuklar" n={13} title="Çocukların gizliliği">
        <P>
          Tahminle <B>13 yaşın altındaki</B> kullanıcılara yönelik değildir ve
          bilerek bu yaş grubundan veri toplamayız. 13 yaşın altındaki bir
          çocuğa ait veri topladığımızı fark edersek, hesabı ve verileri
          gecikmeksizin sileriz. Çocuğunuzun bize veri verdiğini
          düşünüyorsanız <MailLink /> adresinden bize ulaşın.
        </P>
      </Section>

      <Section id="haklarin" n={14} title="Haklarınız">
        <P>
          KVKK m.11 (ve varsa GDPR) kapsamında şu haklara sahipsin:
        </P>
        <List
          items={[
            <>Kişisel verilerinin işlenip işlenmediğini öğrenme ve buna ilişkin bilgi talep etme.</>,
            <>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.</>,
            <>Yurt içinde veya yurt dışında verilerinin aktarıldığı üçüncü kişileri bilme.</>,
            <>Eksik veya yanlış işlenmiş verilerinin <B>düzeltilmesini</B> isteme.</>,
            <>Verilerinin <B>silinmesini</B> veya yok edilmesini isteme.</>,
            <>Verilerinin bir <B>kopyasını</B> talep etme (veri taşınabilirliği).</>,
            <>Otomatik sistemlerle analiz edilmesi sonucu aleyhine bir sonuç çıkmasına itiraz etme.</>,
            <>Hukuka aykırı işleme sebebiyle zarara uğraman hâlinde zararın giderilmesini talep etme.</>,
          ]}
        />
        <P>
          Taleplerini <MailLink /> adresine, hesabına kayıtlı e-posta
          adresinden iletebilirsin. Başvurunu en geç <B>30 gün</B> içinde
          ücretsiz olarak sonuçlandırırız. Sonuçtan memnun kalmazsan Kişisel
          Verileri Koruma Kurumu&apos;na şikâyette bulunma hakkın saklıdır.
        </P>
      </Section>

      <Section id="degisiklikler" n={15} title="Bu politikadaki değişiklikler">
        <P>
          Bu politikayı zaman zaman güncelleyebiliriz. Önemli bir değişiklik
          olursa, uygulama içinde ya da e-posta ile seni bilgilendiririz. Bu
          sayfanın en üstündeki &ldquo;son güncelleme&rdquo; tarihi her zaman
          yürürlükteki sürümü gösterir.
        </P>
      </Section>

      <Callout>
        <p className="font-semibold text-ink">Sorun mu var, sormak istediğin bir şey mi?</p>
        <p className="mt-2">
          Gizlilikle ilgili her konuda <MailLink /> adresinden bize
          yazabilirsin.
        </p>
      </Callout>

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

function Section({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-card-border py-8">
      <h2 className="font-display text-xl sm:text-2xl">
        <span className="mr-2 text-gold">{n}.</span>
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pt-2 text-sm font-bold uppercase tracking-[0.15em] text-gold">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-ink-dim">{children}</p>;
}

function B({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <strong className={`font-semibold text-ink ${className}`}>{children}</strong>;
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-dim">
          <span aria-hidden className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-gold" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-5 text-sm leading-relaxed text-ink-dim">
      {children}
    </div>
  );
}

function MailLink() {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="font-semibold text-gold underline underline-offset-2 transition-opacity hover:opacity-80"
    >
      {CONTACT_EMAIL}
    </a>
  );
}
