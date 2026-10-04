/** The team's data layer: adopt must leave it exactly as it is. */
export type Order = { id: string; customer: string; total: number; status: 'paid' | 'refunded' };

export async function listOrders(): Promise<Order[]> {
  return [
    { id: 'ord_1', customer: 'Northwind', total: 1240, status: 'paid' },
    { id: 'ord_2', customer: 'Halcyon', total: 310, status: 'refunded' },
  ];
}
