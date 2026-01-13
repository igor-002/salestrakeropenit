import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Users,
  Search,
  TrendingUp,
  DollarSign,
  Package,
  Activity,
  Menu,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Save,
  MessageSquare,
  CalendarCheck,
  Sparkles,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  PieChart,
  CalendarDays,
  Trash2,
  Receipt,
  Tag,
  ShoppingBag,
  Edit2,
  BarChart2,
  Filter,
  Map,
  Layers,
  TrendingDown,
  Shield,
  Tv,
  ArrowLeft,
  Target,
  CheckCircle,
  XCircle,
  Upload,
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app'; // Importação corrigida
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';

// --- CONFIGURAÇÃO FIREBASE (CORRIGIDA E SEGURA PARA RELOAD) ---
const firebaseConfig = {
  apiKey: 'AIzaSyC72QAQ_29kCuLdyJstX950xRFpHg_mid0',
  authDomain: 'salestracker-openit.firebaseapp.com',
  projectId: 'salestracker-openit',
  storageBucket: 'salestracker-openit.firebasestorage.app',
  messagingSenderId: '298358892570',
  appId: '1:298358892570:web:bd9be3e9b33ddd70f049a3',
};

// Correção do erro "Duplicate App": Verifica se já existe antes de criar
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- CONFIGURAÇÃO GEMINI API ---
const apiKey = '';

const callGemini = async (prompt) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!response.ok) throw new Error('Falha na requisição Gemini');
    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Não foi possível gerar a resposta.'
    );
  } catch (error) {
    console.error('Erro Gemini:', error);
    return 'Erro ao conectar com a IA. Tente novamente.';
  }
};

// --- UTILITÁRIOS ---
const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    value || 0
  );
const formatCNPJCPF = (value) => {
  const numbers = value.replace(/\D/g, '');
  
  // CPF: 000.000.000-00
  if (numbers.length <= 11) {
    return numbers
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
      .substring(0, 14);
  }
  
  // CNPJ: 00.000.000/0000-00
  return numbers
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
};
const formatDate = (date) => {
  if (!date) return '-';
  const d = date.toDate ? date.toDate() : new Date(date);
  return new Intl.DateTimeFormat('pt-BR').format(d);
};
const toInputDate = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toISOString().split('T')[0];
};
const getMonthName = (date) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    date
  );
const getShortMonthName = (monthIndex) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(new Date(2023, monthIndex, 1))
    .toUpperCase()
    .replace('.', '');

const STATUS_OPTIONS = [
  {
    value: 'aguardando',
    label: 'Aguardando Equipamento',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
  },
  {
    value: 'implantacao',
    label: 'Em Implantação',
    color: 'bg-blue-100 text-blue-800',
    icon: Loader2,
  },
  {
    value: 'ativo',
    label: 'Ativo',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle2,
  },
  {
    value: 'cancelado',
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800',
    icon: X,
  },
];

const LEAD_STATUS = [
  {
    value: 'novo',
    label: 'Novo',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    value: 'contato',
    label: 'Em Contato',
    color: 'bg-yellow-100 text-yellow-800',
  },
  {
    value: 'proposta',
    label: 'Proposta Enviada',
    color: 'bg-purple-100 text-purple-800',
  },
  {
    value: 'negociacao',
    label: 'Em Negociação',
    color: 'bg-orange-100 text-orange-800',
  },
  {
    value: 'convertido',
    label: 'Convertido',
    color: 'bg-green-100 text-green-800',
  },
  {
    value: 'perdido',
    label: 'Perdido',
    color: 'bg-red-100 text-red-800',
  },
];

const BRAZIL_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

const BUSINESS_SEGMENTS = [
  'Varejo',
  'Atacado',
  'Indústria',
  'Serviços',
  'Tecnologia',
  'Saúde',
  'Educação',
  'Alimentos',
  'Construção',
  'Outros',
];

// --- TELA DE LOGIN ---
const AuthScreen = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      onLogin(userCredential.user);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('Usuário não encontrado');
      } else if (err.code === 'auth/wrong-password') {
        setError('Senha incorreta');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Email ou senha incorretos');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
          <div className="flex items-center justify-center mb-4">
            <TrendingUp size={48} />
          </div>
          <h1 className="text-3xl font-bold text-center">SalesTracker</h1>
          <p className="text-center text-blue-100 mt-2">
            Sistema de Gestão de Vendas
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Entrar no Sistema
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Email
              </label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Senha
              </label>
              <input
                required
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 text-center">
              <strong>Acesso padrão:</strong> admin@salestracker.com / 1234
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTES VISUAIS ---

const StatCard = ({ title, value, icon: Icon, colorClass, subtext, trend, onEdit, editable }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start space-x-4 transition hover:shadow-md hover:border-blue-100">
    <div className={`p-3 rounded-full ${colorClass} mt-1`}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="flex-1">
      <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800 tracking-tight">
        {value}
      </h3>
      {(subtext || trend) && (
        <div className="flex items-center mt-2 gap-2">
          {trend && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {trend}
            </span>
          )}
          {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
        </div>
      )}
    </div>
    {editable && onEdit && (
      <button
        onClick={onEdit}
        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
        title="Ajustar valor"
      >
        <Edit2 size={18} />
      </button>
    )}
  </div>
);

// Modal para ajustar faturamento
const AjusteFaturamentoModal = ({ onClose, onSave, valorAtual, ajusteAtual, titulo = "Ajustar Faturamento", subtitulo = "Adicione ou subtraia valores do faturamento total", cor = "emerald" }) => {
  const [ajuste, setAjuste] = useState(ajusteAtual || 0);
  const [motivo, setMotivo] = useState('');

  const handleSave = () => {
    onSave(ajuste, motivo);
    onClose();
  };

  const valorFinal = valorAtual + ajuste;
  
  // Mapear cores
  const corConfig = {
    emerald: {
      header: 'from-emerald-500 to-emerald-600',
      textLight: 'text-emerald-100',
      ring: 'focus:ring-emerald-500',
      button: 'bg-emerald-600 hover:bg-emerald-700',
      textDark: 'text-emerald-600'
    },
    purple: {
      header: 'from-purple-500 to-purple-600',
      textLight: 'text-purple-100',
      ring: 'focus:ring-purple-500',
      button: 'bg-purple-600 hover:bg-purple-700',
      textDark: 'text-purple-600'
    },
    sky: {
      header: 'from-sky-500 to-sky-600',
      textLight: 'text-sky-100',
      ring: 'focus:ring-sky-500',
      button: 'bg-sky-600 hover:bg-sky-700',
      textDark: 'text-sky-600'
    }
  };
  
  const cores = corConfig[cor] || corConfig.emerald;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`bg-gradient-to-r ${cores.header} text-white p-6`}>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <DollarSign size={24} />
            {titulo}
          </h3>
          <p className={`${cores.textLight} text-sm mt-1`}>
            {subtitulo}
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor Original
            </label>
            <div className="text-2xl font-bold text-gray-800">
              {formatCurrency(valorAtual)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ajuste (use valores negativos para diminuir)
            </label>
            <input
              type="number"
              value={ajuste}
              onChange={(e) => setAjuste(parseFloat(e.target.value) || 0)}
              step="0.01"
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 ${cores.ring} focus:border-transparent`}
              placeholder="Ex: -500.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo do Ajuste (opcional)
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 ${cores.ring} focus:border-transparent`}
              rows="3"
              placeholder="Descreva o motivo do ajuste..."
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Valor Final:</span>
              <span className={`text-2xl font-bold ${valorFinal >= 0 ? cores.textDark : 'text-red-600'}`}>
                {formatCurrency(valorFinal)}
              </span>
            </div>
            {ajuste !== 0 && (
              <div className="mt-2 text-xs text-gray-500">
                {ajuste > 0 ? '+ ' : ''}{formatCurrency(ajuste)}
              </div>
            )}
          </div>
        </div>
        <div className="bg-gray-50 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className={`px-4 py-2 ${cores.button} text-white rounded-lg transition`}
          >
            Salvar Ajuste
          </button>
        </div>
      </div>
    </div>
  );
};

