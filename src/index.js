import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "url";
import { hostname } from "node:os";
import { join, dirname } from "node:path";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicPath = fileURLToPath(new URL("../public/", import.meta.url));

const LAN_IP = process.env.LAN_IP || "192.168.1.5";
const LAN_PORT = parseInt(process.env.LAN_PORT || "8080");

const keyPath = join(__dirname, "..", "keys", `${LAN_IP}+1-key.pem`);
const certPath = join(__dirname, "..", "keys", `${LAN_IP}+1.pem`);

let httpsOptions = null;
try {
	httpsOptions = {
		key: readFileSync(keyPath),
		cert: readFileSync(certPath),
	};
} catch (e) {
	console.warn(`\nSSL certificates not found — starting in HTTP mode.`);
	console.warn(`To enable HTTPS, generate certs with mkcert:`);
	console.warn(`  mkcert -install`);
	console.warn(`  mkcert ${LAN_IP} localhost`);
	console.warn(`  mkdir -p keys && mv ${LAN_IP}+1*.pem keys/\n`);
}

const useHttps = httpsOptions !== null;
const protocol = useHttps ? "https" : "http";

logging.set_level(logging.NONE);
Object.assign(wisp.options, {
	allow_udp_streams: false,
	hostname_blacklist: [/example\.com/],
	dns_servers: ["1.1.1.3", "1.0.0.3"],
});

const fastify = Fastify({
	serverFactory: (handler) => {
		const server = useHttps
		? createHttpsServer(httpsOptions)
		: createHttpServer();

		return server
		.on("request", (req, res) => {
			res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
			res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
			handler(req, res);
		})
		.on("upgrade", (req, socket, head) => {
			if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
			else socket.end();
		});
	},
});

fastify.addHook("onSend", (request, reply, payload, done) => {
	const ct = reply.getHeader("content-type") || "";
	if (ct.includes("text/html")) {
		reply.header("Cache-Control", "no-cache, no-store, must-revalidate");
	}
	done();
});

fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
});

fastify.register(fastifyStatic, {
	root: scramjetPath,
	prefix: "/scram/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: libcurlPath,
	prefix: "/libcurl/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/baremux/",
	decorateReply: false,
});

fastify.setNotFoundHandler((res, reply) => {
	return reply.code(404).type("text/html").sendFile("404.html");
});

fastify.server.on("listening", () => {
	const address = fastify.server.address();
	console.log(`\n${useHttps ? "HTTPS" : "HTTP"} server running on LAN:`);
	console.log(`\t${protocol}://localhost:${address.port}`);
	console.log(`\t${protocol}://${LAN_IP}:${address.port}`);
	console.log(`\t${protocol}://${hostname()}:${address.port}`);
	if (useHttps) {
		console.log("\nAccess from any device on your network using the LAN IP URL.");
		console.log("Make sure mkcert root CA is installed on client devices.\n");
	} else {
		console.log("\nRunning in HTTP mode. To enable HTTPS, set up mkcert certificates.\n");
	}
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log(`SIGTERM signal received: closing ${useHttps ? "HTTPS" : "HTTP"} server`);
	fastify.close();
	process.exit(0);
}

fastify.listen({
	port: LAN_PORT,
	host: "0.0.0.0",
});
