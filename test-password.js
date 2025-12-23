const bcrypt = require('bcrypt');

const testPassword = 'Password123!';
const hashFromDB = '$2b$10$o6/2D8RfVdBaRXOf1mU6X.66xL5b83Kskr06pSI0GnTzHIGyqYQLa';

console.log('Testing password:', testPassword);
console.log('Against hash:', hashFromDB);

bcrypt.compare(testPassword, hashFromDB).then(result => {
    console.log('Direct comparison result:', result);
}).catch(err => {
    console.error('Error:', err);
});
