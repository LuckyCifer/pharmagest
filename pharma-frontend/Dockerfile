FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_PHARMACIE_NOM
ARG VITE_PHARMACIE_ADRESSE
ARG VITE_PHARMACIE_TEL
ARG VITE_PHARMACIE_NIU
ARG VITE_PHARMACIE_RCCM
RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
