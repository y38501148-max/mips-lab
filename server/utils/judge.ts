import {workerEnabled,workerMips} from './worker'
import { realpath,mkdtemp,writeFile,rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { root,get,put,remove } from './store'
import { runProcess,type ProcessResult } from './process'
import type { Problem,Submission,CaseResult } from '../../shared/types'
export type Language='mips'
export function compareOutput(actual:string,expected:string){return actual.trim().split(/\s+/).join(' ')===expected.trim().split(/\s+/).join(' ')}
export function validateCode(code:unknown,language:unknown):asserts code is string {
 if(language!=='mips')throw new Error('仅支持 MIPS 汇编。')
 if(typeof code!=='string'||!code.trim())throw new Error('请先填写代码。')
 if(Buffer.byteLength(code)>65536)throw new Error('代码不能超过 64 KiB。')
 if(language==='mips'&&code.split('\n').some(line=>/^\s*\.(?:globl|global)\s+.*\bmain\b/i.test(line.split('#')[0]!)))throw new Error('请删除 .globl main 声明。')
 if(language==='mips'&&/\.\s*(?:include|incbin)\b/i.test(code))throw new Error('不支持 .include 或 .incbin。')
}
export function classify(r:ProcessResult,lang:Language){
 if(r.timedOut||r.exitCode===12||r.stderr.includes('MIPS_LAB_STEP_LIMIT'))return 'Time Limit Exceeded'
 if(r.limited)return 'Output Limit Exceeded'
 if(lang==='mips'&&r.exitCode===10)return 'Compile Error'
 if(r.exitCode!==0)return 'Runtime Error'
 return 'OK'
}
export async function prepare(code:string,language:Language) {
 validateCode(code,language)
 const dir=await realpath(await mkdtemp(resolve(tmpdir(),'mips-lab-')))
  if(!workerEnabled()&&(!existsSync(resolve(root,'runtime/Mars4_5.jar'))||!existsSync(resolve(root,'runtime/LabRunner.class')))){await rm(dir,{recursive:true,force:true});throw new Error('MARS 未安装，请运行 npm run setup:mars。')}
  await writeFile(resolve(dir,'main.asm'),code)
  return {dir}
}
export async function execute(dir:string,language:Language,input:string,p:Pick<Problem,'stepLimit'|'timeLimit'>,delayed:boolean) {
 if(language!=='mips')throw new Error('仅支持 MIPS 汇编。')
 if(workerEnabled())return workerMips(dir,input,p.stepLimit,p.timeLimit)
 return runProcess(process.env.MIPS_LAB_JAVA||'java',['-Xmx256m','-Djava.awt.headless=true','-Djava.util.prefs.userRoot='+dir,'-cp',resolve(root,'runtime')+':'+resolve(root,'runtime/Mars4_5.jar'),'LabRunner',resolve(dir,'main.asm'),String(p.stepLimit),String(delayed)],{cwd:dir,input,timeout:p.timeLimit})
}
let queue=Promise.resolve()
export function enqueueJudge(sub:Submission,p:Problem) {
 validateCode(sub.code,sub.language)
 const delayed=false
 put('judge-request',sub.id,{problem:p})
 queue=queue.then(()=>judge(sub,p,delayed)).catch(e=>put('submission',sub.id,{...get<Submission>('submission',sub.id),verdict:'System Error',error:String(e.message||e)})).finally(()=>remove('judge-request',sub.id)) as Promise<void>
}
async function judge(sub:Submission,p:Problem,delayed:boolean) {
 const lang:Language='mips';let dir='';const start=performance.now()
 const current={...sub,verdict:'Running',settings:{delayedBranching:delayed},dataVersion:p.generation?.at||'builtin-v2'}
 put('submission',sub.id,current)
 try {
  const prepared=await prepare(sub.code,lang);dir=prepared.dir
  const results:CaseResult[]=[]
  for(let i=0;i<p.cases.length;i++){
   const c=p.cases[i]!,r=await execute(dir,lang,c.input,p,delayed),status=classify(r,lang)
   results.push({index:i+1,label:c.label,verdict:status==='OK'?(compareOutput(r.stdout,c.output)?'Accepted':'Wrong Answer'):status,time:r.duration,input:c.input,expected:c.output,actual:r.stdout,error:status==='OK'?undefined:r.stderr.replaceAll(dir,'<评测目录>')})
   put('submission',sub.id,{...current,results,passed:results.filter(x=>x.verdict==='Accepted').length})
   if(status==='Compile Error')break
  }
  const passed=results.filter(x=>x.verdict==='Accepted').length,verdict=results.find(x=>x.verdict!=='Accepted')?.verdict||'Accepted'
  put('submission',sub.id,{...current,results,passed,score:Math.round(passed/p.cases.length*100),verdict,duration:Math.round(performance.now()-start)})
 }finally{if(dir)await rm(dir,{recursive:true,force:true})}
}
export async function trial(code:string,language:Language,input:string,p:Problem){
 validateCode(code,language);if(Buffer.byteLength(input)>65536)throw new Error('自测输入不能超过 64 KiB。')
 const {dir}=await prepare(code,language)
 try{
 const r=await execute(dir,language,input,p,false);return {...r,verdict:classify(r,language),stderr:r.stderr.replaceAll(dir,'<评测目录>')}}finally{await rm(dir,{recursive:true,force:true})}
}
export function newSubmission(p:Problem,code:string,language:Language):Submission {validateCode(code,language);return {id:randomUUID(),problemId:p.id,title:p.title,language,code,verdict:'Queued',score:0,passed:0,total:p.cases.length,results:[],createdAt:new Date().toISOString(),duration:0}}
