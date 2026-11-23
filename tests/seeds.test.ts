import {test,after} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'
import {seeds} from '../server/utils/seeds'
import {cExamples} from '../server/utils/c-examples'
// Compile repository-owned examples during development, outside the submission judge.
const dir=mkdtempSync(resolve(tmpdir(),'mips-examples-'))
after(()=>rmSync(dir,{recursive:true,force:true}))
function check(id:string,code:string,cases:{input:string;output:string}[]){
 const source=resolve(dir,id+'.c'),binary=resolve(dir,id)
 writeFileSync(source,code)
 execFileSync(process.env.CC||'cc',['-std=c11','-Wall','-Wextra','-Werror',source,'-o',binary])
 for(const c of cases){
  const actual=execFileSync(binary,[],{input:c.input,encoding:'utf8',timeout:3000})
  assert.equal(actual.trim().split(/\s+/).join(' '),c.output.trim().split(/\s+/).join(' '),JSON.stringify({id,input:c.input}))
 }
}
for(const p of seeds())test(`C display example matches every built-in case: ${p.id}`,()=>{
 assert.ok(p.cExample);check(p.id,p.cExample,p.cases)
})
test('imported C examples preserve input formats and inclusive time bounds',()=>{
 check('P1001',cExamples.P1001!,[{input:'-5 9',output:'4'}])
 check('P1425',cExamples.P1425!,[{input:'12 50 19 10',output:'6 20'},{input:'0 0 24 60',output:'25 0'},{input:'0 60 2 0',output:'1 0'},{input:'5 10 6 5',output:'0 55'},{input:'10 30 10 60',output:'0 30'}])
 check('P5703',cExamples.P5703!,[{input:'3 5',output:'15'},{input:'100 100',output:'10000'}])
 check('P5704',cExamples.P5704!,Array.from({length:26},(_,i)=>({input:String.fromCharCode(97+i),output:String.fromCharCode(65+i)})))
})
