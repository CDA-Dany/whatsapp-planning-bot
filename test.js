import dotenv from 'dotenv';
import { testerConnexionClaude } from './claude.js';
import { testerConnexionFirestore } from './firestore.js';

dotenv.config();

console.log('🧪 Test des connexions...\n');

// Test variables d'environnement
console.log('📋 Vérification des variables d\'environnement :');
console.log(`✓ ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Définie' : '❌ Manquante'}`);
console.log(`✓ FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID ? '✅ Définie' : '❌ Manquante'}`);
console.log(`✓ FIREBASE_PRIVATE_KEY: ${process.env.FIREBASE_PRIVATE_KEY ? '✅ Définie' : '❌ Manquante'}`);
console.log(`✓ FIREBASE_CLIENT_EMAIL: ${process.env.FIREBASE_CLIENT_EMAIL ? '✅ Définie' : '❌ Manquante'}`);
console.log(`✓ WHATSAPP_GROUP_NAME: ${process.env.WHATSAPP_GROUP_NAME || 'Planning Chantier'}\n`);

// Test Claude API
console.log('🤖 Test connexion Claude API...');
const claudeOk = await testerConnexionClaude();
console.log('');

// Test Firestore
console.log('🔥 Test connexion Firestore...');
const firestoreOk = await testerConnexionFirestore();
console.log('');

// Résumé
console.log('📊 Résumé :');
console.log(`Claude API: ${claudeOk ? '✅ OK' : '❌ ERREUR'}`);
console.log(`Firestore: ${firestoreOk ? '✅ OK' : '❌ ERREUR'}`);

if (claudeOk && firestoreOk) {
    console.log('\n✨ Tout est prêt ! Lancez le bot avec : npm start');
} else {
    console.log('\n⚠️ Corrigez les erreurs ci-dessus avant de lancer le bot.');
    process.exit(1);
}
