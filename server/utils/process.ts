import {workerEnabled,workerSandbox} from './worker'
import { spawn } from 'node:child_process'
import { realpathSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { root } from './store'
export interface ProcessResult { stdout:string; stderr:string; exitCode:number|null; timedOut:boolean; limited:boolean; duration:number }
export function runProcess(command:string,args:string[],options:{cwd:string;input?:string;timeout?:number;maxOutput?:number;env?:Record<string,string>}):Promise<ProcessResult> {
  return new Promise((resolveResult,reject)=>{
    const start=performance.now();let stdout='',stderr='',timedOut=false,limited=false,size=0,settled=false
    const child=spawn(command,args,{cwd:options.cwd,env:{PATH:process.env.PATH,LANG:'en_US.UTF-8',HOME:options.cwd,TMPDIR:options.cwd,...options.env},stdio:['pipe','pipe','pipe'],detached:true})
    const kill=()=>{try{if(child.pid)process.kill(-child.pid,'SIGKILL')}catch{child.kill('SIGKILL')}}
    const timer=setTimeout(()=>{timedOut=true;kill()},options.timeout||5000)
    const chunk=(b:Buffer,err:boolean)=>{size+=b.length;if(size>(options.maxOutput||1048576)){limited=true;kill();return}if(err)stderr+=b.toString();else stdout+=b.toString()}
    child.stdout.on('data',b=>chunk(b,false));child.stderr.on('data',b=>chunk(b,true))
    child.on('error',e=>{clearTimeout(timer);if(!settled){settled=true;reject(e)}})
    child.on('close',code=>{clearTimeout(timer);kill();if(!settled){settled=true;resolveResult({stdout,stderr,exitCode:code,timedOut,limited,duration:Math.round(performance.now()-start)})}})
    child.stdin.on('error',()=>{});child.stdin.end(options.input||'')
  })
}
export function sandboxProfile(dir:string) {
  const p=JSON.stringify(realpathSync(dir))
  return `(version 1)(deny default)(allow process*)(allow sysctl-read)(allow mach-lookup)(allow signal (target self))(allow file-read* (literal "/") (literal "/opt") (literal "/Library") (subpath "/usr") (subpath "/System") (subpath "/Library/Developer") (subpath "/Library/Java") (subpath "/opt/homebrew") (subpath ${p}) (literal "/dev/null") (literal "/dev/urandom") (literal "/dev/random") (literal "/private/etc/localtime"))(allow file-write* (subpath ${p}) (literal "/dev/null"))(deny process-fork)`
}
export function sandboxAvailable(){return workerEnabled()||(process.platform==='darwin'&&existsSync('/usr/bin/sandbox-exec'))}
export async function sandboxRun(command:string,args:string[],options:{cwd:string;input?:string;timeout?:number;maxOutput?:number}) {
  if(workerEnabled())return workerSandbox(command,args,options)
  if(!sandboxAvailable())throw new Error('数据生成需要 macOS sandbox-exec。')
  // The trusted launcher is copied into the isolated directory, never grant access to the project or credentials.
  const python=process.env.MIPS_LAB_PYTHON||'/opt/homebrew/bin/python3'
  return runProcess('/usr/bin/sandbox-exec',['-p',sandboxProfile(options.cwd),python,'-I','-S',resolve(realpathSync(options.cwd),'limit.py'),command,...args],options)
}
