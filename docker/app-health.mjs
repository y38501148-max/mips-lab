try{const r=await fetch('http://127.0.0.1:3210/api/health',{signal:AbortSignal.timeout(3000)});if(!r.ok)process.exit(1)}catch{process.exit(1)}
