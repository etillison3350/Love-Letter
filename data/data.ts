export enum Card
{
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
    BISHOP
}

export const CardData: {[key: number]: {name: string, value: number, description: string}} = {
    [Card.GUARD]: {name: 'Guard', value: 1, description: 'Name a number other than 1 and choose another player. If they have that number in their hand, they are knocked out of the round.'},
    [Card.PRIEST]: {name: 'Priest', value: 2, description: 'Look at another player\'s hand.'},
    [Card.BARON]: {name: 'Baron', value: 3, description: 'You and another player secretly compare hands. The player with the lower value is out of the round.'},
    [Card.HANDMAID]: {name: 'Handmaid', value: 4, description: 'Until your next turn, ignore all effects from other players\' cards.'},
    [Card.PRINCE]: {name: 'Prince', value: 5, description: 'Choose any player including yourself to discard their hand and draw a new card.'},
    [Card.KING]: {name: 'King', value: 6, description: 'Trade hands with another player of your choice.'},
    [Card.COUNTESS]: {name: 'Countess', value: 7, description: 'If you have this card and the King or Prince in your hand, you must discard this card.'},
    [Card.PRINCESS]: {name: 'Princess', value: 8, description: 'If you discard this card, you are out of the round.'},
    [Card.ASSASSIN]: {name: 'Assassin', value: 0, description: 'If you have this card in your hand when another player chooses you as part of a Guard\'s effect, they are knocked out of the round and you are not. Discard this card and draw a new card.'},
    [Card.JESTER]: {name: 'Jester', value: 0, description: 'Choose another player. Give them a Jester token. If they win this round, you gain an Affection Token.'},
    [Card.CARDINAL]: {name: 'Cardinal', value: 2, description: 'Choose two players. They must trade hands. Look at one of their hands.'},
    [Card.BARONESS]: {name: 'Baroness', value: 3, description: 'Choose one or two other players. Look at their hands.'},
    [Card.SYCOPHANT]: {name: 'Sycophant', value: 4, description: 'Choose any player. If the next card played has an effect that requires one or more players to be chosen, they must be one of them.'},
    [Card.COUNT]: {name: 'Count', value: 5, description: 'If this card is in your discard pile at the end of the round, add 1 to the number of the card in your hand. Resolve ties normally.'},
    [Card.CONSTABLE]: {name: 'Constable', value: 6, description: 'If this card is in your discard pile when you are knocked out of the round, gain an Affection Token.'},
    [Card.DOWAGER_QUEEN]: {name: 'Dowager Queen', value: 7, description: 'Choose another player. You secretly compare hands with them. The player with the higher number is out of the round.'},
    [Card.BISHOP]: {name: 'Bishop', value: 9, description: 'Name a number other than 1 and choose another player. If they have that number in their hand, gain an Affection Token. They may discard their hand and draw a new card. The Princess beats the Bishop at the end of the round.'},
}

export const CardChoices: {[key: number]: {targets: number, max_targets: number, can_target_self: boolean, additional_choice: string}} = {
    [Card.GUARD]: {targets: 1, max_targets: 1, can_target_self: false, additional_choice: 'card_number'},
    [Card.PRIEST]: {targets: 1, max_targets: 1, can_target_self: false, additional_choice: 'none'},
    [Card.BARON]: {targets: 1, max_targets: 1, can_target_self: false, additional_choice: 'none'},
    [Card.HANDMAID]: {targets: 0, max_targets: 0, can_target_self: false, additional_choice: 'none'},
    [Card.PRINCE]: {targets: 1, max_targets: 1, can_target_self: true, additional_choice: 'none'},
    [Card.KING]: {targets: 1, max_targets: 1, can_target_self: false, additional_choice: 'none'},
    [Card.COUNTESS]: {targets: 0, max_targets: 0, can_target_self: false, additional_choice: 'none'},
    [Card.PRINCESS]: {targets: 0, max_targets: 0, can_target_self: false, additional_choice: 'none'},
    [Card.ASSASSIN]: {targets: 0, max_targets: 0, can_target_self: false, additional_choice: 'none'},
    [Card.JESTER]: {targets: 1, max_targets: 1, can_target_self: false, additional_choice: 'none'},
    [Card.CARDINAL]: {targets: 2, max_targets: 2, can_target_self: true, additional_choice: 'selected_player'},
    [Card.BARONESS]: {targets: 1, max_targets: 2, can_target_self: false, additional_choice: 'none'},
    [Card.SYCOPHANT]: {targets: 1, max_targets: 1, can_target_self: true, additional_choice: 'none'},
    [Card.COUNT]: {targets: 0, max_targets: 0, can_target_self: false, additional_choice: 'none'},
    [Card.CONSTABLE]: {targets: 0, max_targets: 0, can_target_self: false, additional_choice: 'none'},
    [Card.DOWAGER_QUEEN]: {targets: 1, max_targets: 1, can_target_self: false, additional_choice: 'none'},
    [Card.BISHOP]: {targets: 1, max_targets: 1, can_target_self: false, additional_choice: 'card_number'}
}