const ClientCardModal = ({ client, onClose, onSaveClient }) => {
  const [obs, setObs] = useState(client.observacoes || '');
  const [dataAtivacao, setDataAtivacao] = useState(
    toInputDate(client.dataAtivacao)
  );
  const [dataVenda, setDataVenda] = useState(
    toInputDate(client.createdAt)
  );
  const [saving, setSaving] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      observacoes: obs,
      dataAtivacao: dataAtivacao
        ? Timestamp.fromDate((() => {
            const [year, month, day] = dataAtivacao.split('-').map(Number);
            return new Date(year, month - 1, day, 12, 0, 0);
          })())
        : null,
    };
    // Se a data da venda foi alterada, atualiza o createdAt
    if (dataVenda && toInputDate(client.createdAt) !== dataVenda) {
      const [year, month, day] = dataVenda.split('-').map(Number);
      updates.createdAt = Timestamp.fromDate(new Date(year, month - 1, day, 12, 0, 0));
    }
    await onSaveClient(client.id, updates);
    setSaving(false);
    onClose();
  };

  const generateEmailDraft = async () => {
    setGeneratingEmail(true);
    setShowEmail(true);
    const prompt = `Escreva um email curto para o cliente "${client.razaoSocial}". Status: ${client.status}. Obs: ${obs}. Objetivo: Contato comercial/boas vindas.`;
    const text = await callGemini(prompt);
    setEmailDraft(text);
    setGeneratingEmail(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-blue-600 p-6 flex justify-between items-start flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">
              {client.razaoSocial}
            </h2>
            <p className="text-blue-100 text-sm mt-1">{client.cnpj}</p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="text-xs text-gray-500 uppercase font-semibold">
                Valor
              </span>
              <div className="text-lg font-bold text-gray-800">
                {formatCurrency(client.valor)}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="text-xs text-gray-500 uppercase font-semibold">
                Vendedor
              </span>
              <div className="text-sm font-bold text-gray-800">
                {client.vendedor}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Data da Venda
            </label>
            <input
              type="date"
              value={dataVenda}
              onChange={(e) => setDataVenda(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Observações
            </label>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg h-24 text-sm"
            />
          </div>
          {showEmail && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              {generatingEmail ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="animate-spin" size={16} /> Gerando...
                </div>
              ) : (
                <textarea
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded p-2 text-sm h-32"
                />
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={generateEmailDraft}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Sparkles size={16} /> Email IA
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- TV DASHBOARD (FULL SCREEN BENTO BOX 1920x1080) ---
const TVDashboard = ({ sales, metaMensal, metaSemanal, onBack, ajusteFaturamento, onSaveAjuste, ajusteMRR = 0, ajusteUnicas = 0, onSaveAjusteMRR, onSaveAjusteUnicas }) => {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [canceladosIndex, setCanceladosIndex] = useState(0);
  const [metaIndex, setMetaIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [showAjusteMRRModal, setShowAjusteMRRModal] = useState(false);
  const [showAjusteUnicasModal, setShowAjusteUnicasModal] = useState(false);

  // Alternar carrossel principal a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % 3); // 0=Mês, 1=Semana, 2=Dia
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Alternar carrossel de cancelados a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCanceladosIndex((prev) => (prev + 1) % 2); // 0=Número, 1=Turn Over %
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Alternar carrossel de metas a cada 6 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setMetaIndex((prev) => (prev + 1) % 2); // 0=Mês, 1=Semana
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const isSameMonth = (d) => {
    if (!d) return false;
    const date = d.toDate ? d.toDate() : new Date(d);
    return (
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isSameWeek = (d) => {
    if (!d) return false;
    const date = d.toDate ? d.toDate() : new Date(d);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return date >= startOfWeek && date <= endOfWeek;
  };

  const isToday = (d) => {
    if (!d) return false;
    const date = d.toDate ? d.toDate() : new Date(d);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const salesInMonth = sales.filter((s) => isSameMonth(s.createdAt));
  const salesInWeek = sales.filter((s) => isSameWeek(s.createdAt));
  const salesToday = sales.filter((s) => isToday(s.createdAt));

  // Debug: Log das vendas do mês
  console.log('TVDashboard - Total vendas:', sales.length);
  console.log('TVDashboard - Vendas do mês:', salesInMonth.length);
  console.log('TVDashboard - selectedDate:', selectedDate);
  if (salesInMonth.length > 0) {
    console.log('TVDashboard - Primeira venda do mês:', salesInMonth[0]);
  }

  const totalMonthOriginal = salesInMonth.reduce((acc, s) => acc + (s.valor || 0), 0);
  const totalMonth = totalMonthOriginal + ajusteFaturamento;
  const totalWeek = salesInWeek.reduce((acc, s) => acc + (s.valor || 0), 0);
  const totalDay = salesToday.reduce((acc, s) => acc + (s.valor || 0), 0);

  // Separar vendas recorrentes e únicas (mensal)
  const vendasRecorrentes = salesInMonth.filter(s => s.recorrente);
  const vendasUnicas = salesInMonth.filter(s => !s.recorrente);
  const totalRecorrenteOriginal = vendasRecorrentes.reduce((acc, s) => acc + (s.valor || 0), 0);
  const totalUnicoOriginal = vendasUnicas.reduce((acc, s) => acc + (s.valor || 0), 0);
  const totalRecorrente = totalRecorrenteOriginal + ajusteMRR;
  const totalUnico = totalUnicoOriginal + ajusteUnicas;

  // Separar vendas recorrentes e únicas (semanal) - para metas
  const vendasRecorrentesSemana = salesInWeek.filter(s => s.recorrente);
  const totalRecorrenteSemana = vendasRecorrentesSemana.reduce((acc, s) => acc + (s.valor || 0), 0);

  const ticketMedio = salesInMonth.length > 0 ? totalMonth / salesInMonth.length : 0;
  const cancelados = salesInMonth.filter((s) => s.status === 'cancelado').length;
  const totalClientes = salesInMonth.length;
  const turnOverRate = totalClientes > 0 ? (cancelados / totalClientes) * 100 : 0;
  
  // METAS - Usam apenas vendas RECORRENTES
  const faltaMeta = metaMensal > 0 ? Math.max(0, metaMensal - totalRecorrente) : 0;
  const progressoMeta = metaMensal > 0 ? (totalRecorrente / metaMensal) * 100 : 0;
  const metaBatida = metaMensal > 0 && totalRecorrente >= metaMensal;

  const faltaMetaSemanal = metaSemanal > 0 ? Math.max(0, metaSemanal - totalRecorrenteSemana) : 0;
  const progressoMetaSemanal = metaSemanal > 0 ? (totalRecorrenteSemana / metaSemanal) * 100 : 0;
  const metaSemanalBatida = metaSemanal > 0 && totalRecorrenteSemana >= metaSemanal;

  // Gráfico de meses (Novembro até 12 meses à frente)
  const monthlyData = useMemo(() => {
    const data = [];
    const now = new Date();
    // Começar em Novembro do ano atual (ou anterior se já passou)
    const startMonth = 10; // Novembro = mês 10 (0-indexed)
    const startYear = now.getMonth() >= startMonth ? now.getFullYear() : now.getFullYear() - 1;
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(startYear, startMonth + i, 1);
      const isFutureMonth = date > now;
      
      const monthSales = sales.filter((s) => {
        if (!s.createdAt) return false;
        const saleDate = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
        return (
          saleDate.getMonth() === date.getMonth() &&
          saleDate.getFullYear() === date.getFullYear()
        );
      });
      const total = isFutureMonth ? 0 : monthSales.reduce((acc, s) => acc + (s.valor || 0), 0);
      data.push({
        month: getShortMonthName(date.getMonth()),
        year: date.getFullYear(),
        total: total,
        count: isFutureMonth ? 0 : monthSales.length,
        isFuture: isFutureMonth,
        isCurrent: date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(),
      });
    }
    return data;
  }, [sales]);

  const maxMonthly = Math.max(...monthlyData.map((m) => m.total), 1);

  // Gráfico semana (últimos 7 dias)
  const weeklyData = useMemo(() => {
    const data = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      const daySales = sales.filter((s) => {
        if (!s.createdAt) return false;
        const saleDate = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
        return saleDate >= date && saleDate <= endDate;
      });
      
      const total = daySales.reduce((acc, s) => acc + (s.valor || 0), 0);
      data.push({
        day: dayNames[date.getDay()],
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        total: total,
        count: daySales.length,
      });
    }
    return data;
  }, [sales]);

  const maxWeekly = Math.max(...weeklyData.map((d) => d.total), 1);

  const carouselData = [
    { title: 'Vendas do Mês', data: monthlyData, max: maxMonthly, period: 'Mês' },
    { title: 'Vendas da Semana', data: weeklyData, max: maxWeekly, period: 'Semana' },
    { title: 'Vendas de Hoje', data: [{ label: 'Hoje', total: totalDay, count: salesToday.length }], max: totalDay || 1, period: 'Dia' },
  ];

  const currentCarousel = carouselData[carouselIndex];

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 overflow-hidden relative">
      {/* Botão Voltar - Menor */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-50 bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition flex items-center gap-1.5 border border-white/20 text-sm"
      >
        <ArrowLeft size={16} />
        <span className="font-semibold">Voltar</span>
      </button>

      {/* Logo - Menor */}
      <div className="absolute top-4 right-4 flex items-center gap-2 text-white">
        <TrendingUp size={20} />
        <span className="text-lg font-bold">SalesTracker</span>
      </div>

      {/* Bento Grid Layout */}
      <div className="h-full w-full p-6 pt-14">
        <div className="grid grid-cols-12 grid-rows-12 gap-4 h-full">
          
          {/* Widget 1: Gráfico Total de Vendas de Todos os Meses */}
          <div className="col-span-9 row-span-6 bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl">
            <h3 className="text-white text-lg font-bold mb-3 flex items-center gap-2">
              <BarChart2 size={20} className="text-blue-400" />
              Vendas - Nov/{new Date().getFullYear()} a Out/{new Date().getFullYear() + 1}
            </h3>
            <div className="h-[calc(100%-50px)] flex items-end justify-between gap-1.5 px-2">
              {monthlyData.map((month, i) => {
                const heightPercent = maxMonthly > 0 ? (month.total / maxMonthly) * 100 : 0;
                const barHeight = month.total > 0 ? Math.max(heightPercent, 20) : 5;
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5">
                    {/* Label valor */}
                    {month.total > 0 && (
                      <div className={`text-white text-[9px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded-full shadow-lg ${
                        month.isCurrent 
                          ? 'bg-gradient-to-r from-emerald-500/80 to-green-500/80' 
                          : 'bg-gradient-to-r from-blue-500/80 to-cyan-500/80'
                      }`}>
                        {month.total >= 1000 ? `${(month.total / 1000).toFixed(1)}k` : month.total.toFixed(0)}
                      </div>
                    )}
                    
                    {/* Barra */}
                    <div 
                      className={`w-full rounded-t-xl shadow-lg transition-all duration-300 relative group ${
                        month.isFuture 
                          ? 'bg-gradient-to-t from-gray-600/50 via-gray-500/30 to-gray-400/20 shadow-gray-500/10 border border-dashed border-white/20' 
                          : month.isCurrent
                            ? 'bg-gradient-to-t from-emerald-500 via-green-400 to-emerald-300 shadow-emerald-500/30 hover:shadow-emerald-400/50 hover:from-emerald-400 hover:via-green-300 hover:to-emerald-200'
                            : 'bg-gradient-to-t from-blue-500 via-blue-400 to-cyan-300 shadow-blue-500/30 hover:shadow-blue-400/50 hover:from-blue-400 hover:via-blue-300 hover:to-cyan-200'
                      }`}
                      style={{ height: `${barHeight}%` }}
                    >
                      {/* Brilho interno */}
                      {!month.isFuture && (
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/40 rounded-t-xl"></div>
                      )}
                      
                      {/* Contagem dentro da barra */}
                      {month.count > 0 && barHeight > 30 && (
                        <div className="absolute top-2 inset-x-0 text-center text-white text-[8px] font-bold drop-shadow-md">
                          {month.count}
                        </div>
                      )}
                      
                      {/* Tooltip hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none shadow-xl">
                        {month.isFuture ? 'Mês futuro' : formatCurrency(month.total)}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                    
                    {/* Label mês */}
                    <div className={`text-[10px] font-semibold mt-1 ${
                      month.isCurrent 
                        ? 'text-emerald-300' 
                        : month.isFuture 
                          ? 'text-white/50' 
                          : 'text-white/90'
                    }`}>
                      {month.month}
                      {month.isCurrent && <span className="ml-0.5">●</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Widget 2: Carrossel Mês/Semana/Dia */}
          <div className="col-span-3 row-span-6 bg-gradient-to-br from-slate-800/40 to-gray-900/40 backdrop-blur-xl rounded-3xl p-5 border border-white/10 shadow-2xl relative">
            {/* Indicadores do carrossel */}
            <div className="absolute top-4 right-4 flex gap-1.5 z-10">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === carouselIndex ? 'bg-gradient-to-r from-blue-400 to-cyan-400 w-6 shadow-lg' : 'bg-white/30 w-1.5'
                  }`}
                />
              ))}
            </div>
            
            <h3 className="text-white text-lg font-bold mb-3 flex items-center gap-2">
              <Activity size={20} className="text-cyan-400" />
              {currentCarousel.title}
            </h3>
            
            <div className="h-[calc(100%-50px)]">
              {carouselIndex === 2 ? (
                /* Visualização "Hoje" */
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-white text-5xl font-bold mb-3 drop-shadow-2xl">
                    {formatCurrency(totalDay)}
                  </div>
                  <div className="text-white text-base font-semibold bg-gradient-to-r from-cyan-500/30 to-blue-500/30 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20 shadow-xl">
                    {salesToday.length} {salesToday.length === 1 ? 'venda' : 'vendas'}
                  </div>
                </div>
              ) : carouselIndex === 0 ? (
                /* Visualização "Vendas do Mês" - Valor Grande */
                <div className="flex flex-col items-center justify-center h-full relative">
                  {/* Botão de edição */}
                  <button
                    onClick={() => setShowAjusteModal(true)}
                    className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/20 transition group"
                    title="Ajustar faturamento"
                  >
                    <Edit2 size={16} className="text-white group-hover:text-emerald-300" />
                  </button>
                  
                  <div className="text-white text-5xl font-bold mb-3 drop-shadow-2xl">
                    {formatCurrency(totalMonth)}
                  </div>
                  <div className="text-white text-base font-semibold bg-gradient-to-r from-cyan-500/30 to-blue-500/30 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20 shadow-xl">
                    {salesInMonth.length} {salesInMonth.length === 1 ? 'venda no mês' : 'vendas no mês'}
                  </div>
                  {ajusteFaturamento !== 0 && (
                    <div className="mt-2 text-xs text-cyan-300 font-semibold">
                      Ajuste: {formatCurrency(ajusteFaturamento)}
                    </div>
                  )}
                </div>
              ) : (
                /* Gráfico de barras - Apenas para "Vendas da Semana" */
                <div className="h-full flex items-end justify-between gap-1 px-1">
                  {currentCarousel.data.map((item, i) => {
                    const heightPercent = currentCarousel.max > 0 ? (item.total / currentCarousel.max) * 100 : 0;
                    const barHeight = item.total > 0 ? Math.max(heightPercent, 20) : 5;
                    
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                        {/* Label valor */}
                        {item.total > 0 && (
                          <div className="text-white text-[8px] font-bold whitespace-nowrap bg-gradient-to-r from-cyan-500/80 to-blue-500/80 px-1.5 py-0.5 rounded-full shadow-lg">
                            {item.total >= 1000 ? `${(item.total / 1000).toFixed(1)}k` : item.total.toFixed(0)}
                          </div>
                        )}
                        
                        {/* Barra */}
                        <div 
                          className="w-full bg-gradient-to-t from-cyan-500 via-blue-400 to-cyan-300 rounded-t-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/50 hover:from-cyan-400 hover:via-blue-300 hover:to-cyan-200 transition-all duration-300 relative group"
                          style={{ height: `${barHeight}%` }}
                        >
                          {/* Brilho interno */}
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/40 rounded-t-xl"></div>
                          
                          {/* Contagem dentro da barra */}
                          {item.count > 0 && barHeight > 30 && (
                            <div className="absolute top-2 inset-x-0 text-center text-white text-[8px] font-bold drop-shadow-md">
                              {item.count}
                            </div>
                          )}
                          
                          {/* Tooltip hover */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none shadow-xl">
                            {formatCurrency(item.total)}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                        
                        {/* Label */}
                        <div className="text-center mt-0.5">
                          <div className="text-white/90 text-[9px] font-semibold">
                            {item.month || item.day || item.label}
                          </div>
                          {item.date && (
                            <div className="text-white/60 text-[8px]">{item.date}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Widget 3: Vendas Recorrentes (MRR) */}
          <div className="col-span-6 row-span-4 bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-xl rounded-3xl p-4 border border-white/10 shadow-2xl flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent"></div>
            
            {/* Botão de edição */}
            <button
              onClick={() => setShowAjusteMRRModal(true)}
              className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/20 transition group z-10"
              title="Ajustar MRR"
            >
              <Edit2 size={14} className="text-white group-hover:text-purple-300" />
            </button>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-500 p-2 rounded-lg shadow-lg shadow-purple-500/30">
                  <Activity size={20} className="text-white" />
                </div>
                <h3 className="text-white text-sm font-bold">Recorrente</h3>
              </div>
              <div className="text-white text-2xl font-bold mb-2 drop-shadow-lg">
                {formatCurrency(totalRecorrente)}
              </div>
              {ajusteMRR !== 0 && (
                <div className="text-xs text-purple-300 font-semibold mb-2">
                  Ajuste: {formatCurrency(ajusteMRR)}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <div className="bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20">
                  <p className="text-white/80 text-xs font-medium">
                    {vendasRecorrentes.length} {vendasRecorrentes.length === 1 ? 'venda' : 'vendas'}
                  </p>
                </div>
                <div className="bg-purple-500/20 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-purple-400/30">
                  <p className="text-purple-200 text-xs font-bold">
                    {totalMonthOriginal > 0 ? ((totalRecorrenteOriginal / totalMonthOriginal) * 100).toFixed(0) : 0}% do total
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Widget 4: Vendas Únicas */}
          <div className="col-span-6 row-span-4 bg-gradient-to-br from-sky-900/40 to-blue-900/40 backdrop-blur-xl rounded-3xl p-4 border border-white/10 shadow-2xl flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-transparent"></div>
            
            {/* Botão de edição */}
            <button
              onClick={() => setShowAjusteUnicasModal(true)}
              className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/20 transition group z-10"
              title="Ajustar Vendas Únicas"
            >
              <Edit2 size={14} className="text-white group-hover:text-sky-300" />
            </button>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-gradient-to-br from-sky-500 to-blue-500 p-2 rounded-lg shadow-lg shadow-sky-500/30">
                  <ShoppingBag size={20} className="text-white" />
                </div>
                <h3 className="text-white text-sm font-bold">Vendas Únicas</h3>
              </div>
              <div className="text-white text-2xl font-bold mb-2 drop-shadow-lg">
                {formatCurrency(totalUnico)}
              </div>
              {ajusteUnicas !== 0 && (
                <div className="text-xs text-sky-300 font-semibold mb-2">
                  Ajuste: {formatCurrency(ajusteUnicas)}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <div className="bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20">
                  <p className="text-white/80 text-xs font-medium">
                    {vendasUnicas.length} {vendasUnicas.length === 1 ? 'venda' : 'vendas'}
                  </p>
                </div>
                <div className="bg-sky-500/20 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-sky-400/30">
                  <p className="text-sky-200 text-xs font-bold">
                    {totalMonthOriginal > 0 ? ((totalUnicoOriginal / totalMonthOriginal) * 100).toFixed(0) : 0}% do total
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Widget 5: Ticket Médio */}
          <div className="col-span-3 row-span-12 bg-gradient-to-br from-emerald-900/40 to-teal-900/40 backdrop-blur-xl rounded-3xl p-4 border border-white/10 shadow-2xl flex flex-col justify-center items-center relative overflow-hidden">
            {/* Efeito de fundo */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent"></div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-2 rounded-lg shadow-lg shadow-emerald-500/30 mb-3">
                <DollarSign size={24} className="text-white" />
              </div>
              <h3 className="text-white/90 text-sm font-semibold mb-2 text-center">
                Ticket Médio
              </h3>
              <div className="text-white text-2xl font-bold mb-2 drop-shadow-lg">
                {formatCurrency(ticketMedio)}
              </div>
              <div className="bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20">
                <p className="text-white/80 text-xs font-medium">
                  {salesInMonth.length} vendas
                </p>
              </div>
            </div>
          </div>

          {/* Widget 6: Meta do Mês / Semana (Carrossel) */}
          <div className="col-span-6 row-span-12 bg-gradient-to-br from-orange-900/40 to-amber-900/40 backdrop-blur-xl rounded-3xl p-4 border border-white/10 shadow-2xl flex flex-col justify-center relative overflow-hidden">
            {/* Efeito de fundo */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent"></div>
            
            {/* Indicadores do carrossel */}
            <div className="absolute top-4 right-4 flex gap-1.5 z-10">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === metaIndex ? 'bg-gradient-to-r from-orange-400 to-amber-400 w-6 shadow-lg' : 'bg-white/30 w-1.5'
                  }`}
                />
              ))}
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-xl shadow-lg shadow-orange-500/30">
                  <Target size={24} className="text-white" />
                </div>
                <h3 className="text-white text-base font-bold">
                  {metaIndex === 0 ? 'Meta do Mês' : 'Meta da Semana'}
                  <span className="text-xs font-normal text-white/60 ml-2">(Recorrente)</span>
                </h3>
              </div>
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-white/90 text-xs mb-1">
                    <span>Realizado (MRR)</span>
                    <span className="font-bold">
                      {metaIndex === 0 ? progressoMeta.toFixed(1) : progressoMetaSemanal.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden border border-white/20">
                    <div
                      className="bg-gradient-to-r from-orange-400 to-amber-400 h-full rounded-full transition-all duration-500 shadow-lg"
                      style={{ width: `${Math.min(metaIndex === 0 ? progressoMeta : progressoMetaSemanal, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-white text-2xl font-bold drop-shadow-lg">
                  {formatCurrency(metaIndex === 0 ? totalRecorrente : totalRecorrenteSemana)}
                </div>
                <div className="text-white/70 text-sm font-medium">
                  de {formatCurrency(metaIndex === 0 ? metaMensal : metaSemanal)}
                </div>
                {(metaIndex === 0 ? metaMensal : metaSemanal) === 0 ? (
                  <div className="text-orange-300 text-xs font-semibold flex items-center gap-1.5 bg-orange-500/10 px-2.5 py-1.5 rounded-lg border border-orange-500/20">
                    <Target size={14} />
                    Configure uma meta
                  </div>
                ) : (metaIndex === 0 ? metaBatida : metaSemanalBatida) ? (
                  <div className="text-green-300 text-sm font-semibold flex items-center gap-1.5 bg-green-500/20 px-2.5 py-1.5 rounded-lg border border-green-500/30">
                    <CheckCircle size={16} />
                    Meta Batida! 🎉
                  </div>
                ) : (
                  <div className="text-yellow-300 text-sm font-semibold bg-yellow-500/10 px-2.5 py-1.5 rounded-lg border border-yellow-500/20">
                    Faltam {formatCurrency(metaIndex === 0 ? faltaMeta : faltaMetaSemanal)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Widget 7: Cancelamentos (Carrossel) */}
          <div className="col-span-3 row-span-12 bg-gradient-to-br from-red-900/40 to-rose-900/40 backdrop-blur-xl rounded-3xl p-4 border border-white/10 shadow-2xl flex flex-col justify-center items-center relative overflow-hidden">
            {/* Efeito de fundo */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent"></div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="bg-gradient-to-br from-red-500 to-rose-500 p-2 rounded-lg shadow-lg shadow-red-500/30 mb-2">
                <XCircle size={24} className="text-white" />
              </div>
              
              {canceladosIndex === 0 ? (
                <>
                  <h3 className="text-white/90 text-sm font-semibold mb-1 text-center">
                    Cancelamentos
                  </h3>
                  <div className="text-white text-3xl font-bold mb-1 drop-shadow-lg">
                    {cancelados}
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20">
                    <p className="text-white/80 text-xs font-medium">
                      no mês atual
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-white/90 text-sm font-semibold mb-1 text-center">
                    Turn Over
                  </h3>
                  <div className="text-white text-3xl font-bold mb-1 drop-shadow-lg">
                    {turnOverRate.toFixed(1)}%
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20">
                    <p className="text-white/80 text-xs font-medium">
                      taxa de cancelamento
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>


        </div>
      </div>

      {/* Data/Hora */}
      <div className="absolute bottom-6 right-6 text-white/60 text-sm">
        {new Date().toLocaleString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>

      {/* Modal de Ajuste Faturamento */}
      {showAjusteModal && (
        <AjusteFaturamentoModal
          onClose={() => setShowAjusteModal(false)}
          onSave={onSaveAjuste}
          valorAtual={totalMonthOriginal}
          ajusteAtual={ajusteFaturamento}
        />
      )}
      
      {/* Modal de Ajuste MRR */}
      {showAjusteMRRModal && (
        <AjusteFaturamentoModal
          onClose={() => setShowAjusteMRRModal(false)}
          onSave={onSaveAjusteMRR}
          valorAtual={totalRecorrenteOriginal}
          ajusteAtual={ajusteMRR}
          titulo="Ajustar MRR"
          subtitulo="Adicione ou subtraia valores do MRR"
          cor="purple"
        />
      )}
      
      {/* Modal de Ajuste Vendas Únicas */}
      {showAjusteUnicasModal && (
        <AjusteFaturamentoModal
          onClose={() => setShowAjusteUnicasModal(false)}
          onSave={onSaveAjusteUnicas}
          valorAtual={totalUnicoOriginal}
          ajusteAtual={ajusteUnicas}
          titulo="Ajustar Vendas Únicas"
          subtitulo="Adicione ou subtraia valores das vendas únicas"
          cor="sky"
        />
      )}
    </div>
  );
};

// --- CONFIGURAÇÕES DE META ---
const MetaSettings = ({ onTransferToRecorrente, loading: externalLoading }) => {
  const [metaMensal, setMetaMensal] = useState('');
  const [metaSemanal, setMetaSemanal] = useState('');
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'artifacts', appId, 'public', 'data', 'metas'),
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        setMetas(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    );
    return unsubscribe;
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!metaMensal && !metaSemanal) return;
    setLoading(true);
    try {
      const mes = new Date().getMonth();
      const ano = new Date().getFullYear();
      
      if (metaMensal) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'metas'), {
          valor: parseFloat(metaMensal),
          mes,
          ano,
          tipo: 'mensal',
          createdAt: serverTimestamp(),
        });
      }
      
      if (metaSemanal) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'metas'), {
          valor: parseFloat(metaSemanal),
          mes,
          ano,
          tipo: 'semanal',
          createdAt: serverTimestamp(),
        });
      }
      
      setMetaMensal('');
      setMetaSemanal('');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar meta');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Excluir meta?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'metas', id));
    }
  };

  const metaMensalAtual = metas.find(
    (m) => m.mes === new Date().getMonth() && m.ano === new Date().getFullYear() && m.tipo === 'mensal'
  );
  const metaSemanalAtual = metas.find(
    (m) => m.mes === new Date().getMonth() && m.ano === new Date().getFullYear() && m.tipo === 'semanal'
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
        <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
          <Target size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Metas Mensais</h2>
          <p className="text-xs text-gray-400">Configure as metas de vendas</p>
        </div>
      </div>

      {/* Meta Atual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metaMensalAtual && (
          <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-6 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold opacity-90">Meta do Mês</h3>
                <div className="text-4xl font-bold mt-2">
                  {formatCurrency(metaMensalAtual.valor)}
                </div>
              </div>
              <Target size={64} className="opacity-20" />
            </div>
          </div>
        )}
        {metaSemanalAtual && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold opacity-90">Meta da Semana</h3>
                <div className="text-4xl font-bold mt-2">
                  {formatCurrency(metaSemanalAtual.valor)}
                </div>
              </div>
              <Target size={64} className="opacity-20" />
            </div>
          </div>
        )}
      </div>

      {/* Formulário */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-4">Definir Metas</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Meta do Mês (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={metaMensal}
              onChange={(e) => setMetaMensal(e.target.value)}
              className="w-full p-3 border rounded-lg text-lg"
              placeholder="Ex: 50000.00"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Meta da Semana (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={metaSemanal}
              onChange={(e) => setMetaSemanal(e.target.value)}
              className="w-full p-3 border rounded-lg text-lg"
              placeholder="Ex: 12500.00"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Metas'}
          </button>
        </form>
      </div>

      {/* Histórico */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 p-4 border-b">
          <h3 className="font-bold text-gray-700">Histórico de Metas</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-bold text-gray-700">Mês/Ano</th>
              <th className="text-right p-4 font-bold text-gray-700">Valor</th>
              <th className="text-center p-4 font-bold text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {metas.map((m) => (
              <tr key={m.id} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  {getShortMonthName(m.mes)}/{m.ano}
                </td>
                <td className="p-4 text-right font-bold text-orange-600">
                  {formatCurrency(m.valor)}
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- DASHBOARD PADRÃO ---
const Dashboard = ({ sales, ajusteFaturamento, onSaveAjuste }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAjusteModal, setShowAjusteModal] = useState(false);

  const isSameMonth = (d) => {
    if (!d) return false;
    const date = d.toDate ? d.toDate() : new Date(d);
    return (
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const salesInMonth = sales.filter((s) => isSameMonth(s.createdAt));

  const totalVendasOriginal = salesInMonth.reduce(
    (acc, curr) => acc + (curr.valor || 0),
    0
  );
  const totalVendas = totalVendasOriginal + ajusteFaturamento;
  
  // Separar vendas recorrentes e únicas
  const vendasRecorrentes = salesInMonth.filter(s => s.recorrente);
  const vendasUnicas = salesInMonth.filter(s => !s.recorrente);
  const totalRecorrente = vendasRecorrentes.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const totalUnico = vendasUnicas.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  
  const totalComissao = salesInMonth.reduce(
    (acc, curr) => acc + (curr.comissaoValor || 0),
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
            <LayoutDashboard size={24} />
          </div>
          <h2 className="text-lg font-bold text-gray-800">Dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setSelectedDate(
                new Date(selectedDate.setMonth(selectedDate.getMonth() - 1))
              )
            }
            className="p-1 bg-gray-100 rounded"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-bold text-sm w-32 text-center capitalize">
            {getMonthName(selectedDate)}
          </span>
          <button
            onClick={() =>
              setSelectedDate(
                new Date(selectedDate.setMonth(selectedDate.getMonth() + 1))
              )
            }
            className="p-1 bg-gray-100 rounded"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total de Vendas"
          value={salesInMonth.length}
          icon={ShoppingBag}
          colorClass="bg-indigo-100 text-indigo-600"
          subtext="vendas no mês"
        />
        <StatCard
          title="Faturamento"
          value={formatCurrency(totalVendas)}
          icon={DollarSign}
          colorClass="bg-emerald-100 text-emerald-600"
          subtext={ajusteFaturamento !== 0 ? `Ajuste: ${formatCurrency(ajusteFaturamento)}` : `${salesInMonth.length} vendas`}
          editable={true}
          onEdit={() => setShowAjusteModal(true)}
        />
        <StatCard
          title="Comissões"
          value={formatCurrency(totalComissao)}
          icon={Receipt}
          colorClass="bg-rose-100 text-rose-600"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 p-2 rounded-lg">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-sm font-semibold opacity-90">Receita Recorrente (MRR)</h3>
              <p className="text-2xl font-bold">{formatCurrency(totalRecorrente)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-90">{vendasRecorrentes.length} vendas recorrentes</span>
            <span className="font-semibold bg-white/20 px-3 py-1 rounded-full">
              {salesInMonth.length > 0 ? ((totalRecorrente / totalVendasOriginal) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 p-2 rounded-lg">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h3 className="text-sm font-semibold opacity-90">Vendas Únicas</h3>
              <p className="text-2xl font-bold">{formatCurrency(totalUnico)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-90">{vendasUnicas.length} vendas únicas</span>
            <span className="font-semibold bg-white/20 px-3 py-1 rounded-full">
              {salesInMonth.length > 0 ? ((totalUnico / totalVendasOriginal) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>
      </div>
      {showAjusteModal && (
        <AjusteFaturamentoModal
          onClose={() => setShowAjusteModal(false)}
          onSave={onSaveAjuste}
          valorAtual={totalVendasOriginal}
          ajusteAtual={ajusteFaturamento}
        />
      )}
    </div>
  );
};

// --- ANALYTICS VIEW (Visual Inspirado na Imagem) ---
const AnalyticsView = ({ sales }) => {
  const metrics = useMemo(() => {
    const active = sales.filter((s) => s.status === 'ativo').length;
    const total = sales.length;
    const cancelled = sales.filter((s) => s.status === 'cancelado').length;
    const implementation = sales.filter(
      (s) => s.status === 'implantacao'
    ).length;
    const waiting = sales.filter((s) => s.status === 'aguardando').length;

    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const m = d.getMonth();
      const y = d.getFullYear();
      const s = sales.filter((x) => {
        const sd = x.createdAt?.toDate
          ? x.createdAt.toDate()
          : new Date(x.createdAt);
        return (
          sd.getMonth() === m &&
          sd.getFullYear() === y &&
          x.status !== 'cancelado'
        );
      }).length;
      const c = sales.filter((x) => {
        const sd = x.createdAt?.toDate
          ? x.createdAt.toDate()
          : new Date(x.createdAt);
        return (
          sd.getMonth() === m &&
          sd.getFullYear() === y &&
          x.status === 'cancelado'
        );
      }).length;
      return { label: getShortMonthName(m), sales: s, cancels: c };
    });

    // Vendas dos últimos 6 dias úteis (Seg-Sex)
    const last5BusinessDays = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zerar horas para comparação
    let daysChecked = 0;
    let businessDaysFound = 0;
    
    // Voltar no máximo 15 dias para garantir que encontramos 6 dias úteis
    while (businessDaysFound < 6 && daysChecked < 15) {
      const checkDate = new Date();
      checkDate.setDate(today.getDate() - daysChecked);
      const dayOfWeek = checkDate.getDay();
      
      // 0 = Domingo, 6 = Sábado
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dayStart = new Date(checkDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(checkDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        const isToday = dayStart.getTime() === today.getTime();

        const salesCount = sales.filter((s) => {
          const saleDate = s.createdAt?.toDate
            ? s.createdAt.toDate()
            : new Date(s.createdAt);
          return saleDate >= dayStart && saleDate <= dayEnd;
        }).length;

        const salesValue = sales
          .filter((s) => {
            const saleDate = s.createdAt?.toDate
              ? s.createdAt.toDate()
              : new Date(s.createdAt);
            return saleDate >= dayStart && saleDate <= dayEnd;
          })
          .reduce((acc, s) => acc + (s.valor || 0), 0);

        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        last5BusinessDays.push({
          date: checkDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          dayName: dayNames[dayOfWeek],
          count: salesCount,
          value: salesValue,
          isToday: isToday,
        });
        businessDaysFound++;
      }
      daysChecked++;
    }
    
    // Inverter para mostrar do mais antigo para o mais recente
    last5BusinessDays.reverse();

    const maxDailySales = Math.max(...last5BusinessDays.map((d) => d.count), 1);

    const stateData = sales.reduce((acc, curr) => {
      const st = curr.estado || 'N/A';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {});
    const sortedStates = Object.entries(stateData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const vendorData = sales.reduce((acc, curr) => {
      acc[curr.vendedor] = (acc[curr.vendedor] || 0) + (curr.valor || 0);
      return acc;
    }, {});
    const topVendors = Object.entries(vendorData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const maxVendorVal = topVendors[0]?.[1] || 1;

    const catData = {};
    sales.forEach((s) =>
      s.items?.forEach((i) => {
        const cat = i.categoria || 'Outros';
        catData[cat] = (catData[cat] || 0) + 1;
      })
    );
    const sortedCats = Object.entries(catData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const totalItems = Object.values(catData).reduce((a, b) => a + b, 0) || 1;

    return {
      active,
      total,
      cancelled,
      implementation,
      waiting,
      monthlyData,
      last5BusinessDays,
      maxDailySales,
      sortedStates,
      topVendors,
      maxVendorVal,
      sortedCats,
      totalItems,
    };
  }, [sales]);

  const statusColors = {
    ativo: '#10B981',
    implantacao: '#3B82F6',
    aguardando: '#F59E0B',
    cancelado: '#EF4444',
  };
  const totalStatus = metrics.total || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 sticky top-0 z-10">
        <div className="bg-pink-50 p-2 rounded-lg text-pink-600">
          <Activity size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Sales Analytics</h2>
          <p className="text-xs text-gray-400 font-medium">Visão Geral</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <div className="text-2xl font-bold text-gray-800">
            {metrics.active}
          </div>
          <div className="text-xs font-bold text-gray-400 uppercase mt-1">
            Ativos
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <div className="text-2xl font-bold text-pink-600">
            +{metrics.total}
          </div>
          <div className="text-xs font-bold text-gray-400 uppercase mt-1">
            Vendas
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <div className="text-2xl font-bold text-red-500">
            -{metrics.cancelled}
          </div>
          <div className="text-xs font-bold text-gray-400 uppercase mt-1">
            Cancelados
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <div className="text-2xl font-bold text-blue-600">
            {metrics.implementation}
          </div>
          <div className="text-xs font-bold text-gray-400 uppercase mt-1">
            Implantação
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <div className="text-2xl font-bold text-yellow-500">
            {metrics.waiting}
          </div>
          <div className="text-xs font-bold text-gray-400 uppercase mt-1">
            Aguardando
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-6">
            Evolução Semestral
          </h3>
          <div className="flex-1 flex items-end justify-between gap-2 h-48 px-2">
            {metrics.monthlyData.map((m, i) => (
              <div key={i} className="flex flex-col items-center gap-2 w-full">
                <div className="flex gap-1 items-end h-full w-full justify-center">
                  <div
                    className="bg-pink-600 w-3 md:w-5 rounded-t-sm"
                    style={{ height: `${Math.max(m.sales * 10, 5)}%` }}
                  ></div>
                  <div
                    className="bg-pink-200 w-3 md:w-5 rounded-t-sm"
                    style={{ height: `${Math.max(m.cancels * 10, 5)}%` }}
                  ></div>
                </div>
                <span className="text-[10px] font-bold text-gray-400">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center relative">
          <h3 className="text-sm font-bold text-gray-600 uppercase absolute top-5 left-5">
            Status Carteira
          </h3>
          <div className="relative w-48 h-48 mt-6">
            <svg
              viewBox="0 0 100 100"
              className="transform -rotate-90 w-full h-full"
            >
              {['ativo', 'implantacao', 'aguardando', 'cancelado'].map(
                (status, i, arr) => {
                  const count =
                    metrics[
                      status === 'ativo'
                        ? 'active'
                        : status === 'implantacao'
                        ? 'implementation'
                        : status === 'aguardando'
                        ? 'waiting'
                        : 'cancelled'
                    ];
                  const percent = (count / totalStatus) * 100;
                  const offset =
                    100 -
                    arr
                      .slice(0, i)
                      .reduce(
                        (acc, s) =>
                          acc +
                          (metrics[
                            s === 'ativo'
                              ? 'active'
                              : s === 'implantacao'
                              ? 'implementation'
                              : s === 'aguardando'
                              ? 'waiting'
                              : 'cancelled'
                          ] /
                            totalStatus) *
                            100,
                        0
                      );
                  return (
                    <circle
                      key={status}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={statusColors[status]}
                      strokeWidth="12"
                      strokeDasharray={`${percent} 100`}
                      strokeDashoffset={offset}
                    />
                  );
                }
              )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-3xl font-bold text-gray-800">
                {metrics.total}
              </span>
              <span className="text-[10px] text-gray-400 uppercase">Total</span>
            </div>
          </div>
        </div>

        {/* Novo Gráfico: Últimos 6 Dias Úteis */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-gray-600 uppercase flex items-center gap-2">
              <CalendarDays size={16} /> Vendas - Últimos 6 Dias Úteis (Seg-Sex)
            </h3>
            <span className="text-xs text-gray-400">
              Total: {metrics.last5BusinessDays.reduce((acc, d) => acc + d.count, 0)} vendas
            </span>
          </div>
          <div className="flex items-end justify-between gap-3 h-64">
            {metrics.last5BusinessDays.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center">
                  <span className={`text-xs font-bold mb-1 ${
                    day.isToday ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {day.count}
                  </span>
                  <div
                    className={`w-full rounded-t-lg transition-all relative group ${
                      day.isToday 
                        ? 'bg-gradient-to-t from-green-600 to-green-400 hover:from-green-700 hover:to-green-500'
                        : 'bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500'
                    }`}
                    style={{
                      height: `${(day.count / metrics.maxDailySales) * 200}px`,
                      minHeight: day.count > 0 ? '20px' : '4px',
                    }}
                  >
                    {/* Tooltip com valor */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                      {formatCurrency(day.value)}
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-xs font-bold ${
                    day.isToday ? 'text-green-600' : 'text-gray-700'
                  }`}>
                    {day.dayName}
                    {day.isToday && <span className="ml-1">🔴</span>}
                  </div>
                  <div className="text-[10px] text-gray-400">{day.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-4">
            Ranking Vendas (R$)
          </h3>
          <div className="space-y-4">
            {metrics.topVendors.map(([name, val], i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold text-gray-700">
                  <span>{name}</span>
                  <span>{formatCurrency(val)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-pink-800 h-2 rounded-full"
                    style={{ width: `${(val / metrics.maxVendorVal) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm lg:col-span-3">
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-4 flex items-center gap-2">
            <Map size={16} /> Top Estados
          </h3>
          <div className="flex flex-wrap gap-4">
            {metrics.sortedStates.map(([uf, count]) => (
              <div
                key={uf}
                className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg border border-gray-100 min-w-[120px]"
              >
                <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 font-bold flex items-center justify-center text-xs">
                  {uf}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800">
                    {count} Vendas
                  </div>
                  <div className="w-16 bg-gray-200 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className="bg-pink-500 h-full"
                      style={{
                        width: `${(count / metrics.sortedStates[0][1]) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- RELATÓRIOS AVANÇADOS (Expandido) ---
const ReportsView = ({ sales, vendedores }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedVendedor, setSelectedVendedor] = useState('todos');
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const [selectedState, setSelectedState] = useState('todos');

  const isSameMonth = (d) => {
    if (!d) return false;
    const date = d.toDate ? d.toDate() : new Date(d);
    return (
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const estados = useMemo(
    () => [...new Set(sales.map((s) => s.estado).filter(Boolean))].sort(),
    [sales]
  );

  const filteredData = useMemo(
    () =>
      sales.filter(
        (sale) =>
          isSameMonth(sale.createdAt) &&
          (selectedVendedor === 'todos' || sale.vendedor === selectedVendedor) &&
          (selectedStatus === 'todos' || sale.status === selectedStatus) &&
          (selectedState === 'todos' || sale.estado === selectedState)
      ),
    [sales, selectedDate, selectedVendedor, selectedStatus, selectedState]
  );

  const stats = useMemo(() => {
    const totalVendas = filteredData.reduce((acc, curr) => acc + (curr.valor || 0), 0);
    const totalComissao = filteredData.reduce((acc, curr) => acc + (curr.comissaoValor || 0), 0);
    const ticketMedio = filteredData.length > 0 ? totalVendas / filteredData.length : 0;
    const ativos = filteredData.filter((s) => s.status === 'ativo').length;
    const cancelados = filteredData.filter((s) => s.status === 'cancelado').length;
    const taxaConversao = filteredData.length > 0 ? (ativos / filteredData.length) * 100 : 0;

    // Por vendedor
    const porVendedor = {};
    filteredData.forEach((s) => {
      if (!porVendedor[s.vendedor]) {
        porVendedor[s.vendedor] = { vendas: 0, valor: 0, comissao: 0, count: 0 };
      }
      porVendedor[s.vendedor].vendas += s.valor || 0;
      porVendedor[s.vendedor].comissao += s.comissaoValor || 0;
      porVendedor[s.vendedor].count += 1;
      porVendedor[s.vendedor].valor = s.valor || 0;
    });

    // Por produto
    const porProduto = {};
    filteredData.forEach((s) => {
      s.items?.forEach((item) => {
        const prod = item.descricao || 'Sem descrição';
        if (!porProduto[prod]) {
          porProduto[prod] = { quantidade: 0, valor: 0 };
        }
        porProduto[prod].quantidade += item.quantidade || 0;
        porProduto[prod].valor += (item.quantidade || 0) * (item.valorUnitario || 0);
      });
    });

    return {
      totalVendas,
      totalComissao,
      ticketMedio,
      ativos,
      cancelados,
      taxaConversao,
      porVendedor: Object.entries(porVendedor).sort((a, b) => b[1].vendas - a[1].vendas),
      porProduto: Object.entries(porProduto).sort((a, b) => b[1].valor - a[1].valor).slice(0, 10),
    };
  }, [filteredData]);

  const handleDateChange = (e) => {
    if (e.target.value) {
      const [y, m] = e.target.value.split('-');
      setSelectedDate(new Date(parseInt(y), parseInt(m) - 1, 1));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
            <BarChart2 size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Relatórios Detalhados</h2>
            <p className="text-xs text-gray-400">Análise completa de vendas</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <select
            value={selectedVendedor}
            onChange={(e) => setSelectedVendedor(e.target.value)}
            className="p-2 border rounded-lg text-sm"
          >
            <option value="todos">Todos Vendedores</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.nome}>
                {v.nome}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="p-2 border rounded-lg text-sm"
          >
            <option value="todos">Todos Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="p-2 border rounded-lg text-sm"
          >
            <option value="todos">Todos Estados</option>
            {estados.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          <div className="relative group">
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border text-sm font-bold text-gray-700 cursor-pointer hover:bg-gray-100">
              {getMonthName(selectedDate)} <Calendar size={14} />
            </div>
            <input
              type="month"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleDateChange}
            />
          </div>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Vendas"
          value={formatCurrency(stats.totalVendas)}
          icon={DollarSign}
          colorClass="bg-blue-100 text-blue-600"
          subtext={`${filteredData.length} vendas`}
        />
        <StatCard
          title="Comissões"
          value={formatCurrency(stats.totalComissao)}
          icon={Receipt}
          colorClass="bg-emerald-100 text-emerald-600"
          subtext="A pagar"
        />
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(stats.ticketMedio)}
          icon={TrendingUp}
          colorClass="bg-purple-100 text-purple-600"
          subtext="Por venda"
        />
        <StatCard
          title="Taxa Conversão"
          value={`${stats.taxaConversao.toFixed(1)}%`}
          icon={Activity}
          colorClass="bg-orange-100 text-orange-600"
          subtext={`${stats.ativos} ativos`}
        />
      </div>

      {/* Performance por Vendedor */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-600 uppercase mb-4 flex items-center gap-2">
          <Users size={16} /> Performance por Vendedor
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
              <tr>
                <th className="p-3">Vendedor</th>
                <th className="p-3 text-center">Vendas</th>
                <th className="p-3 text-right">Total Vendido</th>
                <th className="p-3 text-right">Comissão</th>
                <th className="p-3 text-right">Ticket Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.porVendedor.map(([nome, dados]) => (
                <tr key={nome} className="hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-800">{nome}</td>
                  <td className="p-3 text-center text-blue-600 font-bold">{dados.count}</td>
                  <td className="p-3 text-right text-blue-600 font-bold">
                    {formatCurrency(dados.vendas)}
                  </td>
                  <td className="p-3 text-right text-emerald-600">
                    {formatCurrency(dados.comissao)}
                  </td>
                  <td className="p-3 text-right text-gray-600">
                    {formatCurrency(dados.vendas / dados.count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Produtos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-600 uppercase mb-4 flex items-center gap-2">
          <Package size={16} /> Top 10 Produtos Vendidos
        </h3>
        <div className="space-y-3">
          {stats.porProduto.map(([produto, dados], index) => (
            <div key={produto} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-800">{produto}</span>
                  <span className="text-sm font-bold text-blue-600">
                    {formatCurrency(dados.valor)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(dados.valor / stats.porProduto[0][1].valor) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500">{dados.quantidade} un.</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detalhamento de Vendas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 p-4 border-b">
          <h3 className="text-sm font-bold text-gray-600 uppercase flex items-center gap-2">
            <FileText size={16} /> Detalhamento de Vendas ({filteredData.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Vendedor</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4 text-right">Comissão</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-600">
                    {formatDate(sale.createdAt)}
                  </td>
                  <td className="p-4 font-medium text-gray-800">
                    {sale.razaoSocial}
                  </td>
                  <td className="p-4 text-gray-600">{sale.vendedor}</td>
                  <td className="p-4 text-center">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold">
                      {sale.estado || '-'}
                    </span>
                  </td>
                  <td className="p-4 text-right text-blue-600 font-bold">
                    {formatCurrency(sale.valor)}
                  </td>
                  <td className="p-4 text-right text-emerald-600">
                    {formatCurrency(sale.comissaoValor)}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${
                        STATUS_OPTIONS.find((o) => o.value === sale.status)?.color
                      }`}
                    >
                      {STATUS_OPTIONS.find((o) => o.value === sale.status)?.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- GERENCIAMENTO DE LEADS ---
const LeadsManager = ({ leads, vendedores, onAddLead, onUpdateLead, onDeleteLead, onConvertLead, onAddLeadsBatch }) => {
  const [newLead, setNewLead] = useState({
    nome: '',
    contato: '',
    vendedor: '',
    origem: '',
    observacoes: '',
    valorEstimado: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchData, setBatchData] = useState({
    quantidade: '',
    vendedor: '',
    origem: '',
    data: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newLead.nome || !newLead.vendedor) return;
    await onAddLead({
      ...newLead,
      status: 'novo',
      valorEstimado: parseFloat(newLead.valorEstimado) || 0,
    });
    setNewLead({
      nome: '',
      contato: '',
      vendedor: '',
      origem: '',
      observacoes: '',
      valorEstimado: '',
    });
    setShowForm(false);
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    if (!batchData.quantidade || !batchData.vendedor) return;
    
    await onAddLeadsBatch({
      quantidade: parseInt(batchData.quantidade),
      vendedor: batchData.vendedor,
      origem: batchData.origem,
      data: batchData.data,
    });
    
    setBatchData({
      quantidade: '',
      vendedor: '',
      origem: '',
      data: new Date().toISOString().split('T')[0],
    });
    setShowBatchForm(false);
  };

  const filteredLeads = leads.filter(
    (l) =>
      (filterStatus === 'todos' || l.status === filterStatus) &&
      (l.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.vendedor.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const statusCount = LEAD_STATUS.reduce((acc, s) => {
    acc[s.value] = leads.filter((l) => l.status === s.value).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Leads</h2>
              <p className="text-xs text-gray-400">Gerencie seus potenciais clientes</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBatchForm(!showBatchForm)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-purple-700"
            >
              <Calendar size={18} /> Lançamento Diário
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700"
            >
              <PlusCircle size={18} /> Lead Individual
            </button>
          </div>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {LEAD_STATUS.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilterStatus(s.value)}
            className={`p-3 rounded-lg border-2 transition ${
              filterStatus === s.value
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <div className="text-2xl font-bold text-gray-800">{statusCount[s.value] || 0}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Formulário de Lançamento em Lote */}
      {showBatchForm && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl shadow-sm border-2 border-purple-200">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-purple-600" size={20} />
            <h3 className="font-bold text-gray-800">Lançamento Diário de Leads</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Registre rapidamente a quantidade total de leads que entraram no dia
          </p>
          <form onSubmit={handleBatchSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Quantidade de Leads *
              </label>
              <input
                required
                type="number"
                min="1"
                value={batchData.quantidade}
                onChange={(e) => setBatchData({ ...batchData, quantidade: e.target.value })}
                className="w-full p-3 border-2 border-purple-200 rounded-lg text-2xl font-bold text-center focus:border-purple-500 outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Data *
              </label>
              <input
                required
                type="date"
                value={batchData.data}
                onChange={(e) => setBatchData({ ...batchData, data: e.target.value })}
                className="w-full p-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Vendedor Responsável *
              </label>
              <select
                required
                value={batchData.vendedor}
                onChange={(e) => setBatchData({ ...batchData, vendedor: e.target.value })}
                className="w-full p-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 outline-none"
              >
                <option value="">Selecione...</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.nome}>
                    {v.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Origem <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                value={batchData.origem}
                onChange={(e) => setBatchData({ ...batchData, origem: e.target.value })}
                className="w-full p-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 outline-none"
                placeholder="Site, WhatsApp, etc"
              />
            </div>
            <div className="col-span-2 flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowBatchForm(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700"
              >
                Registrar {batchData.quantidade || '0'} Lead(s)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Formulário de Novo Lead Individual */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4">Novo Lead Individual</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <input
              required
              value={newLead.nome}
              onChange={(e) => setNewLead({ ...newLead, nome: e.target.value })}
              className="p-2 border rounded"
              placeholder="Nome / Empresa *"
            />
            <input
              value={newLead.contato}
              onChange={(e) => setNewLead({ ...newLead, contato: e.target.value })}
              className="p-2 border rounded"
              placeholder="Telefone / Email"
            />
            <select
              required
              value={newLead.vendedor}
              onChange={(e) => setNewLead({ ...newLead, vendedor: e.target.value })}
              className="p-2 border rounded"
            >
              <option value="">Vendedor Responsável *</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.nome}>
                  {v.nome}
                </option>
              ))}
            </select>
            <input
              value={newLead.origem}
              onChange={(e) => setNewLead({ ...newLead, origem: e.target.value })}
              className="p-2 border rounded"
              placeholder="Origem (Site, Indicação, etc)"
            />
            <input
              type="number"
              value={newLead.valorEstimado}
              onChange={(e) => setNewLead({ ...newLead, valorEstimado: e.target.value })}
              className="p-2 border rounded"
              placeholder="Valor Estimado (R$)"
            />
            <textarea
              value={newLead.observacoes}
              onChange={(e) => setNewLead({ ...newLead, observacoes: e.target.value })}
              className="p-2 border rounded col-span-2"
              placeholder="Observações"
              rows="2"
            />
            <div className="col-span-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium"
              >
                Salvar Lead
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-2 border rounded-lg text-sm"
        >
          <option value="todos">Todos Status</option>
          {LEAD_STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de Leads */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
            <tr>
              <th className="p-4">Nome</th>
              <th className="p-4">Contato</th>
              <th className="p-4">Vendedor</th>
              <th className="p-4">Origem</th>
              <th className="p-4 text-right">Valor Est.</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-800">{lead.nome}</td>
                <td className="p-4 text-gray-600 text-xs">{lead.contato || '-'}</td>
                <td className="p-4 text-gray-600">{lead.vendedor}</td>
                <td className="p-4 text-gray-500 text-xs">{lead.origem || '-'}</td>
                <td className="p-4 text-right text-blue-600 font-medium">
                  {formatCurrency(lead.valorEstimado)}
                </td>
                <td className="p-4">
                  <select
                    value={lead.status}
                    onChange={(e) => onUpdateLead(lead.id, { status: e.target.value })}
                    disabled={lead.status === 'convertido'}
                    className={`px-2 py-1 rounded text-xs font-bold border-0 cursor-pointer ${
                      LEAD_STATUS.find((s) => s.value === lead.status)?.color
                    } ${lead.status === 'convertido' ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {LEAD_STATUS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-4 text-right">
                  <div className="flex gap-2 justify-end">
                    {lead.status !== 'convertido' && lead.status !== 'perdido' && (
                      <button
                        onClick={() => onConvertLead(lead)}
                        className="text-green-500 hover:text-green-700"
                        title="Converter em Venda"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteLead(lead.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLeads.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            Nenhum lead encontrado
          </div>
        )}
      </div>
    </div>
  );
};

// --- GERENCIAMENTO DE VENDEDORES ---
const VendedoresManager = ({ vendedores, onAddVendedor, onDeleteVendedor }) => {
  const [newVendedor, setNewVendedor] = useState({
    nome: '',
    email: '',
    telefone: '',
    meta: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newVendedor.nome) return;
    onAddVendedor({
      nome: newVendedor.nome,
      email: newVendedor.email,
      telefone: newVendedor.telefone,
      meta: parseFloat(newVendedor.meta) || 0,
    });
    setNewVendedor({ nome: '', email: '', telefone: '', meta: '' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
        <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
          <Users size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Vendedores</h2>
          <p className="text-xs text-gray-400">Gerencie a equipe de vendas</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <PlusCircle size={18} /> Novo Vendedor
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Nome Completo *
              </label>
              <input
                value={newVendedor.nome}
                onChange={(e) =>
                  setNewVendedor({ ...newVendedor, nome: e.target.value })
                }
                className="w-full p-2 border rounded"
                placeholder="Ex: João Silva"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Email <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="email"
                value={newVendedor.email}
                onChange={(e) =>
                  setNewVendedor({ ...newVendedor, email: e.target.value })
                }
                className="w-full p-2 border rounded"
                placeholder="vendedor@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Telefone <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                value={newVendedor.telefone}
                onChange={(e) =>
                  setNewVendedor({ ...newVendedor, telefone: e.target.value })
                }
                className="w-full p-2 border rounded"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Meta Mensal (R$) <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="number"
                value={newVendedor.meta}
                onChange={(e) =>
                  setNewVendedor({ ...newVendedor, meta: e.target.value })
                }
                className="w-full p-2 border rounded"
                placeholder="0.00"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700"
            >
              Adicionar Vendedor
            </button>
          </form>
        </div>
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4">Equipe de Vendas</h3>
          <div className="space-y-3">
            {vendedores.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold flex items-center justify-center">
                    {v.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">{v.nome}</div>
                    <div className="text-xs text-gray-500 space-x-2">
                      {v.email && <span>{v.email}</span>}
                      {v.telefone && <span>• {v.telefone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {v.meta > 0 && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Meta</div>
                      <div className="text-sm font-bold text-purple-600">
                        {formatCurrency(v.meta)}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => onDeleteVendedor(v.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {vendedores.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                Nenhum vendedor cadastrado
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- CATÁLOGO DE PRODUTOS ---
const ProductCatalog = ({ products, onAddProduct, onDeleteProduct }) => {
  const [newProduct, setNewProduct] = useState({ name: '', defaultPrice: '' });
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newProduct.name) return;
    onAddProduct({
      name: newProduct.name,
      defaultPrice: parseFloat(newProduct.defaultPrice) || 0,
    });
    setNewProduct({ name: '', defaultPrice: '' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
          <ShoppingBag size={24} />
        </div>
        <h2 className="text-lg font-bold text-gray-800">Produtos</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <PlusCircle size={18} /> Novo
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Nome
              </label>
              <input
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, name: e.target.value })
                }
                className="w-full p-2 border rounded"
                placeholder="Ex: Licença"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Preço (R$)
              </label>
              <input
                type="number"
                value={newProduct.defaultPrice}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, defaultPrice: e.target.value })
                }
                className="w-full p-2 border rounded"
                placeholder="0.00"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded font-bold"
            >
              Salvar
            </button>
          </form>
        </div>
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
              <tr>
                <th className="p-3">Nome</th>
                <th className="p-3 text-right">Preço</th>
                <th className="p-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 text-right">
                    {formatCurrency(p.defaultPrice)}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onDeleteProduct(p.id)}
                      className="text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- LISTA DE VENDAS ---
const SalesList = ({ sales, onDelete, onUpdateStatus, onUpdateClient, onToggleRecorrente }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [filtroRecorrencia, setFiltroRecorrencia] = useState('todos'); // 'todos', 'recorrente', 'unico'
  const filtered = sales.filter(
    (s) =>
      (s.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.vendedor.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filtroRecorrencia === 'todos' || 
       (filtroRecorrencia === 'recorrente' && s.recorrente) ||
       (filtroRecorrencia === 'unico' && !s.recorrente))
  );

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">Clientes</h2>
          <div className="flex gap-3 items-center">
            <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setFiltroRecorrencia('todos')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  filtroRecorrencia === 'todos'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroRecorrencia('recorrente')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                  filtroRecorrencia === 'recorrente'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Activity size={14} />
                Recorrente
              </button>
              <button
                onClick={() => setFiltroRecorrencia('unico')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  filtroRecorrencia === 'unico'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Único
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
              <tr>
                <th className="p-4">Cliente</th>
                <th className="p-4">Vendedor</th>
                <th className="p-4">Valor</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 group">
                  <td
                    className="p-4 font-medium text-blue-600 cursor-pointer"
                    onClick={() => setSelectedClient(s)}
                  >
                    <div className="flex items-center gap-2">
                      {s.razaoSocial}
                      {s.recorrente && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                          <Activity size={12} />
                          MRR
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{s.vendedor}</td>
                  <td className="p-4 font-medium">{formatCurrency(s.valor)}</td>
                  <td className="p-4">
                    <select
                      value={s.status}
                      onChange={(e) => onUpdateStatus(s.id, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-bold border-0 cursor-pointer ${
                        STATUS_OPTIONS.find((o) => o.value === s.status)?.color
                      }`}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onToggleRecorrente(s.id, !s.recorrente)}
                        className={`p-1.5 rounded-lg transition-all ${s.recorrente ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' : 'bg-gray-100 text-gray-400 hover:bg-purple-50 hover:text-purple-500'}`}
                        title={s.recorrente ? 'Remover recorrência' : 'Marcar como recorrente'}
                      >
                        <Activity size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(s.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selectedClient && (
        <ClientCardModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onSaveClient={onUpdateClient}
        />
      )}
    </>
  );
};

// --- SALES FORM (Atualizado v2.8) ---
const SalesForm = ({ onSave, loading, products, vendedores, leadToConvert }) => {
  const [formData, setFormData] = useState({
    razaoSocial: leadToConvert?.nome || '',
    cnpj: '',
    vendedor: leadToConvert?.vendedor || '',
    status: 'aguardando',
    observacoes: leadToConvert?.observacoes || '',
    dataAtivacao: '',
    dataVenda: new Date().toISOString().split('T')[0], // Data da venda (hoje por padrão)
    comissaoPorcentagem: '10',
    estado: '',
    segmento: '',
    leadId: leadToConvert?.id || null,
    recorrente: false,
  });
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    productId: '',
    descricao: '',
    quantidade: 1,
    valorUnitario: '',
  });

  const totalVenda = useMemo(
    () =>
      items.reduce(
        (acc, item) =>
          acc + item.quantidade * parseFloat(item.valorUnitario || 0),
        0
      ),
    [items]
  );
  const comissaoValor = useMemo(
    () => totalVenda * (parseFloat(formData.comissaoPorcentagem || 0) / 100),
    [totalVenda, formData.comissaoPorcentagem]
  );

  const handleProductChange = (e) => {
    const pid = e.target.value;
    if (!pid) {
      setNewItem({
        ...newItem,
        productId: '',
        descricao: '',
        valorUnitario: '',
      });
      return;
    }
    if (pid === 'custom') {
      setNewItem({
        ...newItem,
        productId: 'custom',
        descricao: '',
        valorUnitario: '',
      });
    } else {
      const p = products.find((x) => x.id === pid);
      if (p)
        setNewItem({
          ...newItem,
          productId: pid,
          descricao: p.name,
          valorUnitario: p.defaultPrice,
        });
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.descricao) return;
    setItems([...items, { ...newItem, id: Date.now() }]);
    setNewItem({
      productId: '',
      descricao: '',
      quantidade: 1,
      valorUnitario: '',
    });
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.razaoSocial) return;
    onSave({
      ...formData,
      valor: totalVenda,
      comissaoValor,
      comissaoPorcentagem: parseFloat(formData.comissaoPorcentagem),
      items,
      dataAtivacao: formData.dataAtivacao
        ? Timestamp.fromDate((() => {
            const [year, month, day] = formData.dataAtivacao.split('-').map(Number);
            return new Date(year, month - 1, day, 12, 0, 0);
          })())
        : null,
      dataVenda: formData.dataVenda
        ? Timestamp.fromDate((() => {
            const [year, month, day] = formData.dataVenda.split('-').map(Number);
            return new Date(year, month - 1, day, 12, 0, 0);
          })())
        : null,
      leadId: formData.leadId,
      recorrente: formData.recorrente === true, // Garantir que é boolean
    });
    setItems([]);
    setFormData({
      razaoSocial: '',
      cnpj: '',
      vendedor: '',
      status: 'aguardando',
      observacoes: '',
      dataAtivacao: '',
      dataVenda: new Date().toISOString().split('T')[0],
      comissaoPorcentagem: '10',
      estado: '',
      segmento: '',
      leadId: null,
      recorrente: false,
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 mb-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Receipt className="text-blue-600" /> Nova Venda
        {leadToConvert && (
          <span className="text-sm font-normal text-green-600 bg-green-50 px-3 py-1 rounded-full">
            Convertendo Lead
          </span>
        )}
      </h2>
      {vendedores.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-center gap-2">
          <AlertCircle className="text-yellow-600" size={20} />
          <span className="text-sm text-yellow-800">
            <strong>Atenção:</strong> Você precisa cadastrar vendedores antes de
            registrar vendas. Vá para a seção "Vendedores".
          </span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <input
            required
            value={formData.razaoSocial}
            onChange={(e) =>
              setFormData({ ...formData, razaoSocial: e.target.value })
            }
            className="p-2 border rounded"
            placeholder="Nome / Razão Social *"
          />
          <input
            value={formData.cnpj}
            onChange={(e) =>
              setFormData({ ...formData, cnpj: formatCNPJCPF(e.target.value) })
            }
            className="p-2 border rounded"
            placeholder="CPF / CNPJ"
          />
          <select
            required
            value={formData.vendedor}
            onChange={(e) =>
              setFormData({ ...formData, vendedor: e.target.value })
            }
            className="p-2 border rounded"
          >
            <option value="">Selecione o Vendedor *</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.nome}>
                {v.nome}
              </option>
            ))}
          </select>
          <select
            value={formData.estado}
            onChange={(e) =>
              setFormData({ ...formData, estado: e.target.value })
            }
            className="p-2 border rounded"
          >
            <option value="">UF</option>
            {BRAZIL_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          <select
            value={formData.segmento}
            onChange={(e) =>
              setFormData({ ...formData, segmento: e.target.value })
            }
            className="p-2 border rounded"
          >
            <option value="">Segmento</option>
            {BUSINESS_SEGMENTS.map((seg) => (
              <option key={seg} value={seg}>
                {seg}
              </option>
            ))}
          </select>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
            className="p-2 border rounded"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="relative">
            <label className="absolute -top-2 left-2 bg-white px-1 text-xs font-semibold text-gray-500">
              Data da Venda
            </label>
            <input
              type="date"
              value={formData.dataVenda}
              onChange={(e) =>
                setFormData({ ...formData, dataVenda: e.target.value })
              }
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.recorrente}
              onChange={(e) =>
                setFormData({ ...formData, recorrente: e.target.checked })
              }
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <div className="flex-1">
              <div className="font-semibold text-gray-800 flex items-center gap-2">
                <Activity size={18} className="text-purple-600" />
                Venda Recorrente (MRR)
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Marque se esta venda gera receita mensal recorrente
              </div>
            </div>
          </label>
        </div>
        <div className="bg-blue-50 p-4 rounded border border-blue-100">
          <div className="flex gap-2 items-end mb-2">
            <select
              value={newItem.productId}
              onChange={handleProductChange}
              className="p-2 border rounded flex-1 text-sm"
            >
              <option value="">Produto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="custom">+ Outro</option>
            </select>
            <input
              value={newItem.descricao}
              onChange={(e) =>
                setNewItem({ ...newItem, descricao: e.target.value })
              }
              className="p-2 border rounded flex-[2] text-sm"
              placeholder="Descrição"
            />
            <input
              type="number"
              value={newItem.quantidade}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  quantidade: parseInt(e.target.value) || 1,
                })
              }
              className="p-2 border rounded w-16 text-center text-sm"
            />
            <input
              type="number"
              value={newItem.valorUnitario}
              onChange={(e) =>
                setNewItem({ ...newItem, valorUnitario: e.target.value })
              }
              className="p-2 border rounded w-24 text-right text-sm"
              placeholder="R$"
            />
            <button
              onClick={handleAddItem}
              className="p-2 bg-blue-600 text-white rounded"
            >
              <PlusCircle size={18} />
            </button>
          </div>
          <div className="space-y-1">
            {items.map((i) => (
              <div
                key={i.id}
                className="flex justify-between text-sm border-b border-blue-100 pb-1"
              >
                <span>
                  {i.quantidade}x {i.descricao}
                </span>
                <span>{formatCurrency(i.quantidade * i.valorUnitario)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
            Comissão %{' '}
            <input
              type="number"
              value={formData.comissaoPorcentagem}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  comissaoPorcentagem: e.target.value,
                })
              }
              className="w-12 border rounded text-center"
            />{' '}
            <span className="text-emerald-600">
              {formatCurrency(comissaoValor)}
            </span>
          </div>
          <div className="text-xl font-bold text-blue-600">
            {formatCurrency(totalVenda)}
          </div>
        </div>
        <button
          disabled={loading || items.length === 0}
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          Finalizar
        </button>
      </form>
    </div>
  );
};

// --- APP PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [leads, setLeads] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentView, setCurrentView] = useState('tv-dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState(null);
  const [metaMensal, setMetaMensal] = useState(0);
  const [metaSemanal, setMetaSemanal] = useState(0);
  const [ajusteFaturamento, setAjusteFaturamento] = useState(0);
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [ajusteMRR, setAjusteMRR] = useState(0);
  const [ajusteUnicas, setAjusteUnicas] = useState(0);

  // Carrega dados sem autenticação
  useEffect(() => {
    // Simula usuário autenticado para manter compatibilidade
    setUser({ email: 'tv@dashboard.com', displayName: 'TV Dashboard' });
  }, []);
  useEffect(() => {
    // Remove autenticação - carrega dados diretamente
    const unsubS = onSnapshot(
      query(
        collection(db, 'artifacts', appId, 'public', 'data', 'sales'),
        orderBy('createdAt', 'desc')
      ),
      (s) => {
        setSales(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setInitialLoading(false);
      }
    );
    const unsubP = onSnapshot(
      query(
        collection(db, 'artifacts', appId, 'public', 'data', 'products'),
        orderBy('name', 'asc')
      ),
      (s) => setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubV = onSnapshot(
      query(
        collection(db, 'artifacts', appId, 'public', 'data', 'vendedores'),
        orderBy('nome', 'asc')
      ),
      (s) => setVendedores(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubL = onSnapshot(
      query(
        collection(db, 'artifacts', appId, 'public', 'data', 'leads'),
        orderBy('createdAt', 'desc')
      ),
      (s) => setLeads(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubU = onSnapshot(
      query(
        collection(db, 'artifacts', appId, 'public', 'data', 'usuarios'),
        orderBy('nome', 'asc')
      ),
      (s) => setUsuarios(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    
    // Listener para metas - separado por tipo (mensal e semanal)
    const unsubM = onSnapshot(
      query(
        collection(db, 'artifacts', appId, 'public', 'data', 'metas'),
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        const metas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const mesAtual = new Date().getMonth();
        const anoAtual = new Date().getFullYear();
        
        // Buscar meta mensal
        const metaMensalAtual = metas.find(
          (m) => m.mes === mesAtual && m.ano === anoAtual && m.tipo === 'mensal'
        );
        setMetaMensal(metaMensalAtual?.valor || 0);
        
        // Buscar meta semanal
        const metaSemanalAtual = metas.find(
          (m) => m.mes === mesAtual && m.ano === anoAtual && m.tipo === 'semanal'
        );
        setMetaSemanal(metaSemanalAtual?.valor || 0);
      }
    );
    
    // Listener para ajustes de faturamento, MRR e Vendas Únicas
    const unsubA = onSnapshot(
      query(
        collection(db, 'artifacts', appId, 'public', 'data', 'ajustes'),
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        const ajustes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const mesAtual = new Date().getMonth();
        const anoAtual = new Date().getFullYear();
        
        // Ajuste de faturamento
        const ajusteFat = ajustes.find(
          (a) => a.mes === mesAtual && a.ano === anoAtual && a.tipo === 'faturamento'
        );
        if (ajusteFat) {
          setAjusteFaturamento(ajusteFat.valor || 0);
          setMotivoAjuste(ajusteFat.motivo || '');
        }
        
        // Ajuste de MRR
        const ajusteMrrAtual = ajustes.find(
          (a) => a.mes === mesAtual && a.ano === anoAtual && a.tipo === 'mrr'
        );
        if (ajusteMrrAtual) {
          setAjusteMRR(ajusteMrrAtual.valor || 0);
        }
        
        // Ajuste de Vendas Únicas
        const ajusteUnicasAtual = ajustes.find(
          (a) => a.mes === mesAtual && a.ano === anoAtual && a.tipo === 'unicas'
        );
        if (ajusteUnicasAtual) {
          setAjusteUnicas(ajusteUnicasAtual.valor || 0);
        }
      }
    );
    
    return () => {
      unsubS();
      unsubP();
      unsubV();
      unsubL();
      unsubU();
      unsubM();
      unsubA();
    };
  }, []);

  const handleAddSale = async (data) => {
    setLoading(true);
    try {
      // Usar dataVenda se fornecida, senão usar data atual
      let createdAt = serverTimestamp();
      if (data.dataVenda) {
        // dataVenda já é um Timestamp do Firestore
        createdAt = data.dataVenda;
      }
      
      // Remover dataVenda do objeto para não duplicar
      const { dataVenda, ...saleData } = data;
      
      // Debug: verificar dados antes de salvar
      console.log('Salvando venda:', { ...saleData, createdAt, recorrente: saleData.recorrente });
      
      await addDoc(
        collection(db, 'artifacts', appId, 'public', 'data', 'sales'),
        { ...saleData, createdAt }
      );
      
      // Se veio de um lead, marcar como convertido
      if (data.leadId) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'leads', data.leadId),
          { status: 'convertido', convertidoEm: serverTimestamp() }
        );
      }
      
      setLeadToConvert(null);
      setCurrentView('list');
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar venda.');
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateStatus = (id, status) =>
    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', id), {
      status,
    });
  const handleUpdateClient = (id, data) =>
    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', id), data);
  const handleDelete = (id) => {
    if (confirm('Excluir?'))
      deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', id));
  };
  
  // Função para alternar recorrência de uma venda
  const handleToggleRecorrente = (id, recorrente) =>
    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', id), { recorrente });
  
  // Função para transferir todas as vendas para recorrentes
  const handleTransferToRecorrente = async () => {
    if (!confirm('Deseja marcar TODAS as vendas como recorrentes? Esta ação afetará todas as vendas existentes.')) {
      return;
    }
    
    setLoading(true);
    try {
      const vendasNaoRecorrentes = sales.filter(s => !s.recorrente);
      let count = 0;
      
      for (const venda of vendasNaoRecorrentes) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'sales', venda.id),
          { recorrente: true }
        );
        count++;
      }
      
      alert(`✅ ${count} vendas foram marcadas como recorrentes!`);
    } catch (error) {
      console.error('Erro ao transferir vendas:', error);
      alert('Erro ao transferir vendas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddProduct = (data) =>
    addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  const handleDeleteProduct = (id) => {
    if (confirm('Excluir produto?'))
      deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id));
  };
  const handleAddVendedor = (data) =>
    addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'vendedores'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  const handleDeleteVendedor = (id) => {
    if (confirm('Excluir vendedor? (Isso não afetará vendas já registradas)'))
      deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vendedores', id));
  };
  
  const handleAddLead = (data) =>
    addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), {
      ...data,
      createdAt: serverTimestamp(),
    });

  const handleAddLeadsBatch = async (data) => {
    const batch = [];
    const targetDate = data.data ? Timestamp.fromDate(new Date(data.data)) : serverTimestamp();
    
    for (let i = 0; i < data.quantidade; i++) {
      batch.push(
        addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), {
          nome: `Lead ${new Date(data.data).toLocaleDateString('pt-BR')} #${i + 1}`,
          contato: '',
          vendedor: data.vendedor,
          origem: data.origem || 'Lançamento em lote',
          observacoes: `Registrado em lote - ${data.quantidade} leads do dia ${new Date(data.data).toLocaleDateString('pt-BR')}`,
          valorEstimado: 0,
          status: 'novo',
          createdAt: targetDate,
          isLoteBatch: true,
        })
      );
    }
    
    await Promise.all(batch);
    alert(`✅ ${data.quantidade} leads registrados com sucesso!`);
  };
  const handleUpdateLead = (id, data) =>
    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', id), data);
  const handleDeleteLead = (id) => {
    if (confirm('Excluir lead?'))
      deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', id));
  };
  const handleConvertLead = (lead) => {
    setLeadToConvert(lead);
    setCurrentView('new');
  };

  const handleSaveAjusteFaturamento = async (novoAjuste, novoMotivo) => {
    try {
      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();
      
      // Buscar se já existe um ajuste para este mês/ano
      const ajustesRef = collection(db, 'artifacts', appId, 'public', 'data', 'ajustes');
      const q = query(ajustesRef, orderBy('createdAt', 'desc'));
      const snapshot = await new Promise((resolve) => {
        const unsubscribe = onSnapshot(q, (snap) => {
          unsubscribe();
          resolve(snap);
        });
      });
      
      const ajustes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const ajusteExistente = ajustes.find(
        (a) => a.mes === mesAtual && a.ano === anoAtual && a.tipo === 'faturamento'
      );
      
      const ajusteData = {
        valor: novoAjuste,
        motivo: novoMotivo,
        mes: mesAtual,
        ano: anoAtual,
        tipo: 'faturamento',
        updatedAt: serverTimestamp(),
      };
      
      if (ajusteExistente) {
        // Atualizar existente
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'ajustes', ajusteExistente.id),
          ajusteData
        );
      } else {
        // Criar novo
        await addDoc(ajustesRef, {
          ...ajusteData,
          createdAt: serverTimestamp(),
        });
      }
      
      setAjusteFaturamento(novoAjuste);
      setMotivoAjuste(novoMotivo);
    } catch (error) {
      console.error('Erro ao salvar ajuste:', error);
      alert('Erro ao salvar ajuste. Tente novamente.');
    }
  };

  const handleSaveAjusteMRR = async (novoAjuste, novoMotivo) => {
    try {
      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();
      
      const ajustesRef = collection(db, 'artifacts', appId, 'public', 'data', 'ajustes');
      const q = query(ajustesRef, orderBy('createdAt', 'desc'));
      const snapshot = await new Promise((resolve) => {
        const unsubscribe = onSnapshot(q, (snap) => {
          unsubscribe();
          resolve(snap);
        });
      });
      
      const ajustes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const ajusteExistente = ajustes.find(
        (a) => a.mes === mesAtual && a.ano === anoAtual && a.tipo === 'mrr'
      );
      
      const ajusteData = {
        valor: novoAjuste,
        motivo: novoMotivo,
        mes: mesAtual,
        ano: anoAtual,
        tipo: 'mrr',
        updatedAt: serverTimestamp(),
      };
      
      if (ajusteExistente) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'ajustes', ajusteExistente.id),
          ajusteData
        );
      } else {
        await addDoc(ajustesRef, {
          ...ajusteData,
          createdAt: serverTimestamp(),
        });
      }
      
      setAjusteMRR(novoAjuste);
    } catch (error) {
      console.error('Erro ao salvar ajuste MRR:', error);
      alert('Erro ao salvar ajuste. Tente novamente.');
    }
  };

  const handleSaveAjusteUnicas = async (novoAjuste, novoMotivo) => {
    try {
      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();
      
      const ajustesRef = collection(db, 'artifacts', appId, 'public', 'data', 'ajustes');
      const q = query(ajustesRef, orderBy('createdAt', 'desc'));
      const snapshot = await new Promise((resolve) => {
        const unsubscribe = onSnapshot(q, (snap) => {
          unsubscribe();
          resolve(snap);
        });
      });
      
      const ajustes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const ajusteExistente = ajustes.find(
        (a) => a.mes === mesAtual && a.ano === anoAtual && a.tipo === 'unicas'
      );
      
      const ajusteData = {
        valor: novoAjuste,
        motivo: novoMotivo,
        mes: mesAtual,
        ano: anoAtual,
        tipo: 'unicas',
        updatedAt: serverTimestamp(),
      };
      
      if (ajusteExistente) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'ajustes', ajusteExistente.id),
          ajusteData
        );
      } else {
        await addDoc(ajustesRef, {
          ...ajusteData,
          createdAt: serverTimestamp(),
        });
      }
      
      setAjusteUnicas(novoAjuste);
    } catch (error) {
      console.error('Erro ao salvar ajuste Vendas Únicas:', error);
      alert('Erro ao salvar ajuste. Tente novamente.');
    }
  };

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair?')) {
      await signOut(auth);
      setUser(null);
    }
  };

  // --- GERENCIAR USUÁRIOS ---
  const UsuariosManager = () => {
    const [showForm, setShowForm] = useState(false);
    const [editingUsuario, setEditingUsuario] = useState(null);
    const [formData, setFormData] = useState({
      nome: '',
      email: '',
      senha: '',
      perfil: 'usuario',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);

      try {
        if (editingUsuario) {
          // Editar (apenas nome e perfil, senha opcional)
          const updateData = {
            nome: formData.nome,
            perfil: formData.perfil,
          };
          if (formData.senha && formData.senha.length >= 6) {
            updateData.senha = formData.senha;
          }
          await updateDoc(
            doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', editingUsuario.id),
            updateData
          );
        } else {
          // Criar usuário no Firebase Auth
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            formData.email,
            formData.senha
          );
          await updateProfile(userCredential.user, {
            displayName: formData.nome,
          });
          
          // Salvar no Firestore
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'usuarios'), {
            nome: formData.nome,
            email: formData.email,
            perfil: formData.perfil,
            uid: userCredential.user.uid,
            createdAt: new Date(),
          });
          
          // Fazer logout do usuário recém criado e login novamente com o admin
          await signOut(auth);
          await signInWithEmailAndPassword(auth, user.email, 'manter-sessao');
        }

        setFormData({ nome: '', email: '', senha: '', perfil: 'usuario' });
        setEditingUsuario(null);
        setShowForm(false);
      } catch (err) {
        console.error(err);
        if (err.code === 'auth/email-already-in-use') {
          alert('Este email já está cadastrado');
        } else if (err.code === 'auth/invalid-email') {
          alert('Email inválido');
        } else {
          alert('Erro ao processar. Verifique os dados.');
        }
      } finally {
        setLoading(false);
      }
    };

    const handleEdit = (usuario) => {
      setEditingUsuario(usuario);
      setFormData({
        nome: usuario.nome,
        email: usuario.email,
        senha: '',
        perfil: usuario.perfil,
      });
      setShowForm(true);
    };

    const handleDelete = async (usuario) => {
      if (
        confirm(
          `Deseja excluir o usuário ${usuario.nome}? Esta ação não pode ser desfeita.`
        )
      ) {
        try {
          await deleteDoc(
            doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', usuario.id)
          );
        } catch (err) {
          console.error(err);
          alert('Erro ao excluir usuário');
        }
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Gerenciar Usuários
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Controle de acesso ao sistema
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingUsuario(null);
              setFormData({ nome: '', email: '', senha: '', perfil: 'usuario' });
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <PlusCircle size={20} />
            Novo Usuário
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    required={!editingUsuario}
                    disabled={editingUsuario}
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Senha {editingUsuario ? '(deixe vazio para manter)' : '*'}
                  </label>
                  <input
                    required={!editingUsuario}
                    type="password"
                    value={formData.senha}
                    onChange={(e) =>
                      setFormData({ ...formData, senha: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder={editingUsuario ? 'Nova senha (opcional)' : 'Mínimo 6 caracteres'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Perfil *
                  </label>
                  <select
                    required
                    value={formData.perfil}
                    onChange={(e) =>
                      setFormData({ ...formData, perfil: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="usuario">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {editingUsuario ? 'Atualizar' : 'Criar'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUsuario(null);
                    setFormData({ nome: '', email: '', senha: '', perfil: 'usuario' });
                  }}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Usuários */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-bold text-gray-700">Nome</th>
                  <th className="text-left p-4 font-bold text-gray-700">Email</th>
                  <th className="text-left p-4 font-bold text-gray-700">Perfil</th>
                  <th className="text-center p-4 font-bold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-500">
                      Nenhum usuário cadastrado
                    </td>
                  </tr>
                ) : (
                  usuarios.map((usuario) => (
                    <tr key={usuario.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">{usuario.nome}</td>
                      <td className="p-4 text-gray-600">{usuario.email}</td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            usuario.perfil === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {usuario.perfil === 'admin' ? 'Admin' : 'Usuário'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(usuario)}
                            className="text-blue-600 hover:bg-blue-50 p-2 rounded"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(usuario)}
                            className="text-red-600 hover:bg-red-50 p-2 rounded"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Componente de Importação CSV
  const ImportCSV = () => {
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);

    const handleFileChange = (e) => {
      const selectedFile = e.target.files[0];
      if (selectedFile && selectedFile.type === 'text/csv') {
        setFile(selectedFile);
        setResult(null);
      } else {
        alert('Por favor, selecione um arquivo CSV válido.');
      }
    };

    const parseCSV = (text) => {
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        return obj;
      });
    };

    const handleImport = async () => {
      if (!file) return;

      setImporting(true);
      setResult(null);

      try {
        const text = await file.text();
        const data = parseCSV(text);

        let imported = 0;
        let errors = 0;

        for (const row of data) {
          try {
            // Mapear os campos do CSV para o formato do banco
            const clientData = {
              nome: row.nome || row.client || row.cliente || row.company || row.empresa || '',
              cnpj: row.cnpj || row.document || '',
              email: row.email || '',
              telefone: row.telefone || row.phone || row.celular || '',
              cpf: row.cpf || '',
              endereco: row.endereco || row.address || '',
              cidade: row.cidade || row.city || '',
              estado: row.estado || row.state || row.uf || '',
              cep: row.cep || row.zipcode || '',
              produto: row.produto || row.product || 'Cliente Importado',
              valor: 0, // Valor zero para não afetar estatísticas
              vendedor: row.vendedor || row.seller || row.responsavel || 'Importação',
              status: 'ativo',
              createdAt: serverTimestamp(),
            };

            // Validar dados obrigatórios
            if (!clientData.nome || !clientData.cnpj) {
              errors++;
              continue;
            }

            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), clientData);
            imported++;
          } catch (err) {
            console.error('Erro ao importar linha:', err);
            errors++;
          }
        }

        setResult({
          success: true,
          imported,
          errors,
          total: data.length,
        });
      } catch (err) {
        console.error('Erro ao processar arquivo:', err);
        setResult({
          success: false,
          message: 'Erro ao processar o arquivo CSV.',
        });
      } finally {
        setImporting(false);
        setFile(null);
      }
    };

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Upload size={28} className="text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">
              Importar Clientes CSV
            </h2>
          </div>

          {/* Instruções */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-blue-900 mb-2">📋 Formato do CSV:</h3>
            <p className="text-sm text-blue-800 mb-2">
              O arquivo deve conter as seguintes colunas (separadas por vírgula):
            </p>
            <code className="text-xs bg-white px-2 py-1 rounded block mb-2">
              nome,cnpj,email,telefone,cpf,endereco,cidade,estado,cep,produto,vendedor
            </code>
            <p className="text-xs text-blue-700">
              <strong>Obrigatórios:</strong> nome, cnpj <br />
              <strong>Opcionais:</strong> todos os demais campos
            </p>
          </div>

          {/* Área de upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csvFile"
              disabled={importing}
            />
            <label
              htmlFor="csvFile"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload size={48} className="text-gray-400 mb-4" />
              {file ? (
                <div className="text-green-600 font-semibold">
                  ✓ {file.name}
                </div>
              ) : (
                <>
                  <p className="text-gray-600 font-semibold mb-2">
                    Clique para selecionar um arquivo CSV
                  </p>
                  <p className="text-sm text-gray-400">
                    ou arraste e solte aqui
                  </p>
                </>
              )}
            </label>
          </div>

          {/* Botão de importar */}
          {file && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Importando...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Importar Clientes
                </>
              )}
            </button>
          )}

          {/* Resultado */}
          {result && (
            <div
              className={`mt-6 p-4 rounded-lg ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {result.success ? (
                <>
                  <h3 className="font-bold text-green-900 mb-2">
                    ✓ Importação Concluída
                  </h3>
                  <p className="text-green-800">
                    <strong>{result.imported}</strong> clientes importados com sucesso
                  </p>
                  {result.errors > 0 && (
                    <p className="text-orange-700 text-sm mt-1">
                      {result.errors} registros com erro foram ignorados
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h3 className="font-bold text-red-900 mb-2">✗ Erro</h3>
                  <p className="text-red-800">{result.message}</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Exemplo de CSV */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-3">💡 Exemplo de arquivo CSV:</h3>
          <pre className="bg-white p-4 rounded text-xs overflow-x-auto border">
{`nome,cnpj,email,telefone,cpf,endereco,cidade,estado,cep,produto,vendedor
Empresa ABC Ltda,12.345.678/0001-99,contato@empresa.com,11999999999,123.456.789-00,Rua A 123,São Paulo,SP,01234-567,Produto X,Maria
Comércio XYZ SA,98.765.432/0001-11,vendas@comercio.com,11988888888,987.654.321-00,Av B 456,Rio de Janeiro,RJ,20000-000,Produto Y,João`}
          </pre>
        </div>
      </div>
    );
  };

  const NavItem = ({ view, icon: Icon, label }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all ${
        currentView === view
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
      }`}
    >
      {' '}
      <Icon size={20} /> <span className="font-medium">{label}</span>{' '}
    </button>
  );

  // Tela de carregamento inicial
  if (initialLoading) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4"></div>
          <div className="text-white text-2xl font-bold">Carregando dados...</div>
          <div className="text-white/60 text-sm mt-2">Aguarde um momento</div>
        </div>
      </div>
    );
  }

  // Renderizar TV Dashboard fullscreen sem login
  if (currentView === 'tv-dashboard') {
    return (
      <TVDashboard
        sales={sales}
        metaMensal={metaMensal}
        metaSemanal={metaSemanal}
        onBack={() => setCurrentView('dashboard')}
        ajusteFaturamento={ajusteFaturamento}
        onSaveAjuste={handleSaveAjusteFaturamento}
        ajusteMRR={ajusteMRR}
        ajusteUnicas={ajusteUnicas}
        onSaveAjusteMRR={handleSaveAjusteMRR}
        onSaveAjusteUnicas={handleSaveAjusteUnicas}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-full">
        <div className="p-6 border-b border-gray-100 flex items-center space-x-2">
          <TrendingUp className="text-blue-600" size={28} />
          <h1 className="text-xl font-bold text-gray-800">SalesTracker</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="tv-dashboard" icon={Tv} label="TV Dashboard" />
          <NavItem view="analytics" icon={Activity} label="Analytics" />
          <NavItem view="reports" icon={BarChart2} label="Relatórios" />
          <NavItem view="new" icon={PlusCircle} label="Nova Venda" />
          <NavItem view="list" icon={FileText} label="Clientes" />
          <NavItem view="import-csv" icon={Upload} label="Importar CSV" />
          <NavItem view="vendedores" icon={Users} label="Vendedores" />
          <NavItem view="products" icon={ShoppingBag} label="Produtos" />
          <NavItem view="usuarios" icon={Shield} label="Usuários" />
          <NavItem view="metas" icon={Target} label="Metas" />
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center">
              {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold text-gray-800 truncate">
                {user.displayName || 'Usuário'}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {user.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
          >
            Sair
          </button>
        </div>
        <div className="px-4 pb-4 text-xs text-gray-400 text-center">
          v3.0 • Multi-user
        </div>
      </aside>
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b z-20 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <TrendingUp className="text-blue-600" size={24} />
          <span className="font-bold text-gray-800">SalesTracker</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs">
            {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600"
          >
            <Menu />
          </button>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-gray-800 bg-opacity-50 z-10"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="bg-white w-64 h-full p-4 pt-20 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <NavItem
              view="dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
            />
            <NavItem view="tv-dashboard" icon={Tv} label="TV Dashboard" />
            <NavItem view="analytics" icon={Activity} label="Analytics" />
            <NavItem view="reports" icon={BarChart2} label="Relatórios" />
            <NavItem view="new" icon={PlusCircle} label="Nova Venda" />
            <NavItem view="list" icon={FileText} label="Clientes" />
            <NavItem view="import-csv" icon={Upload} label="Importar CSV" />
            <NavItem view="vendedores" icon={Users} label="Vendedores" />
            <NavItem view="products" icon={ShoppingBag} label="Produtos" />
            <NavItem view="usuarios" icon={Shield} label="Usuários" />
            <NavItem view="metas" icon={Target} label="Metas" />
            <div className="pt-4 border-t border-gray-200 mt-4">
              <button
                onClick={handleLogout}
                className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8 relative bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {currentView === 'dashboard' && (
            <Dashboard 
              sales={sales}
              ajusteFaturamento={ajusteFaturamento}
              onSaveAjuste={handleSaveAjusteFaturamento}
            />
          )}
          {currentView === 'analytics' && <AnalyticsView sales={sales} />}
          {currentView === 'reports' && (
            <ReportsView sales={sales} vendedores={vendedores} />
          )}
          {currentView === 'vendedores' && (
            <VendedoresManager
              vendedores={vendedores}
              onAddVendedor={handleAddVendedor}
              onDeleteVendedor={handleDeleteVendedor}
            />
          )}
          {currentView === 'products' && (
            <ProductCatalog
              products={products}
              onAddProduct={handleAddProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}
          {currentView === 'metas' && <MetaSettings onTransferToRecorrente={handleTransferToRecorrente} loading={loading} />}
          {currentView === 'import-csv' && <ImportCSV />}
          {currentView === 'new' && (
            <SalesForm
              onSave={handleAddSale}
              loading={loading}
              products={products}
              vendedores={vendedores}
              leadToConvert={leadToConvert}
            />
          )}
          {currentView === 'list' && (
            <SalesList
              sales={sales}
              onDelete={handleDelete}
              onUpdateStatus={handleUpdateStatus}
              onUpdateClient={handleUpdateClient}
              onToggleRecorrente={handleToggleRecorrente}
            />
          )}
        </div>
      </main>
    </div>
  );
}
