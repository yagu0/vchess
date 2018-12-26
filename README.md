# v[ariant]chess.club

Website to play to many chess variants, including rare ones - some almost never seen
elsewhere, like "l'Échiqueté" [french], renamed "checkered chess" in english.

## Usage

I hope it's intuitive enough :)

But, a few important points:
 - All games start with a random assymetric position!
 - Games are untimed: you decide to play fast or not...
 - Your identity (if filled) is revealed only after the game

## Resources

Server side:
 - node,
 - npm packages (see package.json),

Client side:
 - Vue.js,
 - underscore.js,
 - mini.css,
 - Google font 'Open Sans' + a few icons,

Sounds and pieces images where found at various locations.

## Installation (for developers)

 0. Install git-fat https://github.com/jedbrown/git-fat
 1. git fat init && git fat pull
 2. Execute db/create.sql script (SQLite) to fill db/vchess.sqlite database
 3. Rename public/javascripts/socket\_url.js.dist into socket\_url.js
    and adjust its content.
 4. npm i && npm start
