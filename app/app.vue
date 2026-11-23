<script setup lang="ts">
import type { SystemStatus } from '../shared/types'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { AppstoreOutlined, CodeOutlined, HistoryOutlined, SettingOutlined, ArrowUpOutlined } from '@ant-design/icons-vue'
const route=useRoute()
function scrollTop(){window.scrollTo({top:0,behavior:"smooth"})}
const {data:system}=await useFetch<SystemStatus>('/api/system')
const links=[{to:'/',label:'练习题库',icon:AppstoreOutlined},{to:'/submissions',label:'提交记录',icon:HistoryOutlined},{to:'/settings',label:'模型与设置',icon:SettingOutlined}]
const theme={token:{colorPrimary:'#31866b',colorSuccess:'#31866b',colorText:'#25313b',colorTextSecondary:'#6d7780',colorBorder:'#e2e7e5',borderRadius:8,fontFamily:'Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',fontSize:14,controlHeight:38},components:{Button:{primaryShadow:'none'},Table:{headerBg:'#f8faf9',rowHoverBg:'#f4f8f6'}}}
</script>
<template>
<a-extract-style><a-config-provider :locale="zhCN" :theme="theme">
<div class="app-shell">
 <aside class="sidebar">
  <NuxtLink to="/" class="brand"><span class="brand-symbol"><CodeOutlined /></span><span>MIPS<span class="brand-lab">lab</span><small>汇编练习室</small></span></NuxtLink>

  <nav aria-label="主导航"><NuxtLink v-for="link in links" :key="link.to" :to="link.to" :class="['nav-link',{active:link.to==='/'?(route.path==='/'||route.path.startsWith('/problems')):route.path.startsWith(link.to)}]"><component :is="link.icon"/><span>{{link.label}}</span></NuxtLink></nav>
  <div class="sidebar-course"><strong>北航软院 · MIPS</strong></div>
  <div class="sidebar-bottom"><span :class="['status-dot',{offline:!system?.mars}]"/><span>{{system?.mars?'本地评测已就绪':'MARS 尚未就绪'}}</span><small>v0.1</small></div>
 </aside>
 <div class="main-shell"><header class="topbar"><div class="breadcrumbs">我的工作台 <span>/</span> <strong>{{route.path.startsWith('/settings')?'模型与设置':route.path.startsWith('/submissions')?'提交记录':route.path.startsWith('/problems')?'练习工作台':'练习题库'}}</strong></div><div class="topbar-right"><ServiceConnection/><span class="avatar">M</span></div></header><main><NuxtPage/></main><footer class="page-footer"><span>MIPS Lab</span><a href="#" aria-label="返回顶部" @click.prevent="scrollTop()"><ArrowUpOutlined/></a></footer></div>
</div>
</a-config-provider></a-extract-style>
</template>
