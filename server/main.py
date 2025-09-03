from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine
import yfinance as yf
import os

from models import Watchlist
from database import Base

# DB setup
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://neondb_owner:npg_LoJFkTju1DC4@ep-old-block-adle9pbx-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

# FastAPI setup
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class StockItem(BaseModel):
    ticker: str
    shares: float = 0  # For portfolio tracking

# DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ------------------------
# Routes
# ------------------------
@app.get("/")
def root():
    return {"message": "StockIntel API is running"}

# Get detailed watchlist info (price, name, exchange, % change)
@app.get("/watchlist-info")
def get_watchlist_info(db: Session = Depends(get_db)):
    result = []
    stocks = db.query(Watchlist).all()
    for stock_obj in stocks:
        ticker = stock_obj.ticker
        try:
            info = yf.Ticker(ticker).info
            if info.get("shortName"):
                result.append({
                    "ticker": ticker,
                    "name": info.get("shortName", "N/A"),
                    "price": info.get("regularMarketPrice", 0),
                    "exchange": info.get("exchange", "N/A"),
                })
        except Exception:
            continue
    return {"watchlist": result}

# Get tickers only
@app.get("/watchlist")
def get_watchlist(db: Session = Depends(get_db)):
    stocks = db.query(Watchlist).all()
    return {"watchlist": [s.ticker for s in stocks]}

# Add ticker
@app.post("/watchlist")
def add_stock(stock: StockItem, db: Session = Depends(get_db)):
    ticker = stock.ticker.upper()
    try:
        info = yf.Ticker(ticker).info
        if not info.get("shortName"):
            raise HTTPException(status_code=400, detail=f"{ticker} is invalid")
    except Exception:
        raise HTTPException(status_code=400, detail=f"Error fetching {ticker}")

    existing = db.query(Watchlist).filter(Watchlist.ticker == ticker).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"{ticker} already in watchlist")

    db_stock = Watchlist(ticker=ticker)
    db.add(db_stock)
    db.commit()
    db.refresh(db_stock)
    return {"message": f"{ticker} added", "watchlist": [s.ticker for s in db.query(Watchlist).all()]}

# Remove ticker
@app.delete("/watchlist/{ticker}")
def remove_stock(ticker: str, db: Session = Depends(get_db)):
    ticker = ticker.upper()
    stock_obj = db.query(Watchlist).filter(Watchlist.ticker == ticker).first()
    if not stock_obj:
        raise HTTPException(status_code=404, detail=f"{ticker} not in watchlist")
    db.delete(stock_obj)
    db.commit()
    return {"message": f"{ticker} removed", "watchlist": [s.ticker for s in db.query(Watchlist).all()]}
