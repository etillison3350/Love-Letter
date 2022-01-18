import {Card, CardChoices, CardData, GameMessage, GameMessageType, PublicGameState} from "../../data";

type PlayerInfo = {
    name: string;
    connection_id: string;
    score: number;
    hand: [Card] | [Card, Card];
    out: boolean;
    cards_played: Card[];
    known_cards: Card[][];
    jester_token: number;
};

export class Game {
    private players: PlayerInfo[];
    private active_player = 0;

    private winning_score: number;

    private bishop_player = -1;
    private sycophant_player = -1;

    private cards: Card[];
    private deck: Card[];
    private facedown_card: Card;
    private faceup_cards: Card[];

    private game_messages: GameMessage[];

    private game_over: boolean = true;
    private round_over: boolean;

    public add_player(connection_id: string, name: string) {
        this.players.push({
            name: name.replace(/[{}]+/g, "") || "Unnamed Player",
            connection_id: connection_id,
            score: 0,
            hand: null,
            out: true,
            cards_played: [],
            known_cards: [],
            jester_token: -1,
        });
    }

    public remove_player(connection_id: string) {
        const index = this.players.findIndex((player) => player.connection_id == connection_id);
        this.players[index].connection_id = null;
    }

    public start_game(): void {
        if (!this.game_over) {
            return;
        }

        this.winning_score = this.players.length > 3 ? 4 : this.players.length == 3 ? 5 : 7;

        for (let player of this.players) {
            player.score = 0;
        }

        this.active_player = 0;
        this.game_messages = [];
        this.game_over = false;

        this.start_round();
    }

    private start_round(players?: PlayerInfo[]): void {
        // Remove disconnected players
        this.players = this.players.filter((player) => player.connection_id != null);

        // Reconstruct the deck
        this.deck = [Card.GUARD, Card.GUARD, Card.GUARD, Card.GUARD, Card.GUARD, Card.PRIEST, Card.PRIEST, Card.BARON, Card.BARON, Card.HANDMAID, Card.HANDMAID, Card.PRINCE, Card.PRINCE, Card.KING, Card.COUNTESS, Card.PRINCESS];

        if (this.players.length > 4) {
            this.deck.push(
                Card.GUARD,
                Card.GUARD,
                Card.GUARD,
                Card.ASSASSIN,
                Card.JESTER,
                Card.CARDINAL,
                Card.CARDINAL,
                Card.BARONESS,
                Card.BARONESS,
                Card.SYCOPHANT,
                Card.SYCOPHANT,
                Card.COUNT,
                Card.COUNT,
                Card.CONSTABLE,
                Card.DOWAGER_QUEEN,
                Card.BISHOP
            );
        }

        this.cards = [...new Set(this.cards).values()];

        // Fisher-Yates shuffle; reference: https://stackoverflow.com/a/12646864
        for (let i = this.deck.length - 1; i >= 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }

        // Game starts with one card face-down, plus three face up in a two-player game
        this.facedown_card = this.deck.pop();
        if (this.players.length == 2) {
            this.faceup_cards = [this.deck.pop(), this.deck.pop(), this.deck.pop()];
        } else {
            this.faceup_cards = [];
        }

        for (let player of this.players) {
            player.out = true;
            player.cards_played = [];
            player.known_cards = this.players.map((_) => []);
            player.jester_token = -1;
        }
        for (let player of players || this.players) {
            player.hand = [this.deck.pop()];
            player.out = false;
        }

        this.bishop_player = -1;
        this.sycophant_player = -1;

        this.round_over = false;

        this.start_turn();
    }

    private start_turn() {
        this.draw_card(this.active_player);
    }

