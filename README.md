# v[ariant]chess.club

Website to play to many chess variants, including rare ones - some almost
never seen elsewhere, like "l'Échiqueté" [french], renamed "checkered chess"
in english.

Notes:
 - Games start with a random assymetric position!
 - No ratings, no tournaments: no "competition spirit"

## Resources

Server side:
 - node,
 - Express,
 - Other npm packages (see package.json),

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
 4. Rename and edit utils/mailer.js.dist into mailer.js
 5. npm i && npm start

## Get involved

All contributions are welcome! For example,
 - translations,
 - design,
 - Vue front-end,
 - Express back-end.

If you wanna help, you can contact me with the form on the website,
so that we can discuss what to do and how :)
If you feel comfortable with the code a pull request is a good start too.
