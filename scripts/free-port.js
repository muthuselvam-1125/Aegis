const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Clean stale production build artifacts from .next to prevent Turbopack 404 routing errors
try {
  const nextDir = path.join(__dirname, '..', '.next');
  if (fs.existsSync(path.join(nextDir, 'BUILD_ID'))) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('Cleaned stale production build artifacts from .next for dev mode');
  }
} catch (e) {}

// Free port 3000 if occupied by another background process
try {
  if (process.platform === 'win32') {
    const currentPid = String(process.pid);
    const parentPid = String(process.ppid || '');
    let output = '';
    try {
      output = execSync('netstat -ano | findstr :3000', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      output = '';
    }
    const lines = output.trim().split(/\r?\n/);
    const pids = new Set();
    for (const line of lines) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== currentPid && pid !== parentPid) {
          pids.add(pid);
        }
      }
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        console.log(`Freed port 3000 (stopped old process ${pid})`);
      } catch (e) {}
    }
  }
} catch (e) {
  // Silent fallback
}
