import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './AdminLoginPage.module.css';

export function AdminLoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const handleSubmit = async (event: React.SyntheticEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/admin');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message: 'Login failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.container}>
            <form className={styles.form} onSubmit={handleSubmit}>
                <h2>Admin Login</h2>
                {error && <p className={styles.error}>{error}</p>}
                <label>Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                />
                <label>Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="password"
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Signing in' : 'Sign in'}
                </button>
            </form>
        </div>
    )
}