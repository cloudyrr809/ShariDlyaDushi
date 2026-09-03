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

   В большой карточке связка врастает в нижнюю кромку во всю ширину. В
   квадратных значок сидит в одинаковом для всех квадрате 72×72, а
   плашка-категория вынесена абсолютом в правый верхний угол — она занимает
   пустоту рядом со значком и не двигает заголовок.

   Размер картинки считается от ВИДИМОГО содержимого, а не от кадра файла.
   У PNG вокруг шара свои прозрачные поля — от 20% кадра до 74%, — и
   «вписать по файлу» означало бы, что один значок занимает квадрат
   целиком, а соседний болтается в нём вдвое мельче.
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

   Габарит один на все квадратные карточки — 72×72, как и сам контейнер
   под значок. Раньше их было два (92×104 и 84×52), и картинки выходили
   разной величины при одинаковом блоке.

   Пара стоит мельче: две картинки должны уместиться по ширине того же
   квадрата, да ещё с наклоном ±7°.

   Большой карточке габарит в пикселях больше не нужен: связка идёт во всю
   её ширину, а высоту ей задают собственные пропорции. Из-за этого ушли и
   отдельные значения для телефона — там просто карточка у́же. */
const SOLO = { h: 72, w: 72 };
const PAIR = { h: 62, w: 33 };

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

/* Общий вид карточки: матовое стекло. Размытие подложки — только с md:
   стекло имеет смысл там, где под ним есть что размывать, а на телефоне
   пятна за карточками мелкие и разницы не видно, зато слои размытия
   платятся каждым кадром прокрутки. */
/* Тень КОРОТКАЯ, а контур настоящий. Прежняя тень уходила на 36px и на
   светлом фоне не читалась вовсе — только мылила края карточки. Тонкая
   линия в сайтовом #E8DEEE очерчивает форму честнее, а тень в 6px просто
   отрывает карточку от фона. */
const CARD =
  "memo-card flex h-full flex-col rounded-3xl border border-[#E8DEEE] " +
  "shadow-[0_2px_6px_rgba(45,36,51,0.05)] " +
  "transition duration-500 ease-out md:backdrop-blur-[16px] " +
  "md:hover:-translate-y-1.5 md:hover:border-[#D9C6E4] " +
  "md:hover:shadow-[0_10px_20px_rgba(45,36,51,0.10)]";

