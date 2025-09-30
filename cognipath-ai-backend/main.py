from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated, List, Optional
from fastapi.staticfiles import StaticFiles
import uuid
import os

import crud, models, schemas, auth, agents
from database import SessionLocal, engine

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

# Ensure the directory for static reports exists
os.makedirs("static/reports", exist_ok=True)

app = FastAPI(title="CogniPath AI Backend")
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- Middleware ---
origins = ["*"] # Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dependency to get a database session ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Initialize AI Agents ---
diagnostic_agent = agents.DiagnosticAgent()
adaptive_engine = agents.AdaptiveEngine()
curriculum_agent = agents.CurriculumAgent()
motivational_agent = agents.MotivationalAgent()
reporting_agent = agents.ReportingAgent()

# --- Authentication Routes ---
@app.post("/register", response_model=schemas.UserResponse, tags=["Authentication"])
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, email=user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/login", response_model=schemas.Token, tags=["Authentication"])
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# --- User Profile Routes ---
@app.get("/users/me", response_model=schemas.UserResponse, tags=["Users"])
async def read_users_me(current_user: Annotated[schemas.TokenData, Depends(auth.get_current_user)], db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=current_user.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/users/me", response_model=schemas.UserResponse, tags=["Users"])
async def update_user_profile(user_update: schemas.UserUpdate, current_user: Annotated[schemas.TokenData, Depends(auth.get_current_user)], db: Session = Depends(get_db)):
    return crud.update_user(db=db, user_email=current_user.email, updates=user_update)

# --- Learning Flow Routes ---
@app.get("/start", tags=["Learning"])
def start_session(current_user: Annotated[schemas.TokenData, Depends(auth.get_current_user)], db: Session = Depends(get_db), difficulty: Optional[int] = None):
    user = crud.get_user_by_email(db, email=current_user.email)
    crud.clear_user_history(db, user_id=user.id)  # Clear history for a fresh session
    
    user_progress = crud.get_user_progress(db, user_id=user.id)
    # Use specified difficulty, or user's last ability, or default to 1
    start_difficulty = difficulty if difficulty is not None else int(round(user_progress.ability * 4)) if user_progress and user_progress.ability > 0 else 1
    
    first_question = curriculum_agent.generate_content(difficulty_level=max(1, start_difficulty))
    return {"first_question": first_question}

@app.post("/submit", tags=["Learning"])
def submit_answer(request: agents.SubmissionRequest, current_user: Annotated[schemas.TokenData, Depends(auth.get_current_user)], db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=current_user.email)
    is_correct = request.user_answer.lower() == request.correct_answer.lower()
    
    # --- The Correct Logical Flow ---
    # 1. Get current state from DB
    user_progress = crud.get_user_progress(db, user_id=user.id)
    current_ability = user_progress.ability if user_progress else 0.5

    # 2. Calculate new ability based on the answer using the IRT model
    new_ability = adaptive_engine.irt_model.update_ability(current_ability, is_correct, request.difficulty_level)
    
    # 3. Save this most recent result to the user's history
    crud.add_user_history(db, user_id=user.id, correct=is_correct, difficulty=request.difficulty_level, ability=new_ability)
    
    # 4. Get the user's complete history to predict the next step
    history = crud.get_user_history(db, user_id=user.id)
    
    # 5. Get the next optimal difficulty from the Adaptive Engine (using BKT and IRT)
    next_difficulty = adaptive_engine.get_next_difficulty(user_history=history, latest_ability=new_ability)
    
    # 6. Update the user's overall progress in the database with the new ability and difficulty
    crud.update_user_progress(db, user_id=user.id, new_difficulty=next_difficulty, new_ability=new_ability, was_correct=is_correct)

    # 7. Analyze performance and update the cognitive fingerprint
    cognitive_adjustments = diagnostic_agent.analyze_submission(was_correct=is_correct, time_taken=request.time_taken)
    fingerprint = crud.update_cognitive_fingerprint(db, user_id=user.id, adjustments=cognitive_adjustments)
    
    # 8. Get the next question from the Curriculum Agent
    next_question = curriculum_agent.generate_content(difficulty_level=next_difficulty, user_history=history)
    
    # 9. Generate the visual report
    fingerprint_dict = {
        "concentration": fingerprint.concentration, "comprehension": fingerprint.comprehension,
        "retention": fingerprint.retention, "application": fingerprint.application
    }
    report = reporting_agent.generate_report(user_id=user.id, user_history=history, fingerprint_data=fingerprint_dict)
    
    # 10. Return the complete response to the frontend
    return {
        "feedback": motivational_agent.get_feedback(is_correct),
        "next_question": next_question,
        "report": report,
        "is_correct": is_correct,
    }

# --- Quiz Feature Routes ---
@app.post("/hint", tags=["Learning"])
def get_hint(request: agents.HintRequest, current_user: Annotated[schemas.TokenData, Depends(auth.get_current_user)]):
    return {"hint": curriculum_agent.generate_hint(request.question_text)}

@app.post("/report-issue", tags=["Learning"])
def report_issue(request: agents.IssueReportRequest, current_user: Annotated[schemas.TokenData, Depends(auth.get_current_user)]):
    print(f"--- ISSUE REPORT from {current_user.email} ---")
    print(f"Question: {request.question_text}")
    print(f"Comment: {request.comment}")
    return {"message": "Issue reported successfully. Thank you!"}

# --- Report Routes ---
@app.post("/reports/share", response_model=schemas.ShareableReportResponse, tags=["Reports"])
def create_shareable_report(current_user: Annotated[schemas.TokenData, Depends(auth.get_current_user)], db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=current_user.email)
    report = crud.create_shareable_report(db=db, user_id=user.id)
    return {"report_url": f"/report/{report.id}"}

@app.get("/reports/share/{report_id}", response_model=schemas.ShareableReport, tags=["Reports"])
def get_shareable_report(report_id: uuid.UUID, db: Session = Depends(get_db)):
    report = crud.get_shareable_report(db=db, report_id=report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

