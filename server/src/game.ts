import { Card, CardChoices, CardData } from "../../data/data";

type PlayerInfo = {
    name: string,
    score: number,
    hand: [Card] | [Card, Card],
    out: boolean,
    cards_played: Card[],
    known_cards: Card[][],
    jester_token: number
};

export class Game
{
    private players: PlayerInfo[];
    private active_player = 0;

    private bishop_player = -1;
    private sycophant_player = -1;

    private cards: Card[];
    private deck: Card[];
    private facedown_card: Card;
    private faceup_cards: Card[];

    private game_messages: string[];

    private round_over: boolean;

    constructor() {
        this.reset_game();
    }

    public reset_game(): void
    {
        for (let player of this.players)
        {
            player.score = 0;
        }

        this.active_player = 0;

        this.game_messages = [];
    }

    public reset_round(): void
    {
        // Reconstruct the deck
        this.deck = [
            Card.GUARD, Card.GUARD,
            Card.GUARD, Card.GUARD,
            Card.GUARD, Card.PRIEST,
            Card.PRIEST, Card.BARON,
            Card.BARON, Card.HANDMAID,
            Card.HANDMAID, Card.PRINCE,
            Card.PRINCE, Card.KING,
            Card.COUNTESS, Card.PRINCESS
        ];

        if (this.players.length > 4)
        {
            this.deck.push(
                Card.GUARD, Card.GUARD,
                Card.GUARD, Card.ASSASSIN,
                Card.JESTER, Card.CARDINAL,
                Card.CARDINAL, Card.BARONESS,
                Card.BARONESS, Card.SYCOPHANT,
                Card.SYCOPHANT, Card.COUNT,
                Card.COUNT, Card.CONSTABLE,
                Card.DOWAGER_QUEEN, Card.BISHOP
            )
        }

        this.cards = [...new Set(this.cards).values()];

        // Fisher-Yates shuffle; reference: https://stackoverflow.com/a/12646864
        for (let i = this.deck.length - 1; i >= 0; i--)
        {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }

        this.facedown_card = this.deck.pop();
        if (this.players.length == 2)
        {
            this.faceup_cards = [this.deck.pop(), this.deck.pop(), this.deck.pop()];
        }
        else
        {
            this.faceup_cards = []
        }

        for (let player of this.players)
        {
            player.hand = [this.deck.pop()];
            player.out = false;
            player.cards_played = [];
            player.known_cards = this.players.map(_ => []);
            player.jester_token = -1;
        }

        this.bishop_player = -1;
        this.sycophant_player = -1;

        this.round_over = false;
    }

    public start_turn()
    {
        this.draw_card(this.active_player);
    }

