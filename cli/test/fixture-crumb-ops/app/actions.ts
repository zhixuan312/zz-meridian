'use server';
import { revalidatePath } from 'next/cache';
import { deleteOrder, setStatus, type OrderStatus } from '@/lib/api';

export async function removeOrder(id: string) {
  await deleteOrder(id);
  revalidatePath('/orders');
}
export async function changeStatus(id: string, status: OrderStatus) {
  await setStatus(id, status);
  revalidatePath('/orders');
  revalidatePath(`/orders/${id}`);
}
