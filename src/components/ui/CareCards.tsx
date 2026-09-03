import { useEffect, useRef, useState } from "react";

import { careCards } from "../../constants";

/* ═════════════════════ ПАМЯТКА ПО ОБРАЩЕНИЮ С ШАРАМИ ═════════════════════

   Шесть правил. Раньше это были шесть одинаковых белых плашек с серой
   рамкой в ровной сетке 2×3 — набор, который читается как заготовка, а не
   как часть этого сайта. Теперь:

   • карточка — матовое стекло: полупрозрачный белый поверх цветных пятен,
     тонкий светлый контур вместо серой рамки, мягкая рассеянная тень;
   • картинка стоит на общей пастельной подложке. Иллюстрации разного
     происхождения и разных пропорций — подложка одного размера и формы
     сводит их к одному ритму, чего не давала «просто картинка на белом»;
   • над заголовком плашка-категория одним словом: по ней глаз находит
     нужное правило, не вчитываясь в текст всех шести карточек;
   • на телефоне карточки едут вбок лентой с прилипанием, а не вытягиваются
     в столбик на два экрана вниз.

   ЧТО СПЕЦИАЛЬНО НЕ ДЕЛАЕМ. Размытие подложки (backdrop-filter) включено
   только с md. Стекло имеет смысл там, где под ним есть что размывать, —
   а на телефоне это чистая трата: пятна за карточками мелкие, разницы не
   видно, зато шесть слоёв размытия платятся каждым кадром прокрутки.
   Именно на такой перерасход эта секция уже жаловалась однажды.
   ───────────────────────────────────────────────────────────────────────── */

// Карточки выходят РЯДАМИ: сначала целиком верхний ряд, потом нижний.
// Внутри карточки слои (подложка с картинкой, плашка, заголовок, текст)
// догоняют её с небольшим запозданием — это и даёт ощущение глубины.
const REVEAL_MS = 720; // длительность появления карточки
const ROW_MS = 280; // пауза между рядами, если оба вышли на экран разом
const LAYER_MS = 90; // сдвиг между слоями внутри карточки
const EASE = "cubic-bezier(0.33, 0, 0.2, 1)"; // плавный старт и плавное торможение

/** Высота общей подложки под картинкой. Одна на все карточки: заголовки
    встают на одну линию, какой бы ни была иллюстрация. */
const PLINTH_H = 168;

/* Габариты, в которые вписывается САМА картинка внутри подложки. Считаем
   от видимого содержимого, а не от кадра файла: у PNG вокруг шара свои
   прозрачные поля, и по файлу широкая машина и узкий шарик выходили бы
   несоразмерными.

   Пара стоит мельче: две картинки должны уместиться по ширине даже в
   карточке ленты на телефоне, да ещё с наклоном ±7°. */
const SOLO = { h: 128, w: 210 };
const PAIR = { h: 106, w: 92 };

/* Пастельные подложки по кругу. Три оттенка, а не один: шесть одинаковых
   плиток подряд — ровно та монотонность, из-за которой блок и переделан.
   Все три из палитры сайта, разница между ними мягкая — это ритм, а не
   раскраска. */
const PLINTHS = [
  "bg-gradient-to-br from-[#F1E7F8] to-[#FBF3F7]",
  "bg-gradient-to-br from-[#FBEFF5] to-[#F3ECFA]",
  "bg-gradient-to-br from-[#ECE4F7] to-[#FAF4FB]",
];

type Img = {
  src: string;
  fx: number;
  fy: number;
  fw: number;
  fh: number;
  ar: number;
  /** "top" — связка шаров, нарисованная свисающей сверху (см. ниже). */
  bleed?: "top" | "bottom";
  headFrac?: number;
};

/** Картинка, обрезанная по своему содержимому: прозрачные поля уходят за край. */
const Cropped = ({ img }: { img: Img }) => (
  <img
    src={img.src}
    alt=""
    aria-hidden="true"
    loading="lazy"
    className="absolute max-w-none select-none"
    style={{
      width: `${100 / img.fw}%`,
      height: `${100 / img.fh}%`,
      left: `${(-img.fx / img.fw) * 100}%`,
      top: `${(-img.fy / img.fh) * 100}%`,
    }}
  />
);

