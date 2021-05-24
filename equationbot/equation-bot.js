'use strict';

const typesetter = require('./typesetter');
const TelegramBot = require('node-telegram-bot-api');

const PNG_FILEOPTIONS = {
    filename: 'tex.png',
    contentType: 'image/png'
};
const SAMPLE_MESSAGE = '/typeset \\mathbf{e}^{i \\pi} + 1 = 0';
const SAMPLE_MESSAGE_TEXT = 'As an example, copy the next message I send and send it back to me';
const HELPTEXT = 'I can send you back a rendered version of a LaTeX equation that you send.\nHit /sample for a sample input';
const EMPTY_TEXT = 'You entered /typeset but didn\'t provide anything to convert. Hit /sample for a sample input';


/**
 * Configure Telegram bot to reply with a fixed message
 * @param {TelegramBot} bot 
 * @param {RegExp} re
 * @param {String} text 
 * @param callback 
 */
function replyWithFixedText(bot, re, text, callback) {
    bot.onText(re, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, text).then(callback);
    });
}


/**
 * Create Telegram Bot API
 * @param {String} token The Telegram Token for your bot.
 * @param {*} callback What to do after the event is over
 */
function createBot(token, callback) {
    const bot = new TelegramBot(token);

    bot.onText(/\/typeset(?:@[A-Za-z]+|)(.*)/, (msg, match) => {
        const chatId = msg.chat.id;
        const texInput = match[1].trim();
        if (!texInput) {
            bot.sendMessage(chatId, EMPTY_TEXT).then(callback);
            return;
        }
        bot.sendChatAction(chatId, 'upload_photo')
            .then(() => typesetter.typeset(texInput))
            .then(buf => {
                if (buf.systemErrors) { return bot.sendMessage(chatId, 'System error. Sorry!'); }
                if (buf.mathJaxErrors) { return bot.sendMessage(chatId, 'Got a MathJax Error converting your input!: ' + buf.mathJaxErrors.join(' ')); }
                return bot.sendPhoto(chatId, buf.pngBuffer, {}, PNG_FILEOPTIONS);
            })
            .then(callback);
    });

    bot.onText(/\/sample(?:@[A-Za-z]+|)/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, SAMPLE_MESSAGE_TEXT)
            .then(bot.sendMessage(chatId, SAMPLE_MESSAGE))
            .then(callback);
    });

    replyWithFixedText(bot, /\/help(?:@[A-Za-z]+|)/, HELPTEXT, callback);
    replyWithFixedText(bot, /\/start(?:@[A-Za-z]+|)/, HELPTEXT, callback);

    return bot;
}

module.exports = { createBot };
