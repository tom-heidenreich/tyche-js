const {parse, HTMLElement} = require('node-html-parser');
const fs = require('fs');
const path = require("path");
const {startBackend} = require('./tyche-backend');

const {TychePage, TycheHTML} = require('../tyche');

const CONFIG_PATH = './tyche.json'
const COMPONENT_PATH = './components';

var UPDATE_FRONTEND;

var CONFIG;

//
// UTIL
//
function arrayRemove(array, i) {
    const index = array.indexOf(i);
    if (index > -1) {
        array.splice(index, 1);
    }
}
function arrayReplace(array, i, replacement) {
    const index = array.indexOf(i);
    if (index > -1) {
        array[index] = replacement;
    }
}

//
// LOAD CONFIG FILE
//
function loadConfig() {
    if(!fs.existsSync(CONFIG_PATH)) {
        console.error(`\x1b[31m❌ ${CONFIG_PATH} not found!\x1b[0m`);
        return undefined;
    }
    try {
        return JSON.parse(fs.readFileSync(CONFIG_PATH));
    }catch(e) {
        console.error(`\x1b[31m❌ Unexpected error while loading config!\x1b[0m`);
        return undefined;
    }
}

function getPage(uri, req) {
    if(uri === '*') uri = 'default';
    const route = CONFIG.backend.routes[uri];
    if(typeof route === 'string' || !route.dynamic) return getStaticPage(route);
    const handler = route.handler;
    if(!handler) throw new TypeError(`property 'handler' is required`);
    const handlerPath = path.resolve(`${COMPONENT_PATH}/${handler}`);
    delete require.cache[handlerPath];
    if(!fs.existsSync(handlerPath)) throw new Error(`module '${COMPONENT_PATH}/${handler}' not found`);
    const handle = require(handlerPath);
    if(handle === undefined || typeof handle !== 'function') throw new TypeError(`handler '${handler}'' has to export 'handle: function'`);
    var result;
    try {
        result = handle(route.page ? TychePage.of(getStaticPage(route.page)) : undefined, req);
    }catch(e) {
        throw new Error(`catched in '${handler}': ${e}`);
    }
    if(!(result instanceof TychePage)) throw new Error(`'handle: function' in '${handler}' has to return '[object TychePage]'`);
    return result.convert();
}

function getStaticPage(pageName) {
    if(CONFIG.frontend.pages === undefined) throw new TypeError(`Cannot read property 'pages' of 'frontend'`);
    const page = CONFIG.frontend.pages[pageName];
    if(page === undefined) throw new TypeError(`Cannot read property '${pageName}' of 'pages'`);
    return [page, pageName, {}];
}

function buildMeta(meta) {
    const defaultMeta = CONFIG.frontend.meta ? CONFIG.frontend.meta : {};
    if(meta === undefined) meta = {};
    var result = `<title>${meta.title ? meta.title : defaultMeta.title ? defaultMeta.title : "tyche-js"}</title>`;
    result += `<meta charset=${meta.charset ? meta.charset : defaultMeta.charset ? defaultMeta.charset : "UTF-8"}/>`;
    return result;
}

function readHTML(index) {
    var html;
    try {
        html = parse(fs.readFileSync(`${COMPONENT_PATH}/${index}`));
    }catch(e) {
        throw new Error(`no such file '${COMPONENT_PATH}/${index}'`)
    }
    return html;
}

function parseAttrs(attrs) {
    const result = {};
    attrs.split(' ').forEach(element => {
        const el = element.split('=');
        if(el[1]) result[el[0]] = el[1].replaceAll('"', '');
    })
    return result;
}

