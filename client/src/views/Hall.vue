<template lang="pug">
main
  input#modalInfo.modal(type="checkbox")
  div#infoDiv(role="dialog" data-checkbox="modalInfo" aria-labelledby="infoMessage")
    .card.smallpad.small-modal.text-center
      label.modal-close(for="modalInfo")
      h3#infoMessage.section
        p(v-html="infoMessage")
  input#modalNewgame.modal(type="checkbox")
  div#newgameDiv(role="dialog" data-checkbox="modalNewgame"
      aria-labelledby="titleFenedit")
    .card.smallpad(@keyup.enter="newChallenge")
      label#closeNewgame.modal-close(for="modalNewgame")
      fieldset
        label(for="selectVariant") {{ st.tr["Variant"] }} *
        select#selectVariant(v-model="newchallenge.vid")
          option(v-for="v in st.variants" :value="v.id"
              :selected="newchallenge.vid==v.id")
            | {{ v.name }}
      fieldset
        label(for="timeControl") {{ st.tr["Cadence"] }} *
        div#predefinedTimeControls
          button 3+2
          button 5+3
          button 15+5
        input#timeControl(type="text" v-model="newchallenge.timeControl"
          placeholder="5+0, 1h+30s, 7d+1d ...")
      fieldset(v-if="st.user.id > 0")
        label(for="selectPlayers") {{ st.tr["Play with?"] }}
        input#selectPlayers(type="text" v-model="newchallenge.to")
      fieldset(v-if="st.user.id > 0 && newchallenge.to.length > 0")
        label(for="inputFen") FEN
        input#inputFen(type="text" v-model="newchallenge.fen")
      button(@click="newChallenge") {{ st.tr["Send challenge"] }}
  .row
    .col-sm-12
      button#newGame(onClick="doClick('modalNewgame')") {{ st.tr["New game"] }}
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      div
        .button-group
          button(@click="(e) => setDisplay('c','live',e)" class="active")
            | {{ st.tr["Live challenges"] }}
          button(@click="(e) => setDisplay('c','corr',e)")
            | {{ st.tr["Correspondance challenges"] }}
        ChallengeList(v-show="cdisplay=='live'"
          :challenges="filterChallenges('live')" @click-challenge="clickChallenge")
        ChallengeList(v-show="cdisplay=='corr'"
          :challenges="filterChallenges('corr')" @click-challenge="clickChallenge")
      #people
        h3.text-center {{ st.tr["Who's there?"] }}
        #players
          p(v-for="sid in Object.keys(people)" v-if="!!people[sid].name")
            span {{ people[sid].name }}
            button.player-action(
              v-if="people[sid].name != st.user.name"
              @click="challOrWatch(sid, $event)"
            )
              | {{ st.tr[!!people[sid].gamer ? 'Playing' : 'Available'] }}
          p.anonymous @nonymous ({{ anonymousCount }})
        #chat
          Chat(:newChat="newChat" @mychat="processChat")
        .clearer
      div
        .button-group
          button(@click="(e) => setDisplay('g','live',e)" class="active")
            | {{ st.tr["Live games"] }}
          button(@click="(e) => setDisplay('g','corr',e)")
            | {{ st.tr["Correspondance games"] }}
        GameList(v-show="gdisplay=='live'" :games="filterGames('live')"
          @show-game="showGame")
        GameList(v-show="gdisplay=='corr'" :games="filterGames('corr')"
          @show-game="showGame")
</template>

<script>
import { store } from "@/store";
import { checkChallenge } from "@/data/challengeCheck";
import { ArrayFun } from "@/utils/array";
import { ajax } from "@/utils/ajax";
import { getRandString, shuffle } from "@/utils/alea";
import Chat from "@/components/Chat.vue";
import GameList from "@/components/GameList.vue";
import ChallengeList from "@/components/ChallengeList.vue";
import { GameStorage } from "@/utils/gameStorage";
import { processModalClick } from "@/utils/modalClick";

