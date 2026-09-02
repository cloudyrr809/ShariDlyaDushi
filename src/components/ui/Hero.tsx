import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";

import { defaultSettings, fetchSettings } from "../../lib/settings";

/**
 * Логотип ВК нарисован внутри кадра 24×24, но сам занимает только полосу
 * y 7..19 — половину высоты кадра (замерено по границам самого path).
 * Instagram свой кадр заполняет целиком, поэтому при одинаковом h-4 значок
 * ВК отрисовывался вдвое мельче и выглядел «съехавшим».
 * Обрезаем viewBox по фактическим границам рисунка: теперь высотой
 * управляет className, и обе иконки встают одного роста.
 */
const VkIcon = ({
  className = "h-3 w-auto fill-current",
}: {
  className?: string;
}) => (
  <svg className={className} viewBox="1.29 7 21.42 12">
    <path d="M13.162 18.994c.609 0 .858-.406.851-.915-.072-1.075.454-1.527.91-1.527.322 0 .58.172.936.528 1.137 1.138 1.83 1.914 3.013 1.914h2.467c.725 0 1.077-.353.868-1.073-.414-1.425-2.02-3.14-2.825-3.957-.42-.428-.548-.619 0-1.392.548-.775 2.45-3.526 2.656-4.664.108-.598-.242-.906-.827-.906h-2.467c-.604 0-.882.28-1.034.636-.889 2.083-2.016 4.316-2.73 4.316-.254 0-.371-.118-.371-.767V7.911c0-.62-.178-.905-.688-.905H9.98c-.378 0-.612.28-.612.551 0 .59.882.726.972 2.385v3.606c0 .791-.142.934-.457.934-.844 0-2.895-3.076-4.108-6.586-.239-.691-.482-.985-1.112-.985H2.196c-.752 0-.904.353-.904.743 0 .695.892 4.148 4.152 8.706 2.174 3.045 5.234 4.649 7.718 4.649z" />
  </svg>
);

const InstagramIcon = ({
  className = "w-4 h-4 fill-current",
}: {
  className?: string;
}) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

/**
 * Геометрия шариков, снятая с альфа-канала PNG:
 *  f* — доля реального содержимого внутри кадра картинки (вокруг него прозрачные поля),
 *  ar — соотношение сторон содержимого (ширина / высота),
 *  kx — положение узелка по X внутри содержимого (0..1). Именно к нему крепится ленточка.
 */
const SOURCES = {
  b1: {
    src: "/assets/ballon1.png",
    fx: 0.1602,
    fy: 0.0639,
    fw: 0.6852,
    fh: 0.8713,
    ar: 0.7864,
    kx: 0.5066,
  },
  b2: {
    src: "/assets/ballon2.png",
    fx: 0.2685,
    fy: 0.1759,
    fw: 0.4667,
    fh: 0.65,
    ar: 0.7179,
    kx: 0.5114,
  },
  b3: {
    src: "/assets/ballon3.png",
    fx: 0.113,
    fy: 0.05,
    fw: 0.7741,
    fh: 0.9259,
    ar: 0.836,
    kx: 0.4937,
  },
  b4: {
    src: "/assets/ballon4.png",
    fx: 0.1361,
    fy: 0.0611,
    fw: 0.7194,
    fh: 0.8898,
    ar: 0.8085,
    kx: 0.5315,
  },
  b5: {
    src: "/assets/ballon5.png",
    fx: 0.1731,
    fy: 0.0296,
    fw: 0.6565,
    fh: 0.9269,
    ar: 0.7083,
    kx: 0.5109,
  },
  b6: {
    src: "/assets/ballon6.png",
    fx: 0.1935,
    fy: 0.0852,
    fw: 0.6139,
    fh: 0.8222,
    ar: 0.7466,
    kx: 0.5086,
  },
} as const;

// Система координат грозди. Контейнер имеет ровно такое же соотношение сторон.
const VW = 1000;
const VH = 1520;
// Точка, в которой сходятся все ленточки
const KNOT_X = 505;
const KNOT_Y = 1440;

// Амплитуды анимаций — все в единицах системы координат выше.
const MOUSE_X = 17; // отклик на курсор по горизонтали
const MOUSE_Y = 11;
const FLY_DIST = 1500; // на сколько улетает шарик при полной прокрутке
const FLY_SCALE = 0.1; // насколько уменьшается
const FLOAT_AMP = 6; // покачивание в покое

/**
 * Небо за курсором. В пикселях, не в единицах системы координат грозди.
 *
 * Знак отрицательный — фон едет ПРОТИВ курсора, а шары по нему. Встречное
 * движение удваивает воспринимаемую разницу между планами, поэтому глубина
 * читается при совсем небольшой амплитуде и фон не «плавает» сам по себе.
 *
 * Величина заведомо меньше, чем у шаров: дальний план должен смещаться
 * слабее ближнего, иначе параллакс выворачивается наизнанку.
 */
const SKY_MOUSE_X = -9;
const SKY_MOUSE_Y = -6;

type Balloon = {
  k: keyof typeof SOURCES;
  cx: number;
  cy: number;
  w: number;
  rot: number;
  op: number;
  z: number;
  depth: number;
  drift: number;
  stagger: number;
  float: number;
};

/**
 * Гроздь набита намеренно неровно: у каждого шарика свой уровень, размер и наклон,
 * а слева/справа на разной высоте разное количество шаров — чтобы не читались ряды.
 */
