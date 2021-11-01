const express = require('express')
const {WebSocket, WebSocketServer} = require('ws');
const open = require('open')

function inject(port) {
    return `<script>/*Injected development server*/const socket = new WebSocket('ws://localhost:${port}', 'echo-protocol'); socket.addEventListener('message', () => location.reload());</script>`
}

function startWebsocket(server) {
    return new Promise(resolve => {
        const socketServer = new WebSocketServer({
            "server": server
        });
        socketServer.on('connection', function() {
            resolve(() => socketServer.clients.forEach((client) => {if(client.readyState === WebSocket.OPEN) client.send('reload')}))
        })
    });
}

function startBackend(routes, port, render) {
    return new Promise(async resolve => {
        if(routes === undefined) {
            resolve();
            return;
        }
        const app = express();
        Object.keys(routes).forEach(key => {
            if(key === 'default') key = '*'
            app.get(key, async (req, res) => {
                const renderResult = await render(key, req, inject(port));
                res.status(200, {"Content-Type": "text/html"}).send(renderResult).end()
            });
        });
        const server = app.listen(port);
        open(`http://127.0.0.1:${port}/`);
        resolve(await startWebsocket(server));
    })
}

module.exports = {startBackend};