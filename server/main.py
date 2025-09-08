from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine
import yfinance as yf
import os
from passlib.context import CryptContext
from pydantic import BaseModel
from models import User, Watchlist
from database import Base
import requests
from openai import OpenAI
from dotenv import load_dotenv
from datetime import datetime, timedelta, date
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic models
class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

# Signup route


# Pydantic models
class StockItem(BaseModel):
    ticker: str
    quantity: int
    purchase_price: float

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
def get_watchlist_info(user_id: int, db: Session = Depends(get_db)):
    stocks = db.query(Watchlist).filter(Watchlist.user_id == user_id).all()
    result = []
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
                    "quantity": stock_obj.quantity,
                    "purchase_price": stock_obj.purchase_price
                })
        except Exception:
            continue
    return {"watchlist": result}

# Get tickers only
@app.get("/watchlist")
def get_watchlist(user_id: int, db: Session = Depends(get_db)):
    stocks = db.query(Watchlist).filter(Watchlist.user_id == user_id).all()
    return {"watchlist": [s.ticker for s in stocks]}
# Get chart for stock
@app.get("/stock-chart/{ticker}")
def stock_chart(ticker: str, period: str = "6mo", interval: str = "1d"):
    """
    Returns historical stock prices for the given ticker.
    - period: '1mo', '3mo', '6mo', '1y', '5y', etc.
    - interval: '1d', '1wk', '1mo', etc.
    """
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period, interval=interval)
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {ticker}")
        
        # Format data for charting
        chart_data = {
            "dates": [d.strftime("%Y-%m-%d") for d in hist.index],
            "prices": hist["Close"].tolist()
        }
        return chart_data

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
#fetch the news for the stock page
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")

today = datetime.today()
last_30_days = today - timedelta(days=30)


@app.get("/stock-news/{ticker}")
def get_stock_news(ticker: str):
    url = f"https://finnhub.io/api/v1/company-news"
    params = {
    "symbol": ticker.upper(),
    "from": last_30_days.strftime("%Y-%m-%d"),
    "to": today.strftime("%Y-%m-%d"),
    "token": FINNHUB_API_KEY
}
    response = requests.get(url, params=params)
    if response.status_code != 200:
        return {"error": "Failed to fetch news"}
    data = response.json()
    return [
        {"title": item.get("headline"), "url": item.get("url")}
        for item in data if item.get("headline") and item.get("url")
    ][:10]  # top 10 news
@app.get("/stock-ai/{ticker}")
def stock_ai_analysis(ticker: str):
    # 1. Calculate date range for last 30 days
    today = date.today()
    start_date = today - timedelta(days=30)
    url = (
        f"https://finnhub.io/api/v1/company-news?"
        f"symbol={ticker.upper()}&from={start_date}&to={today}&token={FINNHUB_API_KEY}"
    )
    
    # 2. Fetch news from Finnhub
    try:
        res = requests.get(url)
        res.raise_for_status()
        articles = res.json()
    except Exception:
        return {"analysis": "Failed to fetch news from Finnhub."}

    # 3. Extract valid headlines
    headlines = [a.get("headline") for a in articles if a.get("headline")]
    if not headlines:
        return {"analysis": f"No news available for {ticker} in the last 30 days."}

    headlines_text = "\n".join(headlines[:5])  # Limit to 5 headlines

    # 4. Ask GPT for analysis
    prompt = f"""
    Here are some recent news headlines about {ticker}:

    {headlines_text}

    Based on these, provide a detailed outlook (bullish, bearish, or neutral) for {ticker} in the near future and explain why.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a financial analyst AI."},
                {"role": "user", "content": prompt}
            ]
        )
        analysis = response.choices[0].message.content.strip()
    except Exception:
        analysis = "AI analysis failed. Try again later."

    return {"analysis": analysis}
# Add ticker
@app.post("/watchlist")
def add_stock(stock: StockItem, user_id: int = Query(...), db: Session = Depends(get_db)):
    ticker = stock.ticker.upper()
    existing = db.query(Watchlist).filter(Watchlist.user_id == user_id, Watchlist.ticker == ticker).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"{ticker} already in watchlist")

    db_stock = Watchlist(
        ticker=ticker,
        user_id=user_id,  # comes from query param
        quantity=stock.quantity,
        purchase_price=stock.purchase_price
    )
    db.add(db_stock)
    db.commit()
    db.refresh(db_stock)
    return {
        "message": f"{ticker} added",
        "watchlist": [s.ticker for s in db.query(Watchlist).filter(Watchlist.user_id == user_id).all()]
    }



@app.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = pwd_context.hash(user.password)
    db_user = User(email=user.email, password_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"message": "User created successfully"}

# Login route
@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not pwd_context.verify(user.password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    return {"message": "Login successful", "user_id": db_user.id}
# Remove ticker
@app.delete("/watchlist/{ticker}")
def remove_stock(ticker: str, user_id: int, db: Session = Depends(get_db)):
    stock_obj = db.query(Watchlist).filter(Watchlist.user_id == user_id, Watchlist.ticker == ticker.upper()).first()
    if not stock_obj:
        raise HTTPException(status_code=404, detail=f"{ticker} not in watchlist")
    db.delete(stock_obj)
    db.commit()
    return {"message": f"{ticker} removed", "watchlist": [s.ticker for s in db.query(Watchlist).filter(Watchlist.user_id == user_id).all()]}

