/**
 * Фон страниц-«обложек» (Акции, Лента): размытые цветные пятна плюс
 * рисованное небо back1.jpg, которым страница открывается и закрывается.
 *
 * Вынесено в общий компонент не ради экономии строк, а чтобы «обложка»
 * была одним объектом, а не похожими копиями в каждом файле: поправишь
 * плотность вуали здесь — поменяется везде, где этот тип используется.
 *
 * Кладётся первым ребёнком контейнера с position:relative. Весь контент
 * страницы должен идти с relative z-10, иначе окажется под фоном.
 */
export function SkyBackdrop({
  bottom = true,
}: {
  /** Нижняя полоса неба. Выключается, если страница заканчивается
      чем-то плотным — тогда небо под ним всё равно не видно. */
  bottom?: boolean;
}) {
  /* Одна и та же картинка сверху и снизу, но кадрируется по-разному:
     сверху берём верхнюю треть неба, снизу — нижнюю. Иначе на длинной
     странице дважды виден один и тот же рисунок облаков. */
  const sky = {
    filter: "blur(2px) brightness(1.1) saturate(0.75)",
  };

  return (
    <>
      {/* Размытые пятна — убирают стерильную белизну без единой линии */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
      >
        <div className="absolute top-[8%] left-[-10%] h-[560px] w-[560px] rounded-full bg-[#FFB6C1]/28 blur-[120px]" />
        <div className="absolute top-[30%] right-[-8%] h-[540px] w-[540px] rounded-full bg-[#6B4E81]/14 blur-[140px]" />
        <div className="absolute top-[58%] left-[-6%] h-[580px] w-[580px] rounded-full bg-[#D4839A]/20 blur-[150px]" />
        <div className="absolute right-[6%] bottom-[-2%] h-[520px] w-[520px] rounded-full bg-[#6B4E81]/14 blur-[130px]" />
      </div>

      {/* ВЕРХНЯЯ ПОЛОСА НЕБА.
          Маска на ОБЁРТКЕ, а не на картинке: под ней лежит ещё
          осветляющая вуаль, и растворяться они должны вместе — иначе на
          сходе остаётся молочная плёнка без картинки.

          Вуаль обязательна: у неба по углам тёмно-фиолетовые облака, на
          них тёмный текст не набирает норму контраста. Одного brightness
          мало — он тянет вверх и светлые участки, небо выцветает в кашу. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[520px] md:h-[720px]"
        style={{
          maskImage:
            "linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.9) 40%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.9) 40%, transparent 100%)",
        }}
      >
        <img
          src="/assets/back1.jpg"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
          style={{ ...sky, objectPosition: "50% 38%" }}
        />
        <div className="absolute inset-0 bg-[#FDFBFD]/68" />
      </div>

      {/* НИЖНЯЯ — зеркально: небо проявляется к концу страницы.
          Последние проценты маски снова уходят вниз, потому что сразу за
          страницей начинается белый подвал: без этого схода картинка
          обрывалась бы об него ступенькой. */}
      {bottom && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[460px] md:h-[620px]"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.85) 55%, #000 82%, rgba(0,0,0,0.5) 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.85) 55%, #000 82%, rgba(0,0,0,0.5) 100%)",
          }}
        >
          <img
            src="/assets/back1.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            style={{ ...sky, objectPosition: "50% 62%" }}
          />
          <div className="absolute inset-0 bg-[#FDFBFD]/68" />
        </div>
      )}
    </>
  );
}
