// TODO:
//à l'arrivée sur le site : set peerID (un identifiant unique en tout cas...) si pas trouvé
//
//TODO: si une partie en cours dans storage, rediriger vers cette partie
//(à condition que l'URL n'y corresponde pas déjà !)


	created
	script.
		const variant = !{JSON.stringify(variant)};
		// Just 'V' because this variable is often used:
		const V = eval(variant.name + "Rules");


mounted: function() {
	feather.replace();
}
