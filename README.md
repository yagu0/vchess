# v[ariant]chess.club

Website to play to many chess variants, including rare ones - some almost
never seen elsewhere, like "l'Échiqueté" [french], renamed "checkered chess"
in english.

## Usage

I hope it's intuitive enough :)

But, a few important points:
 - Games start with a random assymetric position!
 - Your identity is revealed only after a game

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
 2. Execute db/\*.sql scripts to create and fill db/vchess.sqlite
 3. Rename and edit public/javascripts/socket\_url.js.dist into socket\_url.js
 4. npm i && npm start

## Get involved

All contributions are welcome! For example,
 - translations,
 - design,
 - Vue front-end,
 - Express back-end.

If you wanna help, you can send me an email (address indicated in the "Help"
menu on the website) so that we can discuss what to do and how :)
If you feel comfortable with the code a pull request is a good start too.
