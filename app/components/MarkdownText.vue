<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import katex from 'katex'
// @ts-ignore package has no bundled declarations
import texmath from 'markdown-it-texmath'
const props=defineProps<{text:string}>()
const md=new MarkdownIt({html:false,linkify:true,breaks:false}).use(texmath,{engine:katex,delimiters:'dollars',katexOptions:{throwOnError:false,trust:false,strict:'ignore'}})
md.renderer.rules.image=(tokens: any[],idx:number)=>`<span class="muted">[图片：${md.utils.escapeHtml(tokens[idx].content||'题面图片')}，请到原题查看]</span>`
const html=computed(()=>md.render(props.text||''))
</script>
<template><div class="markdown" v-html="html"/></template>
