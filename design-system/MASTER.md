# MIPS Lab 设计规范

采用 ui-ux-pro-max 的 Ant Design Vue 与 Nuxt 组件规范。两次设计检索匹配到了编码产品的暗色代码区、绿色执行动作和等宽代码字体；自动生成的营销页布局与本产品不符，未采用。此文档记录实际实现的产品决策。

- 栈：Nuxt 4 + Vue 3 + TypeScript + Ant Design Vue 4。
- 固定左导航，浅色题库，单栏题面。提交弹窗支持粘贴或上传 MIPS 源码。
- 背景 `#f6f8f7`；表面 `#ffffff`；正文 `#25313b`；主色 `#31866b`；边框 `#e4e9e6`；编辑器 `#20272e`。
- 字体：系统无衬线中文；代码与数字使用本机等宽字体。无在线字体依赖。
- 圆角：控件 6–8px，内容区 10–12px。使用细边框，轻阴影。
- 组件：ConfigProvider theme token 统一 Ant Design；Form、Input、Select、Modal、Drawer、Alert、Progress、Collapse；图标统一 @ant-design/icons-vue。
- 提交弹窗保存 MIPS 草稿，提交结果使用 Drawer。数据管理、生成和本题记录收进次要入口。
- 状态：文字与图标同时表达结果；请求显示 loading 并防止重复；错误保留原输入。
- 可访问性：语义导航、真实按钮、可见焦点、编辑器 aria-label、带标签表单；尊重 prefers-reduced-motion。
- 窄屏：760px 以下导航收窄、题面与提交弹窗适配窄屏，避免页面横向溢出。表格可在自身容器横向滚动。
- 文案：只保留题目、输入规则、状态和实际操作所需信息。

- 考试规则固定：禁止 .globl main，延迟槽关闭。
- 连接状态显示已连接 / 自动重连，避免断线时误报本地服务正常。
