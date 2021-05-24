'use strict';

const childProcess = require('child_process');
const mjApi = require('mathjax-node');
const uuid = require('uuid');

const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');

const writeFilePromise = util.promisify(fs.writeFile);
const readFilePromise = util.promisify(fs.readFile);
const exec = util.promisify(childProcess.exec);
const unlinkFilePromise = util.promisify(fs.unlink);

const EX_TO_PX_SCALE = parseInt(process.env.EX_TO_PX_SCALE) || 40;
const RSVGCONVERT_PATH = process.env.RSVGCONVERT_PATH || 'rsvg-convert';


/**
 * Silently unlinks a file, promisified
 * 
 * @param {String} filePath 
 */
function cleanUnlink(filePath) {
    return unlinkFilePromise(filePath)
        .catch(err =>
            (err && err.code == 'ENOENT') ?
                console.log(`File ${filePath} doesn't exist`) :
                console.error(`Error unlinking ${filePath}`, err));
}


/**
 * Converts SVG text and height in ex to PNG image using rsvg-convert CLI tool.
 * Saves SVG into a temp file, generates PNG, and deletes both whilst keeping
 * PNG file data as a Buffer.
 * 
 * @param {String} svgText 
 * @param {Number} heightEx 
 */
function convertSVGToPNG(svgText, heightEx) {
    const fileName = path.join(os.tmpdir(), uuid.v4());
    const svgPath = fileName + '.svg';
    const pngPath = fileName + '.png';
    const command = `${RSVGCONVERT_PATH} ${svgPath} -h ${Math.round(EX_TO_PX_SCALE * heightEx)} -o ${pngPath}`;
    console.log('Convert command is', command);
    return writeFilePromise(svgPath, svgText, 'utf-8')
        .then(() => exec(command))
        .then(() => readFilePromise(pngPath))
        .then(data => { return { pngBuffer: data }; })
        .catch(err => { return { systemErrors: [err] }; })
        .finally(() => {
            // Clean up asynchronously
            console.log('Cleaning up files...')
            cleanUnlink(svgPath);
            cleanUnlink(pngPath);
        });
}


/**
 * Runs MathJax API and converts SVG into PNG.
 * 
 * @param {String} texInput 
 * @returns {object} `pngBuffer` Buffer of PNG data if successful; 
 * otherwise errors listed under `mathJaxErrors`, `systemErrors`.
 */
function typeset(texInput) {
    mjApi.config({ MathJax: {} });
    mjApi.start();
    const mathJaxInput = {
        math: texInput,
        format: "TeX",
        svg: true
    };
    return new Promise(resolve => mjApi.typeset(mathJaxInput, resolve)).then(output => (output.errors) ?
        { mathJaxErrors: output.errors } :
        convertSVGToPNG(output.svg, parseFloat(output.height.substring(0, output.height.length - 2))));
}


module.exports = { typeset };
