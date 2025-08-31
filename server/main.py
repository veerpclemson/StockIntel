from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf

app = FastAPI()

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for demo
watchlist: list[str] = []

class StockItem(BaseModel):
    ticker: str

# Root route so / doesn’t return 404
@app.get("/")
def root():
    return {"message": "StockIntel API is running"}

# Get detailed stock info for the watchlist
@app.get("/watchlist-info")
def get_watchlist_info():
    result = []
    for ticker in watchlist:
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            # Only include if shortName exists
            if info.get("shortName"):
                result.append({
                    "ticker": ticker,
                    "name": info.get("shortName", "N/A"),
                    "price": info.get("regularMarketPrice", "N/A"),
                    "exchange": info.get("exchange", "N/A")
                })
        except Exception:
            continue
    return {"watchlist": result}

# Get raw ticker list
@app.get("/watchlist")
def get_watchlist():
    return {"watchlist": watchlist}

# Add new ticker
@app.post("/watchlist")
def add_stock(stock: StockItem):
    ticker = stock.ticker.upper()

    try:
        info = yf.Ticker(ticker).info
        if not info.get("shortName"):
            return {"message": f"{ticker} is not a valid ticker", "watchlist": watchlist}
    except Exception:
        return {"message": f"Error fetching {ticker}", "watchlist": watchlist}

    if ticker not in watchlist:
        watchlist.append(ticker)
        return {"message": f"{ticker} added to watchlist", "watchlist": watchlist}
    else:
        return {"message": f"{ticker} already in watchlist", "watchlist": watchlist}


@app.delete("/watchlist/{ticker}")
def remove_stock(ticker: str):
    ticker = ticker.upper()
    if ticker in watchlist:
        watchlist.remove(ticker)
        return {"message": f"{ticker} removed from watchlist", "watchlist": watchlist}
    else:
        return {"message": f"{ticker} not found in watchlist", "watchlist": watchlist}
