import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, orderBy, query } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase config
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function migrate() {
  console.log('Starting migration from Firebase to local DB...');
  
  const DB_DIR = path.join(process.cwd(), 'db');
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
  const uploadsPath = path.join(DB_DIR, 'uploads.json');

  try {
    const fetchPromise = getDocs(query(collection(db, 'uploads'), orderBy('createdAt', 'desc')));
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Firebase Request Timed Out (Likely Quota Limit)')), 10000)
    );

    const snapshot = await Promise.race([fetchPromise, timeoutPromise]) as any;
    
    console.log(`Found ${snapshot.size} items in Firebase.`);
    
    const existingLocal = fs.existsSync(uploadsPath) ? JSON.parse(fs.readFileSync(uploadsPath, 'utf-8')) : [];
    
    const migratedData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Ensure createdAt is a string ISO
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
    }));

    // Merge without duplicates (by ID)
    const combined = [...migratedData];
    existingLocal.forEach((item: any) => {
      if (!combined.find(c => c.id === item.id)) {
        combined.push(item);
      }
    });

    fs.writeFileSync(uploadsPath, JSON.stringify(combined, null, 2));
    console.log(`Successfully migrated ${migratedData.length} items. Total local items: ${combined.length}`);

    // Try suggestions
    try {
      const sSnap = await getDocs(collection(db, 'suggestions'));
      if (!sSnap.empty) {
        const sData = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        fs.writeFileSync(path.join(DB_DIR, 'suggestions.json'), JSON.stringify(sData, null, 2));
        console.log(`Migrated ${sData.length} suggestions.`);
      }
    } catch (e) {}

    // Try announcements
    try {
      const aSnap = await getDocs(collection(db, 'announcements'));
      if (!aSnap.empty) {
        const aData = aSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        fs.writeFileSync(path.join(DB_DIR, 'announcements.json'), JSON.stringify(aData, null, 2));
        console.log(`Migrated ${aData.length} announcements.`);
      }
    } catch (e) {}
    
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
