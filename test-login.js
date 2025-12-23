require('dotenv').config();
const bcrypt = require('bcrypt');

// The exact password we're trying
const testPassword = 'password123!';

// The hash from the database
const hashFromDB = '$2b$10$4rMvmM3iMCqNUnhq1GIRmOLJn50fED/.VE5n6qz77XiyRM4zM3HJK';

bcrypt.compare(testPassword, hashFromDB).then(result => {
    console.log('Password match result:', result);
}).catch(err => {
    console.error('Error:', err);
});

// Also create a new hash to see what we get
bcrypt.hash(testPassword, 10).then(newHash => {
    console.log('New hash:', newHash);
    return bcrypt.compare(testPassword, newHash);
}).then(result => {
    console.log('New hash comparison:', result);
});
