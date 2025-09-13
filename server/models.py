from sqlalchemy import Column, Integer, String, Float, ForeignKey
from .database import Base
from sqlalchemy.orm import relationship

class Watchlist(Base):
    __tablename__ = "watchlist"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="watchlist")

    quantity = Column(Integer, default=0)
    purchase_price = Column(Float, default=0.0)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    watchlist = relationship("Watchlist", back_populates="user")
