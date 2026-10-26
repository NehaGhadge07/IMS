const { spawn } = require('child_process');
const path = require('path');

const PORT = 5001; // use separate port for tests
let serverProcess;

function startServer() {
  return new Promise((resolve, reject) => {
    console.log(`Starting test Express server on port ${PORT}...`);
    const serverPath = path.join(__dirname, '..', 'backend', 'server.js');
    
    serverProcess = spawn('node', [serverPath], {
      env: { ...process.env, PORT: PORT.toString(), JWT_SECRET: 'test_secret_key' }
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Server]: ${output.trim()}`);
      if (output.includes('Express server running')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error]: ${data.toString()}`);
    });

    serverProcess.on('error', (err) => {
      reject(err);
    });

    // fallback resolve in case output varies
    setTimeout(resolve, 3000);
  });
}

async function runTests() {
  const baseUrl = `http://localhost:${PORT}/api`;
  let success = true;

  try {
    // Test 1: Health check
    console.log('\nRunning Test 1: Health check...');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    if (healthRes.ok && healthData.status === 'ok') {
      console.log('✅ Health check passed.');
    } else {
      console.error('❌ Health check failed:', healthData);
      success = false;
    }

    // Test 2: Login as Director / HR manager
    console.log('\nRunning Test 2: Director / HR Login...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hr@company.com', password: 'hr123' })
    });
    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.token) {
      console.log('✅ Login passed. Token generated.');
      
      // Test 3: Get Dashboard details with token
      console.log('\nRunning Test 3: Fetch Dashboard Details...');
      const dashRes = await fetch(`${baseUrl}/dashboard`, {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      const dashData = await dashRes.json();
      if (dashRes.ok && dashData.stats) {
        console.log('✅ Fetch dashboard passed. Stats:', dashData.stats);
      } else {
        console.error('❌ Fetch dashboard failed:', dashData);
        success = false;
      }

      // Test 4: Fetch Team Leads (Mentors) with performance details
      console.log('\nRunning Test 4: Fetch Team Leads...');
      const mentorsRes = await fetch(`${baseUrl}/interns/mentors`, {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      const mentorsData = await mentorsRes.json();
      if (mentorsRes.ok && Array.isArray(mentorsData)) {
        console.log('✅ Fetch Team Leads passed. Count:', mentorsData.length);
        
        // Test 5: Add a new Team Lead
        console.log('\nRunning Test 5: Add New Team Lead...');
        const createRes = await fetch(`${baseUrl}/interns/mentors`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.token}`
          },
          body: JSON.stringify({
            name: 'Test Team Lead',
            email: 'test_tl@company.com',
            password: 'password123',
            department: 'Data Science Trainer',
            technology: 'Vue.js'
          })
        });
        const createData = await createRes.json();
        if (createRes.ok && createData.user_id) {
          console.log('✅ Add Team Lead passed. User ID:', createData.user_id);
          
          // Test 6: Update Performance details
          console.log('\nRunning Test 6: Update Team Lead Performance...');
          const perfRes = await fetch(`${baseUrl}/interns/mentors/${createData.user_id}/performance`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${loginData.token}`
            },
            body: JSON.stringify({
              performance_rating: 4.5,
              performance_notes: 'Highly proactive and supports multiple tech teams.'
            })
          });
          const perfData = await perfRes.json();
          if (perfRes.ok) {
            console.log('✅ Update performance passed:', perfData.message);
          } else {
            console.error('❌ Update performance failed:', perfData);
            success = false;
          }
        } else {
          console.error('❌ Add Team Lead failed:', createData);
          success = false;
        }
      } else {
        console.error('❌ Fetch Team Leads failed:', mentorsData);
        success = false;
      }
    } else {
      console.error('❌ Admin login failed:', loginData);
      success = false;
    }

  } catch (err) {
    console.error('❌ Test execution encountered error:', err);
    success = false;
  }

  return success;
}

async function main() {
  try {
    await startServer();
    const passed = await runTests();
    
    console.log('\nTearing down test server...');
    if (serverProcess) {
      serverProcess.kill();
    }
    
    if (passed) {
      console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
      process.exit(0);
    } else {
      console.error('\n❌ SOME TESTS FAILED. CHECK LOGS. ❌\n');
      process.exit(1);
    }
  } catch (err) {
    console.error('Test framework crash:', err);
    if (serverProcess) serverProcess.kill();
    process.exit(1);
  }
}

main();
