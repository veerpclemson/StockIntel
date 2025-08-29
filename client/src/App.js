import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [ticker, setTicker] = useState("");          // Stores what user types
  const [watchlist, setWatchlist] = useState([]);    // Stores list of tickers
  const [watchlistData, setWatchlistData] = useState([]); // Stores detailed stock info

  // Initial load of watchlist stock info
  useEffect(() => {
    fetchWatchlistInfo();
  }, []);

  // Function to fetch watchlist info from backend
  const fetchWatchlistInfo = () => {
    axios.get("http://127.0.0.1:8000/watchlist")
      .then(res => setWatchlistData(res.data.watchlist))
      .catch(err => console.error(err));
  };

  // Add a new ticker to watchlist
  const addTicker = () => {
    if (!ticker) return;
    axios.post("http://127.0.0.1:8000/watchlist", { ticker })
      .then(res => {
        if(!watchlist.includes(ticker.toUpperCase()) )
        setWatchlist(res.data.watchlist);  // Update ticker list
        setTicker("");                     // Clear input box
        fetchWatchlistInfo();              // Refresh stock info
      })
      .catch(err => console.error(err));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">📈 StockIntel Watchlist</h1>

      <div className="flex gap-2 mb-6">
        <input 
          type="text" 
          value={ticker} 
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Enter ticker (e.g., AAPL)"
          className="border p-2 rounded"
        />
        <button 
          onClick={addTicker} 
          className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
        >
          Add
        </button>
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
