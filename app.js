var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var sassMiddleware = require('node-sass-middleware');
var favicon = require('serve-favicon');

var router = require('./routes/all');

var app = express();

app.use(favicon(path.join(__dirname, "public", "images", "favicon", "favicon.ico")));

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

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true, // true = .sass and false = .scss
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
