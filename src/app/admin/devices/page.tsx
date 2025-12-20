'use client'

import { useState, useEffect, useCallback } from 'react'
import { CashlyLogo } from '@/components/CashlyLogo'
import { supabase } from '@/lib/supabase'

interface EligibleDevice {
  id: number
  modelo: string
  fabricante: string
  nome_comercial: string | null
  valor_aprovado: number
  ativo: boolean
  created_at: string
  updated_at: string
}

interface DeviceForm {
  modelo: string
  fabricante: string
  nome_comercial: string
  valor_aprovado: number
  ativo: boolean
}

const initialForm: DeviceForm = {
  modelo: '',
  fabricante: '',
  nome_comercial: '',
  valor_aprovado: 0,
  ativo: true,
}

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<EligibleDevice[]>([])
  const [filteredDevices, setFilteredDevices] = useState<EligibleDevice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFabricante, setFilterFabricante] = useState('')
  const [filterAtivo, setFilterAtivo] = useState<'all' | 'active' | 'inactive'>('all')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingDevice, setEditingDevice] = useState<EligibleDevice | null>(null)
  const [form, setForm] = useState<DeviceForm>(initialForm)
  const [isSaving, setIsSaving] = useState(false)

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingDevice, setDeletingDevice] = useState<EligibleDevice | null>(null)

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('eligible_devices')
        .select('*')
        .order('fabricante', { ascending: true })
        .order('modelo', { ascending: true })

      if (error) throw error

      setDevices(data || [])
    } catch (err) {
      console.error('Error fetching devices:', err)
      setError('Erro ao carregar dispositivos')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  // Filter devices
  useEffect(() => {
    let filtered = [...devices]

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(d =>
        d.modelo.toLowerCase().includes(term) ||
        d.fabricante.toLowerCase().includes(term) ||
        (d.nome_comercial && d.nome_comercial.toLowerCase().includes(term))
      )
    }

    // Fabricante filter
    if (filterFabricante) {
      filtered = filtered.filter(d => d.fabricante === filterFabricante)
    }

    // Active filter
    if (filterAtivo === 'active') {
      filtered = filtered.filter(d => d.ativo)
    } else if (filterAtivo === 'inactive') {
      filtered = filtered.filter(d => !d.ativo)
    }

    setFilteredDevices(filtered)
  }, [devices, searchTerm, filterFabricante, filterAtivo])

  // Get unique fabricantes
  const fabricantes = [...new Set(devices.map(d => d.fabricante))].sort()

  // Open modal for add
  const handleAdd = () => {
    setEditingDevice(null)
    setForm(initialForm)
    setShowModal(true)
  }

  // Open modal for edit
  const handleEdit = (device: EligibleDevice) => {
    setEditingDevice(device)
    setForm({
      modelo: device.modelo,
      fabricante: device.fabricante,
      nome_comercial: device.nome_comercial || '',
      valor_aprovado: device.valor_aprovado,
      ativo: device.ativo,
    })
    setShowModal(true)
  }

  // Save device
  const handleSave = async () => {
    if (!form.modelo || !form.fabricante || form.valor_aprovado <= 0) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      if (editingDevice) {
        // Update
        const { error } = await supabase
          .from('eligible_devices')
          .update({
            modelo: form.modelo.toUpperCase(),
            fabricante: form.fabricante,
            nome_comercial: form.nome_comercial || null,
            valor_aprovado: form.valor_aprovado,
            ativo: form.ativo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingDevice.id)

        if (error) throw error

        setSuccess('Dispositivo atualizado com sucesso!')
      } else {
        // Insert
        const { error } = await supabase
          .from('eligible_devices')
          .insert({
            modelo: form.modelo.toUpperCase(),
            fabricante: form.fabricante,
            nome_comercial: form.nome_comercial || null,
            valor_aprovado: form.valor_aprovado,
            ativo: form.ativo,
          })

        if (error) throw error

        setSuccess('Dispositivo adicionado com sucesso!')
      }

      setShowModal(false)
      fetchDevices()
    } catch (err: unknown) {
      console.error('Error saving device:', err)
      if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
        setError('Este modelo já existe')
      } else {
        setError('Erro ao salvar dispositivo')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle active
  const handleToggleActive = async (device: EligibleDevice) => {
    try {
      const { error } = await supabase
        .from('eligible_devices')
        .update({
          ativo: !device.ativo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', device.id)

      if (error) throw error

      setSuccess(`Dispositivo ${!device.ativo ? 'ativado' : 'desativado'}`)
      fetchDevices()
    } catch (err) {
      console.error('Error toggling device:', err)
      setError('Erro ao alterar status')
    }
  }

  // Delete
  const handleDelete = async () => {
    if (!deletingDevice) return

    try {
      const { error } = await supabase
        .from('eligible_devices')
        .delete()
        .eq('id', deletingDevice.id)

      if (error) throw error

      setSuccess('Dispositivo removido')
      setShowDeleteConfirm(false)
      setDeletingDevice(null)
      fetchDevices()
    } catch (err) {
      console.error('Error deleting device:', err)
      setError('Erro ao remover dispositivo')
    }
  }

  // Clear messages after 3s
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('')
        setError('')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CashlyLogo size="sm" />
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-xl font-semibold text-gray-800">
              Gestão de Dispositivos
            </h1>
          </div>
          <button
            onClick={handleAdd}
            className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar
          </button>
        </div>
      </header>

      {/* Messages */}
      {(success || error) && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Modelo, fabricante ou nome comercial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Fabricante */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fabricante
              </label>
              <select
                value={filterFabricante}
                onChange={(e) => setFilterFabricante(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Todos</option>
                {fabricantes.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filterAtivo}
                onChange={(e) => setFilterAtivo(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex gap-6 text-sm text-gray-600">
            <span>Total: <strong>{devices.length}</strong> dispositivos</span>
            <span>Ativos: <strong>{devices.filter(d => d.ativo).length}</strong></span>
            <span>Exibindo: <strong>{filteredDevices.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 mt-6 pb-10">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <svg className="animate-spin w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Carregando...
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {devices.length === 0 ? (
                <>
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p>Nenhum dispositivo cadastrado</p>
                  <button
                    onClick={handleAdd}
                    className="mt-2 text-primary hover:underline"
                  >
                    Adicionar primeiro dispositivo
                  </button>
                </>
              ) : (
                <p>Nenhum resultado encontrado para os filtros aplicados</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modelo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fabricante
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome Comercial
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Aprovado
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDevices.map((device) => (
                    <tr key={device.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {device.modelo}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {device.fabricante}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {device.nome_comercial || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(device.valor_aprovado)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(device)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                            device.ativo
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${device.ativo ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {device.ativo ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(device)}
                            className="p-2 text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setDeletingDevice(device)
                              setShowDeleteConfirm(true)
                            }}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingDevice ? 'Editar Dispositivo' : 'Novo Dispositivo'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modelo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.modelo}
                  onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                  placeholder="Ex: SM-A546E"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fabricante <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.fabricante}
                  onChange={(e) => setForm({ ...form, fabricante: e.target.value })}
                  placeholder="Ex: Samsung"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  list="fabricantes"
                />
                <datalist id="fabricantes">
                  {fabricantes.map(f => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Comercial
                </label>
                <input
                  type="text"
                  value={form.nome_comercial}
                  onChange={(e) => setForm({ ...form, nome_comercial: e.target.value })}
                  placeholder="Ex: Galaxy A54"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Aprovado <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    R$
                  </span>
                  <input
                    type="number"
                    value={form.valor_aprovado}
                    onChange={(e) => setForm({ ...form, valor_aprovado: Number(e.target.value) })}
                    placeholder="0,00"
                    min="0"
                    step="50"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="ativo" className="text-sm text-gray-700">
                  Dispositivo ativo (aceita novos créditos)
                </label>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Remover dispositivo?
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Deseja remover o dispositivo <strong>{deletingDevice.modelo}</strong>?
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeletingDevice(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