export const CareCards = () => {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

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

        {/* СЕТКА.

            Телефон — две колонки: большая карточка во всю ширину, четыре
            квадратные под ней по две в ряд. Прежняя лента вбок с
            прилипанием убрана вместе со snap-*, overflow-x и
            scrollbar-hide.

            Широкий экран — четыре колонки. grid-auto-rows: 1fr держит оба
            ряда одной высоты: без него нижний ряд подстроился бы под свой
            текст, а большая карточка тянулась бы на два разных ряда и
            выглядела бы кривой. На телефоне 1fr не нужен — там ряды
            естественной высоты, и большая карточка ничего не растягивает.

            items-stretch (умолчание грида): карточка занимает свою ячейку
            целиком, поэтому все четыре квадратные равны по высоте, сколько
            бы строк ни было в описании. */}
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5 md:[grid-auto-rows:1fr]">
          {careCards.map((card, idx) => {
            const hero = "hero" in card && card.hero;
            const accent = "accent" in card && card.accent;
            const tag = "tag" in card ? card.tag : undefined;

            /* ФОН ПРИВЯЗАН К СМЫСЛУ, а не назначен по вкусу. Раньше три
               карточки были белыми, а одна лиловой — читалось как
               случайность. Теперь тон говорит то же, что плашка: розовый у
               предупреждения, лиловый у экологии, белый там, где плашки
               нет. Оба оттенка уже есть в проекте (розовый — в этом файле,
               лиловый — на «Акциях»), новых не заводим. */
            const tone = accent
              ? "bg-[#EEE1F6]/80 md:hover:bg-[#EEE1F6]"
              : tag
                ? "bg-[#FBEFF5]/80 md:hover:bg-[#FBEFF5]"
                : "bg-white/75 md:hover:bg-white/90";

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
                className={hero ? "col-span-2 md:row-span-2" : ""}
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
                     Текст сверху, связка врастает в нижнюю кромку во всю
                     ширину карточки. Прежде она стояла по центру с полями
                     по 64px с боков и почти сотней сверху и снизу — 49%
                     площади уходило в пустоту, и карточка выглядела
                     недоделанной.

                     overflow-hidden обязателен: картинка шире содержимого и
                     заходит под скруглённые углы, обрезать её должна сама
                     карточка. */
                  <article
                    className={`${CARD} ${tone} overflow-hidden p-6 pb-0 md:p-8 md:pb-0`}
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

                    {/* Отрицательные поля гасят боковые падинги карточки:
                        внутри неё всё лежит с отступом, а связка идёт от
                        кромки до кромки. Размер ей задаёт не таблица в JS,
                        а пропорции самой картинки — поэтому на любой
                        ширине карточки она остаётся целой и не требует
                        отдельного габарита для телефона. */}
                    <div
                      className="-mx-6 mt-auto pt-6 md:-mx-8"
                      style={layer(
                        idx,
                        LAYER_MS * 3,
                        "translateY(14px) scale(0.96)",
                      )}
                    >
                      {/* Связка перевёрнута по вертикали (см. index.css).
                          В исходнике она нарисована свисающей: широкий бок
                          сверху, узел книзу. У нижней кромки карточки это
                          читалось наоборот — картинка обрывалась ровной
                          широкой линией и висела, а не росла. Вверх ногами
                          у самого низа оказывается узкое горло, а книзу
                          шар расширяется: связка вырастает из кромки. */}
                      <div
                        className="memo-figure memo-figure--flip relative w-full"
                        style={{ aspectRatio: `${card.images[0].ar}` }}
                      >
                        <Cropped img={card.images[0]} />
                      </div>
                    </div>
                  </article>
                ) : (
                  /* ── КВАДРАТНАЯ КАРТОЧКА ──
                     relative — для плашки, которая лежит абсолютом в правом
                     верхнем углу. */
                  <article className={`${CARD} ${tone} relative p-5 md:p-6`}>
                    {/* ПЛАШКА ВНЕ ПОТОКА. Стояла она в строке с
                        заголовком, и две карточки из четырёх получали
                        заголовок в две строки — заголовки соседей
                        разъезжались по вертикали на полсотни пикселей.
                        Теперь она занимает пустой угол справа от значка и
                        на поток не влияет вовсе. */}
                    {tag && (
                      <span
                        className={`absolute top-4 right-4 rounded-full border px-2.5 py-0.5 text-[13px] font-bold tracking-[0.08em] uppercase ${
                          accent
                            ? "border-[#D9C2EA] bg-white/70 text-[#513A6B]"
                            : "border-[#EFD4E0] bg-white/70 text-[#A64D6C]"
                        }`}
                      >
                        {tag}
                      </span>
                    )}

                    {/* КВАДРАТ 72×72 ПОД ЗНАЧОК — один на все карточки.
                        Раньше блок был фиксирован только по высоте, а
                        картинка прижималась влево: справа оставалось от 160
                        до 208px неравномерной пустоты, и сами значки стояли
                        на разной высоте. Теперь габарит один, картинка
                        вписывается в него по своей длинной стороне. */}
                    <div
                      className="flex h-[72px] w-[72px] items-center justify-center"
                      style={layer(
                        idx,
                        LAYER_MS,
                        "translateY(8px) scale(0.92)",
                      )}
                    >
                      <Art
                        card={card}
                        box={card.images.length > 1 ? PAIR : SOLO}
                      />
                    </div>

                    {/* mt-auto прижимает текст к нижней кромке. Заголовки
                        держатся в одну строку, поэтому описания всех
                        четырёх карточек встают на одну линию. */}
                    <div className="mt-auto pt-5">
                      <h3
                        className="text-[17px] leading-tight font-bold tracking-[-0.01em] text-[#2D2433]"
                        style={layer(idx, LAYER_MS * 2, "translateY(8px)")}
                      >
                        {card.title}
                      </h3>

                      <p
                        className="mt-1.5 text-[13px] leading-[1.45] font-medium text-[#4A3A5C]"
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
