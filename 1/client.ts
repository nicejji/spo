const { argv } = process;

let [arg_hostname, arg_port] = argv.slice(2);
const hostname = arg_hostname ?? "localhost";
const port = isNaN(parseInt(arg_port)) ? 8080 : parseInt(arg_port);

const socket = await Bun.connect({
	hostname,
	port,

	socket: {
		data(_, data) {
			console.log(data.toString());
			console.log("\nEnter os command: ");
		},
	},
});

console.log(`Connected to ${hostname}:${port}`);

console.log("Enter os command: ");
for await (const line of console) {
	console.log(`Processing: ${line}`);
	socket.write(line);
	socket.flush();
}
