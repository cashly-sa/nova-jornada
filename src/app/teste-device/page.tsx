'use client'

import { useEffect, useState } from 'react'
import { detectDevice } from '@/lib/device-detection'

// Tipos para os dados de cada camada
interface Layer1Data {
  // Dados básicos
  modelo: string
  fabricante: string
  tipo: string
  os: string
  browser: string
  loading: boolean
  error?: string
  // Dados completos da nova API
  fullData?: {
    hardware: {
      vendor: string
      model: string
      name: string
    }
    platform: {
      vendor: string
      name: string
      version: string
    }
    browser: {
      vendor: string
      name: string
      version: string
    }
    deviceType: string
    priceBand: string
    priceBandReason: string | null
    acceptCH: {
      browser: string | null
      hardware: string | null
      platform: string | null
    }
  }
  debug?: {
    userAgentReceived: string
    headersCount: number
    hasClientHints: boolean
    clientHintsReceived?: string[]
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw?: any // Resposta bruta da API para debug
}

interface Layer2Data {
  model: string
  platform: string
  platformVersion: string
  architecture: string
  uaFullVersion: string
  error?: string
}

interface Layer3Data {
  mobile: boolean
  platform: string
  brands: Array<{ brand: string; version: string }>
}

interface Layer4Data {
  modelo: string
  fabricante: string
}

// Componente para exibir uma linha de dado
function DataRow({
  label,
  value,
  status,
  small = false
}: {
  label: string
  value: string
  status: 'success' | 'warning' | 'error' | 'loading'
  small?: boolean
}) {
  const statusIcons = {
    success: <span className="text-green-500 font-bold">OK</span>,
    warning: <span className="text-yellow-500 font-bold">!</span>,
    error: <span className="text-red-500 font-bold">X</span>,
    loading: <span className="text-gray-400 animate-pulse">...</span>,
  }

  const valueColors = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-500',
    loading: 'text-gray-400',
  }

  return (
    <div className={`flex items-center justify-between ${small ? 'py-1' : 'py-1.5'} border-b border-gray-100 last:border-0`}>
      <span className={`text-gray-500 ${small ? 'text-xs' : 'text-sm'}`}>{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-mono ${small ? 'text-xs' : 'text-sm'} ${valueColors[status]}`}>
          {value || '(vazio)'}
        </span>
        {statusIcons[status]}
      </div>
    </div>
  )
}

// Componente para seção dentro do card
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  )
}

// Componente para o card de cada Layer
function LayerCard({
  layerNumber,
  title,
  badge,
  badgeColor,
  children,
  isConnected = true,
}: {
  layerNumber: number
  title: string
  badge: string
  badgeColor: string
  children: React.ReactNode
  isConnected?: boolean
}) {
  return (
    <div className="relative">
      {/* Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
              {layerNumber}
            </span>
            <span className="text-white font-semibold">{title}</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${badgeColor}`}>
            {badge}
          </span>
        </div>
        {/* Content */}
        <div className="p-4">
          {children}
        </div>
      </div>

      {/* Connector */}
      {isConnected && (
        <div className="flex justify-center py-2">
          <div className="w-0.5 h-6 bg-gradient-to-b from-gray-300 to-gray-400"></div>
        </div>
      )}
    </div>
  )
}