const BALLOONS: Balloon[] = [
  // дальний план
  {
    k: "b5",
    cx: 556,
    cy: 305,
    w: 228,
    rot: -9,
    op: 0.92,
    z: 1,
    depth: 0.55,
    drift: -64,
    stagger: 0.02,
    float: 7.5,
  },
  {
    k: "b1",
    cx: 648,
    cy: 335,
    w: 216,
    rot: 8,
    op: 0.928,
    z: 2,
    depth: 0.55,
    drift: 70,
    stagger: 0.08,
    float: 6.9,
  },
  {
    k: "b2",
    cx: 296,
    cy: 435,
    w: 236,
    rot: -14,
    op: 0.936,
    z: 3,
    depth: 0.6,
    drift: -98,
    stagger: 0.16,
    float: 8.3,
  },
  {
    k: "b4",
    cx: 585,
    cy: 414,
    w: 246,
    rot: 3,
    op: 0.944,
    z: 4,
    depth: 0.6,
    drift: 12,
    stagger: 0.1,
    float: 8.6,
  },
  {
    k: "b6",
    cx: 818,
    cy: 473,
    w: 224,
    rot: 14,
    op: 0.94,
    z: 5,
    depth: 0.62,
    drift: 104,
    stagger: 0.22,
    float: 7.8,
  },
  {
    k: "b3",
    cx: 182,
    cy: 572,
    w: 222,
    rot: -17,
    op: 0.944,
    z: 6,
    depth: 0.66,
    drift: -126,
    stagger: 0.3,
    float: 7.2,
  },
  // средний план
  {
    k: "b1",
    cx: 396,
    cy: 535,
    w: 284,
    rot: -6,
    op: 0.976,
    z: 7,
    depth: 0.8,
    drift: -52,
    stagger: 0.18,
    float: 7.0,
  },
  {
    k: "b5",
    cx: 700,
    cy: 567,
    w: 270,
    rot: 9,
    op: 0.976,
    z: 8,
    depth: 0.8,
    drift: 66,
    stagger: 0.26,
    float: 8.1,
  },
  {
    k: "b4",
    cx: 405,
    cy: 636,
    w: 292,
    rot: 1,
    op: 0.992,
    z: 9,
    depth: 0.88,
    drift: 8,
    stagger: 0.24,
    float: 6.7,
  },
  {
    k: "b6",
    cx: 872,
    cy: 672,
    w: 214,
    rot: 16,
    op: 0.968,
    z: 10,
    depth: 0.78,
    drift: 132,
    stagger: 0.38,
    float: 7.6,
  },
  {
    k: "b2",
    cx: 232,
    cy: 698,
    w: 252,
    rot: -12,
    op: 0.984,
    z: 11,
    depth: 0.85,
    drift: -108,
    stagger: 0.34,
    float: 8.8,
  },
  // передний план
  {
    k: "b3",
    cx: 790,
    cy: 762,
    w: 250,
    rot: 12,
    op: 1,
    z: 12,
    depth: 0.95,
    drift: 98,
    stagger: 0.46,
    float: 7.4,
  },
  {
    k: "b1",
    cx: 612,
    cy: 777,
    w: 288,
    rot: -7,
    op: 1,
    z: 13,
    depth: 0.98,
    drift: -46,
    stagger: 0.42,
    float: 8.0,
  },
  {
    k: "b5",
    cx: 470,
    cy: 819,
    w: 274,
    rot: 6,
    op: 1,
    z: 14,
    depth: 1,
    drift: 54,
    stagger: 0.52,
    float: 7.1,
  },
  {
    k: "b6",
    cx: 286,
    cy: 900,
    w: 236,
    rot: -10,
    op: 1,
    z: 15,
    depth: 1,
    drift: -78,
    stagger: 0.6,
    float: 8.4,
  },
  {
    k: "b2",
    cx: 560,
    cy: 935,
    w: 280,
    rot: -2,
    op: 1,
    z: 16,
    depth: 1.05,
    drift: 6,
    stagger: 0.68,
    float: 6.8,
  },
  {
    k: "b4",
    cx: 722,
    cy: 978,
    w: 242,
    rot: 9,
    op: 1,
    z: 17,
    depth: 1.05,
    drift: 72,
    stagger: 0.74,
    float: 7.9,
  },
];

type Cloud = {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  w: string;
  op: number;
  blur: number;
  dir: 1 | -1;
  stagger: number;
  float: number;
  /* Цветокоррекция облака — своя у каждого.

     Облака лежат на z-10, то есть НАД фоновым слоем, и не получают ни одной
     его обработки: ни saturate, ни вуали #2B1B36/70. Поэтому тон приходится
     доводить здесь.

     Раньше здесь стояла розовая 3.png (тон 338°) и её приходилось тащить к
     баклажану через hue-rotate(-24deg) — грубо, потому что поворот тона
     двигает и внутренние тени облака. Теперь исходник родной сиреневый
     (cloudy.png, тон 274°), и поворот не нужен вовсе: остаётся только
     посадить облако по светлоте и насыщенности под свой участок неба.

     Замер фона: снизу-слева 295°/13%/34%, сверху-справа 324°/16%/64%. */
  grade: string;
};

const CLOUDS: Cloud[] = [
  {
    top: "-30%",
    right: "-26%",
    w: "48%",
    op: 0.4,
    blur: 2.5,
    dir: 1,
    stagger: 0.08,
    float: 9.6,
    // Верхнее поднято ВЫШЕ грозди. На прежнем месте оно лежало ровно за
    // шарами и было самым светлым пятном экрана (L69) — бледные шары на нём
    // растворялись. Декор не должен стоять за главным объектом.
    grade: "brightness(1.25) saturate(0.62)",
  },
  // якорим снизу, а не сверху: так облако никогда не съедет за нижний край
  // герой-секции и не будет обрезано на стыке со следующим блоком
  {
    bottom: "-16%",
    left: "-32%",
    w: "46%",
    op: 0.36,
    blur: 3,
    dir: -1,
    stagger: 0.42,
    float: 11,
    // Нижнее приглушено сильнее верхнего и опущено к нижнему левому углу:
    // на прежнем месте оно подсвечивало фон прямо под подзаголовком и роняло
    // его контраст до 2.53 при норме 4.5. Декор не должен лежать под текстом.
    grade: "brightness(0.95) saturate(0.5)",
  },
];

