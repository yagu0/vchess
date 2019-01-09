var TokenGen = {};

TokenGen.rand = function()
{
	return Math.random().toString(36).substr(2); // remove `0.`
};

TokenGen.generate = function(tlen)
{
	var res = "";
	var nbRands = Math.ceil(tlen/10); //10 = min length of a rand() string
	for (var i = 0; i < nbRands; i++)
		res += TokenGen.rand();
	return res.substr(0, tlen);
}

module.exports = TokenGen;
