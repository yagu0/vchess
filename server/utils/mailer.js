const nodemailer = require('nodemailer');
const params = require("../config/parameters");

module.exports = function(from, to, subject, body, cb)
{
	// Avoid the actual sending in development mode
	if (params.env === 'development')
	{
		console.log("New mail: from " + from + " / to " + to);
		console.log("Subject: " + subject);
		let msgText = body.split('\\n');
		msgText.forEach(msg => { console.log(msg); });
		return cb();
	}

  // Create reusable transporter object using the default SMTP transport
	const transporter = nodemailer.createTransport({
		host: params.mail.host,
		port: params.mail.port,
		secure: params.mail.secure,
		auth: {
			user: params.mail.user,
			pass: params.mail.pass
		}
	});

	// Setup email data with unicode symbols
	const mailOptions = {
		from: params.mail.noreply,
		to: to,
		subject: subject,
		text: body,
    replyTo: from,
  };

	// Send mail with the defined transport object
	transporter.sendMail(mailOptions, (error, info) => {
		if (!!error)
			return cb(error);
    // Ignore info. Option:
		//console.log('Message sent: %s', info.messageId);
		return cb();
  });
}
