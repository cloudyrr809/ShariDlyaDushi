import { useEffect, useRef, useState } from "react";

import { careCards } from "../../constants";

/* ═════════════════════ ПАМЯТКА ПО ОБРАЩЕНИЮ С ШАРАМИ ═════════════════════

   Пять правил в bento-сетке 4×2. Одна карточка занимает левую половину
   блока целиком (две колонки на два ряда) и показывает иллюстрацию
   крупно; четыре квадратные встают справа в два ряда по две.

     ┌───────────────┬───────┬───────┐
     │               │ питом.│ темп. │
     │  за ленту     ├───────┼───────┤
     │               │ салон │ небо  │
     └───────────────┴───────┴───────┘

   Правил стало пять, а не шесть: мороз и солнце были двумя карточками,
   хотя правило одно — шару вредят перепады температуры с любой стороны.
   Вместе они и читаются как одно правило, и сетка сходится без пустой
   ячейки.

   Секция занимает почти весь экран (min-height: 85vh) и центрирует своё
   содержимое по вертикали. Прежняя компактная версия ужалась настолько,
   что перестала читаться как раздел — шесть строчек мелким кеглем между
   двумя крупными блоками.

   Иллюстрации крупные: 240px в большой карточке, ~90px в квадратных.
   Подложек-плиток под ними больше нет — картинка лежит прямо на стекле
   карточки. Размер при этом всё равно считается от ВИДИМОГО содержимого
   (см. ниже), поэтому разнокалиберности, ради которой плитки и заводили,
   не возникает.
   ───────────────────────────────────────────────────────────────────────── */

// Карточки выходят РЯДАМИ: сначала верхний ряд целиком, потом следующий.
const REVEAL_MS = 720; // длительность появления карточки
const ROW_MS = 280; // пауза между рядами, если оба вышли на экран разом
const LAYER_MS = 90; // сдвиг между слоями внутри карточки
const EASE = "cubic-bezier(0.33, 0, 0.2, 1)"; // плавный старт и плавное торможение

/* Габариты, в которые вписывается ВИДИМОЕ содержимое картинки.

   Считаем именно от содержимого, а не от кадра файла. У PNG вокруг шара
   свои прозрачные поля — от 61% кадра до 93%, — и «вписать по файлу»
   означало бы, что одна иллюстрация занимает отведённое место целиком, а
   соседняя болтается в нём вдвое мельче.

   HERO — большая карточка на широком экране. 470×270 при пропорциях
   связки (1.8) даёт картинку 470×261. Ширина считана от ячейки: 598px
   минус поля 2×32 — 534px, в них связка помещается с запасом.
   HERO_SM — та же карточка в мобильной ленте. Там она всего 335px шириной
   (86% экрана), и десктопный габарит вылезал за её края: связка
   продолжалась поверх соседней карточки.
   SOLO / PAIR — квадратные карточки. Пара стоит мельче: две картинки
   должны уместиться по ширине с наклоном ±7°. */
const HERO = { h: 270, w: 470 };
const HERO_SM = { h: 180, w: 250 };
const SOLO = { h: 92, w: 104 };
const PAIR = { h: 84, w: 52 };

type Img = {
  src: string;
  fx: number;
  fy: number;
  fw: number;
  fh: number;
  ar: number;
};

type Card = (typeof careCards)[number];

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