    public make_choice(connection_id: string, chosen_card: Card, targets: number[], additional_choice?: any): boolean {
        const current_player = this.players[this.active_player];

        if (current_player.connection_id != connection_id) {
            // Wrong player
            return false;
        }

        if (current_player.hand.length != 2) {
            // start_turn first
            return false;
        }

        if (!current_player.hand.includes(chosen_card)) {
            // Can't play a card that's not in hand
            return false;
        }

        if ((chosen_card == Card.PRINCE || chosen_card == Card.KING) && current_player.hand.includes(Card.COUNTESS)) {
            // Can't play the Prince or King with Countess in hand
            return false;
        }

        if (new Set(targets).size != targets.length) {
            // Can't target the same player twice
            return false;
        }

        if (CardChoices[chosen_card].max_targets > 0) {
            const legal_targets = this.players.filter((player, index) => index != this.active_player && player.cards_played.length <= 0 && player.cards_played[player.cards_played.length - 1] != Card.HANDMAID);
            if (!CardChoices[chosen_card].can_target_self && (legal_targets.length < CardChoices[chosen_card].targets || (this.sycophant_player >= 0 && this.sycophant_player == this.active_player))) {
                // Not enough legal targets; card is discarded with no effect
                this.discard(this.active_player, chosen_card);
                this.add_game_message(GameMessageType.CARD_UNPLAYABLE, current_player.name, chosen_card);
            }
        }

        if (targets.length < CardChoices[chosen_card].targets || targets.length > CardChoices[chosen_card].max_targets) {
            // Can't target the wrong number of players
            return false;
        }

        if (this.sycophant_player >= 0 && targets.length > 0 && !targets.includes(this.sycophant_player)) {
            // The target of the sycophant must be targetted, if possible
            return false;
        }

        for (let target of targets) {
            if (target < 0 || target >= this.players.length) {
                // Target out of bounds
                return false;
            }

            if (this.players[target].out) {
                // Can't target players that are out
                return false;
            }

            if (target != this.active_player && this.players[target].cards_played.length > 0 && this.players[target].cards_played[this.players[target].cards_played.length - 1] == Card.HANDMAID) {
                // Players who have played a handmaid can't be targeted
                return false;
            }

            if (target == this.active_player && !CardChoices[chosen_card].can_target_self) {
                // Can't target self
                return false;
            }
        }

        if (CardChoices[chosen_card].additional_choice == "none" && additional_choice) {
            // Too many additional choices supplied
            return false;
        }

        if (CardChoices[chosen_card].additional_choice == "card_number" && !Number.isInteger(additional_choice)) {
            // Expected a card number
            return false;
        }

        if (CardChoices[chosen_card].additional_choice == "selected_player" && (!Number.isInteger(additional_choice) || !targets.includes(additional_choice))) {
            // Expected one of the selected targets
            return false;
        }

        const target_players = targets.map((index) => this.players[index]);

        // Discard the chosen card
        this.discard(this.active_player, chosen_card);
        this.add_game_message(GameMessageType.CARD_PLAY, current_player.name, chosen_card, ...target_players.map((player) => player.name));

        // The Sycophant only applied to the card that was just played, so reset it
        this.sycophant_player = -1;

        switch (chosen_card) {
            case Card.GUARD:
                if (target_players[0].hand[0] == Card.ASSASSIN) {
                    // If the Guard is played against a player with the Assassin, that player is out, and the Assassin discards their card and draws a new card
                    this.add_game_message(GameMessageType.GUARD_ASSASSIN, target_players[0].name, current_player.name);
                    this.knock_out(this.active_player);
                    this.discard(targets[0]);
                    this.draw_card(targets[0]);
                } else {
                    this.add_game_message(GameMessageType.GUARD_GUESS, current_player.name, additional_choice);
                    if (additional_choice == CardData[target_players[0].hand[0]].value) {
                        // If the guess is correct, the chosen player is out
                        this.add_game_message(GameMessageType.GUARD_CORRECT, target_players[0].name, target_players[0].hand[0]);
                        this.knock_out(targets[0]);
                    }
                }
                break;
            case Card.PRIEST:
                this.reveal_hand(this.active_player, targets[0]);
                break;
            case Card.BARON:
                if (CardData[current_player.hand[0]].value > CardData[target_players[0].hand[0]].value) {
                    this.add_game_message(GameMessageType.BARON_COMPARE, target_players[0].name, target_players[0].hand[0]);
                    this.knock_out(targets[0]);
                } else if (CardData[current_player.hand[0]].value > CardData[target_players[0].hand[0]].value) {
                    this.add_game_message(GameMessageType.BARON_COMPARE, current_player.name, current_player.hand[0]);
                    this.knock_out(this.active_player);
                }
                break;
            case Card.HANDMAID:
                break;
            case Card.PRINCE:
                // The target discards their card and draws a new card
                // If the princess is discarded, that player is out immediately and does not draw a new card
                if (this.discard(targets[0]) != Card.PRINCESS) {
                    this.draw_card(targets[0]);
                }
                break;
            case Card.KING:
                // Exchange the cards in those players' hands, as well as any information that any players know about those cards
                [current_player.hand, target_players[0].hand] = [target_players[0].hand, current_player.hand];
                for (let player of this.players) {
                    [player.known_cards[this.active_player], player.known_cards[targets[0]]] = [player.known_cards[targets[0]], player.known_cards[this.active_player]];
                }
                // The swapped players now know each others' cards
                this.reveal_hand(this.active_player, targets[0]);
                this.reveal_hand(targets[0], this.active_player);
                break;
            case Card.COUNTESS:
                break;
            case Card.PRINCESS:
                break;
            case Card.ASSASSIN:
                break;
            case Card.JESTER:
                target_players[0].jester_token = this.active_player;
                break;
            case Card.CARDINAL:
                // Exchange the cards in those players' hands, as well as any information that any players know about those cards
                [target_players[0].hand, target_players[1].hand] = [target_players[1].hand, target_players[0].hand];
                for (let player of this.players) {
                    [player.known_cards[targets[0]], player.known_cards[targets[1]]] = [player.known_cards[targets[1]], player.known_cards[targets[0]]];
                }
                // The swapped players now know each others' cards
                this.reveal_hand(targets[0], targets[1]);
                this.reveal_hand(targets[1], targets[0]);
                // Reveal the chosen card (as part of the Cardinal effect)
                this.add_game_message(GameMessageType.CARDINAL_REVEAL, current_player.name, additional_choice);
                this.reveal_hand(this.active_player, additional_choice);
                break;
            case Card.BARONESS:
                for (let target of targets) {
                    this.reveal_hand(this.active_player, target);
                }
                break;
            case Card.SYCOPHANT:
                this.sycophant_player = targets[0];
                break;
            case Card.COUNT:
                break;
            case Card.CONSTABLE:
                break;
            case Card.DOWAGER_QUEEN:
                if (CardData[current_player.hand[0]].value < CardData[target_players[0].hand[0]].value) {
                    this.add_game_message(GameMessageType.DOWAGER_COMPARE, target_players[0].name, target_players[0].hand[0]);
                    this.knock_out(targets[0]);
                } else if (CardData[current_player.hand[0]].value < CardData[target_players[0].hand[0]].value) {
                    this.add_game_message(GameMessageType.DOWAGER_COMPARE, current_player.name, current_player.hand[0]);
                    this.knock_out(this.active_player);
                }
                break;
            case Card.BISHOP:
                this.add_game_message(GameMessageType.BISHOP_GUESS, current_player.name, additional_choice);
                if (additional_choice == CardData[target_players[0].hand[0]].value) {
                    // On a correct guess
                    this.add_game_message(GameMessageType.BISHOP_CORRECT, target_players[0].name, target_players[0].hand[0], current_player.name, current_player.score);
                    if (this.score(this.active_player)) {
                        this.add_game_message(GameMessageType.GAME_WIN, current_player.name);
                        this.game_over = true;
                        return true;
                    }

                    this.bishop_player = targets[0];

                    // The target's hand is now revealed to everyone (they have a chance to discard)
                    for (let i = 0; i < this.players.length; i++) {
                        this.reveal_hand(i, targets[0]);
                    }

                    // Do not go on to the next turn; we need to wait for the chosen player to decide whether or not to discard their card.
                    return true;
                }
                break;
        }

        this.next_turn();

        return true;
    }

