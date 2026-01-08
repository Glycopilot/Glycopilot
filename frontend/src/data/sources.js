// Small local data module derived from CSV files (kept as JS for easy import).
// CSV files are in `frontend/assets/data/*.csv`. Keep CSV in sync with these arrays.
import { parseCSV, loadCSVAsset } from './csvLoader';
import { storage } from './storage';

export const activitiesList = [
  { name: 'Marche', caloriesPerMin: 4.3 },
  { name: 'Marche rapide', caloriesPerMin: 5.0 },
  { name: 'Randonnée', caloriesPerMin: 5.5 },
  { name: 'Vélo', caloriesPerMin: 6.2 },
  { name: 'VTT', caloriesPerMin: 7.0 },
  { name: 'Cyclisme (indoor)', caloriesPerMin: 8.0 },
  { name: 'Course lente', caloriesPerMin: 7.5 },
  { name: 'Course (fractionné)', caloriesPerMin: 10.0 },
  { name: 'Sprint', caloriesPerMin: 12.0 },
  { name: 'Natation (modérée)', caloriesPerMin: 7.0 },
  { name: 'Natation (intense)', caloriesPerMin: 9.0 },
  { name: 'Aviron', caloriesPerMin: 8.5 },
  { name: 'Elliptique', caloriesPerMin: 6.5 },
  { name: 'Ski de fond', caloriesPerMin: 9.0 },
  { name: 'Patinage', caloriesPerMin: 7.0 },
  { name: 'Danse (aérobic)', caloriesPerMin: 6.0 },
  { name: 'Zumba', caloriesPerMin: 6.8 },
  { name: 'Pilates', caloriesPerMin: 3.5 },
  { name: 'Yoga', caloriesPerMin: 3.1 },
  { name: 'Renforcement musculaire (léger)', caloriesPerMin: 5.5 },
  { name: 'Musculation (intense)', caloriesPerMin: 7.0 },
  { name: 'HIIT', caloriesPerMin: 11.0 },
  { name: 'Boxe', caloriesPerMin: 9.0 },
  { name: 'Arts martiaux', caloriesPerMin: 8.5 },
  { name: 'Escalade', caloriesPerMin: 8.0 },
  { name: 'Jardinage actif', caloriesPerMin: 3.8 },
  { name: 'Ménage énergique', caloriesPerMin: 4.0 },
  { name: 'Tapis de marche', caloriesPerMin: 4.8 },
  { name: 'Skate', caloriesPerMin: 6.0 },
  { name: 'Marche avec chien', caloriesPerMin: 4.6 },
];

export const mealsList = [
  { name: 'Oeufs brouillés et pain complet', glucides: 20, type: 'Petit-déjeuner' },
  { name: 'Avoine + lait + banane', glucides: 45, type: 'Petit-déjeuner' },
  { name: 'Smoothie fruits (500ml)', glucides: 30, type: 'Petit-déjeuner' },
  { name: 'Crêpes (2)', glucides: 50, type: 'Petit-déjeuner' },
  { name: 'Céréales muesli (bol)', glucides: 40, type: 'Petit-déjeuner' },
  { name: 'Croissant', glucides: 26, type: 'Petit-déjeuner' },
  { name: 'Pain complet + omelette', glucides: 35, type: 'Petit-déjeuner' },
  { name: 'Granola bowl', glucides: 50, type: 'Petit-déjeuner' },
  { name: 'Baguette + jambon-beurre', glucides: 45, type: 'Déjeuner' },
  { name: 'Sandwich jambon', glucides: 40, type: 'Déjeuner' },
  { name: 'Salade César', glucides: 25, type: 'Déjeuner' },
  { name: 'Salade Niçoise', glucides: 22, type: 'Déjeuner' },
  { name: 'Quiche lorraine (part)', glucides: 30, type: 'Déjeuner' },
  { name: 'Wrap poulet', glucides: 38, type: 'Déjeuner' },
  { name: 'Poulet riz', glucides: 55, type: 'Dîner' },
  { name: 'Pâtes sauce tomate', glucides: 75, type: 'Dîner' },
  { name: 'Pâtes carbonara', glucides: 80, type: 'Dîner' },
  { name: 'Pizza Margherita (part)', glucides: 70, type: 'Dîner' },
  { name: 'Risotto aux champignons', glucides: 65, type: 'Dîner' },
  { name: 'Couscous légumes', glucides: 60, type: 'Dîner' },
  { name: 'Burrito poulet', glucides: 60, type: 'Dîner' },
  { name: 'Sushi (8 pièces)', glucides: 45, type: 'Dîner' },
  { name: 'Burger classique', glucides: 50, type: 'Dîner' },
  { name: 'Patates rôties (200g)', glucides: 35, type: 'Dîner' },
  { name: 'Soupe de lentilles (bol)', glucides: 30, type: 'Dîner' },
  { name: 'Yaourt + fruits', glucides: 18, type: 'Collation' },
  { name: 'Fromage blanc + miel', glucides: 20, type: 'Collation' },
  { name: 'Barre céréales', glucides: 22, type: 'Collation' },
  { name: 'Pomme', glucides: 20, type: 'Collation' },
  { name: 'Banane', glucides: 27, type: 'Collation' },
  { name: 'Fruits secs (30g)', glucides: 18, type: 'Collation' },
];

