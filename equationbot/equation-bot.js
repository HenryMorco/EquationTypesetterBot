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
const DEFAULT_TEXT = 'I didn\'t quite understand that. Please hit /help for directions.';

class EquationTypesetterBot {

    /**
     * Constructor.
     * @param {String} token 
     */
    constructor(token) {
        this.bot = new TelegramBot(token);
        this.tasks = [];
        this.configure();
    }

    /**
     * Configures TelegramBot, adding hooks
     * @param {TelegramBot} bot 
     */
    configure() {
        this.replyWithFixedText(/\/help(?:@[A-Za-z]+|)/, HELPTEXT);
        this.replyWithFixedText(/\/start(?:@[A-Za-z]+|)/, HELPTEXT);

        this.bot.onText(/\/sample(?:@[A-Za-z]+|)/, (msg) => {
            const chatId = msg.chat.id;
            this.tasks.push(this.bot.sendMessage(chatId, SAMPLE_MESSAGE_TEXT)
                .then(this.bot.sendMessage(chatId, SAMPLE_MESSAGE)));
        });

        this.bot.onText(/\/typeset(?:@[A-Za-z]+|)(.*)/, (msg, match) => {
            const chatId = msg.chat.id;
            const texInput = match[1].trim();
            if (!texInput) {
                this.tasks.push(this.bot.sendMessage(chatId, EMPTY_TEXT));
                return;
            }
            this.tasks.push(this.bot.sendChatAction(chatId, 'upload_photo')
                .then(() => typesetter.typeset(texInput))
                .then(buf => {
                    if (buf.systemErrors) { return this.bot.sendMessage(chatId, 'System error. Sorry!'); }
                    if (buf.mathJaxErrors) { return this.bot.sendMessage(chatId, 'Got a MathJax Error converting your input!: ' + buf.mathJaxErrors.join(' ')); }
                    return this.bot.sendPhoto(chatId, buf.pngBuffer, {}, PNG_FILEOPTIONS);
                }));
        });
    }

    /**
     * Invoke default action.
     * @param {object} update 
     */
    defaultAction(update) {
        if (update && update.message && update.message.chat && update.message.chat.id) {
            return this.bot.sendMessage(update.message.chat.id, DEFAULT_TEXT);
        } else {
            console.log('DefaultAction: Couldnt find chat ID to reply to');
            return Promise.resolve(true);
        }
    }

    /**
     * Entry point for the class. Takes in update from API
     * @param {object} update 
     * @returns {Promise<any>} Promise concluding when all done for this update.
     */
    process(update) {
        this.bot.processUpdate(update);
        if (this.tasks.length == 0) {
            this.tasks.push(this.defaultAction(update));
        }
        return Promise.all(this.tasks);
    }

    /**
     * Configure Telegram bot to reply with a fixed message
     * @param {RegExp} re
     * @param {String} text 
     */
    replyWithFixedText(re, text) {
        return this.bot.onText(re, (msg) => this.tasks.push(this.bot.sendMessage(msg.chat.id, text)));
    }
}

module.exports = { EquationTypesetterBot };
