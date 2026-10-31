/** Порог «крупной покупки» — одна трата от этой суммы в рублях. */
export const BIG_PURCHASE_RUB = 10_000
export const isBig = (rub: number) => -rub >= BIG_PURCHASE_RUB
