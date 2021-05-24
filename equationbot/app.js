const equationbot = require('./equation-bot');

exports.lambdaHandler = async (event) => {
    return new Promise((resolve) => {
        const equationBot = equationbot.createBot(() => resolve({ statusCode: 200, body: 'OK' }));
        try {
            const eventBody = JSON.parse(event.body);
            console.log('Incoming event --', eventBody);
            equationBot.processUpdate(eventBody);
        } catch (err) {
            console.error(err);
            resolve({ statusCode: 400, body: 'NOT OK' });
        }
    });
};