    public make_bishop_choice(connection_id: string, discard: boolean): boolean {
        if (this.bishop_player < 0 || this.players[this.bishop_player].connection_id != connection_id) {
            return false;
        }

        // When a player makes a correct guess with the Bishop, that player may discard their card and draw a new one
        // If they discard the princess, they are out immediately and do not draw a new card
        if (discard && this.discard(this.bishop_player) != Card.PRINCESS) {
            this.draw_card(this.bishop_player);
        }
        this.bishop_player = -1;
        this.next_turn();

        return true;
    }

    // Discard the specified card from the specified player's hand, or, if no card is specified, discard the first card in their hand instead
    private discard(player_index: number, card?: Card): Card {
        const player = this.players[player_index];

        if (!card) {
            // If no card is specified, choose the first card in hand instead (this will often be the only card)
            card = player.hand[0];
        }

        const card_index = player.hand.indexOf(card);
        player.hand.splice(card_index, 1);
        player.cards_played.push(card);

        if (card == Card.PRINCESS) {
            // If the princess is discarded, that player is out immediately
            this.add_game_message(GameMessageType.PRINCESS_DISCARD, player.name);
            this.knock_out(player_index);
        }

        for (let player of this.players) {
            // If this card was known to any other player, it is no longer (since it is no longer in hand)
            const known_cards = player.known_cards[player_index];
            const known_index = known_cards.indexOf(card);
            if (known_index >= 0) {
                known_cards.splice(known_index, 1);
            }
        }

        return card;
    }

