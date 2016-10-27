'use strict';

const _ = require('lodash'),
    path = require('path');

var env = process.env.NODE_ENV || 'development';


console.log('NODE_ENV', env);
env = env.toLowerCase();
const config = require('./' + env + '.js') || {};

const AppConfig = {
    env: process.env.NODE_ENV,
    root: path.normalize(__dirname + '/../..'),
    clientId: process.env.GITTER_APP_KEY,
    token: config.gitterUserToken,
    supportDmRooms: false,
    botname: 'philly',
    roomId: '55b1a9030fc9f982beaac901',
    rooms: [],
    fallbackRoom: '',
    org: 'bothelp',
    testUser: 'bothelp',
    // so bot doesnt get in a loop replying itself
    botlist: ['bothelp', 'camperbot', 'demobot', config.githubId],
    webuser: 'webuser',
    gitterHost: 'https://gitter.im/',
    botVersion: '0.0.12',
    botNoiseLevel: 1,
    serverEnv: config.serverEnv || "Functional-Account",
    gitterUserToken: config.gitterUserToken || "",
    gitterAppKey: config.gitterAppKey || "",
    gitterAppSecret: config.gitterAppSecret || "",
    logLevel: 10,

    showConfig: function () {
        console.log('AppConfig');
        Object.keys(AppConfig)
            .sort()
            .forEach(v => {
                if (typeof AppConfig[v] !== 'function') {
                    console.log('\t', v, ':\t\t', AppConfig[v]);
                }
            });
    },

    warn: function (msg, obj) {
        console.warn('WARN> AppConfig', msg, obj);
    },

    // TODO cleanup
    // use as a function so it can be set at startup
    // before other code calls it at runtime
    getBotName: function () {
        if (!AppConfig.botname) {
            this.warn('getBotName()', AppConfig.botname);
            console.log('tried to call botname before it was set');
        }
        return AppConfig.botname;
    },

    who: function (req) {
        let who;

        if (req.user) {
            console.warn('got a user in the request but ignoring');
        } else if (req.who) {
            who = req.who;
        } else {
            who = AppConfig.webuser;
        }
        return who;
    },

    // TODO read from config file for dev/live modes and running env
    getOrg: function () {
        return AppConfig.org;
    },

    topicDmUri: function (topic) {
        let uri = AppConfig.appHost + '/go?dm=y&room=' + AppConfig.getBotName();
        if (topic) {
            uri += '&topic=' + topic;
        }
        return uri;
    },

    dmLink: function () {
        return 'https://gitter.im/' + AppConfig.getBotName();
    },
    parse: {

    },
    superscript: {
        botId: 'default'
    }
};

module.exports = _.assign(AppConfig, config);
