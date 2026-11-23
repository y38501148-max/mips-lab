import socket
with socket.socket(socket.AF_UNIX) as connection:
    connection.settimeout(2)
    connection.connect('/run/mips-worker/worker.sock')
    connection.sendall(b'GET /health HTTP/1.0\r\n\r\n')
    assert b'200' in connection.recv(1024)
