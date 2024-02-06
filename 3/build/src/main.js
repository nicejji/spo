import { Socket, connect } from "node:net";
import { createSocket as UDPSocket } from "node:dgram";
const findServer = () => new Promise((res) => {
    const discover = UDPSocket({ type: "udp4", reuseAddr: true }).bind(6969, "localhost", () => {
        const wait = setTimeout(() => {
            discover.close();
            res(null);
        });
        discover.on("message", (data) => {
            const port = Number(data.toString());
            const server = connect(port);
            server.on("connect", () => {
                clearTimeout(wait);
                discover.close();
                res(server);
            });
        });
    });
});
const peers = new Set();
let counter = 0;
let server = await findServer();
if (!server) {
    server = new Socket();
    console.log(server);
    const invitingSocket = UDPSocket({ type: "udp4" }).bind();
    setInterval(() => invitingSocket.send(`${server.localPort}`, 6969), 30);
    setInterval(() => {
        counter = counter + 1;
        peers.forEach((p) => p.write(`DATA|${counter}`));
    }, 50);
}
// const switchServer = () => {
// 	const minPeer = [...peers].sort((a, b) => a.remotePort - b.remotePort)[0];
// 	if (!minPeer || myPort < minPeer.remotePort) {
// 		becomeServer();
// 		return;
// 	}
// 	peers.delete(minPeer);
// 	server = connect(minPeer.remotePort);
// 	server.on("close", switchServer);
// };
//
// // Handle
// me.on("connection", (dataSock) => {
// 	const sub = setInterval(() => {
// 		dataSock.write(`${counter}`);
// 	}, 30);
// 	dataSock.on("close", () => {
// 		console.log(`datasock closed`);
// 		clearInterval(sub);
// 	});
//
// 	dataSock.on("data", (data) => {
// 		const [msg, content] = data.toString().split("|");
// 		if (msg === "PEER") {
// 			const peer = connect(Number(content.toString()));
// 			peer.on("connect", () => {
// 				peers.add(peer);
// 			});
// 			peer.on("close", () => {
// 				peers.delete(peer);
// 			});
// 		}
// 	});
// });
//
// Log current state
setInterval(() => {
    console.clear();
    console.log(`Server: ${server.remotePort}`);
    console.log(`Peers: [${[...peers].map((p) => p.remotePort)}]`);
    console.log(`Counter: ${counter}`);
}, 1000);
//# sourceMappingURL=main.js.map