# Strava Glass

Rôle : Tu es un développeur Full-Stack expert en Node.js, interfaces Web modernes (CSS / UI) et intégrations d'API OAuth2 (Strava).

Objectif : Migrer une architecture HTML/CSS statique vers une application Web Node.js, refondre l'interface avec le design Apple Liquid Glass / Glassmorphism, et intégrer l'API Strava pour afficher les données d'activité en temps réel.

1. Migration de l'Architecture (HTML vers Node.js)

Stack recommandée : Node.js avec Express.js et un moteur de rendu (EJS / Pug) ou une API REST avec des modules ES6.

Structure des fichiers : Organise le projet proprement (/public pour les assets CSS/JS client, /views pour le HTML/EJS, /routes pour l'authentification et les webhooks, /controllers, .env pour les identifiants).

Garde exactement la même structure fonctionnelle et les mêmes éléments HTML d'origine, mais adapte-les pour intégrer les données dynamiques Strava.

2. Design System : Apple Liquid Glass (visionOS / macOS Style)

Refonds intégralement le style CSS avec les caractéristiques visuelles suivantes :

Effet de verre poli / translucide : Utilisation intensive de backdrop-filter: blur(20px) saturate(180%), d'arrière-plans semi-transparents (background: rgba(255, 255, 255, 0.15) ou mode sombre rgba(30, 30, 30, 0.4)).

Bordures et reflets lumineux : Bordures très fines avec dégradé subtil (border: 1px solid rgba(255, 255, 255, 0.2)), ombres douces et diffuses (box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.15)).

Typographie & Animations : Typographie système Apple (-apple-system, BlinkMacSystemFont, SF Pro), animations fluides de survol (transition: all 0.3s ease-in-out), et coins fortement arrondis (border-radius: 20px à 28px).

Fond fluide : Un arrière-plan dynamique avec des formes colorées floutées en mouvement léger pour accentuer l'effet de réfraction du verre.

3. Intégration Strava API & Flux Temps Réel

En te basant sur la documentation officielle Strava ([https://developers.strava.com/docs](https://developers.strava.com/docs)) :

Authentification OAuth 2.0 :

Redirection vers Strava (/authorize avec scopes read,activity:read_all).

Callback pour échanger le code contre un access_token et refresh_token.

Stockage sécurisé des sessions et gestion du rafraîchissement automatique du token expiré via le refresh_token.

Mise à jour en temps réel (Webhooks & Server-Sent Events / WebSockets) :

Configuration d'une route Webhook (POST /webhook) pour écouter les événements de souscription Strava (events de création ou modification d'activité).

Mise en place d'une connexion SSE (Server-Sent Events) ou Socket.io entre le serveur Node.js et le navigateur client pour pousser instantanément les nouvelles activités sur le dashboard sans rechargement de page.

Affichage des données Strava :

Extraction des statistiques clés : Type d'activité, distance (km), temps écoulé, dénivelé positif, vitesse moyenne, puissance, fréquence cardiaque et trace GPX/Polyline si disponible.

Formattage propre des unités et intégration élégante dans les cartes au design Liquid Glass.

4. Livrables attendus

La structure complète de l'application Node.js avec le code serveur (server.js / app.js).

Le fichier CSS complet avec toutes les variables et classes pour l'effet Apple Liquid Glass.

Le code JS client pour la connexion temps réel (WebSockets / SSE) et la mise à jour dynamique du DOM.

Un fichier .env.example contenant les clés nécessaires (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_VERIFY_TOKEN, PORT).

Une explication étape par étape pour configurer l'application chez Strava (Callback URL, Webhook Endpoint).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ca867207-d96f-49b8-a93d-2ed9fc4ec881).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
