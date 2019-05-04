// Logic to play a computer move in a web worker
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
