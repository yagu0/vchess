//TODO: list problems as FEN (quickly rendered), by date, with possible filtering per variant(?)
//click on a problem ==> land on variant page with mode==friend, FEN prefilled... ok

// get 10 first problems, and buttons next<>previous send date + "before" or "after"
// need database: sqlite !

// form "new problem" fen(position/turn/flags[guess]), instructions, solution (mandatory)
// ==> upload on server in sandbox
//
// Atomic rules, atomic game, atomic problems(list drawn position
//   + summary(first chars of instructions) + timedate)... one big Vue ? with components
//
// click on problem ==> masque problems, affiche game tab, launch new game Friend with
//   FEN + turn + flags + rappel instructions / solution on click sous l'échiquier

Vue.component('my-problems', {
	//props: ['vobj'],
	template: `
		<div class="variant col-sm-12">
			<p>Hello</p>
		</div>
	`,
})
