import { ApifyClient } from 'apify-client';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// 1. Configurações
// IMPORTANTE: Este token foi inserido conforme sua autorização. 
// Para maior segurança, considere usar variáveis de ambiente no futuro.
const apifyClient = new ApifyClient({ token: 'apify_api_nSiiUeo2i6nhi0w8fyPhsbzT757Qtj20JYr2' });
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function importar() {
  console.log("🚚 Buscando imóveis na Apify...");
  
  try {
    // 2. Chama o scraper (substitua pelo ID do seu actor)
    const run = await apifyClient.actor("gio21/leilaoimovel-scraper").call({
      state: "MG",
      maxItems: 200
    });
    const dataset = await apifyClient.dataset(run.defaultDatasetId).listItems();
    const items = dataset.items;

    console.log(`📦 Encontrei ${items.length} imóveis. Salvando no Firebase...`);
    if (items.length > 0) {
      console.log("Exemplo de item:", JSON.stringify(items[0], null, 2));
    }

    // 3. Salva no Firebase
    let importados = 0;
    for (const item of items) {
      const data = item as any;
      
      // Filtra itens sem título ou sem preço
      if (!data.title || !data.price) {
        console.log("⚠️ Pulando item incompleto:", data.title || "Sem título");
        continue;
      }

      // Create a URL-safe ID based on the URL
      const idUnico = Buffer.from(data.url || data.title).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      await setDoc(doc(db, 'imoveis', idUnico), {
        titulo: data.title,
        preco: parseFloat(data.price.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
        preco_original: parseFloat(data.appraisal?.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
        endereco: data.address || "Não informado",
        cidade: data.address.split('-')[1]?.trim() || "Não informado",
        estado: data.address.split('-')[2]?.trim() || "Não informado",
        imagem: data.image || "",
        url_leilao: data.url || "",
        id_leilao: idUnico, // Usando o ID único como identificador
        desconto: data.discount || 0,
        data_encerramento: data.closingDate || "Não informado",
        score: 50 // Score padrão inicial
      });
      importados++;
    }
    console.log(`✅ Importação concluída! ${importados} imóveis salvos.`);
  } catch (error) {
    console.error("❌ Erro na importação:", error);
  }
}

importar();
