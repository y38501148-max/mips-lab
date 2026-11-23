import {cExamples} from './c-examples'
import { networkFetch } from './network'
import type { Problem } from '../../shared/types'
import { starter } from './seeds'
export function parsePid(source:unknown) {
 if(typeof source!=='string')throw new Error('请输入洛谷题号或链接。')
 const s=source.trim();const m=s.match(/^P\d{4,6}$/i)||s.match(/^https:\/\/www\.luogu\.com\.cn\/problem\/(P\d{4,6})(?:[?#].*)?$/i)
 if(!m)throw new Error('支持 P1001 这样的题号，或 https://www.luogu.com.cn/problem/P1001 链接。')
 return (m[1]||m[0]).toUpperCase()
}
export function parseLuogu(body:any,pid:string):Problem {
 const p=body?.data?.problem||body?.currentData?.problem
 if(!p||p.pid!==pid)throw new Error('洛谷未返回题目，可能需要登录或暂时限制访问。')
 const c=p.content||p.contenu
 if(!c||typeof c.description!=='string')throw new Error('无法识别洛谷题面格式。')
 const samples=(p.samples||[]).filter((s:unknown)=>Array.isArray(s)&&typeof s[0]==='string'&&typeof s[1]==='string').map((s:string[],i:number)=>({input:s[0]!,output:s[1]!,label:`样例 ${i+1}`,sample:true}))
 return {id:pid,title:p.name||c.name,category:'洛谷导入',difficulty:['未评级','入门','基础','基础','进阶','进阶','挑战','挑战','挑战'][p.difficulty]||'未评级',tags:['洛谷'],description:c.description,inputFormat:c.formatI||'',outputFormat:c.formatO||'',constraints:c.hint||'',samples,cases:samples,source:'洛谷',sourceUrl:`https://www.luogu.com.cn/problem/${pid}`,order:10000+Number(pid.slice(1)),timeLimit:3000,stepLimit:10000000,starter,cExample:cExamples[pid],hint:'syscall 5 每次读取一行；同一行的多个整数需自行解析。',verification:'仅样例',createdAt:new Date().toISOString()}
}
export async function fetchLuogu(pid:string) {
 const r=await networkFetch(`https://www.luogu.com.cn/problem/${pid}`,{headers:{'user-agent':'MipsLab/1.0 (local study tool)','x-lentille-request':'content-only',accept:'application/json'},signal:AbortSignal.timeout(20000),redirect:'error'})
 if(!r.ok)throw new Error(`洛谷请求失败（${r.status}），请稍后重试。`)
 const s=await r.text();if(s.length>2000000)throw new Error('题面内容过大。')
 let body;try{body=JSON.parse(s)}catch{throw new Error('洛谷返回了验证页面，请稍后重试，或使用手动导入。')}
 return parseLuogu(body,pid)
}
