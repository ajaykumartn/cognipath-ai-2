import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './QuizPage.css';

const API_URL = 'http://127.0.0.1:8000';

// Modal component for hints and issue reports
const Modal = ({ title, children, onClose }) => (
    <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{title}</h2>
            <div>{children}</div>
            <button onClick={onClose}>Close</button>
        </div>
    </div>
);

const QuizPage = ({ user, token, onLogout, refreshUser }) => {
    const [question, setQuestion] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [feedback, setFeedback] = useState("Your session is starting...");
    const [isCorrect, setIsCorrect] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [modalContent, setModalContent] = useState(null); // { type: 'hint'/'report', content: '...' }
    const [issueComment, setIssueComment] = useState('');
    
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
                setIsLoading(false);
            } catch (error) { if (error.response?.status === 401) onLogout(); }
        };
        fetchFirstQuestion();
    }, [api, onLogout, location.state]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedOption) return;
        setIsLoading(true);

        const timeTaken = (Date.now() - questionStartTime.current) / 1000;

        try {
            // FIX: Ensure all required fields are sent to the backend
            const response = await api.post('/submit', {
                user_answer: selectedOption,
                correct_answer: question.correct_answer,
                time_taken: timeTaken,
                difficulty_level: question.difficulty_level, 
            });
            const data = response.data;
            setFeedback(data.feedback); 
            setIsCorrect(data.is_correct);
            // Save the latest report to local storage for the dashboard to pick up
            localStorage.setItem('latest_report', JSON.stringify(data.report));

            setTimeout(() => {
                if (data.next_question.error) {
                    alert("Could not load the next question. Ending session.");
                    handleEndSession();
                    return;
                }
                setQuestion(data.next_question);
                setSelectedOption(null); 
                setIsCorrect(null);
                questionStartTime.current = Date.now(); 
                setIsLoading(false);
            }, 2500); // Wait 2.5 seconds to show feedback
        } catch (error) { 
            if (error.response?.status === 401) onLogout(); 
            setIsLoading(false);
        }
    };

    const handleGetHint = async () => {
        setModalContent({ type: 'hint', content: 'Generating hint...' });
        try {
            const response = await api.post('/hint', { question_text: question.question_text });
            setModalContent({ type: 'hint', content: response.data.hint });
        } catch {
            setModalContent({ type: 'hint', content: 'Could not fetch hint.' });
        }
    };

    const handleReportIssue = async () => {
        if (!issueComment) {
            alert("Please describe the issue.");
            return;
        }
        try {
            await api.post('/report-issue', { question_text: question.question_text, comment: issueComment });
            setModalContent(null);
            setIssueComment('');
            alert("Thank you! Your report has been submitted.");
        } catch {
            alert("Could not submit report.");
        }
    };

    if (isLoading && !question) return <div className="quiz-container"><h1>Loading Question...</h1></div>;

    return (
        <div className="quiz-container">
            {modalContent && (
                <Modal title={modalContent.type === 'hint' ? 'Hint' : 'Report an Issue'} onClose={() => setModalContent(null)}>
                    {modalContent.type === 'hint' ? (
                        <p>{modalContent.content}</p>
                    ) : (
                        <div className="report-modal">
                            <p>Describe the problem with the question:</p>
                            <textarea value={issueComment} onChange={(e) => setIssueComment(e.target.value)} rows="4" />
                            <button onClick={handleReportIssue}>Submit Report</button>
                        </div>
                    )}
                </Modal>
            )}

            <header className="quiz-header">
                <h3>Session for {user.name}</h3>
                <button onClick={handleEndSession} className="end-session-btn">End Session</button>
            </header>

            <div className="card quiz-card">
                {question ? (<>
                    <div className="question-header">
                        <span className="difficulty-badge">Difficulty Level: {question.difficulty_level}</span>
                        <div className="question-actions">
                            <button className="action-btn" onClick={handleGetHint}>Get Hint</button>
                            <button className="action-btn report-btn" onClick={() => setModalContent({ type: 'report' })}>Report Issue</button>
                        </div>
                    </div>
                    <p className="question-text">{question.question_text}</p>
                    <form onSubmit={handleSubmit}>
                      <div className="options-container">{Object.entries(question.options).map(([key, value]) => ( value && <button key={key} type="button" className={`option-btn ${selectedOption === key ? 'selected' : ''} ${isCorrect !== null && question.correct_answer === key ? 'correct' : ''} ${isCorrect === false && selectedOption === key ? 'incorrect' : ''}`} onClick={() => !isLoading && setSelectedOption(key)} disabled={isLoading}><strong>{key.toUpperCase()}:</strong> {value}</button>))}</div>
                      <button type="submit" className="submit-btn" disabled={isLoading}>{isLoading ? 'Evaluating...' : 'Submit Answer'}</button>
                    </form>
                  </>) : <p>Loading question...</p>}
            </div>
            
            <div className={`feedback-card quiz-feedback ${isCorrect === true ? 'correct-fb' : isCorrect === false ? 'incorrect-fb' : ''}`}>
                <h4>AI Coach Feedback:</h4><p>"{feedback}"</p>
            </div>
        </div>
    );
};

export default QuizPage;

