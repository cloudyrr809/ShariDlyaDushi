import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { WorkHeader } from "./components/ui/PageHeader";
import { TabStrip } from "./components/ui/TabStrip";
import {
  ShoppingCart,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  Wallet,
  Sparkles,
} from "lucide-react";
import { useCart } from "./CartContext";
import { servicesData, type ServiceSeed } from "./lib/servicesData";
import { fetchServices, type Service } from "./lib/services";



// --- КАРТОЧКА ОДНОЙ УСЛУГИ ---
const ServiceCard = ({ service }: { service: Service }) => {
  const { addToCart } = useCart();
  const [currentImage, setCurrentImage] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  const total = service.images.length;

  const nextImage = () => setCurrentImage((p) => (p + 1) % total);
  const prevImage = () => setCurrentImage((p) => (p - 1 + total) % total);

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    addToCart({
      id: service.id,
      title: service.title,
      price: service.price,
      images: service.images,
    });

    const button = e.currentTarget;
    const cartIcon = document.getElementById("cart-icon-header");

    if (button && cartIcon) {
      const btnRect = button.getBoundingClientRect();
      const cartRect = cartIcon.getBoundingClientRect();

      const flyingDot = document.createElement("div");
      flyingDot.style.position = "fixed";
      flyingDot.style.top = `${btnRect.top + btnRect.height / 2}px`;
      flyingDot.style.left = `${btnRect.left + btnRect.width / 2}px`;
      flyingDot.style.width = "20px";
      flyingDot.style.height = "20px";
      flyingDot.style.backgroundColor = "#6B4E81";
      flyingDot.style.borderRadius = "50%";
      flyingDot.style.zIndex = "9999";
      flyingDot.style.boxShadow = "0 4px 12px rgba(107,78,129,0.4)";
      flyingDot.style.transition = "all 0.4s cubic-bezier(0.25, 1, 0.5, 1)";
      flyingDot.style.pointerEvents = "none";
      document.body.appendChild(flyingDot);

      requestAnimationFrame(() => {
        flyingDot.style.top = `${cartRect.top + 10}px`;
        flyingDot.style.left = `${cartRect.left + 10}px`;
        flyingDot.style.transform = "scale(0.2)";
        flyingDot.style.opacity = "0.5";
      });

      setTimeout(() => {
        flyingDot.remove();
        cartIcon.classList.add("scale-125");
        setTimeout(() => cartIcon.classList.remove("scale-125"), 200);
      }, 400);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-[2rem] p-5 md:p-10 border border-[#E8DEEE] shadow-[0_8px_30px_rgba(107,78,129,0.06)] w-full">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* ===== ЛЕВАЯ ЧАСТЬ: КАРУСЕЛЬ ===== */}
        <div className="w-full lg:w-[45%] shrink-0">
          <div className="relative aspect-[4/5] rounded-[1.5rem] overflow-hidden bg-gradient-to-br from-[#F8F4F9] via-[#F3E9F5] to-[#FFF0F3] group">
            {service.images.map((src, i) => (
              <img
                key={`${service.id}-img-${i}`}
                src={src}
                alt={`${service.title} — фото ${i + 1}`}
                loading="lazy"
                onError={() => setImgErrors((prev) => ({ ...prev, [i]: true }))}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
                  imgErrors[i] ? "opacity-0" : ""
                } ${
                  i === currentImage
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-105"
                }`}
              />
            ))}

            {imgErrors[currentImage] && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-[#A093AB]">
                Фото {currentImage + 1}
              </span>
            )}

            {/* Плашка времени поверх фото */}
            <span className="absolute top-4 left-4 z-20 text-[13px] md:text-sm uppercase tracking-widest font-semibold text-[#6B4E81] flex items-center gap-1.5 bg-white/85 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
              <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
              {service.time}
            </span>

            {total > 1 && (
              <>
                <button
                  onClick={prevImage}
                  aria-label="Предыдущее фото"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm text-[#6B4E81] flex items-center justify-center shadow-md opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-white transition-all duration-300 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  aria-label="Следующее фото"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm text-[#6B4E81] flex items-center justify-center shadow-md opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-white transition-all duration-300 cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                  {service.images.map((_, i) => (
                    <button
                      key={`${service.id}-dot-${i}`}
                      onClick={() => setCurrentImage(i)}
                      aria-label={`Фото ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        i === currentImage
                          ? "w-6 bg-[#6B4E81]"
                          : "w-1.5 bg-white/80 hover:bg-white"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Миниатюры */}
          {total > 1 && (
            <div className="hidden sm:flex gap-3 mt-4">
              {service.images.map((src, i) => (
                <button
                  key={`${service.id}-thumb-${i}`}
                  onClick={() => setCurrentImage(i)}
                  className={`relative flex-1 aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 bg-[#F0E8F4] cursor-pointer ${
                    i === currentImage
                      ? "border-[#6B4E81] opacity-100"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.opacity = "0";
                    }}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ===== ПРАВАЯ ЧАСТЬ: ОПИСАНИЕ ===== */}
        <div className="w-full lg:w-[55%] flex flex-col">
          <h3 className="font-serif text-3xl md:text-[2.6rem] font-bold text-[#2D2433] leading-tight uppercase mb-3">
            {service.title}
          </h3>

          <p className="text-base md:text-lg text-[#5A4D66] font-medium leading-relaxed mb-6">
            {service.shortDesc}
          </p>

          {/* Описание услуги. Если текста больше, чем помещается по высоте —
              внутренняя прокрутка, чтобы карточка не растягивалась. */}
          <div
            data-lenis-prevent
            className="space-y-4 mb-8 lg:max-h-[360px] lg:overflow-y-auto lg:pr-4 [scrollbar-width:thin] [scrollbar-color:#C9B4D6_transparent]"
          >
            {service.paragraphs.map((text, i) => (
              <p
                key={i}
                className="text-[15px] md:text-base font-medium text-[#5A4D66] leading-relaxed"
              >
                {text}
              </p>
            ))}
          </div>

          {/* ЧТО ВХОДИТ */}
          <div className="bg-[#F8F4F9]/70 rounded-[1.5rem] p-5 md:p-6 mb-6 border border-[#F0E6F3]">
            <h4 className="text-sm uppercase tracking-[0.2em] font-semibold text-[#6B4E81] mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Что входит
            </h4>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {service.includes.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-[15px] font-medium text-[#5A4D66] leading-snug"
                >
                  <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-[#6B4E81]/10 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-[#6B4E81]" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* ИНФО-БЛОКИ.

              Три колонки только с sm. На телефоне их не было куда делить:
              при ширине экрана 390px на колонку оставалось по 106px, и в
              них не влезало ни слово «Длительность» (обрезалось на
              «ДЛИТЕЛЬНОС»), ни цена — «от 5 000» и «₽» разъезжались по
              разным строкам.

              Поэтому на узком экране это не три плитки, а три строки:
              подпись слева, значение справа. Места нужно втрое меньше, и
              ничего не переносится. */}
          <div className="mb-8 grid gap-2 sm:grid-cols-3 sm:gap-3">
            {[
              {
                Icon: Wallet,
                label: "Цена",
                value: `от ${service.price.toLocaleString("ru-RU")} ₽`,
                accent: true,
              },
              { Icon: Clock, label: "Длительность", value: service.time },
              { Icon: Sparkles, label: "Формат", value: service.format },
            ].map(({ Icon, label, value, accent }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#E8DEEE] bg-white px-4 py-3 sm:flex-col sm:justify-center sm:px-3 sm:py-4 sm:text-center"
              >
                <span className="flex shrink-0 items-center gap-2 text-[13px] font-semibold tracking-widest text-[#7E6E8A] uppercase sm:flex-col sm:gap-1.5">
                  <Icon className="h-4 w-4 shrink-0 text-[#D4839A]" />
                  {label}
                </span>
                <span
                  className={`text-right leading-tight font-semibold sm:mt-1 sm:text-center ${
                    accent
                      ? "font-serif text-base font-bold text-[#6B4E81] md:text-lg"
                      : "text-[15px] text-[#2D2433]"
                  }`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* КНОПКА */}
          <div className="mt-auto pt-5 border-t border-[#F0E6F3] flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-serif font-bold text-2xl md:text-3xl text-[#6B4E81]">
              {service.price.toLocaleString("ru-RU")} ₽
            </span>
            <button
              onClick={handleAddToCart}
              className="w-full sm:w-auto bg-[#6B4E81] text-white px-8 py-3.5 rounded-2xl text-sm font-semibold hover:bg-[#5A4D66] hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" /> Заказать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Запасные услуги из кода приводим к тому же типу, что приходит из базы:
    страница не должна знать, откуда взялись данные. */
const fallbackServices: Service[] = servicesData.map(
  (s: ServiceSeed, i): Service => ({ ...s, sort: i, published: true }),
);

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
export default function Services() {
  const location = useLocation();

  /* Услуги приходят из базы; пока их там нет — берём зашитые в коде.
     Не «пустой раздел, пока грузится»: страница услуг без карточек
     читается как поломка. */
  const [list, setList] = useState<Service[]>(fallbackServices);
  const [activeTab, setActiveTab] = useState(fallbackServices[0].key);

  useEffect(() => {
    let alive = true;
    fetchServices()
      .then((s) => {
        // Пустая таблица — значит услуги ещё не перенесены в базу.
        if (alive && s && s.length > 0) setList(s);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const current = list.find((s) => s.key === activeTab) ?? list[0];

  /* Список сменился (приехал из базы), а открытая вкладка в нём не
     нашлась — переключаемся на первую, иначе страница осталась бы пустой. */
  useEffect(() => {
    if (list.length && !list.some((s) => s.key === activeTab)) {
      setActiveTab(list[0].key);
    }
  }, [list, activeTab]);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash && list.some((s) => s.key === hash)) {
      setActiveTab(hash);
    }
  }, [location.hash, list]);

  return (
    <div className="bg-[#FDFBFD] text-[#2D2433] overflow-hidden relative scroll-smooth">
      {/* ФОНОВЫЕ ПЯТНА (BLOBS) */}
      <div className="absolute top-[30%] left-[-10%] w-[500px] h-[500px] bg-[#FFB6C1]/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[60%] right-[-10%] w-[600px] h-[600px] bg-[#6B4E81]/15 rounded-full blur-[150px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] left-[20%] w-[400px] h-[400px] bg-[#D4839A]/20 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* ШАПКА СТРАНИЦЫ — тип «рабочая», общий компонент со страницей
          «Каталог». Раньше та же разметка была написана здесь и там по
          отдельности, и заголовки начали расходиться в цвете и кегле. */}
      <WorkHeader
        crumbs={[{ label: "Главная", to: "/" }, { label: "Услуги" }]}
        title="Услуги"
        lead="Мы подходим к каждому проекту с особым вниманием, предоставляя целый комплекс услуг, чтобы сделать ваше мероприятие незабываемым."
        photo={{
          src: "/assets/backservices.jpg",
          alt: "Оформление праздника композициями из воздушных шаров",
          /* Кадр вдвое шире исходника, поэтому по вертикали его режет — и
             при обрезке по центру в шапку попадали пустые длинные шары
             сверху. Опускаем окно к низу: там коробка, насос, катушки лент
             и шары — то, чем работа собственно и делается. */
          position: "object-[50%_75%]",
        }}
      />

      {/* ИНТЕРАКТИВНЫЕ ВКЛАДКИ (ТАБЫ) — общий компонент с «Каталогом».

          gap-6, а не прежние gap-8: это МИНИМАЛЬНЫЙ просвет, а не
          фактический — на широком экране justify-between всё равно
          раздвигает вкладки по всей ширине, и разницы не видно. А вот на
          ноутбуке 1280px восьми пунктам при gap-8 не хватало 33px, и
          строка без нужды начинала прокручиваться. С gap-6 запас 23px.

          mb-8 — то же значение, что в каталоге, чтобы вкладки на обеих
          страницах отстояли от контента одинаково. */}
      <div id="services-content">
        <TabStrip
          tabs={list.map((srv) => ({ id: srv.key, name: srv.title }))}
          active={activeTab}
          onPick={setActiveTab}
          gap="gap-6"
          className="relative z-20 mb-8 border-b border-[#E8DEEE]"
        />
      </div>

      {/* СОДЕРЖИМОЕ АКТИВНОЙ УСЛУГИ */}
      <div className="relative z-20 max-w-[79rem] mx-auto px-4 md:px-6 pb-12 min-h-[40vh]">
        {/* Все услуги могли быть сняты с публикации — тогда показывать
            нечего, и обращение к current уронило бы страницу. */}
        {current && (
          <div
            key={current.key}
            className="animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both"
          >
            <ServiceCard service={current} />
          </div>
        )}
      </div>

      {/* НАШ ПОДХОД.
          Раньше здесь была гигантская рукописная надпись во весь экран и три
          карточки, расставленные абсолютом с поворотами вдоль волнистой SVG-
          линии. Всё это убрано: и надпись, и линия, и повороты.

          Контейнер max-w-[79rem] px-6 — тот же, что у шапки, панели вкладок и
          карточки услуги выше. Это важнее, чем предложенный max-w-7xl px-4:
          иначе левый и правый край блока разъедутся с остальной страницей,
          которую мы как раз выравнивали. */}
      {/* Отступы намеренно несимметричные: сверху блок подтянут к карточке
          услуги, снизу отодвинут от футера. Так он читается как продолжение
          страницы, а не как приклеенный к подвалу довесок. */}
      {/* pt-14/20 — то же, что у закрывающих блоков «О нас» и «Акций»
          («будем знакомы ближе», «всё просто»). Прежние pt-8/10 прижимали
          рукописную надстрочку к карточке услуги выше, и блок читался её
          продолжением, а не самостоятельным разделом. */}
      <section className="relative z-10 w-full pt-14 pb-24 md:pt-20 md:pb-32">
        <div className="mx-auto w-full max-w-[79rem] px-6">
          {/* Двухуровневый заголовок. Рукописный шрифт остался в проекте
              (font-miana — тот же, что у логотипа), но теперь работает как
              изящная подпись над заголовком, а не как фон во весь экран. */}
          {/*
            Рукописный шрифт роняет у «д» длинный росчерк: замерено, он уходит
            на 0.867em ниже базовой линии, тогда как сам шрифт объявляет себе
            метрический descent всего 0.2em. Браузер резервирует место по
            метрике, поэтому при leading-none хвост торчал на 0.667em за
            пределы строки и ложился прямо на заголовок.

            pb-[0.67em] — ровно эта разница: подкладываем недостающее место
            под росчерк. В em, а не в px, чтобы работало и на мобильном кегле.
            mb-7 — уже настоящий видимый зазор до заголовка.

            -translate-x — оптическая поправка. По метрикам подпись отцентрована
            идеально (расхождение 0.3px), но росчерк «д» добавляет веса справа,
            и слово кажется сдвинутым. transform не влияет на поток, поэтому
            сдвиг ничего не ломает.
          */}
          {/* Пара «рукописная надстрочка + спокойный заголовок» — та же, что
              в призыве к действию на странице «О нас». Розовый рукописный
              задаёт тёплую ноту, заголовок под ним набран строчными и весом
              600: капслок здесь читался как окрик и спорил с подписью. */}
          <p className="font-miana mb-4 -translate-x-[0.3em] pb-[0.5em] text-center text-2xl leading-none text-[#C46B8A] md:text-3xl">
            наш подход
          </p>

          <h2 className="mb-12 text-center text-[1.9rem] leading-[1.15] font-semibold tracking-[-0.01em] text-[#2D2433] md:text-[2.6rem] md:leading-[1.12]">
            Не только дизайнерские шары
          </h2>

          {/* Строгая сетка вместо разбросанных карточек: одинаковая ширина,
              одна базовая линия, равные промежутки. items-stretch по умолчанию,
              поэтому карточки с разным объёмом текста держат общую высоту. */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                title: "Под ключ",
                text: "Полный комплекс услуг для создания идеального праздника",
              },
              {
                title: "Команда",
                text: "От визажиста до ведущего — мы соберем лучших специалистов",
              },
              {
                title: "Спокойствие",
                text: "Доверьте организацию профессионалам, а сами наслаждайтесь моментом",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-10 text-center shadow-[0_4px_20px_rgba(45,36,56,0.05)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(45,36,56,0.10)]"
              >
                {/* Мини-заголовок держит фирменный тёмный, описание идёт на
                    тон мягче — иерархия читается сразу, без линеек и иконок. */}
                <h3 className="mb-3 text-sm font-bold tracking-widest text-[#2D2433] uppercase">
                  {card.title}
                </h3>
                <p className="text-base leading-relaxed font-normal text-[#5A4D66]">
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
