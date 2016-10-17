'use strict';

var GBot = require('./services/gbot.service');
const parseproxy = require('parseproxy'),
    config = require('./config/environment'),
    co = require('co'),
    logger = require('./services/logging').getLogger('app');

/** init parse sdk */
logger.info('parse.url', config.parse.serverURL);
logger.info('parse.appid', config.parse.appId);
logger.info('parse.javascriptKey', config.parse.javascriptKey);
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
                let messageInbound = yield parseproxy.createMessageInbound(messageInboundData);
                logger.debug('>> messageInboundData', messageInbound.toJSON());
            })
            .catch(function(e) {
                logger.error(e);
            });
    }
});

// gbot.init();


/** register handler onCreate event. */
parseproxy.subscribeMessageOutbound({
    onCreate: co.wrap(function*(messageOutbound) {
        logger.debug('messageOutboundData', JSON.stringify(messageOutbound));
        let messageInbound;
        if (messageOutbound.get('replyToInboundMessage'))
            messageInbound = yield messageOutbound.get('replyToInboundMessage').fetch();
        try {
            if (messageInbound) {
                logger.debug('messageOutboundResponse', messageOutbound.get('textMessage'));
                logger.debug('messageOutboundResponse fromGroupId', messageInbound.get('fromGroupId') || 'None.');
                gbot.sayToRoomByUrl(messageOutbound.get('textMessage'), messageInbound.get('fromGroupId') || config.fallbackRoom);
            } else if (messageOutbound.get('toUserId') === 'Samurais') {
                logger.info('say to Samurais >>', messageOutbound.get('textMessage'));
                gbot.sayToRoomByUrl(messageOutbound.get('textMessage'), config.fallbackRoom);
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
