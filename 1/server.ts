const { argv } = process;

let [arg_hostname, arg_port] = argv.slice(2);
const hostname = arg_hostname ?? "localhost";
const port = isNaN(parseInt(arg_port)) ? 8080 : parseInt(arg_port);

Bun.listen({
	hostname,
	port,
	socket: {
		data(socket, data) {
			console.log(`Command from ${socket.remoteAddress}: ${data}`);
			Bun.spawn(data.toString().split(" "), {
				async onExit(proc, code) {
					const succeed = code === 0;
					let msg = `${succeed ? "Success" : "Error"} command: ${data}\n`;
					const output = await new Response(
						proc.stdout as ReadableStream<Uint8Array>,
					).text();
					socket.write(msg);
					socket.write(`\nOutput: ${output}`);
					console.log(msg);
					socket.flush();
				},
			});
		},
		open(socket) {
			console.log(`Client connected: ${socket.remoteAddress}`);
		},
	},
});

console.log(`Listening on ${hostname}:${port}`);
