import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import HomePage from './components/HomePage';
import ProfilePage from './components/ProfilePage';
import PublicReportPage from './components/PublicReportPage';
import './App.css';
import './components/QuizPage.css'; // Import the new quiz styles

const API_URL = 'http://127.0.0.1:8000';

// ==================================
//        AUTHENTICATION PAGE
// ==================================
function AuthPage({ onLoginSuccess, onNavigate }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [educationLevel, setEducationLevel] = useState('High School');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/login' : '/register';
    
    try {
      if (isLogin) {
        const params = new URLSearchParams();
        params.append('username', email);
        params.append('password', password);
        const response = await axios.post(`${API_URL}${endpoint}`, params);
        onLoginSuccess(response.data.access_token);
      } else {
        await axios.post(`${API_URL}${endpoint}`, { name, email, password, education_level: educationLevel });
        setIsLogin(true); 
        setError('Registration successful! Please log in.');
      }
    } catch (err) { setError(err.response?.data?.detail || 'An error occurred.'); }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo" onClick={() => onNavigate('home')}>🧠 CogniPath AI</h1>
        <h2>{isLogin ? 'Welcome Back' : 'Create Your Account'}</h2>
        <form onSubmit={handleSubmit}>
          {!isLogin && (<>
            <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}>
              <option>High School</option> <option>Undergraduate</option> <option>Graduate</option> <option>Professional</option>
            </select>
          </>)}
          <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="submit-btn">{isLogin ? 'Login' : 'Create Account'}</button>
        </form>
        {error && <p className={`update-message ${isLogin ? 'error-message' : ''}`}>{error}</p>}
        <p className="toggle-auth" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
          {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
        </p>
      </div>
    </div>
  );
}


// ==================================
//      NEW FEATURE-RICH QUIZ PAGE
// ==================================
function QuizPage({ user, token, onLogout, refreshUser }) {
    const [question, setQuestion] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [feedback, setFeedback] = useState("Your session is starting...");
    const [isCorrect, setIsCorrect] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showHint, setShowHint] = useState(false);
    const [hint, setHint] = useState('');
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportComment, setReportComment] = useState('');
    
    const questionStartTime = useRef(Date.now());
    const navigate = useNavigate();
    const location = useLocation();

    const api = useMemo(() => axios.create({ baseURL: API_URL, headers: { 'Authorization': `Bearer ${token}` } }), [token]);

    const handleEndSession = () => {
        refreshUser();
        navigate(-1); // Go back to the previous page (profile)
    };

    useEffect(() => {
        const fetchFirstQuestion = async () => {
            const difficulty = location.state?.difficulty;
            const url = difficulty ? `/start?difficulty=${difficulty}` : '/start';
            try {
                const response = await api.get(url);
                setQuestion(response.data.first_question);
                questionStartTime.current = Date.now();
            } catch (error) { if (error.response?.status === 401) onLogout(); }
            finally { setIsLoading(false); }
        };
        fetchFirstQuestion();
    }, [api, onLogout, location.state]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedOption) return;
        setIsLoading(true);

        const timeTaken = (Date.now() - questionStartTime.current) / 1000;
        try {
            // *** THE FIX IS HERE: Added difficulty_level to the payload ***
            const response = await api.post('/submit', {
                user_answer: selectedOption, 
                correct_answer: question.correct_answer, 
                time_taken: timeTaken,
                difficulty_level: question.difficulty_level 
            });
            
            const data = response.data;
            setFeedback(data.feedback); 
            setIsCorrect(data.is_correct);
            localStorage.setItem('latest_report', JSON.stringify(data.report));

            setTimeout(() => {
                setQuestion(data.next_question);
                setSelectedOption(null); 
                setIsCorrect(null);
                setShowHint(false);
                setHint('');
                questionStartTime.current = Date.now(); 
                setIsLoading(false);
            }, 2500);
        } catch (error) { 
            if (error.response?.status === 401) onLogout(); 
            setIsLoading(false);
        }
    };
    
    const handleGetHint = async () => {
        setHint('Getting hint...');
        setShowHint(true);
        try {
            const response = await api.post('/hint', { question_text: question.question_text });
            setHint(response.data.hint);
        } catch { setHint('Could not get a hint.'); }
    };

    const handleReportIssue = async () => {
        if (!reportComment) return;
        try {
            await api.post('/report-issue', { question_text: question.question_text, comment: reportComment });
            setShowReportModal(false);
            setReportComment('');
            alert('Issue reported successfully. Thank you for your feedback!');
        } catch { alert('Failed to report issue.'); }
    };


    if (isLoading && !question) return <div className="quiz-container"><h1>Loading Question...</h1></div>;

    return (
      <div className="quiz-container">
        {showReportModal && (
            <div className="modal-backdrop">
                <div className="modal-content">
                    <h2>Report an Issue</h2>
                    <p>What's wrong with this question?</p>
                    <textarea value={reportComment} onChange={(e) => setReportComment(e.target.value)} placeholder="e.g., The answer is incorrect, there's a typo..."></textarea>
                    <div className="modal-actions">
                        <button onClick={() => setShowReportModal(false)}>Cancel</button>
                        <button onClick={handleReportIssue}>Submit</button>
                    </div>
                </div>
            </div>
        )}

        <header className="quiz-header">
            <h3>Question for {user.name}</h3>
            <button onClick={handleEndSession} className="end-session-btn">End Session</button>
        </header>

        <div className="card quiz-card">
            {question ? (<>
                <div className="question-header"><span className="difficulty-badge">Difficulty Level: {question.difficulty_level}</span></div>
                <p className="question-text">{question.question_text}</p>
                <form onSubmit={handleSubmit}>
                    <div className="options-container">{Object.entries(question.options).map(([key, value]) => (value && <button key={key} type="button" className={`option-btn ${selectedOption === key ? 'selected' : ''} ${isCorrect !== null && question.correct_answer === key ? 'correct' : ''} ${isCorrect === false && selectedOption === key ? 'incorrect' : ''}`} onClick={() => !isLoading && setSelectedOption(key)} disabled={isLoading}><strong>{key.toUpperCase()}:</strong> {value}</button>))}</div>
                    <button type="submit" className="submit-btn" disabled={isLoading}>{isLoading ? 'Evaluating...' : 'Submit Answer'}</button>
                </form>
            </>) : <p>Loading question...</p>}
        </div>

        {showHint && <div className="hint-box">{hint}</div>}

        <div className="quiz-actions">
            <button onClick={handleGetHint} disabled={isLoading || showHint}>Get a Hint</button>
            <button onClick={() => setShowReportModal(true)} disabled={isLoading}>Report Issue</button>
        </div>

        <div className={`feedback-card quiz-feedback ${isCorrect === true ? 'correct-fb' : isCorrect === false ? 'incorrect-fb' : ''}`}>
            <h4>AI Coach Feedback:</h4><p>"{feedback}"</p>
        </div>
      </div>
    );
}


