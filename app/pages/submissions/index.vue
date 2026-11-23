<script setup lang="ts">
import { ArrowRightOutlined, HistoryOutlined, FilterOutlined } from '@ant-design/icons-vue'
import type { Submission } from '../../../shared/types'
const {data:records,refresh,error}=await useFetch<Submission[]>('/api/submissions')
const verdict=ref('all')
const filtered=computed(()=>(records.value||[]).filter(s=>(verdict.value==='all'||(verdict.value==='Accepted'?s.verdict==='Accepted':s.verdict!=='Accepted'))))
let timer:ReturnType<typeof setInterval>
onMounted(()=>{timer=setInterval(()=>{if(records.value?.some(s=>['Queued','Running'].includes(s.verdict)))refresh()},1500)})
onBeforeUnmount(()=>clearInterval(timer))
const date=(v:string)=>new Date(v).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})
</script>
<template><div class="page submissions-page"><div class="page-heading"><div><h1>提交记录<span class="heading-dot">.</span></h1></div><a-button @click="refresh()">刷新记录</a-button></div><a-alert v-if="error" type="error" :message="error.message"/><div class="records-card"><div class="records-filters"><a-select v-model:value="verdict" aria-label="评测结果" :options="[{value:'all',label:'全部结果'},{value:'Accepted',label:'已通过'},{value:'failed',label:'未通过'}]"/><span class="muted">{{filtered.length}} 次提交</span></div><div v-if="!filtered.length" class="empty-state"><HistoryOutlined/><h3>还没有提交记录</h3><NuxtLink to="/" class="continue-link">去练习<ArrowRightOutlined/></NuxtLink></div><div v-else class="problem-table-wrap"><table class="problem-table"><thead><tr><th>结果</th><th>题目</th><th>得分</th><th>测试点</th><th>提交时间</th><th><span class="sr-only">详情</span></th></tr></thead><tbody><tr v-for="s in filtered" :key="s.id"><td><NuxtLink :to="'/submissions/'+s.id"><VerdictBadge :value="s.verdict"/></NuxtLink></td><td><NuxtLink :to="'/problems/'+s.problemId" class="problem-title">{{s.title}}</NuxtLink><div class="mono problem-sub">{{s.problemId}}</div></td><td class="mono">{{s.score}}</td><td class="mono">{{s.passed}} / {{s.total}}</td><td class="muted mono">{{date(s.createdAt)}}</td><td><NuxtLink :to="'/submissions/'+s.id" class="row-action" aria-label="查看评测详情"><ArrowRightOutlined/></NuxtLink></td></tr></tbody></table></div></div></div></template>
