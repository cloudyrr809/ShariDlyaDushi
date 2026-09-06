import { useEffect, useRef } from "react";

/* ═══════════ ВСЕГДА ВИДНЫЙ ПОЛЗУНОК ПРОКРУТКИ ═══════════

   Зачем свой, если есть настоящий. Настоящую полосу на телефоне не
   вытащить: и в iOS Safari, и в Chrome она НАКЛАДНАЯ — появляется на
   время движения пальца и тает через полсекунды. `scrollbar-width`,
   `scrollbar-color` и `::-webkit-scrollbar` там либо игнорируются, либо
   не мешают ей всё равно исчезнуть. А неподвижный блок с обрезанным
   текстом выглядит дочитанным: человек листает страницу дальше, будучи
   уверен, что прочёл всё.

   Тень-растворение у кромки (.scroll-hint в index.css) говорит «текст
   продолжается», но не говорит СКОЛЬКО его осталось. Ползунок говорит.
   Поэтому они дополняют друг друга, а не заменяют.

   Показывается только там, где есть что прокручивать, и только ниже md:
   на десктопе настоящая полоса и так всегда на месте.

   ⚠️ Положение пишем ПРЯМО В СТИЛЬ узла, а не через состояние React.
   Прокрутка сыплет событиями каждый кадр, и setState на каждое из них
   перерисовывал бы всю карточку отзыва вместе с фотографиями. */

export function ScrollThumb({
  target,
}: {
  /** Ссылка на сам прокручиваемый блок. Он должен лежать внутри предка с
      position: relative — ползунок встаёт по его правому краю. */
  target: React.RefObject<HTMLElement | null>;
}) {
  const track = useRef<HTMLSpanElement | null>(null);
  const thumb = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = target.current;
    const t = track.current;
    const th = thumb.current;
    if (!el || !t || !th) return;

    const update = () => {
      const { scrollHeight, clientHeight, scrollTop } = el;
      const запас = scrollHeight - clientHeight;

      // Прокручивать нечего — прячем целиком, чтобы не мозолил глаза
      if (запас <= 2) {
        t.style.opacity = "0";
        return;
      }
      t.style.opacity = "1";

      /* Высота ползунка — доля видимого от всего, но не меньше 28px:
         у очень длинного текста честная доля вышла бы в три пикселя, и
         разглядеть её было бы нельзя. */
      const h = Math.max(28, (clientHeight / scrollHeight) * clientHeight);
      const y = (scrollTop / запас) * (clientHeight - h);
      th.style.height = `${h}px`;
      th.style.transform = `translateY(${y}px)`;
    };

    update();
    el.addEventListener("scroll", update, { passive: true });

    /* Содержимое может измениться без прокрутки — например, шрифт
       догрузился и текст перевёрстан. Тогда пересчитываем тоже. */
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [target]);

  return (
    <span
      ref={track}
      aria-hidden="true"
      className="pointer-events-none absolute top-0 right-0 bottom-0 w-1 rounded-full bg-[#6B4E81]/10 transition-opacity duration-200 md:hidden"
    >
      <span
        ref={thumb}
        className="absolute top-0 left-0 block w-full rounded-full bg-[#6B4E81]/55"
      />
    </span>
  );
}
