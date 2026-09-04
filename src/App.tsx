import { useRef, useState } from "react";

import { getLenis } from "./lib/smoothScroll";
import { ChevronDown } from "lucide-react";

import { Hero } from "./components/ui/Hero";
import { Reviews } from "./components/ui/Reviews";
import { CareCards } from "./components/ui/CareCards";
import { Faq } from "./components/ui/Faq";

// Импортируем картинки из assets
import comp3 from "./assets/composition-3.jpg";
import comp4 from "./assets/composition-4.jpg";
import comp5 from "./assets/composition-5.jpg";
import comp6 from "./assets/composition-6.jpg";
import comp7 from "./assets/composition-7.jpg";
import comp1_1 from "./assets/composition1.1.jpg";
import comp1_2 from "./assets/composition1.2.jpg";

/* ─────────────────── ЗАКАЗ И ПОЛУЧЕНИЕ ───────────────────

   Оформление то же, что у шагов «как получить скидку» на Акциях и «наш
   подход» на Услугах: свой оттенок, один поджатый угол, своя тень, свой
   вертикальный сдвиг и свой шарик над верхней кромкой. Три одинаковых
   белых прямоугольника с номерами 01/02/03 читались как заготовка, а
   номера ещё и обещали последовательность, которой тут нет.

   Ритм свой, а не копия соседних страниц: поджатые углы в другом порядке,
   оттенки переставлены, шарики другие. Одна манера, разный узор. */
const orderSteps = [
  {
    title: "Как оформить заказ",
    text: "Соберите корзину на сайте или пришлите свой референс. Уточним детали и назовём точную цену: на сайте она предварительная и зависит от размера, состава и даты.",
    shape: "rounded-[2.5rem] rounded-tl-xl",
    tint: "bg-white",
    shadow:
      "shadow-[0_10px_34px_-18px_rgba(45,36,56,0.28)] hover:shadow-[0_22px_50px_-20px_rgba(107,78,129,0.35)]",
    // Сдвиг только на широком экране, где плитки стоят рядом. В колонку
    // на телефоне он превратился бы в кривые отступы.
    offset: "md:mt-8",
    art: "/assets/ballon6.png",
    artClass: "-top-9 right-7 w-[4.25rem] rotate-[13deg]",
  },
  {
    title: "Доставка и сроки",
    text: "Доставляем по Ярославлю и пригороду в защитном пакете ко времени, которое обсудим заранее. Возможен самовывоз — адрес уточняйте при заказе.",
    shape: "rounded-[2.5rem] rounded-br-xl",
    tint: "bg-[#FCF2F6]",
    shadow:
      "shadow-[0_12px_36px_-18px_rgba(196,107,138,0.38)] hover:shadow-[0_24px_54px_-20px_rgba(196,107,138,0.45)]",
    offset: "md:mt-0",
    art: "/assets/ballon2.png",
    artClass: "-top-11 left-5 w-[4.75rem] -rotate-[11deg]",
  },
  {
    title: "Оплата и возврат",
    text: "Предоплата 50%, остаток при получении. Если шар сдулся или пришёл повреждённым — заменим или вернём деньги: напишите нам в день получения.",
    shape: "rounded-[2.5rem] rounded-tr-xl",
    tint: "bg-[#F6F0FA]",
    shadow:
      "shadow-[0_14px_40px_-20px_rgba(107,78,129,0.35)] hover:shadow-[0_26px_58px_-22px_rgba(107,78,129,0.42)]",
    offset: "md:mt-6",
    art: "/assets/ballon4.png",
    artClass: "-top-8 right-8 w-[3.5rem] rotate-[17deg]",
  },
];

/* ─────────────────────── НАШИ КОМПОЗИЦИИ ───────────────────────

   Один список на обе раскладки. Раньше снимки были рассыпаны прямо по
   разметке: три в видимой части, четыре под кнопкой «показать больше», и
   у каждого свой object-position в классе. Добавить восьмой значило
   вписать его в нужное место руками и не забыть про вторую раскладку.

   Раскладок две, и они разные по существу. На широком экране всё как
   было: мозаика из трёх снимков и кнопка «показать больше», по которой
   выезжают остальные четыре. На телефоне кнопки нет — там снимки
   листаются пальцем: раскрытие сетки в одну колонку добавляло экран
   высоты и заставляло страницу подпрыгивать, а листать привычнее.

   pos — куда смотреть при обрезке: у половины снимков главное не в
   середине кадра. */
