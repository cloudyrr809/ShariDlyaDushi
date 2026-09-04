import { useEffect, useState } from "react";
import { CoverHeader } from "./components/ui/PageHeader";
import { SkyBackdrop } from "./components/ui/SkyBackdrop";
import {
  PROMO_ICONS,
  fallbackPromos,
  fetchPromos,
  isWide,
  type Promo,
} from "./lib/promotions";

/* ДАННЫЕ АКЦИЙ. Промокодов здесь намеренно нет: заказы приходят звонком
   или в мессенджер, поле для ввода кода в такой схеме — лишний барьер.

   hero     — то, что читается с расстояния: цифра выгоды или одно слово
              (длинное набирается мельче, см. isWide в lib/promotions)
   vertical — короткая надпись вдоль правого края

   Сами акции живут в базе и правятся в админке; запасной список —
   fallbackPromos в lib/promotions. */

/* ГЕОМЕТРИЯ ШАРОВ. Прозрачные поля вокруг рисунка занимают от 61% кадра
   до 93%, поэтому масштабируем не файл, а его содержимое.
   fx/fy/fw/fh — доля непрозрачной области, снята по альфа-каналу.

   ⚠ Значения привязаны к конкретным файлам: при замене любого ballon*
   их надо перемерить, иначе шар растянет по одной оси. Та же таблица
   продублирована в Hero.tsx (SOURCES) — обновлять надо обе. */
const art: Record<string, { fx: number; fy: number; fw: number; fh: number }> =
  {
    "/assets/ballon1.webp": { fx: 0.1602, fy: 0.0639, fw: 0.6852, fh: 0.8713 },
    "/assets/ballon2.webp": { fx: 0.2685, fy: 0.1759, fw: 0.4667, fh: 0.65 },
    "/assets/ballon3.webp": { fx: 0.113, fy: 0.05, fw: 0.7741, fh: 0.9259 },
    "/assets/ballon4.webp": { fx: 0.1361, fy: 0.0611, fw: 0.7194, fh: 0.8898 },
    "/assets/ballon5.webp": { fx: 0.1731, fy: 0.0296, fw: 0.6565, fh: 0.9269 },
    "/assets/ballon6.webp": { fx: 0.1935, fy: 0.0852, fw: 0.6139, fh: 0.8222 },
  };

/* Размер шара и вынос за края — в CSS-переменных, а не в JS: инлайновый
   стиль не умеет в медиазапросы, а на телефоне пропорции нужны другие.

   --art-h  — доля высоты плитки, которую занимает ВИДИМЫЙ шар
   --art-bx — вынос за правый край, в долях самого шара
   --art-by — то же вниз

   ⚠ Переключение на lg, а не на md: на md карточка 344px — ровно как на
   телефоне, и десктопные пропорции там наезжали текстом на надпись. */
const ART_VARS =
  "[--art-h:0.44] [--art-bx:0.48] [--art-by:0.16] " +
  "lg:[--art-h:0.64] lg:[--art-bx:0.26] lg:[--art-by:0.14]";

/* Шахматка плиток: при двух колонках порядок даёт чередование
   тёмная — светлая — светлая — тёмная — тёмная — светлая.
   glow — размытое пятно под шаром, чтобы объект не выглядел наклеенным.

   Иерархия текста задана РАЗНЫМИ ЦВЕТАМИ, а не прозрачностью:
   полупрозрачный текст смешивается с фоном и теряет контраст — восемь
   строк из шестнадцати не проходили норму. Розовый углублён до #A64D6C:
   на #C46B8A белый давал 3.61:1 при норме 4.5, теперь 5.39:1. */
const skins = [
  {
    bg: "#6B4E81",
    ink: "#FFFFFF",
    body: "#FFFFFF",
    muted: "#E6D8EF",
    glow: "rgba(255,255,255,0.20)",
  },
  {
    bg: "#F6E4EC",
    ink: "#4A3A5C",
    body: "#4A3A5C",
    muted: "#5A4D66",
    glow: "rgba(166,77,108,0.20)",
  },
  {
    bg: "#EEE1F6",
    ink: "#4A3A5C",
    body: "#4A3A5C",
    muted: "#5A4D66",
    glow: "rgba(107,78,129,0.20)",
  },
  {
    bg: "#A64D6C",
    ink: "#FFFFFF",
    body: "#FFFFFF",
    muted: "#FBEEF3",
    glow: "rgba(255,255,255,0.22)",
  },
  {
    bg: "#6B4E81",
    ink: "#FFFFFF",
    body: "#FFFFFF",
    muted: "#E6D8EF",
    glow: "rgba(255,255,255,0.20)",
  },
  {
    bg: "#F6E4EC",
    ink: "#4A3A5C",
    body: "#4A3A5C",
    muted: "#5A4D66",
    glow: "rgba(166,77,108,0.20)",
  },
];