// ==================================
//      MAIN APP CONTROLLER
// ==================================
function AppController() {
  const [token, setToken] = useState(localStorage.getItem('cognipath_token'));
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('loading');
  const navigate = useNavigate();

  const api = useMemo(() => axios.create({ baseURL: API_URL, headers: { 'Authorization': `Bearer ${token}` } }), [token]);

  const fetchUserProfile = useCallback(async (currentToken) => {
      if (currentToken) {
        try {
          const response = await axios.get(`${API_URL}/users/me`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
          setUser(response.data);
        } catch (error) { setToken(null); setUser(null); }
      }
  }, []);

  useEffect(() => {
    const init = async () => {
        const storedToken = localStorage.getItem('cognipath_token');
        if (storedToken) {
            setToken(storedToken);
            await fetchUserProfile(storedToken);
        }
        setPage('home'); // Always start at home
    };
    init();
  }, [fetchUserProfile]);

  const handleLoginSuccess = async (newToken) => {
    localStorage.setItem('cognipath_token', newToken);
    setToken(newToken);
    await fetchUserProfile(newToken);
    setPage('profile');
  };
  
  const handleLogout = useCallback(() => {
    localStorage.removeItem('cognipath_token');
    setToken(null);
    setUser(null);
    setPage('home');
  }, []);
  
  const navigateToQuiz = useCallback((difficulty) => {
      navigate('/quiz', { state: { difficulty } });
  }, [navigate]);

  if (page === 'loading') return <div>Loading Application...</div>;
  if (page === 'home') return <HomePage onNavigate={setPage} user={user} navigateToQuiz={navigateToQuiz}/>;
  if (page === 'auth') return <AuthPage onLoginSuccess={handleLoginSuccess} onNavigate={setPage} />;
  if (page === 'profile' && user) return <ProfilePage user={user} onLogout={handleLogout} navigateToQuiz={navigateToQuiz} refreshUser={() => fetchUserProfile(token)} api={api} onNavigate={setPage} />;
  
  return <HomePage onNavigate={setPage} user={user} navigateToQuiz={navigateToQuiz}/>; // Default fallback
}

function App() {
  return (
    <Router>
        <Routes>
            <Route path="/report/:reportId" element={<PublicReportPage />} />
            <Route path="/quiz" element={
                <AuthenticatedRoute>
                    {(user, token, refreshUser, handleLogout) => <QuizPage user={user} token={token} onLogout={handleLogout} refreshUser={refreshUser} />}
                </AuthenticatedRoute>
            }/>
            <Route path="*" element={<AppController />} />
        </Routes>
    </Router>
  );
}

// Helper component to protect routes
function AuthenticatedRoute({ children }) {
    const [user, setUser] = useState(null);
    const [token] = useState(localStorage.getItem('cognipath_token'));
    const navigate = useNavigate();

    const fetchUserProfile = useCallback(async (currentToken) => {
        try {
            const response = await axios.get(`${API_URL}/users/me`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
            setUser(response.data);
        } catch {
            localStorage.removeItem('cognipath_token');
            navigate('/');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('cognipath_token');
        navigate('/');
    };

    useEffect(() => {
        if (!token) {
            navigate('/');
        } else {
            fetchUserProfile(token);
        }
    }, [token, navigate, fetchUserProfile]);

    if (!user) return <div>Loading...</div>;

    return children(user, token, () => fetchUserProfile(token), handleLogout);
}

export default App;

