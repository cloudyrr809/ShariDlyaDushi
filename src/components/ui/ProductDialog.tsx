import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  X,
} from "lucide-react";

import { useCart } from "../../CartContext";
import { pauseSmoothScroll } from "../../lib/smoothScroll";
import type { Product } from "../../lib/catalog";
import {
  defaultSettings,
  fetchSettings,
  type Settings,
} from "../../lib/settings";

/* ═══════════════════ ПОДРОБНО О КОМПОЗИЦИИ ═══════════════════

   Карточка в каталоге показывает фотографию, цену и название — всё, что
   нужно, чтобы выбирать глазами. Но у покупателя остаются вопросы, из-за
   которых он уходит писать в личку или просто уходит: из чего это, когда
   привезут, как платить, что если шар лопнет.

   Это окно отвечает на них, не уводя человека со страницы. Слева — все
   фотографии композиции, справа — цена, состав и условия студии.

   ПОЧЕМУ ОТДЕЛЬНЫЙ КОМПОНЕНТ, А НЕ Dialog ИЗ НАБОРА. Здесь своя
   раскладка в две колонки, своя прокрутка внутри правой колонки и своя
   галерея; готовое окно пришлось бы переопределять почти целиком.
   Поведение при этом обычное для модального окна: Esc закрывает, фон
   под ним не прокручивается, клик мимо тоже закрывает.

   УСЛОВИЯ ТЯНЕМ ОДИН РАЗ И ПОКАЗЫВАЕМ ВСЕМ КАРТОЧКАМ: это правила
   студии, они не зависят от того, какую композицию открыли. */

