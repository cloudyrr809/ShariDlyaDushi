// src/components/Footer.tsx
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

const SELLER = "";
const INN = "";

// Векторные иконки соцсетей
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

export const Footer = () => {
  return (
    <footer className="border-t border-[#E8DEEE] px-6 py-6 bg-white text-sm text-[#5A4D66] mt-auto">
      <div className="max-w-[76rem] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <p className="inline-block font-miana text-2xl text-[#6B4E81]">
            ШарыДляДуши
          </p>
          <p className="mt-6 text-sm font-medium whitespace-nowrap text-[#5A4D66]">
            Создаем настроение и яркие эмоции
          </p>
        </div>

        <div className="text-center md:text-right flex flex-col items-center md:items-end">
          <p className="font-medium text-[#2D2433] text-sm">Контакты:</p>
          <a
            href="mailto:info@sharidlyadushi.com"
            className="mt-1 block font-medium text-[#2D2433] hover:text-[#6B4E81] transition text-sm"
          >
            info@sharidlyadushi.com
          </a>
          <a
            href="tel:+79806616888"
            className="mt-0.5 block font-medium text-[#2D2433] hover:text-[#6B4E81] transition"
          >
            8 (980) 661-6888
          </a>

          <div className="flex items-center gap-2.5 mt-3">
            <a
              href="https://vk.ru/sharydlyadushi"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-full border border-[#E8DEEE] bg-[#F8F4F9] text-[#6B4E81] flex items-center justify-center hover:bg-[#6B4E81] hover:text-white transition shadow-sm"
            >
              <VkIcon />
            </a>
            <a
              href="https://www.instagram.com/sharydlyadushi"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-full border border-[#E8DEEE] bg-[#F8F4F9] text-[#6B4E81] flex items-center justify-center hover:bg-[#6B4E81] hover:text-white transition shadow-sm"
            >
              <InstagramIcon />
            </a>
          </div>
        </div>
      </div>
      <div className="mt-8 space-y-2 border-t border-[#F8F4F9] pt-6 text-center text-[13px] font-medium text-[#7E6E8A]">
        {/* Кегль 13px, а не 12: мелкий текст на сайте под запретом, а этот
            блок вдобавок обязан быть читаемым — его для того и вешают. */}
        {SELLER && (
          <p className="text-[#5A4D66]">
            {SELLER}
            {INN && ` · ИНН ${INN}`}
          </p>
        )}
        <p>
          Сведения на сайте носят справочный характер и не являются публичной
          офертой. Состав, стоимость и сроки согласуются в переписке до оплаты.
        </p>
        <p>© 2026 Шары Для Души. Все права защищены.</p>
      </div>
    </footer>
  );
};
