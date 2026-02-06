import { createApp } from "vue";
import { createPinia } from "pinia";
import { createI18n } from "vue-i18n";
import router from "./router";
import App from "./App.vue";
import "./assets/styles/main.css";

// i18n messages
import ko from "./locales/ko.json";
import en from "./locales/en.json";
import ja from "./locales/ja.json";
import zh from "./locales/zh.json";

const i18n = createI18n({
  legacy: false,
  locale: "ko",
  fallbackLocale: "ko",
  messages: {
    ko,
    en,
    ja,
    zh,
  },
});

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(i18n);

app.mount("#app");
