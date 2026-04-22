/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, addDoc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Lock, Menu, X } from 'lucide-react';
import { db, auth } from './lib/firebase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import ErrorBoundary from './components/ErrorBoundary';

interface Imovel {
  id: string;
  titulo: string;
  preco: number;
  preco_original: number;
  endereco: string;
  cidade: string;
  estado: string;
  imagem: string;
  url_leilao: string;
  desconto: number;
  data_encerramento: string;
  modalidades: string[];
  tags: string[];
  cep?: string;
  id_leilao?: string;
  detalhes?: string;
  data_primeira_praca?: string;
  data_segunda_praca?: string;
}

const Home = ({ setPage, user, showLoginModal, setShowLoginModal, loginUser, setLoginUser, loginPass, setLoginPass, handleLogin, handleCreateAccount, handleGoogleLogin }: { setPage: (page: string) => void, user: any, showLoginModal: boolean, setShowLoginModal: (show: boolean) => void, loginUser: string, setLoginUser: (u: string) => void, loginPass: string, setLoginPass: (p: string) => void, handleLogin: () => Promise<void>, handleCreateAccount: () => Promise<void>, handleGoogleLogin: () => Promise<void> }) => {
// Responsive header fix applied
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [cidadeFiltro, setCidadeFiltro] = useState('');
  const [modalidadeFiltro, setModalidadeFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 32;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImoveis = async () => {
      console.log("Iniciando carregamento de imóveis...");
      try {
        const q = query(collection(db, 'imoveis'));
        const snapshot = await getDocs(q);
        console.log("Dados carregados. Número de documentos:", snapshot.docs.length);
        const imoveisCarregados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Imovel));
        if (imoveisCarregados.length > 0) {
          const cidadesUnicas = Array.from(new Set(imoveisCarregados.map(i => i.cidade)));
          console.log("Cidades únicas encontradas:", cidadesUnicas);
        }
        setImoveis(imoveisCarregados);
      } catch (error) {
        console.error("Erro detalhado ao carregar imóveis:", error);
        setError(`Erro ao carregar imóveis: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    fetchImoveis();
  }, []);

  const cidadesPrincipais = [
    "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Brasília", "Salvador", 
    "Fortaleza", "Manaus", "Curitiba", "Recife", "Porto Alegre", 
    "Belém", "Goiânia", "Guarulhos", "Campinas", "São Luís", 
    "Maceió", "Campo Grande", "São Gonçalo", "Teresina", "João Pessoa", 
    "São Bernardo do Campo", "Nova Iguaçu", "Duque de Caxias", "Natal", "Santo André", 
    "Osasco", "São José dos Campos", "Jaboatão dos Guararapes", "Ribeirão Preto", "Uberlândia", 
    "Contagem", "Sorocaba", "Aracaju", "Feira de Santana", "Cuiabá", 
    "Joinville", "Juiz de Fora", "Londrina", "Aparecida de Goiânia", "Ananindeua", 
    "Porto Velho", "Serra", "Caxias do Sul", "Niterói", "Belford Roxo", 
    "Campos dos Goytacazes", "São João de Meriti", "Vila Velha", "Mauá", "São José do Rio Preto"
  ];

  const cidadesMG = [
    "Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora", "Betim", "Montes Claros", "Ribeirão das Neves", "Uberaba", "Governador Valadares", "Ipatinga",
    "Sete Lagoas", "Divinópolis", "Santa Luzia", "Ibirité", "Poços de Caldas", "Patos de Minas", "Pouso Alegre", "Teófilo Otoni", "Barbacena", "Sabará",
    "Varginha", "Conselheiro Lafaiete", "Itabira", "Araguari", "Passos", "Ubá", "Coronel Fabriciano", "Muriaé", "Ituiutaba", "Lavras",
    "Nova Serrana", "Curvelo", "Itajubá", "São João del-Rei", "Pará de Minas", "Manhuaçu", "Viçosa", "Três Corações", "Alfenas", "Cataguases",
    "João Monlevade", "Paracatu", "Patrocínio", "Unaí", "Januária", "Ouro Preto", "Ponte Nova", "Formiga", "Lagoa Santa", "Pedro Leopoldo",
    "Frutal", "Campo Belo", "Araxá", "Bocaiúva", "São Sebastião do Paraíso", "Vespasiano", "Itabirito", "Congonhas", "Além Paraíba", "Pirapora",
    "Janaúba", "Leopoldina", "Santos Dumont", "Guaxupé", "Oliveira", "Santa Rita do Sapucaí", "Bom Despacho", "Brumadinho", "Mariana",
    "São Lourenço", "Iturama", "Capelinha", "Jequitinhonha", "Aimorés", "Caratinga", "Itaúna", "João Pinheiro", "Monte Carmelo", "Nanuque",
    "Piumhi", "Salinas", "Taiobeiras", "Três Pontas", "Arcos", "Barão de Cocais", "Cambuí", "Carangola", "Cláudio", "Conceição das Alagoas",
    "Esmeraldas", "Extrema", "Igarapé", "Itamarandiba", "Itanhandu", "Jacutinga", "Machado", "Muzambinho", "Ouro Branco", "Paraisópolis"
  ];

  const cidadesDoBanco = Array.from(new Set(
    imoveis
      .map(i => i.cidade ? i.cidade.replace(/^0+/, '').trim() : '')
      .filter(c => 
        c && 
        c.length > 2 && 
        c !== "Cidade não informada" && 
        !/^\d+$/.test(c) && 
        !/^\d+\s*,\s*[A-Z]/.test(c) && // Remove "1, PALMITAL"
        !/^\d+\s*ª\s*PAV/.test(c) && // Remove "1ª PAV"
        !/^\d+\s*º\s*SEÇÃO/.test(c) && // Remove "2º SEÇÃO"
        !/^[A-Z0-9\s]+,\s*[A-Z\s]+$/.test(c) && // Remove "A CS 02 LT 01 QD 05, NOVA SUICA"
        !c.toLowerCase().includes("cep") &&
        !c.toLowerCase().includes("qd") &&
        !c.toLowerCase().includes("lt") &&
        !c.toLowerCase().includes("cs") &&
        !c.toLowerCase().includes("chacara") &&
        !c.toLowerCase().includes("granja") &&
        !c.toLowerCase().includes("pav") &&
        !c.toLowerCase().includes("seção") &&
        !c.toLowerCase().includes("qrt")
      )
  ));

  const cidades = Array.from(new Set([...cidadesMG, ...cidadesDoBanco])).sort((a: string, b: string) => a.localeCompare(b));

  const modalidades = Array.from(new Set(
    imoveis.flatMap(i => i.modalidades || [])
  )).sort();
  const estados = Array.from(new Set(
    imoveis
      .map(i => i.estado ? i.estado.trim().toUpperCase() : '')
      .filter(e => e && e.length === 2 && /^[A-Z]{2}$/.test(e))
  )).sort();

  const imoveisFiltrados = imoveis.filter(imovel => 
    (cidadeFiltro === '' || (imovel.cidade?.replace(/^0+/, '').trim().toLowerCase() === cidadeFiltro.trim().toLowerCase())) &&
    (modalidadeFiltro === '' || imovel.modalidades?.includes(modalidadeFiltro)) &&
    (estadoFiltro === '' || (imovel.estado?.trim().toLowerCase() === estadoFiltro.trim().toLowerCase())) &&
    (searchTerm === '' || imovel.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) || imovel.endereco?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(imoveisFiltrados.length / pageSize);
  const imoveisPaginados = imoveisFiltrados.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 py-6 px-4 md:py-10 md:px-12 flex justify-between items-center relative">
        <div className="flex items-center gap-4">
          <img src="https://i.ibb.co/CK8V1n2P/logo.png" alt="Logo" className="h-16 md:h-32 w-auto" referrerPolicy="no-referrer" />
        </div>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-700">
          <button onClick={() => setPage('home')} className="hover:text-teal-800">QUEM SOMOS</button>
          <button className="hover:text-teal-800">CONTATO</button>
          <button className="hover:text-teal-800">DÚVIDAS</button>
          <button onClick={() => setShowLoginModal(true)} className="text-slate-300 hover:text-teal-800 opacity-50 hover:opacity-100 transition-opacity">
            <Lock size={16} />
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center gap-4">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-700">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-white border-b border-gray-200 py-4 px-4 flex flex-col gap-4 text-sm font-bold text-slate-700 md:hidden z-50">
            <button onClick={() => { setPage('home'); setIsMenuOpen(false); }} className="hover:text-teal-800 text-left">QUEM SOMOS</button>
            <button onClick={() => setIsMenuOpen(false)} className="hover:text-teal-800 text-left">CONTATO</button>
            <button onClick={() => setIsMenuOpen(false)} className="hover:text-teal-800 text-left">DÚVIDAS</button>
          </div>
        )}
      </nav>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 text-center font-bold">
          {error}
        </div>
      )}

      <div className="relative h-96 bg-teal-900 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1920&auto=format&fit=crop" alt="Banner" className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Leilões de imóveis em todo o Brasil</h1>
          
          <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-4xl flex flex-col md:flex-row gap-4">
            <input type="text" placeholder="Busque pela localização do imóvel" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 p-3 border rounded-md" />
            <select className="p-3 border rounded-md w-full md:w-48" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
              <option value="">Todos os Estados</option>
              {estados.map((e, i) => <option key={`estado-${i}`} value={e}>{e}</option>)}
            </select>
            <select className="p-3 border rounded-md w-full md:w-48" value={modalidadeFiltro} onChange={(e) => setModalidadeFiltro(e.target.value)}>
              <option value="">Todas as Modalidades</option>
              {modalidades.map((m, i) => <option key={`mod-${i}`} value={m}>{m}</option>)}
            </select>
            <select className="p-3 border rounded-md w-full md:w-48" value={cidadeFiltro} onChange={(e) => setCidadeFiltro(e.target.value)}>
              <option value="">Todas as Cidades</option>
              {cidades.map((c, i) => <option key={`cidade-${i}`} value={c}>{c}</option>)}
            </select>
            <Button className="bg-indigo-600 text-white px-8 hover:bg-indigo-700">BUSCAR</Button>
          </div>
        </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Acesso Administrativo</h2>
              
              <div className="space-y-4">
                <input 
                  type="email" 
                  placeholder="E-mail" 
                  value={loginUser} 
                  onChange={(e) => setLoginUser(e.target.value)} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none transition" 
                />
                <input 
                  type="password" 
                  placeholder="Senha" 
                  value={loginPass} 
                  onChange={(e) => setLoginPass(e.target.value)} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none transition" 
                />
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <button onClick={handleLogin} className="w-full px-4 py-3 bg-teal-900 text-white font-semibold rounded-xl hover:bg-teal-800 transition shadow-md">Entrar</button>
                <button onClick={handleGoogleLogin} className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Entrar com Google
                </button>
                <button onClick={handleCreateAccount} className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition">Criar Conta</button>
                <button onClick={() => setShowLoginModal(false)} className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Leilões</h2>
          <select className="p-2 border rounded-md">
            <option>Próximos Leilões</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {imoveisPaginados.map(imovel => (
            <div key={imovel.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
              <div className="relative h-48">
                {imovel.imagem && imovel.imagem.trim() !== "" ? (
                  <img src={imovel.imagem} alt={imovel.titulo} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/400/300'; }} />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">Sem imagem</div>
                )}
                <div className="absolute top-2 right-2 bg-teal-700 text-white text-sm font-bold px-3 py-1 rounded-lg shadow-lg">
                  {imovel.desconto}% OFF
                </div>
              </div>
              <div className="p-4 space-y-3 flex-1 flex flex-col">
                <div className="flex flex-wrap gap-1">
                  {imovel.modalidades?.map(m => <span key={m} className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded">{m}</span>)}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-orange-600">
                    R$ {(imovel.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="space-y-1 flex-1">
                  <h3 className="font-bold text-slate-900 line-clamp-2">{imovel.titulo}</h3>
                  <p className="text-xs text-slate-500 line-clamp-3">{imovel.endereco}</p>
                </div>
                
                <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-dashed mt-auto">
                  {imovel.data_primeira_praca && (
                    <p><strong>1ª Praça ({imovel.data_primeira_praca}):</strong> R$ {(imovel.preco_original || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  )}
                  {imovel.data_segunda_praca && (
                    <p><strong>2ª Praça ({imovel.data_segunda_praca}):</strong> R$ {(imovel.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  )}
                  {!imovel.data_primeira_praca && !imovel.data_segunda_praca && (
                    <p className="text-orange-600 font-semibold"><strong>Encerra em:</strong> {imovel.data_encerramento || 'N/A'}</p>
                  )}
                </div>

                <a 
                  href={imovel.url_leilao} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full bg-slate-800 text-white text-center font-bold py-2 rounded-lg hover:bg-slate-900 transition-colors mt-3"
                >
                  Acessar Leilão
                </a>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
            <span>Página {currentPage} de {totalPages}</span>
            <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Próxima</Button>
          </div>
        )}
      </div>

      <footer className="bg-slate-900 text-white py-12 mt-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-xl mb-4">TJ INVEST</h3>
            <p className="text-slate-400 text-sm">Sua plataforma especializada em leilões de imóveis com segurança e transparência.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Links Úteis</h4>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>Quem Somos</li>
              <li>Como Funciona</li>
              <li>Termos de Uso</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Contato</h4>
            <p className="text-slate-400 text-sm">contato@tjinvest.com.br</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-8 pt-8 border-t border-slate-800 text-center text-slate-500 text-xs">
          © 2026 TJ INVEST. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

const Admin = ({ setPage, user, showLoginModal, setShowLoginModal, loginUser, setLoginUser, loginPass, setLoginPass, handleLogin, handleCreateAccount, handleGoogleLogin }: { setPage: (page: string) => void, user: any, showLoginModal: boolean, setShowLoginModal: (show: boolean) => void, loginUser: string, setLoginUser: (u: string) => void, loginPass: string, setLoginPass: (p: string) => void, handleLogin: () => Promise<void>, handleCreateAccount: () => Promise<void>, handleGoogleLogin: () => Promise<void> }) => {
  const [status, setStatus] = useState<any>(null);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [urlImport, setUrlImport] = useState("");
  const [importingAll, setImportingAll] = useState(false);
  const [importingMissing, setImportingMissing] = useState(false);
  const [estadosConfig, setEstadosConfig] = useState<string[]>([]);
  const [novoEstado, setNovoEstado] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carregar estados
        const estadosSnapshot = await getDocs(collection(db, 'config_estados'));
        setEstadosConfig(estadosSnapshot.docs.map(doc => doc.id));
        
        // Carregar imóveis
        const q = query(collection(db, 'imoveis'));
        const imoveisSnapshot = await getDocs(q);
        setImoveis(imoveisSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Imovel)));
      } catch (err) {
        console.error("Erro ao carregar dados do Admin:", err);
        setError("Erro ao carregar dados. A cota diária do Firestore pode ter sido atingida.");
      }
    };
    fetchData();
  }, []);

  const [novaUrlNome, setNovaUrlNome] = useState("");
  const [novaUrl, setNovaUrl] = useState("");
  const [urlsBusca, setUrlsBusca] = useState<any[]>([]);
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false);

  useEffect(() => {
    const fetchUrls = async () => {
      const snapshot = await getDocs(collection(db, 'config_urls_busca'));
      setUrlsBusca(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchUrls();
  }, []);

  const adicionarUrlBusca = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (!novaUrlNome || !novaUrl) {
      alert("Preencha o nome e a URL.");
      return;
    }
    try {
      await setDoc(doc(db, 'config_urls_busca', novaUrlNome), { url: novaUrl });
      setUrlsBusca(prev => [...prev.filter(u => u.id !== novaUrlNome), { id: novaUrlNome, url: novaUrl }]);
      setNovaUrlNome("");
      setNovaUrl("");
    } catch (error) {
      console.error("Erro ao adicionar URL:", error);
    }
  };

  const removerUrlBusca = async (id: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    await deleteDoc(doc(db, 'config_urls_busca', id));
    setUrlsBusca(prev => prev.filter(u => u.id !== id));
  };

  const limparLeiloesEncerradosManual = async () => {
    setConfirmandoLimpeza(true);
  };

  const confirmarLimpeza = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setConfirmandoLimpeza(false);
    
    try {
      console.log("Iniciando limpeza manual de leilões encerrados...");
      const now = new Date();
      const imoveisSnapshot = await getDocs(collection(db, 'imoveis'));
      let removidos = 0;
      
      for (const docSnapshot of imoveisSnapshot.docs) {
        const data = docSnapshot.data();
        console.log(`Analisando imóvel ${docSnapshot.id}: data_encerramento=${data.data_encerramento}`);
        if (data.data_encerramento && data.data_encerramento !== "Data não informada") {
          // Tenta encontrar o padrão DD/MM/YYYY na string
          const match = data.data_encerramento.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (match) {
            const [_, day, month, year] = match.map(Number);
            const closingDate = new Date(year, month - 1, day);
            console.log(`Comparando: closingDate=${closingDate.toISOString()}, now=${now.toISOString()}, encerrado=${closingDate < now}`);
            if (closingDate < now) {
              await deleteDoc(doc(db, 'imoveis', docSnapshot.id));
              console.log(`Removido: ${docSnapshot.id}`);
              removidos++;
            }
          } else {
            console.warn(`Formato de data não reconhecido para imóvel ${docSnapshot.id}: ${data.data_encerramento}`);
          }
        }
      }
      alert(`Limpeza concluída. ${removidos} leilões encerrados removidos.`);
      // Recarrega a lista
      const imoveisSnapshotAtualizado = await getDocs(query(collection(db, 'imoveis')));
      setImoveis(imoveisSnapshotAtualizado.docs.map(doc => ({ id: doc.id, ...doc.data() } as Imovel)));
    } catch (error) {
      console.error("Erro na limpeza manual:", error);
      alert("Erro ao limpar leilões. Verifique o console.");
    }
  };

  const adicionarEstado = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (novoEstado.length !== 2) {
      alert("Digite a sigla do estado com 2 letras.");
      return;
    }
    try {
      await setDoc(doc(db, 'config_estados', novoEstado.toUpperCase()), { ativo: true });
      setEstadosConfig(prev => [...new Set([...prev, novoEstado.toUpperCase()])]);
      setNovoEstado("");
    } catch (error) {
      console.error("Erro ao adicionar estado:", error);
      alert("Erro ao adicionar estado. Verifique o console.");
    }
  };

  const removerEstado = async (estado: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    try {
      await deleteDoc(doc(db, 'config_estados', estado));
      setEstadosConfig(prev => prev.filter(e => e !== estado));
    } catch (error) {
      console.error("Erro ao remover estado:", error);
      alert("Erro ao remover estado. Verifique o console.");
    }
  };

  const excluirTodos = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    // Confirmação manual via alert para evitar o erro do confirm() em iframe
    const confirmacao = window.prompt("Digite 'SIM' para confirmar a exclusão de TODOS os imóveis:");
    if (confirmacao !== 'SIM') {
      alert("Exclusão cancelada.");
      return;
    }
    
    console.log(`Iniciando exclusão de ${imoveis.length} imóveis...`);
    
    try {
      const resultados = await Promise.all(imoveis.map(async (i) => {
        try {
          await deleteDoc(doc(db, 'imoveis', i.id));
          return { id: i.id, sucesso: true };
        } catch (e) {
          console.error(`Erro ao excluir ${i.id}:`, e);
          return { id: i.id, sucesso: false, erro: e };
        }
      }));
      
      const falhas = resultados.filter(r => !r.sucesso);
      if (falhas.length > 0) {
        console.error("Falhas na exclusão:", falhas);
        alert(`Erro ao excluir ${falhas.length} imóveis. Verifique o console.`);
      } else {
        alert("Todos os imóveis foram excluídos.");
        console.log("Exclusão concluída.");
      }
    } catch (error) {
      console.error("Erro geral ao excluir imóveis:", error);
      alert("Erro ao excluir imóveis. Verifique o console.");
    }
  };

  const importarEmLotes = async (estado?: string, urlPassada?: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setImportingAll(true);
    let totalImportado = 0;
    let continuar = true;
    
    while (continuar) {
      const body: any = { maxItems: 1000, offset: totalImportado };
      if (urlPassada) body.url = urlPassada;
      else if (urlImport) body.url = urlImport;
      else body.state = estado || 'MG';
      
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const { jobId, count } = await response.json();
      
      // Espera o job terminar
      await new Promise<void>((resolve) => {
        const unsub = onSnapshot(doc(db, 'import_jobs', jobId), (doc) => {
          if (doc.data()?.status === 'completed' || doc.data()?.status === 'error') {
            unsub();
            resolve();
          }
        });
      });

      totalImportado += (count || 0);
      if (!count || count < 1000) continuar = false;
      alert(`Importados ${totalImportado} imóveis para ${estado || 'MG'} até agora...`);
    }
    setImportingAll(false);
    alert(`Importação para ${estado || 'MG'} concluída!`);
  };

  const processarConteudo = async (conteudo: string, tipo: 'xml' | 'json') => {
    if (!conteudo || conteudo.trim() === "") {
      alert("O conteúdo está vazio!");
      return;
    }
    setImportingAll(true);
    try {
      let novosImoveis: Partial<Imovel>[] = [];
      
      if (tipo === 'xml') {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(conteudo, "text/xml");
        const items = xmlDoc.getElementsByTagName("item");
        
        novosImoveis = Array.from(items).map(item => ({
          titulo: item.getElementsByTagName("title")[0]?.textContent || "Sem título",
          preco: parseFloat(item.getElementsByTagName("price")[0]?.textContent?.replace(/[^\d,]/g, '').replace(',', '.') || "0"),
          preco_original: parseFloat(item.getElementsByTagName("appraisal")[0]?.textContent?.replace(/[^\d,]/g, '').replace(',', '.') || "0"),
          endereco: item.getElementsByTagName("address")[0]?.textContent || "Endereço não informado",
          cidade: item.getElementsByTagName("address")[0]?.textContent?.split('-')[1]?.split(',')[0]?.trim() || "Cidade não informada",
          estado: item.getElementsByTagName("address")[0]?.textContent?.split('-')[2]?.trim() || "Estado não informado",
          imagem: item.getElementsByTagName("image")[0]?.textContent || "",
          url_leilao: item.getElementsByTagName("url")[0]?.textContent || "#",
          desconto: parseInt(item.getElementsByTagName("discount")[0]?.textContent || "0"),
          data_encerramento: item.getElementsByTagName("closingDate")[0]?.textContent || "Data não informada",
          modalidades: Array.from(item.getElementsByTagName("modalities")).map(m => m.textContent || ""),
          tags: [],
          id_leilao: item.getElementsByTagName("index")[0]?.textContent || "",
        }));
      } else {
        const data = JSON.parse(conteudo);
        novosImoveis = Array.isArray(data) ? data : data.items;
      }

      await Promise.all(novosImoveis.map(async (imovel) => {
        await addDoc(collection(db, 'imoveis'), imovel);
      }));
      
      alert(`Importados ${novosImoveis.length} imóveis com sucesso!`);
      
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      alert(`Erro ao processar arquivo: ${error instanceof Error ? error.message : "Formato inválido"}`);
    } finally {
      setImportingAll(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const conteudo = event.target?.result as string;
      const tipo = file.name.endsWith('.json') ? 'json' : 'xml';
      processarConteudo(conteudo, tipo);
    };
    reader.readAsText(file);
  };

  const [filtroIncompletos, setFiltroIncompletos] = useState(false);
  const [filtroDuplicados, setFiltroDuplicados] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editImovel, setEditImovel] = useState<Partial<Imovel>>({});

  const deleteImovel = async (id: string) => {
    console.log("DB instance:", db);
    try {
      console.log("Tentando excluir imóvel com ID:", id);
      const docRef = doc(db, 'imoveis', id);
      console.log("Referência do documento:", docRef);
      await deleteDoc(docRef);
      console.log("Exclusão bem-sucedida.");
      alert("Imóvel excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir imóvel:", error);
      alert("Erro ao excluir imóvel. Verifique o console.");
    }
  };

  const startEdit = (imovel: Imovel) => {
    setEditingId(imovel.id);
    setEditImovel(imovel);
  };

  const saveEdit = async (id: string) => {
    await updateDoc(doc(db, 'imoveis', id), {
      ...editImovel,
      preco: Number(editImovel.preco),
      preco_original: Number(editImovel.preco_original),
      desconto: Number(editImovel.desconto),
      modalidades: typeof editImovel.modalidades === 'string' ? (editImovel.modalidades as string).split(',').map(s => s.trim()) : editImovel.modalidades,
      tags: typeof editImovel.tags === 'string' ? (editImovel.tags as string).split(',').map(s => s.trim()) : editImovel.tags,
    });
    setEditingId(null);
  };

  useEffect(() => {
    fetch('/api/stats').then(res => res.json()).then(setStats);
  }, []);

  const toggleSelecao = (id: string) => {
    const novaSelecao = new Set(selecionados);
    if (novaSelecao.has(id)) novaSelecao.delete(id);
    else novaSelecao.add(id);
    setSelecionados(novaSelecao);
  };

  const toggleSelecionarTodos = () => {
    if (selecionados.size === imoveisExibidos.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(imoveisExibidos.map(i => i.id)));
    }
  };

  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const excluirSelecionados = async () => {
    console.log("Excluir selecionados clicado. Tamanho da seleção:", selecionados.size);
    if (selecionados.size === 0) {
      alert("Nenhum imóvel selecionado.");
      return;
    }
    
    setConfirmandoExclusao(true);
  };

  const confirmarExclusao = async () => {
    try {
      console.log("Iniciando exclusão em lote...");
      await Promise.all(Array.from(selecionados).map((id: string) => deleteDoc(doc(db, 'imoveis', id))));
      console.log("Exclusão concluída.");
      setSelecionados(new Set());
      setConfirmandoExclusao(false);
      alert("Imóveis selecionados excluídos.");
    } catch (error) {
      console.error("Erro na exclusão em lote:", error);
      alert("Erro ao excluir. Verifique o console.");
      setConfirmandoExclusao(false);
    }
  };

  const repararImovel = async (imovel: Imovel) => {
    console.log("Reparando imóvel:", imovel.id);
    const reparos: Partial<Imovel> = {};
    
    // Verifica se o campo está vazio ou se contém um placeholder comum
    if (!imovel.titulo || imovel.titulo === "Sem título") reparos.titulo = "Título não informado";
    if (!imovel.preco || imovel.preco === 0) reparos.preco = 0;
    if (!imovel.endereco || imovel.endereco === "Endereço não informado") reparos.endereco = "Endereço não informado";
    if (!imovel.cidade || imovel.cidade === "Cidade não informada") reparos.cidade = "Cidade não informada";
    if (!imovel.estado || imovel.estado === "Estado não informado") reparos.estado = "Estado não informado";
    if (!imovel.imagem) reparos.imagem = "";
    if (!imovel.url_leilao || imovel.url_leilao === "#") reparos.url_leilao = "#";
    
    // Verifica se realmente há algo para atualizar
    const camposParaReparar = Object.keys(reparos);
    if (camposParaReparar.length === 0) {
      console.log("Nenhum reparo necessário para:", imovel.id);
      return;
    }

    try {
      await updateDoc(doc(db, 'imoveis', imovel.id), reparos);
      console.log("Imóvel reparado com sucesso:", imovel.id);
      alert(`Imóvel ${imovel.id} reparado!`);
    } catch (error) {
      console.error("Erro ao reparar imóvel:", error);
      alert(`Erro ao reparar imóvel ${imovel.id}. Verifique o console.`);
    }
  };

  const isIncompleto = (i: Imovel) => 
    !i.titulo || i.titulo === "Sem título" || 
    !i.preco || i.preco === 0 ||
    !i.endereco || i.endereco === "Endereço não informado" || 
    !i.cidade || i.cidade === "Cidade não informada" ||
    !i.estado || i.estado === "Estado não informado" ||
    !i.url_leilao || i.url_leilao === "#";

  const excluirIncompletos = async () => {
    const incompletos = imoveis.filter(isIncompleto);
    if (incompletos.length === 0) {
      alert("Nenhum imóvel incompleto encontrado.");
      return;
    }
    const confirmacao = window.prompt(`Excluir ${incompletos.length} imóveis incompletos? Digite 'SIM' para confirmar:`);
    if (confirmacao !== 'SIM') return;

    await Promise.all(incompletos.map(i => deleteDoc(doc(db, 'imoveis', i.id))));
    alert("Imóveis incompletos excluídos.");
  };

  const repararIncompletos = async () => {
    const incompletos = imoveis.filter(isIncompleto);
    if (incompletos.length === 0) {
      alert("Nenhum imóvel incompleto encontrado.");
      return;
    }
    await Promise.all(incompletos.map(i => repararImovel(i)));
    alert("Reparo concluído!");
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  const imoveisExibidos = imoveis
    .filter(i => {
      const matchSearch = i.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          i.endereco?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchIncompleto = !filtroIncompletos || 
        !i.titulo || i.titulo === "Sem título" || 
        !i.preco || i.preco === 0 ||
        !i.endereco || i.endereco === "Endereço não informado" || 
        !i.cidade || i.cidade === "Cidade não informada" ||
        !i.estado || i.estado === "Estado não informado" ||
        !i.url_leilao || i.url_leilao === "#";
      
      const matchDuplicado = !filtroDuplicados || 
        imoveis.filter(j => {
          const ehDuplicado = j.id_leilao === i.id_leilao;
          if (ehDuplicado && j.id !== i.id) {
            console.log(`Duplicado encontrado: ${i.titulo} (${i.id_leilao}) e ${j.titulo} (${j.id_leilao})`);
          }
          return ehDuplicado;
        }).length > 1;

      return matchSearch && matchIncompleto && matchDuplicado;
    })
    .sort((a, b) => {
      if (filtroDuplicados) {
        if (a.id_leilao !== b.id_leilao) {
          return (a.id_leilao || "").localeCompare(b.id_leilao || "");
        }
      }
      if (!sortOrder) return 0;
      return sortOrder === "asc" ? a.preco - b.preco : b.preco - a.preco;
    });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {error && (
        <div className="p-4 mb-4 bg-red-100 text-red-700 text-center font-bold">
          {error}
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
        <div className="flex gap-2">
          <Button onClick={limparLeiloesEncerradosManual} variant="destructive">Limpar Leilões Encerrados</Button>
          <Button onClick={() => setPage('home')} variant="outline">Voltar para Home</Button>
        </div>
      </div>
      
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Login Administrativo</h3>
            <input type="email" placeholder="E-mail" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} className="w-full p-2 border rounded-lg mb-2" />
            <input type="password" placeholder="Senha" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full p-2 border rounded-lg mb-4" />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowLoginModal(false)} variant="outline">Cancelar</Button>
              <Button onClick={handleCreateAccount} variant="secondary">Criar Conta</Button>
              <Button onClick={handleGoogleLogin} className="bg-red-600 hover:bg-red-700">Entrar com Google</Button>
              <Button onClick={handleLogin}>Entrar</Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Gerenciamento</h2>
            <input 
              type="text" 
              placeholder="Buscar por título ou endereço..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 mb-4 border rounded-lg"
            />
            <select 
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc" | null)}
              className="w-full p-3 mb-6 border rounded-lg"
            >
              <option value="">Ordenar por preço</option>
              <option value="asc">Preço (Crescente)</option>
              <option value="desc">Preço (Decrescente)</option>
            </select>
            
            {stats && (
              <div className="mb-6 p-4 bg-blue-50 rounded-xl text-sm border border-blue-100">
                <p className="text-blue-900">Total no Site: <span className="font-bold">{stats.totalNoSite}</span></p>
                <p className="text-blue-900">Total no Banco: <span className="font-bold">{stats.totalNoBanco}</span></p>
                <p className="text-blue-900 font-bold mt-2">Faltam: {Math.max(0, stats.totalNoSite - stats.totalNoBanco)}</p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 border-b pb-2">Configuração de Estados</h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Sigla (ex: SP)" 
                  value={novoEstado}
                  onChange={(e) => setNovoEstado(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
                <Button onClick={adicionarEstado}>Adicionar</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {estadosConfig.map(estado => (
                  <div key={estado} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-sm">
                    {estado}
                    <button onClick={() => removerEstado(estado)} className="text-red-500 font-bold">x</button>
                    <button onClick={async (e) => {
                      e.preventDefault();
                      console.log("Botão de interrogação clicado para:", estado);
                      try {
                        const url = `${window.location.origin}/api/count/${estado}`;
                        console.log("Buscando URL:", url);
                        const res = await fetch(url);
                        console.log("Status da resposta:", res.status);
                        const data = await res.json();
                        console.log("Dados recebidos:", data);
                        alert(`Existem ${data.totalNoSite} imóveis para o estado ${estado} no site.`);
                      } catch (err) {
                        console.error("Erro na requisição:", err);
                        alert("Erro ao buscar dados. Verifique o console.");
                      }
                    }} className="text-blue-500 font-bold">?</button>
                  </div>
                ))}
              </div>

              <h3 className="font-semibold text-gray-900 border-b pb-2 mt-6">Importação</h3>
              <Button onClick={async () => {
                for (const estado of estadosConfig) {
                  await importarEmLotes(estado);
                }
              }} className="w-full bg-blue-600 hover:bg-blue-700 text-white">Importar Todos os Estados</Button>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                {estadosConfig.map(estado => (
                  <Button key={estado} onClick={() => importarEmLotes(estado)} variant="outline" className="text-sm">
                    Importar {estado}
                  </Button>
                ))}
              </div>

              <h3 className="font-semibold text-gray-900 border-b pb-2 mt-6">URLs de Busca Personalizadas</h3>
              <div className="space-y-2 mt-2">
                <input type="text" placeholder="Nome (ex: Leilão SP)" value={novaUrlNome} onChange={(e) => setNovaUrlNome(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                <input type="text" placeholder="URL completa" value={novaUrl} onChange={(e) => setNovaUrl(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                <Button onClick={adicionarUrlBusca} className="w-full">Salvar URL</Button>
              </div>
              <div className="space-y-2 mt-2">
                {urlsBusca.map(u => (
                  <div key={u.id} className="flex items-center justify-between gap-2 bg-gray-50 p-2 rounded text-sm">
                    <span>{u.id}</span>
                    <div className="flex gap-1">
                      <Button onClick={() => importarEmLotes(undefined, u.url)} size="sm" variant="outline">Importar</Button>
                      <Button onClick={() => removerUrlBusca(u.id)} size="sm" variant="destructive">x</Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mt-4">
                <p className="text-xs text-gray-500">Importação Manual:</p>
                <textarea 
                  placeholder="Cole o XML ou JSON aqui..." 
                  value={urlImport}
                  onChange={(e) => setUrlImport(e.target.value)}
                  className="w-full p-2 border rounded-lg h-20 text-sm"
                />
                <Button onClick={(e) => { e.preventDefault(); processarConteudo(urlImport, urlImport.trim().startsWith('<') ? 'xml' : 'json'); }} disabled={importingAll} className="w-full bg-slate-800 hover:bg-slate-900 text-white">
                  {importingAll ? 'Importando...' : 'Importar Conteúdo Colado'}
                </Button>
              </div>

              <h3 className="font-semibold text-gray-900 border-b pb-2 mt-6">Limpeza e Manutenção</h3>
              <Button onClick={excluirIncompletos} variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50">Excluir Incompletos</Button>
              <Button onClick={repararIncompletos} variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50">Reparar Incompletos</Button>
              <Button onClick={() => excluirTodos()} variant="outline" className="w-full border-red-600 text-red-700 hover:bg-red-600 hover:text-white">Excluir TODOS os Imóveis</Button>
              
              <h3 className="font-semibold text-gray-900 border-b pb-2 mt-6">Visualização</h3>
              <Button 
                variant={filtroIncompletos ? "default" : "outline"} 
                onClick={() => setFiltroIncompletos(!filtroIncompletos)}
                className="w-full"
              >
                {filtroIncompletos ? 'Mostrar Todos' : 'Filtrar Incompletos'}
              </Button>
              <Button 
                variant={filtroDuplicados ? "default" : "outline"} 
                onClick={() => setFiltroDuplicados(!filtroDuplicados)}
                className="w-full"
              >
                {filtroDuplicados ? 'Mostrar Todos' : 'Filtrar Duplicados'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">Lista de Imóveis ({imoveisExibidos.length})</h2>
          <div className="flex items-center gap-4 mb-4 bg-white p-4 rounded-lg border border-gray-200">
            <input 
              type="checkbox" 
              checked={selecionados.size === imoveisExibidos.length && imoveisExibidos.length > 0} 
              onChange={toggleSelecionarTodos}
              className="w-5 h-5"
            />
            <span className="text-sm font-medium">Selecionar Todos</span>
            <Button variant="destructive" onClick={excluirSelecionados} disabled={selecionados.size === 0}>
              Excluir Selecionados ({selecionados.size})
            </Button>
          </div>

          {confirmandoExclusao && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl">
                <h3 className="text-lg font-bold mb-4">Confirmar Exclusão</h3>
                <p className="mb-6">Tem certeza que deseja excluir {selecionados.size} imóveis?</p>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setConfirmandoExclusao(false)}>Cancelar</Button>
                  <Button variant="destructive" onClick={confirmarExclusao}>Confirmar Exclusão</Button>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {imoveisExibidos.map(imovel => (
              <div key={imovel.id} className="bg-white p-5 rounded-xl border border-gray-200 flex items-center gap-4 shadow-sm">
                <input 
                  type="checkbox" 
                  checked={selecionados.has(imovel.id)} 
                  onChange={() => toggleSelecao(imovel.id)}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  {editingId === imovel.id ? (
                    <div className="grid grid-cols-2 gap-4">
                      <input className="border p-2 rounded" placeholder="Título" value={editImovel.titulo} onChange={e => setEditImovel({...editImovel, titulo: e.target.value})} />
                      <input className="border p-2 rounded" placeholder="Preço" type="number" value={editImovel.preco} onChange={e => setEditImovel({...editImovel, preco: Number(e.target.value)})} />
                      <input className="border p-2 rounded" placeholder="Preço Original" type="number" value={editImovel.preco_original} onChange={e => setEditImovel({...editImovel, preco_original: Number(e.target.value)})} />
                      <input className="border p-2 rounded" placeholder="Endereço" value={editImovel.endereco} onChange={e => setEditImovel({...editImovel, endereco: e.target.value})} />
                      <input className="border p-2 rounded" placeholder="Cidade" value={editImovel.cidade} onChange={e => setEditImovel({...editImovel, cidade: e.target.value})} />
                      <input className="border p-2 rounded" placeholder="Estado" value={editImovel.estado} onChange={e => setEditImovel({...editImovel, estado: e.target.value})} />
                      <input className="border p-2 rounded" placeholder="URL Leilão" value={editImovel.url_leilao} onChange={e => setEditImovel({...editImovel, url_leilao: e.target.value})} />
                      <input className="border p-2 rounded" placeholder="Desconto" type="number" value={editImovel.desconto} onChange={e => setEditImovel({...editImovel, desconto: Number(e.target.value)})} />
                      <input className="border p-2 rounded" placeholder="Data Encerramento" value={editImovel.data_encerramento} onChange={e => setEditImovel({...editImovel, data_encerramento: e.target.value})} />
                      <input className="border p-2 rounded" placeholder="Modalidades" value={Array.isArray(editImovel.modalidades) ? editImovel.modalidades.join(', ') : editImovel.modalidades} onChange={e => setEditImovel({...editImovel, modalidades: e.target.value})} />
                      <input className="border p-2 rounded" placeholder="Tags" value={Array.isArray(editImovel.tags) ? editImovel.tags.join(', ') : editImovel.tags} onChange={e => setEditImovel({...editImovel, tags: e.target.value})} />
                      <Button onClick={() => saveEdit(imovel.id)} className="col-span-2 bg-blue-900">Salvar</Button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className={`truncate flex-1 mr-4 font-medium ${(!imovel.titulo || !imovel.preco || !imovel.endereco) ? 'text-red-600' : 'text-gray-900'}`}>
                        {imovel.titulo || "Título Ausente"}
                      </span>
                      <div className="space-x-2">
                        <Button variant="outline" onClick={() => startEdit(imovel)}>Editar</Button>
                        <Button variant="secondary" onClick={() => repararImovel(imovel)}>Reparar</Button>
                        <Button variant="destructive" onClick={() => deleteImovel(imovel.id)}>Excluir</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {status && (
        <div className="mt-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm text-sm">
          <h3 className="font-bold text-lg mb-2">Status da Importação</h3>
          <p>Status: <span className="font-semibold">{status.status}</span></p>
          <p>Total Bruto: {status.total_encontrado_bruto ?? 'N/A'}</p>
          <p>Total Após Filtro: {status.total_encontrado_apos_filtro ?? 'N/A'}</p>
          <p>Importados: {status.importados || 0}</p>
          {status.erros?.length > 0 && <p className="text-red-500 font-semibold">Erros: {status.erros.length}</p>}
          {status.error && <p className="text-red-500 font-semibold">Erro: {status.error}</p>}
        </div>
      )}
      <footer className="bg-slate-900 text-white py-12 mt-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-xl mb-4">TJ INVEST</h3>
            <p className="text-slate-400 text-sm">Sua plataforma especializada em leilões de imóveis com segurança e transparência.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Links Úteis</h4>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>Quem Somos</li>
              <li>Como Funciona</li>
              <li>Termos de Uso</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Contato</h4>
            <p className="text-slate-400 text-sm">contato@tjinvest.com.br</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-8 pt-8 border-t border-slate-800 text-center text-slate-500 text-xs">
          © 2026 TJ INVEST. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  const [page, setPage] = useState('home');
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const handleCreateAccount = async () => {
    console.log("handleCreateAccount called", { loginUser, loginPass });
    if (!loginUser || !loginPass) {
      alert("Por favor, preencha o e-mail e a senha.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginUser)) {
      alert("Por favor, insira um e-mail válido.");
      return;
    }
    try {
      console.log("Attempting to create user...");
      await createUserWithEmailAndPassword(auth, loginUser, loginPass);
      alert("Conta criada com sucesso! Você já pode entrar.");
      setLoginUser('');
      setLoginPass('');
    } catch (error: any) {
      console.error("Erro ao criar conta:", error);
      alert(`Erro ao criar conta: ${error.message}`);
    }
  };

  const handleLogin = async () => {
    if (!loginUser || !loginPass) {
      alert("Por favor, preencha o e-mail e a senha.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginUser)) {
      alert("Por favor, insira um e-mail válido.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, loginUser, loginPass);
      setShowLoginModal(false);
      setLoginUser('');
      setLoginPass('');
      setPage('admin');
    } catch (error: any) {
      console.error("Erro ao fazer login:", error);
      let errorMessage = "Erro ao fazer login. Verifique as credenciais.";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "Usuário não encontrado.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Senha incorreta.";
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = "E-mail ou senha inválidos.";
      } else {
        errorMessage = `Erro: ${error.message}`;
      }
      alert(errorMessage);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setShowLoginModal(false);
      setPage('admin');
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("Login com Google cancelado pelo usuário.");
        return;
      }
      console.error("Erro ao fazer login com Google:", error);
      alert(`Erro ao fazer login com Google: ${error.message}`);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {page === 'home' ? (
          <Home setPage={setPage} user={user} showLoginModal={showLoginModal} setShowLoginModal={setShowLoginModal} loginUser={loginUser} setLoginUser={setLoginUser} loginPass={loginPass} setLoginPass={setLoginPass} handleLogin={handleLogin} handleCreateAccount={handleCreateAccount} handleGoogleLogin={handleGoogleLogin} />
        ) : (
          <Admin setPage={setPage} user={user} showLoginModal={showLoginModal} setShowLoginModal={setShowLoginModal} loginUser={loginUser} setLoginUser={setLoginUser} loginPass={loginPass} setLoginPass={setLoginPass} handleLogin={handleLogin} handleCreateAccount={handleCreateAccount} handleGoogleLogin={handleGoogleLogin} />
        )}
      </div>
    </ErrorBoundary>
  );
}
