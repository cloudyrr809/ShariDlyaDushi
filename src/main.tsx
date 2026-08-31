import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import App from "./App.tsx";
import About from "./About.tsx";
import Promotions from "./Promotions.tsx";
import Catalog from "./Catalog.tsx";
import Services from "./Services.tsx"; // <-- ДОБАВИЛИ ИМПОРТ
import PhotoProjects from "./PhotoProjects.tsx";
import Gallery from "./Gallery.tsx";
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
              <Route path="/photoprojects" element={<PhotoProjects />} />
              <Route path="/gallery" element={<Gallery />} />
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