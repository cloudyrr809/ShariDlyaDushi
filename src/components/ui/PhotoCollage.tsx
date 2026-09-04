import { useEffect, useState } from "react";
import type { Shot } from "./Lightbox";

/* КОЛЛАЖ — «выключка строк», как в лентах ВК и Телеграма: кадры встают в
   ряд, высота ряда подбирается под ширину, внутри ряда кадр может быть
   стопкой из двух.

   Следствие: КАДРЫ НЕ ОБРЕЗАЮТСЯ. Каждый сохраняет пропорции, подгонка
   идёт за счёт высоты ряда и ширины колонок. Раскладка считается только
   из пропорций и не зависит от ширины экрана — не прыгает при загрузке.

   Ряд ВСЕГДА один: на нескольких высота коллажа ничем не ограничена, и
   четыре вертикальных кадра давали 1178px — фотография выше экрана.
   Лишние кадры уходят под плашку «+N» на последней плитке. */

/** Зазор между кадрами. Маленький, но не нулевой — как в ленте ВК:
    вплотную состыкованные фотографии сливаются в одно пятно. */
const GAP = 2;

/** Целевая высота ряда в долях ширины — «идеальный» ряд квадратный.

    От этого числа зависит, как лягут ТРИ вертикальных кадра: крупный слева
    и два стопкой справа или в строку по три. Стопка выигрывает, пока
    1/(3a) < 0.671 × TARGET_REL, где a — пропорция кадра.

    При 1.0 порог a > 0.497, то есть стопку получают все вертикальные кадры
    вплоть до 1:2, и раскладка перестаёт зависеть от того, чем снимали.
    При 0.78 порог был 0.637 и проходил ровно между кадрами 2:3 и 9:16. */
const TARGET_REL = 1.0;

/* ─── ГРАНИЦЫ ФОРМЫ РЯДА ───

   Целевая высота — это пожелание, а не запрет: при неудачном наборе
   пропорций подбор всё равно выдавал бы то полоску, то башню. Поэтому
   есть ещё три жёстких ограничения, и раскладка, которая в них не
   укладывается, просто не рассматривается. */

/** Ниже — уже не коллаж, а плёночная полоска: четыре вертикальных кадра
    в один ряд дают 0.375, то есть 800×300 при кадрах по 181px.

    0.45, а не 0.55: при 0.55 под запрет попадали два квадрата в ряд
    (ровно 0.5) — совершенно нормальная раскладка, которая из-за этого
    разваливалась на «один кадр и плашка +1». */
const MIN_H = 0.45;

/** Выше — башня. 1.3: у кадров 9:16 «крупный + стопка» даёт 1.185, и при
    потолке 1.05 такая раскладка отсеивалась до подсчёта цены. Высокий ряд
    тут не страшен — ширина коллажа считается от потолка высоты, поэтому
    башня выходит не выше экрана, а у́же. Стопку из двух ГОРИЗОНТАЛЬНЫХ
    (1.333) потолок по-прежнему отсекает. */
const MAX_H = 1.3;

/** Самая узкая колонка ряда в долях его ширины.

    Именно это ограничение отсекает раскладки вроде «два одиночных кадра
    и стопка»: стопка получала 20% ширины, кадры в ней сжимались до 145px
    и выглядели марками рядом с соседями по 290px. */
const MIN_COL = 0.22;

/** Сколько кадров можно поставить друг под другом в одной колонке.
    Именно два: при стопках до трёх колонка сжималась до 143px. */
const MAX_STACK = 2;

/** Сколько колонок помещается в ряд. */
const MAX_COLS = 4;

/** Сколько кадров показываем в ленте, остальные — под «+N».

    Геометрия позволяет и восемь (4 колонки × 2 в стопке), но при потолке
    высоты они выходят по 186px — снова марки. На пяти всегда остаётся
    хотя бы один крупный кадр: раскладка «один слева + две стопки справа»
    даёт 372/186/186 и читается как коллаж, а не как контактный лист. */
const MAX_SHOWN = 5;

/** Насколько неровность ширин важнее отклонения высоты ряда.

    Одной высоты для оценки не хватает: она ничего не знает о том, КАК
    внутри ряда распределилась ширина. На вертикальном кадре и двух
    квадратах два состава расходились по цене на 0.001 — уровень шума, — и
    выигрывал тот, где одиночный квадрат занимал 71% ряда. */
const BALANCE_W = 0.6;

const ratio = (p: Shot) => (p.w && p.h ? p.w / p.h : 1);

/* ─── СТОПКИ ───
   Колонка из нескольких кадров ведёт себя как одно «виртуальное фото»:
   при общей ширине w её высота равна w × Σ(1/aᵢ), то есть пропорция всей
   колонки — 1/Σ(1/aᵢ). Значит стопку можно подставить в тот же подбор
   наравне с обычным кадром, ничего не обрезая. */
type Item = Shot[];

const itemRatio = (item: Item) =>
  1 / item.reduce((a, p) => a + 1 / ratio(p), 0);

