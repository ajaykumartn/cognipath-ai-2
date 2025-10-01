from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# --- Production-Ready Logic ---
# 1. Look for a "DATABASE_URL" in the server's environment variables (Render will provide this).
# 2. If it's not found, default to the local "sqlite:///./cognipath.db" for development.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cognipath.db")

# Add a check for PostgreSQL to handle specific connection arguments if needed.
# The `check_same_thread` argument is only for SQLite.
connect_args = {"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

