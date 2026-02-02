#!/usr/bin/env node
const { spawn } = require('child_process')
const os = require('os')

function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return null
}

const ip = getLocalIP()
const port = process.env.PORT || 3000

console.log('\n' + '─'.repeat(52))
console.log('  🚀 Next.js dev server (LAN access enabled)')
console.log('─'.repeat(52))
console.log('  Local:   http://localhost:' + port)
if (ip) {
  console.log('  Network: http://' + ip + ':' + port + '  ← iPhone/otros dispositivos')
} else {
  console.log('  Network: (no se detectó IP de red)')
}
console.log('─'.repeat(52) + '\n')

const proc = spawn('npx', ['next', 'dev', '-H', '0.0.0.0'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
})

proc.on('exit', (code) => process.exit(code ?? 0))
