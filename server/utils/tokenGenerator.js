function randString() {
  return Math.random().toString(36).substr(2); // remove `0.`
}

module.exports = function(tokenLength) {
  let res = "";
  // 10 = min length of a rand() string
  const nbRands = Math.ceil(tokenLength/10);
  for (let i = 0; i < nbRands; i++) res += randString();
  return res.substr(0, tokenLength);
}
