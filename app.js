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
                // Currently, only send/reply with room
                // so, regard each room as a user
                fromUserId: message.model.fromUser.username,
                // fromUserId: message.room.url,
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
        let messageInbound;
        if (messageOutbound.get('replyToInboundMessage'))
            messageInbound = yield messageOutbound.get('replyToInboundMessage').fetch();
        try {
            if (messageInbound) {
                debug('messageOutboundResponse', messageOutbound.get('textMessage'));
                gbot.sayToRoomByUrl(messageOutbound.get('textMessage'), messageInbound.get('fromGroupId'));
            } else if (messageOutbound.get('toUserId') === 'Samurais') {
                console.log('say to Samurais >>', messageOutbound.get('textMessage'));
                gbot.sayToRoomByUrl(messageOutbound.get('textMessage'), '/imrockq/philly');
            }
        } catch (e) {
            console.error(e);
        }
    })
}, [{
    ref: 'equalTo',
    key: 'channel',
    val: 'gitter'
}]);
