# Device Detection - Documentacao Tecnica

> Sistema de deteccao de dispositivos moveis em camadas para validacao de credito

## Visao Geral

A deteccao de devices utiliza um sistema em **4 camadas** (layers), onde cada camada tem diferentes niveis de precisao e disponibilidade. O sistema tenta a camada mais precisa primeiro e faz fallback para as menos precisas se necessario.

---

## Camadas de Deteccao

### Layer 1: 51Degrees API (CLOUD)

| Propriedade | Valor |
|-------------|-------|
| **Fonte** | API Cloud (servidor) |
| **Precisao** | Alta (95%+) |
| **Disponibilidade** | Depende de conexao com API externa |
| **Custo** | Pago (plano gratuito limitado) |

**Como funciona:**
- Envia User-Agent + Client Hints para API da 51Degrees
- Retorna dados enriquecidos do device (modelo, fabricante, nome comercial)
- Possui banco de dados com milhoes de devices cadastrados

**Dados retornados:**
```typescript
{
  hardware: {
    vendor: "Samsung",           // Fabricante
    model: "SM-A546E",           // Modelo tecnico
    name: "Galaxy A54 5G"        // Nome comercial
  },
  platform: {
    name: "Android",
    version: "14.0",
    vendor: "Google"
  },
  browser: {
    name: "Chrome",
    version: "131.0"
  },
  deviceType: "SmartPhone",
  priceBand: "MidRange"          // Requer plano pago
}
```

**Quando usar:** Sempre como primeira opcao (maior precisao)

**Endpoint:** `POST /api/device/detect`

---

### Layer 2: Client Hints - High Entropy (BROWSER)

| Propriedade | Valor |
|-------------|-------|
| **Fonte** | API do navegador (cliente) |
| **Precisao** | Media-Alta (70-85%) |
| **Disponibilidade** | Apenas navegadores modernos + HTTPS |
| **Custo** | Gratuito |

**Como funciona:**
- Usa `navigator.userAgentData.getHighEntropyValues()` no browser
- Requer HTTPS (nao funciona em HTTP)
- Requer headers `Accept-CH` do servidor
- Usuario pode negar permissao

**Dados retornados:**
```typescript
{
  model: "SM-M346B",              // Modelo do device
  platform: "Android",
  platformVersion: "14.0.0",
  architecture: "arm",
  uaFullVersion: "131.0.6778.135"
}
```

**Limitacoes:**
- Chrome no Android: retorna modelo real
- Chrome no iOS: retorna vazio (Apple bloqueia)
- Firefox: nao suporta
- Safari: nao suporta

**Quando usar:** Fallback quando 51Degrees falha

---

### Layer 3: Client Hints - Low Entropy (BASICO)

| Propriedade | Valor |
|-------------|-------|
| **Fonte** | API do navegador (cliente) |
| **Precisao** | Baixa (50-60%) |
| **Disponibilidade** | Navegadores modernos |
| **Custo** | Gratuito |

**Como funciona:**
- Usa `navigator.userAgentData` (sem getHighEntropyValues)
- Sempre disponivel sem permissao do usuario
- Retorna apenas dados basicos

**Dados retornados:**
```typescript
{
  mobile: true,                   // Se e mobile
  platform: "Android",            // SO
  brands: [                       // Navegadores compativeis
    { brand: "Chromium", version: "131" },
    { brand: "Google Chrome", version: "131" }
  ]
}
```

**Limitacoes:**
- NAO retorna modelo do device
- NAO retorna versao do SO
- Apenas confirma se e mobile e qual plataforma

**Quando usar:** Validacao basica (confirmar que e mobile)

---

### Layer 4: User-Agent Parsing (FALLBACK)

| Propriedade | Valor |
|-------------|-------|
| **Fonte** | String User-Agent (cliente) |
| **Precisao** | Variavel (30-80%) |
| **Disponibilidade** | Sempre disponivel |
| **Custo** | Gratuito |

**Como funciona:**
- Faz parse do `navigator.userAgent` com regex
- Extrai modelo diretamente da string (quando disponivel)
- Metodo mais antigo e menos confiavel

