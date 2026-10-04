

async function ask(query) {
  console.log('======================================');
  console.log('Testing Query: "' + query + '"');
  console.log('======================================');
  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: query }]
      })
    });
    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error('Test failed:', err);
  }
  console.log('\n');
}

async function run() {
  await ask('what is the weather like right now in Chennai?');
  await ask('will it rain in Madurai tomorrow?');
  await ask('what was the rainfall in Rajapalayam last week?');
}

run();
