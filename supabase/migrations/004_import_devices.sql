-- ============================================================================
-- IMPORTAÇÃO DE DISPOSITIVOS DO CSV
-- ============================================================================
-- Este script recria a tabela eligible_devices com a estrutura do CSV
-- e importa os dados de "de_para devices.csv"
-- ============================================================================

-- Recriar tabela com estrutura adequada ao CSV
DROP TABLE IF EXISTS public.eligible_devices CASCADE;

CREATE TABLE public.eligible_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo text NOT NULL UNIQUE,
  fabricante text NOT NULL,
  nome_comercial text,
  valor_minimo numeric(10,2),
  valor_maximo numeric(10,2),
  valor_medio numeric(10,2),
  valor_aprovado integer,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_eligible_devices_modelo ON public.eligible_devices(modelo);
CREATE INDEX idx_eligible_devices_fabricante ON public.eligible_devices(fabricante);
CREATE INDEX idx_eligible_devices_ativo ON public.eligible_devices(ativo) WHERE ativo = true;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_eligible_devices_updated_at ON public.eligible_devices;
CREATE TRIGGER trigger_eligible_devices_updated_at
  BEFORE UPDATE ON public.eligible_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.eligible_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read" ON public.eligible_devices;
CREATE POLICY "Public read" ON public.eligible_devices
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role write" ON public.eligible_devices;
CREATE POLICY "Service role write" ON public.eligible_devices
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Comentário
COMMENT ON TABLE public.eligible_devices IS 'Dispositivos elegíveis para crédito - importados do CSV de_para devices.csv';

-- ============================================================================
-- INSERÇÃO DE DADOS
-- Dados extraídos do CSV "de_para devices.csv"
-- ============================================================================

INSERT INTO public.eligible_devices (modelo, fabricante, nome_comercial, valor_minimo, valor_maximo, valor_medio, valor_aprovado) VALUES
-- Samsung Galaxy S Series
('SM-S911B', 'samsung', 'Samsung Galaxy S23', 700, 800, 757.14, 600),
('SM-S916B', 'samsung', 'Samsung Galaxy S23+', 700, 700, 700, 700),
('SM-S918B', 'samsung', 'Samsung Galaxy S23 Ultra', 900, 900, 900, 800),
('SM-S921B', 'samsung', 'Samsung Galaxy S24', 800, 1000, 900, 700),
('SM-S926B', 'samsung', 'Samsung Galaxy S24 Plus', 800, 900, 850, 800),
('SM-S928B', 'samsung', 'Samsung Galaxy S24 Ultra', 1000, 1000, 1000, 900),
('SM-S931B', 'samsung', 'Samsung Galaxy S25', 900, 900, 900, 900),
('SM-S901E', 'samsung', 'Samsung Galaxy S22', 600, 800, 650, 500),
('SM-S906E', 'samsung', 'Samsung Galaxy S22 Plus', 600, 600, 600, 600),
('SM-S908E', 'samsung', 'Samsung Galaxy S22 Ultra', 800, 1200, 933.33, 600),
('SM-S711B', 'samsung', 'Samsung Galaxy S23 FE', 600, 800, 662.50, 500),
('SM-S721B', 'samsung', 'Samsung Galaxy S24 FE', 700, 800, 733.33, 600),

-- Samsung Galaxy A Series
('SM-A546E', 'samsung', 'Samsung Galaxy A54 5G', 400, 600, 500, 500),
('SM-A556E', 'samsung', 'Samsung Galaxy A55 5G', 400, 500, 470.59, 500),
('SM-A566E', 'samsung', 'Samsung Galaxy A56 5G', 400, 600, 507.14, 500),
('SM-A356E', 'samsung', 'Samsung Galaxy A35', 500, 600, 573.33, 500),
('SM-A366E', 'samsung', 'Samsung Galaxy A36', 50, 600, 333, 600),
('SM-A346M', 'samsung', 'Samsung Galaxy A34', 400, 700, 529.17, 400),
('SM-A336M', 'samsung', 'Samsung Galaxy A33', 400, 500, 466.67, 400),
('SM-A256E', 'samsung', 'Samsung Galaxy A25', 400, 400, 400, 400),
('SM-A266M', 'samsung', 'Samsung Galaxy A26', 400, 500, 416.67, 400),
('SM-A245M', 'samsung', 'Samsung Galaxy A24', 400, 400, 400, 400),
('SM-A236M', 'samsung', 'Samsung Galaxy A23 5G', 400, 500, 406.25, 400),
('SM-A235M', 'samsung', 'Samsung Galaxy A23', 400, 400, 400, 400),
('SM-A226BR', 'samsung', 'Samsung Galaxy A22 5G', 400, 400, 400, 400),
('SM-A166M', 'samsung', 'Samsung Galaxy A16 5G', 400, 400, 400, 400),
('SM-A536E', 'samsung', 'Samsung Galaxy A53 5G', 400, 500, 487.50, 500),
('SM-A528B', 'samsung', 'Samsung Galaxy A52 5G', 400, 600, 440, 500),
('SM-A525M', 'samsung', 'Samsung Galaxy A52 4G', 400, 400, 400, 400),
('SM-A515F', 'samsung', 'Samsung Galaxy A51', 400, 500, 411.11, 400),
('SM-A715F', 'samsung', 'Samsung Galaxy A71 4G', 400, 500, 405.88, 400),
('SM-A725M', 'samsung', 'Samsung Galaxy A72 4G', 400, 600, 566.67, 400),
('SM-A736B', 'samsung', 'Samsung Galaxy A73 4G', 500, 500, 500, 500),

