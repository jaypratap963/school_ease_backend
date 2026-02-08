const bcrypt = require('bcryptjs');

const password = 'Jayant55@'; // change later
const saltRounds = 10;

bcrypt.hash(password, saltRounds).then(hash => {
  console.log(hash);
});
