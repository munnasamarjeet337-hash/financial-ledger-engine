const http = require('http');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhY2JkYTNjOTA1ZDRiYmVmNTIyYzc1NyIsImVtYWlsIjoidXNlcjFAdGVzdC5jb20iLCJhY2NvdW50X2lkIjoiNmFjYmRhM2M5MDVkNGJiZWY1MjJjNzU4IiwiaWF0IjoxNzkxNzQ4MTM2LCJleHAiOjE3OTE4MzQ1MzZ9.HNbcrDQDM04u4SKBVbj2-Gh1DdsB20AdK8-vZ6jUpGU';

const TOTAL_REQUESTS = 1000;
const CONCURRENT = 10;

let successCount = 0;
let failCount = 0;
let completed = 0;
let firstError = null;

const startTime = Date.now();

function sendRequest(index) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      from: '6acbda3c905d4bbef522c758',
      to: '6acbdba5905d4bbef522c75c',
      amount: 1
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/transfer',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${TOKEN}`,
        'X-Idempotency-Key': `key-${index}-${Date.now()}-${Math.random()}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          successCount++;
        } else {
          failCount++;
          if (!firstError) {
            firstError = `Status ${res.statusCode}: ${data}`;
          }
        }
        completed++;
        if (completed % 100 === 0) {
          console.log(`Completed: ${completed}/${TOTAL_REQUESTS} | Success: ${successCount} | Fail: ${failCount}`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      failCount++;
      if (!firstError) firstError = err.message;
      completed++;
      resolve();
    });

    req.write(body);
    req.end();
  });
}

async function runLoadTest() {
  console.log(`Starting load test: ${TOTAL_REQUESTS} requests, ${CONCURRENT} concurrent\n`);

  const batches = Math.ceil(TOTAL_REQUESTS / CONCURRENT);

  for (let b = 0; b < batches; b++) {
    const promises = [];
    for (let i = 0; i < CONCURRENT; i++) {
      const index = b * CONCURRENT + i;
      if (index >= TOTAL_REQUESTS) break;
      promises.push(sendRequest(index));
    }
    await Promise.all(promises);
  }

  const duration = (Date.now() - startTime) / 1000;

  console.log('\n========== LOAD TEST RESULTS ==========');
  console.log(`Total Requests: ${TOTAL_REQUESTS}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  console.log(`Requests/sec: ${(TOTAL_REQUESTS / duration).toFixed(2)}`);
  if (firstError) {
    console.log(`\nFirst Error: ${firstError}`);
  }
  console.log('=======================================\n');
}

runLoadTest();