import { useState } from 'react';
import './App.css';
import { Line } from 'react-chartjs-2';
import LanguageSelector from './components/LanguageSelector';
import { translations } from './i18n/translations';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_KEY = 'NUdtIyTuLKzr5e33V0XOxJOKvy2sKuIQ';
function App() {
  const [symbol, setSymbol] = useState('');
  const [chartData, setChartData] = useState(null);
  const [chartOptions, setChartOptions] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [dividendRecords, setDividendRecords] = useState([]);
  const [language, setLanguage] = useState('zh');
  const [hasData, setHasData] = useState(false);
  const [splitInfo, setSplitInfo] = useState(null);
  const t = translations[language];

  const fetchData = async () => {
    if (!symbol) {
      setError(t.pleaseEnterSymbol);
      return;
    }

    setLoading(true);
    setError('');
    setChartData(null);
    setHasData(false);

    try {
      console.log('正在获取股息数据...');
      const dividendResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${symbol}?apikey=${API_KEY}`
      );
      
      if (!dividendResponse.ok) {
        throw new Error(`API请求失败: ${dividendResponse.status}`);
      }

      const dividendData = await dividendResponse.json();
      console.log('收到的股息数据:', dividendData);

      if (!dividendData.historical || dividendData.historical.length === 0) {
        setError(t.noData);
        setLoading(false);
        return;
      }

      // 获取公司信息
      const profileResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${API_KEY}`
      );
      const profileData = await profileResponse.json();
      
      if (Array.isArray(profileData) && profileData.length > 0) {
        setCompanyName(profileData[0].companyName);
      }

      // 处理最近5年的股息数据
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      const filteredData = dividendData.historical
        .filter(item => new Date(item.date) >= fiveYearsAgo)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      console.log('过滤后的数据:', filteredData);

      if (filteredData.length === 0) {
        setError(t.noRecentData);
        setLoading(false);
        return;
      }

      // 设置表格数据
      setDividendRecords(filteredData);

      // 图表数据保持升序排列
      const chartFilteredData = [...filteredData].reverse();
      
      // 计算股息的最大值和最小值
      const dividendValues = chartFilteredData.map(item => item.adjDividend);
      const maxDividend = Math.max(...dividendValues);
      const minDividend = Math.min(...dividendValues);
      
      // 计算数据范围
      const dividendRange = maxDividend - minDividend;
      
      // 调整上下边界的padding比例
      const topPadding = dividendRange * 0.2;    // 上部留20%空间
      const bottomPadding = dividendRange * 0.4;  // 下部留40%空间
      
      // 计算Y轴的最小值和最大值
      const yAxisMin = Math.max(0, minDividend - bottomPadding);  // 确保最小值不小于0
      const yAxisMax = maxDividend + topPadding;

      const chartData = {
        labels: chartFilteredData.map(item => {
          const date = new Date(item.date);
          return date.toLocaleDateString('zh-CN');
        }),
        datasets: [
          {
            label: '调整后股息 ($)',
            data: dividendValues,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            tension: 0.1,
            pointRadius: 5,
            pointHoverRadius: 7,
          }
        ]
      };

      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false, // 允许自定义高度
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: {
                family: "'Microsoft YaHei', sans-serif"
              }
            }
          },
          title: {
            display: true,
            text: companyName ? `${companyName} (${symbol}) ${t.dividendHistory}` : t.dividendHistory,
            font: {
              family: "'Microsoft YaHei', sans-serif",
              size: 16
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${t.adjustedDividend}: $${context.parsed.y.toFixed(4)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            min: yAxisMin,
            max: yAxisMax,
            title: {
              display: true,
              text: t.adjustedDividend,
              font: {
                family: "'Microsoft YaHei', sans-serif"
              }
            },
            ticks: {
              callback: function(value) {
                return '$' + value.toFixed(4);
              }
            }
          },
          x: {
            title: {
              display: true,
              text: t.date,
              font: {
                family: "'Microsoft YaHei', sans-serif"
              }
            }
          }
        }
      };

      // 获取分拆信息
      const splitResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/stock_split_calendar/${symbol}?from=2019-01-01&apikey=${API_KEY}`
      );
      const splitData = await splitResponse.json();
      
      if (splitData && splitData.length > 0) {
        // 按日期排序，最新的在前
        const sortedSplits = splitData.sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        );
        setSplitInfo(sortedSplits);
      } else {
        setSplitInfo(null);
      }

      setChartData(chartData);
      setChartOptions(chartOptions);
      setDividendRecords(filteredData);
      setHasData(true);
      setError('');

    } catch (err) {
      console.error('错误详情:', err);
      setError(`${t.errorFetch}: ${err.message}`);
      setDividendRecords([]);
      setHasData(false);
      setSplitInfo(null);
    }
    setLoading(false);
  };

  // 格式化日期的函数
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  // 格式化分拆比例的函数
  const formatSplitRatio = (ratio) => {
    const [numerator, denominator] = ratio.split(':');
    return `${numerator}:${denominator}`;
  };

  // 计算股息成长率的函数
  const calculateDividendGrowth = (dividends, years) => {
    if (dividends.length < years) return 'N/A';
    
    const latestDividend = dividends[0].adjDividend;
    const oldestIndex = Math.min(years - 1, dividends.length - 1);
    const oldestDividend = dividends[oldestIndex].adjDividend;
    
    if (oldestDividend === 0) return 'N/A';
    
    const growthRate = ((latestDividend / oldestDividend) ** (1 / years) - 1) * 100;
    return `${growthRate.toFixed(2)}%`;
  };

  return (
    <div className="App">
      <header className="App-header">
        <LanguageSelector 
          currentLang={language} 
          onLanguageChange={setLanguage} 
        />
        <h1>{t.title}</h1>
        <div className="search-container">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder={t.searchPlaceholder}
          />
          <button onClick={fetchData} disabled={loading}>
            {loading ? t.loading : t.searchButton}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {loading && <p className="loading">{t.loading}</p>}
        {chartData && chartOptions && (
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
        {dividendRecords.length > 0 && (
          <>
            {/* 股息成长率表格 */}
            <div className="growth-table-container">
              <h2 className="table-header">{t.dividendGrowth}</h2>
              <table className="growth-table">
                <thead>
                  <tr>
                    <th>3 {t.years}</th>
                    <th>5 {t.years}</th>
                    <th>10 {t.years}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{calculateDividendGrowth(dividendRecords, 3)}</td>
                    <td>{calculateDividendGrowth(dividendRecords, 5)}</td>
                    <td>{calculateDividendGrowth(dividendRecords, 10)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 股息发放记录表格 */}
            <div className="table-container">
              <h2 className="table-header dividend-title">{t.dividendRecords}</h2>
              <table className="dividend-table">
                <thead>
                  <tr>
                    <th>{t.date}</th>
                    <th>{t.adjustedDividend}</th>
                  </tr>
                </thead>
                <tbody>
                  {dividendRecords.map((record, index) => (
                    <tr key={index}>
                      <td>{formatDate(record.date)}</td>
                      <td>{record.adjDividend.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {splitInfo && splitInfo.length > 0 && (
          <div className="split-info">
            <h3>{t.stockSplitHistory}</h3>
            <div className="split-list">
              {splitInfo.map((split, index) => (
                <div key={index} className="split-item">
                  <span className="split-date">
                    {formatDate(split.date)}
                  </span>
                  <span className="split-ratio">
                    {t.splitRatio}: {formatSplitRatio(split.numerator + ':' + split.denominator)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {!hasData && (
          <div className="tips">
            <p>{t.instructions}:</p>
            <ul>
              <li>{t.examples}</li>
              <li>AAPL - Apple Inc.</li>
              <li>MSFT - Microsoft Corporation</li>
              <li>JNJ - Johnson & Johnson</li>
              <li>KO - The Coca-Cola Company</li>
              <li>PG - Procter & Gamble Company</li>
            </ul>
            <p>{t.notes}</p>
            <ul>
              <li>{t.note1}</li>
              <li>{t.note2}</li>
              <li>{t.note3}</li>
            </ul>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
