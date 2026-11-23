# Docker 运行

首次构建需要 Docker Desktop、Node.js 24、JDK 21 和 `curl`。在项目根目录运行以下命令。

```sh
node scripts/setup-mars.mjs
docker volume create mips-lab_data
docker compose up -d --build
docker compose ps
docker compose logs -f --tail=80
```

地址保持 http://127.0.0.1:3210。后台启动后不依赖终端或聊天连接。

- `app`：Nuxt 服务，数据存于 `mips-lab_data` 持久卷，绑定本机端口。
- `worker`：MIPS 与 Python 数据生成脚本的执行容器，无网络接口，使用 Unix socket 接收应用请求，不挂载数据卷或 Docker socket。
- 两个服务均为 `restart: unless-stopped`，配置健康检查、内存与进程数限制。
- 运行代码使用不同的非特权 UID，独立临时目录，seccomp 禁止网络、调试、改变进程组等操作，执行完清理进程组。
- 容器根文件系统只读；临时目录使用有大小上限的 tmpfs。应用与评测使用不同的文件系统和权限。
- 浏览器断线后自动重试连接，MIPS 草稿留在浏览器。提交编号用于防止网络重试产生重复记录。
- 服务重启后，排队和评测中的 MIPS 提交从持久记录恢复；保留提交时的测试数据快照。模型生成中途重启时明确标记失败，可手动重试，避免重复付费调用。

## 代理与本地模型

执行 `npm run docker:sync-proxy` 读取 macOS 系统 HTTP/HTTPS 代理与绕过名单，写入本机 `.env`。修改后运行 `npm run docker:up` 让容器应用新配置。配置不进入镜像。

容器通过 Docker Desktop 的 `http.docker.internal:3128` 转发到系统代理；模型 URL 中的 localhost / 127.0.0.1 会在请求时映射为宿主机地址，设置里仍保留用户原始 URL。

构建镜像时代理参数可由 Docker Desktop 的代理配置或以下命令传入：

```sh
docker compose build --build-arg http_proxy=http://http.docker.internal:3128 --build-arg https_proxy=http://http.docker.internal:3128
```

## 更新和重启

```sh
docker compose build
docker compose up -d
docker compose restart
```

`npm run docker:down` 停止并移除容器，但保留数据卷。数据卷是 external volume，`down -v` 也不会删除它。Docker Desktop 需要处于运行状态；未修改 Docker Desktop 的全局开机自启设置。

## 备份

```sh
docker compose exec app node --input-type=module -e "import{DatabaseSync,backup}from'node:sqlite';const db=new DatabaseSync('/app/data/mips-lab.sqlite');await backup(db,'/app/data/backup.sqlite');db.close()"
docker compose cp app:/app/data/backup.sqlite ./data/backups/docker-backup.sqlite
```

数据库包含本地保存的 API 密钥，请妥善保管备份。
