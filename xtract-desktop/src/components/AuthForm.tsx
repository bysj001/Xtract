import React, { useState } from 'react';
import { AuthService } from '../services/supabase';

interface AuthFormProps {
  onAuthSuccess: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await AuthService.signUp(email, password);
        setError('Check your email for a confirmation link!');
      } else {
        await AuthService.signIn(email, password);
        onAuthSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `
        radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(255, 107, 107, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(78, 205, 196, 0.2) 0%, transparent 50%),
        linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)
      `,
      position: 'relative',
    }}>
      {/* Drag region for window movement */}
      <div style={{
        height: '40px',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        ...({ WebkitAppRegion: 'drag' } as any),
        zIndex: 1000
      }} />
      <div style={{
        background: `
          linear-gradient(145deg, rgba(30, 30, 30, 0.9), rgba(20, 20, 20, 0.9))
        `,
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '40px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        width: '400px',
        maxWidth: '90vw',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '15px',
            marginBottom: '10px'
          }}>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #7b68ee 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-1px',
            }}>
              XTRACT
            </h1>
          </div>
          <p style={{
            margin: 0,
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '14px',
            fontWeight: '300',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: error.includes('Check your email') 
              ? 'rgba(78, 205, 196, 0.1)' 
              : 'rgba(255, 107, 107, 0.1)',
            border: `1px solid ${error.includes('Check your email') 
              ? 'rgba(78, 205, 196, 0.3)' 
              : 'rgba(255, 107, 107, 0.3)'}`,
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '20px',
            color: error.includes('Check your email') 
              ? 'rgba(78, 205, 196, 0.9)' 
              : 'rgba(255, 107, 107, 0.9)',
            fontSize: '14px',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid rgba(78, 205, 196, 0.5)';
                e.target.style.boxShadow = '0 0 20px rgba(78, 205, 196, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid rgba(78, 205, 196, 0.5)';
                e.target.style.boxShadow = '0 0 20px rgba(78, 205, 196, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '10px',
              border: 'none',
              background: loading 
                ? 'rgba(100, 100, 100, 0.5)' 
                : 'linear-gradient(135deg, #ff6b6b, #4ecdc4)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(78, 205, 196, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {loading 
              ? 'Loading...' 
              : isSignUp 
                ? 'Sign Up' 
                : 'Sign In'
            }
          </button>
        </form>

        {/* Toggle Sign Up / Sign In */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(78, 205, 196, 0.8)',
              cursor: 'pointer',
              fontSize: '14px',
              textDecoration: 'underline',
            }}
          >
            {isSignUp 
              ? 'Already have an account? Sign In' 
              : "Don't have an account? Sign Up"
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm; 