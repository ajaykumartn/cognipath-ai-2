from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
import uuid
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    education_level = Column(String)
    progress = relationship("UserProgress", back_populates="user", uselist=False, cascade="all, delete-orphan")
    fingerprint = relationship("CognitiveFingerprint", back_populates="user", uselist=False, cascade="all, delete-orphan")
    history = relationship("UserHistory", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("ShareableReport", back_populates="user", cascade="all, delete-orphan")

class UserProgress(Base):
    __tablename__ = "user_progress"
    id = Column(Integer, primary_key=True, index=True)
    current_difficulty = Column(Integer, default=1)
    questions_answered = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    # FIX: Add the missing 'ability' column
    ability = Column(Float, default=0.5) # Start users at an average ability
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="progress")

class CognitiveFingerprint(Base):
    __tablename__ = "cognitive_fingerprints"
    id = Column(Integer, primary_key=True, index=True)
    concentration = Column(Float, default=0.75)
    comprehension = Column(Float, default=0.75)
    retention = Column(Float, default=0.75)
    application = Column(Float, default=0.75)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="fingerprint")

# FIX: Add the missing UserHistory table model
class UserHistory(Base):
    __tablename__ = "user_history"
    id = Column(Integer, primary_key=True, index=True)
    correct = Column(Integer)
    difficulty = Column(Integer)
    ability = Column(Float)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="history")

class ShareableReport(Base):
    __tablename__ = "shareable_reports"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    report_data = Column(JSON)
    user = relationship("User", back_populates="reports")

