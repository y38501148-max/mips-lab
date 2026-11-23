import { request } from 'node:http'
import { readFile,readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename,resolve } from 'node:path'
import type { ProcessResult } from './process'
export const workerSocket=()=>process.env.MIPS_LAB_WORKER_SOCKET||''
export const workerEnabled=()=>!!workerSocket()&&existsSync(workerSocket())
export function workerRequest<T=ProcessResult>(path:string,payload?:unknown):Promise<T>{
 return new Promise((resolveResult,reject)=>{
  const body=payload?JSON.stringify(payload):undefined
  const req=request({socketPath:workerSocket(),path,method:body?'POST':'GET',headers:body?{'content-type':'application/json','content-length':Buffer.byteLength(body)}:{}},res=>{
   let text='';res.setEncoding('utf8');res.on('data',chunk=>{text+=chunk;if(text.length>4000000){req.destroy(new Error('评测结果过大。'))}})
   res.on('end',()=>{try{const data=JSON.parse(text);if(res.statusCode!==200)reject(new Error(data.error||'评测容器异常。'));else resolveResult(data)}catch{reject(new Error('评测容器返回格式无效。'))}})
  });req.setTimeout(20000,()=>req.destroy(new Error('评测容器响应超时，请稍后重试。')));req.on('error',reject);req.end(body)
 })
}
export async function workerMips(dir:string,input:string,steps:number,timeout:number){return workerRequest('/execute',{kind:'mips',files:{'main.asm':(await readFile(resolve(dir,'main.asm'))).toString('base64')},input,steps,timeout})}
export async function workerSandbox(command:string,args:string[],options:{cwd:string;input?:string;timeout?:number;maxOutput?:number}) {
 if(!basename(command).startsWith('python'))throw new Error('评测容器不支持此命令。')
 const files:Record<string,string>={}
 const script=basename(args[args.length-1]||'')
 for(const name of await readdir(options.cwd))if(['generator.py','reference.py','checker.py','validator.py','test.py'].includes(name))files[name]=(await readFile(resolve(options.cwd,name))).toString('base64')
 return workerRequest('/execute',{kind:'python',files,script,input:options.input,timeout:options.timeout,maxOutput:options.maxOutput})
}
