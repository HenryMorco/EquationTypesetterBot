'use strict';

const equationbot = require('./equation-bot');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

exports.lambdaHandler = async (event) => {
    return new Promise((resolve) => {
        const equationBot = equationbot.createBot(TELEGRAM_TOKEN, () => resolve({ statusCode: 200, body: 'OK' }));
        try {
            const eventBody = JSON.parse(event.body);
            equationBot.processUpdate(eventBody);
        } catch (err) {
            console.error(err);
            resolve({ statusCode: 400, body: 'NOT OK' });
        }
    });
};
