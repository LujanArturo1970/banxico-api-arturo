// server.js - CÓDIGO MEJORADO CON CONSULTA POR FECHA
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BANXICO_TOKEN = process.env.BANXICO_TOKEN;
const BASE_URL = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series';

app.use(cors());
app.use(express.json());
app.use(express.static('Public'));

// SERIES: Dólar (SF43718), Euro (SF46410), UDI (SF60653)
const SERIES_IDS = 'SF43718,SF46410,SF60653';

// Helper para parsear y formatear la respuesta de Banxico
function parsearSeries(series) {
  return series.map(serie => {
    const tieneDatos = serie.datos && serie.datos.length > 0;
    return {
      id: serie.idSerie,
      titulo: serie.titulo,
      datos: tieneDatos
        ? serie.datos.map(d => ({
            fecha: d.fecha,
            valor: d.dato === 'N/E' ? null : parseFloat(d.dato)
          }))
        : []
    };
  });
}

// ─── RUTA 1: Valor más reciente (oportuno) ───────────────────────────────────
app.get('/api/tipo-cambio/actual', async (req, res) => {
  try {
    const url = `${BASE_URL}/${SERIES_IDS}/datos/oportuno?token=${BANXICO_TOKEN}`;
    const response = await axios.get(url);
    const resultados = parsearSeries(response.data.bmx.series).map(s => ({
      id: s.id,
      titulo: s.titulo,
      fecha: s.datos[0]?.fecha ?? 'N/A',
      valor: s.datos[0]?.valor ?? 0
    }));
    res.json({ success: true, data: resultados });
  } catch (error) {
    console.error('Error Banxico /actual:', error.message);
    res.status(500).json({ success: false, error: 'Error al consultar Banxico' });
  }
});

// ─── RUTA 2: Por fecha específica ────────────────────────────────────────────
// GET /api/tipo-cambio/fecha?fecha=2024-01-15
app.get('/api/tipo-cambio/fecha', async (req, res) => {
  const { fecha } = req.query;

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({
      success: false,
      error: 'Parámetro "fecha" requerido en formato YYYY-MM-DD'
    });
  }

  // Banxico espera formato DD/MM/YYYY en la URL
  const [anio, mes, dia] = fecha.split('-');
  const fechaBanxico = `${dia}/${mes}/${anio}`;

  try {
    const url = `${BASE_URL}/${SERIES_IDS}/datos/${fechaBanxico}/${fechaBanxico}?token=${BANXICO_TOKEN}`;
    const response = await axios.get(url);
    const series = parsearSeries(response.data.bmx.series);
    const resultados = series.map(s => ({
      id: s.id,
      titulo: s.titulo,
      fecha: s.datos[0]?.fecha ?? fecha,
      valor: s.datos[0]?.valor ?? null
    }));
    res.json({ success: true, data: resultados, fechaConsultada: fecha });
  } catch (error) {
    console.error('Error Banxico /fecha:', error.message);
    res.status(500).json({ success: false, error: 'Error al consultar Banxico' });
  }
});

// ─── RUTA 3: Rango de fechas ─────────────────────────────────────────────────
// GET /api/tipo-cambio/rango?inicio=2024-01-01&fin=2024-01-31
app.get('/api/tipo-cambio/rango', async (req, res) => {
  const { inicio, fin } = req.query;
  const regexFecha = /^\d{4}-\d{2}-\d{2}$/;

  if (!inicio || !fin || !regexFecha.test(inicio) || !regexFecha.test(fin)) {
    return res.status(400).json({
      success: false,
      error: 'Parámetros "inicio" y "fin" requeridos en formato YYYY-MM-DD'
    });
  }

  if (new Date(inicio) > new Date(fin)) {
    return res.status(400).json({
      success: false,
      error: '"inicio" no puede ser mayor que "fin"'
    });
  }

  // Convertir a formato Banxico DD/MM/YYYY
  const toBanxico = iso => {
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  };

  try {
    const url = `${BASE_URL}/${SERIES_IDS}/datos/${toBanxico(inicio)}/${toBanxico(fin)}?token=${BANXICO_TOKEN}`;
    const response = await axios.get(url);
    const resultados = parsearSeries(response.data.bmx.series);
    res.json({ success: true, data: resultados, rango: { inicio, fin } });
  } catch (error) {
    console.error('Error Banxico /rango:', error.message);
    res.status(500).json({ success: false, error: 'Error al consultar Banxico' });
  }
});

// ─── Servir frontend ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'tablero.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
  console.log(`✅ Token cargado: ${BANXICO_TOKEN ? 'SÍ' : 'NO'}`);
  console.log(`\nRutas disponibles:`);
  console.log(`  GET /api/tipo-cambio/actual`);
  console.log(`  GET /api/tipo-cambio/fecha?fecha=YYYY-MM-DD`);
  console.log(`  GET /api/tipo-cambio/rango?inicio=YYYY-MM-DD&fin=YYYY-MM-DD`);
});

