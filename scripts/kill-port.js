import { exec } from 'child_process';

// Get the port from command line arguments
const portArg = process.argv.find(arg => /^\d+$/.test(arg));

if (!portArg) {
  console.error('Error: Please specify a port number. Example: pnpm kill 5173');
  process.exit(1);
}

const port = parseInt(portArg, 10);
const isWin = process.platform === 'win32';

const cmd = isWin
  ? `netstat -ano | findstr :${port}`
  : `lsof -t -i :${port}`;

exec(cmd, (err, stdout) => {
  if (err || !stdout.trim()) {
    console.log(`Port ${port} is not in use or no process was found.`);
    return;
  }

  const lines = stdout
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (isWin) {
    // Windows netstat output lines contain the PID at the end
    const winPids = new Set();
    lines.forEach(line => {
      const parts = line.split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid) && pid !== '0') {
        winPids.add(pid);
      }
    });

    if (winPids.size === 0) {
      console.log(`No active process found on port ${port}.`);
      return;
    }

    const killCmd = `taskkill /F /PID ${Array.from(winPids).join(' /PID ')}`;
    console.log(`Running: ${killCmd}`);
    exec(killCmd, (killErr) => {
      if (killErr) {
        console.error(`Failed to kill process on port ${port}:`, killErr.message);
      } else {
        console.log(`Successfully killed process(es) on port ${port}.`);
      }
    });
  } else {
    // macOS/Linux lsof output is a list of PIDs
    const uniquePids = Array.from(new Set(lines.filter(p => /^\d+$/.test(p))));
    if (uniquePids.length === 0) {
      console.log(`No active process found on port ${port}.`);
      return;
    }

    const killCmd = `kill -9 ${uniquePids.join(' ')}`;
    console.log(`Killing process(es) on port ${port} (PID: ${uniquePids.join(', ')})...`);
    exec(killCmd, (killErr) => {
      if (killErr) {
        console.error(`Failed to kill process on port ${port}:`, killErr.message);
      } else {
        console.log(`Successfully killed process(es) on port ${port}.`);
      }
    });
  }
});
