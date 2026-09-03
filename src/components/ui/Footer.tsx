// src/components/Footer.tsx
import { Link } from "react-router-dom";

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

/* ══════════════════════ УПАВШИЕ ШАРЫ ВНИЗУ ══════════════════════

   Нижняя кромка подвала завалена шарами — будто их принесли, поставили и
   они разбрелись. Каждый прижат к нижнему краю и УТОПЛЕН за него: видно
   только верхнюю часть, остальное срезает край страницы. Отсюда и
   ощущение кучи, а не выложенного в ряд орнамента.

   Что делает картинку живой:
   • sink — на сколько шар ушёл вниз, в долях СВОЕЙ высоты. У всех разный,
     поэтому верхушки не выстраиваются по линейке;
   • rot — наклон. Ни один шар не стоит строго вертикально;
   • w — размер через clamp: на телефоне куча ужимается сама, без
     отдельной раскладки. Разброс размеров даёт ближний и дальний план;
   • op — прозрачность. Шары не должны спорить с текстом над ними, а
     разная плотность добавляет глубины;
   • z — кто перед кем. Мелкие и бледные уходят назад, крупные выходят
     вперёд, и куча перестаёт быть плоской аппликацией.

   Значения подобраны на глаз и намеренно «некруглые»: ровные числа
   складываются в узор, а узор — это уже не куча. */
const FALLEN = [
  { src: "/assets/ballon3.png", left: "-4%", w: "clamp(96px, 17vw, 232px)", sink: 50, rot: -13, op: 0.36, z: 2 },
  { src: "/assets/ballon1.png", left: "4%", w: "clamp(72px, 12vw, 168px)", sink: 63, rot: 9, op: 0.24, z: 1 },
  { src: "/assets/ballon5.png", left: "11%", w: "clamp(88px, 15vw, 204px)", sink: 42, rot: 17, op: 0.33, z: 3 },
  { src: "/assets/ballon2.png", left: "18%", w: "clamp(64px, 11vw, 146px)", sink: 68, rot: -21, op: 0.22, z: 1 },
  { src: "/assets/ballon6.png", left: "25%", w: "clamp(92px, 16vw, 218px)", sink: 47, rot: 6, op: 0.35, z: 2 },
  { src: "/assets/ballon4.png", left: "32%", w: "clamp(76px, 13vw, 178px)", sink: 58, rot: -8, op: 0.26, z: 1 },
  { src: "/assets/ballon1.png", left: "39%", w: "clamp(98px, 17vw, 240px)", sink: 40, rot: 14, op: 0.38, z: 3 },
  { src: "/assets/ballon3.png", left: "46%", w: "clamp(68px, 12vw, 156px)", sink: 66, rot: -17, op: 0.23, z: 1 },
  { src: "/assets/ballon5.png", left: "53%", w: "clamp(90px, 15vw, 210px)", sink: 45, rot: 11, op: 0.32, z: 2 },
  { src: "/assets/ballon2.png", left: "60%", w: "clamp(74px, 13vw, 172px)", sink: 61, rot: -6, op: 0.27, z: 1 },
  { src: "/assets/ballon6.png", left: "67%", w: "clamp(94px, 16vw, 224px)", sink: 43, rot: 19, op: 0.35, z: 2 },
  { src: "/assets/ballon4.png", left: "74%", w: "clamp(70px, 12vw, 162px)", sink: 65, rot: -12, op: 0.24, z: 1 },
  { src: "/assets/ballon3.png", left: "81%", w: "clamp(97px, 17vw, 236px)", sink: 46, rot: 8, op: 0.37, z: 3 },
  { src: "/assets/ballon1.png", left: "88%", w: "clamp(78px, 13vw, 180px)", sink: 59, rot: -19, op: 0.25, z: 1 },
  // Крайний правый утоплен глубже соседей нарочно. При мелком заглублении
  // от него оставался виден ровно круглый бок, который читался не как часть
  // кучи, а как отдельный шарик, случайно подлетевший к логотипу.
  { src: "/assets/ballon5.png", left: "91%", w: "clamp(92px, 16vw, 236px)", sink: 56, rot: 15, op: 0.34, z: 2 },
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
  return (
    /* overflow-hidden — то, что срезает шары по нижнему краю. Без него они
       вылезли бы за подвал и растянули страницу вниз пустотой.

       Фон уходит книзу в сиреневый: шары лежат на тоне чуть плотнее, чем
       поле под текстом, и куча читается как земля, а не как наклейки на
       белом. */
    <footer className="relative mt-auto overflow-hidden bg-gradient-to-b from-[#FDFBFD] via-[#F8F3FA] to-[#F0E5F5] px-6 pt-16 pb-44 md:pt-20 md:pb-52">
      {/* СЛОЙ С ШАРАМИ. Декоративный: из озвучки убран, курсор не ловит —
          иначе он накрыл бы ссылки над собой. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {FALLEN.map((b, i) => (
          <img
            key={i}
            src={b.src}
            alt=""
            loading="lazy"
            className="absolute bottom-0 max-w-none select-none"
            style={{
              left: b.left,
              width: b.w,
              opacity: b.op,
              zIndex: b.z,
              // translate в процентах считается от размера самой картинки,
              // поэтому «утопить наполовину» работает одинаково и на
              // телефоне, и на широком экране, где шар вчетверо больше.
              transform: `translateY(${b.sink}%) rotate(${b.rot}deg)`,
            }}
          />
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
            <h2 className={COL_TITLE}>Мы в сети</h2>
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
                {/* Не ссылка: город — это справка о том, где нас искать, а
                    вести отсюда некуда. */}
                <span className="text-[15px] font-semibold tracking-[0.08em] text-[#7E6E8A] uppercase">
                  Ярославль
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* НИЖНЯЯ ПОЛОСА. Слева обязательные сведения о продавце, справа
            логотип — на образце в этих же местах стоят копирайт и подпись
            студии, сделавшей сайт. */}
        <div className="mt-16 flex flex-col gap-6 border-t border-[#E2D3EC] pt-8 md:mt-20 md:flex-row md:items-end md:justify-between">
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

          <div className="shrink-0 md:text-right">
            <p className="font-miana pb-[0.3em] text-3xl leading-none text-[#6B4E81]">
              ШарыДляДуши
            </p>
            <p className="text-[13px] font-medium text-[#7E6E8A]">
              Дарим настроение и яркие эмоции
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
