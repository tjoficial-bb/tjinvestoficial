import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

async function cleanup() {
  console.log("Iniciando limpeza do banco de dados...");
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const imoveisSnapshot = await getDocs(collection(db, 'imoveis'));
  
  let count = 0;
  for (const docSnapshot of imoveisSnapshot.docs) {
    await deleteDoc(doc(db, 'imoveis', docSnapshot.id));
    count++;
  }
  console.log(`Limpeza concluída. ${count} imóveis excluídos.`);
}
cleanup();
