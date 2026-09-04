import Lenis from "lenis";

/* ──────────────────────── ПЛАВНАЯ ПРОКРУТКА ────────────────────────

   Тот же «тягучий» скролл, что на augen.pro. Там он сделан на библиотеке
   Lenis — она перехватывает колесо мыши и трекпад и доводит страницу до
   новой позиции по инерции, вместо резкого шага браузера. Разметку это
   не трогает: просто плавнее едет.

   Настройки — как у augen: длительность добега 1.2 c и та же кривая
   замедления (expo-out). Тачскрин оставляем РОДНОЙ прокрутке
   (syncTouch: false) — на телефоне инерция уже своя, а перехват там
   только добавляет рывков.

   Экземпляр держим на уровне модуля: до него дотягивается ScrollToTop в
   main.tsx, чтобы переход между страницами и прыжок к якорю шли через ту
   же самую прокрутку, а не спорили с ней. */

let instance: Lenis | null = null;

/** Текущий экземпляр Lenis или null, пока плавная прокрутка не запущена
    (не запускается при системной настройке «меньше движения»). */
export function getLenis(): Lenis | null {
  return instance;
}

/**
 * Замораживает плавную прокрутку, пока открыт оверлей, и возвращает
 * функцию возобновления.
 *
 * Одного `body { overflow: hidden }` мало: Lenis двигает страницу сам и
 * про запрет на теле не знает — под открытым окном фон продолжал бы
 * ехать. Зовём рядом с той же блокировкой прокрутки, а возобновление
 * отдаём в cleanup эффекта.
 */
export function pauseSmoothScroll(): () => void {
  const lenis = instance;
  if (!lenis) return () => {};
  lenis.stop();
  return () => lenis.start();
}

/** Запускает плавную прокрутку и цикл кадров. Возвращает функцию
    остановки — её отдаём из useEffect как cleanup. */
export function startSmoothScroll(): () => void {
  if (typeof window === "undefined") return () => {};

  // «Меньше движения» — уважаем так же, как в Hero и счётчиках: оставляем
  // родную мгновенную прокрутку.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => {};
  }

  if (instance) return () => {};

  instance = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1.5,
  });

  /* ─── ПОЛЗУНОК ПРОКРУТКИ ПРОТИВ ИНЕРЦИИ ───

     Пока Lenis доводит страницу после колеса (isScrolling === "smooth"),
     он не слушает чужие перемещения и каждый кадр возвращает страницу на
     свою траекторию. Стоило крутануть колесо и сразу схватить ползунок —
     и страница ехала не туда, куда её тянут.

     Замер: колесо вниз, затем тянем ползунок вверх на 700px. Ожидаемая
     позиция 1608, фактическая 2700 — промах на 1092px, причём страница
     всё это время ползла ВНИЗ. В простое (без работающей анимации) Lenis
     синхронизируется сам, промах 0 — то есть чинить нужно ровно этот
     случай.

     Как ловим: между кадрами страницу двигает только браузер. Если перед
     очередным кадром фактическая позиция разошлась с той, которую Lenis
     нарисовал в прошлом кадре, значит её сдвинули мимо него — принимаем
     новую позицию за свою и гасим анимацию. Порог 2px: собственная
     запись расходится максимум на пиксель округления. */
  /* Свои вызовы scrollTo из-под сторожа выводим: сторож должен ловить
     ТОЛЬКО постороннее движение страницы (ползунок), а не наши же
     переходы к якорю и возвраты к началу блока. Иначе он гасил бы
     собственную анимацию, стоит вёрстке под ней поменять высоту. */
  const rawScrollTo = instance.scrollTo.bind(instance);
  let ownScrollUntil = 0;
  instance.scrollTo = ((...args: Parameters<typeof rawScrollTo>) => {
    ownScrollUntil = performance.now() + 2000;
    return rawScrollTo(...args);
  }) as typeof instance.scrollTo;

  let raf = 0;
  const loop = (time: number) => {
    const lenis = instance;
    if (lenis) {
      if (
        time > ownScrollUntil &&
        lenis.isScrolling === "smooth" &&
        Math.abs(window.scrollY - lenis.animatedScroll) > 2
      ) {
        rawScrollTo(window.scrollY, { immediate: true, force: true });
      }
      lenis.raf(time);
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    instance?.destroy();
    instance = null;
  };
}
