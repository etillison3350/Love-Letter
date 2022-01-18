export enum Card {
    GUARD = 1,
    PRIEST,
    BARON,
    HANDMAID,
    PRINCE,
    KING,
    COUNTESS,
    PRINCESS,

    ASSASSIN = 10,
    JESTER,
    CARDINAL,
    BARONESS,
    SYCOPHANT,
    COUNT,
    CONSTABLE,
    DOWAGER_QUEEN,
    BISHOP,
}

export const CardData: {[key: number]: {name: string; value: number; description: string}} = {
    [Card.GUARD]: {name: "Guard", value: 1, description: "Name a number other than 1 and choose another player. If they have that number in their hand, they are knocked out of the round."},
    [Card.PRIEST]: {name: "Priest", value: 2, description: "Look at another player's hand."},
    [Card.BARON]: {name: "Baron", value: 3, description: "You and another player secretly compare hands. The player with the lower value is out of the round."},
    [Card.HANDMAID]: {name: "Handmaid", value: 4, description: "Until your next turn, ignore all effects from other players' cards."},
    [Card.PRINCE]: {name: "Prince", value: 5, description: "Choose any player including yourself to discard their hand and draw a new card."},
    [Card.KING]: {name: "King", value: 6, description: "Trade hands with another player of your choice."},
    [Card.COUNTESS]: {name: "Countess", value: 7, description: "If you have this card and the King or Prince in your hand, you must discard this card."},
    [Card.PRINCESS]: {name: "Princess", value: 8, description: "If you discard this card, you are out of the round."},
    [Card.ASSASSIN]: {
        name: "Assassin",
        value: 0,
        description: "If you have this card in your hand when another player chooses you as part of a Guard's effect, they are knocked out of the round and you are not. Discard this card and draw a new card.",
    },
    [Card.JESTER]: {name: "Jester", value: 0, description: "Choose another player. Give them a Jester token. If they win this round, you gain an Affection Token."},
    [Card.CARDINAL]: {name: "Cardinal", value: 2, description: "Choose two players. They must trade hands. Look at one of their hands."},
    [Card.BARONESS]: {name: "Baroness", value: 3, description: "Choose one or two other players. Look at their hands."},
    [Card.SYCOPHANT]: {name: "Sycophant", value: 4, description: "Choose any player. If the next card played has an effect that requires one or more players to be chosen, they must be one of them."},
    [Card.COUNT]: {name: "Count", value: 5, description: "If this card is in your discard pile at the end of the round, add 1 to the number of the card in your hand. Resolve ties normally."},
    [Card.CONSTABLE]: {name: "Constable", value: 6, description: "If this card is in your discard pile when you are knocked out of the round, gain an Affection Token."},
    [Card.DOWAGER_QUEEN]: {name: "Dowager Queen", value: 7, description: "Choose another player. You secretly compare hands with them. The player with the higher number is out of the round."},
    [Card.BISHOP]: {
        name: "Bishop",
        value: 9,
        description:
            "Name a number other than 1 and choose another player. If they have that number in their hand, gain an Affection Token. They may discard their hand and draw a new card. The Princess beats the Bishop at the end of the round.",
    },
};

export const CardChoices: {[key: number]: {targets: number; max_targets: number; can_target_self: boolean; additional_choice: string}} = {
    [Card.GUARD]: {targets: 1, max_targets: 1, can_target_self: false, additional_choice: "card_number"},
    [Card.PRIEST]: {targets: 1, max_targets: 1, can_target_self: false, additional_choice: "none"},
    [Card.BARON]: {targets: 1, max_targets: 1, can_target_self: false, additional_choice: "none"},
    [Card.HANDMAID]: {targets: 0, max_targets: 0, can_target_self: false, additional_choice: "none"},
    [Card.PRINCE]: {targets: 1, max_targets: 1, can_target_self: true, additional_choice: "none"},
    [Card.KING]: {targets: 1, max_targets: 1, can_target_self: false, additional_choice: "none"},
    [Card.COUNTESS]: {targets: 0, max_targets: 0, can_target_self: false, additional_choice: "none"},
    [Card.PRINCESS]: {targets: 0, max_targets: 0, can_target_self: false, additional_choice: "none"},
    [Card.ASSASSIN]: {targets: 0, max_targets: 0, can_target_self: false, additional_choice: "none"},
    [Card.JESTER]: {targets: 1, max_targets: 1, can_target_self: false, additional_choice: "none"},
    [Card.CARDINAL]: {targets: 2, max_targets: 2, can_target_self: true, additional_choice: "selected_player"},
    [Card.BARONESS]: {targets: 1, max_targets: 2, can_target_self: false, additional_choice: "none"},
    [Card.SYCOPHANT]: {targets: 1, max_targets: 1, can_target_self: true, additional_choice: "none"},
    [Card.COUNT]: {targets: 0, max_targets: 0, can_target_self: false, additional_choice: "none"},
    [Card.CONSTABLE]: {targets: 0, max_targets: 0, can_target_self: false, additional_choice: "none"},
    [Card.DOWAGER_QUEEN]: {targets: 1, max_targets: 1, can_target_self: false, additional_choice: "none"},
    [Card.BISHOP]: {targets: 1, max_targets: 1, can_target_self: false, additional_choice: "card_number"},
};

export interface PublicGameState {
    players: {
        name: string;
        score: number;
        out: boolean;
        cards_played: Card[];
        jester_token: boolean;
    }[];
    is_active_player: boolean;
    is_bishop_player: boolean;
    hand: [Card] | [Card, Card];
    known_cards: Card[][];
    sycophant_player: number;
    cards: Card[];
    faceup_cards: Card[];
    deck_size: number;
    game_messages: GameMessage[];
}

