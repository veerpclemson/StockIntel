from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine
import yfinance as yf
import os
from passlib.context import CryptContext
from pydantic import BaseModel
from models import User, Watchlist, Portfolio
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
    user_id: int
    shares: float = 0

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
                })
        except Exception:
            continue
    return {"watchlist": result}
# Get tickers only
@app.get("/watchlist")
def get_watchlist(user_id: int, db: Session = Depends(get_db)):
    stocks = db.query(Watchlist).filter(Watchlist.user_id == user_id).all()
    return {"watchlist": [s.ticker for s in stocks]}

# Add ticker
@app.post("/watchlist")
def add_stock(stock: StockItem, db: Session = Depends(get_db)):
    ticker = stock.ticker.upper()
    user_id = stock.user_id

    existing = db.query(Watchlist).filter(Watchlist.user_id == user_id, Watchlist.ticker == ticker).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"{ticker} already in watchlist")

    db_stock = Watchlist(ticker=ticker, user_id=user_id)
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

