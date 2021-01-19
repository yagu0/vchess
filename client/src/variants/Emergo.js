import { ChessRules } from "@/base_rules";

export class YoteRules extends ChessRules {

  // TODO
  //If (as white) a pile W1/B1 jumps over another pile W2/B2, it lets on the intermediate square exactly W2 men, to end as W1/(B1+B2).
  //In the first case in the video, W1=1, B1=0, W2=0, B2=1 ==> 1/1 and finally 1/2 with nothing on intermediate squares since W2 is always 0.
  //In the second case, W1=1, B1=0, W2=1, B2=1 ==> 1 man left on intermediate square, end as 1/1.
  //...I think it's that (?). Not very well explained either on Wikipedia or mindsports.nl :/
  //Found this link: http://www.iggamecenter.com/info/en/emergo.html - so it's all clear now ! I'll add the game soon.
  //Btw, I'm not a big fan of this naming "men" for pieces, but, won't contradict the author on that ￼

};
