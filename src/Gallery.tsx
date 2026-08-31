import { Images, Sparkles } from "lucide-react";

export default function Gallery() {
  return (
    <div className="bg-[#FDFBFD] text-[#2D2433]">
      {/* HERO */}
      <section className="px-6 pt-16 pb-12 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-[#F8F4F9] border border-[#E8DEEE] px-5 py-2 rounded-full mb-6">
          <Images className="w-4 h-4 text-[#6B4E81]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6B4E81]">
            Портфолио студии
          </span>
        </div>
        <h1 className="font-serif text-4xl md:text-6xl text-[#2D2433] leading-tight tracking-tight">
          <span className="font-bold">Наши Работы</span> <br />
          <span className="font-normal opacity-90">Композиции и Фотосессии</span>
        </h1>
        <p className="mt-5 text-sm md:text-base text-[#7E6E8A] max-w-2xl mx-auto leading-relaxed">
          Здесь скоро появится галерея наших композиций из шаров и кадров с
          фотосессий.
        </p>
      </section>

      {/* ЗАГЛУШКА */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center text-center bg-[#F8F4F9] border border-dashed border-[#E8DEEE] rounded-3xl py-24 px-6">
          <Sparkles className="w-8 h-8 text-[#6B4E81] mb-4" />
          <p className="text-sm text-[#7E6E8A]">
            Раздел в разработке — работы появятся здесь совсем скоро.
          </p>
        </div>
      </section>
    </div>
  );
}
