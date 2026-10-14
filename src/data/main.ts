/** A read that throws is missing, not zero: a part of a page, the history a title is worked out from, the services a title names. */
export async function attempt<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}
