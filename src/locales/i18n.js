import { createI18n } from 'vue-i18n'
import en from './en.json';
import zh from './zh.json';
import jp from './jp.json';
import { bitable } from '@lark-base-open/js-sdk'

const supportedLanguages = ['en', 'zh','jp'];



export const i18n = createI18n({
  locale: 'en',
  allowComposition: true, // 占位符支持
  messages: {
    en: en,
    zh: zh,
    ja: jp
  }
})

bitable.bridge.getLanguage().then((lang) => {
  console.log("Current language set to:", lang);
  i18n.global.locale = lang
})

