import { MakrukRules } from "@/variants/Makruk";

export class KaroukRules extends MakrukRules {

  getCurrentScore() {
    const color = this.turn;
    if (this.underCheck(color)) return (color == 'w' ? "0-1" : "1-0");
    return super.getCurrentScore();
  }

};
