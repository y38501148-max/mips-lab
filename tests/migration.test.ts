import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {execFileSync} from 'node:child_process'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'
import {seeds} from '../server/utils/seeds'

test('existing data receives examples once while retaining cases, generation and C history',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'mips-migration-'))
 const db=new DatabaseSync(resolve(dir,'mips-lab.sqlite'))
 db.exec('CREATE TABLE records (kind TEXT,id TEXT,value TEXT,PRIMARY KEY(kind,id))')
 const put=(kind:string,id:string,value:unknown)=>db.prepare('INSERT OR REPLACE INTO records VALUES (?,?,?)').run(kind,id,JSON.stringify(value))
 const get=(kind:string,id:string)=>JSON.parse((db.prepare('SELECT value FROM records WHERE kind=? AND id=?').get(kind,id) as any).value)
 const {cExample,...p}=seeds().find(p=>p.id==='M001')!
 const original={...p,cases:[{input:'7\n8\n',output:'15',label:'saved'}],generation:{model:'saved-model',notes:'saved-notes'},verification:'手动数据'}
 put('meta','seeded',true);put('meta','exam-rules-v1',true);put('problem',p.id,original)
 const history={id:'old-c',language:'c',problemId:p.id,code:'int main(){}',verdict:'Accepted'}
 put('submission',history.id,history);put('settings','llm',{model:'saved-model',apiKey:'fixture-key',delayedBranching:false})
 const migrate=()=>execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',"await import('./server/utils/store.ts')"],{env:{...process.env,MIPS_LAB_DATA_DIR:dir},stdio:'pipe'})
 try{
  migrate()
  assert.equal(get('problem',p.id).cExample,cExample)
  const {cExample:added,...after}=get('problem',p.id)
  assert.deepEqual(after,original)
  assert.deepEqual(get('submission',history.id),history)
  assert.equal(get('settings','llm').apiKey,'fixture-key')
  put('problem',p.id,{...get('problem',p.id),cExample:'custom example'})
  migrate();assert.equal(get('problem',p.id).cExample,'custom example')
 }finally{db.close();rmSync(dir,{recursive:true,force:true})}
})
