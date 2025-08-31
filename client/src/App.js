import { useState, useEffect, useRef } from "react";
import axios from "axios";

function App() {
  const [ticker, setTicker] = useState("");          
  const [watchlist, setWatchlist] = useState([]);    
  const [watchlistData, setWatchlistData] = useState([]); 
  const [message, setMessage] = useState("");        

  // Keep track of previous prices
  const prevPricesRef = useRef({});

  // Load initial watchlist and info
  useEffect(() => {
    fetchWatchlist();
    fetchWatchlistInfo();

    // Live updates every 15 seconds
    const interval = setInterval(() => {
      fetchWatchlistInfo();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const fetchWatchlist = () => {
    axios.get("http://127.0.0.1:8000/watchlist")
      .then(res => setWatchlist(res.data.watchlist))
      .catch(err => console.error(err));
  };

  const fetchWatchlistInfo = () => {
    axios.get("http://127.0.0.1:8000/watchlist-info")
      .then(res => {
        const newData = res.data.watchlist.map(stock => {
          const prevPrice = prevPricesRef.current[stock.ticker] ?? stock.price;
          const priceChange =
            stock.price > prevPrice
              ? "up"
              : stock.price < prevPrice
              ? "down"
              : "same";
          prevPricesRef.current[stock.ticker] = stock.price;
          return { ...stock, priceChange };
        });
        setWatchlistData(newData);
      })
      .catch(err => console.error(err));
  };

  const addTicker = () => {
    if (!ticker) return;
    axios.post("http://127.0.0.1:8000/watchlist", { ticker })
      .then(res => {
        setMessage(res.data.message);       
        setWatchlist(res.data.watchlist);   
        setTicker("");                       
        fetchWatchlistInfo();                
      })
      .catch(err => console.error(err));
  };

  const removeTicker = (ticker) => {
    axios.delete(`http://127.0.0.1:8000/watchlist/${ticker}`)
      .then(res => {
        setMessage(res.data.message);       
        setWatchlist(res.data.watchlist);   
        fetchWatchlistInfo();               
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
        {message && (
          <p
            className={`mt-2 ${
              message.toLowerCase().includes("added") ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>

      <ul className="bg-white p-4 rounded shadow w-80">
        {watchlistData.length === 0 && <li className="p-2 text-gray-500">No tickers in watchlist</li>}
        {watchlistData.map((s, index) => (
          <li key={index} className="border-b last:border-b-0 p-2 flex justify-between items-center">
            <span>
              <strong>{s.name}</strong> ($
              <span
                className={
                  s.priceChange === "up"
                    ? "text-green-600"
                    : s.priceChange === "down"
                    ? "text-red-600"
                    : ""
                }
              >
                {s.price}
              </span>
              ) - {s.ticker} [{s.exchange}]
            </span>
            <button
              onClick={() => removeTicker(s.ticker)}
              className="bg-red-500 text-white px-2 rounded hover:bg-red-600"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
