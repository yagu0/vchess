const sqlite3 = require('sqlite3');
const params = require("../config/parameters")

if (params.env == "development")
  sqlite3.verbose();

const DbPath = __dirname.replace("/utils", "/db/vchess.sqlite");
const db = new sqlite3.Database(DbPath);

module.exports = db;
