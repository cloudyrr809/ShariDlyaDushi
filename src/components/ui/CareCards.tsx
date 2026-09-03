import { useEffect, useRef, useState } from "react";

import { careCards } from "../../constants";

/* ═════════════════════ ПАМЯТКА ПО ОБРАЩЕНИЮ С ШАРАМИ ═════════════════════

   Шесть правил в асимметричной сетке (bento): карточки разной ширины, а не
   шесть одинаковых квадратов. Разный размер здесь работает как иерархия —
   что крупнее, то важнее, — и заодно снимает монотонность, которой сетка
   2×3 страдала по построению.

   Раскладка на широком экране, три колонки:
     ряд 1   «Держите за ленту» на две колонки + «Убирайте от питомцев»
     ряд 2   три карточки по колонке
     ряд 3   «Не отпускайте в небо» во всю ширину, на своей подложке

   Сами колонки чуть неровные (1.035 / 0.965 / 1 доли), так что и внутри
   ряда карточки на пару десятков пикселей разной ширины. Ровно настолько,
   чтобы ряд не выглядел отмеренным по линейке.

   ВНУТРИ карточки раскладка горизонтальная: значок слева, правило
   справа. Картинка во всю ширину съедала полторы сотни пикселей высоты и
   отодвигала текст, ради которого карточка и стоит; в компактном виде
   вся памятка помещается в один экран.

   Ширина задана в самих данных (span), а не таблицей по номеру карточки:
   порядок в памятке ещё поменяется, а привязка к индексу такое переживает
   молча и неверно.
   ───────────────────────────────────────────────────────────────────────── */

// Карточки выходят РЯДАМИ: сначала верхний ряд целиком, потом следующий.
const REVEAL_MS = 720; // длительность появления карточки
const ROW_MS = 280; // пауза между рядами, если оба вышли на экран разом
const LAYER_MS = 90; // сдвиг между слоями внутри карточки
const EASE = "cubic-bezier(0.33, 0, 0.2, 1)"; // плавный старт и плавное торможение

/* Плитка под картинкой — квадрат 72×72 у всех карточек без исключения.
   Иллюстрация в ней работает как значок при тексте, а не как картина: за
   этим карточки и стали компактными.

   Картинка ВПИСЫВАЕТСЯ в габарит с сохранением пропорций и ничем не
   обрезается — между габаритом и кромкой плитки всегда остаётся воздух.

   Считаем от ВИДИМОГО содержимого, а не от кадра файла. У PNG вокруг шара
   свои прозрачные поля — от 61% кадра до 93%, — и «вписать по файлу»
   означало бы, что один значок занимает плитку целиком, а соседний
   болтается в ней вдвое мельче. Ровно ту разнокалиберность плитка и
   призвана убрать. */
const TILE = 72;
const SOLO = { h: 54, w: 58 };
// Пара умещается в ту же плитку: две картинки по ширине, с наклоном ±7°
const PAIR = { h: 46, w: 27 };

/* Пастельные подложки по кругу — три оттенка, чтобы шесть плиток подряд не
   читались как одна повторённая. */
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
};

