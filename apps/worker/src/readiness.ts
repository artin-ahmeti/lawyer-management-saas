/** A successful DB poll alone cannot establish that the queue consumer is available. */
export async function pollWithReadiness(
  poll: () => Promise<void>,
  consumerAvailable: () => boolean,
  publish: () => Promise<void>,
) {
  await poll();
  if (consumerAvailable()) await publish();
}
