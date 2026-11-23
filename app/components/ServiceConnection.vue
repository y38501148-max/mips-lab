<script setup lang="ts">
const connected=ref(true)
let timer:ReturnType<typeof setTimeout>|undefined,stopped=false,checking=false,failures=0
async function check(){if(stopped||checking)return;checking=true;const previous=connected.value
 try{await $fetch('/api/health',{timeout:2500});connected.value=true;failures=0;if(!previous){window.dispatchEvent(new Event('mips-lab-reconnected'));await refreshNuxtData()}}
 catch{connected.value=false;failures++}
 finally{checking=false;if(!stopped)timer=setTimeout(check,connected.value?5000:Math.min(10000,1000*2**Math.min(failures-1,3)))}
}
function online(){clearTimeout(timer);void check()}
function offline(){connected.value=false}
onMounted(()=>{void check();window.addEventListener('online',online);window.addEventListener('offline',offline)})
onBeforeUnmount(()=>{stopped=true;clearTimeout(timer);window.removeEventListener('online',online);window.removeEventListener('offline',offline)})
</script>
<template><span :class="['local-pill',{'connection-lost':!connected}]" role="status" aria-live="polite"><span :class="['status-dot',{offline:!connected}]"/>{{connected?'已连接':'连接中断，正在重连…'}}</span></template>
