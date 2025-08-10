import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Pie, Line } from 'react-chartjs-2';
import {
  Table, TableHead, TableBody, TableCell, TableRow,
  Container, Typography, CircularProgress, Box, TextField,
  FormControl, InputLabel, Select, MenuItem, TableSortLabel,
  Button, Snackbar, Alert
} from '@mui/material';

import { saveAs } from 'file-saver';
import { utils, write } from 'xlsx';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

function App() {
  const [summary, setSummary] = useState(null);
  const [allocation, setAllocation] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [search, setSearch] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterMarketCap, setFilterMarketCap] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  // Fetch data from backend API
  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      axios.get('http://localhost:4000/api/portfolio/summary'),
      axios.get('http://localhost:4000/api/portfolio/allocation'),
      axios.get('http://localhost:4000/api/portfolio/holdings'),
      axios.get('http://localhost:4000/api/portfolio/performance'),
    ]).then(([s, a, h, p]) => {
      setSummary(s.data);
      setAllocation(a.data);
      setHoldings(h.data);
      setPerformance(p.data);
      setLoading(false);
    }).catch(err => {
      setError('Failed to load data. Please try again.');
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();

    // Polling every 60 seconds for real-time updates
    const intervalId = setInterval(fetchData, 60000);
    return () => clearInterval(intervalId);
  }, []);

  // Alert if any holding gain > 20% or loss < -10%
  useEffect(() => {
    if (holdings && holdings.length > 0) {
      const highGain = holdings.find(h => h.gainLossPercent > 20);
      const highLoss = holdings.find(h => h.gainLossPercent < -10);
      if (highGain) {
        setAlertMsg(`Alert: Holding ${highGain.symbol} gained over 20% (${highGain.gainLossPercent.toFixed(1)}%)`);
        setAlertOpen(true);
      } else if (highLoss) {
        setAlertMsg(`Alert: Holding ${highLoss.symbol} lost over 10% (${highLoss.gainLossPercent.toFixed(1)}%)`);
        setAlertOpen(true);
      } else {
        setAlertOpen(false);
      }
    }
  }, [holdings]);

  // Extract unique sectors and market caps for filter dropdowns
  const sectors = useMemo(() => {
    const setS = new Set(holdings.map(h => h.sector).filter(Boolean));
    return Array.from(setS).sort();
  }, [holdings]);

  const marketCaps = useMemo(() => {
    const setM = new Set(holdings.map(h => h.marketCap).filter(Boolean));
    return Array.from(setM).sort();
  }, [holdings]);

  // Filter holdings by search and filters
  const filteredHoldings = useMemo(() => {
    let filtered = holdings;
    if (filterSector) filtered = filtered.filter(h => h.sector === filterSector);
    if (filterMarketCap) filtered = filtered.filter(h => h.marketCap === filterMarketCap);
    if (search) {
      filtered = filtered.filter(h =>
        h.symbol.toLowerCase().includes(search.toLowerCase()) ||
        h.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    return filtered;
  }, [holdings, filterSector, filterMarketCap, search]);

  // Sorting for holdings table
  const sortedHoldings = useMemo(() => {
    if (!sortConfig.key) return filteredHoldings;

    const sorted = [...filteredHoldings].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredHoldings, sortConfig]);

  // Toggle sorting direction for table columns
  const requestSort = key => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Prepare data for sector allocation pie chart
  const sectorData = allocation ? {
    labels: Object.keys(allocation.bySector),
    datasets: [{
      data: Object.values(allocation.bySector).map(s => s.value),
      backgroundColor: ['#2196F3', '#66BB6A', '#FFB300', '#EF5350', '#AB47BC', '#29B6F6'],
    }],
  } : null;

  // Prepare data for portfolio performance line chart
  const performanceData = performance ? {
    labels: performance.timeline.map(t => t.date),
    datasets: [
      {
        label: 'Portfolio',
        data: performance.timeline.map(t => t.portfolio),
        borderColor: '#1976d2',
        backgroundColor: '#90caf9',
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Nifty 50',
        data: performance.timeline.map(t => t.nifty50),
        borderColor: '#43a047',
        backgroundColor: '#a5d6a7',
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Gold',
        data: performance.timeline.map(t => t.gold),
        borderColor: '#fbc02d',
        backgroundColor: '#fff59d',
        fill: false,
        tension: 0.1,
      }
    ]
  } : null;

  // Export current holdings view to Excel
  const exportToExcel = () => {
    // Prepare worksheet from holdings data (filtered & sorted)
    const exportData = sortedHoldings.map(h => ({
      Symbol: h.symbol,
      Name: h.name,
      Quantity: h.quantity,
      'Current Price ₹': h.currentPrice,
      Value: h.value,
      'Gain/Loss ₹': h.gainLoss,
      'Gain %': h.gainLossPercent,
      Sector: h.sector,
      'Market Cap': h.marketCap
    }));

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Holdings');

    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'portfolio_holdings.xlsx');
  };

  return (
    <Container sx={{ my: 4, px: { xs: 2, sm: 6 } }}>
      <Typography variant="h3" align="center" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        Portfolio Analytics Dashboard
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" align="center">{error}</Typography>
      ) : (
        <>
          {/* Overview Cards */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center', mb: 5 }}>
            {[
              { label: 'Total Value', value: `₹${summary.totalValue.toLocaleString()}`, color: 'primary.main' },
              {
                label: 'Total Gain/Loss',
                value: `₹${summary.totalGainLoss.toLocaleString()} (${summary.totalGainLossPercent.toFixed(2)}%)`,
                color: summary.totalGainLoss > 0 ? 'green' : 'red'
              },
              { label: 'Holdings', value: `${holdings.length} Stocks`, color: 'text.primary' }
            ].map(({ label, value, color }) => (
              <Box
                key={label}
                sx={{
                  bgcolor: '#f5f5f5',
                  p: 3,
                  borderRadius: 3,
                  width: 250,
                  textAlign: 'center',
                  boxShadow: 1,
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  cursor: 'default',
                  '&:hover': { boxShadow: 6, transform: 'scale(1.05)' }
                }}
              >
                <Typography variant="subtitle1" color="text.secondary" fontWeight="bold">{label}</Typography>
                <Typography variant="h5" color={color} sx={{ mt: 1 }}>{value}</Typography>
              </Box>
            ))}
          </Box>

          {/* Filters and Export Button */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
            <TextField
              size="small"
              label="Search Stock"
              variant="outlined"
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ minWidth: 220 }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Sector</InputLabel>
              <Select
                label="Sector"
                value={filterSector}
                onChange={e => setFilterSector(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {sectors.map(sec => (
                  <MenuItem key={sec} value={sec}>{sec}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Market Cap</InputLabel>
              <Select
                label="Market Cap"
                value={filterMarketCap}
                onChange={e => setFilterMarketCap(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {marketCaps.map(mcap => (
                  <MenuItem key={mcap} value={mcap}>{mcap}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" onClick={exportToExcel} sx={{ whiteSpace: 'nowrap' }}>
              Export Holdings
            </Button>
          </Box>

          {/* Sector Allocation Pie Chart */}
          <Box sx={{ maxWidth: 480, margin: 'auto', mb: 5 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Sector Allocation
            </Typography>
            {sectorData ? <Pie data={sectorData} /> : <Typography>No sector data</Typography>}
          </Box>

          {/* Holdings Table */}
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 750 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f0f0f0' }}>
                  {[
                    { id: 'symbol', label: 'Symbol' },
                    { id: 'name', label: 'Name' },
                    { id: 'quantity', label: 'Qty', numeric: true },
                    { id: 'currentPrice', label: 'Current ₹', numeric: true },
                    { id: 'value', label: 'Value', numeric: true },
                    { id: 'gainLoss', label: 'Gain/Loss', numeric: true },
                    { id: 'gainLossPercent', label: 'Gain%', numeric: true },
                  ].map(({ id, label, numeric }) => (
                    <TableCell
                      key={id}
                      align={numeric ? 'right' : 'left'}
                      sortDirection={sortConfig.key === id ? sortConfig.direction : false}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => requestSort(id)}
                    >
                      <TableSortLabel
                        active={sortConfig.key === id}
                        direction={sortConfig.key === id ? sortConfig.direction : 'asc'}
                      >
                        {label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedHoldings.map(h => (
                  <TableRow
                    key={h.symbol}
                    sx={{
                      bgcolor: h.gainLoss > 0 ? '#e8f8e5' : '#fee',
                      cursor: 'default',
                      transition: 'background-color 0.3s',
                      '&:hover': {
                        bgcolor: h.gainLoss > 0 ? '#d0ebb6' : '#f9c0c0',
                      }
                    }}
                  >
                    <TableCell>{h.symbol}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell align="right">{h.quantity}</TableCell>
                    <TableCell align="right">{h.currentPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">{h.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell align="right" sx={{ color: h.gainLoss > 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                      {h.gainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right" sx={{ color: h.gainLoss > 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                      {h.gainLossPercent.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
                {sortedHoldings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      No holdings found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          {/* Performance Comparison Chart */}
          <Box sx={{ maxWidth: 800, margin: '40px auto' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Performance Comparison (Portfolio vs Nifty 50 vs Gold)
            </Typography>
            {performanceData ? (
              <Line
                data={performanceData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    tooltip: {
                      mode: 'index',
                      intersect: false,
                    }
                  },
                  interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                  },
                  scales: {
                    y: {
                      beginAtZero: false,
                    }
                  }
                }}
              />
            ) : (
              <Typography>No performance data</Typography>
            )}

            {/* Returns Summary */}
            {performance && (
              <Box sx={{
                display: 'flex', justifyContent: 'space-around', mt: 3,
                flexWrap: 'wrap', gap: 2, textAlign: 'center'
              }}>
                {['1month', '3months', '1year'].map(period => (
                  <Box key={period} sx={{
                    border: '1px solid #ddd',
                    borderRadius: 2,
                    p: 2,
                    minWidth: 100,
                    boxShadow: 1,
                  }}>
                    <Typography fontWeight="bold" textTransform="capitalize">{period}</Typography>
                    <Typography color="primary">Portfolio: {performance.returns.portfolio[period]}%</Typography>
                    <Typography color="success.main">Nifty 50: {performance.returns.nifty50[period]}%</Typography>
                    <Typography color="warning.main">Gold: {performance.returns.gold[period]}%</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Top & Worst Performers */}
          <Box sx={{ mt: 6, textAlign: 'center' }}>
            <Typography variant="subtitle1" fontWeight="bold" color="success.main">
              Top Performer: {summary.topPerformer.name} ({summary.topPerformer.symbol}) {summary.topPerformer.gainPercent.toFixed(2)}%
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold" color="error.main" sx={{ mt: 1 }}>
              Worst Performer: {summary.worstPerformer.name} ({summary.worstPerformer.symbol}) {summary.worstPerformer.gainPercent.toFixed(2)}%
            </Typography>
            <Typography variant="body2" sx={{ mt: 3 }}>
              Diversification Score: <strong>{summary.diversificationScore}</strong> | Risk Level: <strong>{summary.riskLevel}</strong>
            </Typography>
          </Box>

          {/* Notification Snackbar */}
          <Snackbar
            open={alertOpen}
            autoHideDuration={8000}
            onClose={() => setAlertOpen(false)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert onClose={() => setAlertOpen(false)} severity="info" variant="filled" sx={{ width: '100%' }}>
              {alertMsg}
            </Alert>
          </Snackbar>
        </>
      )}
    </Container>
  );
}

export default App;
