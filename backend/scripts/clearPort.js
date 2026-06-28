const { execSync } = require('child_process');

function killPort(port) {
  console.log(`Checking port ${port}...`);
  try {
    const command = process.platform === 'win32' 
      ? `netstat -ano | findstr :${port}` 
      : `lsof -i :${port} -t`;
    
    const stdout = execSync(command, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    const lines = stdout.trim().split('\n');
    const pids = new Set();
    
    if (process.platform === 'win32') {
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        // On Windows netstat: [Protocol, Local Address, Foreign Address, State, PID]
        if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
          const pid = parts[parts.length - 1];
          if (pid !== '0' && pid !== process.pid.toString()) {
            pids.add(pid);
          }
        }
      });
    } else {
      lines.forEach(pid => {
        if (pid && pid !== process.pid.toString()) pids.add(pid);
      });
    }

    if (pids.size === 0) {
      console.log(`Port ${port} is clear.`);
      return;
    }

    pids.forEach(pid => {
      try {
        console.log(`Killing process ${pid} using port ${port}...`);
        const killCmd = process.platform === 'win32' ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;
        execSync(killCmd, { stdio: 'ignore' });
      } catch (err) {
        // Process might already be gone
      }
    });
    
    console.log(`Successfully cleared port ${port}.`);
  } catch (e) {
    // Command failed usually means port is not in use
    console.log(`Port ${port} is not in use.`);
  }
}

// Clear port 5000 (backend) and 5173 (frontend if needed)
killPort(5000);
// killPort(5173); // Usually Vite handles itself but good to have
