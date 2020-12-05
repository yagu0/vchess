var UserModel = require("../models/User");

module.exports = {

  // Prevent access to "users pages"
  logged: function(req, res, next) {
    const callback = () => {
      if (!loggedIn)
        res.json({ errmsg: "Error: try to delete cookies" });
      else next();
    };
    let loggedIn = undefined;
    if (!req.cookies.token) {
      loggedIn = false;
      callback();
    } else {
      UserModel.getOne(
        "sessionToken", req.cookies.token, "id",
        (err, user) => {
          if (!!user) {
            req.userId = user.id;
            loggedIn = true;
          } else {
            // Token in cookies presumably wrong: erase it
            res.clearCookie("token");
            loggedIn = false;
          }
          callback();
        }
      );
    }
  },

  // Prevent access to "anonymous pages"
  unlogged: function(req, res, next) {
    // Just a quick heuristic, which should be enough
    const loggedIn = !!req.cookies.token;
    if (loggedIn) res.json({ errmsg: "Error: try to delete cookies" });
    else next();
  },

  // Prevent direct access to AJAX results
  ajax: function(req, res, next) {
    if (!req.xhr) res.json({ errmsg: "Unauthorized access" });
    else next();
  },

  // Check for errors before callback (continue page loading). (TODO: name?)
  checkRequest: function(res, err, out, msg, cb) {
    if (!!err) res.json({ errmsg: err.errmsg || err.toString() });
    else if (
      !out ||
      (Array.isArray(out) && out.length == 0) ||
      (typeof out === "object" && Object.keys(out).length == 0)
    ) {
      res.json({ errmsg: msg });
    } else cb();
  }

};
