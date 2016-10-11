'use strict';

/**
 * Gitter Bot 
 */

const AppConfig = require('../config/environment'),
    Utils = require('../utils/Utils'),
    Gitter = require('node-gitter'),
    GitterApiClient = require('./gitter.proxy.js');

let apiWait = 0;
let apiDelay = 1000;


function clog(msg, obj) {
    Utils.clog('GBot>', msg, obj);
}

var GBot = function() {

}

GBot.prototype.init = function(options) {
    // TODO refresh and add oneToOne rooms
    this.roomList = [];
    this.listReplyOptions = [];
    this.handleMessage = options.onMessage || console.log;
    this.gitter = new Gitter(AppConfig.token);
    this.joinKnownRooms();

    // listen to other rooms for 1:1
    if (AppConfig.supportDmRooms) {
        this.gitter.currentUser().then(user => {
            this.scanRooms(user, AppConfig.token);
        }, err => {
            Utils.error('GBot.currentUser>', 'failed', err);
        });
    }
}

GBot.prototype.getName = function() {
    return AppConfig.botlist[0];
}

/**
 * listen to a known room
 * @param  {[type]} room [description]
 * @return {[type]}      [description]
 */
GBot.prototype.listenToRoom = function(room) {

    // does a check to see if not already joined according to internal data
    if (this.addToRoomList(room) === false) {
        return;
    }

    const chats = room.streaming().chatMessages();

    // The 'chatMessages' event is emitted on each new message
    chats.on('chatMessages', message => {
        if (message.operation !== 'create') {
            return;
        }
        if (this.isBot(message.model.fromUser.username)) {
            return;
        }

        message.room = room;
        this.handleMessage(message);
    });
}

GBot.prototype.handleReply = function(message) {
    clog(message.room.uri + ' @' + message.model.fromUser.username + ':');
    clog(' in|', message.model.text);
    const output = 'happen';
    // const output = this.findAnyReply(message);
    if (output) {
        clog('out|', output);
        this.say(output, message.room);
    }
    return output;
}

/**
 * using a callback to get roomId
 * @param  {[type]} text    [description]
 * @param  {[type]} roomUrl [description]
 * @return {[type]}         [description]
 */
GBot.prototype.sayToRoomByUrl = function(text, roomUrl) {
    let room = this.getRoomByUrl(roomUrl);
    this.say(text, room);
}

GBot.prototype.say = function(text, room) {
    // did we get a room
    Utils.hasProperty(room, 'path', 'expected room object');
    if (!text) {
        console.warn('tried to say with no text');
    }
    try {
        GitterApiClient.sayToRoomName(text, room.uri);
    } catch (err) {
        Utils.warn('GBot.say>', 'failed', err);
        Utils.warn('GBot.say>', 'room', room);
    }
}

// checks if joined already, otherwise adds
GBot.prototype.addToRoomList = function(room) {
    // check for dupes
    this.roomList = this.roomList || [];
    if (this.hasAlreadyJoined(room, this.roomList)) {
        return false;
    }

    this.roomList.push(room);
    return true;
}

/**
 * [getRoomByUri description]
 * @param  {[type]} roomUrl [description]
 * @return {[type]}         [description]
 */
GBot.prototype.getRoomByUrl = function(roomUrl) {
    const checks = this.roomList.filter(rm => {
        let result = (('/' + rm.uri) === roomUrl);
        return result;
    });

    const oneRoom = checks[0];
    if (!oneRoom) {
        Utils.warn('GBot', 'Not found room:', roomUrl);
        return false;
    }

    return oneRoom;
}

// checks if a room is already in bots internal list of joined rooms
// this is to avoid listening twice
// see https://github.com/gitterHQ/node-gitter/issues/15
// note this is only the bots internal tracking
// it has no concept if the gitter API/state already thinks
// you're joined/listening
GBot.prototype.hasAlreadyJoined = function(room) {
    const checks = this.roomList.filter(rm => {
        return (rm.name === room.name);
    });

    const oneRoom = checks[0];
    if (oneRoom) {
        Utils.warn('GBot', 'hasAlreadyJoined:', oneRoom.url);
        return true;
    }

    return false;
}

GBot.prototype.getAnnounceMessage = function() {
    return '';
}

// dont reply to bots or you'll get a feedback loop
GBot.prototype.isBot = function(who) {
    // 'of' IS correct even tho ES6Lint doesn't get it
    for (let bot of AppConfig.botlist) {
        if (who === bot) {
            return true;
        }
    }
    return false;
}

// this joins rooms contained in the data/RoomData.js file
// ie a set of bot specific discussion rooms
GBot.prototype.joinKnownRooms = function() {
    clog('botname on rooms', AppConfig.getBotName());

    AppConfig.rooms.map(oneRoomData => {
        const roomUrl = oneRoomData.name;
        this.delayedJoin(roomUrl);
    });
}

GBot.prototype.delayedJoin = function(roomUrl) {
    apiWait += apiDelay;
    setTimeout(() => {
        this.gitter.rooms.join(roomUrl, (err, room) => {
            if (err) {
                Utils.warn('Not possible to join the room:', roomUrl, err);
                return;
            }
            clog('joined> ', room.name);
            this.listenToRoom(room);
        });
    }, apiWait);
}

// uses gitter helper to fetch the list of rooms this user is 'in'
// and then tries to listen to them
// this is mainly to pick up new oneOnOne conversations
// when a user DMs the bot
// as I can't see an event the bot would get to know about that
// so its kind of like 'polling' and currently only called from the webUI
GBot.prototype.scanRooms = function(user, token) {
    clog('user', user);
    clog('token', token);
    GitterApiClient.fetchRooms(user, token, (err, rooms) => {
        if (err) {
            Utils.warn('GBot', 'fetchRooms', err);
        }
        if (!rooms) {
            Utils.warn('cant scanRooms');
            return;
        }
        clog('scanRooms.rooms', rooms);
        rooms.map(room => {
            if (room.oneToOne) {
                clog('oneToOne', room.name);
                this.gitter.rooms.find(room.id)
                    .then(roomObj => {
                        this.listenToRoom(roomObj);
                    });
            }
        });
    });
}

// TODO - FIXME doesnt work for some reason >.<
// needs different type of token?
GBot.prototype.updateRooms = function() {
    this.gitter.currentUser()
        .then(user => {
            const list = user.rooms((err, obj) => {
                clog('rooms', err, obj);
            });
            clog('user', user);
            clog('list', list);
            return list;
        });
}

exports = module.exports = GBot;
