"""Offline judge worker. Only the web UID can access its Unix socket."""
import base64, errno, json, os, resource, selectors, shutil, signal, socketserver, subprocess, tempfile, threading, time
from http.server import BaseHTTPRequestHandler
from pathlib import Path

SOCKET = '/run/mips-worker/worker.sock'
ROOT = Path('/work/jobs')
ROOT.mkdir(parents=True, exist_ok=True)
os.chmod(ROOT, 0o711)
semaphore = threading.BoundedSemaphore(3)
uid_lock = threading.Lock()
next_uid = 20000

def execute(payload):
    global next_uid
    kind = payload.get('kind')
    if kind not in ('mips', 'python'):
        raise ValueError('unsupported operation')
    with uid_lock:
        uid = next_uid
        next_uid += 1
        if next_uid > 60000:
            next_uid = 20000
    directory = Path(tempfile.mkdtemp(dir=ROOT))
    start = time.monotonic()
    try:
        files = payload.get('files', {})
        if not isinstance(files, dict) or len(files) > 8:
            raise ValueError('invalid files')
        allowed = {'main.asm','generator.py','reference.py','checker.py','validator.py','test.py'}
        total = 0
        for name, encoded in files.items():
            if name not in allowed or not isinstance(encoded, str):
                raise ValueError('invalid filename')
            content = base64.b64decode(encoded, validate=True)
            total += len(content)
            if total > 2 * 1024 * 1024:
                raise ValueError('input files too large')
            path = directory / name
            path.write_bytes(content)
            os.chmod(path, 0o600)
            os.chown(path, uid, uid)
        os.chmod(directory, 0o700)
        os.chown(directory, uid, uid)
        if kind == 'python':
            script = payload.get('script')
            if script not in allowed or not script.endswith('.py'):
                raise ValueError('invalid script')
            command = ['/usr/bin/python3','-I','-S',str(directory / script)]
        else:
            steps = min(max(int(payload.get('steps', 5000000)),1),20000000)
            command = ['/opt/java/openjdk/bin/java','-Xmx256m','-XX:ActiveProcessorCount=2','-Djava.awt.headless=true','-Djava.util.prefs.userRoot='+str(directory),'-cp','/opt/mips:/opt/mips/Mars4_5.jar','LabRunner',str(directory/'main.asm'),str(steps),'false']
        timeout = min(max(int(payload.get('timeout',5000)),100),15000) / 1000
        maximum = min(max(int(payload.get('maxOutput',1048576)),1024),1048576)
        source = payload.get('input','').encode()
        if len(source) > 65536:
            raise ValueError('stdin too large')
        stdin_path = directory/'stdin'
        stdin_path.write_bytes(source)
        os.chmod(stdin_path,0o600)
        os.chown(stdin_path,uid,uid)
        with stdin_path.open('rb') as stdin:
            process = subprocess.Popen(['/usr/bin/python3','-I','-S','/opt/worker/launch.py',kind,*command],cwd=directory,env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8','HOME':str(directory),'TMPDIR':str(directory)},stdin=stdin,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True,user=uid,group=uid,extra_groups=[])
        selector=selectors.DefaultSelector()
        selector.register(process.stdout,selectors.EVENT_READ,0)
        selector.register(process.stderr,selectors.EVENT_READ,1)
        output=[bytearray(),bytearray()]
        timed_out=limited=False
        deadline=time.monotonic()+timeout
        try:
            while selector.get_map():
                if time.monotonic()>deadline:
                    timed_out=True
                    break
                for key,_ in selector.select(min(0.1,max(0,deadline-time.monotonic()))):
                    block=os.read(key.fileobj.fileno(),65536)
                    if not block:
                        selector.unregister(key.fileobj)
                        continue
                    if sum(map(len,output))+len(block)>maximum:
                        limited=True
                        break
                    output[key.data].extend(block)
                if limited:
                    break
        finally:
            if not timed_out and not limited:
                try: process.wait(timeout=max(0.05,deadline-time.monotonic()))
                except subprocess.TimeoutExpired: timed_out=True
            try: os.killpg(process.pid,signal.SIGKILL)
            except ProcessLookupError: pass
            process.wait()
            selector.close()
            process.stdout.close();process.stderr.close()
        result={'stdout':output[0].decode('utf8','replace'),'stderr':output[1].decode('utf8','replace'),'exitCode':process.returncode,'timedOut':timed_out,'limited':limited,'duration':round((time.monotonic()-start)*1000)}
        return result
    finally:
        shutil.rmtree(directory,ignore_errors=True)

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def reply(self,status,data):
        encoded=json.dumps(data).encode()
        self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(encoded)));self.end_headers()
        try:self.wfile.write(encoded)
        except BrokenPipeError:pass
    def do_GET(self):
        self.reply(200,{'ready':True}) if self.path=='/health' else self.reply(404,{'error':'not found'})
    def do_POST(self):
        if self.path!='/execute':return self.reply(404,{'error':'not found'})
        if not semaphore.acquire(blocking=False):return self.reply(429,{'error':'评测繁忙，请稍后重试。'})
        try:
            size=int(self.headers.get('Content-Length','0'))
            if size<=0 or size>3000000:raise ValueError('request too large')
            self.reply(200,execute(json.loads(self.rfile.read(size))))
        except Exception as error:self.reply(400,{'error':str(error)[:500]})
        finally:semaphore.release()

class Server(socketserver.ThreadingMixIn,socketserver.UnixStreamServer):
    daemon_threads=True

os.makedirs(os.path.dirname(SOCKET),exist_ok=True)
os.chmod(os.path.dirname(SOCKET),0o711)
try:os.unlink(SOCKET)
except FileNotFoundError:pass
server=Server(SOCKET,Handler)
os.chmod(SOCKET,0o600);os.chown(SOCKET,1000,1000)
print('Offline judge worker ready',flush=True)
server.serve_forever()
