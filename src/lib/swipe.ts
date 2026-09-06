import { useEffect, useRef } from "react";

/* ═══════════ ЛИСТАНИЕ ПАЛЬЦЕМ ═══════════

   Один приём на все карусели сайта: отзывы на главной, ролики на «О нас».
   Держим его здесь, а не копией в каждом файле — пороги и правило «что
   считать листанием» должны быть одинаковыми везде, иначе на одной
   карусели палец срабатывает, а на соседней нет, и это читается как
   поломка.

   ПОЧЕМУ НЕ onTouchStart/onTouchEnd В JSX, А НАТИВНЫЕ СЛУШАТЕЛИ.

   Пальцем редко ведут идеально по горизонтали: почти всегда есть увод
   вверх или вниз. Браузер видит вертикальную составляющую и начинает
   прокручивать страницу — карусель листается, и одновременно экран едет.
   Со стороны это выглядит так, будто сайт дёргается на каждом свайпе.

   Чтобы этого не было, горизонтальному движению надо запретить
   прокрутку — то есть вызвать preventDefault на touchmove. А React вешает
   touchmove ПАССИВНО, и preventDefault там просто игнорируется (браузер
   заранее пообещал себе, что обработчик не будет мешать прокрутке).
   Поэтому слушатели ставим руками, с passive: false.

   Направление определяем ОДИН РАЗ за жест, по первым восьми пикселям, и
   дальше не меняем:
     • ушли в бок  → жест наш, страницу держим на месте;
     • ушли вниз   → жест не наш, не вмешиваемся вовсе, пусть прокручивает
                     страницу или текст внутри карточки.
   Без такой «защёлки» палец по диагонали то листал бы, то прокручивал —
   на каждом кадре по-разному. */

/** Насколько далеко надо провести пальцем, чтобы это засчиталось за
    листание, а не за дрожание руки при обычном тапе. */
export const SWIPE = 48;

/** По скольким пикселям решаем, куда человек ведёт палец. Меньше — и
    решение принимается по дрожанию; больше — и браузер успевает начать
    прокрутку раньше нас, а начатую прокрутку preventDefault уже не
    остановит. */
const INTENT = 8;

/**
 * Горизонтальный свайп по блоку. Возвращает ref — повесить на сам блок:
 * `<div ref={useSwipe(fn)}>`.
 *
 * @param onSwipe вызывается с 1 при движении справа налево (вперёд) и −1
 *                при движении слева направо (назад)
 * @param stop    гасить всплытие: нужно вложенной карусели, чтобы одно
 *                движение пальцем не сработало заодно и во внешней
 */
export function useSwipe<T extends HTMLElement>(
  onSwipe: (dir: 1 | -1) => void,
  stop = false,
) {
  const ref = useRef<T | null>(null);
  /* Обработчик держим в ref и ставим слушателей ОДИН раз. Иначе каждый
     перерисовыванный компонент снимал бы и вешал их заново — а между
     этими двумя мгновениями как раз проходит палец. */
  const cb = useRef(onSwipe);
  // Обновляем после отрисовки, а не в её ходе: во время рендера ref
  // трогать нельзя, React на это ругается справедливо.
  useEffect(() => {
    cb.current = onSwipe;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let from: { x: number; y: number } | null = null;
    let lock: "" | "x" | "y" = "";

    const onStart = (e: TouchEvent) => {
      if (stop) e.stopPropagation();
      const t = e.touches[0];
      from = { x: t.clientX, y: t.clientY };
      lock = "";
    };

    const onMove = (e: TouchEvent) => {
      if (!from) return;
      if (stop) e.stopPropagation();
      const t = e.touches[0];
      const dx = t.clientX - from.x;
      const dy = t.clientY - from.y;

      if (!lock && (Math.abs(dx) > INTENT || Math.abs(dy) > INTENT)) {
        lock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      // Жест наш — страница остаётся на месте
      if (lock === "x" && e.cancelable) e.preventDefault();
    };

    const onEnd = (e: TouchEvent) => {
      const start = from;
      const был = lock;
      from = null;
      lock = "";
      if (!start || был !== "x") return;
      if (stop) e.stopPropagation();
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      if (Math.abs(dx) < SWIPE) return;
      cb.current(dx < 0 ? 1 : -1);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [stop]);

  return ref;
}
