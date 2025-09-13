import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Auth from "./Auth";

function WatchlistHome() {
  const API_URL = process.env.REACT_APP_API_URL;

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
          {/* rest of your JSX remains unchanged */}
        </>
      )}
    </div>
  );
}

export default WatchlistHome;