export default {
  name: "my-hall",
  components: {
    Chat,
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
      people: {}, //people in main hall
      infoMessage: "",
      newchallenge: {
        fen: "",
        vid: localStorage.getItem("vid") || "",
        to: "", //name of challenged player (if any)
        timeControl: localStorage.getItem("timeControl") || "",
      },
      newChat: "",
    };
  },
  watch: {
    // st.variants changes only once, at loading from [] to [...]
    "st.variants": function(variantArray) {
      // Set potential challenges and games variant names:
      this.challenges.forEach(c => {
        if (c.vname == "")
          c.vname = this.getVname(c.vid);
      });
      this.games.forEach(g => {
        if (g.vname == "")
          g.vname = this.getVname(g.vid);
      });
    },
  },
  computed: {
    anonymousCount: function() {
      let count = 0;
      Object.values(this.people).forEach(p => { count += (!p.name ? 1 : 0); });
      return count;
    },
  },
  created: function() {
    // Always add myself to players' list
    const my = this.st.user;
    this.$set(this.people, my.sid, {id:my.id, name:my.name});
    // Retrieve live challenge (not older than 30 minute) if any:
    const chall = JSON.parse(localStorage.getItem("challenge") || "false");
    if (!!chall)
    {
      // NOTE: a challenge survives 3 minutes, for potential connection issues
      if ((Date.now() - chall.added)/1000 <= 3*60)
      {
        chall.added = Date.now(); //update added time, for next disconnect...
        this.challenges.push(chall);
        localStorage.setItem("challenge", JSON.stringify(chall));
      }
      else
        localStorage.removeItem("challenge");
    }
    // Ask server for current corr games (all but mines)
    ajax(
      "/games",
      "GET",
      {uid: this.st.user.id, excluded: true},
      response => {
        this.games = this.games.concat(response.games.map(g => {
          const type = this.classifyObject(g);
          const vname = this.getVname(g.vid);
          return Object.assign({}, g, {type: type, vname: vname});
        }));
      }
    );
    // Also ask for corr challenges (open + sent by/to me)
    ajax(
      "/challenges",
      "GET",
      {uid: this.st.user.id},
      response => {
        // Gather all senders names, and then retrieve full identity:
        // (TODO [perf]: some might be online...)
        let names = {};
        response.challenges.forEach(c => {
          if (c.uid != this.st.user.id)
            names[c.uid] = ""; //unknwon for now
          else if (!!c.target && c.target != this.st.user.id)
            names[c.target] = "";
        });
        const addChallenges = (newChalls) => {
          names[this.st.user.id] = this.st.user.name; //in case of
          this.challenges = this.challenges.concat(
            response.challenges.map(c => {
              const from = {name: names[c.uid], id: c.uid}; //or just name
              const type = this.classifyObject(c);
              const vname = this.getVname(c.vid);
              return Object.assign({},
                {
                  type: type,
                  vname: vname,
                  from: from,
                  to: (!!c.target ? names[c.target] : ""),
                },
                c);
            })
          );
        };
        if (names !== {})
        {
          ajax("/users",
            "GET",
            { ids: Object.keys(names).join(",") },
            response2 => {
              response2.users.forEach(u => {names[u.id] = u.name});
              addChallenges();
            }
          );
        }
        else
          addChallenges();
      }
    );
    // 0.1] Ask server for room composition:
    const funcPollClients = () => {
      // Same strategy as in Game.vue: send connection
      // after we're sure WebSocket is initialized
      this.st.conn.send(JSON.stringify({code:"connect"}));
      this.st.conn.send(JSON.stringify({code:"pollclients"}));
      this.st.conn.send(JSON.stringify({code:"pollgamers"}));
    };
    if (!!this.st.conn && this.st.conn.readyState == 1) //1 == OPEN state
      funcPollClients();
    else //socket not ready yet (initial loading)
      this.st.conn.onopen = funcPollClients;
    this.st.conn.onmessage = this.socketMessageListener;
    const socketCloseListener = () => {
      store.socketCloseListener(); //reinitialize connexion (in store.js)
      this.st.conn.addEventListener('message', this.socketMessageListener);
      this.st.conn.addEventListener('close', socketCloseListener);
    };
    this.st.conn.onclose = socketCloseListener;
  },
  mounted: function() {
    [document.getElementById("infoDiv"),document.getElementById("newgameDiv")]
      .forEach(elt => elt.addEventListener("click", processModalClick));
    document.querySelectorAll("#predefinedTimeControls > button").forEach(
      (b) => { b.addEventListener("click",
        () => { this.newchallenge.timeControl = b.innerHTML; }
      )}
    );
  },
  methods: {
    // Helpers:
    filterChallenges: function(type) {
      return this.challenges.filter(c => c.type == type);
    },
    filterGames: function(type) {
      return this.games.filter(g => g.type == type);
    },
    classifyObject: function(o) { //challenge or game
      return (o.timeControl.indexOf('d') === -1 ? "live" : "corr");
    },
    showGame: function(g) {
      // NOTE: we are an observer, since only games I don't play are shown here
      // ==> Moves sent by connected remote player(s) if live game
      let url = "/game/" + g.id;
      if (g.type == "live")
        url += "?rid=" + g.rid;
      this.$router.push(url);
    },
    setDisplay: function(letter, type, e) {
      this[letter + "display"] = type;
      e.target.classList.add("active");
      if (!!e.target.previousElementSibling)
        e.target.previousElementSibling.classList.remove("active");
      else
        e.target.nextElementSibling.classList.remove("active");
    },
    getVname: function(vid) {
      const variant = this.st.variants.find(v => v.id == vid);
      // this.st.variants might be uninitialized (variant == null)
      return (!!variant ? variant.name : "");
    },
    processChat: function(chat) {
      // When received on server, this will trigger a "notifyRoom"
      this.st.conn.send(JSON.stringify({code:"newchat", chat: chat}));
    },
    sendSomethingTo: function(to, code, obj, warnDisconnected) {
      const doSend = (code, obj, sid) => {
        this.st.conn.send(JSON.stringify(Object.assign(
          {code: code},
          obj,
          {target: sid}
        )));
      };
      if (!to || (!to.sid && !to.name))
      {
        // Open challenge: send to all connected players (me excepted)
        Object.keys(this.people).forEach(sid => {
          if (sid != this.st.user.sid)
            doSend(code, obj, sid);
        });
      }
      else
      {
        let targetSid = "";
        if (!!to.sid)
          targetSid = to.sid;
        else
        {
          if (to.name == this.st.user.name)
            return alert(this.st.tr["Cannot challenge self"]);
          // Challenge with targeted players
          targetSid =
            Object.keys(this.people).find(sid => this.people[sid].name == to.name);
          if (!targetSid)
          {
            if (!!warnDisconnected)
              alert(this.st.tr["Warning: target is not connected"]);
            return false;
          }
        }
        doSend(code, obj, targetSid);
      }
      return true;
    },
    // Messaging center:
    socketMessageListener: function(msg) {
      const data = JSON.parse(msg.data);
      switch (data.code)
      {
        case "duplicate":
          alert(this.st.tr["Warning: multi-tabs not supported"]);
          break;
        // 0.2] Receive clients list (just socket IDs)
        case "pollclients":
          data.sockIds.forEach(sid => {
            this.$set(this.people, sid, {id:0, name:""});
            // Ask identity and challenges
            this.st.conn.send(JSON.stringify({code:"askidentity", target:sid}));
            this.st.conn.send(JSON.stringify({code:"askchallenge", target:sid}));
          });
          break;
        case "pollgamers":
          // NOTE: we could make a difference between people in hall
          // and gamers, but is it necessary?
          data.sockIds.forEach(sid => {
            this.$set(this.people, sid, {id:0, name:"", gamer:true});
            this.st.conn.send(JSON.stringify({code:"askidentity", target:sid}));
          });
          // Also ask current games to all playing peers (TODO: some design issue)
          this.st.conn.send(JSON.stringify({code:"askgames"}));
          break;
        case "askidentity":
        {
          // Request for identification: reply if I'm not anonymous
          if (this.st.user.id > 0)
          {
            this.st.conn.send(JSON.stringify({code:"identity",
              user: {
                // NOTE: decompose to avoid revealing email
                name: this.st.user.name,
                sid: this.st.user.sid,
                id: this.st.user.id,
              },
              target:data.from}));
          }
          break;
        }
        case "identity":
        {
          this.$set(this.people, data.user.sid,
            {
              id: data.user.id,
              name: data.user.name,
              gamer: this.people[data.user.sid].gamer,
            });
          break;
        }
        case "askchallenge":
        {
          // Send my current live challenge (if any)
          const cIdx = this.challenges.findIndex(c =>
            c.from.sid == this.st.user.sid && c.type == "live");
          if (cIdx >= 0)
          {
            const c = this.challenges[cIdx];
            // TODO: code below requires "c.to" to have given his identity,
            // but it can happen that the identity arrives later, which
            // prevent him from receiving the challenge.
            // ==> Filter later (when receiving challenge)
//            if (!!c.to)
//            {
//              // Only share targeted challenges to the targets:
//              const toSid = Object.keys(this.people).find(k =>
//                this.people[k].name == c.to);
//              if (toSid != data.from)
//                return;
//            }
            const myChallenge =
            {
              // Minimal challenge informations: (from not required)
              id: c.id,
              to: c.to,
              fen: c.fen,
              vid: c.vid,
              timeControl: c.timeControl,
              added: c.added,
            };
            this.st.conn.send(JSON.stringify({code:"challenge",
              chall:myChallenge, target:data.from}));
          }
          break;
        }
        case "challenge":
        {
          // Receive challenge from some player (+sid)
          // NOTE about next condition: see "askchallenge" case.
          if (!data.chall.to || data.chall.to == this.st.user.name)
          {
            let newChall = data.chall;
            newChall.type = this.classifyObject(data.chall);
            newChall.from =
              Object.assign({sid:data.from}, this.people[data.from]);
            newChall.vname = this.getVname(newChall.vid);
            this.challenges.push(newChall);
          }
          break;
        }
        case "game":
        {
          // Receive game from some player (+sid)
          // NOTE: it may be correspondance (if newgame while we are connected)
          // If duplicate found: select rid (remote ID) at random
          let game = this.games.find(g => g.id == data.game.id);
          if (!!game)
          {
            if (Math.random() < 0.5)
              game.rid = data.from;
          }
          else
          {
            let newGame = data.game;
            newGame.type = this.classifyObject(data.game);
            newGame.vname = this.getVname(data.game.vid);
            newGame.rid = data.from;
            if (!data.game.score)
              newGame.score = "*";
            this.games.push(newGame);
          }
          break;
        }
        case "newgame":
        {
          // New game just started: data contain all information
          if (this.classifyObject(data.gameInfo) == "live")
            this.startNewGame(data.gameInfo);
          else
          {
            this.infoMessage = "New game started: " +
              "<a href='#/game/" + data.gameInfo.id + "'>" +
              "#/game/" + data.gameInfo.id + "</a>";
            let modalBox = document.getElementById("modalInfo");
            modalBox.checked = true;
            setTimeout(() => { modalBox.checked = false; }, 3000);
          }
          break;
        }
        case "newchat":
          this.newChat = data.chat;
          break;
        case "refusechallenge":
        {
          ArrayFun.remove(this.challenges, c => c.id == data.cid);
          localStorage.removeItem("challenge");
          alert(this.st.tr["Challenge declined"]);
          break;
        }
        case "deletechallenge":
        {
          // NOTE: the challenge may be already removed
          ArrayFun.remove(this.challenges, c => c.id == data.cid);
          localStorage.removeItem("challenge"); //in case of
          break;
        }
        case "connect":
        case "gconnect":
          this.$set(this.people, data.from, {name:"", id:0, gamer:data.code[0]=='g'});
          this.st.conn.send(JSON.stringify({code:"askidentity", target:data.from}));
          if (data.code == "connect")
            this.st.conn.send(JSON.stringify({code:"askchallenge", target:data.from}));
          else
            this.st.conn.send(JSON.stringify({code:"askgame", target:data.from}));
          break;
        case "disconnect":
        case "gdisconnect":
          this.$delete(this.people, data.from);
          if (data.code == "disconnect")
          {
            // Also remove all challenges sent by this player:
            ArrayFun.remove(this.challenges, c => c.from.sid == data.from);
          }
          else
          {
            // And all live games where he plays and no other opponent is online
            ArrayFun.remove(this.games, g =>
              g.type == "live" && (g.players.every(p => p.sid == data.from
                || !this.people[p.sid])), "all");
          }
          break;
      }
    },
    // Challenge lifecycle:
    tryChallenge: function(sid) {
      if (this.people[sid].id == 0)
        return; //anonymous players cannot be challenged
      // TODO: SID is available, so we could use it instead of searching from name
      this.newchallenge.to = this.people[sid].name;
      doClick("modalNewgame");
    },
    challOrWatch: function(sid, e) {
      switch (e.target.innerHTML)
      {
        case "Available":
          this.tryChallenge(sid);
          break;
        case "Playing":
          this.showGame(this.games.find(
            g => g.players.some(pl => pl.sid == sid || pl.uid == this.people[sid].id)));
          break;
      };
    },
    newChallenge: async function() {
      if (this.newchallenge.vid == "")
        return alert(this.st.tr["Please select a variant"]);
      if (!!this.newchallenge.to && this.newchallenge.to == this.st.user.name)
        return alert(this.st.tr["Self-challenge is forbidden"]);
      const vname = this.getVname(this.newchallenge.vid);
      const vModule = await import("@/variants/" + vname + ".js");
      window.V = vModule.VariantRules;
      if (!!this.newchallenge.timeControl.match(/^[0-9]+$/))
        this.newchallenge.timeControl += "+0"; //assume minutes, no increment
      const error = checkChallenge(this.newchallenge);
      if (!!error)
        return alert(error);
      const ctype = this.classifyObject(this.newchallenge);
      if (ctype == "corr" && this.st.user.id <= 0)
        return alert(this.st.tr["Please log in to play correspondance games"]);
      // NOTE: "from" information is not required here
      let chall = Object.assign({}, this.newchallenge);
      const finishAddChallenge = (cid,warnDisconnected) => {
        chall.id = cid || "c" + getRandString();
        // Send challenge to peers (if connected)
        const isSent = this.sendSomethingTo({name:chall.to}, "challenge",
          {chall:chall}, !!warnDisconnected);
        if (!isSent)
          return;
        // Remove old challenge if any (only one at a time of a given type):
        const cIdx = this.challenges.findIndex(c =>
          (c.from.sid == this.st.user.sid || c.from.id == this.st.user.id) && c.type == ctype);
        if (cIdx >= 0)
        {
          // Delete current challenge (will be replaced now)
          this.sendSomethingTo({name:this.challenges[cIdx].to},
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
        // Add new challenge:
        chall.added = Date.now();
        // NOTE: vname and type are redundant (can be deduced from timeControl + vid)
        chall.type = ctype;
        chall.vname = vname;
        chall.from = { //decompose to avoid revealing email
          sid: this.st.user.sid,
          id: this.st.user.id,
          name: this.st.user.name,
        };
        this.challenges.push(chall);
        if (ctype == "live")
          localStorage.setItem("challenge", JSON.stringify(chall));
        // Also remember timeControl  + vid for quicker further challenges:
        localStorage.setItem("timeControl", chall.timeControl);
        localStorage.setItem("vid", chall.vid);
        document.getElementById("modalNewgame").checked = false;
      };
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
          { chall: chall },
          response => { finishAddChallenge(response.cid); }
        );
      }
    },
    clickChallenge: function(c) {
      const myChallenge = (c.from.sid == this.st.user.sid //live
        || (this.st.user.id > 0 && c.from.id == this.st.user.id)); //corr
      if (!myChallenge)
      {
        if (c.type == "corr" && this.st.user.id <= 0)
          return alert(this.st.tr["Please log in to accept corr challenges"]);
        c.accepted = true;
        if (!!c.to) //c.to == this.st.user.name (connected)
        {
          // TODO: if special FEN, show diagram after loading variant
          c.accepted = confirm("Accept challenge?");
        }
        if (c.accepted)
        {
          c.seat = { //again, avoid c.seat = st.user to not reveal email
            sid: this.st.user.sid,
            id: this.st.user.id,
            name: this.st.user.name,
          };
          this.launchGame(c);
        }
        else
        {
          this.st.conn.send(JSON.stringify({
            code: "refusechallenge",
            cid: c.id, target: c.from.sid}));
        }
        this.sendSomethingTo(!!c.to ? {sid:c.from.sid} : null, "deletechallenge", {cid:c.id});
      }
      else //my challenge
      {
        if (c.type == "corr")
        {
          ajax(
            "/challenges",
            "DELETE",
            {id: c.id}
          );
        }
        else //live
          localStorage.removeItem("challenge");
        this.sendSomethingTo({name:c.to}, "deletechallenge", {cid:c.id});
      }
      // In all cases, the challenge is consumed:
      ArrayFun.remove(this.challenges, ch => ch.id == c.id);
    },
    // NOTE: when launching game, the challenge is already being deleted
    launchGame: async function(c) {
      const vModule = await import("@/variants/" + c.vname + ".js");
      window.V = vModule.VariantRules;
      // These game informations will be sent to other players
      const gameInfo =
      {
        id: getRandString(),
        fen: c.fen || V.GenRandInitFen(),
        players: shuffle([c.from, c.seat]), //white then black
        vid: c.vid,
        vname: c.vname, //theoretically vid is enough, but much easier with vname
        timeControl: c.timeControl,
      };
      let oppsid = c.from.sid; //may not be defined if corr + offline opp
      if (!oppsid)
      {
        oppsid = Object.keys(this.people).find(sid =>
          this.people[sid].id == c.from.id);
      }
      const tryNotifyOpponent = () => {
        if (!!oppsid) //opponent is online
        {
          this.st.conn.send(JSON.stringify({code:"newgame",
            gameInfo:gameInfo, target:oppsid, cid:c.id}));
        }
      };
      if (c.type == "live")
      {
        // NOTE: in this case we are sure opponent is online
        tryNotifyOpponent();
        this.startNewGame(gameInfo);
      }
      else //corr: game only on server
      {
        ajax(
          "/games",
          "POST",
          {gameInfo: gameInfo, cid: c.id}, //cid useful to delete challenge
          response => {
            gameInfo.id = response.gameId;
            tryNotifyOpponent();
            this.$router.push("/game/" + response.gameId);
          }
        );
      }
      // Send game info to everyone except opponent (and me)
      Object.keys(this.people).forEach(sid => {
        if (![this.st.user.sid,oppsid].includes(sid))
        {
          this.st.conn.send(JSON.stringify({code:"game",
            game: { //minimal game info:
              id: gameInfo.id,
              players: gameInfo.players,
              vid: gameInfo.vid,
              timeControl: gameInfo.timeControl,
            },
            target: sid}));
        }
      });
    },
    // NOTE: for live games only (corr games start on the server)
    startNewGame: function(gameInfo) {
      const game = Object.assign({}, gameInfo, {
        // (other) Game infos: constant
        fenStart: gameInfo.fen,
        added: Date.now(),
        // Game state (including FEN): will be updated
        moves: [],
        clocks: [-1, -1], //-1 = unstarted
        initime: [0, 0], //initialized later
        score: "*",
      });
      GameStorage.add(game);
      if (this.st.settings.sound >= 1)
        new Audio("/sounds/newgame.mp3").play().catch(err => {});
      this.$router.push("/game/" + gameInfo.id);
    },
  },
};
</script>

<style lang="sass" scoped>
.active
  color: #42a983
#newGame
  display: block
  margin: 10px auto 5px auto
#people
  width: 100%
#players
  width: 50%
  position: relative
  float: left
#chat
  width: 50%
  float: left
  position: relative
@media screen and (max-width: 767px)
  #players, #chats
    width: 100%
#chat > .card
  max-width: 100%
  margin: 0;
  border: none;
#players > p
  margin-left: 5px
.anonymous
  font-style: italic
button.player-action
  margin-left: 32px
</style>
