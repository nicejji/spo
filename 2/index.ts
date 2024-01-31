import type { Socket } from "bun";
import { appendFileSync } from "node:fs";

const FTP_COMMANDS = [
	"USER",
	"PASS",
	"RETR",
	"STOR",
	"REST",
	"QUIT",
	"PASV",
	"TYPE",
	"DELE", // additional
	"NLIST", // additional
	"MKD", // additional
] as const;

type FTP_Command = (typeof FTP_COMMANDS)[number];
const isFTP_Command = (str: string): str is FTP_Command => {
	return FTP_COMMANDS.some((c) => c === str);
};
type Command = {
	command: FTP_Command;
	args: string[];
};

const parsePort = (res: string) => {
	const reg = /\(([^)]+)\)/; // regex to get content inside brackets
	const [_, octets] = reg.exec(res) ?? [];
	if (!octets) return null;
	const [p1, p2] = octets.split(",").map(Number).slice(-2); // retrieve last two octets
	const port = p1 * 256 + p2;
	if (isNaN(port)) return null;
	return port;
};

const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green = (s: string) => `\x1b[92m${s}\x1b[0m`;

export class FTP {
	#socket: Socket | null = null;
	#data_socket: Socket | null = null;
	#command: Command | null = null;
	hostname: string | null = null;
	port: number | null = null;

	#logData(data: Buffer | string) {
		const res = data.toString().trim();
		const { command, args } = this.#command ?? { command: "MSG", args: [] };
		console.log(green(`[${command} ${args.join(" ")}] -> "${res}"`));
	}

	#logErr(msg: string) {
		console.log(red(`[ERR]: ${msg}`));
	}

	#handleDataSockData(data: Buffer) {
		if (this.#command?.command === "NLIST") {
			this.#logData(data);
			return;
		}
		this.#logData("Recieving data ...");
		const path = this.#command?.args[0];
		if (!path) return;
		appendFileSync(path, data);
	}

	#handleDataSockClose() {
		this.#logData("File transfer ended");
		this.#data_socket = null;
	}

	async #handleData(data: Buffer) {
		this.#logData(data);
		if (!this.#command) return;
		const { command } = this.#command;
		switch (command) {
			case "PASV":
				const { hostname } = this;
				const port = parsePort(data.toString().trim());
				if (!hostname || !port) break;
				this.#data_socket = await Bun.connect({
					hostname,
					port,
					socket: {
						data: (_, data) => this.#handleDataSockData(data),
						close: () => this.#handleDataSockClose(),
					},
				});
				break;
		}
	}

	async connect(hostname: string, port: number) {
		this.#socket = await Bun.connect({
			hostname,
			port,
			socket: {
				data: (_, data) => this.#handleData(data),
			},
		});
		this.hostname = hostname;
		this.port = port;
	}

	async writeCommand(src: string) {
		if (!this.#socket) {
			this.#logErr("Socket not opened!");
			return;
		}
		const [command, ...args] = src.split(" ");
		if (!isFTP_Command(command)) {
			this.#logErr("Not a valid command");
			return;
		}
		if (command === "STOR" || command === "RETR" || command === "NLIST") {
			if (!this.#data_socket) {
				this.#logErr("Data sock not opened");
				return;
			}
			const path = args[0];
			if (!path && command !== "NLIST") {
				this.#logErr("Path not provided");
				return;
			}
			if (command === "RETR") {
				const file = Bun.file(path);
				const fileExist = await file.exists();
				if (fileExist) {
					this.#logErr("File already exist");
					return;
				}
			}
			if (command === "STOR") {
				const file = Bun.file(path);
				const fileExist = await file.exists();
				if (!fileExist) {
					this.#logErr("File not exist");
					return;
				}
				this.#data_socket.write(await file.arrayBuffer());
				this.#data_socket.flush();
				this.#logData("Uploading file ...");
				this.#data_socket.end();
			}
			if (command === "STOR") {
			}
		}
		this.#command = { command, args };
		this.#socket.write(`${src.trim()}\r\n`);
	}
}

// CLI Program
const [address, port] = process.argv.slice(2);
const ftp = new FTP();
await ftp.connect(address ?? "0.0.0.0", Number(port ?? 2121));

for await (const line of console) {
	await ftp.writeCommand(line);
}
