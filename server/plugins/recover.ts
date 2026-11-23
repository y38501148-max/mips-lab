import {all,get,put,remove} from '../utils/store'
import {enqueueJudge} from '../utils/judge'
import type {Submission,Problem} from '../../shared/types'
export default defineNitroPlugin(()=>{
 for(const sub of all<Submission>('submission')){
  if(!['Queued','Running'].includes(sub.verdict))continue
  if(sub.language!=='mips'){put('submission',sub.id,{...sub,verdict:'System Error',error:'C 评测已停用。'});remove('judge-request',sub.id);continue}
  const snapshot=get<{problem:Problem}>('judge-request',sub.id)
  const p=snapshot?.problem||get<Problem>('problem',sub.problemId)
  if(!p){put('submission',sub.id,{...sub,verdict:'System Error',error:'原题已不存在，请重新选择题目。'});continue}
  const resumed={...sub,verdict:'Queued',passed:0,score:0,results:[],error:undefined}
  put('submission',sub.id,resumed);enqueueJudge(resumed,p)
 }
})
