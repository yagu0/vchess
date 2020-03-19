# vchess-server

Instructions to run the server locally.

## Requirements

- Node.js + npm (any recent version)
- SQLite (version 3)

## Installation

1. Execute db/\*.sql scripts to create and fill db/vchess.sqlite

```
cd server/db
sqlite3 vchess.sqlite
sqlite> .read create.sql
sqlite> .read populate.sql
sqlite> .exit
```

2. Rename and edit `config/parameters.js.dist` into `config/parameters.js`

3. Install npm modules

```
npm install
```

## Running

```
npm start
```
