'use strict';

const equationbot = require('./equation-bot');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

exports.lambdaHandler = async (event) => {
    return new Promise((resolve) => {
        const bot = new equationbot.EquationTypesetterBot(TELEGRAM_TOKEN);
        try {
            const update = JSON.parse(event.body);
            console.log(update);
            bot.process(update).then(() => { resolve({ statusCode: 200, body: 'OK' }); });
        } catch (err) {
            console.error(err);
            resolve({ statusCode: 400, body: 'NOT OK' });
        }
    });
};
