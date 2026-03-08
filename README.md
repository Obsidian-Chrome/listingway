# FFXIV Furniture List Parser

Application web pour analyser les listes de meubles FFXIV et obtenir les prix du Market Board via l'API Universalis.

## Fonctionnalités

- 📁 Import de fichiers .txt
- 📋 Copier/coller de texte
- 💰 Récupération automatique des prix depuis Universalis API
- 📊 Affichage en tableau interactif
- ✏️ Modification des quantités actuelles
- 💾 Export en CSV
- 🔄 Tri des colonnes
- 🌍 Sélection du serveur FFXIV

## Installation

```bash
npm install
```

## Démarrage

```bash
npm run dev
```

## Build pour production

```bash
npm run build
```

## Format de la liste

La liste doit contenir trois sections :

1. **Meubles** : Liste des meubles sans teinture
2. **Teinture** : Liste des teintures nécessaires
3. **Furniture (With Dye)** : Liste complète des meubles avec leurs teintures

Format de chaque ligne : `Nom de l'objet: quantité`

Pour les meubles teints : `Nom du meuble (Nom de la teinture): quantité`

## Exemple

```
      Meubles      
=====================
Dispositif holographique: 1
Vase ahriman: 1

        Dyes        
=====================
Teinture noir suie: 68
Teinture ocre uldien: 14

Furniture (With Dye)
=====================
Bibliothèque en bois (Teinture noir suie): 1
Chaise de l'Origenèse (Teinture noir suie): 1
```

## Technologies

- React 18
- Vite
- TailwindCSS
- Lucide React (icônes)
- Universalis API (prix FFXIV)
- XIVAPI (recherche d'items)
