import {createServer, Server} from "http";
import {GameSocketServer} from "./server";

let server: Server = createServer();
let ws = new GameSocketServer(server);

server.listen(3000, () => {
    console.log("Listening on port 3000");
});
