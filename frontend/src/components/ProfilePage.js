import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import './ProfilePage.css';

const ProfilePage = ({ user, onLogout, navigateToQuiz, refreshUser, api, onNavigate }) => {
    const [name, setName] = useState(user.name);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updateMessage, setUpdateMessage] = useState('');
    const [latestReport, setLatestReport] = useState(null);

    // Effect to get the most recent report from local storage
    useEffect(() => {
        const report = localStorage.getItem('latest_report');
        if (report) {
            setLatestReport(JSON.parse(report));
        }
    }, [user]); // Reruns if the user object changes

    const handleUpdate = async (e) => {
        e.preventDefault();
        setUpdateMessage('');
        if (password && password !== confirmPassword) {
            setUpdateMessage('Passwords do not match.');
            return;
        }

        try {
            const updates = {};
            if (name !== user.name) updates.name = name;
            if (password) updates.password = password;

            if (Object.keys(updates).length > 0) {
                await api.put('/users/me', updates);
                setUpdateMessage('Profile updated successfully!');
                refreshUser(); // Refresh user data in the main app
            } else {
                setUpdateMessage('No changes to update.');
            }
        } catch (error) {
            setUpdateMessage('Failed to update profile.');
            console.error(error);
        }
    };

    const handleShareReport = async () => {
        if (!latestReport) {
            alert("Complete at least one question to generate a shareable report.");
            return;
        }
        try {
            const response = await api.post('/reports/share');
            const shareableLink = `${window.location.origin}${response.data.report_url}`;
            navigator.clipboard.writeText(shareableLink).then(() => {
                alert(`Report link copied to clipboard!\n\n${shareableLink}`);
            });
        } catch (error) {
            alert('Could not create shareable report link.');
            console.error(error);
        }
    };

    return (
        <div className="profile-page-container">
            <header className="profile-header">
                <div className="logo" onClick={() => onNavigate('home')}>🧠 CogniPath AI</div>
                <button onClick={onLogout} className="logout-btn">Logout</button>
            </header>
            
            <main className="profile-content">
                <div className="welcome-section">
                    <h1>Welcome back, {user.name}!</h1>
                    <p>This is your personalized learning dashboard. Track your progress, start a new session, or update your profile below.</p>
                </div>

                <div className="profile-grid">
                    {/* Left Side - Exam Options */}
                    <div className="profile-card exam-options">
                        <h2>Start a New Learning Session</h2>
                        <p>Choose your starting point:</p>
                        <button className="exam-btn adaptive" onClick={() => navigateToQuiz()}>
                            <strong>Adaptive Mode</strong>
                            <span>Start at your current level and let the AI guide you.</span>
                        </button>
                        <div className="difficulty-grid">
                            <button className="exam-btn difficulty" onClick={() => navigateToQuiz(1)}>Easy</button>
                            <button className="exam-btn difficulty" onClick={() => navigateToQuiz(2)}>Medium</button>
                            <button className="exam-btn difficulty" onClick={() => navigateToQuiz(3)}>Hard</button>
                            <button className="exam-btn difficulty" onClick={() => navigateToQuiz(4)}>Expert</button>
                        </div>
                    </div>

                    {/* Right Side - Profile Update */}
                    <div className="profile-card user-details">
                        <h2>Your Profile</h2>
                        <form onSubmit={handleUpdate}>
                            <div className="form-group">
                                <label>Name</label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" value={user.email} readOnly disabled />
                            </div>
                            <div className="form-group">
                                <label>Education Level</label>
                                <input type="text" value={user.education_level} readOnly disabled />
                            </div>
                             <div className="form-group">
                                <label>New Password</label>
                                <input type="password" placeholder="Leave blank to keep current" value={password} onChange={(e) => setPassword(e.target.value)} />
                            </div>
                             <div className="form-group">
                                <label>Confirm New Password</label>
                                <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                            </div>
                            {updateMessage && <p className={`update-message ${updateMessage.includes('Failed') || updateMessage.includes('match') ? 'error-message' : ''}`}>{updateMessage}</p>}
                            <button type="submit" className="update-btn">Update Profile</button>
                        </form>
                    </div>
                </div>
                
                {/* Full-width Dashboard at the bottom */}
                <div className="profile-card dashboard-wrapper">
                    <Dashboard progress={user.progress} fingerprint={user.fingerprint} latestReport={latestReport} />
                    {latestReport && (
                        <button className="share-report-btn" onClick={handleShareReport}>
                            Share Latest Report
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;