/** Ряд картинок карточки, вписанных в отведённый габарит. */
const Art = ({ card, box }: { card: Card; box: typeof SOLO }) => (
  <div className="flex items-end justify-center gap-3">
    {card.images.map((img, i) => {
      // Вписываем по той стороне, которая упирается первой
      const byWidth = img.ar > box.w / box.h;
      const w = byWidth ? box.w : box.h * img.ar;
      const h = byWidth ? box.w / img.ar : box.h;

      return (
        <div
          key={img.src}
          /* без overflow-hidden: при повороте ±7° и при подъёме на
             наведении клипирование срезало бы шар по краям.
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
);

/** Плашка-категория. Стоит не у всех: у большинства карточек она
    повторяла бы заголовок другими словами. */
const Badge = ({ card }: { card: Card }) => {
  const tag = "tag" in card ? card.tag : undefined;
  if (!tag) return null;
  const accent = "accent" in card && card.accent;
  return (
    <span
      className={`inline-block shrink-0 rounded-full border px-3 py-1 text-[13px] font-bold tracking-[0.1em] uppercase ${
        accent
          ? "border-[#D6C4F0] bg-white/70 text-[#513A6B]"
          : "border-[#EADFF2] bg-white/70 text-[#6B4E81]"
      }`}
    >
      {tag}
    </span>
  );
};

/* Общий вид карточки: матовое стекло. Размытие подложки — только с md:
   стекло имеет смысл там, где под ним есть что размывать, а на телефоне
   пятна за карточками мелкие и разницы не видно, зато слои размытия
   платятся каждым кадром прокрутки. */
const CARD =
  "memo-card flex h-full flex-col rounded-3xl border border-white/90 " +
  "shadow-[0_16px_36px_-10px_rgba(120,80,160,0.10)] " +
  "transition duration-500 ease-out md:backdrop-blur-[16px] " +
  "md:hover:-translate-y-1.5 md:hover:border-white " +
  "md:hover:shadow-[0_28px_54px_-14px_rgba(120,80,160,0.22)]";

export const CareCards = () => {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  /* Габарит большой иллюстрации зависит от ширины экрана, а считается он в
     пикселях в JS — значит, брейкпоинт приходится знать здесь, а не
     отдавать классам.

     matchMedia, а не resize: событие приходит один раз на пересечении
     порога, а не на каждый пиксель перетаскивания окна. Тот же приём, что
     в карусели на «О нас». */
  const [roomy, setRoomy] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setRoomy(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /* ПОЯВЛЕНИЕ ПО РЯДАМ.

     Наблюдаем каждую карточку отдельно, но задержку назначаем не ей, а её
     РЯДУ. Ряд определяем по фактической геометрии — offsetTop, — а не по
     номеру карточки: в bento-сетке ряды разной длины, и «каждые столько-то
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
    /* min-h + justify-center: на широком экране блок занимает почти весь
       экран и стоит по центру, а не жмётся к верхнему краю. На телефоне
       высота обычная — 85vh там означало бы полтора экрана пустоты вокруг
       ленты карточек. */
    <section className="relative flex flex-col justify-center overflow-hidden bg-[#F8F4F9] px-6 py-12 md:min-h-[85vh] md:py-10">
      {/* ЦВЕТНЫЕ ПЯТНА ПОД КАРТОЧКАМИ. Без них стекло не работает:
          полупрозрачный белый поверх ровной заливки — это просто белый. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-[460px] w-[460px] rounded-full bg-[#D9A7C0]/28 blur-[110px]" />
        <div className="absolute top-1/4 -right-24 h-[520px] w-[520px] rounded-full bg-[#6B4E81]/18 blur-[130px]" />
        <div className="absolute -bottom-28 left-1/4 h-[440px] w-[440px] rounded-full bg-[#C9A6E0]/24 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[76rem]">
        <p className="font-miana pb-[0.5em] text-center text-2xl leading-none text-[#C46B8A] md:text-3xl">
          бережно
        </p>

        <h2 className="text-center text-[2rem] leading-[1.1] font-semibold tracking-[-0.015em] text-[#2D2433] md:text-[2.6rem]">
          Памятка по обращению с шарами
        </h2>

        <p className="mx-auto mt-2.5 max-w-xl text-center text-base leading-relaxed font-medium text-[#5A4D66] md:text-[17px]">
          Несколько простых правил — и шарики будут летать очень долго!
        </p>

        {/* ЛЕНТА ВБОК НА ТЕЛЕФОНЕ, BENTO-СЕТКА НА ДЕСКТОПЕ.

            grid-auto-rows: 1fr — оба ряда одной высоты. Без этого нижний
            ряд подстроился бы под свой текст, а большая карточка слева
            тянулась бы на два разных ряда и выглядела бы кривой.

            items-stretch (по умолчанию): карточка занимает свою ячейку
            целиком, поэтому все четыре квадратные равны по высоте, сколько
            бы строк ни было в описании. */}
        <div className="scrollbar-hide -mx-6 mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pt-2 pb-8 md:mx-0 md:grid md:grid-cols-4 md:[grid-auto-rows:1fr] md:overflow-visible md:px-0 md:pb-2">
          {careCards.map((card, idx) => {
            const hero = "hero" in card && card.hero;
            const accent = "accent" in card && card.accent;

            return (
              /* Внешняя обёртка держит ПОЯВЛЕНИЕ и место в сетке,
                 внутренняя — наведение. Разделено намеренно: появление
                 пишет transform инлайном, а инлайновый стиль сильнее
                 классов — подъём при наведении на той же ноде просто не
                 сработал бы. */
              <div
                key={card.title}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                data-card={idx}
                className={
                  hero
                    ? "w-[86%] shrink-0 snap-center sm:w-[60%] md:col-span-2 md:row-span-2 md:w-auto"
                    : "w-[70%] shrink-0 snap-center sm:w-[44%] md:w-auto"
                }
                style={{
                  opacity: isShown(idx) ? 1 : 0,
                  transform: isShown(idx)
                    ? "none"
                    : "translateY(20px) scale(0.98)",
                  transition: `opacity ${REVEAL_MS}ms ${EASE}, transform ${REVEAL_MS}ms ${EASE}`,
                  transitionDelay: isShown(idx) ? `${delays[idx]}ms` : "0ms",
                }}
              >
                {hero ? (
                  /* ── БОЛЬШАЯ КАРТОЧКА ──
                     Текст вверху, иллюстрация внизу и во всю ширину.
                     mt-auto прижимает её к нижней кромке: карточка тянется
                     на два ряда, и без этого связка висела бы посреди
                     пустоты. */
                  <article
                    className={`${CARD} bg-white/75 p-7 md:hover:bg-white/85 md:p-8`}
                  >
                    <h3
                      className="text-[1.35rem] leading-tight font-bold tracking-[-0.015em] text-[#2D2433] md:text-2xl"
                      style={layer(idx, LAYER_MS, "translateY(8px)")}
                    >
                      {card.title}
                    </h3>

                    <p
                      className="mt-3 max-w-md text-[15px] leading-[1.55] font-medium text-[#4A3A5C] md:text-base"
                      style={layer(idx, LAYER_MS * 2, "translateY(8px)")}
                    >
                      {card.description}
                    </p>

                    {/* flex-1 + items-center: иллюстрация занимает всё
                        свободное место под текстом и стоит В ЕГО ЦЕНТРЕ.
                        Прижатая к низу (mt-auto), она оставляла между собой
                        и текстом две сотни пикселей пустоты — карточка
                        тянется на два ряда, и запас там немаленький. */}
                    <div
                      className="mt-8 flex flex-1 items-center justify-center md:mt-6"
                      style={layer(
                        idx,
                        LAYER_MS * 3,
                        "translateY(14px) scale(0.94)",
                      )}
                    >
                      <Art card={card} box={roomy ? HERO : HERO_SM} />
                    </div>
                  </article>
                ) : (
                  /* ── КВАДРАТНАЯ КАРТОЧКА ──
                     Иллюстрация сверху, текст прижат к низу. justify-between
                     разводит их по краям карточки: в ячейке общей высоты
                     текст у всех четырёх встаёт на одну линию, сколько бы
                     места ни занимала картинка. */
                  <article
                    className={`${CARD} justify-between p-6 ${
                      accent
                        ? "bg-[#EEE6FF]/70 md:hover:bg-[#EEE6FF]/85"
                        : "bg-white/75 md:hover:bg-white/85"
                    }`}
                  >
                    <div
                      className="flex min-h-[84px] items-end"
                      style={layer(
                        idx,
                        LAYER_MS,
                        "translateY(10px) scale(0.92)",
                      )}
                    >
                      <Art
                        card={card}
                        box={card.images.length > 1 ? PAIR : SOLO}
                      />
                    </div>

                    <div className="mt-5">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
                        <h3
                          className="text-[17px] leading-tight font-bold tracking-[-0.01em] text-[#2D2433] md:text-lg"
                          style={layer(idx, LAYER_MS * 2, "translateY(8px)")}
                        >
                          {card.title}
                        </h3>
                        <Badge card={card} />
                      </div>

                      <p
                        className="mt-2 text-[13px] leading-[1.45] font-medium text-[#4A3A5C]"
                        style={layer(idx, LAYER_MS * 3, "translateY(8px)")}
                      >
                        {card.description}
                      </p>
                    </div>
                  </article>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
