-- Story : US-DA-005 — Affichage cohérent des équipes
-- Purpose : exposer un nom français (`name_fr`) en base pour le frontend, tout en conservant `name` EN pour les seeds et jointures.
-- Source : mapping aligné sur `DATA/teams_fr.json` avec corrections Curacao→Curaçao, Czechia→Tchéquie, Jordan→Jordanie.

BEGIN;

ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS name_fr text;

UPDATE public.teams SET name_fr = 'Algérie' WHERE name = 'Algeria';
UPDATE public.teams SET name_fr = 'Argentine' WHERE name = 'Argentina';
UPDATE public.teams SET name_fr = 'Australie' WHERE name = 'Australia';
UPDATE public.teams SET name_fr = 'Autriche' WHERE name = 'Austria';
UPDATE public.teams SET name_fr = 'Belgique' WHERE name = 'Belgium';
UPDATE public.teams SET name_fr = 'Bosnie-Herzégovine' WHERE name = 'Bosnia and Herzegovina';
UPDATE public.teams SET name_fr = 'Brésil' WHERE name = 'Brazil';
UPDATE public.teams SET name_fr = 'Canada' WHERE name = 'Canada';
UPDATE public.teams SET name_fr = 'Cap-Vert' WHERE name = 'Cape Verde';
UPDATE public.teams SET name_fr = 'Colombie' WHERE name = 'Colombia';
UPDATE public.teams SET name_fr = 'Croatie' WHERE name = 'Croatia';
UPDATE public.teams SET name_fr = 'Curaçao' WHERE name = 'Curacao';
UPDATE public.teams SET name_fr = 'Tchéquie' WHERE name = 'Czechia';
UPDATE public.teams SET name_fr = 'RD Congo' WHERE name = 'DR Congo';
UPDATE public.teams SET name_fr = 'Équateur' WHERE name = 'Ecuador';
UPDATE public.teams SET name_fr = 'Égypte' WHERE name = 'Egypt';
UPDATE public.teams SET name_fr = 'Angleterre' WHERE name = 'England';
UPDATE public.teams SET name_fr = 'France' WHERE name = 'France';
UPDATE public.teams SET name_fr = 'Allemagne' WHERE name = 'Germany';
UPDATE public.teams SET name_fr = 'Ghana' WHERE name = 'Ghana';
UPDATE public.teams SET name_fr = 'Haïti' WHERE name = 'Haiti';
UPDATE public.teams SET name_fr = 'Iran' WHERE name = 'Iran';
UPDATE public.teams SET name_fr = 'Irak' WHERE name = 'Iraq';
UPDATE public.teams SET name_fr = 'Côte d''Ivoire' WHERE name = 'Ivory Coast';
UPDATE public.teams SET name_fr = 'Japon' WHERE name = 'Japan';
UPDATE public.teams SET name_fr = 'Jordanie' WHERE name = 'Jordan';
UPDATE public.teams SET name_fr = 'Mexique' WHERE name = 'Mexico';
UPDATE public.teams SET name_fr = 'Maroc' WHERE name = 'Morocco';
UPDATE public.teams SET name_fr = 'Pays-Bas' WHERE name = 'Netherlands';
UPDATE public.teams SET name_fr = 'Nouvelle-Zélande' WHERE name = 'New Zealand';
UPDATE public.teams SET name_fr = 'Norvège' WHERE name = 'Norway';
UPDATE public.teams SET name_fr = 'Panama' WHERE name = 'Panama';
UPDATE public.teams SET name_fr = 'Paraguay' WHERE name = 'Paraguay';
UPDATE public.teams SET name_fr = 'Portugal' WHERE name = 'Portugal';
UPDATE public.teams SET name_fr = 'Qatar' WHERE name = 'Qatar';
UPDATE public.teams SET name_fr = 'Arabie Saoudite' WHERE name = 'Saudi Arabia';
UPDATE public.teams SET name_fr = 'Écosse' WHERE name = 'Scotland';
UPDATE public.teams SET name_fr = 'Sénégal' WHERE name = 'Senegal';
UPDATE public.teams SET name_fr = 'Afrique du Sud' WHERE name = 'South Africa';
UPDATE public.teams SET name_fr = 'Corée du Sud' WHERE name = 'South Korea';
UPDATE public.teams SET name_fr = 'Espagne' WHERE name = 'Spain';
UPDATE public.teams SET name_fr = 'Suède' WHERE name = 'Sweden';
UPDATE public.teams SET name_fr = 'Suisse' WHERE name = 'Switzerland';
UPDATE public.teams SET name_fr = 'Tunisie' WHERE name = 'Tunisia';
UPDATE public.teams SET name_fr = 'Turquie' WHERE name = 'Turkiye';
UPDATE public.teams SET name_fr = 'États-Unis' WHERE name = 'United States';
UPDATE public.teams SET name_fr = 'Uruguay' WHERE name = 'Uruguay';
UPDATE public.teams SET name_fr = 'Ouzbékistan' WHERE name = 'Uzbekistan';

ALTER TABLE public.teams ALTER COLUMN name_fr SET NOT NULL;

ALTER TABLE public.teams ADD CONSTRAINT teams_name_fr_unique UNIQUE (name_fr);

COMMENT ON COLUMN public.teams.name_fr IS 'US-DA-005: nom francisé pour affichage frontend';

COMMIT;
