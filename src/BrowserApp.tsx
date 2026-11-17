"use client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { I18nProvider } from "./lib/i18n";
import { AuthProvider } from "./auth/AuthProvider";
import { ToastProvider } from "./hooks/useToast";
export default function BrowserApp() { return <BrowserRouter><I18nProvider><ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider></I18nProvider></BrowserRouter>; }
