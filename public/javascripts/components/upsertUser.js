// Logic to login, or create / update a user (and also logout)
vv = Vue.component('my-upsert-user', {
	data: function() {
		return {
			user: user, //initialized with global user object
			nameOrEmail: "", //for login
			stage: (!user.email ? "Login" : "Update"),
			infoMsg: "",
			enterTime: Number.MAX_SAFE_INTEGER, //for a basic anti-bot strategy
		};
	},
	template: `
		<div>
			<input id="modalUser" class="modal" type="checkbox"
					@change="trySetEnterTime"/>
			<div role="dialog">
				<div class="card">
					<label class="modal-close" for="modalUser"></label>
					<h3>{{ stage }}</h3>
					<form id="userForm" @submit.prevent="onSubmit()">
						<div v-show="stage!='Login'">
							<fieldset>
								<label for="username">Name</label>
								<input id="username" type="text" v-model="user.name"/>
							</fieldset>
							<fieldset>
								<label for="useremail">Email</label>
								<input id="useremail" type="email" v-model="user.email"/>
							</fieldset>
							<fieldset>
								<label for="notifyNew">Notify new moves &amp; games</label>
								<input id="notifyNew" type="checkbox" v-model="user.notify"/>
							</fieldset>
						</div>
						<div v-show="stage=='Login'">
							<fieldset>
								<label for="nameOrEmail">Name or Email</label>
								<input id="nameOrEmail" type="text" v-model="nameOrEmail"/>
							</fieldset>
						</div>
					</form>
					<div class="button-group">
						<button id="submit" @click="onSubmit()">
							<span>{{ submitMessage }}</span>
							<i class="material-icons">send</i>
						</button>
						<button v-if="stage!='Update'" @click="toggleStage()">
							<span>{{ stage=="Login" ? "Register" : "Login" }}</span>
						</button>
						<button v-if="stage=='Update'" onClick="location.replace('/logout')">
							<span>Logout</span>
						</button>
					</div>
					<div id="dialog" :style="{display: displayInfo}">{{ infoMsg }}</div>
				</div>
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
		trySetEnterTime: function(event) {
			if (!!event.target.checked)
				this.enterTime = Date.now();
		},
		toggleStage: function() {
			// Loop login <--> register (update is for logged-in users)
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
		onSubmit: function() {
			// Basic anti-bot strategy:
			const exitTime = Date.now();
			if (this.stage == "Register" && exitTime - this.enterTime < 5000)
				return; //silently return, in (curious) case of it was legitimate
			let error = undefined;
			if (this.stage == 'Login')
			{
				const type = (this.nameOrEmail.indexOf('@') >= 0 ? "email" : "name");
				error = checkNameEmail({[type]: this.nameOrEmail});
			}
			else
				error = checkNameEmail(this.user);
			if (!!error)
				return alert(error);
			this.infoMsg = "Processing... Please wait";
			ajax(this.ajaxUrl(), this.ajaxMethod(),
				this.stage == "Login" ? { nameOrEmail: this.nameOrEmail } : this.user,
				res => {
					this.infoMsg = this.infoMessage();
					if (this.stage != "Update")
					{
						this.nameOrEmail = "";
						this.user["email"] = "";
						this.user["name"] = "";
					}
					setTimeout(() => {
						this.infoMsg = "";
						if (this.stage == "Register")
							this.stage = "Login";
						document.getElementById("modalUser").checked = false;
					}, 2000);
				},
				err => {
					this.infoMsg = "";
					alert(err);
				}
			);
		},
	}
});
