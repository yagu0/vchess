var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var favicon = require('serve-favicon');
var params = require('./config/parameters');

var app = express();

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
app.use(express.static(path.join(__dirname, 'static'))); //client "prod" files

// In development stage the client side has its own server
if (params.cors.enable)
{
	app.use(function(req, res, next) {
		res.header("Access-Control-Allow-Origin", params.cors.allowedOrigin);
		res.header("Access-Control-Allow-Headers",
			"Origin, X-Requested-With, Content-Type, Accept");
		next();
	});
}

// Routing (AJAX-only)
const routes = require(path.join(__dirname, "routes", "all"));
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = (req.app.get('env') === 'development' ? err : {});
  // render the error page
  res.status(err.status || 500);
  res.send(`
		<!doctype html>
		<h1>= message</h1>
		<h2>= error.status</h2>
		<pre>#{error.stack}</pre>
	`);
});

module.exports = app;