/* ПЛИТКА АКЦИИ — плакатная вёрстка: плоское поле в край, вырезанный шар,
   крупная цифра выгоды. Верхняя зона идёт во всю ширину (шар туда не
   достаёт), нижняя зажата: шар занимает правую половину низа.

   Капслок — сознательное исключение из правила «заголовки строчными»:
   внутри плитки это плакатная надпись, а не заголовок раздела. */
function PromoTile({ promo, index }: { promo: Promo; index: number }) {
  const skin = skins[index % skins.length];
  const Icon = PROMO_ICONS[promo.icon].Icon;
  // Шар мог остаться от файла, которого больше нет: без запасного значения
  // g был бы undefined и плитка уронила бы страницу целиком.
  const g = art[promo.art] ?? art["/assets/ballon1.webp"];

  /* Размер и положение считаем от ВИДИМОГО шара, а не от кадра файла.
     height — насколько нужно раздуть картинку, чтобы её непрозрачная
     часть заняла --art-h высоты плитки.
     translate в процентах берётся от самой картинки, поэтому вынос за
     край получается одинаковым на любом размере плитки: сначала
     компенсируем прозрачное поле, затем добавляем сам вынос. */
  const pc = (n: number) => `${(n * 100).toFixed(2)}%`;
  const artStyle = {
    height: `calc(100% * var(--art-h) * ${promo.artScale ?? 1} / ${g.fh})`,
    transform: `translate(
      calc(${pc(1 - g.fx - g.fw)} + var(--art-bx) * ${pc(g.fw)}),
      calc(${pc(1 - g.fy - g.fh)} + var(--art-by) * ${pc(g.fh)})
    )`,
  };

  return (
    <article
      className={`relative flex min-h-[26rem] flex-col overflow-hidden rounded-[2.25rem] p-8 transition-transform duration-500 hover:-translate-y-1 lg:min-h-[30rem] lg:p-10 ${ART_VARS}`}
      style={{ backgroundColor: skin.bg, color: skin.ink }}
    >
      {/* Свечение под шаром — мягкая глубина без единой линии */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[12%] -bottom-[16%] h-[75%] w-[75%] rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, ${skin.glow} 0%, transparent 70%)`,
        }}
      />

      {/* Шар — единственный объект плитки. max-w-none обязателен: Tailwind
          в preflight вешает на img max-width:100%, и он бы сплющил
          картинку, у которой ширина считается от заданной высоты. */}
      <img
        src={promo.art}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        style={artStyle}
        className="pointer-events-none absolute right-0 bottom-0 w-auto max-w-none drop-shadow-[0_22px_45px_rgba(45,36,56,0.25)]"
      />

      {/* Вертикальная надпись вдоль правого края. right-7/8 держит её внутри
          поля, а верхняя текстовая зона ниже сужена до 78% — иначе длинное
          слово «ПОДАРОК» наезжало бы прямо на неё. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-8 right-7 text-[15px] font-bold tracking-[0.28em] uppercase [writing-mode:vertical-rl] lg:top-10 lg:right-8"
        style={{ color: skin.muted }}
      >
        {promo.vertical}
      </span>

      {/* ВЕРХНЯЯ ЗОНА */}
      <div className="relative z-10 max-w-[78%]">
        <Icon className="mb-6 h-8 w-8" style={{ color: skin.muted }} />

        {/* В h3 лежит полное название, скрытое визуально: для скринридера
            «−10%» и «0 ₽» — не названия акций, подряд шли три одинаковых
            заголовка. Плакатная цифра помечена aria-hidden. */}
        <h2
          className={`leading-[0.85] font-extrabold tracking-[-0.03em] ${
            isWide(promo.hero)
              ? "text-[2.5rem] lg:text-[3.6rem]"
              : "text-[4rem] lg:text-[5.75rem]"
          }`}
        >
          <span className="sr-only">{promo.title}</span>
          <span aria-hidden="true">{promo.hero}</span>
        </h2>

        <p
          aria-hidden="true"
          className="mt-4 text-xl leading-snug font-bold uppercase lg:text-2xl"
        >
          {promo.heroSub}
        </p>
      </div>

      {/* Текст идёт сразу под подписью, а не прижимается к низу: при
          justify-between между блоками зиял провал в 160px.

          Ширина колонки расчётная — упирается в левый край самого широкого
          из шаров. Три ступени, а не две: на lg карточка ещё 472px, и 64%
          залезали на шар. */}
      <div className="relative z-10 mt-7 max-w-[70%] lg:max-w-[56%] xl:max-w-[64%]">
        <p
          className="text-[15px] leading-relaxed font-medium lg:text-base"
          style={{ color: skin.body }}
        >
          {promo.desc}
        </p>
        <p
          className="mt-4 text-sm leading-snug font-semibold"
          style={{ color: skin.muted }}
        >
          {promo.cond}
        </p>
      </div>
    </article>
  );
}

/* ШАГИ ПОЛУЧЕНИЯ. Номеров нет: плитки стоят в ряд и читаются слева
   направо сами, а фиолетовые кружки с цифрами были самым тяжёлым пятном
   блока. Взамен у каждой свой оттенок, скругление, тень, сдвиг и шарик. */
const steps = [
  {
    title: "Выберите композицию",
    text: "Найдите готовый вариант в каталоге или пришлите свою картинку — сделаем по вашему референсу.",
    // Скругления разные у каждой: один угол намеренно поджат, и какой
    // именно — по кругу слева направо, чтобы ряд шёл волной.
    shape: "rounded-[2.5rem] rounded-tr-xl",
    tint: "bg-white",
    shadow:
      "shadow-[0_10px_34px_-18px_rgba(45,36,56,0.28)] hover:shadow-[0_22px_50px_-20px_rgba(107,78,129,0.35)]",
    // Сдвиг по вертикали — только на широком экране, где плитки стоят
    // рядом. В колонку на телефоне он превратился бы в кривые отступы.
    offset: "md:mt-0",
    art: "/assets/ballon2.webp",
    artClass: "-top-9 right-5 w-16 rotate-[12deg]",
  },
  {
    title: "Скажите о поводе",
    text: "При заказе просто упомяните день рождения, оставленный отзыв или имя друга.",
    shape: "rounded-[2.5rem] rounded-bl-xl",
    tint: "bg-[#F6F0FA]",
    shadow:
      "shadow-[0_14px_40px_-20px_rgba(107,78,129,0.35)] hover:shadow-[0_26px_58px_-22px_rgba(107,78,129,0.42)]",
    offset: "md:mt-10",
    art: "/assets/ballon4.webp",
    artClass: "-top-11 left-4 w-20 -rotate-[10deg]",
  },
  {
    title: "Получите выгоду",
    text: "Сразу пересчитаем цену со скидкой и сделаем подарок к заказу.",
    shape: "rounded-[2.5rem] rounded-tl-xl",
    tint: "bg-[#FCF2F6]",
    shadow:
      "shadow-[0_12px_36px_-18px_rgba(196,107,138,0.38)] hover:shadow-[0_24px_54px_-20px_rgba(196,107,138,0.45)]",
    offset: "md:mt-4",
    art: "/assets/ballon6.webp",
    artClass: "-top-8 right-7 w-14 rotate-[16deg]",
  },
];

export default function Promotions() {
  /* Акции из базы; пока таблица пуста — те, что зашиты в коде. Не пустая
     страница на время загрузки: раздел акций без акций читается как
     поломка, а не как «сейчас ничего нет». */
  const [promos, setPromos] = useState<Promo[]>(fallbackPromos);

  useEffect(() => {
    let alive = true;
    fetchPromos()
      .then((p) => {
        if (alive && p && p.length > 0) setPromos(p);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="relative overflow-x-clip bg-[#FDFBFD] text-[#2D2433]">
      <SkyBackdrop />

      {/* ═══════════ 1. ШАПКА — только типографика ═══════════
          Ни фото, ни плашек, ни крошек: два наших шрифта и воздух. Фон
          прозрачный, поэтому сквозь шапку просвечивают цветные пятна выше.

          Текст подзаголовка — без счёта акций: список будет пополняться, а
          «шесть поводов» пришлось бы править каждый раз и однажды забыть. */}
      <CoverHeader
        eyebrow="выгодно и приятно"
        title="Акции"
        lead="Следите за актуальными специальными предложениями на этой странице и первыми узнавайте о новых акциях студии."
      />

      {/* ═══════════ 2. СЕТКА АКЦИЙ — три ряда по две плитки ═══════════ */}
      <section
        aria-label="Действующие акции студии"
        className="relative z-10 mx-auto w-full max-w-[79rem] px-6 pb-8"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {promos.map((promo, i) => (
            <PromoTile key={promo.id} promo={promo} index={i} />
          ))}
        </div>
      </section>

      {/* ═══════════ 3. КАК ПОЛУЧИТЬ — в стиле разделов «О нас» ═══════════
          Рукописная розовая надстрочка + заголовок строчными весом 600,
          без линий-разделителей. Шаги — карточки на белом, как в блоке
          «наш подход» на Услугах. */}
      {/* pb-24/32 — как на «Услугах». Было pb-8: тридцать два пикселя между
          карточками «как получить скидку» и подвалом, из-за чего три плитки
          выглядели вставленными в футер, а не стоящими на странице. */}
      <section className="relative z-10 mx-auto w-full max-w-[79rem] px-6 pt-14 pb-24 md:pt-20 md:pb-32">
        <div className="text-center">
          {/* У рукописного «д» длинный росчерк ниже базовой линии: при
              leading-none он лёг бы на заголовок. pb-[0.5em] подкладывает
              недостающее место, в em — чтобы работало и на мобильном кегле. */}
          <p className="font-miana pb-[0.5em] text-2xl leading-none text-[#A64D6C] md:text-3xl">
            всё просто
          </p>

          <h2 className="mx-auto max-w-3xl text-[1.9rem] leading-[1.15] font-semibold tracking-[-0.01em] text-[#2D2433] md:text-[2.6rem] md:leading-[1.12]">
            Как получить скидку или подарок
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base font-medium text-[#7E6E8A] md:text-[17px]">
            Некоторые скидки применяются автоматически при соблюдении условий.
          </p>
        </div>

        {/* items-start, а не растянутые на общую высоту: у плиток разный
            объём текста, и пусть они будут разной высоты — вместе со
            сдвигами по вертикали это и даёт ту асимметрию, ради которой
            блок переверстан. Верхний отступ увеличен: шарики выступают за
            кромку плиток и им нужно место, иначе они лезли бы на
            подзаголовок. */}
        <div className="mt-16 grid grid-cols-1 items-start gap-8 md:mt-20 md:grid-cols-3 md:gap-7">
          {steps.map((step) => (
            <div
              key={step.title}
              /* Верхний отступ больше остальных: шарик свисает за кромку
                 плитки и заходит на неё на 30-40px, заголовок должен
                 начинаться ниже этой границы. */
              className={`relative px-8 pt-12 pb-8 text-center transition-all duration-500 hover:-translate-y-1.5 md:px-9 md:pt-14 md:pb-9 ${step.shape} ${step.tint} ${step.shadow} ${step.offset}`}
            >
              {/* Шарик свисает над верхней кромкой и заходит на плитку
                  только нижней частью — так он читается как привязанный
                  к ней, а не наклеенный поверх текста. Сторона у каждой
                  плитки своя: справа, слева, справа — ряд не выглядит
                  проштампованным. Декор: из озвучки убран, курсор не
                  ловит. */}
              <img
                decoding="async"
                src={step.art}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className={`pointer-events-none absolute select-none drop-shadow-[0_10px_18px_rgba(107,78,129,0.22)] ${step.artClass}`}
              />

              {/* Тот же набор, что у блока «наш подход» на Услугах:
                  мини-заголовок капсом вразрядку, описание тоном мягче. */}
              <h3 className="text-sm font-bold tracking-widest text-[#2D2433] uppercase">
                {step.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed font-medium text-[#5A4D66] md:text-base">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
