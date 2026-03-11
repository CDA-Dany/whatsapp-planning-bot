import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialiser Firebase Admin
let db;

try {
    // Configuration avec variables d'environnement
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    };
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    
    db = admin.firestore();
    console.log('✅ Firebase Admin initialisé');
    
} catch (error) {
    console.error('❌ Erreur initialisation Firebase:', error);
    throw error;
}

/**
 * Sauvegarde une tâche dans Firestore (collection 'planning')
 * @param {Object} tache - Les données de la tâche
 * @returns {Promise<string>} - L'ID du document créé
 */
export async function sauvegarderTachePlanning(tache) {
    try {
        const docId = `tache_${Date.now()}`;
        
        const tacheData = {
            date: tache.date,
            heure: tache.heure || null,
            activite: tache.activite,
            personnes: tache.personnes || [],
            lieu: tache.lieu || null,
            status: tache.status || 'planifie',
            notes: tache.notes || '',
            createdAt: new Date().toISOString(),
            createdBy: 'whatsapp_bot',
            updatedAt: new Date().toISOString()
        };
        
        await db.collection('planning').doc(docId).set(tacheData);
        
        console.log(`✅ Tâche sauvegardée : ${docId}`);
        return docId;
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde Firestore:', error);
        throw error;
    }
}

/**
 * Récupère toutes les tâches du planning
 * @returns {Promise<Array>} - Liste des tâches
 */
export async function recupererToutesLesTaches() {
    try {
        const snapshot = await db.collection('planning').get();
        const taches = [];
        
        snapshot.forEach(doc => {
            taches.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return taches;
        
    } catch (error) {
        console.error('❌ Erreur récupération tâches:', error);
        throw error;
    }
}

/**
 * Met à jour le statut d'une tâche
 * @param {string} tacheId - ID de la tâche
 * @param {string} nouveauStatus - planifie | en_cours | termine
 */
export async function mettreAJourStatus(tacheId, nouveauStatus) {
    try {
        await db.collection('planning').doc(tacheId).update({
            status: nouveauStatus,
            updatedAt: new Date().toISOString()
        });
        
        console.log(`✅ Status mis à jour : ${tacheId} → ${nouveauStatus}`);
        
    } catch (error) {
        console.error('❌ Erreur mise à jour status:', error);
        throw error;
    }
}

/**
 * Supprime une tâche
 * @param {string} tacheId - ID de la tâche à supprimer
 */
export async function supprimerTache(tacheId) {
    try {
        await db.collection('planning').doc(tacheId).delete();
        console.log(`✅ Tâche supprimée : ${tacheId}`);
        
    } catch (error) {
        console.error('❌ Erreur suppression tâche:', error);
        throw error;
    }
}

/**
 * Teste la connexion à Firestore
 */
export async function testerConnexionFirestore() {
    try {
        // Essayer de lire la collection planning
        await db.collection('planning').limit(1).get();
        console.log('✅ Connexion Firestore réussie !');
        return true;
    } catch (error) {
        console.error('❌ Erreur connexion Firestore:', error.message);
        return false;
    }
}
