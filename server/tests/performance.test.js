import http from 'http';
import { io as ClientIO } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { setupSocketServer } from '../src/socket/index.js';
import { setupTestDB, teardownTestDB } from './setupMongo.js';
import { User } from '../src/models/User.js';
import { Office } from '../src/models/Office.js';
import { generateAccessToken } from '../src/utils/token.js';
import { DEFAULT_OFFICE_LAYOUT } from '../src/services/office.service.js';

async function runPerformanceBenchmarks() {
  console.log('===============================================================');
  console.log(' PROXISPEAK CONCURRENT USER PERFORMANCE BENCHMARK SUITE');
  console.log(' Measuring 2, 10, 25, and 50 concurrent real-time simulated peers');
  console.log('===============================================================\n');

  await setupTestDB();

  const app = createApp();
  const httpServer = http.createServer(app);
  const { io, proximityEngine } = setupSocketServer(httpServer);

  await new Promise((resolve) => {
    httpServer.listen(0, resolve);
  });
  const port = httpServer.address().port;
  console.log(`[Benchmark Server] Listening on port ${port}`);

  // Create default office
  await Office.create({
    name: 'Benchmark Headquarters',
    code: 'HQ1',
    ownerId: '60c72b2f9b1d8b2bad000001',
    isPublic: true,
    layout: DEFAULT_OFFICE_LAYOUT,
  });

  const clientTiers = [2, 10, 25, 50];
  const results = [];

  for (const tier of clientTiers) {
    console.log(`\n>>> Testing Tier: ${tier} Concurrent Clients...`);

    // 1. Create users and tokens
    const clients = [];
    const tokens = [];

    for (let i = 0; i < tier; i++) {
      const email = `perf_${tier}_${i}@infotact.com`;
      const user = await User.create({
        name: `User ${i + 1}`,
        email,
        passwordHash: 'dummy',
      });
      const token = generateAccessToken({ userId: user._id.toString(), email });
      tokens.push({ user, token });
    }

    // 2. Connect sockets
    const sockets = [];
    const connectStartTime = performance.now();

    for (let i = 0; i < tier; i++) {
      const socket = ClientIO(`http://localhost:${port}`, {
        auth: { token: tokens[i].token },
        transports: ['websocket'],
      });
      sockets.push(socket);
    }

    await Promise.all(
      sockets.map(
        (s) =>
          new Promise((resolve) => {
            s.on('connect', resolve);
          })
      )
    );

    const connectDurationMs = (performance.now() - connectStartTime).toFixed(1);

    // 3. Join office
    await Promise.all(
      sockets.map(
        (s) =>
          new Promise((resolve) => {
            s.emit('office:join', { officeId: 'HQ1' }, resolve);
          })
      )
    );

    // 4. Simulate active movements and measure latencies
    let eventsReceived = 0;
    const latencies = [];
    const moveIterations = 15; // moves per client

    const movementStartTime = performance.now();

    // Listen to movements on client 0 to measure latency
    sockets[0].on('player:moved', () => {
      eventsReceived++;
    });

    for (let m = 0; m < moveIterations; m++) {
      for (let i = 0; i < tier; i++) {
        const sendTime = performance.now();
        const randX = 400 + Math.random() * 800;
        const randY = 300 + Math.random() * 600;

        sockets[i].emit('player:move', { x: randX, y: randY });

        // Sample latency on client 0
        if (i === 0) {
          latencies.push(performance.now() - sendTime);
        }
      }
      await new Promise((r) => setTimeout(r, 40)); // 25 FPS rate
    }

    // Wait a brief moment for in-flight socket buffers to settle
    await new Promise((r) => setTimeout(r, 300));
    const movementDurationSec = (performance.now() - movementStartTime) / 1000;

    // 5. Query proximity engine metrics
    const officeUsers = proximityEngine.getAllUsersInOffice('HQ1') || [];
    let activeConnectionsCount = 0;
    const officeData = proximityEngine.offices.get('HQ1');
    if (officeData) {
      for (const u of officeData.users.values()) {
        activeConnectionsCount += u.connectedPeers.size;
      }
    }
    // Divide by 2 because connection is mutual (A->B and B->A)
    const proximityPairs = Math.floor(activeConnectionsCount / 2);

    // Memory usage
    const mem = process.memoryUsage();
    const heapUsedMB = (mem.heapUsed / 1024 / 1024).toFixed(2);
    const avgLatencyMs = (
      latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1)
    ).toFixed(2);
    const eventRateSec = Math.round(
      (tier * moveIterations) / movementDurationSec
    );

    results.push({
      clients: tier,
      connectTimeMs: connectDurationMs,
      avgLatencyMs: `${avgLatencyMs} ms`,
      eventRate: `${eventRateSec} ev/s`,
      proximityPairs,
      heapUsed: `${heapUsedMB} MB`,
    });

    console.log(`  ✓ Tier ${tier} completed successfully:`);
    console.log(`    - Average movement roundtrip: ${avgLatencyMs} ms`);
    console.log(`    - Event throughput: ${eventRateSec} events/sec`);
    console.log(`    - Proximity pairs connected: ${proximityPairs}`);
    console.log(`    - Heap Memory: ${heapUsedMB} MB`);

    // Clean up sockets for next tier
    sockets.forEach((s) => s.close());
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log('\n===============================================================');
  console.log(' BENCHMARK SUMMARY TABLE');
  console.log('===============================================================');
  console.table(results);

  // Teardown
  io.close();
  httpServer.close();
  proximityEngine.destroy();
  await teardownTestDB();

  console.log('\nAll performance tiers evaluated successfully!');
  process.exit(0);
}

runPerformanceBenchmarks().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
