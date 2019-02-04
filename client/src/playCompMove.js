// TODO: https://github.com/webpack-contrib/worker-loader
// https://stackoverflow.com/questions/48713072/how-to-get-js-function-into-webworker-via-importscripts
// For asynchronous computer move search
onmessage = function(e)
{
	switch (e.data[0])
	{
		case "scripts":
			self.importScripts(
				'@/base_rules.js',
				'@/utils/array.js',
				'@/variants/' + e.data[1] + '.js');
			self.V = eval("VariantRules");
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
