import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Auth from "./Auth";

function WatchlistHome() {
  const API_URL = process.env.REACT_APP_API_URL;
  console.log("API URL:", process.env.REACT_APP_API_URL);


  const [userId, setUserId] = useState(() => localStorage.getItem("userId") || null);
  const [ticker, setTicker] = useState("");
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistData, setWatchlistData] = useState([]);
  const [message, setMessage] = useState("");
  const [sortKey, setSortKey] = useState("ticker");
  const [filter, setFilter] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [portfolioChange, setPortfolioChange] = useState(0);

  const [chatTicker, setChatTicker] = useState("");
  const [chatResponse, setChatResponse] = useState("");

  const prevPricesRef = useRef({});

  useEffect(() => {
    if (!userId) return;
    fetchWatchlist();
    fetchWatchlistInfo();

    const interval = setInterval(() => fetchWatchlistInfo(), 15000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchWatchlist = () => {
    axios.get(`${API_URL}/watchlist?user_id=${userId}`)
      .then(res => setWatchlist(res.data.watchlist))
      .catch(err => console.error(err));
  };

  const fetchWatchlistInfo = () => {
    axios.get(`${API_URL}/watchlist-info?user_id=${userId}`)
      .then(res => {
        let totalValue = 0;
        let totalPrevValue = 0;

        const newData = res.data.watchlist.map(stock => {
          const prevPrice = prevPricesRef.current[stock.ticker] ?? stock.price;
          const priceChange = stock.price > prevPrice ? "up" : stock.price < prevPrice ? "down" : "same";
          prevPricesRef.current[stock.ticker] = stock.price;

          const quantity = stock.quantity || 1;
          totalValue += stock.price * quantity;
          totalPrevValue += prevPrice * quantity;

          return { ...stock, priceChange };
        });

        setWatchlistData(newData);
        setPortfolioValue(totalValue);
        setPortfolioChange(totalValue - totalPrevValue);
      })
      .catch(err => console.error(err));
  };

  const addTicker = () => {
    if (!ticker) return;
    axios.post(`${API_URL}/watchlist?user_id=${userId}`, {
      ticker: ticker.toUpperCase(),
      quantity: parseInt(quantity) || 1,
      purchase_price: parseFloat(purchasePrice) || 0
    })
    .then(res => {
      setMessage(res.data.message);
      fetchWatchlist();
      fetchWatchlistInfo();
      setTicker("");
      setQuantity("");
      setPurchasePrice("");
    })
    .catch(err => setMessage(err.response?.data.detail || "Error adding ticker"));
  };

  const removeTicker = (ticker) => {
    axios.delete(`${API_URL}/watchlist/${ticker}?user_id=${userId}`)
      .then(res => {
        setMessage(res.data.message);
        fetchWatchlist();
        fetchWatchlistInfo();
      })
      .catch(err => setMessage(err.response?.data.detail || "Error removing ticker"));
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    setUserId(null);
    setWatchlist([]);
    setWatchlistData([]);
  };

  const handleChat = () => {
    if (!chatTicker) return;
    setChatResponse("Loading AI analysis...");
    axios.get(`${API_URL}/stock-ai/${chatTicker.toUpperCase()}`)
      .then(res => setChatResponse(res.data.analysis))
      .catch(err => setChatResponse("Error fetching AI analysis"));
  };

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
        <Auth setUserId={(id) => { localStorage.setItem("userId", id); setUserId(id); }} />
      ) : (
        <>
          {!userId ? (
  <Auth setUserId={(id) => { localStorage.setItem("userId", id); setUserId(id); }} />
) : (
  <div className="w-full max-w-7xl">
    <h1 className="text-3xl font-bold text-blue-600 mb-6">📈 StockIntel Watchlist</h1>
    <button onClick={handleLogout} className="bg-gray-600 text-white px-4 rounded mb-4 hover:bg-gray-700">
      Logout
    </button>

    <div className="flex w-full gap-6">

      {/* Watchlist + Add Ticker Section */}
      <div className="flex-1 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Your Watchlist</h2>

        {/* Add Ticker Form */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex gap-2 w-full">
            <input type="text" value={ticker} onChange={e => setTicker(e.target.value)} placeholder="Ticker" className="border p-2 rounded flex-1" />
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Quantity" className="border p-2 rounded w-24" />
            <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="Purchase Price" className="border p-2 rounded w-28" />
            <button onClick={addTicker} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700">Add</button>
          </div>

          <button onClick={fetchWatchlistInfo} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700">
            Refresh
          </button>
        </div>

        {/* Watchlist Table */}
        <ul className="w-full">
          {displayedData.length === 0 && <li className="p-2 text-gray-500">No tickers</li>}
          {displayedData.map((s, i) => (
            <li key={i} className="border-b last:border-b-0 p-2 flex justify-between items-center">
              <Link to={`/stock/${s.ticker}`} className="flex-1">
                <span>
                  <strong>{s.name}</strong> ($
                  <span className={s.priceChange === "up" ? "text-green-600" : s.priceChange === "down" ? "text-red-600" : ""}>
                    {s.price}
                  </span>
                  ) - {s.ticker} [{s.exchange}]
                  <br />
                  Qty: {s.quantity}, Purchase Price: ${s.purchase_price}
                </span>
              </Link>
              <button onClick={() => removeTicker(s.ticker)} className="bg-red-500 text-white px-2 rounded hover:bg-red-600">
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Portfolio / AI Section */}
      <div className="flex-1 flex flex-col gap-4">

        {/* Portfolio Tracker */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Portfolio Tracker</h2>
          <ul>
            {displayedData.length === 0 && <li className="text-gray-500">No holdings yet</li>}
            {displayedData.map((s, i) => {
              const currentValue = (s.price * s.quantity).toFixed(2);
              const profitLoss = ((s.price - s.purchase_price) * s.quantity).toFixed(2);
              return (
                <li key={i} className="mb-2">
                  <strong>{s.ticker}</strong> | Qty: {s.quantity} | Current: ${currentValue} | P/L: 
                  <span className={profitLoss > 0 ? "text-green-600" : profitLoss < 0 ? "text-red-600" : ""}> ${profitLoss}</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* AI Chatbot Section */}
        <div className="bg-white p-4 rounded shadow flex flex-col flex-1">
          <h2 className="text-xl font-semibold mb-4">AI Stock Chat</h2>
          <div className="flex gap-2 mb-2">
            <input type="text" value={chatTicker} onChange={e => setChatTicker(e.target.value)} placeholder="Enter ticker for analysis" className="border p-2 rounded flex-1 text-lg" />
            <button onClick={handleChat} className="bg-green-600 text-white px-4 rounded hover:bg-green-700">Analyze</button>
          </div>
          <div className="mt-4 flex-1 overflow-y-auto border p-2 rounded bg-gray-50">
            {chatResponse ? <p className="text-gray-800 whitespace-pre-line">{chatResponse}</p> : <p className="text-gray-500">Enter a ticker and click Analyze to get AI insights.</p>}
          </div>
        </div>

      </div>

    </div>
  </div>
)}

        </>
      )}
    </div>
  );
}

export default WatchlistHome;