-- Samsung Galaxy M Series
('SM-M556B', 'samsung', 'Samsung Galaxy M55 5G', 500, 600, 550, 500),
('SM-M546B', 'samsung', 'Samsung Galaxy M54 5G', 400, 500, 450, 500),
('SM-M536B', 'samsung', 'Samsung Galaxy M53 5G', 400, 600, 492.31, 500),
('SM-M526B', 'samsung', 'Samsung Galaxy M52', 400, 500, 445.45, 400),
('SM-M356B', 'samsung', 'Samsung Galaxy M35 5G', 400, 500, 450, 500),
('SM-M346B', 'samsung', 'Samsung Galaxy M34 5G', 30, 400, 266, 400),
('SM-M236B', 'samsung', 'Samsung Galaxy M23 5G', 400, 400, 400, 400),
('SM-M156B', 'samsung', 'Samsung Galaxy M15 5G', 400, 400, 400, 400),
('SM-M146B', 'samsung', 'Samsung Galaxy M14 5G', 400, 500, 433.33, 400),
('SM-M625F', 'samsung', 'Samsung Galaxy M62', 400, 400, 400, 400),

-- Samsung Galaxy Z Series
('SM-F721B', 'samsung', 'Samsung Galaxy Z Flip 4', 600, 600, 600, 400),
('SM-F741B', 'samsung', 'Samsung Galaxy Z Flip 6', 1000, 1000, 1000, 500),

-- Samsung Galaxy S20/S21 Series
('SM-G780G', 'samsung', 'Samsung Galaxy S20 FE', 400, 500, 418.18, 400),
('SM-G780F', 'samsung', 'Samsung Galaxy S20 FE', 400, 400, 400, 400),
('SM-G781B', 'samsung', 'Samsung Galaxy S20 FE 5G', 400, 500, 418.75, 500),
('SM-G980F', 'samsung', 'Samsung Galaxy S20', 400, 500, 416.67, 400),
('SM-G985F', 'samsung', 'Samsung Galaxy S20 Plus 5G', 400, 600, 450, 500),
('SM-G990E', 'samsung', 'Samsung Galaxy S21 FE', 400, 700, 487.50, 400),
('SM-G990B2', 'samsung', 'Samsung Galaxy S21 FE', 600, 600, 600, 400),
('SM-G991B', 'samsung', 'Samsung Galaxy S21', 500, 700, 571.43, 500),
('SM-G996B', 'samsung', 'Samsung Galaxy S21 Plus', 500, 700, 600, 500),
('SM-G998B', 'samsung', 'Samsung Galaxy S21 Ultra', 600, 600, 600, 600),

-- Samsung Note Series
('SM-N986B', 'samsung', 'Samsung Galaxy Note 20 Ultra', 400, 700, 600, 600),
('SM-N981B', 'samsung', 'Samsung Galaxy Note 20 5G', 400, 400, 400, 400),
('SM-N770F', 'samsung', 'Samsung Galaxy Note 10 Lite', 400, 400, 400, 400),

-- Motorola Moto G Series
('moto g54 5G', 'motorola', 'moto g54 5G', 400, 500, 419.70, 400),
('moto g55 5G', 'motorola', 'moto g55 5G', 400, 500, 450, 400),
('moto g56 5G', 'motorola', 'moto g56 5G', 400, 500, 483.33, 400),
('moto g53 5G', 'motorola', 'moto g53 5G', 400, 500, 418.92, 400),
('moto g73 5G', 'motorola', 'moto g73 5G', 500, 600, 514.29, 400),
('moto g75 5G', 'motorola', 'moto g75 5G', 400, 600, 504.35, 500),
('moto g71 5G', 'motorola', 'moto g71 5G', 400, 400, 400, 400),
('moto g82 5G', 'motorola', 'moto g82 5G', 400, 400, 400, 400),
('moto g84 5G', 'motorola', 'moto g84 5G', 400, 600, 532.56, 500),

