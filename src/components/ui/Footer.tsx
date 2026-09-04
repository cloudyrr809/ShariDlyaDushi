// src/components/Footer.tsx
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

/* ═════════════════ ДАННЫЕ ПРОДАВЦА — ЗАПОЛНИТЬ ЗДЕСЬ ═════════════════

   Закон о защите прав потребителей (ст. 8–10) требует, чтобы покупатель
   мог узнать, с кем имеет дело, ДО заказа. Ниже — те самые сведения.

   Правьте только эти две строки, остальное подстроится само. Пока они
   пустые, строка в подвале не выводится вовсе: лучше ничего, чем
   «ИНН: не указан» на живом сайте.

   SELLER — как в документах, вместе со статусом.
     Самозанятая:  "Самозанятая Иванова Нина Сергеевна"
     ИП:           "ИП Иванова Нина Сергеевна"
   INN — двенадцать цифр у физлица и ИП, десять у организации.        */

const SELLER = "Стукалова Нина Анатольевна";
const INN = "762707157039";

/* УПАВШИЕ ШАРЫ ВНИЗУ. Каждый прижат к нижнему краю и утоплен за него:
   видно только верхушку, остальное срезает край страницы.

   • sink — насколько шар ушёл вниз, в долях СВОЕЙ высоты; у всех разный,
     поэтому верхушки не выстраиваются по линейке
   • rot — наклон, ни один шар не стоит строго вертикально
   • w   — размер через clamp: на телефоне куча ужимается сама
   • op  — прозрачность, разведена по планам широко (0.14-0.17 у дальних,
     0.48-0.55 у ближних): при узком разбросе все выходили одинаково
     бледными и сливались в пятно
   • z   — не только порядок наложения: по нему шар попадает в один из трёх
     планов (footer-balloon--back/mid/front в index.css), дальний идёт
     размытым, ближний получает чёткую тень по силуэту

   Значения намеренно «некруглые»: ровные числа складываются в узор. */
