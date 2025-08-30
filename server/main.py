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


# In-memory storage for demo (later we’ll use a DB)
watchlist: list[str] = []


class StockItem(BaseModel):
    ticker: str


@app.get("/watchlist")
def get_watchlist_info():
    result = []
    for ticker in watchlist:
        stock = yf.Ticker(ticker)
        info = stock.info
        result.append({
            "ticker": ticker,
            "name": info.get("shortName", "N/A"),
            "price": info.get("regularMarketPrice", "N/A"),
            "exchange": info.get("exchange", "N/A")
        })
    return {"watchlist": result}


@app.post("/watchlist")
def add_stock(stock: StockItem):
    ticker = stock.ticker.upper()


    if ticker not in watchlist and yf.Ticker(ticker).info.get("shortName", "N/A") != "N/A":   # prevent duplicates and unknown tickers
        watchlist.append(ticker)
        return {"message": f"{ticker} added to watchlist", "watchlist": watchlist}
    else:
        return {"message": f"{ticker} already in watchlist", "watchlist": watchlist}