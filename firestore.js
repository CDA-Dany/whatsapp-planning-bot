import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialisation Firebase Admin
const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log('✅ Firebase Admin initialisé');

/**
 * Sauvegarde une tâche de planning dans Firestore
 */
export async function sauvegarderTachePlanning(tache) {
    try {
        const planningRef = db.collection('planning');
        
        const nouvelleTache = {
            ...tache,
            createdAt: new Date().toISOString(),
            createdBy: 'whatsapp_bot',
            updatedAt: new Date().toISOString()
        };
        
        await planningRef.add(nouvelleTache);
        
        console.log('✅ Tâche sauvegardée dans Firestore');
        return true;
    } catch (error) {
        console.error('❌ Erreur Firestore:', error);
        throw error;
    }
}

/**
 * Recherche des tâches selon des critères
 */
export async function rechercherTaches(criteres) {
    try {
        let query = db.collection('planning');
        
        // Filtrer par date si spécifiée
        if (criteres.date) {
            query = query.where('date', '==', criteres.date);
        }
        
        // Filtrer par activité si spécifiée
        if (criteres.activite) {
            // Recherche insensible à la casse
            query = query.where('activite', '>=', criteres.activite)
                         .where('activite', '<=', criteres.activite + '\uf8ff');
        }
        
        // Filtrer par personne si spécifiée
        if (criteres.personnes && criteres.personnes.length > 0) {
            query = query.where('personnes', 'array-contains-any', criteres.personnes);
        }
        
        const snapshot = await query.get();
        
        const taches = [];
        snapshot.forEach(doc => {
            taches.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`🔍 ${taches.length} tâche(s) trouvée(s)`);
        return taches;
        
    } catch (error) {
        console.error('❌ Erreur recherche Firestore:', error);
        throw error;
    }
}

/**
 * Supprime des tâches par leurs IDs
 */
export async function supprimerTaches(tacheIds) {
    try {
        const batch = db.batch();
        
        tacheIds.forEach(id => {
            const docRef = db.collection('planning').doc(id);
            batch.delete(docRef);
        });
        
        await batch.commit();
        
        console.log(`✅ ${tacheIds.length} tâche(s) supprimée(s)`);
        return true;
        
    } catch (error) {
        console.error('❌ Erreur suppression Firestore:', error);
        throw error;
    }
}

/**
 * Modifie des tâches selon des critères
 */
export async function modifierTaches(tacheIds, modifications) {
    try {
        const batch = db.batch();
        
        const updateData = {
            ...modifications,
            updatedAt: new Date().toISOString()
        };
        
        // Retirer les champs null/undefined
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === null || updateData[key] === undefined) {
                delete updateData[key];
            }
        });
        
        tacheIds.forEach(id => {
            const docRef = db.collection('planning').doc(id);
            batch.update(docRef, updateData);
        });
        
        await batch.commit();
        
        console.log(`✅ ${tacheIds.length} tâche(s) modifiée(s)`);
        return true;
        
    } catch (error) {
        console.error('❌ Erreur modification Firestore:', error);
        throw error;
    }
}

/**
 * Met à jour le statut d'une tâche
 */
export async function mettreAJourStatus(tacheId, nouveauStatus) {
    try {
        await db.collection('planning').doc(tacheId).update({
            status: nouveauStatus,
            updatedAt: new Date().toISOString()
        });
        
        console.log(`✅ Statut mis à jour: ${nouveauStatus}`);
        return true;
        
    } catch (error) {
        console.error('❌ Erreur mise à jour statut:', error);
        throw error;
    }
}