export enum GameMessageType {
    CARD_PLAY,
    CARD_UNPLAYABLE,
    GUARD_GUESS,
    GUARD_CORRECT,
    GUARD_ASSASSIN,
    BARON_COMPARE,
    CARDINAL_REVEAL,
    DOWAGER_COMPARE,
    BISHOP_GUESS,
    BISHOP_CORRECT,

    PRINCESS_DISCARD,

    LAST_REMAINING,
    CONSTABLE_OUT,
    JESTER_CORRECT,

    OUT_OF_CARDS,
    CARD_VALUE,
    HIGH_VALUE,
    TIED_VALUE,
    PRINCESS_BISHOP,

    PLAYER_CONNECT,
    PLAYER_DISCONNECT,

    GAME_WIN,
    GAME_TIE,
}

export class GameMessage {
    type: GameMessageType;
    args: any[];

    constructor(type: GameMessageType, ...args: any[]) {
        this.type = type;
        this.args = args;
    }

    public toString(): string {
        switch (this.type) {
            case GameMessageType.CARD_PLAY:
                if (this.args.length > 2) {
                    return `{{player:${this.args[0]}}} played {{card:${this.args[1]}}}`;
                } else {
                    return (
                        `{{player:${this.args[0]}}} played {{card:${this.args[1]}}}, choosing ` +
                        this.args
                            .slice(2)
                            .map((target) => `{{player:${target}}}`)
                            .join(" and ")
                    );
                }
            case GameMessageType.CARD_UNPLAYABLE:
                return `{{player:${this.args[0]}}} played {{card:${this.args[1]}}}, but couldn't choose enough players for its effect.`;
            case GameMessageType.GUARD_GUESS:
                return `\t{{player:${this.args[0]}}} guessed {{card_number:${this.args[1]}}}`;
            case GameMessageType.GUARD_CORRECT:
                return `\t{{player:${this.args[0]}}} had {{card:${this.args[1]}}} and is out!`;
            case GameMessageType.GUARD_ASSASSIN:
                return `\t{{player:${this.args[0]}}} had the {{card:${Card.ASSASSIN}}}. {{player:${this.args[1]}}} is out!`;
            case GameMessageType.BARON_COMPARE:
                return `\t{{player:${this.args[0]}}} had the lower-valued card (a {{card:${this.args[1]}}}) and is out!`;
            case GameMessageType.CARDINAL_REVEAL:
                return `\t{{player:${this.args[0]}}} looked at {{player:${this.args[1]}}}'s hand`;
            case GameMessageType.DOWAGER_COMPARE:
                return `\t{{player:${this.args[0]}}} had the higher-valued card (a {{card:${this.args[1]}}}) and is out!`;
            case GameMessageType.BISHOP_GUESS:
                return `\t{{player:${this.args[0]}}} guessed {{card_number:${this.args[1]}}}`;
            case GameMessageType.BISHOP_CORRECT:
                return `\t{{player:${this.args[0]}}} has {{card:${this.args[1]}}}. {{player:${this.args[2]}}} gains an Affection Token (${this.args[3]} total)`;

            case GameMessageType.PRINCESS_DISCARD:
                return `\t{{player:${this.args[0]}}} discarded the {{card:${Card.PRINCESS}}} and is out!`;

            case GameMessageType.LAST_REMAINING:
                return `{{player:${this.args[0]}}} is the last player left in the round, and gains an Affection Token (${this.args[2]} total)!`;
            case GameMessageType.JESTER_CORRECT:
                return `{{player:${this.args[0]}}} chose {{player:${this.args[1]}}} with the {{card:${Card.JESTER}}} and also gains an Affection Token (${this.args[2]} total)!`;
            case GameMessageType.CONSTABLE_OUT:
                return `{{player:${this.args[0]}}} had the {{card:${Card.CONSTABLE}}} and gains an Affection Token (${this.args[1]} total)!`;

            case GameMessageType.OUT_OF_CARDS:
                return `No cards left to draw! Final card values:`;
            case GameMessageType.CARD_VALUE:
                return (
                    `\t{{player:${this.args[0]}}} has the {{card:${this.args[1]}}} ` +
                    (this.args[3] > 0 ? `(${this.args[2]} + ${this.args[3]} = ${this.args[2] + this.args[3]})` : `(${this.args[2]})`) +
                    (this.args.length > 4 ? `, with ${this.args[4]} total value of cards discarded` : ``)
                );
            case GameMessageType.HIGH_VALUE:
                return `{{player:${this.args[0]}}} has the highest value card and gains an Affection Token (${this.args[1]} total)!`;
            case GameMessageType.TIED_VALUE:
                return `{{player:${this.args[0]}}} is tied for the highest value, and also gains an Affection Token (${this.args[1]} total)!`;
            case GameMessageType.PRINCESS_BISHOP:
                return `{{player:${this.args[0]}}}'s {{card:${Card.PRINCESS}}} beats the {{card:${Card.BISHOP}}}. {{player:${this.args[0]}}} gains an Affection Token (${this.args[1]} total).`;

            case GameMessageType.PLAYER_CONNECT:
                return `{{player:${this.args[0]}}} joined the game.`;
            case GameMessageType.PLAYER_DISCONNECT:
                return `{{player:${this.args[0]}}} left the game.`;

            case GameMessageType.GAME_WIN:
                return `{{player:${this.args[0]}}} wins the game!`;
            case GameMessageType.GAME_TIE:
                return this.args.map((player) => `{{player:${player}}}`).join(" and ") + "are tied!";
        }
    }
}
