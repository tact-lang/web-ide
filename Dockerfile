FROM node:21-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ARG NEXT_PUBLIC_PROXY_KEY=redacted_next_public_proxy_key
ARG NEXT_PUBLIC_MIXPANEL_TOKEN=redacted_next_public_mixpanel_token
ARG NEXT_PUBLIC_ANALYTICS_ENABLED=false

RUN NEXT_PUBLIC_PROXY_KEY=${NEXT_PUBLIC_PROXY_KEY} \
    NEXT_PUBLIC_MIXPANEL_TOKEN=${NEXT_PUBLIC_MIXPANEL_TOKEN} \
    NEXT_PUBLIC_ANALYTICS_ENABLED=${NEXT_PUBLIC_ANALYTICS_ENABLED} \
    npm run build


FROM node:21-alpine AS runtime

WORKDIR /app

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package*.json ./

RUN npm install

EXPOSE 3000
CMD ["npm", "start"]
