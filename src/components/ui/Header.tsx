import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom"; // <-- ВЕРНУЛИ useLocation
import { Menu, X, Phone, ChevronDown, ShoppingCart } from "lucide-react";

// Поднимаемся на ДВА уровня вверх (../../), потому что файл в папке ui
import { useCart, type CartItem } from "../../CartContext";
// «Все» стоит первой и в выпадающем меню, и на самой странице каталога —
// список берём из lib/catalog, чтобы порядок совпадал в обоих местах.
import { serviceItems } from "../../constants";
import { categoriesWithAll } from "../../lib/catalog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Векторные иконки
// viewBox обрезан по фактическим границам рисунка: логотип ВК занимает
// в исходном кадре 24×24 только полосу y 7..19, из-за чего рядом с
// Instagram отрисовывался вдвое мельче. Подробности — в Hero.tsx.
const VkIcon = ({
  className = "w-4 h-4 fill-current",
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

/* ─────────────────────── МОБИЛЬНОЕ МЕНЮ ───────────────────────

   Разделы верхнего уровня — «Лента», «Акции», «О нас» — живут в этом же
   меню, а не только в десктопной строке. Раньше их там не было вовсе:
   с телефона на эти страницы можно было попасть только через подвал,
   то есть прокрутив сайт до самого низа.

   Кегль тут ровно такой же, как в остальном интерфейсе: прежние 12px
   читались как сноска, хотя это основная навигация сайта. */

/**
 * Пункт меню: крупная подпись и поле под палец — 46px по высоте.
 *
 * min-w-0 обязателен. Ячейка сетки по умолчанию не сжимается уже своего
 * содержимого, а «Фольгированные» — одно длинное слово: на экране 320px
 * колонка не могла стать уже него, и подпись вылезала за край карточки,
 * обрываясь на «Фольгированн». С min-w-0 колонка ужимается, а слово
 * переносится на вторую строку.
 */
const MOBILE_ROW =
  "min-w-0 rounded-2xl px-3.5 py-3 text-[15px] font-medium text-[#2D2433] transition hover:bg-[#F8F4F9] hover:text-[#6B4E81]";

/** Заголовок группы внутри меню. */
const MOBILE_LABEL =
  "text-[13px] font-semibold tracking-widest text-[#6B4E81] uppercase";

/** Верхние разделы — плитками в ряд, чтобы их было видно сразу. */
const MAIN_LINKS = [
  { to: "/feed", name: "Лента" },
  { to: "/promotions", name: "Акции" },
  { to: "/about", name: "О нас" },
];

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cart, setIsCartOpen } = useCart();

  const totalItems = cart.reduce(
    (sum: number, item: CartItem) => sum + item.quantity,
    0,
  );

  // Получаем текущий путь для подчеркивания активной вкладки
  const location = useLocation();

  /* Меню закрывается на любом переходе, а не только по клику мимо. Часть
     ссылок ведёт на текущую страницу с другим якорем (/catalog#women с
     самого каталога) — там своего onClick мало: он закроет меню, но
     обработать все такие случаи по одному значит однажды забыть один. */
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  // ФУНКЦИЯ ДЛЯ АКТИВНОГО КЛАССА В МЕНЮ
  const getNavLinkClass = (path: string, hashMatch: string = "") => {
    let isCurrent = false;

    if (hashMatch) {
      isCurrent = location.hash === hashMatch;
    } else {
      isCurrent =
        (location.pathname.includes(path) && path !== "/") ||
        (path === "/" && location.pathname === "/" && !location.hash);
    }

    return `inline-flex items-center gap-1.5 transition cursor-pointer ${
      isCurrent
        ? "text-[#6B4E81] font-bold border-b-2 border-[#6B4E81] pb-0.5"
        : "hover:text-[#6B4E81]"
    }`;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#E8DEEE]/80 bg-[#FDFBFD]/90 backdrop-blur-md px-6 py-4">
      {/* max-w-[76rem] — единая сетка для всех страниц (главная, каталог,
          услуги): логотип слева и кнопка справа стоят ровно по краям
          контента страницы */}
      <div className="mx-auto flex max-w-[76rem] items-center justify-between">
        <Link
          to="/"
          onClick={(e) => {
            // Если мы уже на главной странице, отменяем обычный переход и плавно скроллим наверх
            if (location.pathname === "/") {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          /* Кегль поджат на совсем узких экранах. Замерено на 320px: в ряду
             доступно 272px (320 минус px-6 с двух сторон), а логотипу на
             24px нужно 223px плюс 88px правому блоку — 311px, перебор на
             39px, и страница уезжала вбок на 15px.

             Ужаться сам ряд не может: «ШарыДляДуши» — одно слово, переносить
             негде, поэтому min-content логотипа равен его полной ширине, а
             корзина и бургер фиксированные (40 + 8 + 40).

             375px — порог, а не sm (640px): при 375 полноразмерный логотип
             ещё влезает с запасом 16px, и ужимать его на iPhone SE и всех
             экранах шире незачем. Ниже порога 18px дают 167px и запас 17px. */
          className="font-miana text-lg tracking-wide text-[#6B4E81] transition hover:opacity-90 min-[375px]:text-2xl"
        >
          ШарыДляДуши
        </Link>

        {/* Кегль и межбуквенное подобраны под ширину Montserrat: шесть
            пунктов меню должны уместиться в строку рядом с логотипом
            и кнопкой, не упираясь в них. */}
        <nav className="hidden items-center gap-6 lg:flex text-[13px] font-semibold uppercase tracking-wide text-[#5A4D66]">
          {/* КАТАЛОГ */}
          <div className="relative group py-2">
            <Link to="/catalog" className={getNavLinkClass("/catalog")}>
              КАТАЛОГ
              <ChevronDown className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-180 text-[#9E8EAA]" />
            </Link>

            <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 ease-out absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[560px] z-50">
              <div className="rounded-3xl bg-white border border-[#E8DEEE] p-6 shadow-[0_25px_60px_-15px_rgba(107,78,129,0.25)]">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] font-medium normal-case tracking-normal text-[#2D2433]">
                  {categoriesWithAll.map((item) => (
                    <Link
                      key={item.id}
                      to={`/catalog#${item.id}`}
                      className="px-3.5 py-2.5 rounded-2xl hover:bg-[#F8F4F9] hover:text-[#6B4E81] transition flex items-center justify-between group/item"
                    >
                      <span>{item.name}</span>
                      <span className="text-[#6B4E81] opacity-0 group-hover/item:opacity-100 transition-opacity text-xs font-bold">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* УСЛУГИ */}
          <div className="relative group py-2">
            <Link to="/services" className={getNavLinkClass("/services")}>
              УСЛУГИ
              <ChevronDown className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-180 text-[#9E8EAA]" />
            </Link>

            <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 ease-out absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[560px] z-50">
              <div className="rounded-3xl bg-white border border-[#E8DEEE] p-6 shadow-[0_25px_60px_-15px_rgba(107,78,129,0.25)]">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] font-medium normal-case tracking-normal text-[#2D2433]">
                  {serviceItems.map((item) => (
                    <Link
                      key={item.key}
                      to={`/services#${item.key}`}
                      className="px-3.5 py-2.5 rounded-2xl hover:bg-[#F8F4F9] hover:text-[#6B4E81] transition flex items-center justify-between group/item"
                    >
                      <span>{item.name}</span>
                      <span className="text-[#6B4E81] opacity-0 group-hover/item:opacity-100 transition-opacity text-xs font-bold">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Link to="/feed" className={getNavLinkClass("/feed")}>
            ЛЕНТА
          </Link>
          <Link to="/promotions" className={getNavLinkClass("/promotions")}>
            АКЦИИ
          </Link>
          <Link to="/about" className={getNavLinkClass("/about")}>
            О НАС
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            id="cart-icon-header"
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-[#6B4E81] hover:text-[#5A4D66] hover:scale-110 transition-transform duration-200 cursor-pointer"
          >
            <ShoppingCart className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 bg-[#F48FB1] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center translate-x-1 -translate-y-1 shadow-sm">
                {totalItems}
              </span>
            )}
          </button>

          {/* Модальное окно */}
          <Dialog>
            <DialogTrigger className="hidden sm:inline-flex items-center justify-center rounded-full bg-[#6B4E91] px-6 py-2.5 text-[13px] font-semibold uppercase tracking-wide text-white hover:opacity-90 transition cursor-pointer shadow-sm">
              Свяжитесь с нами
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 md:p-8 border border-[#E8DEEE] shadow-[0_25px_60px_rgba(107,78,129,0.2)]">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl md:text-3xl text-[#2D2433] text-center">
                  Оформить заказ
                </DialogTitle>
              </DialogHeader>
              {/* ФОРМЫ ЗДЕСЬ БОЛЬШЕ НЕТ.

                  Раньше окно собирало имя и телефон и слало их в
                  телеграм-бота, чей токен лежал прямо в коде сайта — то
                  есть был доступен кому угодно. Заодно это делало студию
                  оператором персональных данных со всеми обязанностями.

                  Теперь окно просто ведёт туда, где Нина и так отвечает:
                  ВКонтакте, телефон, почта. Сайт при этом не собирает и не
                  передаёт ничего. */}
              <p className="mt-4 text-center text-[15px] leading-relaxed font-medium text-[#5A4D66]">
                Свяжитесь с нами удобным способом — ответим, подберём композицию
                и рассчитаем стоимость с доставкой.
              </p>

              {/* Прямые контакты и соцсети */}
              <div className="space-y-4 text-center">
                <a
                  href="tel:+79806616888"
                  className="inline-flex items-center justify-center gap-2 text-lg font-medium text-[#6B4E81] hover:opacity-80 transition"
                >
                  <Phone className="w-5 h-5 text-[#6B4E81]" />8 (980) 661-6888
                </a>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <a
                    href="https://vk.ru/sharydlyadushi"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-[#0077FF] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 hover:scale-[1.02] transition duration-200"
                  >
                    <VkIcon />
                    <span>ВКонтакте</span>
                  </a>
                  <a
                    href="https://www.instagram.com/sharydlyadushi"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-tr from-[#FF543E] via-[#C837AB] to-[#5B51D8] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 hover:scale-[1.02] transition duration-200"
                  >
                    <InstagramIcon />
                    <span>Instagram</span>
                  </a>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={mobileMenuOpen}
            className="cursor-pointer p-2 text-[#2D2433] lg:hidden"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Мобильное раскрывающееся меню.

          max-h + прокрутка обязательны: пунктов девятнадцать, и на
          экране высотой 667px (iPhone SE) список целиком не помещается —
          без этого нижние разделы оказывались за краем экрана, а шапка
          sticky и прокрутить до них было нечем. */}
      {mobileMenuOpen && (
        <div className="mt-4 max-h-[calc(100svh-7rem)] space-y-5 overflow-y-auto overscroll-contain rounded-3xl border border-[#E8DEEE] bg-white p-5 shadow-lg lg:hidden">
          {/* Разделы верхнего уровня */}
          <div className="grid grid-cols-3 gap-2">
            {MAIN_LINKS.map((item) => {
              const active = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-2xl px-3 py-3 text-center text-[15px] font-semibold transition ${
                    active
                      ? "bg-[#6B4E81] text-white"
                      : "bg-[#F8F4F9] text-[#2D2433] hover:bg-[#F0E5F5]"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div>
            <div className={`${MOBILE_LABEL} mb-2 px-1`}>Каталог</div>
            {/* Две колонки только с 360px: на 320px в колонку остаётся 110px
                под подпись, и самые длинные названия туда не помещаются
                даже с переносом. */}
            <div className="grid grid-cols-1 gap-1 min-[360px]:grid-cols-2">
              {categoriesWithAll.map((item) => (
                <Link key={item.id} to={`/catalog#${item.id}`} className={MOBILE_ROW}>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-[#E8DEEE] pt-4">
            <div className={`${MOBILE_LABEL} mb-2 px-1`}>Услуги</div>
            {/* Одна колонка, а не две: названия услуг длиннее названий
                разделов каталога («Съемки в детсадах и школах»), и в две
                колонки почти каждое ломалось на две строки. */}
            <div className="grid gap-1">
              {serviceItems.map((item) => (
                <Link
                  key={item.key}
                  to={`/services#${item.key}`}
                  className={MOBILE_ROW}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Контакты. На телефоне кнопка «Свяжитесь с нами» из шапки
              спрятана (места в ряду нет), и без этого блока связаться со
              студии было нечем, пока не долистаешь до подвала. */}
          <div className="grid grid-cols-2 gap-2 border-t border-[#E8DEEE] pt-4">
            <a
              href="tel:+79806616888"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#6B4E81] px-3 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90"
            >
              <Phone className="h-4 w-4 shrink-0" />
              Позвонить
            </a>
            <a
              href="https://vk.ru/sharydlyadushi"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#0077FF] px-3 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90"
            >
              <VkIcon className="h-4 w-auto shrink-0 fill-current" />
              Написать
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
