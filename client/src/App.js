import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [ticker, setTicker] = useState("");          // User input
  const [watchlist, setWatchlist] = useState([]);    // Raw tickers
  const [watchlistData, setWatchlistData] = useState([]); // Detailed stock info
  const [message, setMessage] = useState("");        // Backend messages

  // Load initial watchlist and info
  useEffect(() => {
    fetchWatchlist();
    fetchWatchlistInfo();
  }, []);

  const fetchWatchlist = () => {
    axios.get("http://127.0.0.1:8000/watchlist")
      .then(res => setWatchlist(res.data.watchlist))
      .catch(err => console.error(err));
  };

  const fetchWatchlistInfo = () => {
    axios.get("http://127.0.0.1:8000/watchlist-info")
      .then(res => setWatchlistData(res.data.watchlist))
      .catch(err => console.error(err));
  };

  const addTicker = () => {
    if (!ticker) return;
    axios.post("http://127.0.0.1:8000/watchlist", { ticker })
      .then(res => {
        setMessage(res.data.message);       // Show success/error message
        setWatchlist(res.data.watchlist);   // Update raw tickers
        setTicker("");                       // Clear input
        fetchWatchlistInfo();                // Refresh detailed info
      })
      .catch(err => console.error(err));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">📈 StockIntel Watchlist</h1>

      <div className="flex flex-col items-center gap-2 mb-6">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={ticker} 
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Enter ticker (e.g., TSLA)"
            className="border p-2 rounded"
          />
          <button 
            onClick={addTicker} 
            className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
          >
            Add
          </button>
        </div>
        {message && <p className="text-red-600 mt-2">{message}</p>}
      </div>

      <ul className="bg-white p-4 rounded shadow w-80">
        {watchlistData.map((s, index) => (
          <li key={index} className="border-b last:border-b-0 p-2">
            <strong>{s.name}</strong> (${s.price}) - {s.ticker} [{s.exchange}]
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
