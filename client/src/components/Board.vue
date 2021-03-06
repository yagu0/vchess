<script>
import { getSquareId, getSquareFromId } from "@/utils/squareId";
import { ArrayFun } from "@/utils/array";
import { store } from "@/store";
export default {
  name: "my-board",
  // Last move cannot be guessed from here, and is required for highlights.
  // vr: object to check moves, print board...
  // userColor is left undefined for an external observer
  props: [
    "vr",
    "lastMove",
    "analyze",
    "score",
    "incheck",
    "orientation",
    "userColor",
    "vname"
  ],
  data: function() {
    return {
      mobileBrowser: ("ontouchstart" in window),
      possibleMoves: [], //filled after each valid click/dragstart
      choices: [], //promotion pieces, or checkered captures... (as moves)
      containerPos: null,
      selectedPiece: null, //moving piece (or clicked piece)
      start: null, //pixels coordinates + id of starting square (click or drag)
      startArrow: null,
      movingArrow: null,
      arrows: [], //object of {start: x,y / end: x,y}
      circles: {}, //object of squares' ID --> true (TODO: use a set?)
      click: "",
      clickTime: 0,
      initialized: 0,
      settings: store.state.settings
    };
  },
  render(h) {
    if (!this.vr) {
      // Return empty div of class 'game' to avoid error when setting size
      return h(
        "div",
        { "class": { game: true } }
      );
    }
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    // Precompute hints squares to facilitate rendering
    let hintSquares = ArrayFun.init(sizeX, sizeY, false);
    this.possibleMoves.forEach(m => {
      hintSquares[m.end.x][m.end.y] = true;
    });
    // Also precompute in-check squares
    let incheckSq = ArrayFun.init(sizeX, sizeY, false);
    this.incheck.forEach(sq => {
      incheckSq[sq[0]][sq[1]] = true;
    });

    let lm = this.lastMove;
    // Precompute lastMove highlighting squares
    const lmHighlights = {};
    if (!!lm) {
      if (!Array.isArray(lm)) lm = [lm];
      lm.forEach(m => {
        if (!m.start.noHighlight && V.OnBoard(m.start.x, m.start.y))
          lmHighlights[m.start.x + sizeX * m.start.y] = true;
        if (!m.end.noHighlight && V.OnBoard(m.end.x, m.end.y))
          lmHighlights[m.end.x + sizeX * m.end.y] = true;
        if (!!m.start.toplay)
          // For Dice variant (at least?)
          lmHighlights[m.start.toplay[0] + sizeX * m.start.toplay[1]] = true;
      });
    }
    const showLight = (
      this.settings.highlight &&
      ["all", "highlight"].includes(V.ShowMoves)
    );
    const showCheck = (
      this.settings.highlight &&
      ["all", "highlight", "byrow"].includes(V.ShowMoves)
    );
    const orientation = !V.CanFlip ? "w" : this.orientation;
    // Ensure that squares colors do not change when board is flipped
    const lightSquareMod = (sizeX + sizeY) % 2;
    const showPiece = (x, y) => {
      return (
        this.vr.board[x][y] != V.EMPTY &&
        (!this.vr.enlightened || this.analyze || this.score != "*" ||
          (!!this.userColor && this.vr.enlightened[this.userColor][x][y]))
      );
    };
    const inHighlight = (x, y) => {
      return showLight && !!lmHighlights[x + sizeX * y];
    };
    const inShadow = (x, y) => {
      return (
        !this.analyze &&
        this.score == "*" &&
        this.vr.enlightened &&
        (!this.userColor || !this.vr.enlightened[this.userColor][x][y])
      );
    };
    // Create board element (+ reserves if needed by variant)
    let elementArray = [];
    const gameDiv = h(
      "div",
      {
        attrs: { id: "gamePosition" },
        "class": {
          game: true,
          clearer: true
        }
      },
      [...Array(sizeX).keys()].map(i => {
        const ci = orientation == "w" ? i : sizeX - i - 1;
        return h(
          "div",
          {
            "class": {
              row: true
            },
            style: { opacity: this.choices.length > 0 ? "0.5" : "1" }
          },
          [...Array(sizeY).keys()].map(j => {
            const cj = orientation == "w" ? j : sizeY - j - 1;
            const squareId = "sq-" + ci + "-" + cj;
            let elems = [];
            if (showPiece(ci, cj)) {
              let pieceSpecs = {
                "class": {
                  piece: true,
                  ghost:
                    !!this.selectedPiece &&
                    this.selectedPiece.parentNode.id == squareId
                },
                attrs: {
                  src:
                    "/images/pieces/" +
                    this.vr.getPpath(
                      this.vr.board[ci][cj],
                      // Extra args useful for some variants:
                      this.userColor,
                      this.score,
                      this.orientation) +
                    V.IMAGE_EXTENSION
                }
              };
              if (this.arrows.length == 0)
                pieceSpecs["style"] = { position: "absolute" };
              elems.push(h("img", pieceSpecs));
            }
            if (this.settings.hints && hintSquares[ci][cj]) {
              elems.push(
                h("img", {
                  "class": {
                    "mark-square": true
                  },
                  attrs: {
                    src: "/images/mark.svg"
                  }
                })
              );
            }
            if (!!this.circles[squareId]) {
              elems.push(
                h("img", {
                  "class": {
                    "circle-square": true
                  },
                  attrs: {
                    src: "/images/circle.svg"
                  }
                })
              );
            }
            const oddity = (ci + cj) % 2;
            const lightSquare = (
              (!V.DarkBottomRight && oddity == lightSquareMod) ||
              (V.DarkBottomRight && oddity != lightSquareMod)
            );
            return h(
              "div",
              {
                "class": {
                  board: true,
                  ["board" + sizeY]: true,
                  "light-square":
                    !V.Notoodark && lightSquare && !V.Monochrome,
                  "dark-square":
                    !V.Notoodark && (!lightSquare || !!V.Monochrome),
                  "middle-square": V.Notoodark,
                  [this.settings.bcolor]: true,
                  "in-shadow": inShadow(ci, cj),
                  "highlight": inHighlight(ci, cj),
                  "incheck-light":
                    showCheck && lightSquare && incheckSq[ci][cj],
                  "incheck-dark":
                    showCheck && !lightSquare && incheckSq[ci][cj],
                  "hover-highlight":
                    this.vr.hoverHighlight(
                      [ci, cj], !this.analyze ? this.userColor : null)
                },
                attrs: {
                  id: getSquareId({ x: ci, y: cj })
                }
              },
              elems
            );
          })
        );
      })
    );
    if (!!this.vr.reserve) {
      const playingColor = this.userColor || "w"; //default for an observer
      const shiftIdx = playingColor == "w" ? 0 : 1;
      // Some variants have more than sizeY reserve pieces (Clorange: 10)
      const reserveSquareNb = Math.max(sizeY, V.RESERVE_PIECES.length);
      let myReservePiecesArray = [];
      if (!!this.vr.reserve[playingColor]) {
        for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
          const qty = this.vr.reserve[playingColor][V.RESERVE_PIECES[i]];
          myReservePiecesArray.push(
            h(
              "div",
              {
                "class": { board: true, ["board" + reserveSquareNb]: true },
                attrs: { id: getSquareId({ x: sizeX + shiftIdx, y: i }) },
                style: { opacity: qty > 0 ? 1 : 0.35 }
              },
              [
                h("img", {
                  // NOTE: class "reserve" not used currently
                  "class": { piece: true, reserve: true },
                  attrs: {
                    src:
                      "/images/pieces/" +
                      this.vr.getReservePpath(i, playingColor, orientation) +
                      ".svg"
                  }
                }),
                h(
                  "sup",
                  {
                    "class": { "reserve-count": true },
                    style: { top: "calc(100% + 5px)" }
                  },
                  [ qty ]
                )
              ]
            )
          );
        }
      }
      let oppReservePiecesArray = [];
      const oppCol = V.GetOppCol(playingColor);
      if (!!this.vr.reserve[oppCol]) {
        for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
          const qty = this.vr.reserve[oppCol][V.RESERVE_PIECES[i]];
          oppReservePiecesArray.push(
            h(
              "div",
              {
                "class": { board: true, ["board" + reserveSquareNb]: true },
                attrs: { id: getSquareId({ x: sizeX + (1 - shiftIdx), y: i }) },
                style: { opacity: qty > 0 ? 1 : 0.35 }
              },
              [
                h("img", {
                  "class": { piece: true, reserve: true },
                  attrs: {
                    src:
                      "/images/pieces/" +
                      this.vr.getReservePpath(i, oppCol, orientation) +
                      ".svg"
                  }
                }),
                h(
                  "sup",
                  {
                    "class": { "reserve-count": true },
                    style: { top: "calc(100% + 5px)" }
                  },
                  [ qty ]
                )
              ]
            )
          );
        }
      }
      const myReserveTop = (
        (playingColor == 'w' && orientation == 'b') ||
        (playingColor == 'b' && orientation == 'w')
      );
      const hasReserveTop = (
        (myReserveTop && !!this.vr.reserve[playingColor]) ||
        (!myReserveTop && !!this.vr.reserve[oppCol])
      );
      // "var" because must be reachable from outside this block
      var hasReserveBottom = (
        (myReserveTop && !!this.vr.reserve[oppCol]) ||
        (!myReserveTop && !!this.vr.reserve[playingColor])
      );
      // Center reserves, assuming same number of pieces for each side:
      const nbReservePieces =
        Math.max(myReservePiecesArray.length, oppReservePiecesArray.length);
      const marginLeft =
        ((100 - nbReservePieces * (100 / reserveSquareNb)) / 2) + "%";
      if (hasReserveTop) {
        var reserveTop =
          h(
            "div",
            {
              "class": {
                game: true,
                "reserve-div": true
              },
              style: {
                "margin-left": marginLeft
              }
            },
            [
              h(
                "div",
                {
                  "class": {
                    row: true,
                    "reserve-row": true
                  }
                },
                myReserveTop ? myReservePiecesArray : oppReservePiecesArray
              )
            ]
          );
      }
      if (hasReserveBottom) {
        var reserveBottom =
          h(
            "div",
            {
              "class": {
                game: true,
                "reserve-div": true
              },
              style: {
                "margin-left": marginLeft
              }
            },
            [
              h(
                "div",
                {
                  "class": {
                    row: true,
                    "reserve-row": true
                  }
                },
                myReserveTop ? oppReservePiecesArray : myReservePiecesArray
              )
            ]
          );
      }
      if (hasReserveTop) elementArray.push(reserveTop);
    }
    elementArray.push(gameDiv);
    if (!!this.vr.reserve && hasReserveBottom)
      elementArray.push(reserveBottom);
    const boardElt = document.getElementById("gamePosition");
    // boardElt might be undefine (at first drawing)
    if (this.choices.length > 0 && !!boardElt) {
      const squareWidth = boardElt.offsetWidth / sizeY;
      const offset = [boardElt.offsetTop, boardElt.offsetLeft];
      const maxNbeltsPerRow = Math.min(this.choices.length, sizeY);
      let topOffset = offset[0] + ((sizeX - 1) / 2) * squareWidth;
      let choicesHeight = squareWidth;
      if (this.choices.length >= sizeY) {
        // A second row is required (Eightpieces variant)
        topOffset -= squareWidth / 2;
        choicesHeight *= 2;
      }
      const choices = h(
        "div",
        {
          attrs: { id: "choices" },
          "class": { row: true },
          style: {
            top: topOffset + "px",
            left:
              offset[1] +
              (squareWidth * Math.max(sizeY - this.choices.length, 0)) / 2 +
              "px",
            width: (maxNbeltsPerRow * squareWidth) + "px",
            height: choicesHeight + "px"
          }
        },
        [ h(
          "div",
          {
            "class": { "full-width": true }
          },
          this.choices.map(m => {
            // A "choice" is a move
            const applyMove = (e) => {
              e.stopPropagation();
              // Force a delay between move is shown and clicked
              // (otherwise a "double-click" bug might occur)
              if (Date.now() - this.clickTime < 200) return;
              this.choices = [];
              this.play(m);
            };
            const stopPropagation = (e) => { e.stopPropagation(); }
            const onClick =
              this.mobileBrowser
                // Must cancel mousedown logic:
                ? { touchstart: stopPropagation, touchend: applyMove }
                : { mousedown: stopPropagation, mouseup: applyMove };
            return h(
              "div",
              {
                "class": {
                  board: true,
                  ["board" + sizeY]: true
                },
                style: {
                  width: (100 / maxNbeltsPerRow) + "%",
                  "padding-bottom": (100 / maxNbeltsPerRow) + "%"
                }
              },
              [
                h("img", {
                  attrs: {
                    src:
                      "/images/pieces/" +
                      // orientation: extra arg useful for some variants
                      this.vr.getPPpath(m, this.orientation) +
                      V.IMAGE_EXTENSION
                  },
                  "class": { "choice-piece": true },
                  on: onClick
                })
              ]
            );
          })
        ) ]
      );
      elementArray.unshift(choices);
    }
    let onEvents = {};
    // NOTE: click = mousedown + mouseup
    if (this.mobileBrowser) {
      onEvents = {
        on: {
          touchstart: this.mousedown,
          touchmove: this.mousemove,
          touchend: this.mouseup
        }
      };
    }
    else {
      onEvents = {
        on: {
          mousedown: this.mousedown,
          mousemove: this.mousemove,
          mouseup: this.mouseup,
          contextmenu: this.blockContextMenu
        }
      };
    }
    if (this.initialized == 1) this.$emit("rendered");
    if (this.initialized <= 1) this.initialized++;
    return (
      h(
        "div",
        Object.assign({ attrs: { id: "rootBoardElement" } }, onEvents),
        elementArray
      )
    );
  },
  updated: function() {
    this.re_setDrawings();
  },
  methods: {
    blockContextMenu: function(e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    cancelResetArrows: function() {
      this.startArrow = null;
      this.arrows = [];
      this.circles = {};
      const curCanvas = document.getElementById("arrowCanvas");
      if (!!curCanvas) curCanvas.parentNode.removeChild(curCanvas);
    },
    coordsToXY: function(coords, top, left, squareWidth) {
      return {
        // [1] for x and [0] for y because conventions in rules are inversed.
        x: (
          left + window.scrollX +
          (
            squareWidth *
            (this.orientation == 'w' ? coords[1] : (V.size.y - coords[1]))
          )
        ),
        y: (
          top + window.scrollY +
          (
            squareWidth *
            (this.orientation == 'w' ? coords[0] : (V.size.x - coords[0]))
          )
        )
      };
    },
    computeEndArrow: function(start, end, top, left, squareWidth) {
      const endCoords = this.coordsToXY(end, top, left, squareWidth);
      const delta = [endCoords.x - start.x, endCoords.y - start.y];
      const dist = Math.sqrt(delta[0] * delta[0] + delta[1] * delta[1]);
      // Simple heuristic for now, just remove 1/3 square.
      // TODO: should depend on the orientation.
      const fracSqWidth = squareWidth / 3;
      return {
        x: endCoords.x - delta[0] * fracSqWidth / dist,
        y: endCoords.y - delta[1] * fracSqWidth / dist
      };
    },
    drawCurrentArrow: function() {
      const boardElt = document.getElementById("gamePosition");
      const squareWidth = boardElt.offsetWidth / V.size.y;
      const bPos = boardElt.getBoundingClientRect();
      const aStart =
        this.coordsToXY(
          [this.startArrow[0] + 0.5, this.startArrow[1] + 0.5],
          bPos.top, bPos.left, squareWidth);
      const aEnd =
        this.computeEndArrow(
          aStart, [this.movingArrow[0] + 0.5, this.movingArrow[1] + 0.5],
          bPos.top, bPos.left, squareWidth);
      let currentArrow = document.getElementById("currentArrow");
      const d =
        "M" + aStart.x + "," + aStart.y + " " + "L" + aEnd.x + "," + aEnd.y;
      const arrowWidth = squareWidth / 4;
      if (!!currentArrow) currentArrow.setAttribute("d", d);
      else {
        let domArrow =
          document.createElementNS("http://www.w3.org/2000/svg", "path");
        domArrow.classList.add("svg-arrow");
        domArrow.id = "currentArrow";
        domArrow.setAttribute("d", d);
        domArrow.style = "stroke-width:" + arrowWidth + "px";
        document.getElementById("arrowCanvas")
          .insertAdjacentElement("beforeend", domArrow);
      }
    },
    addArrow: function(arrow) {
      const arrowIdx = this.arrows.findIndex(a => {
        return (
          a.start[0] == arrow.start[0] && a.start[1] == arrow.start[1] &&
          a.end[0] == arrow.end[0] && a.end[1] == arrow.end[1]
        );
      });
      if (arrowIdx >= 0)
        // Erase the arrow
        this.arrows.splice(arrowIdx, 1);
      else
        // Add to arrows vector:
        this.arrows.push(arrow);
      // NOTE: no need to draw here, will be re-draw
      // by updated() hook callong re_setDrawings()
    },
    getSvgArrow: function(arrow, top, left, squareWidth) {
      const aStart =
        this.coordsToXY(
          [arrow.start[0] + 0.5, arrow.start[1] + 0.5],
          top, left, squareWidth);
      const aEnd =
        this.computeEndArrow(
          aStart, [arrow.end[0] + 0.5, arrow.end[1] + 0.5],
          top, left, squareWidth);
      const arrowWidth = squareWidth / 4;
      let path =
        document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("svg-arrow");
      path.setAttribute(
        "d",
        "M" + aStart.x + "," + aStart.y + " " + "L" + aEnd.x + "," + aEnd.y
      );
      path.style = "stroke-width:" + arrowWidth + "px";
      return path;
    },
    re_setDrawings: function() {
      // Add some drawing on board (for some variants + arrows and circles)
      const boardElt = document.getElementById("gamePosition");
      if (!boardElt) return;
      // Remove current canvas, if any
      const curCanvas = document.getElementById("arrowCanvas");
      if (!!curCanvas) curCanvas.parentNode.removeChild(curCanvas);
      const squareWidth = boardElt.offsetWidth / V.size.y;
      const bPos = boardElt.getBoundingClientRect();
      let svgArrows = [];
      this.arrows.forEach(a => {
        svgArrows.push(this.getSvgArrow(a, bPos.top, bPos.left, squareWidth));
      });
      let vLines = [];
      if (!!V.Lines) {
        V.Lines.forEach(line => {
          const lStart =
            this.coordsToXY(line[0], bPos.top, bPos.left, squareWidth);
          const lEnd =
            this.coordsToXY(line[1], bPos.top, bPos.left, squareWidth);
          let path =
            document.createElementNS("http://www.w3.org/2000/svg", "path");
          if (line[0][0] == line[1][0] || line[0][1] == line[1][1])
            path.classList.add("svg-line");
          else
            // "Diagonals" are drawn with a lighter color (TODO: generalize)
            path.classList.add("svg-diag");
          path.setAttribute(
            "d",
            "M" + lStart.x + "," + lStart.y + " " +
              "L" + lEnd.x + "," + lEnd.y
          );
          vLines.push(path);
        });
      }
      let arrowCanvas =
        document.createElementNS("http://www.w3.org/2000/svg", "svg");
      arrowCanvas.id = "arrowCanvas";
      arrowCanvas.setAttribute("stroke", "none");
      let defs =
        document.createElementNS("http://www.w3.org/2000/svg", "defs");
      const arrowWidth = squareWidth / 4;
      let marker =
        document.createElementNS("http://www.w3.org/2000/svg", "marker");
      marker.id = "arrow";
      marker.setAttribute("markerWidth", (2 * arrowWidth) + "px");
      marker.setAttribute("markerHeight", (3 * arrowWidth) + "px");
      marker.setAttribute("markerUnits", "userSpaceOnUse");
      marker.setAttribute("refX", "0");
      marker.setAttribute("refY", (1.5 * arrowWidth) + "px");
      marker.setAttribute("orient", "auto");
      let head =
        document.createElementNS("http://www.w3.org/2000/svg", "path");
      head.classList.add("arrow-head");
      head.setAttribute(
        "d",
        "M0,0 L0," + (3 * arrowWidth) + " L" +
          (2 * arrowWidth) + "," + (1.5 * arrowWidth) + " z"
      );
      marker.appendChild(head);
      defs.appendChild(marker);
      arrowCanvas.appendChild(defs);
      svgArrows.concat(vLines).forEach(av => arrowCanvas.appendChild(av));
      document.getElementById("rootBoardElement").appendChild(arrowCanvas);
    },
    mousedown: function(e) {
      if (!this.mobileBrowser && e.which != 3)
        // Cancel current drawing and circles, if any
        this.cancelResetArrows();
      if (this.mobileBrowser || e.which == 1) {
        // Mouse left button
        if (!this.start) {
          this.containerPos =
            document.getElementById("boardContainer").getBoundingClientRect();
          // NOTE: classList[0] is enough: 'piece' is the first assigned class
          const withPiece = (e.target.classList[0] == "piece");
          if (withPiece) e.preventDefault();
          // Show possible moves if current player allowed to play
          const startSquare =
            getSquareFromId(withPiece ? e.target.parentNode.id : e.target.id);
          this.possibleMoves = [];
          const color = this.analyze ? this.vr.turn : this.userColor;
          if (this.vr.canIplay(color, startSquare)) {
            // Emit the click event which could be used by some variants
            const targetId =
              (withPiece ? e.target.parentNode.id : e.target.id);
            const sq = getSquareFromId(targetId);
            this.$emit("click-square", sq);
            if (withPiece && !this.vr.onlyClick(sq)) {
              this.possibleMoves = this.vr.getPossibleMovesFrom(startSquare);
              if (this.possibleMoves.length > 0) {
                // For potential drag'n drop, remember start coordinates
                // (to center the piece on mouse cursor)
                let parent = e.target.parentNode; //surrounding square
                const rect = parent.getBoundingClientRect();
                this.start = {
                  x: rect.x + rect.width / 2,
                  y: rect.y + rect.width / 2,
                  id: parent.id
                };
                // Add the moving piece to the board, just after current image
                this.selectedPiece = e.target.cloneNode();
                Object.assign(
                  this.selectedPiece.style,
                  {
                    position: "absolute",
                    top: 0,
                    display: "inline-block",
                    zIndex: 3000
                  }
                );
                parent.insertBefore(this.selectedPiece, e.target.nextSibling);
              }
            }
          }
        }
        else this.processMoveAttempt(e);
      }
      else if (e.which == 3) {
        // Mouse right button
        e.preventDefault();
        this.containerPos =
          document.getElementById("gamePosition").getBoundingClientRect();
        let elem = e.target;
        // Next loop because of potential marks
        while (elem.tagName == "IMG") elem = elem.parentNode;
        this.startArrow = getSquareFromId(elem.id);
      }
      else e.preventDefault();
    },
    mousemove: function(e) {
      if (!this.selectedPiece && !this.startArrow) return;
      // Cancel if off boardContainer
      const [offsetX, offsetY] =
        this.mobileBrowser
          ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY]
          : [e.clientX, e.clientY];
      if (
        offsetX < this.containerPos.left ||
        offsetX > this.containerPos.right ||
        offsetY < this.containerPos.top ||
        offsetY > this.containerPos.bottom
      ) {
        if (!!this.selectedPiece) {
          this.selectedPiece.parentNode.removeChild(this.selectedPiece);
          delete this.selectedPiece;
          this.selectedPiece = null;
          this.start = null;
          this.possibleMoves = []; //in case of
          this.click = "";
          let selected = document.querySelector(".ghost");
          if (!!selected) selected.classList.remove("ghost");
        }
        else {
          this.startArrow = null;
          this.movingArrow = null;
          const currentArrow = document.getElementById("currentArrow");
          if (!!currentArrow)
            currentArrow.parentNode.removeChild(currentArrow);
        }
        return;
      }
      e.preventDefault();
      if (!!this.selectedPiece) {
        // There is an active element: move it around
        Object.assign(
          this.selectedPiece.style,
          {
            left: offsetX - this.start.x + "px",
            top: offsetY - this.start.y + "px"
          }
        );
      }
      else {
        let elem = e.target;
        // Next loop because of potential marks
        while (elem.tagName == "IMG") elem = elem.parentNode;
        // To center the arrow in square:
        const movingCoords = getSquareFromId(elem.id);
        if (
          movingCoords[0] != this.startArrow[0] ||
          movingCoords[1] != this.startArrow[1]
        ) {
          this.movingArrow = movingCoords;
          this.drawCurrentArrow();
        }
      }
    },
    mouseup: function(e) {
      if (this.mobileBrowser || e.which == 1) {
        if (!this.selectedPiece) return;
        e.preventDefault();
        // Drag'n drop. Selected piece is no longer needed:
        this.selectedPiece.parentNode.removeChild(this.selectedPiece);
        delete this.selectedPiece;
        this.selectedPiece = null;
        this.processMoveAttempt(e);
      }
      else if (e.which == 3) {
        e.preventDefault();
        if (!this.startArrow) return;
        // Mouse right button
        this.movingArrow = null;
        this.processArrowAttempt(e);
      }
    },
    // Called by BaseGame after partially undoing multi-moves:
    resetCurrentAttempt: function() {
      this.possibleMoves = [];
      this.start = null;
      this.click = "";
      this.selectedPiece = null;
    },
    processMoveAttempt: function(e) {
      // Obtain the move from start and end squares
      const [offsetX, offsetY] =
        this.mobileBrowser
          ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY]
          : [e.clientX, e.clientY];
      let landing = document.elementFromPoint(offsetX, offsetY);
      // Next condition: classList.contains(piece) fails because of marks
      while (landing.tagName == "IMG") landing = landing.parentNode;
      if (this.start.id == landing.id) {
        if (this.click == landing.id) {
          // Second click on same square: cancel current move
          this.possibleMoves = [];
          this.start = null;
          this.click = "";
        } else this.click = landing.id;
        return;
      }
      this.start = null;
      // OK: process move attempt, landing is a square node
      let endSquare = getSquareFromId(landing.id);
      let moves = this.findMatchingMoves(endSquare);
      this.possibleMoves = [];
      if (moves.length > 1) {
        this.clickTime = Date.now();
        this.choices = moves;
      } else if (moves.length == 1) this.play(moves[0]);
      // else: forbidden move attempt
    },
    processArrowAttempt: function(e) {
      // Obtain the arrow from start and end squares
      const [offsetX, offsetY] = [e.clientX, e.clientY];
      let landing = document.elementFromPoint(offsetX, offsetY);
      // Next condition: classList.contains(piece) fails because of marks
      while (landing.tagName == "IMG") landing = landing.parentNode;
      const landingCoords = getSquareFromId(landing.id);
      if (
        this.startArrow[0] == landingCoords[0] &&
        this.startArrow[1] == landingCoords[1]
      ) {
        // Draw (or erase) a circle
        this.$set(this.circles, landing.id, !this.circles[landing.id]);
      }
      else {
        // OK: add arrow, landing is a new square
        const currentArrow = document.getElementById("currentArrow");
        currentArrow.parentNode.removeChild(currentArrow);
        this.addArrow({
          start: this.startArrow,
          end: landingCoords
        });
      }
      this.startArrow = null;
    },
    findMatchingMoves: function(endSquare) {
      // Run through moves list and return the matching set (if promotions...)
      return (
        this.possibleMoves.filter(m => {
          return (endSquare[0] == m.end.x && endSquare[1] == m.end.y);
        })
      );
    },
    play: function(move) {
      this.$emit("play-move", move);
    }
  }
};
</script>

