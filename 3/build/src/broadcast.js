import { createSocket } from "dgram";
let listener = null;
let reciever = null;
export const listen_broadcast = (cb) => {
    listener = createSocket({ type: "udp4", reuseAddr: true })
        .bind(6969)
        .on("message", (data) => cb(data.toString()));
};
export const send_broadcast = (msg) => {
    if (reciever)
        reciever = createSocket({ type: "udp4", reuseAddr: true }).bind(() => {
            reciever.send(msg, 6969);
        });
};
//# sourceMappingURL=broadcast.js.map