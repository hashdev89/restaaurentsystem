/**
 * Australian GST (10%) – used across Cart, Checkout, POS, receipts.
 * Product prices in the system are stored ex-GST; GST is added at subtotal level.
 */

export const GST_RATE = 0.1 // 10%

/** Subtotal (ex GST) × (1 + GST_RATE) = total incl GST */
export function addGst(amountExGst: number): number {
  return amountExGst * (1 + GST_RATE)
}

/** GST amount for a given amount ex-GST */
export function gstAmount(amountExGst: number): number {
  return amountExGst * GST_RATE
}

/** Price incl GST for display (e.g. menu price shown to customer) */
export function priceInclGst(priceExGst: number): number {
  return priceExGst * (1 + GST_RATE)
}
