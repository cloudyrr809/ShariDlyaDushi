import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { WorkHeader } from "./components/ui/PageHeader";
import { TabStrip } from "./components/ui/TabStrip";
import { Lightbox } from "./components/ui/Lightbox";
import {
  ShoppingCart,
  Clock,
  Check,
  Wallet,
  Compass,
  PackageOpen,
  Expand,
} from "lucide-react";
import { useCart } from "./CartContext";
import { servicesData, type ServiceSeed } from "./lib/servicesData";
import { fetchServices, type Service } from "./lib/services";



/* ═══════════════════════ КАРТОЧКА ОДНОЙ УСЛУГИ ═══════════════════════

   ЖУРНАЛЬНЫЙ РАЗВОРОТ, А НЕ КОРОБКА.

   Было: белая плита 1216×1026 со скруглением 2rem, а внутри неё ещё три
   вложенные коробки — блок «что входит» на своей подложке и три плитки
   характеристик в белых рамках. Белое на белом в белом. При окне 900px
   карточка не помещалась в экран с запасом в 126px, а под колонкой с
   миниатюрами оставалась пустая полоса высотой в четверть карточки:
   левый столбец кончался, правый продолжался.

   Стало: плиты нет вовсе, содержимое лежит прямо на фоне страницы с её
   цветными пятнами. Структуру держат волосяные линии #E8DEEE и типографика,
   а не заливки. Вложенных рамок не осталось ни одной.

   ВЫСОТА ЗАДАНА ЯВНО. Тело карточки на широком экране ровно 30rem, и
   столбцы растягиваются на неё оба. Считается так: 73 шапка + 63 вкладки
   оставляют 764px видимого экрана при окне 900. Заголовочный блок ~140,
   строка характеристик ~76, зазор 28 — на тело остаётся 480 = 30rem.
   Побочная выгода: все восемь услуг теперь одной высоты, и переключение
   вкладок не дёргает страницу.

   Длинное описание не растягивает карточку, а прокручивается внутри своей
   колонки; над «что входит» стоит черта, поэтому свободное место под
   коротким описанием читается как воздух колонки, а не как дыра.

   ФОТОГРАФИИ — КОЛЛАЖ, А НЕ КАРУСЕЛЬ. Крупный кадр на две трети ширины и
   два поменьше стопкой справа: разные размеры сами по себе интереснее, чем
   один кадр и ряд одинаковых миниатюр под ним. Стрелки, точки и миниатюры
   убраны — вместо них любой кадр открывается в общем просмотрщике, том же,
   что в ленте и в отзывах. Четвёртый и далее кадры прячутся под плашку
   «+N» на последней плитке, но в просмотрщике доступны все.
   ─────────────────────────────────────────────────────────────────────── */

/** Как ложится плитка в коллаже 3×2. Первый кадр крупный — две трети
    ширины на всю высоту, остальные стопкой в правой колонке. */
const cellClass = (i: number, shown: number) => {
  if (shown === 1) return "col-span-3 row-span-2";
  if (i === 0) return "col-span-2 row-span-2";
  if (shown === 2) return "col-start-3 row-span-2";
  return i === 1 ? "col-start-3 row-start-1" : "col-start-3 row-start-2";
};

