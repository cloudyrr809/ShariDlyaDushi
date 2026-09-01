import { useState } from "react";
import { useCart, type CartItem } from "../../CartContext";
import { Minus, Plus, ShoppingCart, Check, Copy } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./sheet";
import { buildOrderText, copyText, openVkChat } from "../../lib/order";

export const CartDrawer = () => {
  const {
    cart,
    removeFromCart,
    addToCart,
    isCartOpen,
    setIsCartOpen,
    totalPrice,
  } = useCart();

  /* Ни имени, ни телефона: сайт персональные данные не собирает.
     Пожелания — свободный текст, который уезжает только в буфер обмена
     самого посетителя и никуда больше. */
  const [comment, setComment] = useState("");
  const [copied, setCopied] = useState(false);
  /* Заполняется, если браузер не дал доступ к буферу: тогда показываем
     текст заявки прямо в окне, чтобы её можно было скопировать руками. */
  const [manual, setManual] = useState("");

  /* ЗАЯВКА УХОДИТ ЧЕРЕЗ ВКОНТАКТЕ, а не через нашу отправку.

     Собираем текст, кладём в буфер обмена и открываем диалог со студией.
     Отправляет человек сам — значит сайт ничего не передаёт и не хранит,
     а Нина получает заявку там, где и так работает, вместе с профилем
     отправителя. */
  const handleOrder = async () => {
    const text = buildOrderText(
      cart.map((i: CartItem) => ({
        title: i.title,
        quantity: i.quantity,
        price: i.price,
      })),
      comment,
    );

    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      setManual("");
    } else {
      // Буфер недоступен — показываем текст, чтобы скопировать вручную
      setManual(text);
    }
    openVkChat();
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-lg bg-white border-l border-[#E8DEEE] flex flex-col p-0 z-[100]">
        <SheetHeader className="p-6 border-b border-[#E8DEEE]">
          <SheetTitle className="font-serif text-2xl text-[#2D2433] text-left">
            Ваша корзина
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-[#7E6E8A]">
            <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-base font-semibold">Список пуст</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart.map((item: CartItem) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="w-20 h-24 bg-[#F0E8F4] rounded-xl overflow-hidden shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#A093AB]">
                        Нет фото
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[15px] font-semibold text-[#2D2433] leading-tight mb-1">
                      {item.title}
                    </h4>
                    <p className="text-[#6B4E81] font-bold text-[15px] mb-3">
                      {item.price} ₽
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-7 h-7 rounded-full bg-[#F8F4F9] text-[#6B4E81] flex items-center justify-center hover:bg-[#E8DEEE] transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        className="w-7 h-7 rounded-full bg-[#F8F4F9] text-[#6B4E81] flex items-center justify-center hover:bg-[#E8DEEE] transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#E8DEEE] p-6 bg-[#FDFBFD]">
              <p className="text-sm font-medium text-[#5A4D66] bg-[#F0E8F4]/50 p-3 rounded-xl border border-[#E8DEEE] mb-5 text-center leading-relaxed">
                Список заказа скопируется, и откроется наш диалог во
                ВКонтакте — останется вставить его и отправить. Ответим и
                согласуем детали, доставку и точную стоимость.
              </p>

              <div className="mb-6">
                <textarea
                  placeholder="Пожелания: дата, цвета, повод"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl font-medium border border-[#E8DEEE] text-[15px] focus:outline-none focus:border-[#6B4E81] bg-white resize-none h-20"
                />
              </div>

              {/* Обновленный блок с итоговой суммой */}
              <div className="flex justify-between items-end mb-4">
                <span className="text-[#5A4D66] text-sm font-medium">
                  Предварительный итог:
                </span>
                <span className="font-serif text-2xl font-bold text-[#2D2433]">
                  ~{totalPrice} ₽
                </span>
              </div>

              {/* Успокаивающая подпись перед кнопкой */}
              <div className="text-center mb-3">
                <span className="text-xs text-[#7E6E8A] uppercase tracking-widest font-semibold">
                  Без оплаты онлайн • Оплата после подтверждения
                </span>
              </div>

              <button
                onClick={handleOrder}
                className="w-full cursor-pointer bg-[#6B4E81] text-white py-4 rounded-xl text-sm font-bold tracking-wide uppercase hover:bg-[#5A4D66] transition flex items-center justify-center gap-2"
              >
                {/* Подпись НЕ МЕНЯЕТСЯ после нажатия.

                    Раньше она превращалась в «Скопировано — вставьте во
                    ВКонтакте»: строка не помещалась, переносилась на две,
                    и галочка оставалась висеть слева от этого блока —
                    кнопка выглядела сломанной. Подтверждение теперь
                    отдельной строкой под кнопкой, и её ширина ни от чего
                    не зависит.

                    shrink-0 у значка — чтобы он не сплющивался, если
                    подпись всё-таки перенесётся на узком телефоне. */}
                <Copy className="h-5 w-5 shrink-0" />
                Заказать во ВКонтакте
              </button>

              {/* Подтверждение: что произошло и что делать дальше. */}
              {copied && (
                <p className="mt-3 flex items-start justify-center gap-2 text-center text-[15px] leading-snug font-semibold text-[#6B4E81]">
                  <Check className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>
                    Заказ скопирован. Вставьте его в открывшийся диалог —
                    Ctrl+V, на телефоне долгое нажатие и «Вставить».
                  </span>
                </p>
              )}

              {/* Браузер не дал доступ к буферу — показываем текст заявки,
                  чтобы её можно было скопировать вручную. Молча потерять
                  заказ нельзя. */}
              {manual && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold text-[#A64D6C]">
                    Скопируйте текст заявки и отправьте нам во ВКонтакте:
                  </p>
                  <textarea
                    readOnly
                    value={manual}
                    onFocus={(e) => e.currentTarget.select()}
                    className="h-40 w-full resize-none rounded-xl border border-[#E8DEEE] bg-white px-4 py-3 text-[15px] font-medium"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
