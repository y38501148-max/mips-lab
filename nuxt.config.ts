export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  modules: ['@ant-design-vue/nuxt'],
  antd: { extractStyle: true },
  css: ['~/assets/main.css', 'katex/dist/katex.min.css'],
  devtools: { enabled: false },
  app: { head: { title: 'MIPS Lab · 汇编练习室', htmlAttrs: { lang: 'zh-CN' }, meta: [{ name: 'description', content: '北航计组 MIPS 本地练习、题库与评测工作台' }] } },
  nitro: { externals: { external: ['node:sqlite'] } },
  typescript: { strict: true },
})
