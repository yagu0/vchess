// Logic to login, or create / update a user (and also logout)
Vue.component('my-upsert-user', {
	props: ["initUser"], //to find the game in storage (assumption: it exists)
	data: function() {
		return {
			user: initUser, //initialized with prop value
			stage: (!initUser.email ? "Login" : "Update"),
			infoMsg: "",
		};
	},
	template: `
		<div>
			<input id="modalUser" class="modal" type="checkbox"/>
			<div role="dialog">
				<div class="card">
					<label class="modal-close" for="modalUser">
					<h3>{{ stage }}</h3>
					<form id="userForm" @submit.prevent="submit">
						<fieldset>
							<label for="useremail">Email</label>
							<input id="useremail" type="email" v-model="user.email"/>
						<fieldset>
							<label for="username">Name</label>
							<input id="username" type="text" v-model="user.name"/>
						</fieldset>
						<fieldset>
							<label for="notifyNew">Notify new moves &amp; games</label>
							<input id="notifyNew" type="checkbox" v-model="user.notify"/>
						<button id="submit" @click.prevent="submit">
							<span>{{ submitMessage }}</span>
							<i class="material-icons">send</i>
				<p v-if="stage!='Update'">
					<button @click.prevent="toggleStage()">
						<span>{{ stage=="Login" ? "Register" : "Login" }}</span>
					</button>
					<button>Logout</button>
				</p>
				<div id="dialog" :style="{display: displayInfo}">{{ infoMsg }}</div>
			</div>
		</div>
	`,
	computed: {
		submitMessage: function() {
			switch (this.stage)
			{
				case "Login":
					return "Go";
				case "Register":
					return "Send";
				case "Update":
					return "Apply";
			}
		},
		displayInfo: function() {
			return (this.infoMsg.length > 0 ? "block" : "none");
		},
	},
	methods: {
		toggleStage: function() {
			this.stage = (this.stage == "Login" ? "Register" : "Login");
		},
		ajaxUrl: function() {
			switch (this.stage)
			{
				case "Login":
					return "/sendtoken";
				case "Register":
					return "/register";
				case "Update":
					return "/update";
			}
		},
		ajaxMethod: function() {
			switch (this.stage)
			{
				case "Login":
					return "GET";
				case "Register":
					return "POST";
				case "Update":
					return "PUT";
			}
		},
		infoMessage: function() {
			switch (this.stage)
			{
				case "Login":
					return "Connection token sent. Check your emails!";
				case "Register":
					return "Registration complete! Please check your emails.";
				case "Update":
					return "Modifications applied!";
			}
		},
		submit: function() {
			// TODO: re-activate simple measures like this: (using time of click on modal)
//			const exitTime = new Date();
//			if (this.stage=="Register" && exitTime.getTime() - enterTime.getTime() < 5000)
//				return;
			if (!this.user.name.match(/[a-z0-9_]+/i))
				return alert("User name: only alphanumerics and underscore");
			this.infoMsg = "Processing... Please wait";
			ajax(this.ajaxUrl(), this.ajaxMethod(),
				this.stage == "Login" ? "PUT" : "POST", this.user,
				res => {
					this.infoMsg = this.infoMessage();
					if (this.stage != "Update")
					{
						this.user["email"] = "";
						this.user["name"] = "";
					}
					setTimeout(() => {
						this.infoMsg = "";
						document.getElementById("modalUser").checked = false;
					}, 2000);
				}
			);
		},
	}
});
