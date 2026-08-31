import React, { createContext, useContext, useState } from "react";

// Описываем структуру товара в корзине
export interface CartItem {
  id: number;
  title: string;
  price: number;
  image: string;
  quantity: number;
}

// Описываем структуру контекста
interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  totalPrice: number;
}

// Создаем контекст
const CartContext = createContext<CartContextType | undefined>(undefined);

// Провайдер, который будет оборачивать наше приложение
export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Добавление товара
  const addToCart = (product: any) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        // Если товар уже есть, увеличиваем количество
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      // Если товара нет, добавляем новый.
      // Проверяем, есть ли картинки (images) или это уже CartItem (image)
      const productImage =
        product.images && product.images.length > 0
          ? product.images[0]
          : product.image;

      return [
        ...prevCart,
        {
          id: product.id,
          title: product.title,
          price: product.price,
          image: productImage || "", // Подставляем картинку или пустую строку
          quantity: 1,
        },
      ];
    });
  };

  // Удаление товара (уменьшение количества или полное удаление)
  const removeFromCart = (id: number) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === id);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item,
        );
      }
      return prevCart.filter((item) => item.id !== id);
    });
  };

  // Очистка корзины
  const clearCart = () => setCart([]);

  // Подсчет общей суммы
  const totalPrice = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// Хук для использования корзины
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
