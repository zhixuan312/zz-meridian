# Crumb & Co ops

The internal console our three shops use for click-and-collect cake orders. It reads our orders API (`API_URL` in `.env`).

- `/` today at a glance
- `/orders` every order, filter by status, delete a cancelled one
- `/orders/[id]` one order; mark it ready or collected
- `/shops` the three shops

`pnpm dev` and open http://localhost:3000.