/** Картинка, обрезанная по своему содержимому: прозрачные поля уходят за
    край обёртки, а сама обёртка и есть видимый шар. */
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

  /* Отслеживание ширины экрана убрано: плитка со значком теперь одна на
     все карточки (72×72), и подбирать габарит под брейкпоинт больше
     незачем — разницу между карточками делает сетка, а не размер
     картинки. */

  /* ПОЯВЛЕНИЕ ПО РЯДАМ.

     Наблюдаем каждую карточку отдельно, но задержку назначаем не ей, а её
     РЯДУ. Ряд определяем по фактической геометрии — offsetTop, — а не по
     номеру карточки: в bento-сетке ряды разной длины, и «каждые три
     подряд» означало бы совсем не то, что видит глаз. */
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
      {/* ЦВЕТНЫЕ ПЯТНА ПОД КАРТОЧКАМИ. Без них стекло не работает:
          полупрозрачный белый поверх ровной заливки — это просто белый. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-[420px] w-[420px] rounded-full bg-[#D9A7C0]/25 blur-[110px]" />
        <div className="absolute top-1/3 -right-24 h-[460px] w-[460px] rounded-full bg-[#6B4E81]/16 blur-[130px]" />
        <div className="absolute -bottom-28 left-1/4 h-[400px] w-[400px] rounded-full bg-[#C9A6E0]/22 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[76rem]">
        <p className="font-miana pb-[0.5em] text-center text-2xl leading-none text-[#C46B8A] md:text-3xl">
          бережно
        </p>

        <h2 className="text-center text-[1.9rem] leading-[1.15] font-semibold tracking-[-0.01em] text-[#2D2433] md:text-[2.6rem] md:leading-[1.12]">
          Памятка по обращению с шарами
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed font-medium text-[#5A4D66] md:text-[17px]">
          Несколько простых правил — и шарики будут летать очень долго!
        </p>

        {/* ЛЕНТА ВБОК НА ТЕЛЕФОНЕ, BENTO-СЕТКА НА ДЕСКТОПЕ.
            Шесть карточек в столбик — это два экрана прокрутки ради
            памятки, мимо которой пролистывают.

            Колонки НЕРОВНЫЕ: 1.035 / 0.965 / 1 доли вместо трёх равных.
            Разница едва заметна — десяток пикселей, — но её хватает,
            чтобы ряд перестал выглядеть отмеренным по линейке. Дроби
            подобраны так, чтобы в сумме остаться ровно тремя долями:
            широкие карточки на две и три колонки от этого не смещаются.

            grid-cols-3 здесь НЕТ намеренно. Обе записи задают одно и то же
            свойство grid-template-columns, и в собранном файле короткая
            утилита оказывалась ниже — три ровные колонки просто затирали
            неровные. Шаблон объявлен один раз и целиком. */}
        <div className="scrollbar-hide -mx-6 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pt-2 pb-8 md:mx-0 md:mt-14 md:grid md:gap-5 md:overflow-visible md:px-0 md:pb-2 md:[grid-template-columns:1.035fr_0.965fr_1fr]">
          {careCards.map((card, idx) => {
            const pair = card.images.length > 1;
            const box = pair ? PAIR : SOLO;
            // Карточка во всю ширину: заголовку и тексту тесно в одну
            // колонку рядом со значком — там их хватает на строку каждому,
            // и вместе они разводятся в ряд.
            const banner = card.span === 3;

            return (
              /* Внешняя обёртка держит ПОЯВЛЕНИЕ и место в сетке, внутренняя —
                 наведение. Разделено намеренно: появление пишет transform
                 инлайном, а инлайновый стиль сильнее классов — подъём при
                 наведении на той же ноде просто не сработал бы. */
              <div
                key={card.title}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                data-card={idx}
                /* Шире, чем было: значок съедает 72px + отступ, и в прежних
                     78% на текст оставалась колонка в двадцать знаков —
                     заголовок ломался пополам, описание шло лесенкой в
                     пять строк. Край следующей карточки всё равно
                     выглядывает и показывает, что тут листают. */
                className={`w-[86%] shrink-0 snap-center sm:w-[56%] md:w-auto ${
                  card.span === 3
                    ? "md:col-span-3"
                    : card.span === 2
                      ? "md:col-span-2"
                      : ""
                }`}
                style={{
                  opacity: isShown(idx) ? 1 : 0,
                  transform: isShown(idx)
                    ? "none"
                    : "translateY(22px) scale(0.975)",
                  transition: `opacity ${REVEAL_MS}ms ${EASE}, transform ${REVEAL_MS}ms ${EASE}`,
                  transitionDelay: isShown(idx) ? `${delays[idx]}ms` : "0ms",
                }}
              >
                {/* МАТОВОЕ СТЕКЛО. У карточки со смысловым акцентом
                    подложка своя — сиреневая: выделяем не размером и не
                    рамкой, а тоном.

                    Раскладка теперь ГОРИЗОНТАЛЬНАЯ: значок слева, текст
                    справа. Карточка от этого стала вдвое ниже — картинка
                    во всю ширину съедала полторы сотни пикселей высоты и
                    отодвигала правило, ради которого карточка и стоит.
                    Внутреннее поле 16px вместо прежних 24-28. */}
                <article
                  className={`memo-card flex h-full items-start gap-4 rounded-[22px] border border-white/80 p-4 shadow-[0_10px_28px_-10px_rgba(100,60,140,0.10)] transition duration-500 ease-out md:p-5 md:backdrop-blur-md md:hover:-translate-y-1 md:hover:border-white md:hover:shadow-[0_20px_40px_-14px_rgba(100,60,140,0.20)] ${
                    card.accent
                      ? "bg-[#EFE4F8]/70 md:hover:bg-[#EFE4F8]/85"
                      : "bg-white/65 md:hover:bg-white/80"
                  }`}
                >
                  {/* ПЛИТКА СО ЗНАЧКОМ — то, что сводит разные иллюстрации
                      к одному виду: один размер, одна форма, мягкий
                      пастельный градиент.

                      shrink-0 обязателен: без него флекс ужимал бы квадрат
                      под длинный текст рядом, и плитки перестали бы быть
                      одинаковыми — то есть ровно то, ради чего они есть. */}
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-2xl ${PLINTHS[idx % PLINTHS.length]}`}
                    style={{
                      width: TILE,
                      height: TILE,
                      ...layer(idx, LAYER_MS, "translateY(8px) scale(0.9)"),
                    }}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {card.images.map((img, i) => {
                        // Вписываем по той стороне, которая упирается первой
                        const byWidth = img.ar > box.w / box.h;
                        const w = byWidth ? box.w : box.h * img.ar;
                        const h = byWidth ? box.w / img.ar : box.h;

                        return (
                          <div
                            key={img.src}
                            /* без overflow-hidden: при повороте ±7° и при
                               подъёме на наведении клипирование срезало бы
                               шар по краям.
                               memo-figure — левитация, см. index.css. */
                            className="memo-figure relative"
                            style={{
                              width: w,
                              height: h,
                              transform: pair
                                ? `rotate(${i === 0 ? -7 : 7}deg)`
                                : undefined,
                            }}
                          >
                            <Cropped img={img} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ТЕКСТ. min-w-0 обязателен флекс-ребёнку с текстом: без
                      него длинное слово распирает колонку и выдавливает
                      значок из карточки. */}
                  <div
                    className={`flex min-w-0 flex-1 flex-col text-left ${
                      banner ? "md:flex-row md:items-baseline md:gap-6" : ""
                    }`}
                  >
                    <div className={banner ? "md:shrink-0" : ""}>
                      {/* Плашка стоит не у всех: у большинства карточек она
                          повторяла заголовок другими словами. Осталась там,
                          где ставит акцент, которого в заголовке нет.

                          В компактной карточке она встала В СТРОКУ с
                          заголовком, а не над ним: отдельной строкой она
                          съедала треть высоты карточки ради одного слова. */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                        <h3
                          className="text-base leading-snug font-semibold tracking-[-0.01em] text-[#2D2433]"
                          style={layer(idx, LAYER_MS * 2, "translateY(6px)")}
                        >
                          {card.title}
                        </h3>

                        {card.tag && (
                          <span
                            className={`inline-block shrink-0 rounded-full border px-2.5 py-0.5 text-[13px] font-bold tracking-[0.1em] uppercase ${
                              card.accent
                                ? "border-[#D9C2EA] bg-white/70 text-[#513A6B]"
                                : "border-[#EADFF2] bg-white/70 text-[#6B4E81]"
                            }`}
                            style={layer(idx, LAYER_MS * 3, "translateY(6px)")}
                          >
                            {card.tag}
                          </span>
                        )}
                      </div>
                    </div>

                    <p
                      className={`text-sm leading-[1.45] font-medium text-[#4A3A5C] ${
                        banner ? "mt-1.5 md:mt-0 md:flex-1" : "mt-1.5"
                      }`}
                      style={layer(idx, LAYER_MS * 4, "translateY(6px)")}
                    >
                      {card.description}
                    </p>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
