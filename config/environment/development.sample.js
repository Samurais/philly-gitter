/**
 * [config description]
 * @type {Object}
 */

var config = {
    "githubId": "Functional-Account",
    "user": {
        "botname": "Functional-Account",
        "appHost": "http://localhost:7000",
        "apiServer": "www.freecodecamp.com",
        "appRedirectUrl": "http://localhost:7891/login/callback"
    },
    "rooms": [{
        "title": "bothelp",
        "name": "imrockq/philly",
        "icon": "question",
        "topics": [
            "chitchat",
            "bots",
            "bot-development",
            "camperbot"
        ]
    }]
}

exports = module.exports = config;
