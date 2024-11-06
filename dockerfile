FROM node:20

WORKDIR /home/app

COPY package*.json .
COPY yarn.lock yarn.lock
COPY grovyo-89dc2-firebase-adminsdk-pwqju-41deeae515.json grovyo-89dc2-firebase-adminsdk-pwqju-41deeae515.json
COPY models models
COPY index.js index.js

RUN npm install

ENTRYPOINT [ "npm","start" ]