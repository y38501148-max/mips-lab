import { defineEventHandler,getHeader,createError,setHeader } from 'h3'
export default defineEventHandler(event=>{
 const host=(getHeader(event,'host')||'').split(':')[0]
 if(!['localhost','127.0.0.1','['].includes(host))throw createError({statusCode:403,statusMessage:'Local access only'})
 setHeader(event,'X-Content-Type-Options','nosniff')
 setHeader(event,'Referrer-Policy','no-referrer')
 setHeader(event,'X-Frame-Options','DENY')
})
