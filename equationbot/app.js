const cpPromise = require('child-process-promise');
const mjApi = require('mathjax-node');
const TelegramBot = require('node-telegram-bot-api');
const uuid = require('uuid');

const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');

const writeFilePromise = util.promisify(fs.writeFile);
const readFilePromise = util.promisify(fs.readFile);

const EX_TO_PX_SCALE = parseInt(process.env.EX_TO_PX_SCALE);
const RSVGCONVERT_PATH = process.env.RSVGCONVERT_PATH;
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

function svgToPng(svgText, height) {
    const fileName = path.join(os.tmpdir(), uuid.v4());
    const svgPath = fileName + '.svg';
    const pngPath = fileName + '.png';
    return writeFilePromise(svgPath, svgText, 'utf-8')
        .then(() => cpPromise.spawn(RSVGCONVERT_PATH, [svgPath, '-h', Math.round(EX_TO_PX_SCALE * height), '-o', pngPath])
            .then(() => {
                const output = {
                    svgLocation: svgPath,
                    pngLocation: pngPath
                };
                console.log(output);
                return output;
            }))
        .catch(err => console.log(err));
}

function typeset(texInput) {
    return new Promise((resolve, reject) => {
        const mjConfig = {
            math: texInput,
            format: "TeX",
            svg: true
        };
        mjApi.typeset(mjConfig, data => {
            if (data.errors) { reject({ errors: data.errors }); }
            const heightInEx = parseFloat(data.height.substring(0, data.height.length - 2));
            resolve(svgToPng(data.svg, heightInEx));
        });
    });
}

function sendPng(pngFilePath, chatId) {
    return readFilePromise(pngFilePath).then(data =>
        bot.sendPhoto(chatId, data, {}, {
            filename: 'tex.png',
            contentType: 'image/png'
        }));
}

function runTypeSetter(texInput, chatId) {
    mjApi.config({ MathJax: {} });
    mjApi.start();
    return typeset(texInput).then(
        output => sendPng(output.pngLocation, chatId).then(() => {
            // Clean up
            fs.unlink(output.svgLocation, () => { });
            fs.unlink(output.pngLocation, () => { });
        }),
        err => { bot.sendMessage(chatId, 'Errors! ' + err.errors.join(';')); })
        .catch((error) => {
            console.log(error.code);
            console.log(error.response.body);
        });
}

exports.lambdaHandler = async (event) => {
    return new Promise((resolve) => {
        const resolveOK = () => resolve({
            statusCode: 200,
            body: "OK"
        });
        const resolveNotOK = () => resolve({
            statusCode: 400,
            body: "INVALID INPUT",
        });
        try {
            const eventBody = JSON.parse(event.body);
            const chatId = eventBody.message.chat;
            const messageText = eventBody.message.text.trim();
            if (messageText.startsWith('/typeset')) {
                runTypeSetter(messageText.substring(9), chatId).then(resolveOK);
            } else {
                bot.sendMessage("I don't understand").then(resolveOK);
            }
        } catch (err) {
            console.error(err);
            resolveNotOK();
        }
    });
};