// Единый внешний отступ от краёв экрана (6%) — на нём стоят все угловые
// элементы: плашка, заголовок слева; кнопка звонка, соцсети и подпись справа.

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ═════════════════ ОБЛЕГЧЁННЫЙ РЕЖИМ ПЕРВОГО ЭКРАНА ═════════════════

   На телефоне этот экран шёл 2-5 кадров в секунду. Дело не в JS — запись
   в DOM тут копеечная, — а в том, СКОЛЬКО слоёв композитор пересобирает
   каждый кадр: семнадцать шаров, у каждого своя картинка 1080×1080 с
   drop-shadow по альфа-каналу; SVG с семнадцатью ленточками, форму
   которых мы переписываем через кадр; полноэкранное небо с blur(3px) и
   зерном на mix-blend-mode; два облака с размытием и радиальной маской.
   Для настольной видеокарты это ничто, для телефона — непосильно.

   ОТСЮДА ЖЕ И ВТОРАЯ БЕДА: в Телеграме шары показывались прозрачными.
   Прозрачность шара считается из прокрутки — op = 1 − fly, — а fly
   считается от высоты экрана в единицах svh. Встроенный браузер
   Телеграма меряет высоту по-своему и стартует со своим scrollY, отчего
   шары «улетали» ещё до того, как их увидят. В Хроме на том же телефоне
   всё было нормально.

   Поэтому на сенсорных устройствах первый экран статичен: те же шары,
   то же небо, но без единого пересчёта. Ни параллакса (мыши всё равно
   нет), ни улёта при прокрутке (а значит, и прозрачных шаров), ни
   размытий и режимов наложения. Кадров в секунду больше не тратится
   вообще: рисуется один раз и стоит.

   Проверяем именно наличие мыши, а не ширину окна: параллакс без
   курсора бессмыслен, а этот признак не меняется при повороте телефона
   и не путается с узким окном на настольном мониторе. */