// Componente principal
export default function TesteDevicePage() {
  const [layer1, setLayer1] = useState<Layer1Data>({
    modelo: '', fabricante: '', tipo: '', os: '', browser: '', loading: true
  })
  const [layer2, setLayer2] = useState<Layer2Data | null>(null)
  const [layer3, setLayer3] = useState<Layer3Data | null>(null)
  const [layer4, setLayer4] = useState<Layer4Data | null>(null)
  const [userAgent, setUserAgent] = useState('')
  const [timestamp, setTimestamp] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function runDetection() {
      setTimestamp(new Date().toLocaleString('pt-BR'))
      setUserAgent(navigator.userAgent)

      // LAYER 4: User-Agent Parsing (Local)
      const localResult = await detectDevice()
      setLayer4({
        modelo: localResult.modelo,
        fabricante: localResult.fabricante,
      })

      // LAYER 3: Client Hints (Low Entropy)
      if (navigator.userAgentData) {
        setLayer3({
          mobile: navigator.userAgentData.mobile,
          platform: navigator.userAgentData.platform,
          brands: navigator.userAgentData.brands || [],
        })

        // LAYER 2: Client Hints (High Entropy)
        try {
          const hints = await navigator.userAgentData.getHighEntropyValues([
            'model', 'platform', 'platformVersion', 'architecture', 'uaFullVersion'
          ])
          setLayer2({
            model: hints.model || '',
            platform: hints.platform || '',
            platformVersion: hints.platformVersion || '',
            architecture: hints.architecture || '',
            uaFullVersion: hints.uaFullVersion || '',
          })
        } catch (e) {
          setLayer2({
            model: '', platform: '', platformVersion: '',
            architecture: '', uaFullVersion: '',
            error: String(e),
          })
        }
      }

      // LAYER 1: 51Degrees API
      try {
        const response = await fetch('/api/device/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        const data = await response.json()

        if (data.success) {
          setLayer1({
            modelo: data.device?.modelo || 'unknown',
            fabricante: data.device?.fabricante || 'unknown',
            tipo: data.device?.tipo || 'unknown',
            os: data.os ? `${data.os.nome} ${data.os.versao}` : 'unknown',
            browser: data.browser ? `${data.browser.nome} ${data.browser.versao}` : 'unknown',
            loading: false,
            fullData: data.fullData,
            debug: data.debug,
            raw: data.raw, // Resposta bruta para debug
          })
        } else {
          setLayer1({
            modelo: '', fabricante: '', tipo: '', os: '', browser: '',
            loading: false,
            error: data.error || 'Erro desconhecido',
          })
        }
      } catch (e) {
        setLayer1({
          modelo: '', fabricante: '', tipo: '', os: '', browser: '',
          loading: false,
          error: String(e),
        })
      }

      setLoading(false)
    }

    runDetection()
  }, [])

  // Calcular score de confianca
  const calculateConfidence = () => {
    let score = 0
    let sources = 0

    // 51Degrees detectou modelo?
    if (layer1.modelo && layer1.modelo !== 'unknown') {
      score += 40
      sources++
    }
    // Client Hints High detectou modelo?
    if (layer2?.model) {
      score += 30
      sources++
    }
    // Client Hints Low confirmou mobile?
    if (layer3?.mobile !== undefined) {
      score += 15
      sources++
    }
    // User-Agent parsing detectou?
    if (layer4?.modelo && layer4.modelo !== 'unknown') {
      score += 15
      sources++
    }

    return { score: Math.min(score, 100), sources }
  }

  const confidence = calculateConfidence()

  // Determinar resultado final
  const getFinalResult = () => {
    // Prioridade: 51Degrees > Client Hints High > User-Agent
    if (layer1.modelo && layer1.modelo !== 'unknown') {
      return { modelo: layer1.modelo, fabricante: layer1.fabricante, source: '51Degrees API' }
    }
    if (layer2?.model) {
      return { modelo: layer2.model, fabricante: layer3?.platform || 'unknown', source: 'Client Hints' }
    }
    if (layer4?.modelo && layer4.modelo !== 'unknown') {
      return { modelo: layer4.modelo, fabricante: layer4.fabricante, source: 'User-Agent' }
    }
    return { modelo: 'unknown', fabricante: 'unknown', source: 'Nenhum' }
  }

  const finalResult = getFinalResult()

  const getStatus = (value: string | undefined | null): 'success' | 'error' | 'warning' => {
    if (!value || value === 'unknown' || value === '(vazio)') return 'error'
    return 'success'
  }

  const refresh = () => window.location.reload()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-white/80">Executando Detection Pipeline...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 pb-8">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-2xl font-bold text-white mb-1">Detection Pipeline</h1>
          <p className="text-gray-400 text-sm">Todos os dados da 51Degrees API</p>
          <p className="text-gray-500 text-xs mt-1">{timestamp}</p>
        </div>

        {/* LAYER 1: 51Degrees - EXPANDIDO */}
        <LayerCard
          layerNumber={1}
          title="51DEGREES API"
          badge="CLOUD"
          badgeColor="bg-blue-500 text-white"
        >
          {layer1.error ? (
            <p className="text-red-500 text-sm">{layer1.error}</p>
          ) : (
            <>
              {/* Hardware */}
              <Section title="Hardware">
                <DataRow label="Model" value={layer1.fullData?.hardware.model || layer1.modelo} status={layer1.loading ? 'loading' : getStatus(layer1.fullData?.hardware.model || layer1.modelo)} />
                <DataRow label="Vendor" value={layer1.fullData?.hardware.vendor || layer1.fabricante} status={layer1.loading ? 'loading' : getStatus(layer1.fullData?.hardware.vendor || layer1.fabricante)} />
                <DataRow label="Name" value={layer1.fullData?.hardware.name || ''} status={layer1.loading ? 'loading' : getStatus(layer1.fullData?.hardware.name)} />
              </Section>

              {/* Platform */}
              <Section title="Platform">
                <DataRow label="Name" value={layer1.fullData?.platform.name || ''} status={layer1.loading ? 'loading' : getStatus(layer1.fullData?.platform.name)} />
                <DataRow label="Version" value={layer1.fullData?.platform.version || ''} status={layer1.loading ? 'loading' : getStatus(layer1.fullData?.platform.version)} />
                <DataRow label="Vendor" value={layer1.fullData?.platform.vendor || ''} status={layer1.loading ? 'loading' : getStatus(layer1.fullData?.platform.vendor)} />
              </Section>

              {/* Browser */}
              <Section title="Browser">
                <DataRow label="Name" value={layer1.fullData?.browser.name || ''} status={layer1.loading ? 'loading' : getStatus(layer1.fullData?.browser.name)} />
                <DataRow label="Version" value={layer1.fullData?.browser.version || ''} status={layer1.loading ? 'loading' : getStatus(layer1.fullData?.browser.version)} />
                <DataRow label="Vendor" value={layer1.fullData?.browser.vendor || ''} status={layer1.loading ? 'loading' : getStatus(layer1.fullData?.browser.vendor)} />
              </Section>

              {/* Device & Price */}
              <Section title="Device Info">
                <DataRow label="Device Type" value={layer1.fullData?.deviceType || layer1.tipo} status={layer1.loading ? 'loading' : getStatus(layer1.fullData?.deviceType || layer1.tipo)} />
                <DataRow
                  label="Price Band"
                  value={layer1.fullData?.priceBand || 'unknown'}
                  status={layer1.loading ? 'loading' : getStatus(layer1.fullData?.priceBand)}
                />
                {layer1.fullData?.priceBandReason && (
                  <p className="text-xs text-gray-400 mt-1 italic">
                    {layer1.fullData.priceBandReason}
                  </p>
                )}
              </Section>

              {/* Accept-CH Headers */}
              {(layer1.fullData?.acceptCH.hardware || layer1.fullData?.acceptCH.platform || layer1.fullData?.acceptCH.browser) && (
                <Section title="Accept-CH Headers (Recomendados)">
                  {layer1.fullData?.acceptCH.hardware && (
                    <p className="text-xs font-mono text-gray-500 break-all mb-1">
                      Hardware: {layer1.fullData.acceptCH.hardware}
                    </p>
                  )}
                  {layer1.fullData?.acceptCH.platform && (
                    <p className="text-xs font-mono text-gray-500 break-all mb-1">
                      Platform: {layer1.fullData.acceptCH.platform}
                    </p>
                  )}
                  {layer1.fullData?.acceptCH.browser && (
                    <p className="text-xs font-mono text-gray-500 break-all">
                      Browser: {layer1.fullData.acceptCH.browser}
                    </p>
                  )}
                </Section>
              )}

              {/* Debug Info */}
              {layer1.debug && (
                <Section title="Debug">
                  <p className="text-xs font-mono text-gray-500 break-all">
                    UA: {layer1.debug.userAgentReceived}
                  </p>
                  <p className="text-xs font-mono text-gray-500 mt-1">
                    Headers: {layer1.debug.headersCount} | Client Hints: {layer1.debug.hasClientHints ? 'Sim' : 'Nao'}
                  </p>
                  {layer1.debug.clientHintsReceived && layer1.debug.clientHintsReceived.length > 0 && (
                    <p className="text-xs font-mono text-gray-500 mt-1">
                      CH recebidos: {layer1.debug.clientHintsReceived.join(', ')}
                    </p>
                  )}
                </Section>
              )}

              {/* RAW Response */}
              {layer1.raw && (
                <Section title="Resposta RAW (51Degrees)">
                  <details className="text-xs">
                    <summary className="text-blue-600 cursor-pointer font-semibold mb-2">
                      Clique para expandir JSON completo
                    </summary>
                    <pre className="bg-gray-100 rounded-lg p-3 overflow-x-auto text-gray-600 whitespace-pre-wrap">
                      {JSON.stringify(layer1.raw, null, 2)}
                    </pre>
                  </details>
                </Section>
              )}
            </>
          )}
        </LayerCard>

        {/* LAYER 2: Client Hints High */}
        <LayerCard
          layerNumber={2}
          title="CLIENT HINTS (HIGH)"
          badge="BROWSER"
          badgeColor="bg-purple-500 text-white"
        >
          {layer2?.error ? (
            <p className="text-red-500 text-sm">{layer2.error}</p>
          ) : layer2 ? (
            <>
              <DataRow label="model" value={layer2.model} status={getStatus(layer2.model)} />
              <DataRow label="platform" value={layer2.platform} status={getStatus(layer2.platform)} />
              <DataRow label="platformVersion" value={layer2.platformVersion} status={getStatus(layer2.platformVersion)} />
              <DataRow label="architecture" value={layer2.architecture} status={getStatus(layer2.architecture)} />
            </>
          ) : (
            <p className="text-yellow-500 text-sm">Client Hints API nao disponivel</p>
          )}
        </LayerCard>

        {/* LAYER 3: Client Hints Low */}
        <LayerCard
          layerNumber={3}
          title="CLIENT HINTS (LOW)"
          badge="BASICO"
          badgeColor="bg-green-500 text-white"
        >
          {layer3 ? (
            <>
              <DataRow label="mobile" value={layer3.mobile ? 'true' : 'false'} status={layer3.mobile ? 'success' : 'warning'} />
              <DataRow label="platform" value={layer3.platform} status={getStatus(layer3.platform)} />
              <div className="pt-2">
                <span className="text-gray-500 text-sm">brands:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {layer3.brands.map((b, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">
                      {b.brand} v{b.version}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-yellow-500 text-sm">Client Hints API nao disponivel</p>
          )}
        </LayerCard>

        {/* LAYER 4: User-Agent */}
        <LayerCard
          layerNumber={4}
          title="USER-AGENT PARSING"
          badge="FALLBACK"
          badgeColor="bg-orange-500 text-white"
          isConnected={false}
        >
          {layer4 && (
            <>
              <DataRow label="Modelo" value={layer4.modelo} status={getStatus(layer4.modelo)} />
              <DataRow label="Fabricante" value={layer4.fabricante} status={getStatus(layer4.fabricante)} />
            </>
          )}
        </LayerCard>

        {/* RESULTADO FINAL */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-xl p-5 mt-6">
          <h2 className="text-white font-bold text-lg mb-4 text-center">RESULTADO FINAL</h2>

          <div className="bg-white/10 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-blue-200 text-xs uppercase tracking-wide">Modelo</p>
                <p className="text-white font-bold text-lg">{finalResult.modelo}</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs uppercase tracking-wide">Fabricante</p>
                <p className="text-white font-bold text-lg">{finalResult.fabricante}</p>
              </div>
            </div>
            {layer1.fullData?.hardware.name && layer1.fullData.hardware.name !== 'unknown' && (
              <div className="text-center mt-3 pt-3 border-t border-white/20">
                <p className="text-blue-200 text-xs uppercase tracking-wide">Nome Comercial</p>
                <p className="text-white font-semibold">{layer1.fullData.hardware.name}</p>
              </div>
            )}
          </div>

          {/* Confidence Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-blue-200">Confianca</span>
              <span className="text-white font-bold">{confidence.score}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${confidence.score}%` }}
              />
            </div>
            <p className="text-blue-200 text-xs mt-1">{confidence.sources} de 4 fontes concordam</p>
          </div>

          <p className="text-center text-blue-200 text-sm">
            Fonte: <span className="text-white font-semibold">{finalResult.source}</span>
          </p>
        </div>

        {/* User-Agent Raw */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">User-Agent String</h3>
          <div className="bg-gray-100 rounded-lg p-3 text-xs font-mono break-all text-gray-600">
            {userAgent}
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={refresh}
          className="w-full bg-gradient-to-r from-gray-700 to-gray-800 text-white py-3 rounded-xl font-bold hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg"
        >
          Executar Novamente
        </button>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs">
          Pagina de debug - remover apos testes
        </p>
      </div>
    </div>
  )
}
