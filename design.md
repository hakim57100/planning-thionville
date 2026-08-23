# Direction de conception — Planning Restaurant

## Intention

**Planning Restaurant** est conçu comme un outil de coordination quotidien, sobre et immédiat. L’interface privilégie la consultation rapide des services à venir par les salariés et une création de planning structurée par journée pour l’administrateur. L’application reste en orientation portrait, avec les actions les plus fréquentes accessibles au pouce dans la moitié basse de l’écran.

## Écrans

| Écran | Contenu principal | Fonctionnalités |
|---|---|---|
| Accueil | Date du jour, prochain service, statut du planning et aperçu de la semaine | Basculer entre vue salarié et administrateur de démonstration, accéder au planning courant |
| Mon planning | Calendrier hebdomadaire, services assignés, heures et poste | Naviguer d’une semaine à l’autre, consulter le détail d’un service |
| Détail du service | Date, créneau, poste, équipe présente et note de service | Visualiser les informations utiles à la prise de poste |
| Équipe | Liste des salariés, poste et disponibilité synthétique | Rechercher et consulter les membres de l’équipe |
| Gestion | Vue hebdomadaire par journée, statut brouillon/publié et raccourcis de gestion | Créer une semaine, éditer les affectations et publier le planning |
| Édition d’un service | Jour, horaire, poste et salariés affectés | Ajouter, modifier ou supprimer une affectation avant publication |
| Profil | Identité de l’utilisateur, rôle et préférence d’affichage | Consulter le rôle actif et les informations de compte |

## Parcours clés

Un salarié ouvre l’application et arrive sur son prochain service. Il touche la carte ou l’onglet **Mon planning** pour parcourir la semaine, puis sélectionne un service afin d’en voir les horaires, son poste et la composition de l’équipe.

Un administrateur ouvre l’onglet **Gestion**, choisit une journée, ajoute ou ajuste les services et affecte les salariés. Il revient ensuite à la vue de semaine, vérifie que les créneaux sont complets puis utilise l’action **Publier la semaine**. La publication transforme le brouillon en planning visible aux salariés.

## Modèle de données initial

| Entité | Champs essentiels | Finalité |
|---|---|---|
| Salarié | identifiant, nom, initiales, poste, couleur, rôle | Identifier les personnes et leurs droits d’accès |
| Service | identifiant, date, début, fin, poste, note | Décrire un créneau de travail |
| Affectation | identifiant, service, salarié | Relier une personne à un service |
| Semaine de planning | date de début, statut brouillon/publié, date de publication | Contrôler la visibilité du planning |

## Choix visuels

L’identité évoque la précision du service et la chaleur d’un lieu de restauration. Le fond principal sera **ivoire chaud `#FFF9F2`**, les surfaces seront **blanches `#FFFFFF`**, le bleu ardoise **`#183B4E`** structurera la navigation et les titres, et le cuivre **`#C96442`** signalera les actions d’administration. Le vert sauge **`#3E826E`** indiquera les états publiés et validés. Les cartes auront des angles de 20 points, des ombres très légères et une hiérarchie typographique proche des conventions iOS : titres lisibles, informations secondaires discrètes et boutons à libellé explicite.

Les couleurs des membres de l’équipe ne portent jamais seules une information importante : chaque état est également formulé en texte. Les zones tactiles respecteront des dimensions confortables, et les confirmations de publication seront visibles et explicites.