export const treatmentsList = [
  { name: 'Metformine', dosage: '500mg', type: 'Oral' },
  { name: 'Metformine', dosage: '850mg', type: 'Oral' },
  { name: 'Gliclazide', dosage: '80mg', type: 'Oral' },
  { name: 'Sitagliptine', dosage: '100mg', type: 'Oral' },
  { name: 'Dapagliflozine', dosage: '10mg', type: 'Oral' },
  { name: 'Empagliflozine', dosage: '10mg', type: 'Oral' },
  { name: 'Liraglutide', dosage: '1.2mg', type: 'Injectable (GLP-1)' },
  { name: 'Insuline Rapide', dosage: '6 unités', type: 'Insuline' },
  { name: 'Insuline Rapide', dosage: '8 unités', type: 'Insuline' },
  { name: 'Insuline Lente', dosage: '18 unités', type: 'Insuline' },
  { name: 'Insuline Mixte', dosage: '12 unités', type: 'Insuline' },
  { name: 'Rosuvastatine', dosage: '10mg', type: 'Oral' },
  { name: 'Atorvastatine', dosage: '20mg', type: 'Oral' },
  { name: 'Aspirine', dosage: '100mg', type: 'Oral' },
  { name: 'Ramipril', dosage: '5mg', type: 'Oral' },
  { name: 'Losartan', dosage: '50mg', type: 'Oral' },
  { name: 'Bisoprolol', dosage: '5mg', type: 'Oral' },
  { name: 'Fer (sulfate)', dosage: '80mg', type: 'Oral' },
  { name: 'Vitamine D', dosage: '1000 IU', type: 'Oral' },
  { name: 'Levothyroxine', dosage: '50mcg', type: 'Oral' },
];

export function findActivity(name) {
  return activitiesList.find(a => a.name === name);
}

// Dynamic loaders: try to parse bundled CSVs, then apply stored user overrides, else fallback to defaults.
function makeId(name, idx, prefix = '') {
  const base = (name || '').toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '').slice(0, 40) || String(idx);
  return `${prefix}${base}-${idx}`;
}

function ensureIds(list = [], prefix = '') {
  return (list || []).map((it, idx) => ({ id: it.id ?? makeId(it.name ?? it.title ?? it.dosage ?? idx, idx, prefix), ...it }));
}

export async function loadActivities() {
  // try CSV
  try {
    // require the asset - Metro may expose a usable URI for fetch
    const csvAsset = require('../assets/data/activities.csv');
    const parsed = await loadCSVAsset(csvAsset);
    let list = parsed && parsed.length ? parsed.map((r, idx) => ({ id: makeId(r.name, idx, 'act-'), name: r.name, caloriesPerMin: parseFloat(r.calories_per_min) })) : activitiesList.map((a, idx) => ({ id: makeId(a.name, idx, 'act-'), ...a }));
    // check storage overrides
    const stored = await storage.getActivities();
    if (stored && Array.isArray(stored)) list = ensureIds(stored, 'act-');
    return ensureIds(list, 'act-');
  } catch (err) {
    const stored = await storage.getActivities();
    return stored && Array.isArray(stored) ? ensureIds(stored, 'act-') : ensureIds(activitiesList, 'act-');
  }
}

export async function loadMeals() {
  try {
    const csvAsset = require('../assets/data/meals.csv');
    const parsed = await loadCSVAsset(csvAsset);
    let list = parsed && parsed.length ? parsed.map((r, idx) => ({ id: makeId(r.name, idx, 'meal-'), name: r.name, glucides: parseInt(r.glucides || '0', 10), type: r.type })) : mealsList.map((m, idx) => ({ id: makeId(m.name, idx, 'meal-'), ...m }));
    const stored = await storage.getMeals();
    if (stored && Array.isArray(stored)) list = ensureIds(stored, 'meal-');
    return ensureIds(list, 'meal-');
  } catch (err) {
    const stored = await storage.getMeals();
    return stored && Array.isArray(stored) ? ensureIds(stored, 'meal-') : ensureIds(mealsList, 'meal-');
  }
}

export async function loadTreatments() {
  try {
    const csvAsset = require('../assets/data/treatments.csv');
    const parsed = await loadCSVAsset(csvAsset);
    let list = parsed && parsed.length ? parsed.map((r, idx) => ({ id: makeId(r.name, idx, 'treat-'), name: r.name, dosage: r.dosage, type: r.type })) : treatmentsList.map((t, idx) => ({ id: makeId(t.name, idx, 'treat-'), ...t }));
    const stored = await storage.getTreatments();
    if (stored && Array.isArray(stored)) list = ensureIds(stored, 'treat-');
    return ensureIds(list, 'treat-');
  } catch (err) {
    const stored = await storage.getTreatments();
    return stored && Array.isArray(stored) ? ensureIds(stored, 'treat-') : ensureIds(treatmentsList, 'treat-');
  }
}

