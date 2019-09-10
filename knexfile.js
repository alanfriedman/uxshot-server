require('dotenv').config();

module.exports = {
  client: 'mysql',
  connection: process.env.DATABASE_URL,
};
