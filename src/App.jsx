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
const formatCNPJ = (value) =>
  value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
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

// --- COMPONENTES VISUAIS ---

const StatCard = ({ title, value, icon: Icon, colorClass, subtext, trend }) => (
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
  </div>
);

const ClientCardModal = ({ client, onClose, onSaveClient }) => {
  const [obs, setObs] = useState(client.observacoes || '');
  const [dataAtivacao, setDataAtivacao] = useState(
    toInputDate(client.dataAtivacao)
  );
  const [saving, setSaving] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSaveClient(client.id, {
      observacoes: obs,
      dataAtivacao: dataAtivacao
        ? Timestamp.fromDate(new Date(dataAtivacao))
        : null,
    });
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

// --- DASHBOARD PADRÃO ---
const Dashboard = ({ sales }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const isSameMonth = (d) => {
    if (!d) return false;
    const date = d.toDate ? d.toDate() : new Date(d);
    return (
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const salesInMonth = sales.filter((s) => isSameMonth(s.createdAt));
  const totalVendas = salesInMonth.reduce(
    (acc, curr) => acc + (curr.valor || 0),
    0
  );
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
          title="Faturamento"
          value={formatCurrency(totalVendas)}
          icon={DollarSign}
          colorClass="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          title="Comissões"
          value={formatCurrency(totalComissao)}
          icon={Receipt}
          colorClass="bg-rose-100 text-rose-600"
        />
        <StatCard
          title="Vendas"
          value={salesInMonth.length}
          icon={FileText}
          colorClass="bg-blue-100 text-blue-600"
        />
      </div>
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

// --- RELATÓRIOS AVANÇADOS (Corrigido) ---
const ReportsView = ({ sales }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedVendedor, setSelectedVendedor] = useState('todos');

  const vendedores = useMemo(
    () => [...new Set(sales.map((s) => s.vendedor).filter(Boolean))].sort(),
    [sales]
  );
  const isSameMonth = (d) => {
    if (!d) return false;
    const date = d.toDate ? d.toDate() : new Date(d);
    return (
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const filteredData = useMemo(
    () =>
      sales.filter(
        (sale) =>
          isSameMonth(sale.createdAt) &&
          (selectedVendedor === 'todos' || sale.vendedor === selectedVendedor)
      ),
    [sales, selectedDate, selectedVendedor]
  );
  const stats = useMemo(
    () =>
      filteredData.reduce(
        (acc, curr) => ({
          totalVendas: acc.totalVendas + (curr.valor || 0),
          totalComissao: acc.totalComissao + (curr.comissaoValor || 0),
        }),
        { totalVendas: 0, totalComissao: 0 }
      ),
    [filteredData]
  );

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
          <h2 className="text-lg font-bold text-gray-800">Relatórios</h2>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedVendedor}
            onChange={(e) => setSelectedVendedor(e.target.value)}
            className="p-2 border rounded-lg text-sm"
          >
            <option value="todos">Todos Vendedores</option>
            {vendedores.map((v) => (
              <option key={v} value={v}>
                {v}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Total Vendas"
          value={formatCurrency(stats.totalVendas)}
          icon={DollarSign}
          colorClass="bg-blue-100 text-blue-600"
          subtext={selectedVendedor === 'todos' ? 'Equipe' : selectedVendedor}
        />
        <StatCard
          title="Comissões"
          value={formatCurrency(stats.totalComissao)}
          icon={Receipt}
          colorClass="bg-emerald-100 text-emerald-600"
          subtext="A pagar"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Cliente</th>
                {selectedVendedor === 'todos' && (
                  <th className="p-4">Vendedor</th>
                )}
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
                  {selectedVendedor === 'todos' && (
                    <td className="p-4 text-gray-600">{sale.vendedor}</td>
                  )}
                  <td className="p-4 text-right text-blue-600">
                    {formatCurrency(sale.valor)}
                  </td>
                  <td className="p-4 text-right text-emerald-600">
                    {formatCurrency(sale.comissaoValor)}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${
                        sale.status === 'ativo'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {sale.status}
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
const SalesList = ({ sales, onDelete, onUpdateStatus, onUpdateClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const filtered = sales.filter(
    (s) =>
      s.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.vendedor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">Clientes</h2>
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
                    {s.razaoSocial}
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
                    <button
                      onClick={() => onDelete(s.id)}
                      className="text-gray-400 hover:text-red-500"
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

// --- SALES FORM (Atualizado v2.6) ---
const SalesForm = ({ onSave, loading, products }) => {
  const [formData, setFormData] = useState({
    razaoSocial: '',
    cnpj: '',
    vendedor: '',
    status: 'aguardando',
    observacoes: '',
    dataAtivacao: '',
    comissaoPorcentagem: '10',
    estado: '',
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
        ? Timestamp.fromDate(new Date(formData.dataAtivacao))
        : null,
    });
    setItems([]);
    setFormData({
      razaoSocial: '',
      cnpj: '',
      vendedor: '',
      status: 'aguardando',
      observacoes: '',
      dataAtivacao: '',
      comissaoPorcentagem: '10',
      estado: '',
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 mb-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Receipt className="text-blue-600" /> Nova Venda
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <input
            required
            value={formData.razaoSocial}
            onChange={(e) =>
              setFormData({ ...formData, razaoSocial: e.target.value })
            }
            className="p-2 border rounded"
            placeholder="Empresa"
          />
          <input
            value={formData.cnpj}
            onChange={(e) =>
              setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })
            }
            className="p-2 border rounded"
            placeholder="CNPJ"
          />
          <input
            required
            value={formData.vendedor}
            onChange={(e) =>
              setFormData({ ...formData, vendedor: e.target.value })
            }
            className="p-2 border rounded"
            placeholder="Vendedor"
          />
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
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('analytics');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (typeof __initial_auth_token !== 'undefined')
        await signInWithCustomToken(auth, __initial_auth_token);
      else await signInAnonymously(auth);
    };
    init();
    return onAuthStateChanged(auth, setUser);
  }, []);
  useEffect(() => {
    if (!user) return;
    const unsubS = onSnapshot(
      query(
        collection(db, 'artifacts', appId, 'public', 'data', 'sales'),
        orderBy('createdAt', 'desc')
      ),
      (s) => setSales(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubP = onSnapshot(
      query(
        collection(db, 'artifacts', appId, 'public', 'data', 'products'),
        orderBy('name', 'asc')
      ),
      (s) => setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      unsubS();
      unsubP();
    };
  }, [user]);

  const handleAddSale = async (data) => {
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(
        collection(db, 'artifacts', appId, 'public', 'data', 'sales'),
        { ...data, createdAt: serverTimestamp(), createdBy: user.uid }
      );
      setCurrentView('list');
    } catch (e) {
      console.error(e);
      alert('Erro.');
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
  const handleAddProduct = (data) =>
    addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  const handleDeleteProduct = (id) => {
    if (confirm('Excluir?'))
      deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id));
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

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Carregando sistema...
      </div>
    );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-full">
        <div className="p-6 border-b border-gray-100 flex items-center space-x-2">
          <TrendingUp className="text-blue-600" size={28} />
          <h1 className="text-xl font-bold text-gray-800">SalesTracker</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="analytics" icon={Activity} label="Analytics" />
          <NavItem view="reports" icon={BarChart2} label="Relatórios" />
          <NavItem view="new" icon={PlusCircle} label="Nova Venda" />
          <NavItem view="list" icon={Users} label="Clientes" />
          <NavItem view="products" icon={ShoppingBag} label="Produtos" />
        </nav>
        <div className="p-4 border-t border-gray-100 text-xs text-gray-400 text-center">
          v2.6 • Final
        </div>
      </aside>
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b z-20 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <TrendingUp className="text-blue-600" size={24} />
          <span className="font-bold text-gray-800">SalesTracker</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-600"
        >
          <Menu />
        </button>
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
            <NavItem view="analytics" icon={Activity} label="Analytics" />
            <NavItem view="reports" icon={BarChart2} label="Relatórios" />
            <NavItem view="new" icon={PlusCircle} label="Nova Venda" />
            <NavItem view="list" icon={Users} label="Clientes" />
            <NavItem view="products" icon={ShoppingBag} label="Produtos" />
          </div>
        </div>
      )}
      <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8 relative bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {currentView === 'dashboard' && <Dashboard sales={sales} />}
          {currentView === 'analytics' && <AnalyticsView sales={sales} />}
          {currentView === 'reports' && <ReportsView sales={sales} />}
          {currentView === 'products' && (
            <ProductCatalog
              products={products}
              onAddProduct={handleAddProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}
          {currentView === 'new' && (
            <SalesForm
              onSave={handleAddSale}
              loading={loading}
              products={products}
            />
          )}
          {currentView === 'list' && (
            <SalesList
              sales={sales}
              onDelete={handleDelete}
              onUpdateStatus={handleUpdateStatus}
              onUpdateClient={handleUpdateClient}
            />
          )}
        </div>
      </main>
    </div>
  );
}
