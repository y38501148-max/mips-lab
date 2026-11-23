import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const jar = fileURLToPath(new URL('../runtime/Mars4_5.jar', import.meta.url))
const url = 'https://github.com/dpetersanderson/MARS/releases/download/v.4.5.1/Mars4_5.jar'
const expectedSha256 = 'ac340b676ba2b62246b9df77e62f81ad4447bcfd329ab539716bcd09950b7096'

console.log('下载官方 MARS 4.5…')
const bytes = execFileSync('curl', ['--fail', '--location', '--silent', '--show-error', '--max-time', '180', url], {
  maxBuffer: 8 * 1024 * 1024
})
if (createHash('sha256').update(bytes).digest('hex') !== expectedSha256) {
  throw new Error('MARS 下载文件的 SHA-256 校验失败。')
}

await mkdir(new URL('../runtime/', import.meta.url), { recursive: true })
await writeFile(jar, bytes)
execFileSync('javac', ['-encoding', 'UTF-8', '-cp', 'runtime/Mars4_5.jar', 'runtime/LabRunner.java'], {
  cwd: root,
  stdio: 'inherit'
})
console.log('MARS 和评测入口已准备完成。')
