// Router for contact form sending

let router = require("express").Router();
const mailer = require(__dirname.replace("/routes", "/utils/mailer"));
const params = require(__dirname.replace("/routes", "/config/parameters"));

// Send a message through contact form
router.post("/messages", (req,res,next) => {
  if (!req.xhr)
    return res.json({errmsg: "Unauthorized access"});
  const from = req.body["email"];
  const subject = req.body["subject"];
  const body = req.body["content"];

  // TODO: sanitize ?
  mailer(from, params.mail.contact, subject, body, err => {
    if (!!err)
      return res.json({errmsg:err});
    // OK, everything fine
    res.json({}); //ignored
  });
});

module.exports = router;
