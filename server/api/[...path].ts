import { defineEventHandler, getRouterParam, readBody, createError, getHeader, getRequestURL, setHeader } from 'h3'
import {cExamples} from '../utils/c-examples'
import { networkStatus } from '../utils/network'
import {workerEnabled,workerRequest} from '../utils/worker'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { all,get,put,problems,submissions,settings,publicSettings,root } from '../utils/store'
import { fetchLuogu,parsePid } from '../utils/luogu'
import { validateCode,newSubmission,enqueueJudge,trial } from '../utils/judge'
import { validateSettings,completion,createGeneration,isGenerating } from '../utils/llm'
import { sandboxAvailable } from '../utils/process'
import type { Problem,Submission,Settings,Job,TestCase } from '../../shared/types'
export default defineEventHandler(async event=>{
 setHeader(event,'Cache-Control','no-store')
 const host=getRequestURL(event).hostname
 if(!['127.0.0.1','localhost','[::1]'].includes(host))throw createError({statusCode:403,statusMessage:'仅允许本机访问。'})
 const origin=getHeader(event,'origin')
 if(origin&&origin!==getRequestURL(event).origin)throw createError({statusCode:403,statusMessage:'不允许跨站调用本地服务。'})
 const path=(getRouterParam(event,'path')||'').replace(/^\/+|\/+$/g,'').split('/'),method=event.method
 const requireProblem=(id:string)=>{const p=get<Problem>('problem',id);if(!p)throw createError({statusCode:404,statusMessage:'题目不存在。'});return p}
 const body=async()=>{if(!getHeader(event,'content-type')?.includes('application/json'))throw new Error('请求需要使用 JSON。');const b=await readBody(event);if(!b||typeof b!=='object'||Array.isArray(b))throw new Error('请求格式无效。');if(JSON.stringify(b).length>2000000)throw new Error('请求内容过大。');return b}
 try{
 if(path[0]==='health'&&method==='GET'){if(process.env.MIPS_LAB_WORKER_SOCKET)await workerRequest('/health');return {ok:true}}
 if(path[0]==='system'&&method==='GET')return {mars:workerEnabled()||(existsSync(resolve(root,'runtime/Mars4_5.jar'))&&existsSync(resolve(root,'runtime/LabRunner.class'))),sandbox:sandboxAvailable(),platform:process.platform,isolation:workerEnabled()?'Docker · 离线评测容器':'macOS Sandbox',container:!!process.env.MIPS_LAB_CONTAINER,version:'0.1.0',network:networkStatus(),dataPath:resolve(root,'data/mips-lab.sqlite')}
 if(path[0]==='problems'&&path.length===1&&method==='GET'){
  const ss=submissions();return problems().map(({description,inputFormat,outputFormat,constraints,cases,starter,cExample,hint,samples,generation,...p})=>({...p,caseCount:cases.length,sampleCount:samples.length,solvedMips:ss.some(s=>s.problemId===p.id&&s.language==='mips'&&s.verdict==='Accepted'),attempted:ss.some(s=>s.problemId===p.id),generation:generation?{model:generation.model,at:generation.at,notes:generation.notes}:undefined}))
 }
 if(path[0]==='problems'&&path.length===2&&method==='GET')return requireProblem(path[1]!)
 if(path[0]==='problems'&&path[2]==='cases'&&method==='PUT'){
  const p=requireProblem(path[1]!);if(isGenerating(p.id))throw new Error('数据生成中，请完成后再编辑。')
  const b=await body();if(!Array.isArray(b.cases)||b.cases.length<1||b.cases.length>64)throw new Error('请输入 1 到 64 组数据。')
  const cases:TestCase[]=b.cases.map((c:any,i:number)=>{if(typeof c.input!=='string'||typeof c.output!=='string'||!c.input.trim()||!c.output.trim()||Buffer.byteLength(c.input)>65536||Buffer.byteLength(c.output)>65536)throw new Error(`第 ${i+1} 组输入输出无效或过大。`);return {input:c.input,output:c.output,label:String(c.label||`手动数据 ${i+1}`).slice(0,60),sample:false}})
  put('problem',p.id,{...p,cases,verification:'手动数据',generation:undefined});return {count:cases.length}
 }
 if(path[0]==='import'&&method==='POST'){
  const b=await body(),pid=parsePid(b.source);const existing=get<Problem>('problem',pid);if(existing)return {id:pid,existing:true}
  const p=await fetchLuogu(pid);put('problem',pid,p);return {id:pid,existing:false}
 }
 if(path[0]==='manual-import'&&method==='POST'){
  const b=await body(),pid=parsePid(b.source);if(get('problem',pid))return {id:pid,existing:true}
  if(typeof b.title!=='string'||!b.title.trim()||typeof b.description!=='string'||!b.description.trim())throw new Error('请填写题名和题目描述。')
  const p:Problem={id:pid,title:b.title.slice(0,200),description:b.description.slice(0,100000),category:'洛谷导入',difficulty:'入门',tags:['手动导入'],inputFormat:String(b.inputFormat||''),outputFormat:String(b.outputFormat||''),constraints:String(b.constraints||''),samples:[],cases:[],source:'洛谷',sourceUrl:`https://www.luogu.com.cn/problem/${pid}`,order:10000+Number(pid.slice(1)),timeLimit:3000,stepLimit:10000000,starter:requireProblem('M001').starter,cExample:String(b.cExample||cExamples[pid]||'').slice(0,65536),hint:'syscall 5 每次读取一行；同一行的多个整数需自行解析。',verification:'待生成',createdAt:new Date().toISOString()}
  put('problem',pid,p);return {id:pid}
 }
 if(path[0]==='settings'&&path.length===1&&method==='GET')return publicSettings()
 if(path[0]==='settings'&&path.length===1&&method==='PUT'){
  const b=await body(),prev=settings();const s:Settings={baseUrl:String(b.baseUrl||'').trim(),apiKey:b.clearKey?'':(typeof b.apiKey==='string'&&b.apiKey?b.apiKey:prev.apiKey),model:String(b.model||'').trim(),temperature:Number(b.temperature),maxTokens:Number(b.maxTokens),delayedBranching:false,reasoningMode:b.reasoningMode??prev.reasoningMode??'auto',reasoningEffort:b.reasoningEffort??prev.reasoningEffort??'high',autoRepair:b.autoRepair===undefined?(prev.autoRepair??true):!!b.autoRepair}
  // Saving incomplete configuration is allowed; validation runs before a model request.
  if(s.model)validateSettings(s);else{try{const u=new URL(s.baseUrl);if(!['http:','https:'].includes(u.protocol))throw 0}catch{throw new Error('API URL 格式不正确。')}}
  put('settings','llm',s);return publicSettings()
 }
 if(path[0]==='settings'&&path[1]==='test'&&method==='POST'){
  await body();const start=performance.now();await completion(settings(),[{role:'user',content:'Reply with OK.'}],true);return {ok:true,duration:Math.round(performance.now()-start)}
 }
 if(path[0]==='generate'&&path[1]&&method==='POST'){
  const p=requireProblem(path[1]);if(isGenerating(p.id))throw new Error('该题已经有生成任务。');const b=await body(),count=Number(b.count||6);if(!Number.isInteger(count)||count<1||count>8)throw new Error('每次可生成 1 到 8 组数据。');return createGeneration(p,count)
 }
 if(path[0]==='jobs'&&method==='GET'){
  if(path[1]){const j=get<Job>('job',path[1]);if(!j)throw createError({statusCode:404,statusMessage:'任务不存在。'});return j}
  return all<Job>('job').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(({attempts,...job})=>job)
 }
 if(path[0]==='submissions'&&method==='GET'){
  if(path[1]){const s=get<Submission>('submission',path[1]);if(!s)throw createError({statusCode:404,statusMessage:'记录不存在。'});return s}
  return submissions().map(({code,results,...s})=>s)
 }
 if(path[0]==='submissions'&&method==='POST'){
  const b=await body(),p=requireProblem(String(b.problemId)),lang=b.language;validateCode(b.code,lang)
  if(!p.cases.length)throw new Error('该题还没有测试数据，请先生成或手动添加。')
  if(b.requestId!==undefined&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.requestId))throw new Error('提交请求编号无效。')
  if(b.requestId){const existing=get<Submission>('submission',b.requestId);if(existing){if(existing.problemId!==p.id||existing.language!==lang||existing.code!==b.code)throw new Error('提交编号已用于其他代码，请重新提交。');return existing}}
  if(submissions().filter(s=>['Queued','Running'].includes(s.verdict)).length>=4)throw new Error('评测队列已满，请稍后再提交。')
  const sub=newSubmission(p,b.code,lang);if(b.requestId)sub.id=b.requestId;put('submission',sub.id,sub);enqueueJudge(sub,p);return sub
 }
 if(path[0]==='run'&&method==='POST'){
  const b=await body(),p=requireProblem(String(b.problemId));validateCode(b.code,b.language);return await trial(b.code,b.language,String(b.input||''),p)
 }
 throw createError({statusCode:404,statusMessage:'接口不存在。'})
 }catch(e:any){if(e.statusCode)throw e;throw createError({statusCode:400,statusMessage:String(e.message||e).replace(/\r?\n/g,' ').slice(0,1500)})}
})
