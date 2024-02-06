import { createSocket as createUDPSocket, } from "node:dgram";
import { Server, connect } from "net";
let counter = 0;
let server = null;
const peers = new Set();
const meSocket = new Server().listen();
let discoverSocket = createUDPSocket({
    type: "udp4",
    reuseAddr: true,
}).bind(6969, "localhost");
discoverSocket.on("message", (data) => {
    discoverSocket?.close();
    discoverSocket = null;
    // Found a server
    // Connect to server with new ip
    const dataSock = connect(Number(data.toString()));
    dataSock.on("data", (data) => {
        counter = Number(data.toString());
    });
    connectToServer(dataSock);
});
setTimeout(() => {
    discoverSocket?.close();
    discoverSocket = null;
    if (!server)
        becomeServer();
}, 300);
const chooseServer = () => {
    if (server === "me")
        throw "";
    console.log(`Server: ${server?.remotePort} disconnected`);
    server = null;
    if (!peers.size) {
        becomeServer();
        return;
    }
    const myIndex = meSocket.address().port;
    const minIndexPeer = [...peers].sort((a, b) => a.remotePort - b.remotePort)[0];
    if (myIndex < minIndexPeer.remotePort) {
        becomeServer();
        return;
    }
    console.log(`Choosing ${minIndexPeer.remotePort}`);
    peers.delete(minIndexPeer);
    server = minIndexPeer;
};
const connectToServer = (serverSock) => {
    serverSock.on("connect", () => {
        server = serverSock;
        serverSock.write(`PEER|${meSocket.address().port}`);
    });
    serverSock.on("close", () => {
        if (server === "me")
            throw "";
        server = null;
        if (!peers.size) {
            becomeServer();
            return;
        }
        const myIndex = meSocket.address().port;
        const minIndexPeer = [...peers].sort((a, b) => a.remotePort - b.remotePort)[0];
        if (myIndex < minIndexPeer.remotePort) {
            becomeServer();
            return;
        }
        console.log(`Choosing ${minIndexPeer.remotePort}`);
        peers.delete(minIndexPeer);
        server = minIndexPeer;
        server.on("close", chooseServer);
    });
};
const becomeServer = () => {
    if (server !== null)
        return;
    server = "me";
    const invitingSocket = createUDPSocket({ type: "udp4" }).bind();
    setInterval(() => {
        invitingSocket.send(`${meSocket.address().port}`, 6969);
    }, 50);
    setInterval(() => {
        counter += 1;
    }, 50);
};
meSocket.on("connection", (dataSock) => {
    const uploading = setInterval(() => {
        if (!dataSock.destroyed) {
            dataSock.write(`${counter}`);
        }
        else {
            clearInterval(uploading);
        }
    }, 50);
    dataSock.on("data", (data) => {
        const [msg, content] = data.toString().split("|");
        if (msg === "PEER") {
            const peer = connect(Number(content));
            peer.on("connect", () => {
                peers.forEach((p) => p.write(`PEER|${peer.remotePort}`));
                peers.forEach((p) => peer.write(`PEER|${p.remotePort}`));
                peers.add(peer);
            });
            peer.on("close", () => {
                peers.delete(peer);
            });
        }
    });
});
// Log current state
setInterval(() => {
    console.clear();
    console.log(`Me: ${meSocket.address().port}`);
    const status = server === null
        ? "Finding server ..."
        : server === "me"
            ? "Serving"
            : "Connected";
    console.log(`Status: ${status}${status === "Connected"
        ? ` ${server.destroyed
            ? `FAIL ${server.remotePort}`
            : `OK ${server.remotePort}`}`
        : ""}`);
    console.log(`Peers: [${[...peers].map((p) => p.remotePort)}]`);
    console.log(`Counter: ${counter}`);
}, 50);
//# sourceMappingURL=old.js.map