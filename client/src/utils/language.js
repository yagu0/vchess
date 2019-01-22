// TODO: adapt for client side https://stackoverflow.com/a/4079798
// ==> Each translation file should be loaded dynamically
// (each rules definition too, + modal welcome)

// Select a language based on browser preferences, or cookie
module.exports = function(req, res)
{
	// If preferred language already set:
	if (!!req.cookies["lang"])
		return req.cookies["lang"];

	// Else: search and set it
	const supportedLang = ["en","es","fr"];
	const langString = req.headers["accept-language"];
	let langArray = langString
		.replace(/;q=[0-9.]+/g, "") //priority
		.replace(/-[A-Z]+/g, "") //region (skipped for now...)
		.split(",") //may have some duplicates, but removal is too costly
	let bestLang = "en"; //default: English
	for (let lang of langArray)
	{
		if (supportedLang.includes(lang))
		{
			bestLang = lang;
			break;
		}
	}
	// Cookie expires in 183 days (expressed in milliseconds)
	res.cookie('lang', bestLang, { maxAge: 183*24*3600*1000 });
	return bestLang;
}
