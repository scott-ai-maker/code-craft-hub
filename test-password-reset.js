const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/users';
let testEmail = `test-${Date.now()}@example.com`;
let testPassword = 'TestPassword123!';
let newPassword = 'NewPassword456!';

const api = axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true, // Don't throw on any status code
});

async function runTests() {
    try {
        console.log('\n====== PASSWORD RESET FLOW TEST ======\n');

        // Step 1: Register a test user
        console.log('Step 1: Registering test user...');
        const registerRes = await api.post('/register', {
            username: `testuser${Date.now()}`,
            email: testEmail,
            password: testPassword,
        });
        console.log(`Status: ${registerRes.status}`);
        console.log(`Response:`, registerRes.data);

        if (registerRes.status !== 201) {
            console.error('Registration failed');
            return;
        }

        // Step 2: Verify email (simulated - in real scenario would use link from email)
        // We'll need to manually verify for now
        console.log('\n✓ User registered successfully\n');

        // Step 3: Request password reset
        console.log('Step 2: Requesting password reset...');
        const forgotRes = await api.post('/forgot-password', {
            email: testEmail,
        });
        console.log(`Status: ${forgotRes.status}`);
        console.log(`Response:`, forgotRes.data);

        if (forgotRes.status !== 200) {
            console.error('Forgot password request failed');
            return;
        }

        console.log('\n✓ Password reset email sent (check console output for link)\n');
        console.log('NOTE: In a real scenario, the user would receive an email with a reset link.');
        console.log('For testing, watch the server console for the reset URL.\n');

        // Step 4: Note - In production this would be done by user clicking email link
        console.log('Step 3: Reset password using token');
        console.log('NOTE: You need to extract the reset token from the server console output');
        console.log('       and include it in the request below:\n');
        
        console.log(`Example (replace TOKEN with actual token):`);
        console.log(`POST /api/users/reset-password/TOKEN`);
        console.log(`Body: { "newPassword": "${newPassword}" }\n`);

        console.log('====== TEST COMPLETE ======\n');
        console.log('To complete the test:');
        console.log('1. Check server console for password reset link');
        console.log('2. Extract the token from the URL');
        console.log('3. Make a POST request to /api/users/reset-password/:token');
        console.log('4. Include the new password in the request body\n');

        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}

runTests();
