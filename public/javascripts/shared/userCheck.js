function checkNameEmail(o)
{
	if (!!o.name)
	{
		if (o.name.length == 0)
			return "Empty name";
		if (!o.name.match(/^[\w]+$/))
			return "Bad characters in name";
	}
	if (!!o.email)
	{
		if (o.email.length == 0)
			return "Empty email";
		if (!o.email.match(/^[\w.+-]+@[\w.+-]+$/))
			return "Bad characters in email";
	}
}

try { module.exports = checkNameEmail; } catch(e) { } //for server
