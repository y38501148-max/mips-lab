import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createServer} from 'node:http'
import {execFileSync} from 'node:child_process'
const base=process.env.MIPS_TEST_URL||'http://127.0.0.1:3211'
const project=process.env.MIPS_TEST_PROJECT||'mips-lab-check'
if(new URL(base).port==='3210'||project==='mips-lab')throw new Error('Run smoke tests against the isolated check deployment.')
const request=async(path,body,expected=200)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});const d=await r.json();assert.equal(r.status,expected,JSON.stringify(d));return d}
const post=(path,body)=>request(path,body)
const put=async(path,body)=>{const r=await fetch(base+path,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200,await r.text())}
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const c='#include <stdio.h>\nint main(){int a,b;scanf("%d%d",&a,&b);printf("%d\\n",a+b);}'
const mips='.text\nmain:\nli $v0,5\nsyscall\nmove $t0,$v0\nli $v0,5\nsyscall\naddu $a0,$t0,$v0\nli $v0,1\nsyscall\nli $v0,10\nsyscall\n'
const finish=async id=>{for(let i=0;i<100;i++){const s=await request('/api/submissions/'+id);if(!['Queued','Running'].includes(s.verdict))return s;await wait(250)}throw new Error('judge timeout')}
for(let i=0;i<60;i++){try{const r=await fetch(base+'/api/health',{signal:AbortSignal.timeout(1000)});if(r.ok)break}catch{}await wait(300)}
const system=await request('/api/system');assert.equal(system.container,true);assert.equal(system.mars,true);assert.equal('c' in system,false);console.log('container and offline worker ready')
const run=await post('/api/run',{problemId:'M001',language:'mips',code:mips,input:'-5\n9\n'});assert.equal(run.verdict,'OK',run.stderr);assert.equal(run.stdout.trim(),'4');console.log('MIPS real execution passed')
for(const path of ['/api/run','/api/submissions'])await request(path,{problemId:'M001',language:'c',code:c,input:''},400)
const catalog=await request('/api/problems');assert.ok(catalog.every(p=>!('solvedC' in p)))
for(const p of catalog){const detail=await request('/api/problems/'+p.id);assert.ok(detail.cExample,p.id+' missing C example')}
console.log('C execution rejected; every existing problem has a C display example')
await request('/api/run',{problemId:'M001',language:'mips',code:'.text\n.globl main\nmain:\nli $v0,10\nsyscall',input:''},400)
const delay=await post('/api/run',{problemId:'M001',language:'mips',code:'.text\nli $t0,0\nj target\naddi $t0,$t0,1\ntarget:\nmove $a0,$t0\nli $v0,1\nsyscall\nli $v0,10\nsyscall',input:''});assert.equal(delay.stdout.trim(),'0',delay.stderr)
console.log('exam rules passed')
const requestId=randomUUID(),payload={requestId,problemId:'M001',language:'mips',code:mips}
const [a,b]=await Promise.all([post('/api/submissions',payload),post('/api/submissions',payload)]);assert.equal(a.id,b.id);assert.equal((await finish(a.id)).verdict,'Accepted');console.log('idempotent full judge passed')
const sub=await post('/api/submissions',{requestId:randomUUID(),problemId:'M001',language:'mips',code:mips})
await wait(200)
try{execFileSync('docker',['compose','-p',project,'exec','-T','app','node','--input-type=module','-e',`import fs from 'node:fs';for(const name of fs.readdirSync('/proc').filter(n=>Number.isInteger(Number(n)))){try{const args=fs.readFileSync('/proc/'+name+'/cmdline','utf8').split(String.fromCharCode(0));if(args.some(a=>a.endsWith('.output/server/index.mjs'))&&Number(name)!==process.pid)process.kill(Number(name),'SIGKILL')}catch{}}`],{stdio:'pipe'})}catch(error){if(error.status!==137)throw error}

for(let i=0;i<100;i++){await wait(300);try{const r=await fetch(base+'/api/health',{signal:AbortSignal.timeout(1000)});if(r.ok)break}catch{}}
const resumed=await finish(sub.id);assert.equal(resumed.verdict,'Accepted',JSON.stringify(resumed));assert.equal(resumed.settings.delayedBranching,false);console.log('crash restart, durable submission resume and stored result passed')
const fixture=createServer((req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({generator:'import json\nprint(json.dumps([{"input":"2\\n3\\n","label":"small"},{"input":"0\\n0\\n","label":"zero"}]))',reference:'import sys\na,b=map(int,sys.stdin.read().split())\nprint(a+b)',checker:'import sys\nprint(sum(map(int,sys.stdin.read().split())))',validator:'import sys\na=list(map(int,sys.stdin.read().split()))\nassert len(a)==2 and all(abs(x)<=1000000 for x in a)',notes:'模拟接口隔离验证'})}}]}))})
await new Promise(r=>fixture.listen(0,'0.0.0.0',r))
try{const port=fixture.address().port;await put('/api/settings',{baseUrl:`http://127.0.0.1:${port}/v1`,model:'docker-fixture',clearKey:true,temperature:0.2,maxTokens:12000,delayedBranching:true});assert.equal((await request('/api/settings')).delayedBranching,false);await post('/api/settings/test',{});const job=await post('/api/generate/M001',{count:2});let last;for(let i=0;i<100;i++){last=await request('/api/jobs/'+job.id);if(['done','failed'].includes(last.state))break;await wait(250)}assert.equal(last.state,'done',JSON.stringify(last));console.log('host model mapping and sandboxed Python generation passed')}finally{fixture.close()}
console.log('Docker smoke tests complete on isolated data.')
