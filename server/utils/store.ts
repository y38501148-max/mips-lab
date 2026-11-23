import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, chmodSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Problem, Submission, Settings, Job } from '../../shared/types'
import {cExamples} from './c-examples'
import { seeds } from './seeds'
export const root = process.env.MIPS_LAB_ROOT || process.cwd()
export const dataDir = process.env.MIPS_LAB_DATA_DIR || resolve(root, 'data')
mkdirSync(dataDir,{recursive:true,mode:0o700})
const dbPath=resolve(dataDir,'mips-lab.sqlite')
const db=new DatabaseSync(dbPath)
chmodSync(dbPath,0o600)
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records (kind TEXT, id TEXT, value TEXT, PRIMARY KEY(kind,id));')
export function put(kind:string,id:string,value:unknown) { db.prepare('INSERT OR REPLACE INTO records VALUES (?,?,?)').run(kind,id,JSON.stringify(value)); return value }
export function get<T>(kind:string,id:string):T|undefined { const r=db.prepare('SELECT value FROM records WHERE kind=? AND id=?').get(kind,id) as {value:string}|undefined;return r?JSON.parse(r.value):undefined }
export function all<T>(kind:string):T[] { return (db.prepare('SELECT value FROM records WHERE kind=?').all(kind) as {value:string}[]).map(r=>JSON.parse(r.value)) }
if(!get('meta','seeded')) {for(const p of seeds())put('problem',p.id,p);put('meta','seeded',true)}
export const problems=()=>all<Problem>('problem').sort((a,b)=>a.order-b.order)
export const submissions=()=>all<Submission>('submission').filter(s=>s.language==='mips').sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
export const defaultSettings:Settings={baseUrl:'http://localhost:11434/v1',apiKey:'',model:'',temperature:0.2,maxTokens:12000,delayedBranching:false}
export const settings=()=>({reasoningMode:'auto',reasoningEffort:'high',autoRepair:true,...(get<Settings>('settings','llm')||defaultSettings)}) as Settings
export function publicSettings(){const s=settings();return {...s,apiKey:'',hasKey:!!s.apiKey}}
// The startup plugin resumes durable judge requests after a process restart.
for(const j of all<Job>('job'))if(['queued','running'].includes(j.state))put('job',j.id,{...j,state:'failed',message:'服务重启中断了生成，请重新生成。'})

// Exam rules apply to future submissions; existing source and historical records stay intact.
if(!get('meta','exam-rules-v1')){
 for(const p of problems())put('problem',p.id,{...p,starter:p.starter.replace(/^\s*\.globl\s+main\s*\n/gm,'')})
 const current=settings();put('settings','llm',{...current,delayedBranching:false});put('meta','exam-rules-v1',true)
}

export function remove(kind:string,id:string){db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind,id)}

// Add display examples without replacing saved cases, generated data or submissions.
if(!get('meta','c-examples-v1')){
 for(const p of problems()){
  const description=p.source==='内置'?p.description.replace('\n\n从读入、运算到输出，完成你的第一个 MIPS 程序。','').replace('建议先写 C 版本再逐段翻译。',''):p.description
  const hint=p.hint.replace('先用 C 写出正确解法，再对照翻译为 MIPS。洛谷的原始输入格式会保留；MARS 的 syscall 5 每次读取一行，同一行有多个整数时需要自行解析。','syscall 5 每次读取一行；同一行的多个整数需自行解析。')
  put('problem',p.id,{...p,description,hint,cExample:p.cExample||cExamples[p.id]})
 }
 put('meta','c-examples-v1',true)
}
