import {Server as SocketServer, Socket} from "socket.io";
import {Server as HttpServer} from "http";
import {Card} from "../../data";
import {Game} from "./game";

export class GameSocketServer {
    private server: SocketServer;

    private games: Map<string, Game> = new Map();
    private players: Map<string, string> = new Map();
    private clients: Map<string, Socket> = new Map();

    constructor(srv: number | HttpServer) {
        this.server = new SocketServer(srv, {
            // cors: {
            //     origin: "*",
            //     methods: ["GET", "POST"]
            // }
        });

        this.server.on("connection", (socket) => {
            console.log("New connection with UUID " + socket.id);

            socket.on("new-game", (player_name: string) => {
                let game_code = this.random_game_code();
                this.players.set(socket.id, game_code);
                this.clients.set(socket.id, socket);

                const game = new Game();
                game.add_player(socket.id, player_name);
                this.games.set(game_code, game);

                this.broadcast_game(game_code);
            });

            socket.on("join-game", (game_code: string, player_name: string) => {
                if (this.games.has(game_code)) {
                    this.players.set(socket.id, game_code);

                    this.games.get(game_code).add_player(socket.id, player_name);

                    this.broadcast_game(game_code);
                } else {
                    socket.emit("game", null);
                }
            });

            socket.on("start-game", () => {
                const game_code = this.players.get(socket.id);
                const game = this.games.get(game_code);
                game.start_game();

                this.broadcast_game(game_code);
            });

            socket.on("make-choice", (chosen_card: Card, targets: number[], additional_choice?: any) => {
                const game_code = this.players.get(socket.id);
                const game = this.games.get(game_code);
                if (game.make_choice(socket.id, chosen_card, targets, additional_choice)) {
                    this.broadcast_game(game_code);
                }
            });

            socket.on("make-bishop-choice", (choice: boolean) => {
                const game_code = this.players.get(socket.id);
                const game = this.games.get(game_code);
                if (game.make_bishop_choice(socket.id, choice)) {
                    this.broadcast_game(game_code);
                }
            });

            socket.on("disconnect", (reason: string) => {
                console.log(`Socket ${socket.id} disconnected (${reason})`);

                if (this.players.has(socket.id)) {
                    const game_code = this.players.get(socket.id);
                    const game = this.games.get(game_code);

                    game.remove_player(socket.id);
                }

                this.clients.delete(socket.id);
                this.players.delete(socket.id);
            });
        });
    }

    private random_game_code(): string {
        while (true) {
            let game_code = String.fromCharCode(...[...Array(6).keys()].map((_) => Math.floor(Math.random() * 26) + 65));
            if (!this.games.has(game_code)) {
                return game_code;
            }
        }
    }

    private broadcast_game(game_code: string) {
        const game = this.games.get(game_code);
        for (let [connection_id, data] of game.get_individual_game_data()) {
            if (this.clients.has(connection_id)) {
                this.clients.get(connection_id).emit("game", data);
            }
        }
    }
}