**Exemplo de User-Agent:**
```
Mozilla/5.0 (Linux; Android 14; SM-M346B) AppleWebKit/537.36 ...
                              ^^^^^^^^
                              Modelo extraido via regex
```

**Dados retornados:**
```typescript
{
  modelo: "SM-M346B",
  fabricante: "Samsung"
}
```

**Limitacoes:**
- Chrome 110+: User-Agent Reduction (modelo vira "K")
- iOS: nunca mostra modelo do iPhone
- Pode ser falsificado pelo usuario

**Quando usar:** Ultimo recurso quando todas outras falham

---

## Tabela Comparativa

| Camada | Precisao | Disponibilidade | Modelo Device | iOS Suporte | Custo |
|--------|----------|-----------------|---------------|-------------|-------|
| 51Degrees | 95%+ | Alta | Sim | Sim | Pago |
| Client Hints High | 70-85% | Media | Sim* | Nao | Gratis |
| Client Hints Low | 50-60% | Alta | Nao | Parcial | Gratis |
| User-Agent | 30-80% | Total | Variavel | Nao | Gratis |

*Apenas Android com Chrome

---

## Fluxo de Deteccao na Jornada

```
Usuario acessa /credito/device
         |
         v
   [51Degrees API]
         |
    Sucesso? ----Sim----> Retorna dados
         |
        Nao
         |
         v
   [Client Hints High]
         |
    Sucesso? ----Sim----> Retorna dados
         |
        Nao
         |
         v
   [Client Hints Low + User-Agent]
         |
         v
    Retorna melhor resultado disponivel
```

---

## Armazenamento no Supabase

### Tabela: `device_modelo`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `modelo` | TEXT | Modelo detectado (ex: SM-A546E) |
| `fabricante` | TEXT | Fabricante (ex: Samsung) |
| `user_agent` | TEXT | User-Agent completo |
| `detection_source` | TEXT | Camada que detectou* |
| `detection_confidence` | INTEGER | Score de confianca (0-100)* |

*Campos sugeridos para implementacao futura

### Valores de `detection_source`

| Valor | Descricao |
|-------|-----------|
| `51degrees` | Detectado pela API 51Degrees |
| `client_hints_high` | Detectado por Client Hints High Entropy |
| `client_hints_low` | Detectado por Client Hints Low Entropy |
| `user_agent` | Detectado por parsing do User-Agent |
| `manual` | Inserido manualmente |

---

## Configuracao 51Degrees

### Resource Key Atual
```
AQSxfgpJ21OWdCNT3kg
```

### Propriedades Habilitadas
- HardwareVendor
- HardwareModel
- HardwareName
- PlatformVendor
- PlatformName
- PlatformVersion
- BrowserVendor
- BrowserName
- BrowserVersion
- DeviceType
- SetHeaderHardwareAccept-CH
- SetHeaderPlatformAccept-CH
- SetHeaderBrowserAccept-CH

### Propriedades Pagas (nao disponiveis)
- PriceBand (faixa de preco do device)
- ScreenPixelsWidth/Height
- HardwareFamily

### Painel de Configuracao
- URL: https://configure.51degrees.com/AQSxfgpJ21OWdCNT3kg

---

## Headers Accept-CH

Para Client Hints funcionarem, o servidor deve enviar headers:

```
Accept-CH: Sec-CH-UA-Model, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Full-Version-List
```

Configurado em `next.config.ts`.

---

## Paginas Relacionadas

| Pagina | Proposito |
|--------|-----------|
| `/teste-device` | Debug - mostra todas as 4 camadas |
| `/credito/device` | Producao - validacao na jornada |
| `/admin/devices` | Admin - lista devices elegiveis |

---

## Referencias

- [51Degrees Documentation](https://51degrees.com/documentation)
- [Client Hints MDN](https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API)
- [User-Agent Reduction](https://developer.chrome.com/docs/privacy-sandbox/user-agent/)

---

*Ultima atualizacao: 2025-01-14*
