# Contexte du Projet : Logistique Cédules

## Description Globale
Application web (Progressive Web App) conçue pour la gestion en temps réel des quais de déchargement, le suivi des conteneurs maritimes/terrestres, et la coordination avec les transporteurs externes (Portail libre-service).

## Architecture & Stack Technique
- **Frontend :** React 19, TypeScript, Vite.
- **Styling :** Tailwind CSS v4, animations Motion, icônes Lucide React.
- **Backend & Base de données :** Firebase Firestore (NoSQL). L'application s'appuie sur `onSnapshot` pour la synchronisation en temps réel entre les terminaux (entrepôts, répartiteurs).
- **PWA :** Optimisée pour mobile/tablette sur le terrain (support hors-ligne via IndexedDB Firestore, retour haptique, appui long).

## Règles de Développement (Directives pour l'Agent)
1. **Persistance des données :** NE JAMAIS utiliser `localStorage` pour les entités métier (`entries`, `proofs`, `tenant`, `settings`, `notifications`). Toute lecture/écriture doit passer par Firebase Firestore via le contexte global.
2. **Configuration Firestore :** Toujours initialiser Firestore avec l'ID de base de données spécifique du projet (`firebaseConfig.firestoreDatabaseId`), car le projet n'utilise pas la base de données `(default)`.
3. **Performances (Algorithmes) :** Éviter les boucles imbriquées lourdes (ex: recherche de créneaux disponibles sur 14 jours). Privilégier les structures de données pré-calculées comme `Set` ou `Map` (O(1)) pour maintenir l'interface fluide sur les appareils mobiles moins puissants.
4. **Sécurité :** Toujours assainir les exports CSV (prévention des injections de macros DDE Excel) et maintenir le code compatible avec une future intégration d'authentification (Firebase Auth / RBAC).
5. **UX/UI :** Maintenir une interface "Touch-friendly". Utiliser des tailles de boutons d'au moins 44px pour le mobile, gérer correctement les événements `onTouchStart`/`onTouchMove` pour éviter les clics fantômes, et respecter le mode sombre/clair.
