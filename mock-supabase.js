const http = require('http')
const fs = require('fs')

const log = (message) => {
  fs.appendFileSync('mock-supabase.log', `[${new Date().toISOString()}] ${message}\n`)
}

const trainers = [
  { id: 1, slug: 'edu' },
  { id: 2, slug: 'carolina' }
]

let plans = []
let nextId = 1

const server = http.createServer((req, res) => {
  log(`${req.method} ${req.url} :: Accept=${req.headers['accept']}`)
  const urlObj = new URL(req.url, 'http://localhost')
  const rangeHeader = (rows) => (rows.length > 0 ? `0-${rows.length - 1}/${rows.length}` : '0-0/0')

  if (urlObj.pathname === '/rest/v1/trainers' && req.method === 'GET') {
    const slugParam = urlObj.searchParams.get('slug')
    let rows = [...trainers]
    if (slugParam) {
      const value = slugParam.split('.').pop()
      rows = rows.filter((row) => row.slug === value)
    }
    const accept = req.headers['accept']
    const responseBody = accept === 'application/vnd.pgrst.object' ? rows[0] ?? null : rows
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Range': rangeHeader(rows) })
    res.end(JSON.stringify(responseBody))
    return
  }

  if (urlObj.pathname === '/rest/v1/plans' && req.method === 'POST') {
    let raw = ''
    req.on('data', (chunk) => (raw += chunk))
    req.on('end', () => {
      try {
        const payload = JSON.parse(raw || '{}')
        const row = { id: nextId++, ...payload }
        plans.push(row)
        const accept = req.headers['accept']
        const responseBody = accept === 'application/vnd.pgrst.object' ? row : [row]
        res.writeHead(201, { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' })
        res.end(JSON.stringify(responseBody))
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error.message }))
      }
    })
    return
  }

  if (urlObj.pathname === '/rest/v1/plans' && req.method === 'GET') {
    const accept = req.headers['accept']
    const responseBody = accept === 'application/vnd.pgrst.object' ? plans[0] ?? null : plans
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Range': rangeHeader(plans) })
    res.end(JSON.stringify(responseBody))
    return
  }

  res.writeHead(404)
  res.end()
})

server.listen(54321, () => {
  console.log('Mock Supabase listening on http://127.0.0.1:54321')
})

