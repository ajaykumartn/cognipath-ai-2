import React from 'react';
import './Dashboard.css';

const StatBar = ({ label, score, color }) => {
    const percentage = Math.round(score * 100);
    return (
        <div className="stat-bar-container">
            <div className="stat-label">
                <span>{label}</span>
                <span>{percentage}%</span>
            </div>
            <div className="stat-bar-background">
                <div className="stat-bar-foreground" style={{ width: `${percentage}%`, backgroundColor: color }} />
            </div>
        </div>
    );
};

const Dashboard = ({ progress, fingerprint, latestReport }) => {
    if (!progress || !fingerprint) return <div className="dashboard-container">Loading dashboard...</div>;

    const accuracy = progress.questions_answered > 0 ? ((progress.correct_answers / progress.questions_answered) * 100).toFixed(1) : 0;
    const fingerprintUrl = latestReport ? `${"http://127.0.0.1:8000"}${latestReport.fingerprint_chart_url}` : null;
    const trajectoryUrl = latestReport ? `${"http://127.0.0.1:8000"}${latestReport.trajectory_chart_url}` : null;

    return (
        <div className="dashboard-container">
            <div className="dashboard-grid">
                <div className="dashboard-section">
                    <h4>Cognitive Fingerprint</h4>
                    {fingerprintUrl ? (
                         <img src={fingerprintUrl} alt="Cognitive Fingerprint Chart" className="report-chart" />
                    ) : (
                        <>
                        <StatBar label="Comprehension" score={fingerprint.comprehension} color="#61dafb" />
                        <StatBar label="Application" score={fingerprint.application} color="#28a745" />
                        <StatBar label="Concentration" score={fingerprint.concentration} color="#ffc107" />
                        <StatBar label="Retention" score={fingerprint.retention} color="#dc3545" />
                        </>
                    )}
                </div>
                <div className="dashboard-section">
                    <h4>Overall Progress</h4>
                    <div className="progress-metrics">
                        <div className="metric-item">
                            <span className="metric-value">{progress.questions_answered}</span><span className="metric-label">Answered</span>
                        </div>
                        <div className="metric-item">
                            <span className="metric-value">{accuracy}%</span><span className="metric-label">Accuracy</span>
                        </div>
                        <div className="metric-item">
                            <span className="metric-value">{progress.current_difficulty}</span><span className="metric-label">Current Level</span>
                        </div>
                    </div>
                     {trajectoryUrl && (
                        <img src={trajectoryUrl} alt="Learning Trajectory Chart" className="report-chart trajectory-chart" />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

