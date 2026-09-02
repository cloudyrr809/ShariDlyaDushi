import { useEffect, useRef } from "react";

/* ──────────────────────── ПОЛОСА ВКЛАДОК ────────────────────────

   Один компонент на «Каталог» и «Услуги». Раньше эта разметка была
   написана в обоих файлах по отдельности, и комментарии в них честно
   ссылались друг на друга («как в Каталоге») — верный признак, что
   расхождение уже началось: кегль и отступы успели разойтись.

   На широком экране вкладки стоят в строку и раздвинуты по всей ширине
   контента; на узком строка не влезает и прокручивается вбок. Это
   нормально и привычно — но с двумя оговорками, ради которых компонент
   и появился.

   ПЕРВАЯ: выбранная вкладка должна быть ВИДНА. По ссылке вида
   /catalog#women раздел открывался правильно, но сама вкладка «Для
   девушек» оставалась далеко за правым краем экрана — со стороны это
   выглядело так, будто открылся не тот раздел. Поэтому при каждой смене
   активной вкладки подводим её к середине полосы.

   ВТОРАЯ: кегль. Было 12px — размер сноски у того, что на этих страницах
   служит главным способом переключаться между разделами. */

export type Tab = { id: string; name: string };

export function TabStrip({
  tabs,
  active,
  onPick,
  gap = "gap-4",
  className = "",
}: {
  tabs: Tab[];
  active: string;
  onPick: (id: string) => void;
  /** Просвет между вкладками: у «Каталога» их девять и он уже. */
  gap?: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = box.current;
    const tab = scroller?.querySelector<HTMLElement>('[data-active="true"]');
    if (!scroller || !tab) return;
    // Прокрутки может не быть вовсе — тогда сдвигать нечего
    if (scroller.scrollWidth <= scroller.clientWidth) return;

    // Считаем по экранным координатам, а не по offsetLeft: тот отсчитывается
    // от ближайшего позиционированного предка, а он у двух страниц разный.
    const b = scroller.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    scroller.scrollBy({
      left: t.left - b.left - (b.width - t.width) / 2,
      behavior: "smooth",
    });
  }, [active]);

  return (
    <div
      ref={box}
      className={`scrollbar-hide w-full overflow-x-auto pt-6 ${className}`}
    >
      {/* 79rem = 76rem контента + 2×24px (px-6): внутренний край совпадает
          с логотипом и кнопкой шапки, у которой padding снаружи контейнера */}
      <div className="mx-auto max-w-[79rem] px-6">
        {/* min-w-max + w-full: на широком экране строка занимает всю ширину
            и вкладки раздвигаются по ней, на узком — становится шире экрана
            и прокручивается. justify-between раздаёт просвет МЕЖДУ вкладками,
            а не внутрь них: первая обязана стоять ровно по левому краю сетки
            страницы. */}
        <div
          className={`flex w-full min-w-max items-center justify-between ${gap}`}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onPick(tab.id)}
              data-active={active === tab.id}
              /* 13px, а не прежние 12: это основная навигация раздела, а не
                 сноска. На десктопе девять категорий каталога в этот кегль
                 по-прежнему укладываются в строку без прокрутки — замерено.

                 Активная вкладка — тёмная полоса и тот же тёмный, что у
                 заголовка страницы: связывает панель с ней в один блок. */
              className={`shrink-0 cursor-pointer border-b-2 pb-4 text-[13px] font-semibold tracking-wider whitespace-nowrap uppercase transition-colors duration-300 ${
                active === tab.id
                  ? "border-[#2D2433] text-[#2D2433]"
                  : "border-transparent text-[#7E6E8A] hover:border-[#D9C6E4] hover:text-[#2D2433]"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
