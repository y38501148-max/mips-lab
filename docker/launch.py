"""Trusted launcher: resource limits and seccomp before executing student code."""
import ctypes, ctypes.util, errno, os, resource, sys
kind=sys.argv[1]
resource.setrlimit(resource.RLIMIT_CPU,(8,8))
resource.setrlimit(resource.RLIMIT_FSIZE,(8*1024*1024,8*1024*1024))
resource.setrlimit(resource.RLIMIT_NOFILE,(64,64))
resource.setrlimit(resource.RLIMIT_CORE,(0,0))
resource.setrlimit(resource.RLIMIT_NPROC,(48,48))
if kind!='mips':
    resource.setrlimit(resource.RLIMIT_AS,(512*1024*1024,512*1024*1024))
seccomp=ctypes.CDLL('libseccomp.so.2',use_errno=True)
seccomp.seccomp_init.argtypes=[ctypes.c_uint32];seccomp.seccomp_init.restype=ctypes.c_void_p
seccomp.seccomp_syscall_resolve_name.argtypes=[ctypes.c_char_p];seccomp.seccomp_syscall_resolve_name.restype=ctypes.c_int
seccomp.seccomp_rule_add.argtypes=[ctypes.c_void_p,ctypes.c_uint32,ctypes.c_int,ctypes.c_uint]
seccomp.seccomp_load.argtypes=[ctypes.c_void_p];seccomp.seccomp_release.argtypes=[ctypes.c_void_p]
context=seccomp.seccomp_init(0x7fff0000)
if not context:raise RuntimeError('seccomp initialization failed')
blocked=['socket','socketpair','connect','bind','listen','accept','accept4','setsid','setpgid','ptrace','process_vm_readv','process_vm_writev','mount','umount2','unshare','setns','bpf','keyctl','perf_event_open']
if kind != 'mips':blocked+=['clone','clone3','fork','vfork']
for name in blocked:
    number=seccomp.seccomp_syscall_resolve_name(name.encode())
    if number>=0 and seccomp.seccomp_rule_add(context,0x00050000|errno.EPERM,number,0)!=0:
        raise RuntimeError('seccomp rule failed: '+name)
if seccomp.seccomp_load(context)!=0:raise RuntimeError('seccomp load failed')
seccomp.seccomp_release(context)
os.execv(sys.argv[2],sys.argv[2:])
