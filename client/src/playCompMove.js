// Logic to play a computer move in a web worker
onmessage = async function(e) {
  switch (e.data[0]) {
    case "scripts": {
      await import("@/variants/" + e.data[1] + ".js")
      .then((vModule) => { self.V = vModule[e.data[1] + "Rules"]; });
      break;
    }
    case "init": {
      const fen = e.data[1];
      self.vr = new self.V(fen);
      break;
    }
    case "newmove":
      let move = e.data[1];
      // Caution: could be a multi-move
      if (!Array.isArray(move))
        move = [move];
      move.forEach(m => self.vr.play(m));
      break;
    case "askmove": {
      const compMove = self.vr.getComputerMove();
      postMessage(compMove);
      break;
    }
  }
};
