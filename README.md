# Logistique Cédules - Gestionnaire de Conteneurs

Une application web moderne (Progressive Web App) conçue pour la gestion des quais de déchargement, le suivi des conteneurs maritimes/terrestres, et la coordination avec les transporteurs externes.

## 🚀 Fonctionnalités Principales

- **Tableau de Bord Interactif :** Suivi en temps réel des réceptions du jour et indicateurs clés (KPIs) avec tri interactif.
- **Calendrier & Cédulage (Vue Semaine/Mois) :** Planification intuitive des arrivages de conteneurs avec gestion des conflits d'horaires.
- **Portail Transporteur (Self-Service) :** Interface publique permettant aux compagnies de transport de réserver directement leurs créneaux de livraison selon la disponibilité réelle des quais.
- **Assistant IA (QuickFill) :** Remplissage automatique des formulaires à partir de copier-coller de courriels ou d'avis d'arrivée (extraction intelligente des numéros de conteneur, dates LFD et sites).
- **Mode Mobile & PWA :** Optimisé pour l'utilisation sur le terrain (tablettes/téléphones), interface "Touch-friendly" (appui long pour modifier), et installable comme application native (Progressive Web App).
- **Génération de Documents :** Création automatique de rapports d'avaries (OS&D) en PDF et rapports PDF/CSV de la cédule hebdomadaire.
- **Gestion Multi-Sites :** Prise en charge de plusieurs entrepôts (ex: Montréal, Québec) avec gestion individuelle des quais, de leurs horaires et de leurs statuts (Lock, Plaques).
- **Notifications Natives :** Support des notifications Push pour les alertes de réservation et de retards.

## 🛠️ Stack Technique

- **Frontend :** React 19, TypeScript
- **Styling :** Tailwind CSS v4
- **Build Tool :** Vite
- **PWA :** vite-plugin-pwa
- **Icônes :** Lucide React
- **Graphiques :** Recharts
- **Animations :** Motion (Framer Motion)

## 📦 Installation & Démarrage

### Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)
- npm ou yarn

### Commandes

1. **Cloner le dépôt et installer les dépendances :**
   ```bash
   npm install
   ```

2. **Démarrer le serveur de développement :**
   ```bash
   npm run dev
   ```
   L'application sera accessible sur `http://localhost:3000` (ou le port indiqué par Vite).

3. **Compiler pour la production :**
   ```bash
   npm run build
   ```
   Les fichiers compilés (minifiés et optimisés) se trouveront dans le dossier `dist/`.

4. **Prévisualiser la version de production :**
   ```bash
   npm run preview
   ```

## 📂 Structure du projet

- `/src/views` : Les différentes pages de l'application (Dashboard, Cédule, Portail Transporteur, Paramètres, etc.).
- `/src/components` : Composants réutilisables (tableaux interactifs, graphiques, etc.).
- `/src/lib` : Utilitaires métiers (PDF, Parser IA, Détection de transporteur, i18n, helpers de dates).
- `/src/store` : Gestionnaire d'état global (`AppContext`) simulant actuellement une base de données avec persistance locale (`localStorage`).
- `/public` : Actifs statiques, manifest PWA et icônes.

## 🔒 Configuration Base de Données (Note de déploiement)
Actuellement, l'application utilise une persistance locale dans le navigateur (`localStorage`) pour faciliter le prototypage et l'utilisation immédiate.
Pour un déploiement en production multi-utilisateurs réel, remplacez le contexte React (`/src/store/AppContext.tsx`) par des appels API vers une base de données telle que Firebase Firestore, Supabase ou PostgreSQL.

## 📄 Licence
Application développée sur mesure. Tous droits réservés.