-- Motorola Edge Series
('motorola edge 40 neo', 'motorola', 'motorola edge 40 neo', 400, 800, 600, 600),
('motorola edge 40', 'motorola', 'motorola edge 40', 500, 500, 500, 500),
('motorola edge 50 fusion', 'motorola', 'motorola edge 50 fusion', 500, 900, 664.29, 600),
('motorola edge 50 neo', 'motorola', 'motorola edge 50 neo', 500, 900, 666.67, 600),
('motorola edge 60 fusion', 'motorola', 'motorola edge 60 fusion', 600, 700, 662.50, 600),
('motorola edge 30', 'motorola', 'motorola edge 30', 400, 700, 533.33, 400),
('motorola edge 30 fusion', 'motorola', 'motorola edge 30 fusion', 400, 600, 450, 500),
('motorola edge 30 neo', 'motorola', 'motorola edge 30 neo', 400, 600, 457.14, 400),
('motorola edge 30 pro', 'motorola', 'motorola edge 30 pro', 500, 500, 500, 500),
('motorola edge 20', 'motorola', 'motorola edge 20', 400, 400, 400, 400),
('motorola edge 20 pro', 'motorola', 'motorola edge 20 pro', 400, 600, 500, 500),

-- Xiaomi Redmi Note Series
('23117RA68G', 'Xiaomi', 'Redmi Note 13 Pro', 400, 600, 500, 500),
('2312DRA50G', 'Xiaomi', 'Redmi Note 13 Pro', 400, 500, 487.50, 500),
('22101316G', 'Xiaomi', 'Redmi Note 12 Pro', 400, 400, 400, 400),
('22101316UG', 'Xiaomi', 'Note 12 Pro Plus', 400, 400, 400, 400),
('2312DRAABG', 'Xiaomi', 'Redmi Note 13 5G', 400, 500, 433.33, 400),
('23129RA5FL', 'Xiaomi', 'Redmi Note 13', 100, 500, 392.31, 400),
('23129RAA4G', 'Xiaomi', 'Redmi Note 13 4G', 400, 400, 400, 400),
('23124RA7EO', 'Xiaomi', 'Redmi Note 13 4G', 400, 400, 400, 400),
('24090RA29G', 'Xiaomi', 'Redmi Note 14 Pro 5G', 500, 600, 550, 500),
('24094RAD4G', 'Xiaomi', 'Redmi Note 14 5G', 600, 600, 600, 500),
('24115RA8EG', 'Xiaomi', 'Redmi Note 14 Pro Plus 5G', 600, 600, 600, 600),
('24116RACCG', 'Xiaomi', 'Redmi Note 14 Pro', 400, 600, 500, 500),
('24117RN76G', 'Xiaomi', 'Redmi Note 14', 400, 500, 450, 500),
('24117RN76L', 'Xiaomi', 'Redmi Note 14', 400, 3000, 575.86, 500),

-- Xiaomi POCO Series
('2311DRK48G', 'Xiaomi', 'Poco X6 Pro', 500, 700, 578.57, 600),
('2311DRK48I', 'Xiaomi', 'Poco X6 Pro', 600, 600, 600, 600),
('23122PCD1G', 'Xiaomi', 'Poco X6', 400, 500, 483.33, 500),
('24095PCADG', 'Xiaomi', 'Poco X7', 600, 600, 600, 600),
('2412DPC0AG', 'Xiaomi', 'Poco X7 Pro', 500, 700, 583.33, 600),
('22101320G', 'Xiaomi', 'Poco X5 Pro', 500, 600, 516.67, 500),
('22111317PG', 'Xiaomi', 'Poco X5', 400, 500, 450, 400),
('22111317PI', 'Xiaomi', 'Poco X5', 400, 500, 450, 400),
('23049PCD8G', 'Xiaomi', 'Poco F5', 600, 700, 650, 500),
('23013PC75G', 'Xiaomi', 'Poco F5 Pro', 100, 100, 100, 600),
('M2012K11AG', 'Xiaomi', 'Poco F7 Pro', 400, 400, 400, 600),
('2207117BPG', 'Xiaomi', 'Poco M5s', 400, 500, 420, 500),
('2312FPCA6G', 'Xiaomi', 'Poco M6 Pro', 400, 500, 425, 400),
('2404APC5FG', 'Xiaomi', 'POCO M6 4G', 400, 400, 400, 400),
('2409FPCC4G', 'Xiaomi', 'Poco M7 Pro 5G', 500, 500, 500, 500),
('2201116PG', 'Xiaomi', 'Poco X4 Pro', 400, 500, 420, 400),
('2201117PG', 'Xiaomi', 'Poco M4 Pro', 400, 600, 475, 400),
('M2102J20SG', 'Xiaomi', 'Poco X3 Pro', 400, 400, 400, 400),

-- Realme Series
('RMX5051', 'realme', 'Realme 14 Pro Plus', 600, 700, 666.67, 700)
ON CONFLICT (modelo) DO UPDATE SET
  valor_aprovado = EXCLUDED.valor_aprovado,
  updated_at = now();

-- ============================================================================
-- FIM DA IMPORTAÇÃO
-- ============================================================================
