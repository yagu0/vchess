let router = require("express").Router();
const sendEmail = require(__dirname.replace("/routes", "/utils/sendEmail"));

// Send a message through contact form
router.post("/messages", (req,res,next) => {
	if (!req.xhr)
		return res.json({errmsg: "Unauthorized access"});
	const email = req.body["email"];
	const subject = req.body["subject"];
	const content = req.body["content"];
	// TODO: sanitize ?
	sendEmail(email, subject, content, err => {
		if (!!err)
			return res.json({errmsg:err});
		// OK, everything fine
		res.json({}); //ignored
	});
});

module.exports = router;
