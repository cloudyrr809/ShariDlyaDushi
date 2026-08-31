import React, { useState } from "react";
import { useCart, type CartItem } from "../../CartContext";
import { Minus, Plus, ShoppingCart, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./sheet";

// --- ВСТАВЬ СВОИ ДАННЫЕ ИЗ BOTFATHER СЮДА ---
const BOT_TOKEN = "8755216041:AAEXPq2wM9uW5hXJyHlDCPx9WVPnfcfxxb0";
const CHAT_ID = "1206262308";

export const CartDrawer = () => {
  const {
    cart,
    removeFromCart,
    addToCart,
    isCartOpen,
    setIsCartOpen,
    totalPrice,
    clearCart,
  } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- УМНАЯ МАСКА ДЛЯ ТЕЛЕФОНА ---
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputNumbersValue = e.target.value.replace(/\D/g, "");
    let formattedInputValue = "";

    if (!inputNumbersValue) {
      setPhone("");
      return;
    }

    if (["7", "8", "9"].includes(inputNumbersValue[0])) {
      if (inputNumbersValue[0] === "9")
        inputNumbersValue = "7" + inputNumbersValue;

      formattedInputValue = "+7 ";
      if (inputNumbersValue.length > 1) {
        formattedInputValue += "(" + inputNumbersValue.substring(1, 4);
      }
      if (inputNumbersValue.length >= 5) {
        formattedInputValue += ") " + inputNumbersValue.substring(4, 7);
      }
      if (inputNumbersValue.length >= 8) {
        formattedInputValue += "-" + inputNumbersValue.substring(7, 9);
      }
      if (inputNumbersValue.length >= 10) {
        formattedInputValue += "-" + inputNumbersValue.substring(9, 11);
      }
    } else {
      formattedInputValue = "+" + inputNumbersValue.substring(0, 15);
    }

    setPhone(formattedInputValue);
  };

  const isPhoneValid = phone.replace(/\D/g, "").length === 11;

  const handleSubmitOrder = async () => {
    if (!name || !isPhoneValid) {
      alert("Пожалуйста, заполните имя и корректный номер телефона!");
      return;
    }

    setIsSubmitting(true);

    let message = `🚀 <b>Новая заявка с сайта!</b>\n\n`;
    message += `👤 <b>Имя:</b> ${name}\n`;
    message += `📞 <b>Телефон:</b> ${phone}\n`;
    if (comment) message += `💬 <b>Комментарий:</b> ${comment}\n\n`;

    message += `🛍 <b>ПРЕДВАРИТЕЛЬНЫЙ ВЫБОР:</b>\n`;
    cart.forEach((item: CartItem, index: number) => {
      message += `${index + 1}. ${item.title} — ${item.quantity} шт. (по ${item.price} ₽)\n`;
    });

    message += `\n💰 <b>ПРИМЕРНАЯ СУММА: ${totalPrice} ₽</b>`;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            text: message,
            parse_mode: "HTML",
          }),
        },
      );

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsCartOpen(false);
          clearCart();
          setIsSuccess(false);
          setName("");
          setPhone("");
          setComment("");
        }, 4000); // Увеличил время показа успешного окна до 4 секунд, чтобы успели прочитать
      } else {
        alert(
          "Произошла ошибка при отправке. Попробуйте еще раз или позвоните нам.",
        );
      }
    } catch (error) {
      console.error("Ошибка Telegram API:", error);
      alert("Ошибка сети. Попробуйте позже.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-lg bg-white border-l border-[#E8DEEE] flex flex-col p-0 z-[100]">
        <SheetHeader className="p-6 border-b border-[#E8DEEE]">
          <SheetTitle className="font-serif text-2xl text-[#2D2433] text-left">
            Ваша корзина
          </SheetTitle>
        </SheetHeader>

        {isSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-[#F0E8F4] rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">✨</span>
            </div>
            {/* Обновленный текст успеха */}
            <h3 className="font-serif text-2xl text-[#6B4E81] mb-3">
              Заявка получена!
            </h3>
            <p className="text-[#5A4D66] text-[15px] font-medium leading-relaxed max-w-xs mx-auto">
              Мы увидели, какие шарики вам понравились. Скоро мы свяжемся с
              вами, чтобы обсудить все детали, доставку и точную стоимость.
            </p>
          </div>
        ) : cart.length === 0 ? (
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
                Отправьте заявку, и мы свяжемся с вами для согласования деталей
                заказа и условий доставки.
              </p>

              <div className="space-y-3 mb-6">
                <input
                  type="text"
                  placeholder="Ваше имя *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 font-medium rounded-xl border border-[#E8DEEE] text-[15px] focus:outline-none focus:border-[#6B4E81] bg-white"
                />

                <input
                  type="tel"
                  placeholder="+7 (___) ___-__-__ *"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={18}
                  className="w-full px-4 py-3 rounded-xl font-medium border border-[#E8DEEE] text-[15px] focus:outline-none focus:border-[#6B4E81] bg-white"
                />

                <textarea
                  placeholder="Комментарий (дата, пожелания)"
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
                onClick={handleSubmitOrder}
                disabled={isSubmitting || !name.trim() || !isPhoneValid}
                className="w-full bg-[#6B4E81] text-white py-4 rounded-xl text-sm font-bold tracking-wide uppercase hover:bg-[#5A4D66] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Отправить заявку"
                )}
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
