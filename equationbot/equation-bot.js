'use strict';

const typesetter = require('./typesetter');
const TelegramBot = require('node-telegram-bot-api');

const PNG_FILEOPTIONS = {
    filename: 'tex.png',
    contentType: 'image/png'
};
const SAMPLE_MESSAGE_TEXT = 'Try sending some LaTeX, like `\/typeset \\\\pi \\\\approx 3`\\. I\'ll respond back with the image\\.\nI can also do chemical equations\\. Try `\/typeset \\\\ce{2H2 + O2 -> 2H2O}`\\!';
const STARTTEXT = 'To get started, send in /typeset with some LaTeX\\.\nFor an example, hit /help\\.'
const EMPTY_TEXT = 'You entered /typeset but didn\'t provide anything to convert. Hit /help for some sample inputs';
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
        this.replyWithFixedText(/\/start(?:@[A-Za-z]+|)/, STARTTEXT);
        this.replyWithFixedText(/\/help(?:@[A-Za-z]+|)/, SAMPLE_MESSAGE_TEXT);

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
     * @param {object} message
     */
    defaultAction(message) {
        if (message.chat && message.chat.id) {
            return this.bot.sendMessage(message.chat.id, DEFAULT_TEXT);
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
        // If no update, or update is non-text message (eg group update), don't do anything
        if (!update || !update.message || !update.message.text) return Promise.resolve();
        this.bot.processUpdate(update);
        if (this.tasks.length == 0) {
            this.tasks.push(this.defaultAction(update.message));
        }
        return Promise.all(this.tasks);
    }

    /**
     * Configure Telegram bot to reply with a fixed message
     * @param {RegExp} re
     * @param {String} text 
     */
    replyWithFixedText(re, text) {
        return this.bot.onText(re, (msg) =>
            this.tasks.push(this.bot.sendMessage(msg.chat.id, text, { parse_mode: 'MarkdownV2' })));
    }
}

module.exports = { EquationTypesetterBot };
