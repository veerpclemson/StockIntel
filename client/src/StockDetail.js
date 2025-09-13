import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function StockDetail() {
  const { ticker } = useParams();
  const API_URL = process.env.REACT_APP_API_URL; // Use the environment variable

  const [chartData, setChartData] = useState(null);
  const [news, setNews] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState("");

  useEffect(() => {
    // Fetch chart data
    axios.get(`${API_URL}/stock-chart/${ticker}`)
      .then(res => setChartData(res.data))
      .catch(err => console.error(err));

    // Fetch news
    axios.get(`${API_URL}/stock-news/${ticker}`)
      .then(res => setNews(res.data))
      .catch(err => console.error(err));

    // Fetch AI analysis
    axios.get(`${API_URL}/stock-ai/${ticker}`)
      .then(res => setAiAnalysis(res.data.analysis))
      .catch(err => console.error(err));
  }, [ticker, API_URL]);

  // Prepare chart for Chart.js
  const lineChartData = chartData ? {
    labels: chartData.dates,
    datasets: [
      {
        label: `${ticker} Price`,
        data: chartData.prices,
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        tension: 0.3
      }
    ]
  } : null;

  return (
    <div className="p-6">
      <Link to="/" className="text-blue-600 hover:underline mb-4 inline-block">← Back to Watchlist</Link>
      <h1 className="text-3xl font-bold mb-4">{ticker}</h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Chart</h2>
        {lineChartData ? <Line data={lineChartData} /> : <p>Loading chart...</p>}
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Latest News</h2>
        {news.length === 0 ? (
          <p>No news available for {ticker}</p>
        ) : (
          <ul>
            {news.map((item, i) => (
              <li key={i}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">AI Analysis</h2>
        {aiAnalysis ? <p>{aiAnalysis}</p> : <p>Loading analysis...</p>}
      </section>
    </div>
  );
}
