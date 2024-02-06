import { Server, connect } from "net";
import { createSocket as UDPSocket } from "node:dgram";
const peers = new Set();
let server = null;
let serverData = 0;
const me = await new Promise((res) => {
    const me = new Server().listen(() => res(me));
});
const myPort = me.address().port;
let isImServer = false;
const reciever = UDPSocket({ type: "udp4", reuseAddr: true }).bind(6969, "0.0.0.0");
reciever.on("message", (data) => {
    const port = Number(data.toString());
    if (port !== myPort && ![...peers].some((p) => p.remotePort === port)) {
        const peer = connect(port);
        peer.on("error", () => { });
        peer.on("connect", () => {
            peers.add(peer);
            if (isImServer && !peer.closed)
                peer.write(`SERV|${myPort}`);
        });
        peer.on("close", () => {
            peers.delete(peer);
            if (peer === server && !isImServer) {
                server = null;
                const minPeer = [...peers]
                    .filter((p) => !p.closed)
                    .sort((a, b) => a.remotePort - b.remotePort)[0];
                if (!minPeer || myPort < minPeer.remotePort) {
                    becomeServer();
                }
                else {
                    server = minPeer;
                }
            }
        });
    }
});
const broadcaster = UDPSocket({ type: "udp4", reuseAddr: true }).bind(() => {
    broadcaster.setBroadcast(true);
    setInterval(() => {
        broadcaster.send(`${myPort}`, 6969, "255.255.255.255");
    }, 30);
});
const yellow = (str) => `\x1b[30;103m${str}\x1b[0m`;
const blue = (str) => `\x1b[30;44m${str}\x1b[0m`;
const red = (str) => `\x1b[30;41m${str}\x1b[0m`;
// log state
setInterval(() => {
    console.clear();
    console.log("Me: " +
        (isImServer ? blue : yellow)(`${myPort} ${isImServer ? "SERVER" : "PEER"}`));
    if (!isImServer) {
        console.log("Server: " +
            (server ? blue : red)(`${server?.remotePort ?? "Not found"}`));
    }
    console.log(`Data: ${serverData}`);
    console.log(`Peers: ${[...peers]
        .filter((p) => p !== server)
        .map((p) => yellow(p.remotePort.toString()))
        .join(" ")}`);
}, 30);
const becomeServer = () => {
    isImServer = true;
    setInterval(() => {
        peers.forEach((p) => {
            if (!p.closed)
                p.write(`DATA|${serverData}`);
        });
        serverData = serverData + 1;
    }, 30);
    peers.forEach((p) => {
        if (!p.closed)
            p.write(`SERV|${myPort}`);
    });
};
setTimeout(() => {
    if (!server)
        becomeServer();
}, 500);
me.on("connection", (dataSock) => {
    dataSock.on("data", (data) => {
        const [msg, content] = data.toString().trim().split("|");
        switch (msg) {
            case "SERV":
                const port = Number(content);
                const serverPeer = [...peers].find((p) => p.remotePort === port);
                if (serverPeer)
                    server = serverPeer;
                break;
            case "DATA":
                serverData = Number(content);
                break;
        }
    });
});
//# sourceMappingURL=index.js.map