import { execFileSync } from 'node:child_process'
import { ProxyAgent } from 'undici'
interface ProxyConfig { http?:string;https?:string;exceptions:string[];source:string }
let cached:{at:number;config:ProxyConfig}|undefined
const agents=new Map<string,ProxyAgent>()
export function parseSystemProxy(text:string):ProxyConfig {
 const read=(key:string)=>text.match(new RegExp('^\\s*'+key+'\\s*:\\s*(.+)$','m'))?.[1]?.trim()
 const endpoint=(kind:string)=>read(kind+'Enable')==='1'&&read(kind+'Proxy')&&read(kind+'Port')?`http://${read(kind+'Proxy')}:${read(kind+'Port')}`:undefined
 const block=text.match(/ExceptionsList\s*:\s*<array>\s*\{([\s\S]*?)\}/)?.[1]||''
 const exceptions=[...block.matchAll(/^\s*\d+\s*:\s*(.+)$/gm)].flatMap(m=>m[1]!.split(',').map(x=>x.trim()).filter(Boolean))
 return {http:endpoint('HTTP'),https:endpoint('HTTPS'),exceptions,source:'system'}
}
export function proxyConfig():ProxyConfig {
 if(cached&&Date.now()-cached.at<30000)return cached.config
 let config:ProxyConfig={exceptions:[],source:'direct'}
 if(process.platform==='darwin')try{config=parseSystemProxy(execFileSync('/usr/sbin/scutil',['--proxy'],{encoding:'utf8',timeout:3000}))}catch{}
 if(!config.http&&!config.https){config={http:process.env.HTTP_PROXY||process.env.http_proxy,https:process.env.HTTPS_PROXY||process.env.https_proxy||process.env.HTTP_PROXY,exceptions:(process.env.NO_PROXY||process.env.no_proxy||'').split(','),source:'environment'}}
 cached={at:Date.now(),config};return config
}
export function bypassProxy(hostname:string,exceptions:string[]) {
 const h=hostname.toLowerCase().replace(/^\[|\]$/g,'')
 if(h==='host.docker.internal'||h==='localhost'||h.endsWith('.localhost')||h==='::1'||/^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h))return true
 return exceptions.some(pattern=>{let p=pattern.trim().toLowerCase();if(!p)return false;if(p==='<local>')return !h.includes('.');if(p.startsWith('.'))return h===p.slice(1)||h.endsWith(p);const re=new RegExp('^'+p.split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$');return re.test(h)})
}
export function proxyFor(url:string,config=proxyConfig()) {const u=new URL(url);if(bypassProxy(u.hostname,config.exceptions))return undefined;return u.protocol==='https:'?config.https:config.http}
export function networkStatus() {const c=proxyConfig();const endpoint=c.https||c.http;return {mode:endpoint?(process.env.MIPS_LAB_CONTAINER?'宿主机代理':'系统代理'):'直连',endpoint:endpoint?new URL(endpoint).host:'',bypassLocal:true}}
export async function networkFetch(url:string,init:RequestInit={}) {
 if(process.env.MIPS_LAB_CONTAINER){const target=new URL(url);if(['localhost','127.0.0.1','[::1]'].includes(target.hostname)){target.hostname='host.docker.internal';url=target.toString()}}
 const proxy=proxyFor(url)
 if(!proxy)return fetch(url,init)
 let agent=agents.get(proxy);if(!agent){agent=new ProxyAgent(proxy);agents.set(proxy,agent)}
 const attempts=!init.method||init.method.toUpperCase()==='GET'?2:1
 for(let i=0;i<attempts;i++){
  try{return await fetch(url,{...init,dispatcher:agent} as RequestInit)}catch(e:any){
   if(i+1<attempts&&!init.signal?.aborted)continue
   throw new Error(`通过系统代理连接失败，请检查代理服务是否运行。${e?.cause?.code?'（'+e.cause.code+'）':''}`)
  }
 }
 throw new Error('网络请求失败。')
}
