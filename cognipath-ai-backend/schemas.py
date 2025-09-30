from pydantic import BaseModel, EmailStr
from typing import List, Optional
import uuid

# --- User History Schemas ---
class UserHistoryBase(BaseModel):
    correct: bool
    difficulty: int
    ability: float

class UserHistoryResponse(UserHistoryBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True

# --- User Progress Schemas ---
class UserProgressBase(BaseModel):
    current_difficulty: int
    questions_answered: int
    correct_answers: int
    # FIX: Add the 'ability' field to the schema
    ability: float

class UserProgressResponse(UserProgressBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True

# --- Cognitive Fingerprint Schemas ---
class CognitiveFingerprintBase(BaseModel):
    concentration: float
    comprehension: float
    retention: float
    application: float

class CognitiveFingerprintResponse(CognitiveFingerprintBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    name: str
    password: str
    education_level: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    name: str
    education_level: str
    progress: Optional[UserProgressResponse] = None
    fingerprint: Optional[CognitiveFingerprintResponse] = None
    class Config:
        from_attributes = True

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    
# --- Shareable Report Schemas ---
class ShareableReport(BaseModel):
    id: uuid.UUID
    user_name: str
    report_data: dict
    class Config:
        from_attributes = True

class ShareableReportResponse(BaseModel):
    report_url: str