function customHTMLElements(html, props, defined) {
    if(defined === undefined) defined = [];
    const nodes = html.childNodes
    nodes.forEach(element => {
        if(element instanceof HTMLElement) {
            if(element.childNodes.length > 0) customHTMLElements(element, props, defined);
            else if(element.rawTagName === 'link') {
                const attrs = parseAttrs(element.rawAttrs);
                var linkedEl;
                try {
                    linkedEl = fs.readFileSync(`${COMPONENT_PATH}/${attrs.location}`);
                }catch(e) {
                    throw new Error(`no such file '${COMPONENT_PATH}/${attrs.location}'`);
                }
                const type = attrs.type;
                arrayReplace(nodes, element, type ? `<${type}>${linkedEl}</${type}>` : linkedEl);
            }
            else if(element.rawTagName === 'define') {
                const attrs = parseAttrs(element.rawAttrs);
                defined.push(attrs.name);
                arrayRemove(nodes, element);
            }
            else if(defined.includes(element.rawTagName)) {
                if(props[defined]) arrayReplace(nodes, element, props[defined]);
            }
        }
    });
}

function customPage(page) {
    const html = parse(page.content);
    customHTMLElements(html, page.props);
    return html;
}

function buildIndex(index, pageName, props) {
    if(!index) throw new TypeError(`Cannot read property 'index' of '${pageName}'`) 
    const html = readHTML(index);
    customHTMLElements(html, props);
    return html;
}

function render(uri, req, inject) {
    return new Promise(async resolve => {
        try {
            const [page, pageName, props] = getPage(uri, req);

            var result = '<html>';
            result += `<head>${buildMeta(page.meta)}</head>`;
            result += `<body>${page instanceof TycheHTML ? customPage(page) : buildIndex(page.index, pageName, props)}</body>`;
            if(inject) result += inject;
            result += '</html>';
            resolve(result);
        }catch(e) {
            console.error(`\x1b[31m${e}\x1b[0m`)
            var result = '<html style="color: red;">';
            result += '<title>Error</title>'
            result += e;
            if(inject) result += inject;
            result += '</html>';
            resolve(result);
        }
    });
}

//
// WATCH FILES
//
function watchFiles() {
    fs.watchFile(CONFIG_PATH, {interval: 1000}, () => {
        CONFIG = loadConfig();
        update();
        console.warn(`\x1b[33m⚠  Changes in 'backend' cannot be updated!\x1b[0m`);
    });
    fs.readdirSync(COMPONENT_PATH).forEach(element => {
        fs.watchFile(`${COMPONENT_PATH}/${element}`, {interval: 1000}, update)
    });
    fs.watch(COMPONENT_PATH, (type, file) => {
        if(type === 'rename') fs.watchFile(`${COMPONENT_PATH}/${file}`, {interval: 1000}, update);
    })
}

//
// FIRST RUN
//
var running = false;
function start() {
    return new Promise(async (resolve, reject) => {
        if(running) {
            reject("tyche-js is already running!");
            return;
        }
        running = true;
        CONFIG = await loadConfig();
        if(CONFIG === undefined) return;
        if(CONFIG.backend === undefined)  {
            console.warn(`\x1b[33mNothing to do!\x1b[0m`);
            return;
        };
        if(CONFIG.backend.port === undefined) CONFIG.backend.port = 3000;
        UPDATE_FRONTEND = await startBackend(CONFIG.backend.routes, CONFIG.backend.port, render);
        if(UPDATE_FRONTEND === undefined) {
            console.warn(`\x1b[33mNothing to do!\x1b[0m`);
            return;
        };
        update({"start": true, "port": CONFIG.backend.port});
        watchFiles();
        resolve();
    });
}

//
// CREATE PROJECT
//
function createProject() {
    return new Promise(async (resolve, reject) => {
        try {
            if(!fs.existsSync(COMPONENT_PATH)) fs.mkdirSync(COMPONENT_PATH);
            if(!fs.existsSync(CONFIG_PATH)) fs.writeFileSync(CONFIG_PATH, '{"frontend": {}, "backend": {}}');
            resolve();
        }catch(e) {
            reject(e);
        }
    });
}

//
// UTIL
//
async function update(props) {
    console.clear();
    console.log("tyche-js development server...")
    UPDATE_FRONTEND();
    if(props === undefined || !props.start) {
        console.log(`\x1b[32m-> updated live server!\x1b[0m`)
    }else {
        console.log(`\x1b[32m-> started live server on http://127.0.0.1:${props.port}!\x1b[0m`)
    }
}

module.exports = {start, createProject}