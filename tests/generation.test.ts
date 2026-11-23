import{test,after}from'node:test'
import assert from'node:assert/strict'
import{randomUUID}from'node:crypto'
import{mkdtempSync,rmSync}from'node:fs'
import{resolve}from'node:path'
import{tmpdir}from'node:os'
import{createServer}from'node:http'
const data=mkdtempSync(resolve(tmpdir(),'mips-generation-test-'));process.env.MIPS_LAB_DATA_DIR=data
const{completionBody,completionDetailed,createGeneration}=await import('../server/utils/llm')
const{validatePlan,GenerationFailure}=await import('../server/utils/generation')
const{defaultSettings,put,get}=await import('../server/utils/store')
const{seeds}=await import('../server/utils/seeds')
const p=seeds().find(x=>x.id==='M001')!
after(()=>rmSync(data,{recursive:true,force:true}))
test('DeepSeek sends explicit thinking and effort, omits temperature, and budgets connection tests',()=>{
 const s={...defaultSettings,model:'deepseek-v4.1-flash',reasoningEffort:'max' as const}
 const body=completionBody(s,[],false,true);assert.deepEqual(body.thinking,{type:'enabled'});assert.equal(body.reasoning_effort,'max');assert.equal('temperature'in body,false);assert.deepEqual(body.response_format,{type:'json_object'});assert.equal(body.max_tokens,s.maxTokens);assert.ok(Number(completionBody(s,[],true).max_tokens)>=2048)
 const generic=completionBody({...defaultSettings,model:'local-model'},[]);assert.equal('thinking'in generic,false);assert.equal('reasoning_effort'in generic,false);assert.equal(generic.temperature,0.2)
 const openai=completionBody({...s,model:'gpt-5',reasoningMode:'openai'},[]);assert.equal('max_tokens'in openai,false);assert.equal(openai.max_completion_tokens,s.maxTokens)
})
test('count mismatches preserve actual count; mismatches preserve the reproducible input and both outputs',async()=>{
 await assert.rejects(validatePlan(p,2,async()=>JSON.stringify([{input:'1\n2\n'}]),()=>{}),(error:any)=>{assert.ok(error instanceof GenerationFailure);assert.equal(error.diagnostic.actualCount,1);assert.equal(error.diagnostic.expectedCount,2);return true})
 await assert.rejects(validatePlan(p,1,async key=>key==='generator'?JSON.stringify([{input:'1\n2\n'}]):key==='validator'?'':key==='reference'?'3':'4',()=>{}),(error:any)=>{assert.equal(error.diagnostic.stage,'双解比较');assert.equal(error.diagnostic.input,p.samples[0]!.input);assert.equal(error.diagnostic.referenceOutput,'3');assert.equal(error.diagnostic.checkerOutput,'4');return true})
})
test('invalid generated count is repaired once with concrete feedback, while keeping keys and reasoning text out of artifacts',async()=>{
 const seen:any[]=[]
 const testApiKey = randomUUID()
 const server=createServer((req,res)=>{let raw='';req.on('data',b=>raw+=b);req.on('end',()=>{const body=JSON.parse(raw);seen.push(body);const rows=seen.length===1?'[{"input":"2\\n3\\n","label":"small"}]':'[{"input":"2\\n3\\n","label":"small"},{"input":"0\\n0\\n","label":"zero"}]';const plan={generator:'import json\nprint(json.dumps('+rows+'))',reference:'import sys\na,b=map(int,sys.stdin.read().split())\nprint(a+b)',checker:'import sys\nprint(sum(map(int,sys.stdin.read().split())))',validator:'import sys\na=list(map(int,sys.stdin.read().split()))\nassert len(a)==2',notes:'fixture'};res.setHeader('content-type','application/json');res.end(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(plan),reasoning_content:'DO_NOT_PERSIST_REASONING'}}],usage:{completion_tokens:500,completion_tokens_details:{reasoning_tokens:123}}}))})})
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const port=(server.address()as any).port
 try{const s={...defaultSettings,baseUrl:`http://127.0.0.1:${port}/v1`,model:'deepseek-v4.1-flash',apiKey:testApiKey,reasoningEffort:'high',autoRepair:true};put('settings','llm',s);put('problem',p.id,p);const job=createGeneration(p,2);let current:any;for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,100));current=get('job',job.id);if(['done','failed'].includes(current.state))break}assert.equal(current.state,'done',current.message);assert.equal(current.attempts.length,2);assert.equal(current.attempts[0].diagnostic.actualCount,1);assert.equal(current.attempts[1].completion.reasoningObserved,true);assert.equal(current.attempts[1].completion.reasoningTokens,123);assert.deepEqual(seen[0].thinking,{type:'enabled'});assert.equal(seen[0].reasoning_effort,'high');assert.match(seen[1].messages.at(-1).content,/expectedCount/);assert.equal(get<any>('problem',p.id).cases.length,3);assert.equal(JSON.stringify(current).includes(testApiKey),false);assert.equal(JSON.stringify(current).includes('DO_NOT_PERSIST_REASONING'),false)}finally{server.close()}
})
test('truncated replies report token exhaustion instead of silently parsing partial programs',async()=>{
 const server=createServer((req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{"gener'}}]}))})
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const port=(server.address()as any).port
 try{await assert.rejects(completionDetailed({...defaultSettings,model:'fixture',baseUrl:`http://127.0.0.1:${port}/v1`},[]),/Token 上限截断/)}finally{server.close()}
})
