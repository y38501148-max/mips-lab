# MIPS Lab

本地 MIPS 练习服务，默认地址为 <http://localhost:3210>。内置 20 道练习，支持洛谷题面导入、C 代码示例和 MIPS 评测。

## 运行与更新

首次启动需要 Docker Desktop、Node.js 24、JDK 21 和 `curl`。在项目根目录执行以下命令。第一条命令会下载并校验 MARS，再编译 Docker 构建所需的评测入口。

```sh
node scripts/setup-mars.mjs
docker volume create mips-lab_data
docker compose up -d --build
docker compose ps
```

修改代码后执行 `docker compose up -d --build`。服务绑定 `127.0.0.1:3210`，题目、测试数据、模型设置与提交记录保存在 `mips-lab_data` 卷。停止服务使用 `docker compose stop`。

本机开发依次执行 `npm ci`、`npm run setup:mars` 和 `npm run dev`。3210 已被占用时可用 `npm run dev -- --port 3211`。代理和备份方法见 [Docker 说明](docker/README.md)。

## 练习与题目

题目包含描述、输入输出格式、样例、数据范围和 C 代码示例。20 道内置题均提供完整的 C 示例，递归题使用递归实现。C 示例只供对照阅读。导入洛谷 P1425、P5703、P5704 时会按题号匹配仓库中的示例。手动导入也可填写 C 示例。

点击“提交代码”，粘贴 MIPS 源码或上传 `.asm`、`.s`、`.mips` 文件，最大 64 KiB。草稿保存在当前浏览器。题库完成状态和提交列表只统计 MIPS。历史 C 提交保留在数据库中，原详情链接仍可查看和下载。

MIPS 使用 MARS 4.5，支持伪指令，关闭延迟槽，禁用 `.globl main`、外部包含及文件、GUI syscall。`syscall 5` 每次从一行读取一个整数。同一行的多个整数需自行解析。内置整数题采用逐行输入。洛谷题面和公开样例展示原始格式，实际评测输入见「测试数据」。

提交使用该题全部测试点，按空白分隔的 token 比较输出。结果包含逐点输入、标准输出、实际输出及错误信息。服务重启后恢复未完成的 MIPS 评测；旧 C 排队任务标记为已停用。

## 导入与测试数据

输入洛谷题号或链接可导入题面与公开样例；拉取失败时可手动填写题面。测试数据面板支持 JSON 编辑、导出和模型生成。每项数据包含 `input`、`output`、`label`，保存后替换当前测试集。

模型设置支持兼容 Chat Completions 的服务。填写 API URL、模型名与密钥后，可保存并测试连接。思考模式和强度按设置发送；启用思考时不发送 Temperature。

每次生成 1–8 组新增数据，公开样例另行加入。模型提供 Python 生成器、输入校验器和两份参考解；在隔离环境检查输入、公开样例及答案一致性，全部通过后替换数据。校验失败时可自动修复一次，失败记录和脚本可下载。现有数据在失败时保留。

为洛谷题生成数据时，纯数字测试集会尝试改为每行一个数字，纳入评测的公开样例也一起转换。转换后的每组数据须通过输入校验，并由两份参考解确认答案一致。含文本或无法验证转换的测试集沿用原输入格式。已保存的测试集在重新生成后应用新格式。

## 执行与存储

Docker worker 只接受 MIPS 和数据生成所需的 Python 脚本，未安装 C 编译器。worker 无网络接口，不挂载数据库；执行设置时间、输出、内存及进程数限制。原生开发模式的数据生成使用 macOS Sandbox。

模型密钥存于数据库，设置读取接口不回传密钥。备份数据库也会包含密钥，操作方法见 Docker 说明。生成数据适用于固定答案的 token 比较，不支持浮点误差、多解 SPJ 或交互题。

## 验证

完整测试在 macOS 上运行，需要已安装的 MARS、C 编译器和 Python 3。Python 默认使用 `/opt/homebrew/bin/python3`，也可通过 `MIPS_LAB_PYTHON` 指定路径。

```sh
npm run typecheck
npm test
npm run build
```

测试覆盖 MIPS 执行及错误分类、C 请求拒绝、队列持久化、旧数据迁移、模型生成与失败保留。开发测试通过本机 C 编译器核对仓库内的 C 示例，服务评测流程不执行 C。

`scripts/docker-smoke.mjs` 用于 3211 端口的隔离测试部署，默认 Compose 项目为 `mips-lab-check`。脚本会修改测试设置并重启测试应用，禁止对正式服务执行。

[MARS 官方发布](https://github.com/dpetersanderson/MARS/releases/tag/v.4.5.1)使用 `v.4.5.1` 标签，其中的 `Mars4_5.jar` 运行时报告版本为 MARS 4.5。
