<script setup lang="ts">
import { ArrowLeftOutlined, CodeOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import type { Submission } from '../../../shared/types'
const route=useRoute()
const {data:s,refresh,error}=await useFetch<Submission>('/api/submissions/'+route.params.id)
let timer:ReturnType<typeof setInterval>
onMounted(()=>{timer=setInterval(()=>{if(s.value&&['Queued','Running'].includes(s.value.verdict))refresh()},1000)})
onBeforeUnmount(()=>clearInterval(timer))
const showCode=ref(false)
function download(){if(!s.value)return;const u=URL.createObjectURL(new Blob([s.value.code],{type:'text/plain'}));const a=document.createElement('a');a.href=u;a.download=s.value.problemId+(s.value.language==='c'?'.c':'.asm');a.click();URL.revokeObjectURL(u)}
</script>
<template><div class="page submission-detail"><NuxtLink to="/submissions" class="back-link"><ArrowLeftOutlined/>提交记录</NuxtLink><template v-if="s"><div class="page-heading"><div><span class="eyebrow">{{s.problemId}} / {{s.language==='c'?'C11（历史）':'MIPS32'}}</span><h1>{{s.title}}</h1><p class="page-description">{{new Date(s.createdAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}} · 总耗时 {{s.duration}} ms</p></div><NuxtLink :to="'/problems/'+s.problemId"><a-button type="primary">返回题目</a-button></NuxtLink></div><div class="settings-card"><SubmissionResult :submission="s"/><div class="submission-metadata">{{s.language==='mips'?'延迟槽：'+(s.settings?.delayedBranching?'开启':'关闭')+' · ':''}}数据版本：{{s.dataVersion||'—'}}<span>输出按空白分隔比较</span></div></div><div class="settings-card code-record"><div class="data-heading"><button class="text-button" @click="showCode=!showCode"><CodeOutlined/>{{showCode?'收起提交代码':'查看提交代码'}}</button><a-button size="small" @click="download"><DownloadOutlined/>下载代码</a-button></div><pre v-if="showCode" class="source-code">{{s.code}}</pre></div></template><a-result v-else status="404" title="记录不存在" :sub-title="error?.message"/></div></template>
