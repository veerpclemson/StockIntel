import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import WatchlistHome from "./WatchlistHome";
import StockDetail from "./StockDetail";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WatchlistHome />} />
        <Route path="/stock/:ticker" element={<StockDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
