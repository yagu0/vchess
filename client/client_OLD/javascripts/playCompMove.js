// For asynchronous computer move search
onmessage = function(e)
{
	switch (e.data[0])
	{
		case "scripts":
			self.importScripts(
				'//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.9.1/underscore-min.js',
				'/javascripts/base_rules.js',
				'/javascripts/utils/array.js',
				'/javascripts/variants/' + e.data[1] + '.js');
			self.V = eval(e.data[1] + "Rules");
			break;
		case "init":
			const fen = e.data[1];
			self.vr = new VariantRules(fen);
			break;
		case "newmove":
			self.vr.play(e.data[1]);
			break;
		case "askmove":
			const compMove = self.vr.getComputerMove();
			postMessage(compMove);
			break;
	}
}
