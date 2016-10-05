# philly-gitter
Bridge Application, Gitter <=> Philly.

Thanks to [camperbot](https://github.com/FreeCodeCamp/camperbot).

## Make your own bot user
If you've followed the instructions so far your bot instance is the demobot
provided for you.

The `dot.env` file you copied above contains login info.
This is using the shared "demobot" account so you may find yourself in a
chatroom with other people using the same ID!

Here are instructions on getting your own bot user running.
### Setup GitHub user
The first thing you'll want to do is set up a GitHub account which will be the
username of your bot

You can either
* make a new account
* use an existing account

Follow the instructions for signing up on [https://github.com/](GitHub)

change the `SERVER_ENV=demobot` in your `dot.env` to `server_ENV=USERNAMEHERE`
where *USERNAMEHERE* is your github user name.

### Getting your own appID

To setup your own gitter login info, you should create your own Gitter API key
on their developer site, and replace the info in that `.env` file.
Get your own API keys for gitter from:
[https://developer.gitter.im/apps](https://developer.gitter.im/apps)

When you sign in to the developer page select the option to make an app.
Name the app what you want and set the callback url to
`http://localhost:7891/login/callback`

The next page should show you various API keys/secrets. Use those to replace
the demobot default options in your `dot.env`.

### Configure your bot
Now it is time to set up your bot w/ the app.
Copy `example.config.json` to `config.json` and open `config.json` in your
editor.
Replace all instances of GITHUB_USER_ID with your user name
set up earlier.

Take note of the the rooms property of config. You can set up additional gitter rooms
to connect your bot to here. The default room is `GITHUB_USERID/test` feel free to change this.
