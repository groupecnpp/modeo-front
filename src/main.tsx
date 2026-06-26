import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/global.css";
import { BrowserRouter, Route, Routes } from "react-router";
import Home from "./pages/Home/Home.tsx";
import Drafts from "./pages/Drafts/Drafts.tsx";
import DraftDetail from "./pages/DraftDetail/DraftDetail.tsx";
import NotFound from "./pages/NotFound/NotFound.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy/PrivacyPolicy.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter basename="/modeo-front">
            <Routes>
                <Route path="/" element={<App />}>
                    <Route index element={<Home />} />
                    <Route path="/drafts" element={<Drafts />} />
                    <Route path="/drafts/:id" element={<DraftDetail />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </BrowserRouter>
    </StrictMode>,
);