/** Пропорция всего ряда: ширина к высоте. */
const rowSpan = (row: Item[]) => row.reduce((a, it) => a + itemRatio(it), 0);

/** Высота ряда в долях его ширины. */
const rowHeight = (row: Item[]) => 1 / rowSpan(row);

/** Ширина самой узкой колонки в долях ширины ряда. */
function minCol(row: Item[]): number {
  const span = rowSpan(row);
  return Math.min(...row.map((it) => itemRatio(it) / span));
}

/** Разброс ширин колонок внутри ряда. Логарифм — чтобы «вдвое уже» и
    «вдвое шире» весили одинаково. Ноль = все колонки одной ширины. */
function spread(row: Item[]): number {
  if (row.length < 2) return 0;
  const ls = row.map((it) => Math.log(itemRatio(it)));
  const mean = ls.reduce((a, b) => a + b, 0) / ls.length;
  return ls.reduce((a, l) => a + (l - mean) ** 2, 0) / ls.length;
}

/* Цена ряда: отклонение высоты от целевой плюс неровность ширин.

   Логарифм в первом слагаемом, а не разность: он одинаково наказывает
   «вдвое ниже» и «вдвое выше», тогда как обычная разность считает высокие
   ряды страшнее низких — и раскладка сползает в мелкие марки. */
function rowCost(row: Item[]): number {
  const d = Math.log(rowHeight(row) / TARGET_REL);
  return d * d + BALANCE_W * spread(row);
}

/** Все способы разложить n кадров по колонкам: [1,2] — это одиночный кадр
    и стопка из двух, [2,2] — две стопки по два и так далее. */
function compositions(n: number): number[][] {
  const out: number[][] = [];
  const walk = (left: number, acc: number[]) => {
    if (left === 0) {
      if (acc.length <= MAX_COLS) out.push([...acc]);
      return;
    }
    if (acc.length >= MAX_COLS) return;
    for (let k = 1; k <= Math.min(MAX_STACK, left); k++) {
      acc.push(k);
      walk(left - k, acc);
      acc.pop();
    }
  };
  walk(n, []);
  return out;
}

/** Режет кадры на колонки по составу: [1,2] → [[a],[b,c]]. */
function cut(shots: Shot[], comp: number[]): Item[] {
  const row: Item[] = [];
  let at = 0;
  for (const k of comp) {
    row.push(shots.slice(at, at + k));
    at += k;
  }
  return row;
}

type Layout = {
  row: Item[];
  /** Сколько кадров попало в ряд. Остальные — под «+N». */
  shown: number;
  /** Пропорция ряда: ширина к высоте. */
  span: number;
};

/**
 * Подбирает ряд: берёт САМЫЙ ДЛИННЫЙ начальный кусок серии, который
 * укладывается в границы формы, и внутри него — самый дешёвый состав
 * колонок.
 *
 * Порядок кадров не меняется: он авторский, его задаёт студия при
 * публикации, и переставлять снимки ради красивой геометрии нельзя.
 */
function chooseRow(photos: Shot[]): Layout {
  const cap = Math.min(photos.length, MAX_SHOWN);

  for (let k = cap; k >= 1; k--) {
    const slice = photos.slice(0, k);
    let best: Item[] | null = null;
    let bestCost = Infinity;

    for (const comp of compositions(k)) {
      const row = cut(slice, comp);
      const h = rowHeight(row);
      if (h < MIN_H || h > MAX_H) continue; // полоска или башня
      if (minCol(row) < MIN_COL) continue; // колонка-марка
      const c = rowCost(row);
      if (c < bestCost) {
        bestCost = c;
        best = row;
      }
    }

    if (best) return { row: best, shown: k, span: rowSpan(best) };
  }

  /* Сюда попадаем, когда даже ОДИН кадр не укладывается в потолок:
     вертикальный 2:3 в одиночку даёт высоту 1.5 ширины. Показываем его
     как есть — высоту приведёт в порядок уже разметка, ужав коллаж по
     ширине (см. ниже про --collage-h). */
  const row = [[photos[0]]];
  return { row, shown: 1, span: rowSpan(row) };
}

/**
 * Дотягивает размеры для фотографий, у которых они не заданы.
 *
 * Нужно для админки: оттуда посты приходят без ширины и высоты, а без них
 * раскладку не построить. Пока размер неизвестен, кадр считается
 * горизонтальным 3:2 — самый безобидный вариант; как только картинка
 * загрузилась, настоящие пропорции подставляются и ряд пересобирается.
 */
function useResolvedSizes(photos: Shot[]): Shot[] {
  const [known, setKnown] = useState<Record<string, { w: number; h: number }>>(
    {},
  );

  useEffect(() => {
    let alive = true;
    for (const p of photos) {
      if (p.w && p.h) continue;
      if (known[p.src]) continue;
      const img = new Image();
      img.onload = () => {
        if (!alive) return;
        setKnown((k) => ({
          ...k,
          [p.src]: { w: img.naturalWidth, h: img.naturalHeight },
        }));
      };
      img.src = p.src;
    }
    return () => {
      alive = false;
    };
  }, [photos, known]);

  return photos.map((p) =>
    p.w && p.h ? p : { ...p, ...(known[p.src] ?? { w: 3, h: 2 }) },
  );
}

