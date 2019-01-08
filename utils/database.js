const sqlite3 = require('sqlite3');
const DbPath = __dirname.replace("/utils", "/db/vchess.sqlite");
const db = new sqlite3.Database(DbPath);

module.exports = db;
