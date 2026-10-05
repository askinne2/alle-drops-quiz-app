FROM node:20.19-alpine
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# No glob: a missing lockfile must fail the build loudly.
COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .

RUN npx prisma generate && npm run build && npm run build:theme

# Cloud Run injects PORT=8080; react-router-serve reads it.
EXPOSE 8080

USER node

CMD ["npm", "run", "start"]