const FALLEN = [
  // ── первый слой: мелкие и бледные, лежат глубже всех ──
  {
    src: "/assets/ballon2.webp",
    left: "-2%",
    w: "clamp(58px, 10vw, 138px)",
    sink: 70,
    rot: -24,
    op: 0.15,
    z: 1,
  },
  {
    src: "/assets/ballon4.webp",
    left: "9%",
    w: "clamp(62px, 11vw, 150px)",
    sink: 72,
    rot: 13,
    op: 0.16,
    z: 1,
  },
  {
    src: "/assets/ballon6.webp",
    left: "21%",
    w: "clamp(56px, 10vw, 132px)",
    sink: 69,
    rot: -16,
    op: 0.14,
    z: 1,
  },
  {
    src: "/assets/ballon1.webp",
    left: "36%",
    w: "clamp(64px, 11vw, 154px)",
    sink: 73,
    rot: 21,
    op: 0.17,
    z: 1,
  },
  {
    src: "/assets/ballon3.webp",
    left: "50%",
    w: "clamp(59px, 10vw, 142px)",
    sink: 71,
    rot: -11,
    op: 0.15,
    z: 1,
  },
  {
    src: "/assets/ballon5.webp",
    left: "64%",
    w: "clamp(63px, 11vw, 148px)",
    sink: 74,
    rot: 18,
    op: 0.16,
    z: 1,
  },
  {
    src: "/assets/ballon2.webp",
    left: "78%",
    w: "clamp(57px, 10vw, 136px)",
    sink: 70,
    rot: -20,
    op: 0.14,
    z: 1,
  },
  {
    src: "/assets/ballon4.webp",
    left: "93%",
    w: "clamp(61px, 11vw, 146px)",
    sink: 72,
    rot: 9,
    op: 0.16,
    z: 1,
  },

  // ── второй слой: средние ──
  {
    src: "/assets/ballon1.webp",
    left: "4%",
    w: "clamp(72px, 12vw, 168px)",
    sink: 63,
    rot: 9,
    op: 0.24,
    z: 2,
  },
  {
    src: "/assets/ballon2.webp",
    left: "18%",
    w: "clamp(64px, 11vw, 146px)",
    sink: 68,
    rot: -21,
    op: 0.22,
    z: 2,
  },
  {
    src: "/assets/ballon4.webp",
    left: "32%",
    w: "clamp(76px, 13vw, 178px)",
    sink: 58,
    rot: -8,
    op: 0.26,
    z: 2,
  },
  {
    src: "/assets/ballon3.webp",
    left: "46%",
    w: "clamp(68px, 12vw, 156px)",
    sink: 66,
    rot: -17,
    op: 0.23,
    z: 2,
  },
  {
    src: "/assets/ballon2.webp",
    left: "60%",
    w: "clamp(74px, 13vw, 172px)",
    sink: 61,
    rot: -6,
    op: 0.27,
    z: 2,
  },
  {
    src: "/assets/ballon4.webp",
    left: "74%",
    w: "clamp(70px, 12vw, 162px)",
    sink: 65,
    rot: -12,
    op: 0.24,
    z: 2,
  },
  {
    src: "/assets/ballon1.webp",
    left: "88%",
    w: "clamp(78px, 13vw, 180px)",
    sink: 59,
    rot: -19,
    op: 0.25,
    z: 2,
  },
  {
    src: "/assets/ballon6.webp",
    left: "-8%",
    w: "clamp(80px, 13vw, 186px)",
    sink: 62,
    rot: 16,
    op: 0.25,
    z: 2,
  },

  // ── третий слой: крупные, выходят вперёд ──
  {
    src: "/assets/ballon3.webp",
    left: "-4%",
    w: "clamp(96px, 17vw, 232px)",
    sink: 50,
    rot: -13,
    op: 0.52,
    z: 3,
  },
  {
    src: "/assets/ballon5.webp",
    left: "11%",
    w: "clamp(88px, 15vw, 204px)",
    sink: 42,
    rot: 17,
    op: 0.5,
    z: 4,
  },
  {
    src: "/assets/ballon6.webp",
    left: "25%",
    w: "clamp(92px, 16vw, 218px)",
    sink: 47,
    rot: 6,
    op: 0.51,
    z: 3,
  },
  {
    src: "/assets/ballon1.webp",
    left: "39%",
    w: "clamp(98px, 17vw, 240px)",
    sink: 40,
    rot: 14,
    op: 0.55,
    z: 4,
  },
  {
    src: "/assets/ballon5.webp",
    left: "53%",
    w: "clamp(90px, 15vw, 210px)",
    sink: 45,
    rot: 11,
    op: 0.48,
    z: 3,
  },
  {
    src: "/assets/ballon6.webp",
    left: "67%",
    w: "clamp(94px, 16vw, 224px)",
    sink: 43,
    rot: 19,
    op: 0.51,
    z: 3,
  },
  {
    src: "/assets/ballon3.webp",
    left: "81%",
    w: "clamp(97px, 17vw, 236px)",
    sink: 46,
    rot: 8,
    op: 0.53,
    z: 4,
  },
  // Крайний правый утоплен глубже соседей нарочно. При мелком заглублении
  // от него оставался виден ровно круглый бок, который читался не как часть
  // кучи, а как отдельный шарик, случайно подлетевший к логотипу.
  {
    src: "/assets/ballon5.webp",
    left: "91%",
    w: "clamp(92px, 16vw, 236px)",
    sink: 56,
    rot: 15,
    op: 0.49,
    z: 3,
  },
];

/** Разделы сайта — тот же набор и порядок, что в шапке. */
const SECTIONS = [
  { to: "/catalog", name: "Каталог" },
  { to: "/services", name: "Услуги" },
  { to: "/feed", name: "Лента" },
  { to: "/promotions", name: "Акции" },
  { to: "/about", name: "О нас" },
];

const SOCIAL = [
  { href: "https://vk.ru/sharydlyadushi", name: "ВКонтакте" },
  { href: "https://www.instagram.com/sharydlyadushi", name: "Instagram" },
];

/* Три уровня набора в колонках. Заголовок — плотный капс вразрядку
   розовым, ссылки — капс пожиже тёмным. Кегль ссылок 15px, а не 13:
   разрядка съедает читаемость, и на мелком капсе строка рассыпается на
   отдельные буквы. */
const COL_TITLE =
  "text-lg font-extrabold tracking-[0.14em] text-[#A64D6C] uppercase";
