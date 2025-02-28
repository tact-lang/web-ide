FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-engines
COPY . .

ARG REACT_APP_PROXY_KEY=redacted_proxy_key
ARG REACT_APP_MIXPANEL_TOKEN=redacted_mixpanel_token
ARG REACT_APP_ANALYTICS_ENABLED=false

RUN NEXT_PUBLIC_PROXY_KEY=${NEXT_PUBLIC_PROXY_KEY} \
    NEXT_PUBLIC_MIXPANEL_TOKEN=${NEXT_PUBLIC_MIXPANEL_TOKEN} \
    NEXT_PUBLIC_ANALYTICS_ENABLED=${NEXT_PUBLIC_ANALYTICS_ENABLED} \
    npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
