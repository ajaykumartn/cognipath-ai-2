from sqlalchemy.orm import Session
import crud, models, schemas, auth
import json
import uuid

# --- User Ops ---
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(name=user.name, email=user.email, hashed_password=hashed_password, education_level=user.education_level)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    db.add(models.UserProgress(user_id=db_user.id))
    db.add(models.CognitiveFingerprint(user_id=db_user.id))
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_email: str, updates: schemas.UserUpdate):
    db_user = get_user_by_email(db, email=user_email)
    if not db_user: return None
    if updates.name: db_user.name = updates.name
    if updates.password: db_user.hashed_password = auth.get_password_hash(updates.password)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Progress & History Ops ---
def get_user_progress(db: Session, user_id: int):
    return db.query(models.UserProgress).filter(models.UserProgress.user_id == user_id).first()

def update_user_progress(db: Session, user_id: int, new_difficulty: int, new_ability: float, was_correct: bool):
    progress = get_user_progress(db, user_id)
    if progress:
        progress.current_difficulty = new_difficulty
        # FIX: Update the 'ability' field in the database
        progress.ability = new_ability
        progress.questions_answered += 1
        if was_correct: progress.correct_answers += 1
        db.commit()
        db.refresh(progress)
    return progress

def get_user_history(db: Session, user_id: int):
    return db.query(models.UserHistory).filter(models.UserHistory.user_id == user_id).all()

def add_user_history(db: Session, user_id: int, correct: bool, difficulty: int, ability: float):
    history_entry = models.UserHistory(user_id=user_id, correct=correct, difficulty=difficulty, ability=ability)
    db.add(history_entry)
    db.commit()

def clear_user_history(db: Session, user_id: int):
    db.query(models.UserHistory).filter(models.UserHistory.user_id == user_id).delete()
    db.commit()

# --- Fingerprint Ops ---
def get_cognitive_fingerprint(db: Session, user_id: int):
    return db.query(models.CognitiveFingerprint).filter(models.CognitiveFingerprint.user_id == user_id).first()

def update_cognitive_fingerprint(db: Session, user_id: int, adjustments: dict):
    fp = get_cognitive_fingerprint(db, user_id)
    if fp:
        for key, value in adjustments.items():
            current_value = getattr(fp, key.replace('_score', ''))
            setattr(fp, key.replace('_score', ''), max(0, min(1, current_value + value)))
        db.commit()
        db.refresh(fp)
    return fp

# --- Report Ops ---
def create_shareable_report(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    fingerprint = get_cognitive_fingerprint(db, user_id)
    history = get_user_history(db, user_id)
    
    report_data = {
        "fingerprint": fingerprint.to_dict(),
        "history": [h.to_dict() for h in history]
    }
    
    report = models.ShareableReport(user_id=user_id, report_data=json.dumps(report_data))
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

def get_shareable_report(db: Session, report_id: uuid.UUID):
    report = db.query(models.ShareableReport).filter(models.ShareableReport.id == str(report_id)).first()
    if report:
        user = db.query(models.User).filter(models.User.id == report.user_id).first()
        return schemas.ShareableReport(id=report.id, user_name=user.name, report_data=json.loads(report.report_data))
    return None

