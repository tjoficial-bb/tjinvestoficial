import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { ApifyClient } from 'apify-client';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc, getDocs, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import fs from 'fs';
import cron from 'node-cron';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function logImport(message: string) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(path.join(__dirname, 'import.log'), `[${timestamp}] ${message}\n`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const firebaseApp = initializeApp(firebaseConfig);
  const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

  // Cron job para limpeza de leilões encerrados
  cron.schedule('0 0 * * *', async () => {
    logImport("Iniciando limpeza de leilões encerrados...");
    const now = new Date();
    const imoveisSnapshot = await getDocs(collection(db, 'imoveis'));
    for (const docSnapshot of imoveisSnapshot.docs) {
      const data = docSnapshot.data();
      if (data.data_encerramento && data.data_encerramento !== "Data não informada") {
        const [day, month, year] = data.data_encerramento.split('/').map(Number);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const closingDate = new Date(year, month - 1, day);
          if (closingDate < now) {
            await deleteDoc(doc(db, 'imoveis', docSnapshot.id));
            logImport(`Leilão ${docSnapshot.id} encerrado e removido.`);
          }
        }
      }
    }
  });

  // API route for import
  app.post("/api/import", async (req, res) => {
    logImport("Recebida requisição POST em /api/import: " + JSON.stringify(req.body));
    const { state, maxItems, urlsExistentes, url } = req.body;
    const jobId = Date.now().toString();
    
    // Create job document
    await setDoc(doc(db, 'import_jobs', jobId), {
      status: 'in_progress',
      total_encontrado: 0,
      importados: 0,
      erros: [],
      created_at: new Date().toISOString()
    });

    res.json({ jobId });

    // Run import in background
    (async () => {
      logImport("Iniciando importação em background para job: " + jobId);
      try {
        const apifyClient = new ApifyClient({ token: process.env.APIFY_API_TOKEN || 'apify_api_nSiiUeo2i6nhi0w8fyPhsbzT757Qtj20JYr2' });
        
        const stateMapping: { [key: string]: string } = {
          'AC': '1', 'AL': '2', 'AP': '3', 'AM': '4', 'BA': '5', 'CE': '6', 'DF': '7', 'ES': '8',
          'GO': '9', 'MA': '10', 'MT': '11', 'MS': '12', 'MG': '31', 'PA': '14', 'PB': '15', 'PR': '16',
          'PE': '17', 'PI': '18', 'RJ': '19', 'RN': '20', 'RS': '21', 'RO': '22', 'RR': '23', 'SC': '24',
          'SP': '25', 'SE': '26', 'TO': '27'
        };
        const stateCode = state ? stateMapping[state.toUpperCase()] || state : '';
        
        const actorInput: any = { 
          startUrl: url || `https://www.leilaoimovel.com.br/encontre-seu-imovel?s=&estado=${stateCode}`,
          maxItems: Math.min(maxItems || 1000, 1000),
          useChrome: true,
          minDiscount: 0
        };
        if (urlsExistentes) {
          actorInput.urlsExistentes = urlsExistentes;
        }

        logImport("Chamando Apify com input: " + JSON.stringify(actorInput));
        const run = await apifyClient.actor("gio21/leilaoimovel-scraper").call(actorInput);
        logImport("Run concluído. Run completo: " + JSON.stringify(run, null, 2));
        
        // Aguarda para garantir que o dataset esteja populado
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Tenta ler os itens diretamente do dataset padrão da execução
        const datasetId = run.defaultDatasetId;
        logImport("Tentando ler datasetId: " + datasetId);
        
        const dataset = await apifyClient.dataset(datasetId);
        const list = await dataset.listItems();
        
        logImport("Dataset itens lidos: " + list.items.length);
        
        let items = list.items;
        
        // Filter by state if state is provided
        if (state) {
          logImport(`Filtrando itens pelo estado: ${state}`);
          items = items.filter(item => {
            const title = item.title || "";
            const address = item.address || "";
            
            // Verifica se contém SP (case insensitive) no título ou endereço
            const isMatch = /SP/i.test(title) || /SP/i.test(address);
            
            if (!isMatch) {
              logImport(`Descartado (Não é SP): "${title}" | "${address}"`);
            } else {
              logImport(`Mantido (É SP): "${title}" | "${address}"`);
            }
            
            return isMatch;
          });
        }
        
        logImport("Total de itens encontrados após filtragem: " + items.length);

        await setDoc(doc(db, 'import_jobs', jobId), {
          status: 'processing',
          total_encontrado_bruto: items.length
        }, { merge: true });

        if (urlsExistentes) {
          items = items.filter(item => !urlsExistentes.includes((item as any).url));
        }

        let importados = 0;
        let erros = [];

        await setDoc(doc(db, 'import_jobs', jobId), {
          total_encontrado_apos_filtro: items.length
        }, { merge: true });

        for (const item of items) {
          try {
            const data = item as any;
            if (!data.title || !data.price) {
              erros.push({ title: data.title || "Sem título", error: "Dados incompletos" });
              continue;
            }

            // Create a URL-safe ID based on the URL
            const idUnico = Buffer.from(data.url || data.title).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            await setDoc(doc(db, 'imoveis', idUnico), {
              titulo: data.title,
              preco: parseFloat(data.price.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
              preco_original: parseFloat(data.appraisal?.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
              preco_segunda_praca: data.secondPrice ? parseFloat(data.secondPrice.replace(/[^\d,]/g, '').replace(',', '.')) : null,
              data_segunda_praca: data.secondDate || null,
              endereco: data.address || "Não informado",
              // Tenta extrair cidade e estado do título ou endereço
              cidade: data.title.match(/em\s+([A-Za-z\s]+)\s*\//i)?.[1]?.trim() || data.address.split(',').pop()?.split('-')[0]?.trim() || data.address.split('-')[1]?.trim() || "Não informado",
              estado: data.title.match(/\/\s*([A-Z]{2})/i)?.[1]?.trim() || data.address.split('-').pop()?.trim() || "Não informado",
              imagem: data.image || "",
              url_leilao: data.url || "",
              id_leilao: idUnico, // Usando o ID único como identificador
              desconto: data.discount || 0,
              data_encerramento: data.closingDate || "Não informado",
              modalidades: data.modalities || [],
              tags: data.tag ? [data.tag] : []
            });
            importados++;
          } catch (e) {
            erros.push({ title: (item as any).title || "Sem título", error: String(e) });
          }
        }

        await setDoc(doc(db, 'import_jobs', jobId), {
          status: 'completed',
          importados,
          erros
        }, { merge: true });
        logImport("Importação concluída com sucesso para job: " + jobId);

      } catch (e) {
        logImport("Erro CRÍTICO na importação: " + String(e));
        await setDoc(doc(db, 'import_jobs', jobId), {
          status: 'error',
          error: String(e)
        }, { merge: true });
      }
    })();
  });

  // API route for stats
  app.get("/api/stats", async (req, res) => {
    try {
      const imoveisSnapshot = await getDocs(collection(db, 'imoveis'));
      const totalNoBanco = imoveisSnapshot.size;

      // Fetch website to get total count
      const response = await fetch('https://www.leilaoimovel.com.br/encontre-seu-imovel?s=&estado=31');
      const html = await response.text();
      // Simple regex to find the total count, assuming it's in the page
      const match = html.match(/(\d+)\s+imóveis encontrados/i);
      const totalNoSite = match ? parseInt(match[1]) : 0;

      res.json({ totalNoBanco, totalNoSite });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // API route to get count for a state
  app.get("/api/count/:state", async (req, res) => {
    const { state } = req.params;
    try {
      const response = await fetch(`https://www.leilaoimovel.com.br/encontre-seu-imovel?s=&estado=${state}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
      });
      const html = await response.text();
      // Log para depuração no servidor
      console.log(`Resposta do site para estado ${state}:`, html);
      const match = html.match(/(\d+)\s+imóvel/i);
      const totalNoSite = match ? parseInt(match[1]) : 0;
      res.json({ totalNoSite });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // API route to fix existing imoveis
  app.post("/api/corrigir-imoveis", async (req, res) => {
    try {
      const imoveisSnapshot = await getDocs(collection(db, 'imoveis'));
      let corrigidos = 0;
      
      for (const docSnapshot of imoveisSnapshot.docs) {
        const data = docSnapshot.data();
        const titulo = data.titulo || "";
        const endereco = data.endereco || "";
        
        const novaCidade = titulo.match(/em\s+([A-Za-z\s]+)\s*\//i)?.[1]?.trim() || endereco.split(',').pop()?.split('-')[0]?.trim() || endereco.split('-')[1]?.trim() || "Não informado";
        const novoEstado = titulo.match(/\/\s*([A-Z]{2})/i)?.[1]?.trim() || endereco.split('-').pop()?.trim() || "Não informado";
        
        if (novaCidade !== data.cidade || novoEstado !== data.estado) {
          await setDoc(doc(db, 'imoveis', docSnapshot.id), {
            cidade: novaCidade,
            estado: novoEstado
          }, { merge: true });
          corrigidos++;
        }
      }
      
      res.json({ message: "Correção concluída", corrigidos });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // API route to remove duplicates
  app.post("/api/remover-duplicados", async (req, res) => {
    try {
      const imoveisSnapshot = await getDocs(collection(db, 'imoveis'));
      const vistos = new Set();
      const paraExcluir = [];
      
      for (const docSnapshot of imoveisSnapshot.docs) {
        const data = docSnapshot.data();
        const idLeilao = data.id_leilao;
        
        if (idLeilao) {
          if (vistos.has(idLeilao)) {
            paraExcluir.push(docSnapshot.id);
          } else {
            vistos.add(idLeilao);
          }
        }
      }
      
      for (const id of paraExcluir) {
        await deleteDoc(doc(db, 'imoveis', id));
      }
      
      res.json({ message: "Duplicados removidos", totalRemovidos: paraExcluir.length });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // API route to delete all imoveis
  app.post("/api/excluir-todos", async (req, res) => {
    try {
      const imoveisSnapshot = await getDocs(collection(db, 'imoveis'));
      for (const docSnapshot of imoveisSnapshot.docs) {
        await deleteDoc(doc(db, 'imoveis', docSnapshot.id));
      }
      res.json({ message: "Todos os imóveis foram excluídos." });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Executa a correção e remoção de duplicados automaticamente ao iniciar
  (async () => {
    logImport("Iniciando correção e limpeza automática de imóveis...");
    try {
      const imoveisSnapshot = await getDocs(collection(db, 'imoveis'));
      
      // 1. Correção de dados e Garantia de id_leilao
      let corrigidos = 0;
      for (const docSnapshot of imoveisSnapshot.docs) {
        const data = docSnapshot.data();
        const titulo = data.titulo || "";
        const endereco = data.endereco || "";
        
        const novaCidade = titulo.match(/em\s+([A-Za-z\s]+)\s*\//i)?.[1]?.trim() || endereco.split(',').pop()?.split('-')[0]?.trim() || endereco.split('-')[1]?.trim() || "Não informado";
        const novoEstado = titulo.match(/\/\s*([A-Z]{2})/i)?.[1]?.trim() || endereco.split('-').pop()?.trim() || "Não informado";
        
        // Garante que id_leilao exista (usa url_leilao como fallback)
        const novoIdLeilao = data.id_leilao || data.url_leilao;

        if (novaCidade !== data.cidade || novoEstado !== data.estado || !data.id_leilao) {
          await setDoc(doc(db, 'imoveis', docSnapshot.id), {
            cidade: novaCidade,
            estado: novoEstado,
            id_leilao: novoIdLeilao
          }, { merge: true });
          corrigidos++;
        }
      }
      logImport(`Correção automática concluída. Imóveis corrigidos: ${corrigidos}`);

      // 2. Remoção de duplicados
      const imoveisSnapshotPosCorrecao = await getDocs(collection(db, 'imoveis'));
      const vistos = new Set();
      const paraExcluir = [];
      
      logImport(`Total de imóveis para análise de duplicados: ${imoveisSnapshotPosCorrecao.size}`);
      
      for (const docSnapshot of imoveisSnapshotPosCorrecao.docs) {
        const data = docSnapshot.data();
        const idLeilao = data.id_leilao;
        
        logImport(`Analisando imóvel: ${docSnapshot.id}, id_leilao: ${idLeilao}`);

        if (idLeilao && !idLeilao.includes('imoveis-springfield') && !/^\d+$/.test(idLeilao)) {
          if (vistos.has(idLeilao)) {
            logImport(`Duplicado encontrado: ${docSnapshot.id}, id_leilao: ${idLeilao}`);
            paraExcluir.push(docSnapshot.id);
          } else {
            vistos.add(idLeilao);
          }
        } else {
          logImport(`Imóvel ignorado na análise de duplicados (ID genérico ou numérico): ${docSnapshot.id}, id_leilao: ${idLeilao}`);
        }
      }
      
      logImport(`Total de duplicados encontrados: ${paraExcluir.length}`);
      
      for (const id of paraExcluir) {
        logImport(`Excluindo duplicado: ${id}`);
        await deleteDoc(doc(db, 'imoveis', id));
      }
      logImport(`Remoção de duplicados concluída. Imóveis removidos: ${paraExcluir.length}`);

    } catch (e) {
      logImport("Erro na correção/limpeza automática: " + String(e));
    }
  })();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
