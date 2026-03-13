// Gestion des validations de fournitures pour le bot WhatsApp
import admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Table de conversion d'unités
 */
const CONVERSIONS = {
    // Surfaces (m²)
    plaque_osb_vers_m2: 2.88, // 1 plaque OSB 18mm = 2400x1200 = 2.88m²
    plaque_ba13_vers_m2: 3.00, // 1 plaque BA13 = 2500x1200 = 3m²
    
    // Longueurs
    m_vers_cm: 100,
    m_vers_mm: 1000,
    cm_vers_mm: 10,
};

/**
 * Convertir une quantité d'une unité à une autre
 */
export function convertirUnite(quantite, uniteSource, uniteCible, nomFourniture = '') {
    const source = uniteSource.toLowerCase();
    const cible = uniteCible.toLowerCase();
    
    if (source === cible) {
        return quantite;
    }
    
    // Plaques OSB → m²
    if ((source === 'plaque' || source === 'plaques') && 
        (cible === 'm²' || cible === 'm2') && 
        nomFourniture.toLowerCase().includes('osb')) {
        return quantite * CONVERSIONS.plaque_osb_vers_m2;
    }
    
    // Plaques BA13 → m²
    if ((source === 'plaque' || source === 'plaques') && 
        (cible === 'm²' || cible === 'm2') && 
        (nomFourniture.toLowerCase().includes('ba13') || nomFourniture.toLowerCase().includes('placo'))) {
        return quantite * CONVERSIONS.plaque_ba13_vers_m2;
    }
    
    // m² → plaques (inverse)
    if ((source === 'm²' || source === 'm2') && 
        (cible === 'plaque' || cible === 'plaques') && 
        nomFourniture.toLowerCase().includes('osb')) {
        return quantite / CONVERSIONS.plaque_osb_vers_m2;
    }
    
    // Longueurs
    if (source === 'm' && cible === 'cm') return quantite * CONVERSIONS.m_vers_cm;
    if (source === 'm' && cible === 'mm') return quantite * CONVERSIONS.m_vers_mm;
    if (source === 'cm' && cible === 'mm') return quantite * CONVERSIONS.cm_vers_mm;
    if (source === 'cm' && cible === 'm') return quantite / CONVERSIONS.m_vers_cm;
    if (source === 'mm' && cible === 'm') return quantite / CONVERSIONS.m_vers_mm;
    if (source === 'mm' && cible === 'cm') return quantite / CONVERSIONS.cm_vers_mm;
    
    // Pas de conversion possible
    return null;
}

/**
 * Récupérer les validations existantes pour une ligne
 */
export async function getValidationsExistantes(fichier, ligneIndex) {
    try {
        const docId = `${fichier}__${ligneIndex}`;
        const doc = await db.collection('taches').doc(docId).get();
        
        if (!doc.exists) {
            return [];
        }
        
        const data = doc.data();
        return data.historique || [];
    } catch (error) {
        console.error('❌ Erreur récupération validations:', error);
        return [];
    }
}

/**
 * Ajouter une validation (comme sur le site)
 */
export async function ajouterValidation(fichier, ligneIndex, validation, fournitureData) {
    try {
        const docId = `${fichier}__${ligneIndex}`;
        
        // Récupérer les validations existantes
        const validations = await getValidationsExistantes(fichier, ligneIndex);
        
        // Ajouter la nouvelle validation
        const nouvelleValidation = {
            date: new Date().toISOString(),
            quantite: validation.quantite,
            cout: validation.cout || 0,
            prix: validation.prix || (validation.quantite * validation.cout),
            timestamp: Date.now(),
            validePar: 'bot_whatsapp'
        };
        
        validations.push(nouvelleValidation);
        
        // Calculer les totaux
        let qteReelleTotal = 0;
        let prixReelTotal = 0;
        let sommeCoutsUnitaires = 0;
        let countCouts = 0;
        
        validations.forEach(v => {
            if (v.quantite) qteReelleTotal += v.quantite;
            if (v.prix) prixReelTotal += v.prix;
            if (v.cout) {
                sommeCoutsUnitaires += v.cout;
                countCouts++;
            }
        });
        
        const coutUnitaireReelMoyen = countCouts > 0 ? sommeCoutsUnitaires / countCouts : 0;
        
        // Vérifier si la quantité réelle >= quantité prévue
        const quantitePrevue = fournitureData.quantite;
        const checked = qteReelleTotal >= quantitePrevue;
        
        // Sauvegarder dans Firestore (structure identique au site)
        await db.collection('taches').doc(docId).set({
            checked: checked,
            partiel: prixReelTotal,
            historique: validations,
            reels: {
                quantite: qteReelleTotal,
                prix: prixReelTotal,
                cout: coutUnitaireReelMoyen
            },
            lot: fournitureData.lot,
            nom: fournitureData.nom,
            chantier: fichier,
            coutType: 'local'
        });
        
        console.log(`✅ Validation ajoutée: ${validation.quantite} ${fournitureData.unite} (${docId})`);
        
        return {
            quantite_validee: validation.quantite,
            quantite_totale_validee: qteReelleTotal,
            quantite_prevue: quantitePrevue,
            prix_valide: validation.prix,
            prix_total_valide: prixReelTotal,
            cout_unitaire_moyen: coutUnitaireReelMoyen,
            checked: checked
        };
        
    } catch (error) {
        console.error('❌ Erreur ajout validation:', error);
        throw error;
    }
}

/**
 * Marquer une ligne comme terminée (quantité suffisante)
 * NE modifie PAS l'historique, marque juste checked=true
 */
export async function marquerTermine(fichier, ligneIndex, fournitureData) {
    try {
        const docId = `${fichier}__${ligneIndex}`;
        
        // Récupérer les données existantes
        const doc = await db.collection('taches').doc(docId).get();
        const existingData = doc.exists ? doc.data() : {};
        
        // Marquer comme terminé SANS modifier l'historique
        await db.collection('taches').doc(docId).set({
            checked: true,  // MARQUER COMME TERMINÉ
            partiel: existingData.partiel || 0,
            historique: existingData.historique || [],
            reels: existingData.reels || {},
            lot: fournitureData.lot,
            nom: fournitureData.nom,
            chantier: fichier,
            coutType: existingData.coutType || 'local',
            dateTermine: new Date().toISOString(),
            terminePar: 'bot_whatsapp'
        });
        
        console.log(`✅ Ligne marquée terminée: ${docId}`);
        
        return true;
    } catch (error) {
        console.error('❌ Erreur marquer terminé:', error);
        throw error;
    }
}

/**
 * Trouver l'index d'une fourniture dans le CSV
 */
export async function trouverIndexFourniture(chantier, nomFourniture) {
    try {
        const collectionNom = chantier.toLowerCase();
        const snapshot = await db.collection(collectionNom).get();
        
        if (snapshot.empty) {
            return null;
        }
        
        // Chercher la fourniture
        let index = null;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.nom && data.nom.toLowerCase() === nomFourniture.toLowerCase()) {
                index = data.index;
            }
        });
        
        return index;
    } catch (error) {
        console.error('❌ Erreur recherche index:', error);
        return null;
    }
}
