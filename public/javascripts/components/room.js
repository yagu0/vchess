// TODO: main playing hall, chat + online players + current challenges + button "new game"
/*
input#modal-newgame.modal(type="checkbox")
div(role="dialog" aria-labelledby="newGameTxt")
	.card.smallpad.small-modal
		label#close-newgame.modal-close(for="modal-newgame")
		h3#newGameTxt= translations["New game"]
		p= translations["Waiting for opponent..."]
*/

/*
Players + challenges : == "room" home of variant (surligner si nouveau défi perso et pas affichage courant)
joueurs en ligne (dte),
Nouvelle partie + défis en temps réel + parties en cours (milieu, tabs),
chat général (gauche, activé ou non (bool global storage)).
(cadences base + incrément, corr == incr >= 1jour ou base >= 7j)
--> correspondance: stocker sur serveur lastMove + peerId + color + movesCount + gameId + variant + timeleft
quand je poste un lastMove corr, supprimer mon ancien lastMove le cas échéant (tlm l'a eu)
fin de partie corr: garder maxi nbPlayers lastMove sur serveur, pendant 7 jours (arbitraire)
*/