const wantsLite = () =>
  typeof window === "undefined" ||
  window.matchMedia("(hover: none)").matches ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const Hero = () => {
  /* Считается один раз за жизнь компонента: от этого зависит сама
     разметка, а не только поведение, и переключать её на лету незачем —
     мышь посреди сеанса не появляется. */
  const lite = useMemo(wantsLite, []);

  /* Подпись кнопки и строка о действующем предложении приходят из
     админки. Стартуем со значений по умолчанию, а не с пустоты: кнопка
     нужна на первом экране сразу, ждать ответа базы ей незачем. */
  const [cta, setCta] = useState(defaultSettings);
  useEffect(() => {
    let alive = true;
    fetchSettings()
      .then((s) => alive && setCta(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const heroRef = useRef<HTMLElement | null>(null);
  const clusterRef = useRef<HTMLDivElement | null>(null);
  const balloonRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ribbonRefs = useRef<(SVGGElement | null)[]>([]);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const cloudRefs = useRef<(HTMLDivElement | null)[]>([]);
  const skyRef = useRef<HTMLDivElement | null>(null);

  // Всё живое считается в одном rAF-цикле: так шарик и его ленточка
  // всегда двигаются синхронно, а браузер получает ровно один пакет записей на кадр.
  const anim = useRef({
    t: 0,
    tTarget: 0, // прогресс прокрутки
    mx: 0,
    mxTarget: 0, // курсор
    my: 0,
    myTarget: 0,
    pxPerUnit: 0.5,
    raf: 0,
    active: true,
    reduced: false,
    frame: 0,
  });

  /* Какие шары вообще рисуем.

     В облегчённом режиме дальний план убран — шесть картинок 1080×1080,
     которые на телефоне и так тонули в дымке за передними и за общей
     полупрозрачностью грозди. Экономия здесь не в кадрах (движения всё
     равно нет), а в декодировании и памяти: это треть всех изображений
     первого экрана. */
  const list = useMemo(
    () => (lite ? BALLOONS.filter((b) => b.depth >= 0.78) : BALLOONS),
    [lite],
  );

  // Статичная геометрия — считается один раз, в цикле остаётся только арифметика.
  const geom = useMemo(
    () =>
      list.map((b, i) => {
        const s = SOURCES[b.k];
        const h = b.w / s.ar;
        const left = b.cx - b.w / 2;
        const top = b.cy - h / 2;
        const knotX = left + s.kx * b.w;
        const knotY = top + h;
        const dy = KNOT_Y - knotY;
        const bend = [24, -18, 11, -27, 16, -9][i % 6] * (i % 2 ? 1.25 : 0.85);
        return {
          s,
          h,
          left,
          top,
          knotX,
          knotY,
          dy,
          bend,
          // изогнутая форма в покое
          c1x: knotX + bend,
          c1y: knotY + dy * 0.38,
          c2x: KNOT_X - bend * 0.7 + (knotX - KNOT_X) * 0.14,
          c2y: KNOT_Y - dy * 0.3,
          // прямая — к ней ленточка стремится при отрыве
          s1x: knotX + (KNOT_X - knotX) / 3,
          s1y: knotY + dy / 3,
          s2x: knotX + ((KNOT_X - knotX) * 2) / 3,
          s2y: knotY + (dy * 2) / 3,
          phase: i * 1.7,
        };
      }),
    [list],
  );

  const ribbonPath = (i: number, straighten: number, wave: number) => {
    const g = geom[i];
    const k = 1 - straighten;
    // по мере отрыва контрольные точки переезжают с дуги на прямую,
    // и лёгкая волна затухает вместе с изгибом
    const w = wave * k;
    const c1x = g.c1x * k + g.s1x * straighten + w;
    const c1y = g.c1y * k + g.s1y * straighten;
    const c2x = g.c2x * k + g.s2x * straighten - w * 0.6;
    const c2y = g.c2y * k + g.s2y * straighten;
    return `M${g.knotX.toFixed(1)} ${g.knotY.toFixed(1)}C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${KNOT_X} ${KNOT_Y}`;
  };

  useEffect(() => {
    /* В облегчённом режиме цикла нет вовсе — ни одного кадра.

       Это важнее, чем кажется: шары и ленточки остаются ровно там, где их
       поставила разметка, и прозрачность никто не трогает. Именно поэтому
       во встроенном браузере Телеграма они перестают исчезать: их
       прозрачность больше не зависит от того, как этот браузер считает
       высоту экрана и прокрутку. */
    if (lite) return;

    const a = anim.current;
    a.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const measure = () => {
      const el = clusterRef.current;
      if (el) a.pxPerUnit = el.clientWidth / VW;
    };
    measure();

    const onScroll = () => {
      const hero = heroRef.current;
      if (!hero) return;
      a.tTarget = clamp01(window.scrollY / (hero.offsetHeight * 0.9));
      start();
    };

    const onMove = (e: MouseEvent) => {
      const hero = heroRef.current;
      if (!hero || a.reduced) return;
      const r = hero.getBoundingClientRect();
      a.mxTarget = ((e.clientX - r.left) / r.width - 0.5) * 2;
      a.myTarget = ((e.clientY - r.top) / r.height - 0.5) * 2;
      start();
    };

    const onLeave = () => {
      a.mxTarget = 0;
      a.myTarget = 0;
      start();
    };

    const tick = (now: number) => {
      a.frame++;
      // мягкое догоняющее сглаживание — вместо резких CSS-переходов
      a.t += (a.tTarget - a.t) * 0.12;
      a.mx += (a.mxTarget - a.mx) * 0.06;
      a.my += (a.myTarget - a.my) * 0.06;

      const time = now / 1000;
      const ppu = a.pxPerUnit;
      const updatePaths = a.frame % 2 === 0; // форму ленты обновляем через кадр

      /*
        «Дыхание» неба и грозди раньше крутили CSS-кейфреймы на отдельных
        обёртках. Замер показал, что сама запись в DOM почти бесплатна
        (~0.07 мс на кадр из 16.7), а дорого обходится композитинг: анимируемая
        обёртка — это ещё один живой слой, и всё её поддерево приходится
        пересобирать каждый кадр. У грозди под такой обёрткой лежало 17
        промотированных шаров, у неба — полноэкранный слой зерна с
        mix-blend-mode, который из-за движущегося под ним фона переblending-ился
        каждый кадр.

        Поэтому масштаб считаем здесь и подмешиваем в тот же transform, который
        и так пишется. Лишние слои исчезают, картинка не меняется.
        Периоды 30 и 23 секунды — те же, что были в кейфреймах.
      */
      const skyBreathe = a.reduced
        ? 1
        : 1 + 0.04 * (1 - Math.cos((time * 6.283) / 30));
      const clusterBreathe = a.reduced
        ? 1
        : 1 + 0.0175 * (1 - Math.cos((time * 6.283) / 23));

      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        const g = geom[i];
        const span = 1 - b.stagger * 0.55;
        const fly = clamp01((a.t - b.stagger * 0.55) / span);

        const bob = a.reduced
          ? 0
          : Math.sin(time * (6.28 / b.float) + g.phase) * FLOAT_AMP;
        // Прежняя обёртка масштабировала гроздь ЦЕЛИКОМ вокруг общего узла
        // (transform-origin: 50% 95%), из-за чего шары на вдохе слегка
        // расходились. Если просто увеличить каждый шар, он вырастет на месте
        // и этот разлёт пропадёт. Поэтому сдвигаем шар от общего узла ровно
        // так, как его двинуло бы масштабирование всей грозди.
        const spread = clusterBreathe - 1;
        const bx = (g.knotX - KNOT_X) * spread;
        const by = (g.knotY - KNOT_Y) * spread;

        const ux = a.mx * b.depth * MOUSE_X + fly * b.drift + bx;
        const uy = a.my * b.depth * MOUSE_Y - fly * FLY_DIST + bob + by;
        // дыхание грозди подмешано в масштаб самого шара — вместо
        // анимированной обёртки над всеми семнадцатью
        const sc = (1 - fly * FLY_SCALE) * clusterBreathe;
        const op = clamp01(1 - fly * 1.12) * b.op;

        const el = balloonRefs.current[i];
        if (el) {
          el.style.transform = `translate3d(${(ux * ppu).toFixed(2)}px,${(uy * ppu).toFixed(2)}px,0) scale(${sc.toFixed(3)})`;
          el.style.opacity = op.toFixed(3);
        }

        const rg = ribbonRefs.current[i];
        if (rg) {
          rg.setAttribute(
            "transform",
            `translate(${ux.toFixed(1)} ${uy.toFixed(1)}) translate(${g.knotX.toFixed(1)} ${g.knotY.toFixed(1)}) scale(${sc.toFixed(3)}) translate(${(-g.knotX).toFixed(1)} ${(-g.knotY).toFixed(1)})`,
          );
          rg.style.opacity = clamp01(1 - fly * 1.2).toFixed(3);
        }

        if (updatePaths) {
          const p = pathRefs.current[i];
          if (p) {
            const wave = a.reduced ? 0 : Math.sin(time * 0.55 + g.phase) * 5;
            p.setAttribute("d", ribbonPath(i, fly, wave));
          }
        }
      }

      // Небо — самый дальний план: смещается слабее всех и навстречу курсору.
      // Сдвиг и «дыхание» пишутся одним transform на одном элементе, поэтому
      // весь фон вместе с зерном остаётся единственным слоем.
      const sky = skyRef.current;
      if (sky) {
        sky.style.transform = `translate3d(${(a.mx * SKY_MOUSE_X).toFixed(2)}px,${(a.my * SKY_MOUSE_Y).toFixed(2)}px,0) scale(${skyBreathe.toFixed(4)})`;
      }

      for (let i = 0; i < CLOUDS.length; i++) {
        const c = CLOUDS[i];
        const el = cloudRefs.current[i];
        if (!el) continue;
        const fly = clamp01((a.t - c.stagger * 0.5) / (1 - c.stagger * 0.5));
        const bob = a.reduced ? 0 : Math.sin(time * (6.28 / c.float) + i) * 5;
        el.style.transform = `translate3d(${(a.mx * 5 + fly * c.dir * 130).toFixed(1)}px,${(a.my * 4 - fly * 60 + bob).toFixed(1)}px,0)`;
        el.style.opacity = clamp01(1 - fly * 1.2).toFixed(3);
      }

      // если ничего не меняется и покачивание выключено — цикл засыпает
      const settled =
        Math.abs(a.tTarget - a.t) < 0.0005 &&
        Math.abs(a.mxTarget - a.mx) < 0.0005 &&
        Math.abs(a.myTarget - a.my) < 0.0005;

      if (a.active && (!settled || !a.reduced)) {
        a.raf = requestAnimationFrame(tick);
      } else {
        a.raf = 0;
      }
    };

    const start = () => {
      if (!a.raf && a.active) a.raf = requestAnimationFrame(tick);
    };

    // Пока герой за пределами экрана — не тратим ни кадра.
    const io = new IntersectionObserver(
      ([entry]) => {
        a.active = entry.isIntersecting;
        if (a.active) start();
        else if (a.raf) {
          cancelAnimationFrame(a.raf);
          a.raf = 0;
        }
      },
      { threshold: 0 },
    );
    if (heroRef.current) io.observe(heroRef.current);

    const ro = new ResizeObserver(measure);
    if (clusterRef.current) ro.observe(clusterRef.current);

    const heroEl = heroRef.current;
    window.addEventListener("scroll", onScroll, { passive: true });
    heroEl?.addEventListener("mousemove", onMove, { passive: true });
    heroEl?.addEventListener("mouseleave", onLeave);

    onScroll();
    start();

    return () => {
      window.removeEventListener("scroll", onScroll);
      heroEl?.removeEventListener("mousemove", onMove);
      heroEl?.removeEventListener("mouseleave", onLeave);
      io.disconnect();
      ro.disconnect();
      // Обнулять обязательно: иначе при повторном монтировании (StrictMode в dev)
      // start() видит «кадр уже запланирован» и цикл не запускается вовсе.
      if (a.raf) cancelAnimationFrame(a.raf);
      a.raf = 0;
      a.active = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lite, list]);

  return (
    <section
      ref={heroRef}
      className="relative isolate h-[calc(100svh-4.5rem)] min-h-[640px] w-full touch-pan-y overflow-hidden bg-[#2D2433] select-none"
    >
      <style>{`
        .hero-grain {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 190px 190px;
        }
      `}</style>

      {/* ФОН.
          Один движущийся слой — skyRef. И сдвиг за курсором, и медленное
          «дыхание» пишет в него JS одним transform.

          Зерно лежит ВНУТРИ этого слоя. Это важно: у него mix-blend-mode, то
          есть каждый кадр оно смешивается с тем, что под ним. Когда зерно
          было снаружи, а небо под ним двигалось, композитор пересчитывал
          смешение по всему экрану на каждом кадре. Теперь зерно и небо едут
          вместе, смешение считается внутри одного слоя и кэшируется.

          Слой намеренно больше секции (-inset-[4%]): при сдвиге за курсором
          из-под него не должен показаться край кадра.

          Градиенты остались снаружи — они неподвижны и им незачем ездить. */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          ref={skyRef}
          className="absolute -inset-[4%] will-change-transform"
        >
          <img
            src="/assets/back1.jpg"
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
            // Фон — атмосфера, а не сюжет. Прежние contrast(1.16) и
            // saturate(1.08) работали наоборот: они ПОДНИМАЛИ звонкость
            // рисунка, и он спорил с заголовком и гроздью шаров, которые
            // здесь и есть содержание. Теперь всё три параметра уводят
            // картинку назад: темнее, мягче по контрасту, приглушённее по
            // цвету. blur(3px) добавлен по той же причине — у рисованных
            // облаков жёсткие контуры, и именно они цепляли взгляд.
            //
            // Блюр здесь не бьёт по производительности: слой уже вынесен в
            // отдельный композитный (will-change: transform), фильтр
            // растрируется один раз, а каждый кадр меняется только
            // transform — пересчёта размытия не происходит.
                        // Звонкость вернули почти к исходной. Прежние contrast(0.84) и
            // saturate(0.74) действительно убирали спор фона с контентом, но
            // ценой пасмурности: замер показал 60% пикселей экрана в узкой
            // полосе светлоты 20-40 и ноль ниже 20 — ни теней, ни светов, одна
            // муть. Фон нужно уводить назад ГЛУБИНОЙ (вуаль, размытие), а не
            // вялостью: тогда в небе снова появляется рельеф.
            /* blur(3px) на полноэкранной картинке — самая дорогая
               строка первого экрана: на телефоне её приходится
               перерисовывать при каждом движении слоя. Без движения
               слоя размывать нечего и незачем — вуаль поверх и так
               уводит фон назад. */
            style={{
              filter: lite
                ? "brightness(0.94) contrast(1.04) saturate(0.95)"
                : "blur(3px) brightness(0.94) contrast(1.04) saturate(0.95)",
            }}
          />
          {/* Зерно смешивается с тем, что под ним, на каждом кадре. На
            телефоне это чистый расход без выигрыша: фактуру на таком
            экране почти не видно. */}
        {!lite && (
          <div className="hero-grain absolute inset-0 opacity-[0.28] mix-blend-overlay" />
        )}
        </div>
        {/* Одна ровная вуаль на всю площадь — без растяжек и пятен.
            Плотность взята ровно та, что была под заголовком в варианте с
            градиентом, поэтому текст читается так же, а фон везде одинаковый
            и предсказуемый: никаких светлых и тёмных зон. */}
        <div className="absolute inset-0 bg-[#2B1B36]/72" />
      </div>

      {/* ОБЛАКА.

          На телефоне их нет совсем. Каждое — картинка с размытием и
          радиальной маской, то есть два самых дорогих эффекта сразу; при
          этом на узком экране от облака видно край в углу, а сама
          «глубина», ради которой они и были задуманы, читается только на
          широком кадре с параллаксом. Платить за неё кадрами там, где её
          не видно, незачем. */}
      {!lite &&
        CLOUDS.map((c, i) => (
        <div
          key={`cloud-${i}`}
          ref={(el) => {
            cloudRefs.current[i] = el;
          }}
          className="pointer-events-none absolute z-10"
          style={{
            top: c.top,
            bottom: c.bottom,
            left: c.left,
            right: c.right,
            width: c.w,
            // Облака двигаются каждый кадр, но своего слоя не имели: внутри
            // тяжёлая картинка с blur и маской, и без промотирования браузер
            // перерисовывал её на каждом сдвиге. Теперь размытие и маска
            // растеризуются один раз, а слой просто едет.
            willChange: "transform",
          }}
        >
          <img
            /* cloudy-trim.png — это cloudy.png с обрезанными прозрачными
               полями. В исходнике облако занимало лишь 64.8% ширины холста и
               35.2% высоты, остальное — пустота: подключённое как есть, оно
               выходило втрое мельче прежнего, а квадратный холст ломал
               позиционирование по краям. Обрезка 700x380 из 1080x1080.
               Оригинал cloudy.png лежит рядом нетронутым. */
            src="/assets/cloudy-trim.png"
            alt=""
            draggable={false}
            className="pointer-events-auto h-auto w-full transition-transform duration-700 ease-out hover:scale-105"
            style={{
              opacity: c.op * 1.5,
              // без тени: именно она давала ощущение наклейки. Вместо неё —
              // лёгкое размытие и растушёванный к краям контур
              filter: `blur(${c.blur}px) ${c.grade}`,
              maskImage:
                "radial-gradient(ellipse 78% 76% at 50% 50%, #000 42%, rgba(0,0,0,0.55) 72%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 78% 76% at 50% 50%, #000 42%, rgba(0,0,0,0.55) 72%, transparent 100%)",
            }}
            />
          </div>
        ))}

      {/* ГРОЗДЬ ШАРИКОВ.
          Смещена вправо: слева освобождается колонка под заголовок, в центре
          остаётся «воздух». Двигаем left — точкой отсчёта остаётся центр
          грозди, поэтому -translate-x-1/2 сохраняем.
          zIndex 20 — ВЫШЕ заголовка (15) и ниже угловых элементов (30).
          Порядок именно такой ради главного эффекта: левые шары и их
          ленточки ложатся ПОВЕРХ хвоста «ШАРАХ», а не наоборот. Углы
          при этом остаются сверху, иначе шар перекрыл бы ссылки.
          ПРИВЯЗКА. На десктопе гроздь стоит НЕ в процентах от экрана, а на
          том же расстоянии от центра, что и сетка контента. Так задумано:
          заголовок растёт от левого края сетки, а процент отсчитывается от
          центра экрана — на разной ширине они расходятся, и наезд то
          съедает букву целиком, то пропадает совсем. Замерено вживую.

          По той же причине здесь нет -translate-x-1/2 (он остаётся только
          на мобильном, где гроздь по центру): без него слева фиксируется
          КРАЙ грозди, а не её середина, и ширина грозди — которая зависит
          от высоты экрана — почти перестаёт влиять на глубину наезда.

          ↓ РУЧКА №1: меньше px — гроздь левее и глубже заходит на текст.
          Наезд должен срезать только правый бок «Х», иначе читается «ШАРА».
          Значения разные для lg и xl, потому что на xl прыгает кегль
          заголовка и его хвост уезжает правее. */}
      <div
        ref={clusterRef}
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 opacity-45 lg:left-[576px] lg:translate-x-0 lg:opacity-100 xl:left-[calc(50%_+_131px)] 2xl:left-[calc(50%_+_118px)]"
        style={{
          top: "-3%",
          height: "106%",
          aspectRatio: `${VW} / ${VH}`,
          zIndex: 20,
        }}
      >
        {/* Обёртки с CSS-дыханием здесь больше нет. Она анимировала transform,
            а под ней лежали семнадцать промотированных шаров — каждый кадр
            композитору приходилось пересобирать всё поддерево. Теперь дыхание
            подмешано в масштаб каждого шара прямо в rAF-цикле: анимируемого
            предка нет, и слои шаров просто двигаются, ничего не пересобирая. */}
        {/* СВЕЧЕНИЕ ЗА ГРОЗДЬЮ.
            Между фоном (светлота ~30) и шарами (~75) в гистограмме был провал:
            всего 5% пикселей в полосе 40-60. Из-за этого гроздь выглядела
            вырезанной и наклеенной, а не освещённой. Мягкий свет за ней
            перекидывает мостик через этот разрыв.
            zIndex 0 — под ленточками (1) и под шарами (2+). */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 0,
            background:
              "radial-gradient(46% 42% at 52% 44%, rgba(244,225,240,0.4) 0%, rgba(232,208,232,0.18) 46%, rgba(232,208,232,0) 74%)",
          }}
        />

        {/* Все ленточки — в одном SVG под шариками: одна отрисовка вместо семнадцати */}
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          style={{ zIndex: 1, overflow: "visible" }}
        >
          <defs>
            {geom.map((g, i) => (
              <linearGradient
                key={i}
                id={`ribbon-grad-${i}`}
                gradientUnits="userSpaceOnUse"
                x1={g.knotX}
                y1={g.knotY}
                x2={KNOT_X}
                y2={KNOT_Y}
              >
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.92" />
                <stop offset="28%" stopColor="#FFE6F0" stopOpacity="0.68" />
                <stop offset="62%" stopColor="#E4CBF0" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#C9A9DF" stopOpacity="0.14" />
              </linearGradient>
            ))}
          </defs>
          {geom.map((_, i) => (
            <g
              key={i}
              ref={(el) => {
                ribbonRefs.current[i] = el;
              }}
            >
              <path
                ref={(el) => {
                  pathRefs.current[i] = el;
                }}
                d={ribbonPath(i, 0, 0)}
                fill="none"
                stroke={`url(#ribbon-grad-${i})`}
                strokeWidth={1.15 + ((i * 7) % 5) * 0.12}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </svg>

        {list.map((b, i) => {
          const g = geom[i];
          return (
            <div
              key={`balloon-${i}`}
              ref={(el) => {
                balloonRefs.current[i] = el;
              }}
              className="absolute"
              style={{
                left: `${(g.left / VW) * 100}%`,
                top: `${(g.top / VH) * 100}%`,
                width: `${(b.w / VW) * 100}%`,
                height: `${(g.h / VH) * 100}%`,
                // масштаб и наклон крутятся вокруг узелка — точка крепления ленты не уезжает
                transformOrigin: `${g.s.kx * 100}% 100%`,
                opacity: b.op,
                zIndex: 2 + b.z,
                // Обещание «этот слой будет двигаться» имеет смысл, только
                // если он и правда двигается: в статичном режиме оно лишь
                // держит семнадцать лишних слоёв в памяти телефона.
                willChange: lite ? undefined : "transform, opacity",
              }}
            >
              <img
                src={g.s.src}
                alt=""
                draggable={false}
                className="absolute max-w-none select-none"
                style={{
                  width: `${100 / g.s.fw}%`,
                  height: `${100 / g.s.fh}%`,
                  left: `${(-g.s.fx / g.s.fw) * 100}%`,
                  top: `${(-g.s.fy / g.s.fh) * 100}%`,
                  transform: `rotate(${b.rot}deg)`,
                  transformOrigin: `${g.s.kx * 100}% 100%`,
                  /* ГРАДАЦИЯ ПО ГЛУБИНЕ + ТЕНЬ.

                     Раньше у всех семнадцати шаров стояла одна и та же
                     brightness(0.9). Замер показал, к чему это приводило:
                     соседние розовый и сиреневый шары давали контраст 1.15
                     при том, что 1.0 — это «совершенно неотличимы». Они
                     различались только тоном (67°), но не светлотой (80% и
                     75%), и гроздь читалась одним пятном. При этом с ФОНОМ у
                     шаров всё было хорошо — 5.3 и 4.59.

                     Теперь яркость и насыщенность раздаются по depth (0.55 у
                     самых дальних, 1.05 у передних): дальние уходят в дымку,
                     передние выходят вперёд. Появляется разброс по светлоте,
                     которого и не хватало.

                     Тень идёт по альфа-каналу (drop-shadow, а не box-shadow),
                     поэтому повторяет силуэт шара, а не рисует прямоугольник.
                     Она же и есть главное средство отделения: работает даже
                     там, где два соседних шара совпали по светлоте. У передних
                     тень плотнее — это читается как «ближе к зрителю».

                     Отдельного слоя это не создаёт: фильтр у картинки уже был,
                     мы лишь дополняем его строку. */
                  filter: (() => {
                    const t = (b.depth - 0.55) / 0.5; // 0 у дальних, 1 у передних
                    /* Дальние НЕ затемняем. Первая попытка уводила их в тень
                       (brightness 0.74), и замер показал провал: шар выходил
                       на L60 при небе L69 за ним — темнее фона, то есть читался
                       как грязь. В воздушной перспективе дальнее выцветает к
                       цвету неба: теряет насыщенность и контраст, оставаясь
                       светлым. Поэтому по глубине едет прежде всего saturate,
                       а brightness держится около единицы. */
                    /* Диапазоны намеренно узкие. В первой версии дальние шары
                       уходили в saturate(0.55) при непрозрачности 0.8 — вместе
                       это и давало «растворение»: выцветший шар, сквозь который
                       ещё и просвечивает небо. Теперь глубина читается по
                       мягкой разнице, а не по исчезновению: нижняя граница у
                       всех параметров поднята, а размах сокращён примерно
                       вдвое. Тень при этом усилена — именно она, а не
                       прозрачность, отделяет шар от соседа. */
                    const bright = (0.95 + t * 0.11).toFixed(3);
                    const sat = (0.8 + t * 0.28).toFixed(3);
                    const contrast = (0.95 + t * 0.14).toFixed(3);
                    const shadow = (0.22 + t * 0.2).toFixed(2);
                    const tone = `brightness(${bright}) saturate(${sat}) contrast(${contrast})`;
                    /* drop-shadow считается по альфа-каналу картинки
                       1080×1080 — самая дорогая часть фильтра, и она у
                       каждого шара своя. На телефоне гроздь и так
                       приглушена до 45% и лежит за текстом: разделять
                       соседние шары тенью там попросту не для кого. */
                    return lite
                      ? tone
                      : `${tone} drop-shadow(0 5px 9px rgba(43,27,54,${shadow}))`;
                  })(),
                }}
              />
            </div>
          );
        })}
      </div>

      {/*
        СМЫСЛОВОЙ БЛОК: заголовок + подзаголовок одной левой колонкой.
        Оба элемента в одном контейнере, поэтому выключка по левому краю у них
        общая и не разъезжается при смене кегля.

        z-[15] на десктопе — НИЖЕ грозди (z-20). Именно это и даёт глубину:
        передние шары наезжают на хвост «ШАРАХ». На мобильном z-30 —
        там гроздь приглушена до 45%, и текст должен читаться поверх неё.

        ЕДИНАЯ СЕТКА. px-6 + max-w-[76rem] — ровно та же пара, что у
        контейнера в Header.tsx, и та же, что у всех секций страницы.
        Отсюда следует, что левый край заголовка, подзаголовка, плашки
        сверху, строки про доставку внизу и логотипа в шапке лежат на
        одной вертикали при любой ширине экрана.

        Не менять ширину в одном месте, не поменяв в остальных: именно
        так линия и разъезжается.
      */}
      <div className="pointer-events-none absolute inset-0 z-30 flex items-center px-6 select-none lg:z-[15]">
        <div className="mx-auto w-full max-w-[76rem]">
          <div className="text-center lg:max-w-[56rem] lg:text-left">
            {/*
              Заголовок. Montserrat ExtraBold (800) в капсе.
              800, а не 900: у Montserrat Black буквы начинают заплывать,
              внутрибуквенные просветы схлопываются — на крупном кегле это
              как раз та «блочность», от которой уходим.

              Отрицательный трекинг обязателен: капс Montserrat набран с
              запасом под строчные, вплотную буквы сами не встанут.

              -ml — оптическая выключка. Внутри глифа слева остаётся воздух,
              поэтому строка кажется сдвинутой вправо относительно мелкого
              текста под ней; сдвигаем на величину этого воздуха.

              ЗНАЧЕНИЯ РАЗНЫЕ У СТРОК, И ЭТО НЕ ОПЕЧАТКА. Замерено канвасом
              по реально загруженному шрифту (Montserrat 800):
                «Д» → отступ 0.0125em  (2px при кегле 160)
                «В» → отступ 0.0688em  (11px при кегле 160)
              Разница почти в шесть раз. Одинаковая компенсация на обе
              строки — то, что было раньше, — уводила «ДУША» на 6px левее
              линии, а «В ШАРАХ» оставляла на 3px правее: строки не совпадали
              ни с сеткой, ни друг с другом.

              Единица em, поэтому компенсация переезжает вместе с кеглем.

              ↓ РУЧКА №2: кегль. Больше кегль — дальше уезжает хвост
              «ШАРАХ» и сильнее его накрывает гроздь.
            */}
            <h1 className="pointer-events-auto font-extrabold tracking-[-0.03em] text-white uppercase">
              <span className="block text-5xl leading-none sm:text-6xl lg:-ml-[0.0125em] lg:text-[7.5rem] xl:text-[10rem]">
                Душа
              </span>
              <span className="block text-5xl leading-none whitespace-nowrap sm:text-6xl lg:-ml-[0.0563em] lg:text-[7.5rem] xl:text-[10rem]">
                в шарах
              </span>
            </h1>

            {/* Подзаголовок — Montserrat Regular (400), обычный регистр.
                Капс оставлен только заголовку и угловым плашкам.
                Контраст 800 против 400 держит иерархию сам, без разницы
                в цвете и без декора. */}
            <p className="pointer-events-auto mx-auto mt-7 max-w-sm text-[15px] leading-relaxed font-normal text-white/85 md:text-base lg:mx-0 lg:mt-9 lg:max-w-md">
              Создаём уникальные композиции из воздушных шариков для любых
              событий
            </p>

            {/* КНОПКА И СТРОКА О ПРЕДЛОЖЕНИИ.

                До сих пор на первом экране не было ни одной кнопки:
                человек, уже готовый выбирать, должен был сам догадаться
                долистать до каталога или найти «Каталог» в меню.

                Оформление намеренно тихое и в том же ключе, что вся
                остальная надпись экрана. Кнопка белая с тёмной подписью —
                тот же белый, что у карточек по всему сайту; никакой
                заливки цветом акции и никакой плашки под текстом
                предложения. Само предложение набрано ровно так же, как
                строки в углах экрана: капс, разрядка, белый с
                прозрачностью. Оно читается как часть кадра, а не как
                вклеенный поверх баннер.

                min-h держит место под строку заранее: она приходит из
                базы чуть позже кнопки, и без этого кнопка бы дёргалась. */}
            {cta.heroCta && (
              <div className="pointer-events-auto mt-8 flex flex-col items-center gap-4 lg:mt-10 lg:flex-row lg:items-center lg:gap-6">
                <Link
                  to={cta.heroCtaTo}
                  className="group inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-[15px] font-semibold text-[#2D2433] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] transition hover:bg-[#F8F4F9]"
                >
                  {cta.heroCta}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>

                <p className="flex min-h-[1.15rem] items-center text-[13px] font-medium tracking-[0.18em] text-white/85 uppercase">
                  {cta.heroNote}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/*
        УГЛОВАЯ РАМКА. Два ряда — верхний и нижний — на одной сетке
        max-w-[76rem], то есть по краям логотипа и кнопки в шапке.
        Всё мелкое (text-xs), без плашек, стекла и теней: рамку держит
        сама позиция, а не подложка. Контраст берём цветом — white/60
        на затемнённом фоне читается, но не спорит с заголовком.

        z-30 — всегда над гроздью, иначе шар перекрыл бы ссылки.
      */}

      {/* Верхний ряд */}
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-30 px-6 pt-7 select-none lg:pt-9">
        {/* text-wrap:balance — из-за разрядки строка не влезает в телефон и
            переносится; без балансировки на первой строке оставалось
            «…ПРАЗДНИКОВ ·», а точка-разделитель в конце строки читается как
            опечатка. Балансировка делит надпись на две равные части, и
            разделитель оказывается внутри строки. */}
        <div className="mx-auto w-full max-w-[76rem] text-center [text-wrap:balance] lg:text-left">
          <span className="pointer-events-auto text-[13px] font-medium tracking-[0.18em] text-white/95 uppercase">
            Студия шаров и праздников · Ярославль
          </span>
        </div>
      </div>

      {/* Нижний ряд */}
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-30 px-6 pb-7 select-none lg:pb-9">
        <div className="mx-auto flex w-full max-w-[76rem] flex-col items-center gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          {/* Левый нижний угол */}
          <p className="pointer-events-auto text-[13px] font-medium tracking-[0.18em] text-white/95 uppercase">
            Доставляем по всему городу
          </p>

          {/* Правый нижний угол — контакты голым текстом, без фона и рамок */}
          <div className="flex items-center gap-6">
            <a
              href="tel:+79806616888"
              className="pointer-events-auto inline-flex items-center gap-2 text-[13px] font-medium tracking-[0.18em] text-white/85 uppercase transition-colors hover:text-white"
            >
              <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />8 (980) 661-68-88
            </a>

            {/* Обе иконки — в одинаковых квадратах 20×20 с центрированием,
                поэтому занимают равное место и стоят по одной сетке.
                Высоты разные намеренно: ВК — сплошная заливка и горизонтальный
                по природе знак, Instagram — контурный квадрат. При равной
                высоте залитый знак читался бы тяжелее, поэтому ВК чуть ниже:
                оптически они уравновешены, хотя в пикселях не равны. */}
            <div className="flex items-center gap-4">
              <a
                href="https://vk.ru/sharydlyadushi"
                target="_blank"
                rel="noreferrer"
                aria-label="ВКонтакте"
                className="pointer-events-auto flex h-5 w-5 items-center justify-center text-white/80 transition-colors hover:text-white"
              >
                <VkIcon className="h-[11px] w-auto fill-current" />
              </a>
              <a
                href="https://www.instagram.com/sharydlyadushi"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="pointer-events-auto flex h-5 w-5 items-center justify-center text-white/80 transition-colors hover:text-white"
              >
                <InstagramIcon className="h-4 w-4 fill-current" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
