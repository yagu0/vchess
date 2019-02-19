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
    .col-sm-12.col-md-5.col-md-offset-1.col-lg-4.col-lg-offset-2
      .button-group
        button(@click="cpdisplay='challenges'") Challenges
        button(@click="cpdisplay='players'") Players
      ChallengeList(v-show="cpdisplay=='challenges'"
        :challenges="challenges" @click-challenge="clickChallenge")
      #players(v-show="cpdisplay=='players'")
        h3 Online players
        .player(v-for="p in uniquePlayers" @click="tryChallenge(p)"
          :class="{anonymous: !!p.count}"
        )
          | {{ p.name + (!!p.count ? " ("+p.count+")" : "") }}
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      button(onClick="doClick('modalNewgame')") New game
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      .button-group
        button(@click="gdisplay='live'") Live games
        button(@click="gdisplay='corr'") Correspondance games
      GameList(v-show="gdisplay=='live'" :games="liveGames"
        @show-game="showGame")
      GameList(v-show="gdisplay=='corr'" :games="corrGames"
        @show-game="showGame")
</template>

<script>
import { store } from "@/store";
import { NbPlayers } from "@/data/nbPlayers";
import { checkChallenge } from "@/data/challengeCheck";
import { ArrayFun } from "@/utils/array";
import { ajax } from "@/utils/ajax";
import { getRandString } from "@/utils/alea";
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
      cpdisplay: "challenges",
      gdisplay: "live",
      liveGames: [],
      corrGames: [],
      challenges: [],
      players: [], //online players
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
      // Show e.g. "5 @nonymous", and do nothing on click on anonymous
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
//      "",
//      "GET",
//      response => {
//
//      }
//    );
//    // Also ask for corr challenges (all)
//    ajax(
//      "",
//      "GET",
//      response => {
//
//      }
//    );
    // 0.1] Ask server for for room composition:
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
    socketMessageListener: function(msg) {
      // Save and call current st.conn.onmessage if one was already defined
      // --> also needed in future Game.vue (also in Chat.vue component)
      // TODO: merge Game.vue and MoveList.vue (one logic entity, no ?)
      this.oldOnmessage(msg);
      const data = JSON.parse(msg.data);
      switch (data.code)
      {
        // 0.2] Receive clients list (just socket IDs)
        case "pollclients":
          data.sockIds.forEach(sid => {
            this.players.push({sid:sid, id:0, name:""});
            // Ask identity, challenges and game(s)
            this.st.conn.send(JSON.stringify({code:"askidentity", target:sid}));
            this.st.conn.send(JSON.stringify({code:"askchallenges", target:sid}));
            this.st.conn.send(JSON.stringify({code:"askgame", target:sid}));
          });
          break;
        case "askidentity":
          // Request for identification
          this.st.conn.send(JSON.stringify(
            {code:"identity", user:this.st.user, target:data.from}));
          break;
        case "askchallenges":
          // Send my current challenges
          const myChallenges = this.challenges
            .filter(c => c.from.sid == this.st.user.sid)
            .map(c => {
              // Minimal challenge informations: (from not required)
              to: c.to,
              fen: c.fen,
              vid: c.vid,
              timeControl: c.timeControl
            });
          if (myChallenges.length > 0)
          {
            this.st.conn.send(JSON.stringify({code:"challenges",
              challenges:myChallenges, target:data.from})
          }
          break;
        case "askgame":
          // TODO: Send my current live game (if any)
          break;
        case "identity":
          if (data.user.id > 0) //otherwise "anonymous", nothing to retrieve
          {
            const pIdx = this.players.findIndex(p => p.sid == data.user.sid);
            this.players[pIdx].id = data.user.id;
            this.players[pIdx].name = data.user.name;
          }
          break;
        case "challenges":
          // Receive challenges from some player
          break;
        case "games":
          // Receive live game from some player
          break;
// *  - receive "new game": if live, store locally + redirect to game
// *    If corr: notify "new game has started", give link, but do not redirect
        case "newgame":
          // TODO: new game just started: data contain all informations
          // (id, players, time control, fenStart ...)
          // + cid to remove challenge from list
          break;
// *  - receive "playergame": a live game by some connected player (NO corr)
        case "playergame":
          // TODO: receive live game summary (update, count moves)
          // (just players names, time control, and ID + player ID)
          break;
// *  - receive "playerchallenges": list of challenges (sent) by some online player (NO corr)
        case "playerchallenges":
          // TODO: receive challenge + challenge updates
          break;
        case "newmove": //live or corr
          // TODO: name conflict ? (game "newmove" event)
          break;
// *  - receive new challenge: if targeted, replace our name with sender name
        case "newchallenge":
          // receive live or corr challenge
          this.challenges.push(data.chall);
          break;
// *  - receive "accept/withdraw/cancel challenge": apply action to challenges list
        case "acceptchallenge":
          if (true) //TODO: if challenge is full
            this.newGame(data.challenge, data.user); //user.id et user.name
          break;
        case "withdrawchallenge":
          const cIdx = this.challenges.findIndex(c => c.id == data.cid);
          let chall = this.challenges[cIdx]
          ArrayFun.remove(chall.players, p => p.id == data.uid);
          chall.players.push({id:0, name:""});
          break;
        case "cancelchallenge":
          ArrayFun.remove(this.challenges, c => c.id == data.cid);
          break;
// NOTE: finally only one connect / disconnect couple of events
// (because on server side we wouldn't know which to choose)
        case "connect":
// *  - receive "player connect": send all our current challenges (to him or global)
// *    Also send all our games (live - max 1 - and corr) [in web worker ?]
// *    + all our sent challenges.
          this.players.push({name:"", id:0, sid:data.sid});
          this.st.conn.send(JSON.stringify({code:"askidentity", target:data.sid}));
          // TODO: si on est en train de jouer une partie, le notifier au nouveau connecté
          // envoyer aussi nos défis
          break;
// *  - receive "player disconnect": remove from players list
        case "disconnect":
          ArrayFun.remove(this.players, p => p.sid == data.sid);
          // TODO: also remove all challenges sent by this player,
          // and all live games where he plays and no other opponent is online
          break;
      }
    },
    showGame: function(game) {
      // NOTE: if we are an observer, the game will be found in main games list
      // (sent by connected remote players)
      // TODO: game path ? /vname/gameId seems better
      this.$router.push("/" + game.id)
    },
    tryChallenge: function(player) {
      if (player.id == 0)
        return; //anonymous players cannot be challenged
      this.newchallenge.to[0] = player.name;
      doClick("modalNewgame");
    },
// *  - accept challenge (corr or live) --> send info to all concerned players
// *  - cancel challenge (click on sent challenge) --> send info to all concerned players
// *  - withdraw from challenge (if >= 3 players and previously accepted)
// *    --> send info to all concerned players
// *  - refuse challenge (or receive refusal): send to all challenge players (from + to)
// *    except us ; graphics: modal again ? (inline ?)
// *  - prepare and start new game (if challenge is full after acceptation)
// *    --> include challenge ID (so that opponents can delete the challenge too)
// *    Also send to all connected players (only from me)
    clickChallenge: function(challenge) {
      // TODO: also correspondance case (send to server)
      const index = this.challenges.findIndex(c => c.id == challenge.id);
      const toIdx = challenge.to.findIndex(name => name == this.st.user.name);
      if (toIdx >= 0)
      {
        // It's a multiplayer challenge I accepted: withdraw
        this.st.conn.send(JSON.stringify({code:"withdrawchallenge",
          cid:challenge.id, user:this.st.user.sid}));
        this.challenges.to.splice(toIdx, 1);
      }
      else if (challenge.from.id == user.id) //it's my challenge: cancel it
      {
        this.st.conn.send(JSON.stringify({code:"cancelchallenge", cid:challenge.id}));
        this.challenges.splice(index, 1);
      }
      else //accept a challenge
      {
        this.st.conn.send(JSON.stringify({code:"acceptchallenge",
          cid:challenge.id, user:me}));
        this.challenges[index].to.push(me);
      }
      // TODO: accepter un challenge peut lancer une partie, il
      // faut alors supprimer challenge + creer partie + la retourner et l'ajouter ici
      // si pas le mien et FEN speciale :: (charger code variante et)
      // montrer diagramme + couleur (orienté)
    },
    // user: last person to accept the challenge (TODO: revoir ça)
//    newGame: function(chall, user) {
//      const fen = chall.fen || V.GenRandInitFen();
//      const game = {}; //TODO: fen, players, time ...
//      //setStorage(game); //TODO
//      game.players.forEach(p => { //...even if game is by corr (could be played live, why not...)
//        this.conn.send(
//          JSON.stringify({code:"newgame", oppid:p.id, game:game}));
//      });
//      if (this.settings.sound >= 1)
//        new Audio("/sounds/newgame.mp3").play().catch(err => {});
//    },
    // Load a variant file (TODO: should probably be global)
    loadVariant: async function(vid, variantArray) {
      const idxInVariants = variantArray.findIndex(v => v.id == vid);
      const vname = variantArray[idxInVariants].name;
      const vModule = await import("@/variants/" + vname + ".js");
      window.V = vModule.VariantRules;
      return vname;
    },
    // Send new challenge (corr or live, cf. time control), with button or click on player
    newChallenge: async function() {
      if (this.challenges.some(c => c.from.sid == this.st.user.sid))
      {
        document.getElementById("modalNewgame").checked = false;
        return alert("You already have a pending challenge");
      }
      // TODO: put this "load variant" block elsewhere
      const vname = this.loadVariant(this.newchallenge.vid, this.st.variants);
      // checkChallenge side-effect = set FEN, and mainTime + increment in seconds
      // TODO: should not be a side-effect but set here ; for received server challenges we do not have mainTime+increment
      const error = checkChallenge(this.newchallenge);
      if (!!error)
        return alert(error);
// TODO: set FEN, set mainTime and increment ?!
//else //generate a FEN
//    c.fen = V.GenRandInitFen();
      // Less than 3 days ==> live game (TODO: heuristic... 40 moves also)
      const liveGame =
        this.newchallenge.mainTime + 40 * this.newchallenge.increment < 3*24*60*60;
      // Check that the players (if any indicated) are online
      let chall = Object.Assign(
        {},
        this.newchallenge,
        {
          from: this.st.user,
          added: Date.now(),
        fen: this.newchallenge.fen,
        variant: {id: this.newchallenge.vid, name: vname},
        nbPlayers: this.newchallenge.nbPlayers,
        to: [
          {id: 0, name: this.newchallenge.to[0], sid: ""},
          {id: 0, name: this.newchallenge.to[1], sid: ""},
          {id: 0, name: this.newchallenge.to[2], sid: ""},
        ],
        timeControl: this.newchallenge.timeControl,
      };
      for (let p of chall.to)
      {
        if (p.name != "")
        {
          const pIdx = this.players.findIndex(pl => pl.name == p.name);
          // NOTE: id (server DB) and sid (socket ID).
          // Anonymous players just have a socket ID.
          // NOTE: for correspondance play we don't require players to be online
          // (==> we don't have IDs, and no sid)
          if (liveGame && pIdx === -1)
            return alert(p.name + " is not connected");
          p.id = this.players[pIdx].id;
          p.sid = this.players[pIdx].sid;
        }
      }
      const finishAddChallenge = (cid) => {
        chall.id = cid || "c" + getRandString();
        this.challenges.push(chall);
        // Send challenge to peers
        let challSock =
        {
          code: "newchallenge",
          chall: chall,
          target: "",
        };
        const sendChallengeTo = (sid) => {
          challSock.target = sid;
          this.st.conn.send(JSON.stringify(challSock));
        };
        if (chall.to[0].id > 0)
        {
          // Challenge with targeted players
          chall.to.forEach(p => {
            if (p.id > 0)
              sendChallengeTo(p.sid);
          });
        }
        else
        {
          // Open challenge: send to all connected players (except us)
          this.players.forEach(p => {
            if (p.sid != this.st.user.sid) //only sid is always set
              sendChallengeTo(p.sid);
          });
        }
        document.getElementById("modalNewgame").checked = false;
      };
      if (liveGame)
      {
        // Live challenges have cid = 0
        finishAddChallenge();
      }
      else
      {
        const chall = {
          uid: req.body["from"],
          vid: req.body["vid"],
          fen: req.body["fen"],
          timeControl: req.body["timeControl"],
          nbPlayers: req.body["nbPlayers"],
          to: req.body["to"], //array of IDs
        };
        // Correspondance game: send challenge to server
        ajax(
          "/challenges/" + this.newchallenge.vid,
          "POST",
          chall,
          response => {
            chall.id = response.cid;
            finishAddChallenge();
          }
        );
      }
    },
    possibleNbplayers: function(nbp) {
      if (this.newchallenge.vid == 0)
        return false;
      const variants = this.st.variants;
      const idxInVariants =
        variants.findIndex(v => v.id == this.newchallenge.vid);
      return NbPlayers[variants[idxInVariants].name].includes(nbp);
    },
  },
};
</script>

<style lang="sass">
// TODO
</style>
