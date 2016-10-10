'use strict';

var GBot = require('./services/gbot.service');
const parseproxy = require('parseproxy'),
    config = require('./config/environment'),
    co = require('co'),
    debug = require('debug')('gbot');

/** init parse sdk */
parseproxy.init(config.parse.serverURL, config.parse.appId, config.parse.javascriptKey);

/**
 * main entry
 */
var gbot = new GBot();

gbot.init({
    onMessage: function(message) {
        co(function*() {
            let messageInboundData = {
                fromUserId: message.model.fromUser.username,
                fromGroupId: message.room.url,
                channel: 'gitter',
                type: 'textMessage',
                textMessage: message.model.text
            };
            debug('>> messageInboundData', JSON.stringify(messageInboundData));
            yield parseproxy.createMessageInbound(messageInboundData);
        });
    }
});


/** register handler onCreate event. */
parseproxy.subscribeMessageOutbound({
    onCreate: co.wrap(function*(messageOutbound) {
        debug('messageOutboundData', JSON.stringify(messageOutbound));
        let messageInbound = yield messageOutbound.get('replyToInboundMessage').fetch();
        try {
            debug('messageOutboundResponse', messageOutbound.get('textMessage'));
            gbot.sayToRoomByUrl(messageOutbound.get('textMessage'), messageInbound.get('fromGroupId'));
        } catch (e) {
            console.error(e);
        }
    })
}, [{
    ref: 'equalTo',
    key: 'channel',
    value: 'gitter'
}]);