    // Mark observer as knowing the cards currently in observed's hand
    private reveal_hand(observer: number, observed: number) {
        this.players[observer].known_cards[observed].push(...this.players[observed].hand);
    }

    // The specified player draws a card
    private draw_card(player: number) {
        // Draw from the deck if possible, or use the facedown card if not
        if (this.deck.length > 0) {
            this.players[player].hand.push(this.deck.pop());
        } else {
            this.players[player].hand.push(this.facedown_card);
        }
    }

    private knock_out(player_index: number) {
        const player = this.players[player_index];
        player.out = true;

        if (player.cards_played.includes(Card.CONSTABLE)) {
            this.score(player_index);
            this.add_game_message(GameMessageType.CONSTABLE_OUT, player.name, player.score);
        }

        player.cards_played.push(...player.hand);
        player.hand = null;
        for (let player of this.players) {
            player.known_cards[player_index] = [];
        }

        let remaining_player = null;
        for (let [index, player] of this.players.entries()) {
            if (!player.out) {
                if (remaining_player == null) {
                    remaining_player = index;
                } else {
                    remaining_player = null;
                    break;
                }
            }
        }

        if (remaining_player != null) {
            // Round is over, score points
            this.round_over = true;

            this.add_game_message(GameMessageType.LAST_REMAINING, this.players[remaining_player].name, this.players[remaining_player].score);
            this.score(remaining_player);
            let jester = this.players[remaining_player].jester_token;
            if (jester >= 0) {
                this.add_game_message(GameMessageType.JESTER_CORRECT, this.players[jester].name, this.players[remaining_player].name, this.players[jester].score);
                this.score(jester);
            }

            this.active_player = remaining_player;
        }
    }

    private add_game_message(type: GameMessageType, ...args: any[]): void {
        if (this.game_messages.length >= 256) {
            this.game_messages.unshift();
        }
        this.game_messages.push(new GameMessage(type, ...args));
    }