<style lang="sass">
// SVG dynamically added, so not scoped
#arrowCanvas
  pointer-events: none
  position: absolute
  top: 0
  left: 0
  width: 100%
  height: 100%

.svg-arrow
  opacity: 0.65
  stroke: #5f0e78
  fill: none
  marker-end: url(#arrow)

.svg-line
  stroke: black

.svg-diag
  stroke: grey

.arrow-head
  fill: #5f0e78
</style>

<style lang="sass" scoped>
@import "@/styles/_board_squares_img.sass"

//.game.reserve-div
  // TODO: would be cleaner to restrict width so that it doesn't overflow
  // Commented out because pieces would disappear over the board otherwise:
  //overflow: hidden
.reserve-count
  width: 100%
  text-align: center
  display: inline-block
  position: absolute
.reserve-row
  margin-bottom: 15px

.full-width
  width: 100%

.game
  user-select: none
  width: 100%
  margin: 0
  .board
    cursor: pointer

#choices
  user-select: none
  margin: 0
  position: absolute
  z-index: 300
  overflow-y: inherit
  background-color: rgba(0,0,0,0)
  img
    cursor: pointer
    background-color: #e6ee9c
    &:hover
      background-color: skyblue
    &.choice-piece
      width: 100%
      height: auto
      display: block

img.ghost
  // NOTE: no need to set z-index here, since opacity is low
  position: absolute
  opacity: 0.5
  top: 0

.incheck-light
  background-color: rgba(204, 51, 0, 0.7) !important
.incheck-dark
  background-color: rgba(204, 51, 0, 0.9) !important

// TODO: no predefined highlight colors, but layers. How?

.hover-highlight:hover
  // TODO: color dependant on board theme, or inner border...
  background-color: #C571E6 !important

.highlight
  &.light-square
    &.lichess
      background-color: #cdd26a
    &.chesscom
      background-color: #f7f783
    &.chesstempo
      background-color: #9f9fff
    &.orangecc
      background-color: #fef273
  &.dark-square
    &.lichess
      background-color: #aaa23a
    &.chesscom
      background-color: #bacb44
    &.chesstempo
      background-color: #557fff
    &.orangecc
      background-color: #e8c525
  &.middle-square
    &.lichess
      background-color: #BCBA52
    &.chesscom
      background-color: #D9E164
    &.chesstempo
      background-color: #7A8FFF
    &.orangecc
      background-color: #F3DC4C
</style>