/** Одна кликабельная фотография. Размер задаётся снаружи через flex —
    и в ряду, и внутри колонки. */
function Cell({
  shot,
  index,
  onOpen,
  style,
  more,
}: {
  shot: Shot;
  index: number;
  onOpen: (i: number) => void;
  style: React.CSSProperties;
  /** Сколько кадров спрятано. Больше нуля — на плитке плашка «+N». */
  more: number;
}) {
  return (
    <button
      type="button"
      /* С плашкой открываем ПЕРВЫЙ СПРЯТАННЫЙ кадр, а не свой: этот и так
         уже на виду, а человек нажимает на «+N» именно чтобы увидеть
         остальные. */
      onClick={() => onOpen(more > 0 ? index + 1 : index)}
      aria-label={
        more > 0
          ? `Показать ещё ${more} ${more === 1 ? "фотографию" : "фотографий"}`
          : `Открыть фотографию ${index + 1}`
      }
      style={style}
      className="relative block min-h-0 min-w-0 cursor-pointer overflow-hidden bg-[#F0E8F4] p-0"
    >
      <img
        src={shot.src}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />

      {more > 0 && (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-[#2D2433]/55 text-4xl font-bold text-white backdrop-blur-[2px] transition-colors duration-300 hover:bg-[#2D2433]/45"
        >
          +{more}
        </span>
      )}
    </button>
  );
}

export function Collage({
  photos,
  onOpen,
}: {
  photos: Shot[];
  onOpen: (i: number) => void;
}) {
  const shots = useResolvedSizes(photos);
  // Без кадров строить нечего, а chooseRow на пустом массиве обращался к
  // photos[0] и падал — с ним падала вся страница. Вызывающий код (лента,
  // предпросмотр админки) такие посты и так отсеивает, это второй рубеж.
  if (shots.length === 0) return null;

  const { row, shown, span } = chooseRow(shots);
  const hidden = shots.length - shown;
  let seen = 0;

  return (
    /* ВЫСОТА ОГРАНИЧЕНА ЭКРАНОМ, а не только пропорциями: считаем не
       «какая высота выйдет из ширины», а «какая ширина нужна, чтобы высота
       не превысила потолок». Всё решается на CSS, без замеров окна в JS —
       раскладка не мигает при загрузке и переживает поворот телефона. */
    <div
      /* Без mx-auto: ширина коллажа у каждого поста своя (372-800px), и
         при центрировании левый край ленты гулял бы от поста к посту.
         --collage-w — потолок по ширине, приходит снаружи. */
      className="flex w-[min(var(--collage-w,100%),calc(var(--collage-h)*var(--collage-span)))] shrink-0 flex-col overflow-hidden rounded-[1.5rem] [--collage-h:70vh] md:[--collage-h:62vh]"
      style={
        { "--collage-span": span.toFixed(4), gap: GAP } as React.CSSProperties
      }
    >
      {/* Пропорции ряда задаём явно: тогда его высота однозначно следует из
          ширины, а колонки внутри тянутся на всю высоту. Без этого была бы
          круговая зависимость — высота от содержимого, содержимое от высоты. */}
      <div className="flex w-full" style={{ aspectRatio: span, gap: GAP }}>
        {row.map((item, ii) => {
          const grow = itemRatio(item) / span;
          const lastCol = ii === row.length - 1;

          // ОДИНОЧНЫЙ КАДР
          if (item.length === 1) {
            const i = seen++;
            return (
              <Cell
                key={item[0].src + i}
                shot={item[0]}
                index={i}
                onOpen={onOpen}
                more={lastCol ? hidden : 0}
                style={{ flexGrow: grow, flexBasis: 0 }}
              />
            );
          }

          // КОЛОНКА: кадры друг под другом.
          // Доли высоты пропорциональны 1/пропорция — тогда у всех кадров
          // колонки ширина одна, а высота своя, по кадру.
          const inv = item.map((p) => 1 / ratio(p));
          const invSum = inv.reduce((a, b) => a + b, 0);
          return (
            <div
              key={ii}
              className="flex flex-col"
              style={{ flexGrow: grow, flexBasis: 0, gap: GAP }}
            >
              {item.map((p, k) => {
                const i = seen++;
                return (
                  <Cell
                    key={p.src + i}
                    shot={p}
                    index={i}
                    onOpen={onOpen}
                    /* Плашка — на самой последней плитке коллажа, то есть
                       в правом нижнем углу. */
                    more={lastCol && k === item.length - 1 ? hidden : 0}
                    style={{ flexGrow: inv[k] / invSum, flexBasis: 0 }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