    private score(player: number): boolean {
        return ++this.players[player].score >= this.winning_score;
    }
    private next_turn(): void {
        for (let [index, player] of this.players.entries()) {
            // Any players who have disconnected are out
            if (player.connection_id == null) {
                this.knock_out(index);
                this.add_game_message(GameMessageType.PLAYER_DISCONNECT, player.name);
            }
        }

        if (!this.round_over && this.deck.length == 0) {
            // No cards left to draw, round is over. Score points
            let card_values = this.players
                .filter((player) => !player.out)
                .map((player, index) => {
                    let value = CardData[player.hand[0]].value;
                    let num_counts = player.cards_played.filter((card) => card == Card.COUNT).length;

                    return {
                        index: index,
                        name: player.name,
                        total: value + num_counts,
                        card: player.hand[0],
                        value: value,
                        counts: num_counts,
                        card_sum: player.cards_played.reduce((sum: number, card: Card) => sum + CardData[card].value, 0),
                    };
                })
                .sort((p1, p2) => p2.total - p1.total || p2.card_sum - p1.card_sum);

            this.add_game_message(GameMessageType.OUT_OF_CARDS);
            if (card_values[0].total == card_values[1].total) {
                this.game_messages.push(...card_values.map((val) => new GameMessage(GameMessageType.CARD_VALUE, val.name, val.card, val.value, val.counts, val.card_sum)));
            } else {
                this.game_messages.push(...card_values.map((val) => new GameMessage(GameMessageType.CARD_VALUE, val.name, val.card, val.value, val.counts)));
            }

            if (card_values[0].card == Card.BISHOP && card_values[1].card == Card.PRINCESS) {
                // Princess beats the bishop at the end of the round
                // Note that this gives victory to the bishop in the very
                // unlikely case where the bishop ties a countess + two counts,
                // and has a greater total value of played cards, which is not
                // covered in the rules
                this.score(card_values[1].index);
                this.add_game_message(GameMessageType.PRINCESS_BISHOP, card_values[1].name, this.players[card_values[1].index].score);
                this.active_player = card_values[1].index;
            } else {
                for (let [index, score_info] of card_values.entries()) {
                    if (index == 0 || (score_info.total == card_values[0].total && score_info.card_sum == card_values[0].card_sum)) {
                        this.score(score_info.index);
                        if (index == 0) {
                            this.add_game_message(GameMessageType.HIGH_VALUE, score_info.name, this.players[score_info.index].score);
                        } else {
                            this.add_game_message(GameMessageType.TIED_VALUE, score_info.name, this.players[score_info.index].score);
                        }

                        let jester = this.players[score_info.index].jester_token;
                        if (jester >= 0) {
                            this.score(jester);
                            this.add_game_message(GameMessageType.JESTER_CORRECT, this.players[jester].name, score_info.name, this.players[jester].score);
                        }
                    } else {
                        this.active_player = card_values[Math.floor(Math.random() * index)].index;
                        break;
                    }
                }
            }

            this.round_over = true;
        }

        let winning_players = this.players.filter((player) => player.score >= this.winning_score);
        if (winning_players.length == 1) {
            this.add_game_message(GameMessageType.GAME_WIN, winning_players[0].name);
            this.game_over = true;
            return;
        } else if (winning_players.length > 1 && this.round_over) {
            this.add_game_message(GameMessageType.GAME_TIE, ...winning_players.map((player) => player.name));
            this.winning_score = winning_players.reduce((max, player) => (player.score > max ? player.score : max), 0) + 1;
            this.start_round(winning_players);
            return;
        }

        if (this.round_over) {
            this.start_round();
        } else {
            this.start_turn();
        }
    }

    public get_individual_game_data(): [string, PublicGameState][] {
        return this.players.map((player, index) => {
            let state = {
                players: this.players.map((player) => ({
                    name: player.name,
                    score: player.score,
                    out: player.out,
                    cards_played: player.cards_played,
                    jester_token: player.jester_token >= 0,
                })),
                is_active_player: index == this.active_player,
                is_bishop_player: index == this.bishop_player,
                hand: player.hand,
                known_cards: player.known_cards,
                sycophant_player: this.sycophant_player,
                cards: this.cards,
                faceup_cards: this.faceup_cards,
                deck_size: this.deck.length,
                game_messages: this.game_messages,
            };

            return [player.connection_id, state];
        });
    }
}