const ServiceCard = ({
  service,
  index,
  count,
}: {
  service: Service;
  /** Номер услуги в списке — для надстрочки «03 / 08». */
  index: number;
  count: number;
}) => {
  const { addToCart } = useCart();
  const [zoom, setZoom] = useState<number | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  /* РАСТУШЁВКА НИЖНЕГО КРАЯ — ТОЛЬКО ПОКА ВНИЗУ ЕЩЁ ЕСТЬ ТЕКСТ.

     Постоянная маска гасила последнюю строку и у того, кто домотал до
     конца: фраза дочитывалась наполовину прозрачной и выглядела
     обрезанной. Теперь маска — это признак «дальше есть ещё», и на
     последнем экране прокрутки её нет. */
  const textRef = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  const checkMore = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    setMore(el.scrollHeight - el.clientHeight - el.scrollTop > 4);
  }, []);

  // Пересчитываем при смене услуги и при изменении ширины окна: от неё
  // зависит и число строк в абзацах, и высота самой колонки.
  useEffect(() => {
    checkMore();
    window.addEventListener("resize", checkMore);
    return () => window.removeEventListener("resize", checkMore);
  }, [checkMore, service.id]);

  /* Просмотрщику нужны кадры в его формате. Размеры не знаем — он тогда
     просто не станет растягивать снимок выше оригинала. */
  const shots = service.images.map((src) => ({ src }));

  // В коллаж помещаются три кадра; остальные живут под плашкой «+N».
  const shown = service.images.slice(0, 3);
  const extra = service.images.length - shown.length;

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

  /* Характеристики. Цена стоит первой и набрана крупнее остальных: это
     единственное число, ради которого сюда и приходят. «Формат» получил
     компас вместо звёздочек — все восемь значений отвечают на вопрос
     «где и как» (студия / улица / дом, любая площадка, доставка по
     городу), а звёздочки к тому же стояли здесь и над «что входит»
     одновременно, одна иконка на два разных смысла. */
  const meta = [
    {
      Icon: Wallet,
      label: "Цена",
      value: `от ${service.price.toLocaleString("ru-RU")} ₽`,
      strong: true,
    },
    { Icon: Clock, label: "Длительность", value: service.time, strong: false },
    { Icon: Compass, label: "Формат", value: service.format, strong: false },
  ];

  return (
    <article className="relative">
      {/* ═══ ЗАГОЛОВОЧНЫЙ БЛОК ═══
          Название и подзаголовок стоят на ОДНОЙ базовой линии в разных
          колонках — журнальная шапка вместо двух строк друг под другом.
          Экономит 30px высоты и заодно занимает пустое место справа от
          короткого названия. */}
      <header className="border-b border-[#E8DEEE] pb-5">
        <p className="text-[13px] font-bold tracking-[0.28em] text-[#A78BB8] uppercase">
          {String(index + 1).padStart(2, "0")}
          <span className="mx-2 text-[#D9C6E4]">/</span>
          {String(count).padStart(2, "0")}
        </p>

        <div className="mt-2.5 flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
          <h3 className="font-serif text-[2.1rem] leading-[0.95] font-bold tracking-[-0.02em] text-[#2D2433] uppercase md:text-[3.1rem]">
            {service.title}
          </h3>

          <p className="max-w-md text-[15px] leading-snug font-medium text-[#7E6E8A] md:text-[17px]">
            {service.shortDesc}
          </p>
        </div>
      </header>

      {/* ═══ ХАРАКТЕРИСТИКИ ═══
          Строка с разделителями-волосинками вместо трёх белых плиток.
          Плитки были рамкой в рамке и занимали 116px; строка занимает 76 и
          читается как выходные данные под заголовком.

          На телефоне делить строку на три негде: при 390px на колонку
          осталось бы по 106px, и «Длительность» обрезалась бы на
          «ДЛИТЕЛЬНОС». Поэтому там это список строк — подпись слева,
          значение справа. */}
      <dl className="grid border-b border-[#E8DEEE] sm:grid-cols-3">
        {meta.map(({ Icon, label, value, strong }, i) => (
          <div
            key={label}
            className={`flex items-center justify-between gap-3 py-3 sm:block sm:py-4 ${
              i > 0
                ? "border-t border-[#F0E6F3] sm:border-t-0 sm:border-l sm:pl-5"
                : ""
            } ${i < meta.length - 1 ? "sm:pr-5" : ""}`}
          >
            <dt className="flex items-center gap-2 text-[13px] font-bold tracking-[0.16em] text-[#7E6E8A] uppercase">
              <Icon className="h-4 w-4 shrink-0 text-[#C46B8A]" />
              {label}
            </dt>
            <dd
              className={`text-right leading-tight sm:mt-1.5 sm:text-left ${
                strong
                  ? "font-serif text-[19px] font-bold text-[#6B4E81] md:text-[22px]"
                  : "text-[15px] font-semibold text-[#2D2433] md:text-base"
              }`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {/* ═══ ТЕЛО: КОЛЛАЖ + ТЕКСТ ═══
          Высота задана явно (30rem), поэтому оба столбца ровно ей равны:
          у коллажа нет собственных пропорций, он просто заполняет колонку,
          а описание прокручивается внутри своей. Так карточка помещается в
          экран целиком и не меняет высоту при переключении вкладок. */}
      <div className="mt-7 grid gap-6 lg:h-[32rem] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:gap-10">
        {/* ─── КОЛЛАЖ ───
            Скругление на всей фигуре, а не на плитках: коллаж читается как
            одна плита, разрезанная тонкими просветами, а не как три
            отдельные карточки. */}
        <figure className="grid aspect-[4/3] grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden rounded-[1.75rem] sm:aspect-[16/11] lg:aspect-auto lg:h-full">
          {shown.map((src, i) => (
            <button
              key={`${service.id}-shot-${i}`}
              type="button"
              onClick={() => setZoom(i)}
              aria-label={`Открыть фото ${i + 1} во весь экран`}
              className={`group relative cursor-zoom-in overflow-hidden bg-[#F3E9F5] ${cellClass(i, shown.length)}`}
            >
              <img
                src={src}
                alt={`${service.title} — фото ${i + 1}`}
                loading="lazy"
                onError={() => setImgErrors((p) => ({ ...p, [i]: true }))}
                className={`h-full w-full object-cover transition duration-700 group-hover:scale-[1.04] ${
                  imgErrors[i] ? "opacity-0" : ""
                }`}
              />

              {/* Подсказка, что кадр открывается. Появляется только там, где
                  есть курсор: на телефоне значок поверх фотографии — просто
                  мусор, тап и так работает. */}
              <span className="pointer-events-none absolute top-3 right-3 hidden h-9 w-9 items-center justify-center rounded-full bg-white/85 text-[#6B4E81] opacity-0 shadow-sm backdrop-blur-sm transition group-hover:opacity-100 md:flex">
                <Expand className="h-4 w-4" />
              </span>

              {/* Скрытые кадры — на последней плитке */}
              {extra > 0 && i === shown.length - 1 && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#2D2433]/45 font-serif text-2xl font-bold text-white">
                  +{extra}
                </span>
              )}
            </button>
          ))}
        </figure>

        {/* ─── ТЕКСТ ─── */}
        <div className="flex min-h-0 flex-col">
          {/* Первый абзац — лид: крупнее остальных и тёмнее. Дальше текст
              идёт ровным кеглем. Прокрутка своя, страницу она не уводит
              (data-lenis-prevent). */}
          <div
            ref={textRef}
            onScroll={checkMore}
            data-lenis-prevent
            className={`min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-3 [scrollbar-color:#C9B4D6_transparent] [scrollbar-width:thin] ${
              more
                ? "lg:[mask-image:linear-gradient(to_bottom,#000_calc(100%-2rem),transparent)]"
                : ""
            }`}
          >
            {service.paragraphs.map((text, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? "text-[16px] leading-relaxed font-medium text-[#4A3A5C] md:text-[17px]"
                    : "text-[15px] leading-relaxed font-medium text-[#5A4D66] md:text-base"
                }
              >
                {text}
              </p>
            ))}
          </div>

          {/* ─── ЧТО ВХОДИТ ───
              Без подложки и рамки: заголовок с чертой сверху и список в две
              колонки. Черта заодно превращает свободное место над ней (у
              коротких описаний) в осмысленный воздух колонки.

              Иконка — раскрытая коробка вместо звёздочек: «что входит»
              буквально про содержимое набора. Звёздочки к тому же стояли и
              здесь, и над «форматом». */}
          <div className="mt-5 shrink-0 border-t border-[#E8DEEE] pt-4">
            <h4 className="flex items-center gap-2 text-[13px] font-bold tracking-[0.2em] text-[#6B4E81] uppercase">
              <PackageOpen className="h-4 w-4" />
              Что входит
            </h4>

            <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {service.includes.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-[15px] leading-snug font-medium text-[#5A4D66]"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C46B8A]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* ─── ЗАКАЗ ───
              Цена отсюда ушла в строку характеристик: она стояла в двух
              местах карточки разным кеглем. Осталась одна кнопка, и ей
              больше не приходится делить строку с числом. */}
          <div className="mt-5 flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <button
              onClick={handleAddToCart}
              className="flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-[#6B4E81] px-8 py-3.5 text-[15px] font-semibold text-white shadow-md transition-all hover:bg-[#5A4D66] hover:shadow-lg"
            >
              <ShoppingCart className="h-4 w-4" />
              Заказать — {service.price.toLocaleString("ru-RU")} ₽
            </button>

            {/* Справа от кнопки оставалось полосой пустоты в треть
                колонки. Заполняем её тем, что спрашивают сразу после цены, —
                а не растягиваем кнопку на 600px. */}
            <p className="text-[14px] leading-snug font-medium text-[#7E6E8A] sm:pl-1">
              Предоплата 50%,
              <br className="hidden sm:block" /> остальное при получении
            </p>
          </div>
        </div>
      </div>

      <Lightbox
        shots={shots}
        index={zoom}
        title={service.title}
        onClose={() => setZoom(null)}
        onIndex={setZoom}
      />
    </article>
  );
};

/** Запасные услуги из кода приводим к тому же типу, что приходит из базы:
    страница не должна знать, откуда взялись данные. */
const fallbackServices: Service[] = servicesData.map(
  (s: ServiceSeed, i): Service => ({ ...s, sort: i, published: true }),
);

/* ─────────────────────────── НАШ ПОДХОД ───────────────────────────

   Три карточки внизу страницы. Оформление то же, что у шагов «как
   получить скидку» на Акциях: свой оттенок, свои скругления, своя тень,
   свой вертикальный сдвиг и свой шарик, свисающий над верхней кромкой.
   Три одинаковых белых прямоугольника подряд читались как заготовка.

   Ритм при этом свой, а не копия соседней страницы: поджатый угол идёт
   в обратную сторону, оттенки в другом порядке, шарики другие — те три,
   что не заняты на Акциях. Одна манера, разный узор. */
const approachCards = [
  {
    title: "Под ключ",
    text: "Полный комплекс услуг для создания идеального праздника",
    shape: "rounded-[2.5rem] rounded-bl-xl",
    tint: "bg-[#F6F0FA]",
    shadow:
      "shadow-[0_14px_40px_-20px_rgba(107,78,129,0.35)] hover:shadow-[0_26px_58px_-22px_rgba(107,78,129,0.42)]",
    // Сдвиг только на широком экране, где карточки стоят рядом. В колонку
    // на телефоне он превратился бы в кривые отступы.
    offset: "md:mt-6",
    art: "/assets/ballon1.png",
    artClass: "-top-10 left-6 w-[4.5rem] -rotate-[12deg]",
  },
  {
    title: "Команда",
    text: "От визажиста до ведущего — мы соберем лучших специалистов",
    shape: "rounded-[2.5rem] rounded-tr-xl",
    tint: "bg-white",
    shadow:
      "shadow-[0_10px_34px_-18px_rgba(45,36,56,0.28)] hover:shadow-[0_22px_50px_-20px_rgba(107,78,129,0.35)]",
    offset: "md:mt-0",
    art: "/assets/ballon3.png",
    artClass: "-top-11 right-6 w-20 rotate-[9deg]",
  },
  {
    title: "Спокойствие",
    text: "Доверьте организацию профессионалам, а сами наслаждайтесь моментом",
    shape: "rounded-[2.5rem] rounded-br-xl",
    tint: "bg-[#FCF2F6]",
    shadow:
      "shadow-[0_12px_36px_-18px_rgba(196,107,138,0.38)] hover:shadow-[0_24px_54px_-20px_rgba(196,107,138,0.45)]",
    offset: "md:mt-9",
    art: "/assets/ballon5.png",
    artClass: "-top-8 left-8 w-[3.75rem] rotate-[15deg]",
  },
];

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
            <ServiceCard
              service={current}
              index={list.findIndex((s) => s.key === current.key)}
              count={list.length}
            />
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

          {/* items-start, а не растянутые на общую высоту: у карточек разный
              объём текста, и пусть они будут разной высоты — вместе со
              сдвигами по вертикали это и даёт асимметрию. Верхний отступ
              увеличен: шарики выступают за кромку и им нужно место, иначе
              они лезли бы на заголовок. */}
          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-3 md:gap-7">
            {approachCards.map((card) => (
              <div
                key={card.title}
                /* Верхний внутренний отступ больше остальных: шарик свисает
                   за кромку и заходит на карточку на 30-40px, заголовок
                   должен начинаться ниже этой границы. */
                className={`relative px-8 pt-12 pb-8 text-center transition-all duration-500 hover:-translate-y-1.5 md:px-9 md:pt-14 md:pb-9 ${card.shape} ${card.tint} ${card.shadow} ${card.offset}`}
              >
                <img
                  src={card.art}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className={`pointer-events-none absolute select-none drop-shadow-[0_10px_18px_rgba(107,78,129,0.22)] ${card.artClass}`}
                />

                {/* Мини-заголовок держит фирменный тёмный, описание идёт на
                    тон мягче — иерархия читается сразу, без линеек и иконок. */}
                <h3 className="text-sm font-bold tracking-widest text-[#2D2433] uppercase">
                  {card.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed font-medium text-[#5A4D66] md:text-base">
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
