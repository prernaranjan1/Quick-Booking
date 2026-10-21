// Snack menu. Prices in whole rupees; the server always uses these prices.
export const SNACKS = [
    { id: 'popcorn', name: 'Popcorn', price: 120, emoji: '🍿' },
    { id: 'cold-drink', name: 'Cold Drink', price: 40, emoji: '🥤' },
    { id: 'combo', name: 'Combo Pack', price: 150, emoji: '🎁' },
    { id: 'nachos', name: 'Nachos', price: 80, emoji: '🧀' },
    { id: 'candy', name: 'Candy Mix', price: 50, emoji: '🍬' },
    { id: 'hot-dog', name: 'Hot Dog', price: 100, emoji: '🌭' }
];

export const MAX_SNACK_QUANTITY = 20;

export const getSnack = (id) => SNACKS.find((snack) => snack.id === id);
