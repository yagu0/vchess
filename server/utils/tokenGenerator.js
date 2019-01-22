function randString()
{
	return Math.random().toString(36).substr(2); // remove `0.`
}

module.exports = function(tlen)
{
	let res = "";
	let nbRands = Math.ceil(tlen/10); //10 = min length of a rand() string
	for (let i = 0; i < nbRands; i++)
		res += randString();
	return res.substr(0, tlen);
}
