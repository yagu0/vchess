<template lang="pug">
main
  input#modalNewgame.modal(type="checkbox")
  div(role="dialog" aria-labelledby="titleFenedit")
    .card.smallpad
      label#closeNewgame.modal-close(for="modalNewgame")
      fieldset
        label(for="selectVariant") {{ st.tr["Variant"] }}
        select#selectVariant(v-model="newchallenge.vid")
          option(v-for="v in st.variants" :value="v.id") {{ v.name }}
      fieldset
        label(for="selectNbPlayers") {{ st.tr["Number of players"] }}
        select#selectNbPlayers(v-model="newchallenge.nbPlayers")
          option(v-show="possibleNbplayers(2)" value="2" selected) 2
          option(v-show="possibleNbplayers(3)" value="3") 3
          option(v-show="possibleNbplayers(4)" value="4") 4
      fieldset
        label(for="timeControl") {{ st.tr["Time control"] }}
        input#timeControl(type="text" v-model="newchallenge.timeControl"
          placeholder="3m+2s, 1h+30s, 7d+1d ...")
      fieldset(v-if="st.user.id > 0")
        label(for="selectPlayers") {{ st.tr["Play with? (optional)"] }}
        #selectPlayers
          input(type="text" v-model="newchallenge.to[0]")
          input(v-show="newchallenge.nbPlayers>=3" type="text"
            v-model="newchallenge.to[1]")
          input(v-show="newchallenge.nbPlayers==4" type="text"
            v-model="newchallenge.to[2]")
      fieldset(v-if="st.user.id > 0")
        label(for="inputFen") {{ st.tr["FEN (optional)"] }}
        input#inputFen(type="text" v-model="newchallenge.fen")
      button(@click="newChallenge") {{ st.tr["Send challenge"] }}
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      button(onClick="doClick('modalNewgame')") New game
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      .collapse
        input#challengeSection(type="radio" checked aria-hidden="true" name="accordion")
        label(for="challengeSection" aria-hidden="true") Challenges
        div
          .button-group
            button(@click="cdisplay='live'") Live Challenges
            button(@click="cdisplay='corr'") Correspondance challenges
          ChallengeList(v-show="cdisplay=='live'"
            :challenges="filterChallenges('live')" @click-challenge="clickChallenge")
          ChallengeList(v-show="cdisplay=='corr'"
            :challenges="filterChallenges('corr')" @click-challenge="clickChallenge")
        input#peopleSection(type="radio" aria-hidden="true" name="accordion")
        label(for="peopleSection" aria-hidden="true") People
        div
          .button-group
            button(@click="pdisplay='players'") Players
            button(@click="pdisplay='chat'") Chat
          #players(v-show="pdisplay=='players'")
            h3 Online players
            .player(v-for="p in uniquePlayers" @click="tryChallenge(p)"
              :class="{anonymous: !!p.count}"
            )
              | {{ p.name + (!!p.count ? " ("+p.count+")" : "") }}
          #chat(v-show="pdisplay=='chat'")
            h3 Chat (TODO)
        input#gameSection(type="radio" aria-hidden="true" name="accordion")
        label(for="gameSection" aria-hidden="true") Games
        div
          .button-group
            button(@click="gdisplay='live'") Live games
            button(@click="gdisplay='corr'") Correspondance games
          GameList(v-show="gdisplay=='live'" :games="filterGames('live')"
            @show-game="showGame")
          GameList(v-show="gdisplay=='corr'" :games="filterGames('corr')"
            @show-game="showGame")
</template>

