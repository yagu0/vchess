// TODO: https://github.com/webpack-contrib/worker-loader
// https://stackoverflow.com/questions/48713072/how-to-get-js-function-into-webworker-via-importscripts
// For asynchronous computer move search

//self.addEventListener('message', (e) =>
onmessage = async function(e)
{
  switch (e.data[0])
  {
    case "scripts":
      const vModule = await import("@/variants/" + e.data[1] + ".js");
      self.V = vModule.VariantRules;
      break;
    case "init":
      const fen = e.data[1];
      self.vr = new self.V(fen);
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
