import os
import random
import json
import pandas as pd
import numpy as np
import google.generativeai as genai
from pydantic import BaseModel
import matplotlib.pyplot as plt
import seaborn as sns
from ai_models.irt_model import IRTModel
from ai_models.bkt_model import BKTModel

# --- Pydantic Models for API Request Bodies ---
class SubmissionRequest(BaseModel):
    user_answer: str
    correct_answer: str
    time_taken: float
    difficulty_level: int

class HintRequest(BaseModel):
    question_text: str
    
class IssueReportRequest(BaseModel):
    question_text: str
    comment: str

# --- Fallback Database Handler ---
class QuestionDatabase:
    _instance = None
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(QuestionDatabase, cls).__new__(cls)
        return cls._instance

    def __init__(self, csv_path='data/percentages_dataset_full_with_levels.csv'):
        if not hasattr(self, 'df'):
            try:
                self.df = pd.read_csv(csv_path)
                self.df = self.df.replace({np.nan: None})
                self.questions = self.df.to_dict(orient='records')
                print(f"✅ Fallback DB: Loaded {len(self.questions)} questions.")
            except FileNotFoundError:
                print(f"❌ Fallback DB: Could not find file at {csv_path}")
                self.questions = []

    def get_valid_question_by_difficulty(self, difficulty_level: int, max_retries=10):
        if not self.questions: return None
        difficulty_level = max(1, min(4, difficulty_level))
        for _ in range(max_retries):
            filtered_questions = [q for q in self.questions if q.get('difficulty_level') == difficulty_level]
            if not filtered_questions:
                difficulty_level = 1
                continue
            question = random.choice(filtered_questions)
            if all([question.get('id'), question.get('question_text'), question.get('option_a'), question.get('answer')]):
                return question
        return None

# --- AI AGENTS ---
class CurriculumAgent:
    def __init__(self):
        self.fallback_db = QuestionDatabase()
        try:
            API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")
            if API_KEY == "YOUR_GEMINI_API_KEY": raise ValueError("API Key not set")
            genai.configure(api_key=API_KEY)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            print("🤖 Curriculum-Agent: Gemini LLM configured successfully.")
        except Exception:
            self.model = None
            print("🤖 Curriculum-Agent: No API key. Using CSV fallback mode.")

    # CORRECTED: Added user_history to the function signature to match the call in main.py
    def generate_content(self, difficulty_level: int, user_history: list = []):
        if self.model:
            try:
                difficulty_map = {1: "Very Easy", 2: "Easy", 3: "Medium", 4: "Difficult"}
                difficulty_str = difficulty_map.get(difficulty_level, "Medium")
                prompt = f"""
                As an expert educator, create a new, unique, high-quality multiple-choice question on the topic of 'Percentages'.
                The question should be of '{difficulty_str}' difficulty. Ensure the question is clear, concise, and solvable.
                Provide the response ONLY in the following JSON format:
                {{
                  "id": "generated_{random.randint(1000, 9999)}", "question_text": "Your question here",
                  "options": {{"a": "Option A", "b": "Option B", "c": "Option C", "d": "Option D"}},
                  "correct_answer": "a", "difficulty_level": {difficulty_level}
                }}
                """
                response = self.model.generate_content(prompt)
                cleaned_response = response.text.strip().replace('```json', '').replace('```', '')
                question_data = json.loads(cleaned_response)
                print("✅ LLM Generation Successful.")
                return question_data
            except Exception as e:
                print(f"❌ LLM Generation Failed: {e}. Using CSV fallback.")
                return self.get_fallback_question(difficulty_level)
        else:
            return self.get_fallback_question(difficulty_level)

    def get_fallback_question(self, difficulty_level: int):
        print("↪️ CurriculumAgent: Using CSV fallback.")
        question = self.fallback_db.get_valid_question_by_difficulty(difficulty_level)
        if question:
            return {
                "id": question['id'], "question_text": question['question_text'],
                "options": {"a": question['option_a'], "b": question['option_b'], "c": question['option_c'], "d": question['option_d']},
                "correct_answer": question['answer'], "difficulty_level": question['difficulty_level']
            }
        return {"error": "Could not retrieve any valid question."}
    
    def generate_hint(self, question_text: str):
        if not self.model:
            return "Hint generation is unavailable in fallback mode."
        try:
            prompt = f"Provide a short, one-sentence hint for the following math question. Do not solve it. Question: {question_text}"
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Could not generate hint: {e}"

class DiagnosticAgent:
    def analyze_submission(self, was_correct: bool, time_taken: float):
        adjustments = {'concentration': 0, 'comprehension': 0, 'retention': 0, 'application': 0}
        base_change = 0.02
        if was_correct:
            adjustments['application'] += base_change
            if time_taken < 15: adjustments.update({'concentration': base_change * 1.5, 'retention': base_change})
            else: adjustments['comprehension'] += base_change
        else:
            adjustments['application'] -= base_change
            if time_taken > 45: adjustments.update({'concentration': -base_change * 1.5, 'comprehension': -base_change})
            else: adjustments['retention'] -= base_change
        return adjustments

class MotivationalAgent:
    def get_feedback(self, was_correct: bool):
        if was_correct:
            return random.choice(["Excellent!", "Great job!", "Correct! Keep up the momentum."])
        else:
            return random.choice(["Not quite, but every try is a step forward.", "That's a tough one.", "Close!"])

class AdaptiveEngine:
    def __init__(self):
        self.irt_model = IRTModel()
        self.bkt_model = BKTModel()

    def get_next_difficulty(self, user_history: list, latest_ability: float):
        if not user_history: return 1
        mastery_prob = self.bkt_model.get_mastery_probability(user_history)
        next_difficulty_irt = self.irt_model.get_next_item_difficulty(latest_ability)
        print(f"🧠 BKT Mastery Prob: {mastery_prob:.2f} | IRT Suggested Level: {next_difficulty_irt}")
        
        if mastery_prob > 0.95:
            return min(4, int(round(next_difficulty_irt)) + 1)
        else:
            return max(1, int(round(next_difficulty_irt)))

class ReportingAgent:
    def generate_report(self, user_id: int, user_history: list, fingerprint_data: dict):
        plt.style.use('dark_background')
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
        
        fp_keys = [k.capitalize() for k in fingerprint_data.keys()]
        fp_values = list(fingerprint_data.values())
        sns.barplot(x=fp_keys, y=fp_values, ax=ax1, palette="viridis_r")
        ax1.set_title('Cognitive Fingerprint'); ax1.set_ylabel('Score'); ax1.set_ylim(0, 1)
        
        if user_history:
            abilities = [h.ability for h in user_history]
            ax2.plot(range(len(abilities)), abilities, marker='o', linestyle='-', color='#61dafb')
            ax2.set_title('Learning Trajectory'); ax2.set_xlabel('Questions Answered'); ax2.set_ylabel('Estimated Ability'); ax2.set_ylim(0, 1)
        else:
            ax2.text(0.5, 0.5, 'Answer questions to see your trajectory.', ha='center', va='center', color='gray')
        
        plt.tight_layout()
        os.makedirs("static/reports", exist_ok=True)
        
        filename = f"report_{user_id}_{random.randint(1000, 9999)}.png"
        filepath = os.path.join("static/reports", filename)
        
        plt.savefig(filepath); plt.close()
        
        return {"fingerprint_chart_url": f"/{filepath}", "trajectory_chart_url": f"/{filepath}"}

