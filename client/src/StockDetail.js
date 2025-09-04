import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

export default function StockDetail() {
  const { ticker } = useParams();
  const [chartData, setChartData] = useState([]);
  const [news, setNews] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState("");

  useEffect(() => {
    // Replace with your API endpoints
    axios.get(`http://127.0.0.1:8000/stock-chart/${ticker}`)
      .then(res => setChartData(res.data))
      .catch(err => console.error(err));

    axios.get(`http://127.0.0.1:8000/stock-news/${ticker}`)
      .then(res => setNews(res.data))
      .catch(err => console.error(err));

    axios.get(`http://127.0.0.1:8000/stock-ai/${ticker}`)
      .then(res => setAiAnalysis(res.data.analysis))
      .catch(err => console.error(err));
  }, [ticker]);

  return (
    <div className="p-6">
      <Link to="/" className="text-blue-600 hover:underline mb-4 inline-block">← Back to Watchlist</Link>
      <h1 className="text-3xl font-bold mb-4">{ticker}</h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Chart</h2>
        {/* TODO: Render chartData as chart */}
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Latest News</h2>
        <ul>
          {news.map((item, i) => (
            <li key={i}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a></li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">AI Analysis</h2>
        <p>{aiAnalysis}</p>
      </section>
    </div>
  );
}
