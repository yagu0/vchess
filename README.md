# v[ariant]chess.club

Website to play to many chess variants, including rare ones - some almost never seens
elsewhere, like "l'Échiqueté" [french], renamed "checkered chess" in english.

## Usage

I hope it's intuitive enough :)

But, a few important points:
 - All games start with a random assymetric position!
 - Games are untimed: you decide to play fast or not...

## Resources

Server side:
 - node,
 - npm packages (see package.json),

Client side:
 - Vue.js,
 - underscore.js (TODO: remove this dependency),
 - mini.css,
 - Google font 'Open Sans' + a few icons,

Pieces images where found at various locations.

## Installation (for developers)

 0. Install git-fat https://github.com/jedbrown/git-fat
 1. Rename public/javascripts/utils/socket\_url.js.dist into socket\_url.js
    and adjust its content.
 2. git fat init && git fat pull
 3. npm i && npm start
