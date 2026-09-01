import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import App from "./App.tsx";
import About from "./About.tsx";
import Promotions from "./Promotions.tsx";
import Catalog from "./Catalog.tsx";
import Services from "./Services.tsx"; // <-- ДОБАВИЛИ ИМПОРТ
import Feed from "./Feed.tsx";
import Admin from "./Admin.tsx";
import { CartProvider } from "./CartContext.tsx";
import { Header } from "./components/ui/Header.tsx";
import { Footer } from "./components/ui/Footer.tsx";
import { CartDrawer } from "./components/ui/CartDrawer.tsx";
import "./index.css";

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
    } else {
      setTimeout(() => {
        const element = document.getElementById(hash.replace("#", ""));
        if (element) {
          const y = element.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 100);
    }
  }, [pathname, hash]);

  return null;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CartProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen bg-[#FDFBFD] text-[#2D2433] flex flex-col">
          <Header />
          
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/about" element={<About />} />
              <Route path="/promotions" element={<Promotions />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/services" element={<Services />} /> {/* <-- ИСПРАВЛЕННЫЙ СИНТАКСИС */}
              <Route path="/feed" element={<Feed />} />
              {/* Админка «Ленты». В меню её намеренно нет: адрес набирают
                  вручную, а доступ закрывает вход по паролю и правила
                  доступа на стороне базы. */}
              <Route path="/admin" element={<Admin />} />
              {/* «Фотопроекты» и «Наши работы» объединены в «Ленту».
                  Прежние адреса не удаляем, а перенаправляем: по ним могли
                  остаться ссылки в переписке, закладках и у поисковика.
                  replace — чтобы старый адрес не оседал в истории браузера
                  и кнопка «назад» не возвращала на редирект. */}
              <Route
                path="/photoprojects"
                element={<Navigate to="/feed" replace />}
              />
              <Route path="/gallery" element={<Navigate to="/feed" replace />} />
              <Route path="*" element={<App />} />
            </Routes>
          </main>

          <Footer />
          <CartDrawer />
        </div>
      </BrowserRouter>
    </CartProvider>
  </React.StrictMode>,
);