    public make_choice(chosen_card: Card, targets: number[], additional_choice?: any): boolean
    {
        const current_player = this.players[this.active_player];

        if (current_player.hand.length != 2)
        {   // start_turn first
            return false;
        }

        if (!current_player.hand.includes(chosen_card))
        {   // Can't play a card that's not in hand
            return false;
        }

        if ((chosen_card == Card.PRINCE || chosen_card == Card.KING) && current_player.hand.includes(Card.COUNTESS))
        {   // Can't play the Prince or King with Countess in hand
            return false;
        }

        if (new Set(targets).size != targets.length)
        {   // Can't target the same player twice
            return false;
        }

        if (targets.length < CardChoices[chosen_card].targets || targets.length > CardChoices[chosen_card].max_targets)
        {   // Can't target the wrong number of players
            return false;
        }

        if (this.sycophant_player >= 0 && targets.length > 0 && !targets.includes(this.sycophant_player))
        {   // The target of the sycophant must be targetted, if possible
            return false;
        }

        for (let target of targets)
        {
            if (target != this.active_player && this.players[target].cards_played[this.players[target].cards_played.length - 1] == Card.HANDMAID)
            {   // Players who have played a handmaid can't be targeted
                return false;
            }
        }

        if (CardChoices[chosen_card].additional_choice == 'none' && additional_choice)
        {   // Too many additional choices supplied
            return false;
        }

        if (CardChoices[chosen_card].additional_choice == 'card_number' && !Number.isInteger(additional_choice))
        {   // Expected a card number
            return false;
        }

        if (CardChoices[chosen_card].additional_choice == 'selected_player' && (!Number.isInteger(additional_choice) || !targets.includes(additional_choice)))
        {   // Expected one of the selected targets
            return false;
        }

        this.discard(this.active_player, chosen_card);

        this.sycophant_player = -1;

        if (targets.length == 0)
        {
            this.game_messages.push(`{{player:${this.active_player}}} played {{card:${chosen_card}}}`)
        }
        else
        {
            this.game_messages.push(`{{player:${this.active_player}}} played {{card:${chosen_card}}}, choosing ` + targets.map(target => `{{player:${target}}}`).join(' and '));
        }

        switch (chosen_card)
        {
            case Card.GUARD:
                if (this.players[targets[0]].hand[0] == Card.ASSASSIN)
                {
                    this.game_messages.push(`\t{{player:${targets[0]}}} had the {{card:${Card.ASSASSIN}}}. {{player:${this.active_player}}} is out!`);
                    this.knock_out(this.active_player);
                    this.discard(targets[0]);
                    this.draw_card(targets[0]);
                }
                else
                {
                    this.game_messages.push(`\t{{player:${this.active_player}}} guessed {{card_number:${additional_choice}}}`);
                    if (additional_choice == CardData[this.players[targets[0]].hand[0]].value)
                    {
                        this.game_messages.push(`\t{{player:${targets[0]}}} had {{card:${this.players[targets[0]].hand[0]}}} and is out!`)
                        this.knock_out(targets[0]);
                    }
                }
                break;
            case Card.PRIEST:
                this.reveal_hand(this.active_player, targets[0]);
                break;
            case Card.BARON:
                if (CardData[current_player.hand[0]].value > CardData[this.players[targets[0]].hand[0]].value)
                {
                    this.game_messages.push(`\t{{player:${targets[0]}}} had the lower-valued card (a {{card:${this.players[targets[0]].hand[0]}}}) and is out!`);
                    this.knock_out(targets[0]);
                }
                else if (CardData[current_player.hand[0]].value > CardData[this.players[targets[0]].hand[0]].value)
                {
                    this.game_messages.push(`\t{{player:${this.active_player}}} had the lower-valued card (a {{card:${current_player.hand[0]}}}) and is out!`);
                    this.knock_out(this.active_player);
                }
                break;
            case Card.HANDMAID:
                break;
            case Card.PRINCE:
                if (this.discard(targets[0]) != Card.PRINCESS)
                {
                    this.draw_card(targets[0]);
                }
                break;
            case Card.KING:
                [current_player.hand, this.players[targets[0]].hand] = [this.players[targets[0]].hand, current_player.hand];
                for (let player of this.players)
                {
                    [player.known_cards[this.active_player], player.known_cards[targets[0]]] = [player.known_cards[targets[0]], player.known_cards[this.active_player]];
                }
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
                this.players[targets[0]].jester_token = this.active_player;
                break;
            case Card.CARDINAL:
                [this.players[targets[0]].hand, this.players[targets[1]].hand] = [this.players[targets[1]].hand, this.players[targets[0]].hand];
                for (let player of this.players)
                {
                    [player.known_cards[targets[0]], player.known_cards[targets[1]]] = [player.known_cards[targets[1]], player.known_cards[targets[0]]];
                }
                this.reveal_hand(targets[0], targets[1]);
                this.reveal_hand(targets[1], targets[0]);
                this.game_messages.push(`\t{{player:${this.active_player}}} looked at {{player:${additional_choice}}}'s hand`);
                this.reveal_hand(this.active_player, additional_choice);
                break;
            case Card.BARONESS:
                for (let target of targets)
                {
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
                if (CardData[current_player.hand[0]].value < CardData[this.players[targets[0]].hand[0]].value)
                {
                    this.game_messages.push(`\t{{player:${targets[0]}}} had the higher-valued card (a {{card:${this.players[targets[0]].hand[0]}}}) and is out!`);
                    this.knock_out(targets[0]);
                }
                else if (CardData[current_player.hand[0]].value < CardData[this.players[targets[0]].hand[0]].value)
                {
                    this.game_messages.push(`\t{{player:${this.active_player}}} had the higher-valued card (a {{card:${current_player.hand[0]}}}) and is out!`);
                    this.knock_out(this.active_player);
                }
                break;
            case Card.BISHOP:
                this.game_messages.push(`\t{{player:${this.active_player}}} guessed {{card_number:${additional_choice}}}`);
                if (additional_choice == CardData[this.players[targets[0]].hand[0]].value)
                {
                    this.game_messages.push(`\t{{player:${targets[0]}}} has {{card:${this.players[targets[0]].hand[0]}}}. {{player:${this.active_player}}} gains an Affection Token`);
                    this.bishop_player = targets[0];
                    this.score(this.active_player);

                    // Do not go on to the next turn; we need to wait for the chosen player to decide whether or not to discard their card.
                    return true;
                }
                break;
        }

        this.next_turn();

        return true;
    }

    public make_bishop_choice(discard: boolean)
    {
        if (discard && this.discard(this.bishop_player) != Card.PRINCESS)
        {
            this.draw_card(this.bishop_player);
        }
        this.bishop_player = -1;
        this.next_turn();
    }

    private discard(player_index: number, card?: Card): Card
    {
        const player = this.players[player_index];

        if (!card)
        {
            card = player.hand[0];
        }

        const card_index = player.hand.indexOf(card);
        player.hand.splice(card_index, 1);
        player.cards_played.push(card);

        if (card == Card.PRINCESS)
        {
            this.game_messages.push(`\t{{player:${player_index}}} discarded the {{card:${Card.PRINCESS}}} and is out!`);
            this.knock_out(player_index);
        }

        for (let player of this.players)
        {
            const known_cards = player.known_cards[player_index];
            const known_index = known_cards.indexOf(card);
            if (known_index >= 0)
            {
                known_cards.splice(known_index, 1);
            }
        }

        return card;
    }

    private reveal_hand(observer: number, observed: number)
    {
        this.players[observer].known_cards[observed].push(...this.players[observed].hand);
    }

    private draw_card(player: number)
    {
        if (this.deck.length > 0)
        {
            this.players[player].hand.push(this.deck.pop());
        }
        else
        {
            this.players[player].hand.push(this.facedown_card);
        }
    }

    private knock_out(player_index: number)
    {
        const player = this.players[player_index];
        player.out = true;

        if (player.cards_played.includes(Card.CONSTABLE))
        {
            this.score(player_index);
        }

        player.cards_played.push(...player.hand);
        player.hand = null;

        let remaining_player = null;
        for (let [index, player] of this.players.entries())
        {
            if (!player.out)
            {
                if (remaining_player == null)
                {
                    remaining_player = index;
                }
                else
                {
                    remaining_player = null;
                    break;
                }
            }
        }

        if (remaining_player != null)
        {   // Round is over, score points
            this.round_over = true;

            this.game_messages.push(`{{player:${remaining_player}}} is the last player left in the round, and gains an Affection Token!`);
            this.score(remaining_player);
            let jester = this.players[remaining_player].jester_token;
            if (jester >= 0)
            {
                this.game_messages.push(`{{player:${jester}}} chose {{player:${remaining_player}}} with the {{card:${Card.JESTER}}} and also gains an Affection Token!`);
                this.score(jester);
            }

            this.active_player = remaining_player;
        }
    }

    private score(player: number)
    {
        this.players[player].score++;
    }

    private next_turn()
    {
        if (this.deck.length == 0)
        {   // No cards left to draw, round is over. Score points
            let card_values = this.players.filter(player => !player.out).map((player, index) => {
                let value = CardData[player.hand[0]].value;
                let num_counts = player.cards_played.filter(card => card == Card.COUNT).length;

                return {
                    index: index,
                    total: value + num_counts,
                    card: player.hand[0],
                    value: value,
                    counts: num_counts,
                    card_sum: player.cards_played.reduce((sum: number, card: Card) => sum + CardData[card].value, 0)
                };
            }).sort((p1, p2) => (p2.total - p1.total) || (p2.card_sum - p1.card_sum));

            this.game_messages.push(`No cards left to draw! Final card values:`);
            if (card_values[0].total == card_values[1].total)
            {
                this.game_messages.push(...card_values.map(val => `\t{{player:${val.index}}} has the {{card:${val.card}}} (${val.counts > 0 ? `${val.value} + ${val.counts} = ` : ''}${val.total}), with ${val.card_sum} total value of cards discarded`));
            }
            else
            {
                this.game_messages.push(...card_values.map(val => `\t{{player:${val.index}}} has the {{card:${val.card}}} (${val.counts > 0 ? `${val.value} + ${val.counts} = ` : ''}${val.total})`));
            }

            if (card_values[0].card == Card.BISHOP && card_values[1].card == Card.PRINCESS)
            {   // Princess beats the bishop at the end of the round
                // Note that this gives victory to the bishop in the very
                // unlikely case where the bishop ties a countess + two counts,
                // and has a greater total value of played cards, which is not
                // covered in the rules
                this.score(card_values[1].index);
                this.game_messages.push(`{{player:${card_values[1].index}}}'s {{card:${Card.PRINCESS}}} beats the {{card:${Card.BISHOP}}}. {{player:${card_values}}} gains an Affection Token.`);
                this.active_player = card_values[1].index;
            }
            else
            {
                for (let [index, score_info] of card_values.entries())
                {
                    if (index == 0 || (score_info.total == card_values[0].total && score_info.card_sum == card_values[0].card_sum))
                    {
                        this.score(score_info.index);
                        if (index == 0)
                        {
                            this.game_messages.push(`{{player:${score_info.index}}} has the highest value card and gains an Affection Token!`);
                        }
                        else
                        {
                            this.game_messages.push(`{{player:${score_info.index}}} is tied for the highest value, and also gains an Affection Token!`);
                        }
                    }
                    else
                    {
                        this.active_player = card_values[Math.floor(Math.random() * index)].index;
                        break;
                    }
                }
            }
        }
    }
}