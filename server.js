// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const BANXICO_TOKEN = process.env.BANXICO_TOKEN;

// Middleware
app.use(cors());
app.use(express.json());

// URL base de Banxico
const BANXICO_BASE_URL = 'https://www.banxico.org.mx/SieAPIRest/service/v1';

// ============================================
// ENDPOINT 1: Obtener tipo de cambio actual
// ============================================
app.get('/api/tipo-cambio/actual', async (req, res) => {
  try {
    const url = `${BANXICO_BASE_URL}/series/SF43718/datos/oportuno?token=${BANXICO_TOKEN}`;
    const response = await axios.get(url);

    const serie = response.data.bmx.series[0];
    const dato = serie.datos[0];

    res.json({
      success: true,
      data: {
        serie: serie.idSerie,
        titulo: serie.titulo,
        fecha: dato.fecha,
        valor: parseFloat(dato.dato),
        unidad: 'MXN/USD'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al consultar Banxico',
      message: error.message
    });
  }
});

// ============================================
// ENDPOINT 2: Obtener histórico por fechas
// ============================================
app.get('/api/tipo-cambio/historico', async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren los parámetros fechaInicio y fechaFin',
        ejemplo: '/api/tipo-cambio/historico?fechaInicio=2024-01-01&fechaFin=2024-12-31'
      });
    }

    const url = `${BANXICO_BASE_URL}/series/SF43718/datos/${fechaInicio}/${fechaFin}?token=${BANXICO_TOKEN}`;
    const response = await axios.get(url);

    const serie = response.data.bmx.series[0];
    const datos = serie.datos.map(d => ({
      fecha: d.fecha,
      valor: parseFloat(d.dato)
    }));

    res.json({
      success: true,
      data: {
        serie: serie.idSerie,
        titulo: serie.titulo,
        fechaInicio,
        fechaFin,
        totalRegistros: datos.length,
        datos: datos
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al consultar Banxico',
      message: error.message
    });
  }
});

// ============================================
// ENDPOINT 3: Obtener tipo de cambio de fecha específica
// ============================================
app.get('/api/tipo-cambio/fecha/:fecha', async (req, res) => {
  try {
    const { fecha } = req.params;
    const url = `${BANXICO_BASE_URL}/series/SF43718/datos/${fecha}/${fecha}?token=${BANXICO_TOKEN}`;
    const response = await axios.get(url);

    const serie = response.data.bmx.series[0];

    if (!serie.datos || serie.datos.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No hay datos para la fecha especificada',
        fecha: fecha
      });
    }

    const dato = serie.datos[0];

    res.json({
      success: true,
      data: {
        fecha: dato.fecha,
        valor: parseFloat(dato.dato),
        unidad: 'MXN/USD'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al consultar Banxico',
      message: error.message
    });
  }
});

// ============================================
// ENDPOINT 4: Health check
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Banxico API Proxy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// ENDPOINT 5: Documentación
// ============================================
app.get('/', (req, res) => {
  res.json({
    servicio: 'API de Tipo de Cambio - Banxico',
    version: '1.0.0',
    endpoints: [
      {
        metodo: 'GET',
        ruta: '/api/tipo-cambio/actual',
        descripcion: 'Obtiene el tipo de cambio más reciente'
      },
      {
        metodo: 'GET',
        ruta: '/api/tipo-cambio/historico',
        descripcion: 'Obtiene histórico por rango de fechas',
        parametros: ['fechaInicio (YYYY-MM-DD)', 'fechaFin (YYYY-MM-DD)']
      },
      {
        metodo: 'GET',
        ruta: '/api/tipo-cambio/fecha/:fecha',
        descripcion: 'Obtiene tipo de cambio de una fecha específica',
        ejemplo: '/api/tipo-cambio/fecha/2024-01-15'
      },
      {
        metodo: 'GET',
        ruta: '/api/health',
        descripcion: 'Verifica el estado del servicio'
      }
    ],
    fuente: 'Banco de México (Banxico) - Serie SF43718'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Documentación disponible en http://localhost:${PORT}`);
  console.log(`✅ Token configurado: ${BANXICO_TOKEN ? 'SÍ' : 'NO'}`);
});