export const CareCards = () => {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  /* ПОЯВЛЕНИЕ ПО РЯДАМ.

     Наблюдаем каждую карточку отдельно, но задержку назначаем не ей, а её
     РЯДУ. Ряд определяем по фактической геометрии — offsetTop внутри
     сетки, — а не по номеру карточки: колонок бывает три (md), две (sm)
     или одна лента вбок (телефон), и «каждые три подряд» на узком экране
     означало бы совсем не то, что видит глаз.

     Значение в словаре — задержка карточки. Ключ есть = карточка
     показана. */
  const [delays, setDelays] = useState<Record<number, number>>({});
  const isShown = (i: number) => i in delays;

  useEffect(() => {
    const all = careCards.map((_, i) => i);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDelays(Object.fromEntries(all.map((i) => [i, 0])));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .map((e) => {
            const el = e.target as HTMLElement;
            // Округляем до 8px: карточки одного ряда стоят на одной линии,
            // но дробные значения после масштабирования страницы могут
            // разойтись на пиксель-другой.
            return {
              i: Number(el.dataset.card),
              row: Math.round(el.offsetTop / 8),
            };
          });
        if (!hit.length) return;

        // Ряды, попавшие в эту пачку, по порядку сверху вниз
        const rows = [...new Set(hit.map((h) => h.row))].sort((a, b) => a - b);

        setDelays((prev) => {
          const next = { ...prev };
          hit.forEach(({ i, row }) => {
            if (!(i in next)) next[i] = rows.indexOf(row) * ROW_MS;
          });
          return next;
        });

        // Показанную карточку больше не наблюдаем: эффект одноразовый
        hit.forEach(({ i }) => {
          const el = cardRefs.current[i];
          if (el) io.unobserve(el);
        });
      },
      { threshold: 0.15 },
    );

    cardRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  // общий помощник: плавный выход слоя с собственной задержкой
  const layer = (idx: number, step: number, hidden: string) => ({
    opacity: isShown(idx) ? 1 : 0,
    transform: isShown(idx) ? "none" : hidden,
    transition: `opacity ${REVEAL_MS}ms ${EASE}, transform ${REVEAL_MS}ms ${EASE}`,
    transitionDelay: isShown(idx) ? `${delays[idx] + step}ms` : "0ms",
  });

  return (
    <section className="relative overflow-hidden bg-[#F8F4F9] px-6 py-20 md:py-24">
      {/* ЦВЕТНЫЕ ПЯТНА ПОД КАРТОЧКАМИ.
          Без них стекло не работает: полупрозрачный белый поверх ровной
          заливки — это просто белый. Пятна дают то, что просвечивает и
          размывается, и заодно убирают стерильность фона. Декор: из
          озвучки убран, курсор не ловит, обрезается краем секции. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-[420px] w-[420px] rounded-full bg-[#D9A7C0]/25 blur-[110px]" />
        <div className="absolute top-1/3 -right-24 h-[460px] w-[460px] rounded-full bg-[#6B4E81]/16 blur-[130px]" />
        <div className="absolute -bottom-28 left-1/4 h-[400px] w-[400px] rounded-full bg-[#C9A6E0]/22 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[76rem]">
        {/* Рукописная надстрочка — та же пара «подпись + спокойный
            заголовок», что на Услугах, Акциях и «О нас». Раньше эта секция
            была единственной, где заголовок начинался с пустого места. */}
        <p className="font-miana pb-[0.5em] text-center text-2xl leading-none text-[#C46B8A] md:text-3xl">
          бережно
        </p>

        <h2 className="text-center text-[1.9rem] leading-[1.15] font-semibold tracking-[-0.01em] text-[#2D2433] md:text-[2.6rem] md:leading-[1.12]">
          Памятка по обращению с шарами
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed font-medium text-[#5A4D66] md:text-[17px]">
          Несколько простых правил — и шарики будут летать очень долго!
        </p>

        {/* ЛЕНТА ВБОК НА ТЕЛЕФОНЕ, СЕТКА НА ДЕСКТОПЕ.

            Шесть карточек в столбик — это два экрана прокрутки ради
            памятки, мимо которой пролистывают. Лентой с прилипанием видно,
            что правил несколько и их листают; выглядывающий край
            следующей карточки говорит об этом без единой подписи.

            -mx-6 px-6 — лента доезжает до самых краёв экрана, но первая и
            последняя карточка не липнут к кромке. Вертикальные отступы —
            место под тень и подъём при наведении: overflow-x режет и по
            вертикали тоже. */}
        <div className="scrollbar-hide -mx-6 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pt-2 pb-8 md:mx-0 md:mt-14 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-2">
          {careCards.map((card, idx) => {
            const box = card.images.length > 1 ? PAIR : SOLO;

            /* «Бережное обращение» нарисовано СВИСАЮЩИМ: на картинке только
               низ связки, будто сама связка осталась выше кадра. Поставленная
               по центру подложки, она читается не как шары, а как розовое
               пятно неясного происхождения.

               Поэтому она одна крепится к верхней кромке подложки, а
               подложка её подрезает. Единство при этом не страдает: форма,
               размер и оттенок подложки те же, что у остальных пяти — иначе
               ложится только сам рисунок, ровно так, как задуман. */
            const hanging = card.images.find((i) => i.bleed === "top");

            return (
              /* Внешняя обёртка держит ПОЯВЛЕНИЕ, внутренняя — наведение.
                 Разделено намеренно: появление пишет transform инлайном, а
                 инлайновый стиль сильнее классов — подъём при наведении на
                 той же ноде просто не сработал бы. */
              <div
                key={card.title}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                data-card={idx}
                className="w-[78%] shrink-0 snap-center sm:w-[52%] md:w-auto"
                style={{
                  opacity: isShown(idx) ? 1 : 0,
                  transform: isShown(idx)
                    ? "none"
                    : "translateY(22px) scale(0.975)",
                  transition: `opacity ${REVEAL_MS}ms ${EASE}, transform ${REVEAL_MS}ms ${EASE}`,
                  transitionDelay: isShown(idx) ? `${delays[idx]}ms` : "0ms",
                }}
              >
                {/* МАТОВОЕ СТЕКЛО.
                    Контур белый и полупрозрачный, а не серый: серая рамка
                    в 1px обводила каждую карточку жирной линией и делала из
                    шести карточек шесть коробок. Белый контур читается как
                    блик на стекле — он очерчивает форму, но не спорит с
                    содержимым. */}
                {/* transition без списка свойств — намеренно. Tailwind v4
                    пишет -translate-y не в transform, а в отдельное
                    свойство translate, и перечисленный вручную список
                    (transform, box-shadow, …) подъём не покрывал: тень
                    наплывала плавно, а карточка прыгала мгновенно. У
                    общей transition в v4 translate в списке есть. */}
                <article className="memo-card flex h-full flex-col items-center rounded-[26px] border border-white/80 bg-white/65 p-6 text-center shadow-[0_12px_32px_-8px_rgba(100,60,140,0.10)] transition duration-500 ease-out md:p-7 md:backdrop-blur-md md:hover:-translate-y-1.5 md:hover:border-white md:hover:bg-white/80 md:hover:shadow-[0_24px_48px_-12px_rgba(100,60,140,0.20)]">
                  {/* ПОДЛОЖКА ПОД КАРТИНКОЙ — то, что сводит разные
                      иллюстрации к одному виду. Одна высота, одна форма,
                      мягкий пастельный градиент; чем именно нарисован шар
                      внутри, перестаёт бросаться в глаза. */}
                  <div
                    className={`relative flex w-full items-center justify-center overflow-hidden rounded-[20px] ${PLINTHS[idx % PLINTHS.length]}`}
                    style={{
                      height: PLINTH_H,
                      ...layer(idx, LAYER_MS, "translateY(10px) scale(0.94)"),
                    }}
                  >
                    {hanging ? (
                      <div
                        className="memo-figure memo-figure--hang absolute inset-x-0 top-0"
                        style={{ aspectRatio: `${hanging.ar}` }}
                      >
                        <Cropped img={hanging} />
                      </div>
                    ) : (
                    <div className="flex items-center justify-center gap-3">
                      {card.images.map((img, i) => {
                        const byWidth = img.ar > box.w / box.h;
                        const w = byWidth ? box.w : box.h * img.ar;
                        const h = byWidth ? box.w / img.ar : box.h;

                        return (
                          <div
                            key={img.src}
                            /* без overflow-hidden: при повороте ±7° и при
                               подъёме на наведении клипирование срезало бы
                               шар по краям. Прозрачные поля PNG всё равно
                               невидимы.
                               memo-figure — левитация, см. index.css. */
                            className="memo-figure relative"
                            style={{
                              width: w,
                              height: h,
                              transform:
                                card.images.length > 1
                                  ? `rotate(${i === 0 ? -7 : 7}deg)`
                                  : undefined,
                            }}
                          >
                            <Cropped img={img} />
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </div>

                  {/* ПЛАШКА-КАТЕГОРИЯ. Одно слово капсом вразрядку — по нему
                      находят нужное правило, не вчитываясь в текст. */}
                  <span
                    className="mt-6 inline-block rounded-full border border-[#EADFF2] bg-white/70 px-3.5 py-1 text-[13px] font-bold tracking-[0.12em] text-[#6B4E81] uppercase"
                    style={layer(idx, LAYER_MS * 2, "translateY(8px)")}
                  >
                    {card.tag}
                  </span>

                  <h3
                    className="mt-3.5 text-[1.0625rem] leading-snug font-bold tracking-[-0.01em] text-[#2D2433] md:text-lg"
                    style={layer(idx, LAYER_MS * 3, "translateY(8px)")}
                  >
                    {card.title}
                  </h3>

                  {/* Текст плотнее и темнее прежнего: было 14px цветом
                      #5A4D66 — на просвечивающем стекле он читался вяло.
                      15px, межстрочный 1.6 и более глубокий тон из той же
                      фиолетовой гаммы. */}
                  <p
                    className="mt-2.5 text-[15px] leading-[1.6] font-medium text-[#4A3A5C]"
                    style={layer(idx, LAYER_MS * 4, "translateY(8px)")}
                  >
                    {card.description}
                  </p>
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
