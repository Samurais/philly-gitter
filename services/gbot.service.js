'use strict';

/**
 * Gitter Bot 
 */

const AppConfig = require('../config/environment'),
    Utils = require('../utils/Utils'),
    Gitter = require('node-gitter'),
    GitterApiClient = require('./gitter.proxy.js'),
    logger = require('./logging').getLogger('gbot.service');

let apiWait = 0;
let apiDelay = 1000;


var GBot = function() {

}

GBot.prototype.init = function(options) {
    // TODO refresh and add oneToOne rooms
    this.roomList = [];
    this.listReplyOptions = [];
    if (options && options.onMessage) {
        this.handleMessage = options.onMessage;
    } else {
        this.handleMessage = console.log;
    }
    this.gitter = new Gitter(AppConfig.token);
    this.joinKnownRooms();

    // listen to other rooms for 1:1
    if (AppConfig.supportDmRooms) {
        this.gitter.currentUser().then(user => {
            this.scanRooms(user, AppConfig.token);
        }, err => {
            logger.error('GBot.currentUser>', 'failed', err);
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
        logger.warn('chats.onMessage', message);

        this.handleMessage(message);
    });
}

GBot.prototype.handleReply = function(message) {
    logger.info(message.room.uri + ' @' + message.model.fromUser.username + ':');
    logger.info(' in|', message.model.text);
    const output = 'happen';
    // const output = this.findAnyReply(message);
    if (output) {
        logger.info('out|', output);
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
        logger.warn('failed', err);
        logger.warn('room', room);
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
        logger.warn('GBot', 'Not found room:', roomUrl);
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
        logger.warn('GBot', 'hasAlreadyJoined:', oneRoom.url);
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
    logger.info('botname on rooms', AppConfig.getBotName());

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
                logger.warn('Not possible to join the room:', roomUrl, err);
                return;
            }
            logger.info('joined> ', room.name);
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
    logger.info('user', user);
    logger.info('token', token);
    GitterApiClient.fetchRooms(user, token, (err, rooms) => {
        if (err) {
            logger.warn('GBot', 'fetchRooms', err);
        }
        if (!rooms) {
            logger.warn('cant scanRooms');
            return;
        }
        logger.info('scanRooms.rooms', rooms);
        rooms.map(room => {
            if (room.oneToOne) {
                logger.info('oneToOne', room.name);
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
                logger.info('rooms', err, obj);
            });
            logger.info('user', user);
            logger.info('list', list);
            return list;
        });
}

exports = module.exports = GBot;
