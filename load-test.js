const autocannon = require('autocannon');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhY2JkYTNjOTA1ZDRiYmVmNTIyYzc1NyIsImVtYWlsIjoidXNlcjFAdGVzdC5jb20iLCJhY2NvdW50X2lkIjoiNmFjYmRhM2M5MDVkNGJiZWY1MjJjNzU4IiwiaWF0IjoxNzkxNzQ4MTM2LCJleHAiOjE3OTE4MzQ1MzZ9.HNbcrDQDM04u4SKBVbj2-Gh1DdsB20AdK8-vZ6jUpGU';

let counter = 0;

const instance = autocannon({
  url: 'http://localhost:3000/api/transfer',   // ← POORA URL yahan
  connections: 10,
  duration: 10,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  setupRequest: (req) => {
    counter++;
    req.headers['X-Idempotency-Key'] = 'load-test-key-' + counter + '-' + Date.now();
    return req;
  },
  body: JSON.stringify({
    from: '6acbda3c905d4bbef522c758',
    to: '6acbdba5905d4bbef522c75c',
    amount: 1
  })
}, (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('\n========== LOAD TEST RESULTS ==========');
    console.log('Requests/sec (avg):', result.requests.average);
    console.log('Latency (avg):', result.latency.average, 'ms');
    console.log('Latency (p99):', result.latency.p99, 'ms');
    console.log('Total requests:', result.requests.total);
    console.log('2xx responses:', result['2xx']);
    console.log('Non-2xx responses:', result.non2xx);
    console.log('Errors:', result.errors);
    console.log('=======================================\n');
  }
});

autocannon.track(instance, { renderProgressBar: true });