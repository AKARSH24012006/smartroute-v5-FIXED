import { spawn } from "node:child_process";

const processes = [
  spawn("npm", ["run", "dev:server"], { stdio: "inherit", shell: true }),
  spawn("npm", ["run", "dev:client"], { stdio: "inherit", shell: true })
];

const shutdown = () => {
  for (const proc of processes) {
    if (!proc.killed) {
      proc.kill();
    }
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

for (const proc of processes) {
  proc.on("exit", code => {
    if (code && code !== 0) {
      shutdown();
      process.exit(code);
    }
  });
}
