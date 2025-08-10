const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
const PORT = 4000;

// Enable CORS for frontend access
app.use(cors());

// Load Excel
const workbook = XLSX.readFile(
  path.join(__dirname, 'Sample-Portfolio-Dataset-for-Assignment.xlsx')
);

// ---- Parse Holdings ----
const holdingsSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Holdings'], { defval: '' });
const holdings = holdingsSheet.map(h => ({
  symbol: h.Symbol,
  name: h['Company Name'],
  quantity: Number(h.Quantity),
  avgPrice: Number(h['Avg Price ₹']),
  currentPrice: Number(h['Current Price (₹)']),
  sector: h.Sector,
  marketCap: h['Market Cap'],
  exchange: h.Exchange,
  value: Number(h['Value ₹']),
  gainLoss: Number(h['Gain/Loss (₹)']),
  gainLossPercent: Number(h['Gain/Loss %']) * 100 // convert decimal to %
}));

// ---- Parse Allocation ----
const sectorSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Sector_Allocation'], { defval: '' });
const bySector = {};
sectorSheet.forEach(row => {
  bySector[row.Sector] = {
    value: Number(row['Value (₹)']),
    percentage: Number(row.Percentage) * 100
  };
});

const capSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Market_Cap'], { defval: '' });
const byMarketCap = {};
capSheet.forEach(row => {
  const rawValue = row['Value (₹)'];
  const numericValue = typeof rawValue === 'string'
    ? Number(rawValue.replace(/,/g, ''))
    : Number(rawValue);
  byMarketCap[row['Market Cap']] = {
    value: numericValue,
    percentage: Number(row.Percentage) * 100
  };
});

// ---- Parse Performance ----
const perfSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Historical_Performance'], { defval: '' });
const timeline = perfSheet.map(r => ({
  date: r.Date,
  portfolio: Number(r['Portfolio Value (₹)']),
  nifty50: Number(r['Nifty 50']),
  gold: Number(r['Gold (₹/10g)'])
}));
function calcReturn(curr, prev) {
  return ((curr - prev) / prev * 100).toFixed(2);
}
const n = timeline.length;
const returns = {
  portfolio: {
    '1month': calcReturn(timeline[n-1].portfolio, timeline[n-2].portfolio),
    '3months': calcReturn(timeline[n-1].portfolio, timeline[n-4].portfolio),
    '1year': calcReturn(timeline[n-1].portfolio, timeline[0].portfolio)
  },
  nifty50: {
    '1month': calcReturn(timeline[n-1].nifty50, timeline[n-2].nifty50),
    '3months': calcReturn(timeline[n-1].nifty50, timeline[n-4].nifty50),
    '1year': calcReturn(timeline[n-1].nifty50, timeline[0].nifty50)
  },
  gold: {
    '1month': calcReturn(timeline[n-1].gold, timeline[n-2].gold),
    '3months': calcReturn(timeline[n-1].gold, timeline[n-4].gold),
    '1year': calcReturn(timeline[n-1].gold, timeline[0].gold)
  }
};

// ---- Parse Summary ----
const summarySheet = XLSX.utils.sheet_to_json(workbook.Sheets['Summary'], { defval: '' });
const summary = {
  totalValue: Number(summarySheet.find(x => x.Metric === 'Total Portfolio Value').Value.replace(/,/g,'')),
  totalInvested: Number(summarySheet.find(x => x.Metric === 'Total Invested Amount').Value.replace(/,/g,'')),
  totalGainLoss: Number(summarySheet.find(x => x.Metric === 'Total Gain/Loss').Value.replace(/,/g,'')),
  totalGainLossPercent: Number(summarySheet.find(x => x.Metric === 'Total Gain/Loss %').Value) * 100,
  numberOfHoldings: Number(summarySheet.find(x => x.Metric === 'Number of Holdings').Value),
  diversificationScore: summarySheet.find(x => x.Metric === 'Diversification Score').Value,
  riskLevel: summarySheet.find(x => x.Metric === 'Risk Level').Value
};

// Top performers
const topSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Top_Performers'], { defval: '' });
const topPerformer = {
  symbol: topSheet.find(x => x.Metric === 'Best Performer').Symbol,
  name: topSheet.find(x => x.Metric === 'Best Performer')['Company Name'],
  gainPercent: Number(topSheet.find(x => x.Metric === 'Best Performer').Performance) * 100
};
const worstPerformer = {
  symbol: topSheet.find(x => x.Metric === 'Worst Performer').Symbol,
  name: topSheet.find(x => x.Metric === 'Worst Performer')['Company Name'],
  gainPercent: Number(topSheet.find(x => x.Metric === 'Worst Performer').Performance) * 100
};

// --- API Endpoints ---
app.get('/api/portfolio/holdings', (req, res) => res.json(holdings));
app.get('/api/portfolio/allocation', (req, res) => res.json({ bySector, byMarketCap }));
app.get('/api/portfolio/performance', (req, res) => res.json({ timeline, returns }));
app.get('/api/portfolio/summary', (req, res) =>
  res.json({ ...summary, topPerformer, worstPerformer })
);

// Fallback for unknown endpoints
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));

app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));


