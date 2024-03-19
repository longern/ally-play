import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      "Cancel ready": "Cancel ready",
      "Create room": "Create room",
      Delete: "Delete",
      "Get ready": "Get ready",
      "Join room": "Join room",
      "Not ready": "Not ready",
      Start: "Start",
      Ready: "Ready",
      Reload: "Reload",
    },
  },
};

i18n
  .use(initReactI18next)
  .use({
    type: "languageDetector",
    async: true,
    detect: (cb: (lang: string) => void) => cb(window.navigator.language),
    init: () => {},
    cacheUserLanguage: () => {},
  })
  .init({
    resources,
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
