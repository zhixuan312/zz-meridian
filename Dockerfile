# The Meridian template and its Design Atlas, the demo behind DEMO_PASSWORD (src/lib/demo-gate.ts), built and served by
# `next start`. Deployed to CapRover from this repository (captain-definition); never part of the zz-meridian package.
# DEMO_PASSWORD is required at run time (App Configs, Environment Variables): the container refuses to start without it.
# master is gated before it is pushed, so the image only builds. Not standalone: the template's next.config.ts and
# pnpm-workspace.yaml ship to every created project, and the Atlas reads its specifications from the source at run time.
FROM node:24-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@11.9.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=80 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app ./
EXPOSE 80
USER node
CMD ["sh", "-c", "[ -n \"$DEMO_PASSWORD\" ] || { echo 'DEMO_PASSWORD is not set; refusing to start without a password' >&2; exit 1; }; exec node_modules/.bin/next start -p 80 -H 0.0.0.0"]