const COMPOSITIONS = [
  { src: comp3, alt: "Композиция с цифрой", pos: "object-[50%_76%]" },
  { src: comp1_2, alt: "Детская фотосессия", pos: "" },
  { src: comp1_1, alt: "Праздник с шарами", pos: "object-[50%_26%]" },
  { src: comp4, alt: "Композиция из шаров пастельных тонов", pos: "object-top" },
  { src: comp5, alt: "Композиция с фольгированными шарами", pos: "" },
  { src: comp6, alt: "Оформление праздника шарами", pos: "object-[40%_6%]" },
  { src: comp7, alt: "Связка шаров с цифрой", pos: "object-[50%_40%]" },
];

export default function App() {
  /* Какой снимок сейчас по центру ленты — только для точек под ней.
     Считается из прокрутки самой ленты, а не наоборот: листание остаётся
     нативным, со всей его инерцией и прилипанием. */
  const strip = useRef<HTMLDivElement | null>(null);
  const [shot, setShot] = useState(0);

  /* Раскрытие мозаики на широком экране. На телефоне этой кнопки нет —
     там всё листается пальцем, — поэтому и состояние работает только там,
     где кнопка вообще отрисована. */
  const [showMore, setShowMore] = useState(false);
  const section = useRef<HTMLElement | null>(null);

  const toggleShowMore = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();

    if (!showMore) {
      setShowMore(true);
      return;
    }

    /* Схлопываем НЕ СРАЗУ. Сначала возвращаем экран к началу блока и
       только потом убираем нижний ряд: иначе страница укорачивается под
       уже едущей прокруткой и та промахивается мимо цели.

       Прокрутка идёт ЧЕРЕЗ LENIS, а не через window.scrollTo. Пока
       плавная прокрутка включена, она глушит родной scroll-behavior
       (scroll-behavior: auto !important в её собственных стилях), и
       родное behavior: "smooth" превращалось в мгновенный прыжок —
       экран не поднимался, а телепортировался.

       Момент схлопывания берём из onComplete, а не из таймера на 400 мс:
       таймер угадывал длительность добега, а она зависит от того, как
       далеко вниз уехал экран. */
    const el = section.current;
    if (!el) {
      setShowMore(false);
      return;
    }

    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    const lenis = getLenis();

    if (lenis) {
      lenis.scrollTo(top, { duration: 0.9, onComplete: () => setShowMore(false) });
    } else {
      // «Меньше движения» или Lenis не запустился — родная прокрутка
      window.scrollTo({ top, behavior: "smooth" });
      setTimeout(() => setShowMore(false), 400);
    }
  };

  const onStripScroll = () => {
    const el = strip.current;
    if (!el) return;
    const step = el.scrollWidth / COMPOSITIONS.length;
    const i = Math.round(el.scrollLeft / step);
    setShot(Math.min(COMPOSITIONS.length - 1, Math.max(0, i)));
  };

  const goToShot = (i: number) => {
    const el = strip.current;
    if (!el) return;
    el.scrollTo({
      left: (el.scrollWidth / COMPOSITIONS.length) * i,
      behavior: "smooth",
    });
  };

  return (
    <div className="bg-[#FDFBFD] text-[#2D2433]">
      <Hero />

      {/* Наши композиции */}
      <section
        ref={section}
        id="compositions"
        className="bg-[#FFFAFD] px-6 py-16 md:py-20"
      >
        <div className="mx-auto max-w-[76rem]">
          <p className="text-center text-[13px] font-medium tracking-widest text-[#6B4E81] uppercase">
            Больше 5 лет с вами
          </p>
          <h2 className="mt-2 text-center font-serif text-[1.9rem] font-semibold text-[#2D2433] md:text-5xl">
            Наши Композиции
          </h2>

          {/* ── ТЕЛЕФОН: лента с прокруткой вбок ──
              -mx-6 + px-6 выводят ленту под самые края экрана, оставляя
              первый снимок на сетке страницы. Ширина слайда 78%, поэтому
              справа всегда торчит край следующего — это и есть подсказка,
              что ленту можно листать, без единой надписи об этом. */}
          <div className="md:hidden">
            <div
              ref={strip}
              onScroll={onStripScroll}
              className="scrollbar-hide -mx-6 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6"
            >
              {COMPOSITIONS.map((c, i) => (
                <div
                  key={c.alt}
                  className="aspect-[3/4] w-[78%] shrink-0 snap-start overflow-hidden rounded-3xl bg-[#F0E8F4]"
                >
                  <img
                    src={c.src}
                    alt={c.alt}
                    /* Первый снимок виден сразу — его тянем обычным
                       порядком, остальные по мере листания. */
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className={`h-full w-full object-cover ${c.pos}`}
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-center gap-2">
              {COMPOSITIONS.map((c, i) => (
                <button
                  key={c.alt}
                  type="button"
                  onClick={() => goToShot(i)}
                  aria-label={`Снимок ${i + 1} из ${COMPOSITIONS.length}`}
                  aria-current={i === shot}
                  /* Точка мелкая, а поле нажатия вокруг неё — 24px:
                     попасть пальцем в четыре пикселя невозможно. */
                  className="cursor-pointer p-2.5"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-300 ${
                      i === shot ? "w-5 bg-[#6B4E81]" : "w-1.5 bg-[#D9C6E4]"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* ── ШИРОКИЙ ЭКРАН: прежняя мозаика с раскрытием по кнопке ──

              Кнопка осталась только здесь. На телефоне от неё отказались:
              там лента листается пальцем, и раскрывать нечего — а вот на
              широком экране это и есть способ не занимать пол-страницы
              снимками, пока их не попросили. */}
          <div className="hidden md:block">
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="group h-96 overflow-hidden rounded-3xl shadow-sm md:col-span-2">
                <img
                  src={COMPOSITIONS[0].src}
                  alt={COMPOSITIONS[0].alt}
                  className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${COMPOSITIONS[0].pos}`}
                />
              </div>
              <div className="flex flex-col gap-6">
                {COMPOSITIONS.slice(1, 3).map((c) => (
                  <div
                    key={c.alt}
                    className="group h-44 overflow-hidden rounded-3xl shadow-sm"
                  >
                    <img
                      src={c.src}
                      alt={c.alt}
                      className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${c.pos}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Плавное раскрытие: сетка едет от 0fr к 1fr, без скачка высоты */}
            <div
              className={`grid transition-all duration-700 ease-out ${
                showMore
                  ? "mt-6 grid-rows-[1fr] opacity-100"
                  : "mt-0 grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="grid gap-6 md:grid-cols-2">
                  {COMPOSITIONS.slice(3).map((c) => (
                    <div
                      key={c.alt}
                      className="group aspect-square overflow-hidden rounded-3xl shadow-sm"
                    >
                      <img
                        src={c.src}
                        alt={c.alt}
                        loading="lazy"
                        className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${c.pos}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <button
                onClick={toggleShowMore}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E8DEEE] bg-white px-8 py-3 text-[13px] font-medium tracking-widest text-[#6B4E81] uppercase shadow-sm transition hover:border-[#6B4E81] hover:bg-[#F8F4F9]"
              >
                {showMore ? "Скрыть" : "Показать больше"}
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-500 ${
                    showMore ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════ ЗАКАЗ И ПОЛУЧЕНИЕ ═════════════════════

          Та же манера, что у «как получить скидку» на Акциях и «наш
          подход» на Услугах: рукописная надстрочка, заголовок строчными,
          плитки со своим оттенком, поджатым углом, тенью, вертикальным
          сдвигом и шариком над верхней кромкой.

          НОМЕРОВ 01/02/03 БОЛЬШЕ НЕТ. Три фиолетовых кружка в рамке были
          самым тяжёлым пятном блока и обещали порядок действий, которого
          тут нет: оплата и возврат — не третий шаг после доставки, а
          отдельная тема.

          ФОН ПОСВЕТЛЕЛ. Под фотографией стояла вуаль #2B1B36/58, и блок
          читался тёмной полосой посреди светлой страницы — на неё пастельные
          плитки не ложатся вовсе. Теперь вуаль светлая (#FDFBFD/88):
          фотография осталась, но работает как чуть заметная фактура, а не
          как заливка. Заголовок из-за этого стал тёмным, как во всех
          остальных разделах.

          Узор свой, не копия соседних страниц: поджатые углы идут в третьем
          порядке, оттенки переставлены, шарики взяты те, что не заняты ни
          на Акциях, ни на Услугах в этом же сочетании. */}
      <section
        id="order"
        className="relative overflow-hidden px-6 pt-16 pb-24 md:pt-20 md:pb-28"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Кадр вдвое шире исходника, поэтому по вертикали его режет;
              object-position подобран так, чтобы полоса с шарами легла в
              верхнюю часть секции — над плитками. */}
          <img
            src="/assets/back2.jpg"
            alt=""
            className="absolute top-0 left-1/2 h-full max-w-none -translate-x-1/2 object-cover"
            style={{
              width: "158%",
              objectPosition: "50% 85%",
              filter: "blur(3px) brightness(1.04) saturate(0.62)",
            }}
          />
          {/* Светлая вуаль вместо тёмной: фотография остаётся фактурой,
              а не фоном под белый текст. */}
          <div className="absolute inset-0 bg-[#FDFBFD]/88" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[79rem]">
          <div className="text-center">
            {/* У рукописного «д» росчерк уходит ниже базовой линии: при
                leading-none он лёг бы на заголовок. pb-[0.5em] подкладывает
                недостающее место, в em — чтобы работало и на мобильном
                кегле. */}
            <p className="font-miana pb-[0.5em] text-2xl leading-none text-[#A64D6C] md:text-3xl">
              без сюрпризов
            </p>

            <h2 className="mx-auto max-w-3xl text-[1.9rem] leading-[1.15] font-semibold tracking-[-0.01em] text-[#2D2433] md:text-[2.6rem] md:leading-[1.12]">
              Заказ и получение
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-base font-medium text-[#7E6E8A] md:text-[17px]">
              Собираем, привозим и отвечаем за результат — по всему
              Ярославлю и пригороду.
            </p>
          </div>

          {/* items-start, а не растянутые на общую высоту: у плиток разный
              объём текста, и разная высота вместе со сдвигами по вертикали
              и даёт ту асимметрию, ради которой блок переверстан. */}
          <div className="mt-16 grid grid-cols-1 items-start gap-8 md:mt-20 md:grid-cols-3 md:gap-7">
            {orderSteps.map((step) => (
              <div
                key={step.title}
                /* Верхний внутренний отступ больше остальных: шарик свисает
                   за кромку и заходит на плитку на 30-40px, заголовок
                   должен начинаться ниже этой границы. */
                className={`relative px-8 pt-12 pb-8 text-center transition-all duration-500 hover:-translate-y-1.5 md:px-9 md:pt-14 md:pb-9 ${step.shape} ${step.tint} ${step.shadow} ${step.offset}`}
              >
                <img
                  src={step.art}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className={`pointer-events-none absolute select-none drop-shadow-[0_10px_18px_rgba(107,78,129,0.22)] ${step.artClass}`}
                />

                {/* Заголовок капсом вразрядку, описание тоном мягче —
                    иерархия читается сразу, без линеек и значков. 15px, а
                    не 14: текста под ним втрое больше, чем в плитках на
                    Акциях, и заголовку нужно вести за собой не одну строку,
                    а четыре. */}
                <h3 className="text-[15px] font-bold tracking-[0.16em] text-[#2D2433] uppercase">
                  {step.title}
                </h3>
                <p className="mt-3.5 text-[15px] leading-relaxed font-medium text-[#5A4D66] md:text-base">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Reviews />

      <CareCards />

      <Faq />
    </div>
  );
}