const COL_LINK =
  "text-[15px] font-semibold tracking-[0.08em] text-[#4A3A5C] uppercase transition-colors hover:text-[#A64D6C]";

export const Footer = () => {
  const footerRef = useRef<HTMLElement | null>(null);

  /* ЖИВОЙ ПОДВАЛ: один признак на обе анимации.

     Пока подвал на экране, шары качаются; в момент появления они заново
     падают сверху. Повтор даёт именно СНЯТИЕ анимации: убранная и заново
     назначенная анимация в CSS всегда стартует с нуля, никаких счётчиков
     не нужно.

     ГИСТЕРЕЗИС 55% / 30%: на одном пороге пиксель прокрутки туда-сюда
     перезапускал бы падение по десять раз.

     Обе анимации трогают только transform, поэтому их считает композитор.
     Покачивание идёт только при показанном подвале. */
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      ([e]) => {
        const r = e.intersectionRatio;
        setLive((was) => (was ? r > 0.3 : r > 0.55));
      },
      // Пороги перечислены густо: наблюдатель сообщает долю только на
      // переходах через них, и без промежуточных значений гистерезис
      // получил бы слишком редкие отсчёты.
      { threshold: [0, 0.15, 0.3, 0.45, 0.55, 0.7, 0.9, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    /* overflow-hidden срезает шары по нижнему краю: без него они
       растянули бы страницу вниз пустотой.

       Границу «страница / подвал» держат две вещи, и ни одна не трогает
       цвет самого подвала: волосяная черта сверху (объявлена ЗДЕСЬ, а не
       в конце каждой страницы — подвал один, а страниц шесть) и мягкая
       тень внутрь от верхней кромки, которая притеняет первые пару
       десятков пикселей. */
    <footer
      ref={footerRef}
      className="relative mt-auto overflow-hidden border-t border-[#E8DEEE] bg-gradient-to-b from-[#FDFBFD] via-[#F8F3FA] to-[#F0E5F5] px-6 pt-16 pb-24 shadow-[inset_0_14px_22px_-16px_rgba(107,78,129,0.35)] md:pt-20 md:pb-32"
    >
      {/* СЛОЙ С ШАРАМИ. Декоративный: из озвучки убран, курсор не ловит —
          иначе он накрыл бы ссылки над собой. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {FALLEN.map((b, i) => (
          /* ДВА СЛОЯ НА ШАР: обе анимации меняют transform, а на одном
             элементе из двух анимаций одного свойства побеждает последняя.
             Обёртка отвечает за высоту, картинка внутри — за наклон.
             Величины уходят в CSS-переменные: кадры живут в index.css. */
          <span
            key={i}
            className={`footer-balloon footer-balloon--${
              b.z >= 3 ? "front" : b.z === 2 ? "mid" : "back"
            } ${live ? "is-live" : ""}`}
            style={
              {
                left: b.left,
                width: b.w,
                zIndex: b.z,
                "--sink": b.sink,
                // Прозрачность через переменную, а не напрямую: её должны
                // видеть кадры анимации падения, иначе они возвращают шару
                // полную непрозрачность (см. index.css).
                "--op": b.op,
                // Разбег старта: шары сыплются один за другим, а не падают
                // строем. Числа взяты из индекса, чтобы не держать в
                // таблице ещё одну колонку.
                "--fall-delay": `${(i % 5) * 60 + (i % 3) * 40}ms`,
                "--fall-dur": `${620 + (i % 4) * 90}ms`,
                // Откуда падать. Путь короткий — примерно от черты над
                // нижней полосой подвала, а не из-под шапки: шары должны
                // осыпаться на своё место, а не пролетать через весь блок.
                // Разброс небольшой, чтобы движение не выглядело строем.
                "--drop": `${112 + (i % 4) * 26}px`,
              } as CSSProperties
            }
          >
            <img
              decoding="async"
              src={b.src}
              alt=""
              loading="lazy"
              className="footer-balloon__img"
              style={
                {
                  "--rot": b.rot,
                  // Качается вокруг нижней точки — как предмет, который
                  // лежит и кренится, а не висит и болтается целиком.
                  "--sway": i % 2 ? 3.2 : -2.6,
                  "--sway-dur": `${4.6 + (i % 5) * 0.7}s`,
                  // Отрицательная задержка = каждый шар стартует со своей
                  // фазы сразу, без волны в начале.
                  "--sway-delay": `${-(i * 0.41).toFixed(2)}s`,
                } as CSSProperties
              }
            />
          </span>
        ))}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[76rem]">
        {/* ТРИ КОЛОНКИ. На телефоне «Разделы» и «мы в сети» встают парой, а
            «контакты» уходят под них во всю ширину: почта капсом
            вразрядку — это 240px, в половину экрана она не помещается и
            обрезалась по краю. Три колонки в столбик по одной вытянули бы
            подвал вдвое, поэтому в столбик уходит только та, которой
            действительно тесно. */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-3 md:gap-8">
          <div>
            <h2 className={COL_TITLE}>Разделы</h2>
            <ul className="mt-6 space-y-3.5">
              {SECTIONS.map((s) => (
                <li key={s.to}>
                  <Link to={s.to} className={COL_LINK}>
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={COL_TITLE}>Социальные сети</h2>
            <ul className="mt-6 space-y-3.5">
              {SOCIAL.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className={COL_LINK}
                  >
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Третья колонка выключена вправо — как на образце, по которому
              подвал собран. На телефоне выключка обычная: справа она
              оторвалась бы от соседней колонки. */}
          <div className="col-span-2 md:col-span-1 md:text-right">
            <h2 className={COL_TITLE}>Контакты</h2>
            <ul className="mt-6 space-y-3.5">
              <li>
                <a href="mailto:info@sharidlyadushi.com" className={COL_LINK}>
                  info@sharidlyadushi.com
                </a>
              </li>
              <li>
                <a href="tel:+79806616888" className={COL_LINK}>
                  8 (980) 661-6888
                </a>
              </li>
              <li>
                {/* Не ссылка, но цвет тот же, что у почты и телефона:
                    приглушённый серый читался как «неактивно». Что это не
                    ссылка, видно по отсутствию подчёркивания на наведении. */}
                <span className="inline-flex items-center gap-2 md:w-full md:justify-end">
                  <MapPin
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-[#A64D6C]"
                    strokeWidth={2.4}
                  />
                  <span className="text-[15px] font-semibold tracking-[0.08em] text-[#4A3A5C] uppercase">
                    Ярославль
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* НИЖНЯЯ ПОЛОСА. Слева обязательные сведения о продавце, справа
            логотип — на образце в этих же местах стоят копирайт и подпись
            студии, сделавшей сайт. */}
        {/* Отступ до черты небольшой. Высоту ряда задаёт самая длинная
            колонка («Разделы», пять пунктов), и под короткими колонками и
            так остаётся воздух — прежние 64/80px сверху добавляли к нему
            ещё столько же, и между «О нас» и чертой зияла дыра. */}
        <div className="mt-8 flex flex-col gap-6 border-t border-[#E2D3EC] pt-8 md:mt-10 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1.5 text-[13px] font-medium text-[#7E6E8A]">
            {/* Кегль 13px, а не 12: мелкий текст на сайте под запретом, а
                этот блок вдобавок обязан быть читаемым — его для того и
                вешают. */}
            {SELLER && (
              <p className="text-[#5A4D66]">
                {SELLER}
                {INN && ` · ИНН ${INN}`}
              </p>
            )}
            <p>© 2026 Шары Для Души. Все права защищены.</p>
            <p className="max-w-xl">
              Сведения на сайте носят справочный характер и не являются
              публичной офертой. Состав, стоимость и сроки согласуются в
              переписке до оплаты.
            </p>
          </div>

          <div className="shrink-0 md:text-right -translate-y-10">
            {/* Места под росчерк тут нарочно НЕТ. У «р», «у» и «Д» хвост
                уходит на 0.667em ниже базовой линии, и здесь он должен
                ложиться на строку снизу: рукописная подпись и слоган
                читаются как одно целое, а не как две отдельные строки с
                зазором. Отрицательный отступ подтягивает слоган ещё выше —
                росчерк проходит прямо по нему. */}
            <p className="font-miana text-3xl leading-none text-[#6B4E81]">
              ШарыДляДуши
            </p>
            <p className="-mt-1 text-[13px] font-medium text-[#7E6E8A]">
              Дарим настроение и яркие эмоции
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
