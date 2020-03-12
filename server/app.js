const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const favicon = require('serve-favicon');
const params = require('./config/parameters');

let app = express();

app.use(favicon(path.join(__dirname, "static", "favicon.ico")));

if (app.get('env') === 'development')
{
  // Full logging in development mode
  app.use(logger('dev'));
}
else
{
  // http://dev.rdybarra.com/2016/06/23/Production-Logging-With-Morgan-In-Express/
  app.set('trust proxy', true);
  // In prod, only log error responses (https://github.com/expressjs/morgan)
  app.use(logger('combined', {
    skip: function (req, res) { return res.statusCode < 400 }
  }));
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// Client "prod" files:
app.use(express.static(path.join(__dirname, 'static')));
// Update in progress:
app.use(express.static(path.join(__dirname, 'fallback')));

// In development stage the client side has its own server
if (params.cors.enable)
{
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", params.cors.allowedOrigin);
    res.header("Access-Control-Allow-Credentials", true); //for cookies
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS, PUT, DELETE"
    );
    next();
  });
}

// Routing (AJAX-only)
const routes = require(path.join(__dirname, "routes", "all"));
app.use('/', routes);

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  if (app.get('env') === 'development')
    console.log(err.stack);
  res.send(
    "<h1>" + err.message + "</h1>" +
    "<h2>" + err.status + "</h2>"
  );
});

module.exports = app;
