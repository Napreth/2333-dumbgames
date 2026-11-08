import { createServer } from 'vite'

const seeds = Number(process.argv[2] ?? 10000)
const gates = Number(process.argv[3] ?? 500)
if (![seeds, gates].every((value) => Number.isSafeInteger(value) && value > 0)) {
  throw new Error('Usage: pnpm balance:number-gates [seeds] [gates] [policy]')
}

const vite = await createServer({
  configFile: false, logLevel: 'silent', optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null, ws: false },
})
try {
  const { simulateBalance, policies } = await vite.ssrLoadModule('/src/games/number-gates/simulation/balance.ts')
  const policy = process.argv[4]
  if (policy && !policies.includes(policy)) throw new Error(`Unknown policy: ${policy}`)
  const results = []
  for (const name of policy ? [policy] : policies) {
    const result = simulateBalance(seeds, gates, name)
    results.push(result)
    console.error(`${name}: ${result.gates} gates, ${result.violations} invalid routes or encounters`)
  }
  console.log(JSON.stringify(results, null, 2))
  if (results.some(({ violations }) => violations > 0)) process.exitCode = 1
} finally {
  await vite.close()
}
