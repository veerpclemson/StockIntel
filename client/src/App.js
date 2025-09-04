import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Auth from "./Auth";

function App() {
  const [userId, setUserId] = useState(() => localStorage.getItem("userId") || null);
  const [ticker, setTicker] = useState("");
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistData, setWatchlistData] = useState([]);
  const [message, setMessage] = useState("");
  const [sortKey, setSortKey] = useState("ticker");
  const [filter, setFilter] = useState("");

  const prevPricesRef = useRef({});

  // Load watchlist info when user logs in or changes
  useEffect(() => {
    if (!userId) return;

    fetchWatchlist();
    fetchWatchlistInfo();

    const interval = setInterval(() => fetchWatchlistInfo(), 15000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchWatchlist = () => {
    axios
      .get(`http://127.0.0.1:8000/watchlist?user_id=${userId}`)
      .then(res => setWatchlist(res.data.watchlist))
      .catch(err => console.error(err));
  };

  const fetchWatchlistInfo = () => {
    axios
      .get(`http://127.0.0.1:8000/watchlist-info?user_id=${userId}`)
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

    axios
      .post("http://127.0.0.1:8000/watchlist", { ticker, user_id: userId })
      .then(res => {
        setMessage(res.data.message); // <-- use the message string
        fetchWatchlist();
        fetchWatchlistInfo();
        setTicker("");
      })
      .catch(err =>
        setMessage(err.response?.data?.detail || "Error adding ticker")
      );
  };

  const removeTicker = ticker => {
    axios
      .delete(`http://127.0.0.1:8000/watchlist/${ticker}?user_id=${userId}`)
      .then(res => {
        setMessage(res.data.message); // <-- use the message string
        fetchWatchlist();
        fetchWatchlistInfo();
      })
      .catch(err =>
        setMessage(err.response?.data?.detail || "Error removing ticker")
      );
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    setUserId(null);
    setWatchlist([]);
    setWatchlistData([]);
  };

  // Sorting & filtering
  const displayedData = watchlistData
    .filter(s => s.ticker.includes(filter.toUpperCase()))
    .sort((a, b) => {
      if (sortKey === "price") return b.price - a.price;
      if (sortKey === "ticker") return a.ticker.localeCompare(b.ticker);
      if (sortKey === "exchange") return a.exchange.localeCompare(b.exchange);
      return 0;
    });

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      {!userId ? (
        <Auth
          setUserId={id => {
            localStorage.setItem("userId", id);
            setUserId(id);
          }}
        />
      ) : (
        <>
          <h1 className="text-3xl font-bold text-blue-600 mb-6">
            📈 StockIntel Watchlist
          </h1>

          <button
            onClick={handleLogout}
            className="bg-gray-600 text-white px-4 rounded mb-4 hover:bg-gray-700"
          >
            Logout
          </button>

          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={ticker}
                onChange={e => setTicker(e.target.value)}
                placeholder="Enter ticker"
                className="border p-2 rounded"
              />
              <button
                onClick={addTicker}
                className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>

            <button
              onClick={fetchWatchlistInfo}
              className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
            >
              Refresh
            </button>

            <input
              type="text"
              placeholder="Filter by ticker"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="border p-2 rounded mt-2"
            />

            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value)}
              className="border p-2 rounded mt-2"
            >
              <option value="ticker">Sort by Ticker</option>
              <option value="price">Sort by Price</option>
              <option value="exchange">Sort by Exchange</option>
            </select>

            {message && typeof message === "string" && (
              <p
                className={`mt-2 ${
                  message.toLowerCase().includes("added")
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {message}
              </p>
            )}
          </div>

          <ul className="bg-white p-4 rounded shadow w-96">
            {displayedData.length === 0 && (
              <li className="p-2 text-gray-500">No tickers</li>
            )}
            {displayedData.map((s, i) => (
              <li
                key={i}
                className="border-b last:border-b-0 p-2 flex justify-between items-center"
              >
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
        </>
      )}
    </div>
  );
}

export default App;
