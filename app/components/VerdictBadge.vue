<script setup lang="ts">
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, ClockCircleOutlined } from '@ant-design/icons-vue'
const props=defineProps<{value:string}>()
const active=computed(()=>['Queued','Running'].includes(props.value))
const labels:Record<string,string>={'Accepted':'通过','Wrong Answer':'答案错误','Compile Error':'编译错误','Runtime Error':'运行错误','Time Limit Exceeded':'超时','Output Limit Exceeded':'输出超限','System Error':'评测异常','Queued':'排队中','Running':'评测中'}
</script>
<template><span :class="['verdict-badge',value==='Accepted'?'success':active?'pending':'failure']"><LoadingOutlined v-if="active" spin/><CheckCircleOutlined v-else-if="value==='Accepted'"/><ClockCircleOutlined v-else-if="value==='Time Limit Exceeded'"/><CloseCircleOutlined v-else/>{{labels[value]||value}}</span></template>
