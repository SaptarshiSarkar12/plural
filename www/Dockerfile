FROM node:16.15-slim as build

WORKDIR /app

COPY package.json ./package.json
COPY yarn.lock ./yarn.lock
COPY .yarn ./.yarn
COPY .yarnrc.yml ./.yarnrc.yml

RUN yarn install --immutable

COPY . ./

RUN yarn run build

# production environment
FROM nginxinc/nginx-unprivileged:1.21.6-alpine

WORKDIR /usr/share/nginx/html
# Copy static assets from builder stage
COPY --from=builder /app/build .

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "cd /usr/share/nginx/html/ && nginx -g 'daemon off;'"]
