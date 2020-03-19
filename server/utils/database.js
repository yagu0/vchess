const sqlite3 = require('sqlite3');
const path = require('path');
const params = require("../config/parameters")

if (params.env == "development") sqlite3.verbose();

const DbPath = __dirname.replace(
  `${path.sep}utils`,
  `${path.sep}db${path.sep}vchess.sqlite`);
const db = new sqlite3.Database(DbPath);

module.exports = db;
