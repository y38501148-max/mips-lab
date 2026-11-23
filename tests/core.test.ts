import { test,after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync,rmSync,writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createServer } from 'node:http'
const dbdir=mkdtempSync(resolve(tmpdir(),'mips-test-db-'))
process.env.MIPS_LAB_DATA_DIR=dbdir
const {trial,compareOutput,validateCode,newSubmission,enqueueJudge}=await import('../server/utils/judge')
const {seeds}=await import('../server/utils/seeds')
const {put,get,settings,submissions}=await import('../server/utils/store')
const {parsePid,parseLuogu}=await import('../server/utils/luogu')
const {createGeneration}=await import('../server/utils/llm')
const p=seeds().find(p=>p.id==='M001')!
const c='#include <stdio.h>\nint main(){int a,b;if(scanf("%d%d",&a,&b)!=2)return 1;printf("%d\\n",a+b);return 0;}'
const mips='.text\nmain:\nli $v0,5\nsyscall\nmove $t0,$v0\nli $v0,5\nsyscall\naddu $a0,$t0,$v0\nli $v0,1\nsyscall\nli $v0,10\nsyscall\n'
after(()=>rmSync(dbdir,{recursive:true,force:true}))
test('whitespace-separated output comparison',()=>{assert.equal(compareOutput(' 1  2\n\n','1\n2'),true);assert.equal(compareOutput('1 2','12'),false);assert.equal(compareOutput('',''),true)})
test('reject unknown language, empty code, external MIPS includes',()=>{assert.throws(()=>validateCode('.text\n.globl main\nmain:','mips'),/globl main/);assert.throws(()=>validateCode('', 'mips'));assert.throws(()=>validateCode('test','cpp'));assert.throws(()=>validateCode('.include "/etc/passwd"','mips'));assert.doesNotThrow(()=>validateCode(mips,'mips'))})
test('Luogu ID parsing and current response schema',()=>{assert.equal(parsePid('p1001'),'P1001');assert.equal(parsePid('https://www.luogu.com.cn/problem/P5703'),'P5703');assert.throws(()=>parsePid('http://127.0.0.1'));const r=parseLuogu({data:{problem:{pid:'P1001',name:'A+B',difficulty:1,content:{description:'sum',formatI:'2 ints',formatO:'sum'},samples:[['20 30','50']]}}},'P1001');assert.equal(r.cases[0].input,'20 30');assert.equal(r.verification,'仅样例')})
test('C submissions and direct runner calls are rejected',async()=>{
 assert.throws(()=>validateCode(c,'c'),/仅支持 MIPS/)
 await assert.rejects(trial(c,'c' as any,'',p),/仅支持 MIPS/)
 assert.throws(()=>newSubmission(p,c,'c' as any),/仅支持 MIPS/)
 const old={...newSubmission(p,mips,'mips'),language:'c' as const,code:c,verdict:'Accepted'}
 put('submission',old.id,old)
 assert.throws(()=>enqueueJudge(old,p),/仅支持 MIPS/)
 assert.equal(submissions().some(s=>s.id===old.id),false)
 assert.equal(get<any>('submission',old.id).code,c)
})
test('MIPS executes A+B',async()=>{
 const r=await trial(mips,'mips','-5\n9\n',p)
 assert.equal(r.verdict,'OK',r.stderr);assert.equal(compareOutput(r.stdout,'4'),true)
})
test('MIPS assembly errors, bad addresses and step limits are classified',async()=>{
 const invalid=await trial('this_is_not_an_instruction','mips','',p)
 assert.equal(invalid.verdict,'Compile Error',invalid.stderr)
 const bad=await trial('.text\nmain:\nli $t0,1\nlw $a0,0($t0)\n','mips','',p)
 assert.equal(bad.verdict,'Runtime Error',bad.stderr)
 const loop=await trial('.text\nmain:\nj main\nnop\n','mips','',{...p,stepLimit:5000})
 assert.equal(loop.verdict,'Time Limit Exceeded',loop.stderr)
})
test('generation scripts cannot read project data or connect to a local server',async()=>{
 const {sandboxRun}=await import('../server/utils/process')
 const {copyFileSync,realpathSync}=await import('node:fs')
 const dir=realpathSync(mkdtempSync(resolve(tmpdir(),'mips-isolation-')))
 const path=resolve(dbdir,'secret.txt');writeFileSync(path,'test-private-data')
 const server=createServer((req,res)=>res.end('reachable'));await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const port=(server.address() as any).port
 const code=`import socket\ntry:\n open(${JSON.stringify(path)}).read()\n print('read')\nexcept OSError:\n print('denied')\ntry:\n socket.create_connection(('127.0.0.1',${port}),timeout=1)\n print('connected')\nexcept OSError:\n print('denied')`
 copyFileSync('scripts/limit.py',resolve(dir,'limit.py'));writeFileSync(resolve(dir,'test.py'),code)
 try{assert.equal((await fetch('http://127.0.0.1:'+port)).status,200);const r=await sandboxRun(process.env.MIPS_LAB_PYTHON||'/opt/homebrew/bin/python3',['-I','-S',resolve(dir,'test.py')],{cwd:dir});assert.equal(r.exitCode,0,r.stderr);assert.equal(r.stdout,'denied\ndenied\n')}finally{server.close();rmSync(dir,{recursive:true,force:true})}
})
test('MIPS host file syscalls are disabled',async()=>{const r=await trial('.text\nmain:\nli $v0,13\nsyscall\n','mips','',p);assert.equal(r.verdict,'Runtime Error');assert.match(r.stderr,/invalid|unimplemented/i)})
test('queued MIPS judges persist full case results',async()=>{for(const language of ['mips'] as const){const sub=newSubmission(p,mips,language);put('submission',sub.id,sub);enqueueJudge(sub,p);let result:any;for(let i=0;i<150;i++){await new Promise(r=>setTimeout(r,100));result=get('submission',sub.id);if(!['Running','Queued'].includes(result.verdict))break}assert.equal(result.verdict,'Accepted',JSON.stringify(result));assert.equal(result.passed,p.cases.length);assert.equal(result.language,language)}})
test('generation uses provider, validates all samples, cross-checks answers and saves atomically',async()=>{
 let mismatch=false
 const server=createServer((req,res)=>{res.setHeader('Content-Type','application/json');const plan={generator:'import json\nprint(json.dumps([{"input":"2\\n3\\n","label":"small"},{"input":"0\\n0\\n","label":"zero"}]))',reference:'import sys\na,b=map(int,sys.stdin.read().split())\nprint(a+b)',checker:mismatch?'print(999)':'import sys\na=list(map(int,sys.stdin.read().split()))\nprint(sum(a))',validator:'import sys\na=list(map(int,sys.stdin.read().split()))\nassert len(a)==2 and all(abs(x)<=1000000 for x in a)',notes:'固定两组测试'};res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(plan)}}]}))})
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const port=(server.address() as any).port
 put('settings','llm',{...settings(),baseUrl:`http://127.0.0.1:${port}/v1`,model:'fixture-model'})
 const p2={...p,id:'GEN_TEST'};put('problem',p2.id,p2)
 try{for(const bad of [false,true]){mismatch=bad;const before=get<any>('problem',p2.id);const job=createGeneration(before,2);let result:any;for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,100));result=get('job',job.id);if(['done','failed'].includes(result.state))break}if(!bad){assert.equal(result.state,'done',result.message);assert.equal(get<any>('problem',p2.id).cases.length,3)}else{assert.equal(result.state,'failed');assert.deepEqual(get<any>('problem',p2.id).cases,before.cases)}}}finally{server.close()}
})
test('system proxy parsing and bypass preserve local access and exception rules',async()=>{const {parseSystemProxy,proxyFor,bypassProxy}=await import('../server/utils/network');const config=parseSystemProxy('<dictionary> {\n HTTPEnable : 1\n HTTPProxy : 127.0.0.1\n HTTPPort : 7890\n HTTPSEnable : 1\n HTTPSProxy : 127.0.0.1\n HTTPSPort : 7890\n ExceptionsList : <array> {\n 0 : localhost,127.*,*.example.org\n 1 : api.example.com\n }\n}');assert.equal(proxyFor('https://www.luogu.com.cn',config),'http://127.0.0.1:7890');assert.equal(proxyFor('http://localhost:11434/v1',config),undefined);assert.equal(proxyFor('https://api.example.com/v1',config),undefined);assert.equal(bypassProxy('x.example.org',config.exceptions),true);assert.equal(bypassProxy('notexample.org',config.exceptions),false)})
test('exam execution ignores delay slots even when an old setting enabled them',async()=>{
 const old=settings();put('settings','llm',{...old,delayedBranching:true})
 const code='.text\nmain:\nli $t0,0\nj target\naddi $t0,$t0,1\ntarget:\nmove $a0,$t0\nli $v0,1\nsyscall\nli $v0,10\nsyscall\n'
 try{const r=await trial(code,'mips','',p);assert.equal(r.verdict,'OK',r.stderr);assert.equal(r.stdout.trim(),'0')}finally{put('settings','llm',old)}
})
