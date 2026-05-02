// Pure Node.js port killer — kills any process holding the given port via /proc/net/tcp
import { readFileSync, readdirSync, readlinkSync } from 'fs';

const port = parseInt(process.env.PORT || '8080', 10);
const hexPort = port.toString(16).toUpperCase().padStart(4, '0');

let killed = 0;

for (const file of ['/proc/net/tcp6', '/proc/net/tcp']) {
  try {
    const lines = readFileSync(file, 'utf8').split('\n').slice(1);
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const localAddr = parts[1];
      if (!localAddr) continue;
      // Match e.g. "00000000:1F90" or "0000000000000000FFFF00000000:1F90"
      if (!localAddr.toUpperCase().endsWith(`:${hexPort}`)) continue;
      const inode = parts[9];
      if (!inode || inode === '0') continue;

      // Find PID owning this inode
      for (const pid of readdirSync('/proc').filter(p => /^\d+$/.test(p))) {
        try {
          const fds = readdirSync(`/proc/${pid}/fd`);
          for (const fd of fds) {
            try {
              const link = readlinkSync(`/proc/${pid}/fd/${fd}`);
              if (link === `socket:[${inode}]`) {
                process.kill(parseInt(pid), 'SIGKILL');
                console.log(`[kill-port] Killed PID ${pid} holding port ${port}`);
                killed++;
              }
            } catch { /* fd unreadable */ }
          }
        } catch { /* pid gone or no permission */ }
      }
    }
  } catch { /* file not found */ }
}

if (killed === 0) console.log(`[kill-port] No process found on port ${port}`);