<script>
import { store } from "@/store";
import { NbPlayers } from "@/data/nbPlayers";
import { checkChallenge } from "@/data/challengeCheck";
import { ArrayFun } from "@/utils/array";
import { ajax } from "@/utils/ajax";
import { getRandString, shuffle } from "@/utils/alea";
import { extractTime } from "@/utils/timeControl";
import GameList from "@/components/GameList.vue";
import ChallengeList from "@/components/ChallengeList.vue";
export default {
  name: "my-hall",
  components: {
    GameList,
    ChallengeList,
  },
  data: function () {
    return {
      st: store.state,
      cdisplay: "live", //or corr
      pdisplay: "players", //or chat
      gdisplay: "live",
      games: [],
      challenges: [],
      players: [], //online players (rename into "people" ?)
      newchallenge: {
        fen: "",
        vid: 0,
        nbPlayers: 0,
        to: ["", "", ""], //name of challenged players
        timeControl: "", //"2m+2s" ...etc
      },
    };
  },
  computed: {
    uniquePlayers: function() {
      // Show e.g. "@nonymous (5)", and do nothing on click on anonymous
      let anonymous = {id:0, name:"@nonymous", count:0};
      let playerList = [];
      this.players.forEach(p => {
        if (p.id > 0)
          playerList.push(p);
        else
          anonymous.count++;
      });
      if (anonymous.count > 0)
        playerList.push(anonymous);
      return playerList;
    },
  },
  created: function() {
    // Always add myself to players' list
    this.players.push(this.st.user);
    // Ask server for current corr games (all but mines)
//    ajax(
//      "/games",
//      "GET",
//      {excluded: this.st.user.id},
//      response => {
//        this.games = this.games.concat(response.games);
//      }
//    );
    // Also ask for corr challenges (open + personal to me)
    ajax(
      "/challenges",
      "GET",
      {uid: this.st.user.id},
      response => {
        console.log(response.challenges);
        // TODO: post-treatment on challenges ?
        this.challenges = this.challenges.concat(response.challenges);
      }
    );
    // 0.1] Ask server for room composition:
    const socketOpenListener = () => {
      this.st.conn.send(JSON.stringify({code:"pollclients"}));
    };
    this.st.conn.onopen = socketOpenListener;
    // TODO: is this required here?
    this.oldOnmessage = this.st.conn.onmessage || Function.prototype;
    this.st.conn.onmessage = this.socketMessageListener;
    const oldOnclose = this.st.conn.onclose;
    const socketCloseListener = () => {
      oldOnclose(); //reinitialize connexion (in store.js)
      this.st.conn.addEventListener('message', this.socketMessageListener);
      this.st.conn.addEventListener('close', socketCloseListener);
    };
    this.st.conn.onclose = socketCloseListener;
  },
  methods: {
    // Helpers:
    filterChallenges: function(type) {
      return this.challenges.filter(c => c.type == type);
    },
    filterGames: function(type) {
      return this.games.filter(c => c.type == type);
    },
    classifyObject: function(o) { //challenge or game
      // Heuristic: should work for most cases... (TODO)
      return (o.timeControl.indexOf('d') === -1 ? "live" : "corr");
    },
    possibleNbplayers: function(nbp) {
      if (this.newchallenge.vid == 0)
        return false;
      const idxInVariants =
        this.st.variants.findIndex(v => v.id == this.newchallenge.vid);
      return NbPlayers[this.st.variants[idxInVariants].name].includes(nbp);
    },
    showGame: function(g) {
      // NOTE: we are an observer, since only games I don't play are shown here
      // ==> Moves sent by connected remote player(s) if live game
      let url = "/" + g.id;
      if (g.type == "live")
      {
        const sids = g.players.map(p => p.sid).join(",");
        url += "?sids=" + sids;
      }
      this.$router.push(url);
    },
    getVname: function(vid) {
      const vIdx = this.st.variants.findIndex(v => v.id == vid);
      return this.st.variants[vIdx].name;
    },
    getSid: function(pname) {
      const pIdx = this.players.findIndex(pl => pl.name == pname);
      return (pIdx === -1 ? null : this.players[pIdx].sid);
    },
    getPname: function(sid) {
      const pIdx = this.players.findIndex(pl => pl.sid == sid);
      return (pIdx === -1 ? null : this.players[pIdx].name);
    },
    sendSomethingTo: function(to, code, obj, warnDisconnected) {
      const doSend = (code, obj, sid) => {
        this.st.conn.send(JSON.stringify(Object.assign(
          {},
          {code: code},
          obj,
          {target: sid}
        )));
      };
      if (!!to[0])
      {
        to.forEach(pname => {
          // Challenge with targeted players
          const targetSid = this.getSid(pname);
          if (!targetSid)
          {
            if (!!warnDisconnected)
              alert("Warning: " + pname + " is not connected");
          }
          else
            doSend(code, obj, targetSid);
        });
      }
      else
      {
        // Open challenge: send to all connected players (except us)
        this.players.forEach(p => {
          if (p.sid != this.st.user.sid) //only sid is always set
            doSend(code, obj, p.sid);
        });
      }
    },
    // Messaging center:
    socketMessageListener: function(msg) {
      // Save and call current st.conn.onmessage if one was already defined
      // --> also needed in future Game.vue (also in Chat.vue component)
      this.oldOnmessage(msg);
      const data = JSON.parse(msg.data);
      switch (data.code)
      {
        // 0.2] Receive clients list (just socket IDs)
        case "pollclients":
        {
          data.sockIds.forEach(sid => {
            this.players.push({sid:sid, id:0, name:""});
            // Ask identity, challenges and game(s)
            this.st.conn.send(JSON.stringify({code:"askidentity", target:sid}));
            this.st.conn.send(JSON.stringify({code:"askchallenge", target:sid}));
            this.st.conn.send(JSON.stringify({code:"askgame", target:sid}));
          });
          break;
        }
        case "askidentity":
        {
          // Request for identification: reply if I'm not anonymous
          if (this.st.user.id > 0)
          {
            this.st.conn.send(JSON.stringify(
              {code:"identity", user:this.st.user, target:data.from}));
          }
          break;
        }
        case "askchallenge":
        {
          // Send my current live challenge (if any)
          const cIdx = this.challenges
            .findIndex(c => c.from.sid == this.st.user.sid && c.type == "live");
          if (cIdx >= 0)
          {
            const c = this.challenges[cIdx];
            const myChallenge =
            {
              // Minimal challenge informations: (from not required)
              id: c.id,
              to: c.to,
              fen: c.fen,
              vid: c.vid,
              timeControl: c.timeControl
            };
            this.st.conn.send(JSON.stringify({code:"challenge",
              challenge:myChallenge, target:data.from}));
          }
          break;
        }
        case "askgame":
        {
          // Send my current live game (if any)
          if (!!localStorage["gid"])
          {
            const myGame =
            {
              // Minimal game informations: (fen+clock not required)
              id: localStorage["gid"],
              players: JSON.parse(localStorage["players"]), //array sid+id+name
              vname: localStorage["vname"],
              timeControl: localStorage["timeControl"],
            };
            this.st.conn.send(JSON.stringify({code:"game",
              game:myGame, target:data.from}));
          }
          break;
        }
        case "identity":
        {
          const pIdx = this.players.findIndex(p => p.sid == data.user.sid);
          this.players[pIdx].id = data.user.id;
          this.players[pIdx].name = data.user.name;
          break;
        }
        case "challenge":
        {
          // Receive challenge from some player (+sid)
          let newChall = data.chall;
          newChall.type = this.classifyObject(data.chall);
          const pIdx = this.players.findIndex(p => p.sid == data.from);
          newChall.from = this.players[pIdx]; //may be anonymous
          newChall.added = Date.now();
          newChall.vname = this.getVname(newChall.vid);
          this.challenges.push(newChall);
          break;
        }
        case "game":
        {
          // Receive game from some player (+sid)
          // NOTE: it may be correspondance (if newgame while we are connected)
          let newGame = data.game;
          newGame.type = this.classifyObject(data.game);
          newGame.vname = newGame.vname;
          this.games.push(newGame);
          break;
        }
// *  - receive "new game": if live, store locally + redirect to game
// *    If corr: notify "new game has started", give link, but do not redirect
        case "newgame":
        {
          // Delete corresponding challenge:
          ArrayFun.remove(this.challenges, c => c.id == data.cid);
          // New game just started: data contain all informations
          this.newGame(data.gameInfo);
          break;
        }
// *  - receive "accept/withdraw/cancel challenge": apply action to challenges list
        // NOTE: challenge "socket" actions accept+withdraw only for live challenges
        case "acceptchallenge":
        {
          // Someone accept an open (or targeted) challenge
          const cIdx = this.challenges.findIndex(c => c.id == data.cid);
          let c = this.challenges[cIdx];
          if (!c.seats)
            c.seats = [...Array(c.to.length)];
          const pIdx = this.players.findIndex(p => p.sid == data.from);
          // Put this player in the first empty seat we find:
          let sIdx = 0;
          for (; sIdx<c.seats.length; sIdx++)
          {
            if (!c.seats[sIdx])
            {
              c.seats[sIdx] = this.players[pIdx];
              break;
            }
          }
          if (sIdx == c.seats.length - 1)
          {
            // All seats are taken: game can start
            this.launchGame(c);
          }
          break;
        }
        case "withdrawchallenge":
        {
          const cIdx = this.challenges.findIndex(c => c.id == data.cid);
          let seats = this.challenges[cIdx].seats;
          const sIdx = seats.findIndex(s => s.sid == data.sid);
          seats[sIdx] = undefined;
          break;
        }
        case "refusechallenge":
        {
          alert(this.getPname(data.from) + " refused your challenge");
          ArrayFun.remove(this.challenges, c => c.id == data.cid);
          break;
        }
        case "deletechallenge":
        {
          ArrayFun.remove(this.challenges, c => c.id == data.cid);
          break;
        }
        case "connect":
        {
          this.players.push({name:"", id:0, sid:data.sid});
          this.st.conn.send(JSON.stringify({code:"askidentity", target:data.sid}));
          this.st.conn.send(JSON.stringify({code:"askchallenge", target:sid}));
          this.st.conn.send(JSON.stringify({code:"askgame", target:sid}));
          break;
        }
        case "disconnect":
        {
          ArrayFun.remove(this.players, p => p.sid == data.sid);
          // Also remove all challenges sent by this player:
          ArrayFun.remove(this.challenges, c => c.from.sid == data.sid);
          // And all live games where he plays and no other opponent is online
          ArrayFun.remove(this.games, g =>
            g.type == "live" && (g.players.every(p => p.sid == data.sid
              || !this.players.some(pl => pl.sid == p.sid))), "all");
          break;
        }
      }
    },
    // Challenge lifecycle:
    tryChallenge: function(player) {
      if (player.id == 0)
        return; //anonymous players cannot be challenged
      this.newchallenge.to[0] = player.name;
      doClick("modalNewgame");
    },
    newChallenge: async function() {
      const vname = this.getVname(this.newchallenge.vid);
      const vModule = await import("@/variants/" + vname + ".js");
      window.V = vModule.VariantRules;
      const error = checkChallenge(this.newchallenge);
      if (!!error)
        return alert(error);
      const ctype = this.classifyObject(this.newchallenge);
      const cto = this.newchallenge.to.slice(0, this.newchallenge.nbPlayers);
      // NOTE: "from" information is not required here
      let chall =
      {
        fen: this.newchallenge.fen,
        to: cto,
        timeControl: this.newchallenge.timeControl,
        vid: this.newchallenge.vid,
      };
      const finishAddChallenge = (cid,warnDisconnected) => {
        chall.id = cid || "c" + getRandString();
        // Send challenge to peers (if connected)
        this.sendSomethingTo(cto, "challenge", {chall:chall}, !!warnDisconnected);
        chall.added = Date.now();
        chall.type = ctype;
        chall.vname = vname;
        chall.from = this.st.user;
        this.challenges.push(chall);
        document.getElementById("modalNewgame").checked = false;
      };
      const cIdx = this.challenges.findIndex(
        c => c.from.sid == this.st.user.sid && c.type == ctype);
      if (cIdx >= 0)
      {
        // Delete current challenge (will be replaced now)
        this.sendSomethingTo(this.challenges[cIdx].to,
          "deletechallenge", {cid:this.challenges[cIdx].id});
        if (ctype == "corr")
        {
          ajax(
            "/challenges",
            "DELETE",
            {id: this.challenges[cIdx].id}
          );
        }
        this.challenges.splice(cIdx, 1);
      }
      if (ctype == "live")
      {
        // Live challenges have a random ID
        finishAddChallenge(null, "warnDisconnected");
      }
      else
      {
        // Correspondance game: send challenge to server
        ajax(
          "/challenges",
          "POST",
          chall,
          response => { finishAddChallenge(response.cid); }
        );
      }
    },
// *  - accept challenge (corr or live) --> send info to challenge creator
// *  - cancel challenge (click on sent challenge) --> send info to all concerned players
// *  - withdraw from challenge (if >= 3 players and previously accepted)
// *    --> send info to challenge creator
// *  - refuse challenge: send "refuse" to challenge sender, and "delete" to others
// *  - prepare and start new game (if challenge is full after acceptation)
// *    --> include challenge ID (so that opponents can delete the challenge too)
    clickChallenge: function(c) {
      if (!!c.accepted)
      {
        this.st.conn.send(JSON.stringify({code: "withdrawchallenge",
          cid: c.id, target: c.from.sid}));
        if (c.type == "corr")
        {
          ajax(
            "/challenges",
            "PUT",
            {action:"withdraw", id: this.challenges[cIdx].id}
          );
        }
        c.accepted = false;
      }
      else if (c.from.sid == this.st.user.sid
        || (this.st.user.id > 0 && c.from.id == this.st.user.id))
      {
        // It's my challenge: cancel it
        this.sendSomethingTo(c.to, "deletechallenge", {cid:c.id});
        ArrayFun.remove(this.challenges, ch => ch.id == c.id);
        if (c.type == "corr")
        {
          ajax(
            "/challenges",
            "DELETE",
            {id: this.challenges[cIdx].id}
          );
        }
      }
      else //accept (or refuse) a challenge
      {
        c.accepted = true;
        if (!!c.to[0])
        {
          // TODO: if special FEN, show diagram after loading variant
          c.accepted = confirm("Accept challenge?");
        }
        this.st.conn.send(JSON.stringify({
          code: (c.accepted ? "accept" : "refuse") + "challenge",
          cid: c.id, target: c.from.sid}));
        if (c.type == "corr" && c.accepted)
        {
          ajax(
            "/challenges",
            "PUT",
            {action: "accept", id: this.challenges[cIdx].id}
          );
        }
        if (!c.accepted)
        {
          ArrayFun.remove(this.challenges, ch => ch.id == c.id);
          if (c.type == "corr")
          {
            ajax(
              "/challenges",
              "DELETE",
              {id: this.challenges[cIdx].id}
            );
          }
        }
      }
    },
    // c.type == corr alors use id...sinon sid (figés)
    // NOTE: only for live games ?
    launchGame: async function(c) {
      // Just assign colors and pass the message
      const vname = this.getVname(c.vid);
      const vModule = await import("@/variants/" + vname + ".js");
      window.V = vModule.VariantRules;
      let players = [c.from];
      Array.prototype.push.apply(players, c.seats);
      let gameInfo =
      {
        fen: c.fen || V.GenRandInitFen(),
        // Shuffle players order (white then black then other colors).
        // Players' names may be required if game start when a player is offline
        players: shuffle(players).map(p => { return {name:p.name, sid:p.sid} }),
        vid: c.vid,
        timeControl: c.timeControl,
      };
      c.seats.forEach(s => {
        // NOTE: cid required to remove challenge
        this.st.conn.send(JSON.stringify({code:"newgame",
          gameInfo:gameInfo, cid:c.id, target:s.sid}));
      });
      // Delete corresponding challenge:
      ArrayFun.remove(this.challenges, ch => ch.id == c.id);
      this.newGame(gameInfo); //also!
    },
    // NOTE: for live games only (corr games are launched on server)
    newGame: function(gameInfo) {
      localStorage["gid"] = getRandString();
      // Extract times (in [milli]seconds), set clocks, store in localStorage
      const tc = extractTime(gameInfo.timeControl);
      localStorage["timeControl"] = gameInfo.timeControl;
      localStorage["clocks"] = JSON.stringify(
        [...Array(gameInfo.players.length)].fill(tc.mainTime));
      localStorage["increment"] = tc.increment;
      localStorage["started"] = JSON.stringify(
        [...Array(gameInfo.players.length)].fill(false));
      localStorage["mysid"] = this.st.user.sid;
      localStorage["vname"] = this.getVname(gameInfo.vid);
      localStorage["fenInit"] = gameInfo.fen;
      localStorage["players"] = JSON.stringify(gameInfo.players);
      if (this.st.settings.sound >= 1)
        new Audio("/sounds/newgame.mp3").play().catch(err => {});
    },
  },
};
</script>

<style lang="sass">
// TODO
</style>
