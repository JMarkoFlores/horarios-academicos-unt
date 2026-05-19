const bcrypt = require('bcrypt');

const hash = '$2b$10$MA0S4ooqa60oYCU6hwKtGeIon51sDnpHm5L2frD4zEUsQ5TIih3ya';
const password = 'Admin123!';

bcrypt.compare(password, hash).then((result) => {
    console.log('Result:', result);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