/** Раздел с условиями — раскрывается по нажатию. */
function Fold({
  title,
  items,
  bullets = false,
}: {
  title: string;
  items: string[];
  bullets?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <div className="border-b border-[#E8DEEE]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-[15px] font-semibold text-[#2D2433]">
          {title}
        </span>
        <ChevronRight
          className={`h-5 w-5 shrink-0 text-[#9E8EAA] transition-transform duration-300 ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>

      {open && (
        <div className="pb-4">
          {bullets ? (
            <ul className="space-y-2">
              {items.map((t) => (
                <li
                  key={t}
                  className="flex gap-2.5 text-[15px] leading-relaxed font-medium text-[#5A4D66]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9B4D6]"
                  />
                  {t}
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-3">
              {items.map((t) => (
                <p
                  key={t}
                  className="text-[15px] leading-relaxed font-medium text-[#5A4D66]"
                >
                  {t}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProductDialog({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const { addToCart } = useCart();
  const [shot, setShot] = useState(0);
  const [terms, setTerms] = useState<Settings>(defaultSettings);

  // Условия одни на весь каталог — читаем при первом открытии окна
  useEffect(() => {
    if (!product) return;
    let alive = true;
    fetchSettings()
      .then((s) => alive && setTerms(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [product]);

  // Новая карточка — снова с первого кадра и без остатков прошлого полёта
  useEffect(() => {
    setShot(0);
    setFlight(null);
  }, [product]);

  /* ───────────────── ОКНО УЛЕТАЕТ В КОРЗИНУ ─────────────────

     Раньше по «в корзину» окно просто исчезало, и связь между нажатием и
     счётчиком в шапке приходилось достраивать самому. Теперь окно
     складывается и уезжает к значку корзины — тот же жест, что у карточек
     каталога, только летит не фотография, а всё окно целиком.

     Стиль полёта считаем в момент нажатия и держим в состоянии: расстояние
     зависит от того, где окно и где значок, а это известно только сейчас.
     Пока стиль не null — окно в полёте: фон гаснет, нажатия не проходят,
     повторный клик ничего не делает. */
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [flight, setFlight] = useState<CSSProperties | null>(null);

  const FLIGHT_MS = 560;

  const toCart = () => {
    if (!product || flight) return;

    const panel = panelRef.current;
    const cart = document.getElementById("cart-icon-header");

    // Значка корзины на экране нет (узкий экран, своя разметка шапки) —
    // лететь некуда, просто кладём и закрываем.
    if (!panel || !cart) {
      addToCart(product);
      onClose();
      return;
    }

    const p = panel.getBoundingClientRect();
    const c = cart.getBoundingClientRect();

    setFlight({
      transform: `translate(${c.left + c.width / 2 - (p.left + p.width / 2)}px, ${
        c.top + c.height / 2 - (p.top + p.height / 2)
      }px) scale(${Math.max(0.05, c.width / p.width)})`,
      opacity: 0,
      transition: `transform ${FLIGHT_MS}ms cubic-bezier(0.45, 0, 0.3, 1), opacity ${FLIGHT_MS}ms ease-in`,
      pointerEvents: "none",
    });

    window.setTimeout(() => {
      addToCart(product);
      onClose();
      // Значок подпрыгивает в момент «прилёта» — как при добавлении из
      // карточки каталога.
      cart.classList.add("scale-125");
      window.setTimeout(() => cart.classList.remove("scale-125"), 200);
    }, FLIGHT_MS - 40);
  };

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const was = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Плавная прокрутка двигает страницу сама и про overflow на теле не
    // знает — фон под окном продолжал бы ехать. Замораживаем её тоже.
    const resume = pauseSmoothScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = was;
      resume();
    };
  }, [product, onClose]);

  if (!product) return null;

  const images = product.images ?? [];
  const total = images.length;
  const step = (d: number) => setShot((i) => (i + d + total) % total);

  return (
    <div
      /* Пока окно летит, затемнение гаснет вместе с ним и перестаёт
         ловить нажатия: иначе клик по фону закрывал бы окно на середине
         полёта. */
      className={`fixed inset-0 z-[110] flex items-end justify-center bg-[#2D2433]/45 p-0 backdrop-blur-[2px] transition-opacity duration-500 sm:items-center sm:p-6 ${
        flight ? "pointer-events-none opacity-0" : ""
      }`}
      onClick={flight ? undefined : onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={product.title}
        onClick={(e) => e.stopPropagation()}
        style={flight ?? undefined}
        /* На телефоне окно занимает почти весь экран и прижато к низу —
           так до него дотягивается большой палец. С sm это обычное окно
           по центру. */
        className="flex max-h-[92svh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_30px_80px_-20px_rgba(45,36,56,0.45)] sm:max-h-[88svh] sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E8DEEE] px-5 py-4 sm:px-7">
          <h2 className="text-[19px] leading-snug font-semibold text-[#2D2433] sm:text-2xl">
            {product.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="-mr-2 -mt-1 shrink-0 cursor-pointer p-2 text-[#7E6E8A] transition hover:text-[#2D2433]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* data-lenis-prevent — колесо внутри окна прокручивает само окно,
            а не страницу под ним: плавная прокрутка перехватывает колесо
            глобально и по этому признаку пропускает событие дальше. */}
        <div
          data-lenis-prevent
          className="flex min-h-0 flex-1 flex-col overflow-y-auto sm:flex-row sm:overflow-hidden"
        >
          {/* ── ФОТОГРАФИИ ── */}
          <div
            data-lenis-prevent
            className="shrink-0 bg-[#F8F4F9] p-5 sm:w-[46%] sm:overflow-y-auto sm:p-6"
          >
            <div className="group relative aspect-4/5 overflow-hidden rounded-2xl bg-[#F0E8F4]">
              {images.map((src, i) => (
                <img
                  decoding="async"
                  key={src}
                  src={src}
                  alt={`${product.title} — фото ${i + 1}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                    i === shot ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}

              {total > 1 && (
                <>
                  {/* Стрелки видны сразу на телефоне и по наведению на
                      десктопе: навести палец нельзя. */}
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label="Предыдущее фото"
                    className="absolute top-1/2 left-2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[#6B4E81] shadow-md transition hover:bg-white md:opacity-0 md:group-hover:opacity-100"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label="Следующее фото"
                    className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[#6B4E81] shadow-md transition hover:bg-white md:opacity-0 md:group-hover:opacity-100"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {total > 1 && (
              <div className="mt-3 flex gap-2">
                {images.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setShot(i)}
                    aria-label={`Фото ${i + 1}`}
                    className={`aspect-square flex-1 cursor-pointer overflow-hidden rounded-xl border-2 transition ${
                      i === shot
                        ? "border-[#6B4E81] opacity-100"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      decoding="async"
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── ЦЕНА, СОСТАВ И УСЛОВИЯ ── */}
          <div
            data-lenis-prevent
            className="flex min-h-0 flex-1 flex-col px-5 py-5 sm:overflow-y-auto sm:px-7 sm:py-6"
          >
            <div className="flex items-end gap-3">
              <span className="font-serif text-3xl font-bold text-[#6B4E81]">
                {product.price} ₽
              </span>
              {product.oldPrice ? (
                <span className="mb-1 text-[15px] text-[#A093AB] line-through">
                  {product.oldPrice} ₽
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-[13px] font-medium text-[#7E6E8A]">
              Цена предварительная — итог зависит от размера, состава и даты
            </p>

            {product.description && (
              <p className="mt-5 text-[15px] leading-relaxed font-medium text-[#5A4D66]">
                {product.description}
              </p>
            )}

            {/* ── СОСТАВ КОМПОЗИЦИИ ──
                Открыт сразу, а не спрятан в сворачиваемый раздел: это
                первое, что хотят увидеть, открыв карточку — из чего
                собрано и сколько чего. Прятать ответ на главный вопрос
                за нажатием значит терять тех, кто не догадается нажать.

                Галочку рисуем сами, а не просим писать её в тексте: в
                админке набирают только позицию, и список остаётся ровным,
                даже если где-то забыли поставить значок. */}
            {product.composition.length > 0 && (
              <div className="mt-6 rounded-2xl bg-[#F8F4F9] px-5 py-4">
                <h3 className="text-[13px] font-bold tracking-[0.1em] text-[#6B4E81] uppercase">
                  Состав композиции
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {product.composition.map((line) => (
                    <li
                      key={line}
                      className="flex gap-2.5 text-[15px] leading-relaxed font-medium text-[#2D2433]"
                    >
                      <Check
                        aria-hidden="true"
                        className="mt-[3px] h-4 w-4 shrink-0 text-[#6B4E81]"
                        strokeWidth={3}
                      />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {product.specs.length > 0 && (
              <dl className="mt-5 space-y-0">
                {product.specs.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-baseline justify-between gap-4 border-b border-[#F0E6F3] py-2.5"
                  >
                    <dt className="shrink-0 text-[15px] font-medium text-[#7E6E8A]">
                      {s.name}
                    </dt>
                    <dd className="text-right text-[15px] font-semibold text-[#2D2433]">
                      {s.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-6">
              <Fold title="Доставка" items={terms.delivery} />
              <Fold title="Оплата" items={terms.payment} />
              <Fold title="Возврат и обмен" items={terms.returns} />
              <Fold
                title="Чтобы шары прожили дольше"
                items={terms.care}
                bullets
              />
            </div>
          </div>
        </div>

        {/* Кнопка закреплена внизу окна: на телефоне до неё иначе пришлось
            бы пролистать все условия обратно. */}
        <div className="shrink-0 border-t border-[#E8DEEE] bg-[#FDFBFD] px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={toCart}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#6B4E81] px-6 py-4 text-[15px] font-semibold text-white transition hover:bg-[#513A6B]"
          >
            <ShoppingCart className="h-5 w-5 shrink-0" />В корзину за{" "}
            {product.price} ₽
          </button>
        </div>
      </div>
    </div>
  );
}
