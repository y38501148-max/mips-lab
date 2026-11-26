import type {Problem,TestCase} from '../../shared/types'
import type {GenerationDiagnostic,GenerationPlan} from '../../shared/generation'
import {compareOutput} from './judge'
type RunScript=(key:string,input?:string)=>Promise<string>
const numberToken=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

export class GenerationFailure extends Error {
 constructor(public diagnostic:GenerationDiagnostic){super(diagnostic.message);this.name='GenerationFailure'}
}
export function parsePlan(text:string):GenerationPlan {
 const source=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'')
 let plan;try{plan=JSON.parse(source)}catch{throw new GenerationFailure({stage:'解析返回',message:'模型未返回合法的 JSON 对象。',rawOutput:source.slice(0,3000)})}
 if(typeof plan?.error==='string')throw new GenerationFailure({stage:'题型检查',message:plan.error.slice(0,500)})
 for(const key of ['generator','reference','checker','validator']){
  if(typeof plan?.[key]!=='string'||!plan[key].trim()||plan[key].length>40000)throw new GenerationFailure({stage:'解析返回',message:`模型缺少有效的 ${key} 程序。`})
  plan[key]=plan[key].trim().replace(/^```(?:python|py)?\s*\n/i,'').replace(/\n```\s*$/,'')
 }
 return {generator:plan.generator,reference:plan.reference,checker:plan.checker,validator:plan.validator,notes:typeof plan.notes==='string'?plan.notes.slice(0,4000):''}
}
async function formatNumericCases(cases:TestCase[],run:RunScript,progress:(message:string)=>void):Promise<TestCase[]> {
 const inputs=cases.map(c=>{
  const tokens=c.input.trim().split(/\s+/)
  if(tokens.every(token=>numberToken.test(token)))return tokens.join('\n')+(c.input.endsWith('\n')?'\n':'')
 })
 // Use one consistent input protocol for the entire suite, including public samples.
 if(inputs.includes(undefined))return cases

 const formatted:TestCase[]=[]
 for(const [i,c] of cases.entries()){
  const input=inputs[i]!
  if(input!==c.input){
   progress(`复核 ${i+1} / ${cases.length}：MIPS 数字逐行输入`)
   try{
    await run('validator',input)
    for(const key of ['reference','checker']){
     if(!compareOutput(await run(key,input),c.output))return cases
    }
   }catch(e){
    if(e instanceof GenerationFailure)return cases
    throw e
   }
  }
  formatted.push({...c,input})
 }
 return formatted
}

export async function validatePlan(p:Problem,count:number,run:RunScript,progress:(message:string)=>void):Promise<TestCase[]> {
 progress('执行生成器，检查数据数量与输入格式…')
 const text=await run('generator')
 let parsed;try{parsed=JSON.parse(text)}catch{throw new GenerationFailure({stage:'生成输入',message:'生成器的标准输出不是合法 JSON。',rawOutput:text.slice(0,3000)})}
 const generated=Array.isArray(parsed)?parsed:parsed?.cases
 if(!Array.isArray(generated)||generated.length!==count)throw new GenerationFailure({stage:'生成数量',message:`需要 ${count} 组新增数据，生成器实际输出${Array.isArray(generated)?' '+generated.length+' 组':'的不是数组'}。`,actualCount:Array.isArray(generated)?generated.length:undefined,expectedCount:count,rawOutput:text.slice(0,3000)})
 const seen=new Set<string>()
 const candidates:TestCase[]=generated.map((c:any,i:number)=>{
  if(typeof c?.input!=='string'||!c.input.trim()||Buffer.byteLength(c.input)>8192)throw new GenerationFailure({stage:'输入格式',message:`第 ${i+1} 组输入为空或超过 8 KiB。`})
  const input=c.input.replace(/\r\n/g,'\n'),normalized=input.trim().split(/\s+/).join(' ')
  if(seen.has(normalized))throw new GenerationFailure({stage:'重复输入',message:`第 ${i+1} 组输入与前面的数据重复。`,input})
  seen.add(normalized)
  return {input,output:'',label:typeof c.label==='string'?c.label.slice(0,60):`生成数据 ${i+1}`}
 })
 const cases:TestCase[]=[]
 for(const [i,c] of [...p.samples.map(c=>({...c,sample:true})),...candidates].entries()){
  progress(`校验 ${i+1} / ${p.samples.length+candidates.length}：输入范围、样例与双参考解`)
  try{await run('validator',c.input)}catch(e){throw new GenerationFailure({stage:'输入校验',message:`第 ${i+1} 组未通过输入校验：${(e as Error).message}`,input:c.input})}
  let a:string,b:string
  try{a=await run('reference',c.input);b=await run('checker',c.input)}catch(e){throw new GenerationFailure({stage:'参考解执行',message:`第 ${i+1} 组参考解运行失败：${(e as Error).message}`,input:c.input})}
  if(!a.trim()||Buffer.byteLength(a)>65536)throw new GenerationFailure({stage:'标准输出',message:`第 ${i+1} 组标准输出为空或超过 64 KiB。`,input:c.input})
  if(!compareOutput(a,b))throw new GenerationFailure({stage:'双解比较',message:`第 ${i+1} 组两份参考解结果不一致。`,input:c.input,referenceOutput:a.slice(0,4000),checkerOutput:b.slice(0,4000),expectedOutput:c.sample?c.output:undefined})
  if(c.sample&&!compareOutput(a,c.output))throw new GenerationFailure({stage:'样例验证',message:`参考解未通过公开样例 ${i+1}。`,input:c.input,referenceOutput:a.slice(0,4000),checkerOutput:b.slice(0,4000),expectedOutput:c.output})
  cases.push({...c,output:c.sample?c.output:a})
 }
 return p.source==='洛谷'?formatNumericCases(cases,run,progress):cases
}
