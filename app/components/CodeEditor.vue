<script setup lang="ts">
import { EditorView, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap,history,historyKeymap,indentWithTab } from '@codemirror/commands'
import { StreamLanguage,bracketMatching,defaultHighlightStyle,syntaxHighlighting } from '@codemirror/language'
const mipsMode={token(stream:any){if(stream.eatSpace())return null;if(stream.match(/^#.*/))return 'comment';if(stream.match(/^\$[a-zA-Z0-9]+/))return 'variableName';if(stream.match(/^\.[a-zA-Z_]+/))return 'meta';if(stream.match(/^-?(?:0x[0-9a-fA-F]+|[0-9]+)/))return 'number';if(stream.match(/^"(?:[^"\\]|\\.)*"/))return 'string';if(stream.match(/^[a-zA-Z_][\w.]*:/))return 'labelName';if(stream.match(/^[a-zA-Z_][\w.]*/))return 'keyword';stream.next();return null}}
import { oneDark } from '@codemirror/theme-one-dark'
const props=defineProps<{modelValue:string;language:'mips'}>()
const emit=defineEmits<{ 'update:modelValue':[value:string] }>()
const host=ref<HTMLElement>();let view:EditorView|undefined
onMounted(()=>{
 view=new EditorView({parent:host.value,state:EditorState.create({doc:props.modelValue,extensions:[lineNumbers(),highlightActiveLineGutter(),highlightSpecialChars(),drawSelection(),highlightActiveLine(),history(),bracketMatching(),syntaxHighlighting(defaultHighlightStyle),StreamLanguage.define(mipsMode),oneDark,keymap.of([indentWithTab,...defaultKeymap,...historyKeymap]),EditorView.contentAttributes.of({'aria-label':'MIPS 代码编辑器','spellcheck':'false'}),EditorView.updateListener.of(update=>{if(update.docChanged)emit('update:modelValue',update.state.doc.toString())}),EditorView.theme({'&':{height:'100%',fontSize:'14px',backgroundColor:'#20272e'},'.cm-scroller':{fontFamily:'"SFMono-Regular",Consolas,"Liberation Mono",monospace',lineHeight:'1.85'},'.cm-content':{padding:'18px 0'},'.cm-gutters':{backgroundColor:'#20272e',border:'none',color:'#6d7c87'},'.cm-lineNumbers .cm-gutterElement':{padding:'0 16px 0 14px'},'.cm-activeLine':{backgroundColor:'#ffffff04'},'&.cm-focused':{outline:'none'}})]})})
})
watch(()=>props.modelValue,value=>{if(view&&value!==view.state.doc.toString())view.dispatch({changes:{from:0,to:view.state.doc.length,insert:value}})})
onBeforeUnmount(()=>view?.destroy())
</script>
<template><div ref="host" class="code-editor"/></template>
