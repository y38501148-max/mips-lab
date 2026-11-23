import {execFileSync} from 'node:child_process'
import {writeFileSync} from 'node:fs'
const text=execFileSync('/usr/sbin/scutil',['--proxy'],{encoding:'utf8'})
const read=key=>text.match(new RegExp('^\\s*'+key+'\\s*:\\s*(.+)$','m'))?.[1]?.trim()
const desktopProxy=execFileSync('docker',['info','--format','{{.HTTPProxy}}'],{encoding:'utf8'}).trim()
const proxy=kind=>read(kind+'Enable')==='1'?(['127.0.0.1','localhost'].includes(read(kind+'Proxy'))&&desktopProxy?('http://'+desktopProxy.replace(/^https?:\/\//,'')):`http://${read(kind+'Proxy')}:${read(kind+'Port')}`):''
const block=text.match(/ExceptionsList\s*:\s*<array>\s*\{([\s\S]*?)\}/)?.[1]||''
const rules=[...block.matchAll(/^\s*\d+\s*:\s*(.+)$/gm)].flatMap(m=>m[1].split(',')).map(s=>s.trim()).filter(Boolean)
writeFileSync('.env',`MIPS_LAB_HTTP_PROXY=${proxy('HTTP')}\nMIPS_LAB_HTTPS_PROXY=${proxy('HTTPS')}\nMIPS_LAB_NO_PROXY=${[...new Set(['localhost','127.*','host.docker.internal',...rules])].join(',')}\n`,{mode:0o600})
console.log('Docker 代理配置已同步。')
