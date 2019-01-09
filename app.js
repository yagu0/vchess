var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var sassMiddleware = require('node-sass-middleware');
var favicon = require('serve-favicon');
var UserModel = require(path.join(__dirname, "models", "User"));

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

// Allow layout.pug to select the right vue file:
app.locals.development = (app.get('env') === 'development');

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

// Before showing any page, check + save credentials
app.use(function(req, res, next) {
	req.userId = 0; //means "anonymous"
	res.locals.user = { name: "" }; //"anonymous"
	if (!req.cookies.token)
		return next();
	UserModel.getOne("sessionToken", req.cookies.token, function(err, user) {
		if (!!user)
		{
			req.userId = user.id;
			res.locals.user = {
				id: user.id,
				name: user.name,
				email: user.email,
				notify: user.notify,
			};
		}
		else
		{
			// Token in cookies presumably wrong: erase it
			res.clearCookie("token");
		}
		next();
	});
});

// Routing
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
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
