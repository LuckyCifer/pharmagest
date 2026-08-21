-- Script de création de la base de données PharmaGest
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS pharmagest_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pharmagest_db;

-- Les tables seront créées automatiquement par Django via les migrations.
-- Ce script initialise uniquement la base.

-- Créer un utilisateur dédié (optionnel, recommandé en production)
-- CREATE USER 'pharmagest_user'@'localhost' IDENTIFIED BY 'mot_de_passe_fort';
-- GRANT ALL PRIVILEGES ON pharmagest_db.* TO 'pharmagest_user'@'localhost';
-- FLUSH PRIVILEGES;

SELECT 'Base pharmagest_db créée avec succès.' AS statut;
