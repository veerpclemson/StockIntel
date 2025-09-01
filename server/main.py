from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
import os

# ---------------------------
# Database setup
# ---------------------------
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://neondb_owner:npg_LoJFkTju1DC4@ep-old-block-adle9pbx-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Stock(Base):
    __tablename__ = "stocks"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, unique=True, index=True, nullable=False)

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# ---------------------------
# FastAPI setup
# ---------------------------
app = FastAPI()

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Pydantic model
# ---------------------------
class StockItem(BaseModel):
    ticker: str

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------
# Routes
# ---------------------------
@app.get("/")
def root():
    return {"message": "StockIntel API is running"}

@app.get("/watchlist-info")
def get_watchlist_info(db: Session = Depends(get_db)):
    result = []
    stocks = db.query(Stock).all()
    for stock_obj in stocks:
        ticker = stock_obj.ticker
        try:
            info = yf.Ticker(ticker).info
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

@app.get("/watchlist")
def get_watchlist(db: Session = Depends(get_db)):
    stocks = db.query(Stock).all()
    return {"watchlist": [s.ticker for s in stocks]}

@app.post("/watchlist")
def add_stock(stock: StockItem, db: Session = Depends(get_db)):
    ticker = stock.ticker.upper()

    try:
        info = yf.Ticker(ticker).info
        if not info.get("shortName"):
            raise HTTPException(status_code=400, detail=f"{ticker} is not a valid ticker")
    except Exception:
        raise HTTPException(status_code=400, detail=f"Error fetching {ticker}")

    # Check if ticker exists in DB
    existing = db.query(Stock).filter(Stock.ticker == ticker).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"{ticker} already in watchlist")

    db_stock = Stock(ticker=ticker)
    db.add(db_stock)
    db.commit()
    db.refresh(db_stock)
    return {"message": f"{ticker} added to watchlist", "watchlist": [s.ticker for s in db.query(Stock).all()]}

@app.delete("/watchlist/{ticker}")
def remove_stock(ticker: str, db: Session = Depends(get_db)):
    ticker = ticker.upper()
    stock_obj = db.query(Stock).filter(Stock.ticker == ticker).first()
    if not stock_obj:
        raise HTTPException(status_code=404, detail=f"{ticker} not found in watchlist")
    db.delete(stock_obj)
    db.commit()
    return {"message": f"{ticker} removed from watchlist", "watchlist": [s.ticker for s in db.query(Stock).all()]}
