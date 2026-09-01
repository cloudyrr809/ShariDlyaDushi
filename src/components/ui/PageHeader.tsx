import { Fragment, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/* ══════════════════════ ШАПКИ СТРАНИЦ ══════════════════════

   На сайте два типа шапки, и это осознанно:

   • «РАБОЧАЯ» — Каталог, Услуги. Крошки, заголовок, подзаголовок и снимок
     справа на цветной подложке. У страницы, куда приходят выбирать и
     сравнивать, шапка должна быть короткой и сразу показывать, где ты.

   • «ОБЛОЖКА» — Акции, Лента, О нас. Рукописная надстрочка и огромный
     капс по центру, без крошек и без фото. У страницы, которую листают
     как журнал, шапка задаёт настроение.

   ЧТО У НИХ ОБЩЕЕ И ПОЧЕМУ ЭТО ЗДЕСЬ.

   Раньше шапки были написаны на каждой странице заново, и они разъехались:
   цвет заголовка был то #513A6B, то #2D2433; подзаголовок то 15px/400, то
   17px/500; отступ сверху то py-12, то pt-8. Разницы по смыслу за этим не
   стояло — просто страницы делались в разное время.

   Теперь общие решения лежат в одном месте и физически не могут
   разойтись, а варианты отличаются только тем, чем и должны: кеглем,
   трекингом и наличием крошек.  */

/** Заголовок страницы: цвет, вес и регистр — одни на весь сайт.

    Взят чернильный #2D2433, а не фиолетовый #513A6B: это основной цвет
    текста сайта, он одинаково держится и на 48px, и на 112px, и не спорит
    с розовой рукописной надстрочкой — фиолетовый на крупном кегле начинал
    с ней конкурировать за внимание. */
const H1 = "font-extrabold text-[#2D2433] uppercase";

/** Отступ от шапки сайта до первого элемента — общий для обоих типов. */
const TOP = "pt-8 md:pt-12";

/** Подзаголовок под заголовком — тоже общий.
    font-medium, а не font-normal: тонкий текст на сайте под запретом. */
const LEAD =
  "text-base leading-relaxed font-medium text-[#5A4D66] md:text-[17px]";

/** Общий контейнер контента: тот же, что у шапки сайта и у секций страниц,
    поэтому левый край везде совпадает пиксель в пиксель. */
const BOX = "mx-auto w-full max-w-[79rem] px-6";

/**
 * ОПТИЧЕСКОЕ ЦЕНТРИРОВАНИЕ РУКОПИСНОЙ НАДСТРОЧКИ.
 *
 * text-center ставит по центру ПРЯМОУГОЛЬНИК строки, а глаз считает
 * центром середину видимых чернил. У обычного шрифта это одно и то же, у
 * рукописного — нет: росчерки вылезают за начало и конец строки на разную
 * длину.
 *
 * Замерено на «О нас»: у слова «знакомьтесь» росчерк буквы «з» уходит на
 * 28px левее начала строки, тогда как справа запас всего 8px. Чернила
 * оказываются на 10px левее середины — и надпись читается сдвинутой влево.
 * Для сравнения, у «выгодно и приятно» перекос 1px, там всё ровно.
 *
 * Поэтому меряем сами: canvas умеет отдать настоящие границы чернил
 * (actualBoundingBox) для любой строки любым шрифтом. Сдвиг храним в em,
 * а не в пикселях, — тогда он сам масштабируется вместе с кеглем на
 * мобильном, и пересчитывать при смене размера окна не нужно.
 *
 * Замер откладываем до загрузки шрифта: до неё браузер считает метрики
 * запасного шрифта, и поправка вышла бы не та.
 */
function useOpticalCenter(text: string) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [shiftEm, setShiftEm] = useState(0);

  useEffect(() => {
    let alive = true;

    const measure = () => {
      const el = ref.current;
      if (!alive || !el) return;
      const cs = getComputedStyle(el);
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;

      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = ctx.measureText(text);
      const size = parseFloat(cs.fontSize);
      if (!m.width || !size) return;

      const inkCenter =
        (-m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 2;
      const shift = (m.width / 2 - inkCenter) / size;

      // Меньше сотой em глазу не видно — не трогаем разметку зря
      setShiftEm(Math.abs(shift) < 0.01 ? 0 : shift);
    };

    document.fonts?.ready.then(measure).catch(() => measure());
    return () => {
      alive = false;
    };
  }, [text]);

  return { ref, shiftEm };
}

export type Crumb = {
  label: string;
  /** Без ссылки — это текущая страница, последняя крошка. */
  to?: string;
};

/**
 * ШАПКА ТИПА «РАБОЧАЯ» — для разделов, куда приходят выбирать: Каталог,
 * Услуги.
 */
export function WorkHeader({
  crumbs,
  title,
  lead,
  photo,
}: {
  crumbs: Crumb[];
  title: string;
  lead: string;
  photo: { src: string; alt: string; /** object-position, если нужен */ position?: string };
}) {
  return (
    <section
      className={`relative overflow-hidden bg-gradient-to-r from-purple-50 to-slate-50 ${TOP} pb-12 md:pb-16`}
    >
      {/* Фоновое свечение */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-10 z-0 h-72 w-72 rounded-full bg-pink-200/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/4 z-0 h-72 w-72 rounded-full bg-purple-200/50 blur-3xl"
      />

      <div className={`relative z-10 ${BOX}`}>
        {/* items-start, а не items-center. При центрировании текстовая
            колонка выравнивалась относительно фото (256px), и её верх
            зависел от длины подзаголовка: в Каталоге он в две строки, в
            Услугах в три, поэтому крошки стояли на 175px против 162px —
            при переходе между вкладками надписи прыгали на 13px. */}
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
          {/* ЛЕВАЯ КОЛОНКА — текст */}
          <div>
            {/* Крошки: пройденный путь приглушён, текущий раздел выделен
                цветом и полужирным. «Главная» намеренно НЕ настолько
                бледная, как text-gray-400: это рабочая ссылка, а на розовом
                фоне gray-400 даёт около 2.5 при норме 4.5. Разделитель
                декоративный (aria-hidden), к нему требования по контрасту
                не применяются, поэтому он светлее всех. */}
            <nav aria-label="Хлебные крошки">
              <ol className="flex items-center gap-2 text-sm">
                {crumbs.map((c, i) => (
                  <Fragment key={c.label}>
                    {i > 0 && (
                      <li aria-hidden="true" className="text-[#C9B4D6]">
                        /
                      </li>
                    )}
                    <li>
                      {c.to ? (
                        <Link
                          to={c.to}
                          className="text-[#756583] transition-colors hover:text-[#513A6B]"
                        >
                          {c.label}
                        </Link>
                      ) : (
                        <span
                          aria-current="page"
                          className="font-medium text-[#513A6B]"
                        >
                          {c.label}
                        </span>
                      )}
                    </li>
                  </Fragment>
                ))}
              </ol>
            </nav>

            <h1
              className={`mt-5 text-5xl tracking-[-0.02em] md:mt-6 md:text-6xl ${H1}`}
            >
              {title}
            </h1>

            <p className={`mt-5 max-w-2xl md:mt-6 ${LEAD}`}>{lead}</p>
          </div>

          {/* ПРАВАЯ КОЛОНКА — снимок. Скругление и обрезка на обёртке,
              увеличение на картинке: иначе при наведении она вылезла бы за
              скруглённый угол прямоугольником. */}
          <div className="group h-48 w-full overflow-hidden rounded-3xl shadow-sm md:h-64">
            <img
              src={photo.src}
              alt={photo.alt}
              // Не lazy: картинка на первом экране и она здесь самая крупная
              fetchPriority="high"
              decoding="async"
              className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${photo.position ?? ""}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * ШАПКА ТИПА «ОБЛОЖКА» — для разделов, которые листают: Акции, Лента,
 * О нас.
 *
 * Фон под ней страница ставит сама (SkyBackdrop на Акциях и Ленте, пятна
 * на «О нас»): шапка — только типографика, и это позволяет ей лечь на
 * любую подложку.
 */
export function CoverHeader({
  eyebrow,
  title,
  lead,
}: {
  /** Рукописная надстрочка */
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  const optical = useOpticalCenter(eyebrow);

  return (
    <header className={`relative z-10 ${BOX} ${TOP} pb-14 text-center md:pb-16`}>
      {/* pb-[0.5em] — место под росчерк рукописного шрифта: у «д» и «у» он
          уходит на 0.867em ниже базовой линии, тогда как метрический
          descent у шрифта всего 0.2em, и при leading-none хвост лёг бы на
          заголовок.

          Цвет #A64D6C, а не #C46B8A: на Акциях и Ленте надстрочка лежит
          поверх фотофона, где светлый розовый давал 2.5:1 при норме 3.0.
          Один цвет на все обложки — чтобы не держать в голове, где какой.

          translateX — поправка на росчерки, см. useOpticalCenter выше. */}
      <p
        ref={optical.ref}
        className="font-miana pb-[0.5em] text-3xl leading-none text-[#A64D6C] md:text-5xl"
        style={
          optical.shiftEm
            ? { transform: `translateX(${optical.shiftEm.toFixed(3)}em)` }
            : undefined
        }
      >
        {eyebrow}
      </p>

      <h1
        className={`text-[3.5rem] leading-[0.85] tracking-[-0.04em] md:text-[7rem] ${H1}`}
      >
        {title}
      </h1>

      {lead && <p className={`mx-auto mt-8 max-w-xl ${LEAD}`}>{lead}</p>}
    </header>
  );
}
