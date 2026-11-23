import { spawn,execFileSync } from 'node:child_process'
import { existsSync,mkdirSync,openSync,readFileSync,writeFileSync,unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root=fileURLToPath(new URL('..',import.meta.url)),data=resolve(root,'data'),entry=resolve(root,'.output/server/index.mjs'),pidFile=resolve(data,'service.pid')
mkdirSync(data,{recursive:true,mode:0o700})
const command=process.argv[2]||'start'
let pid=existsSync(pidFile)?Number(readFileSync(pidFile,'utf8')):0
function owned(){try{return pid>0&&execFileSync('/bin/ps',['-p',String(pid),'-o','command='],{encoding:'utf8'}).includes(entry)}catch{return false}}
if(command==='stop'){if(owned()){process.kill(pid,'SIGTERM');console.log('MIPS Lab 已停止。')}else console.log('MIPS Lab 未运行。');if(existsSync(pidFile))unlinkSync(pidFile)}
else if(command==='status'){console.log(owned()?`MIPS Lab 正在运行，PID ${pid} · http://127.0.0.1:3210`:'MIPS Lab 未运行。')}
else{
 if(owned()){console.log('MIPS Lab 已运行：http://127.0.0.1:3210');process.exit(0)}
 if(!existsSync(entry))throw new Error('请先运行 npm run build')
 const log=openSync(resolve(data,'service.log'),'a',0o600)
 const child=spawn(process.execPath,[entry],{cwd:root,detached:true,stdio:['ignore',log,log],env:{...process.env,NITRO_HOST:'127.0.0.1',NITRO_PORT:'3210',MIPS_LAB_ROOT:root}});child.unref();writeFileSync(pidFile,String(child.pid),{mode:0o600})
 let ready=false;for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,300));try{const r=await fetch('http://127.0.0.1:3210/api/system');if(r.ok){ready=true;break}}catch{}}
 if(!ready)throw new Error('启动失败，请查看 data/service.log')
 console.log(`MIPS Lab 已启动：http://127.0.0.1:3210（PID ${child.pid}）`)
}
