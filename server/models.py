from sqlalchemy import Column, Integer, String, Float, ForeignKey
from database import Base

# Watchlist table
class Watchlist(Base):
    __tablename__ = "watchlist"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, unique=True, index=True, nullable=False)
    #user_id = Column(Integer, index=True, nullable=True)  # For future multi-user support

# Portfolio table
class Portfolio(Base):
    __tablename__ = "portfolios"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True, nullable=False)
    shares = Column(Float, default=0)
    #user_id = Column(Integer, index=True, nullable=True)
