import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { AuthService } from './services/supabase';
import AuthForm from './components/AuthForm';
import Catalog from './Catalog';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const getUser = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error getting current user:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Listen for auth state changes
    const { data: { subscription } } = AuthService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
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
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <AuthForm onAuthSuccess={() => {}} />;
  }

  return (
    <div style={{
      height: '100vh',
      background: `
        radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(255, 107, 107, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(78, 205, 196, 0.2) 0%, transparent 50%),
        linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)
      `,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Animated background overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 60% 30%, rgba(78, 205, 196, 0.1) 0%, transparent 40%),
          radial-gradient(circle at 30% 70%, rgba(255, 107, 107, 0.1) 0%, transparent 40%)
        `,
        animation: 'float 6s ease-in-out infinite',
        pointerEvents: 'none'
      }} />

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

      {/* Header */}
      <div style={{
        padding: '40px 40px 30px 40px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(20px)',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            <h1 style={{
              margin: 0,
              fontSize: '36px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #7b68ee 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-1px',
              textShadow: '0 0 30px rgba(78, 205, 196, 0.3)',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
            }}>
              XTRACT
            </h1>
          </div>
          
          {/* User info and sign out */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            <span style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px'
            }}>
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              style={{
                background: 'rgba(255, 107, 107, 0.2)',
                border: '1px solid rgba(255, 107, 107, 0.3)',
                borderRadius: '8px',
                padding: '8px 16px',
                color: 'rgba(255, 107, 107, 0.9)',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                ...({ WebkitAppRegion: 'no-drag' } as any),
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 107, 107, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)';
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
        <p style={{
          margin: 0,
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '16px',
          fontWeight: '300',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        }}>
          Audio Sample Catalog
        </p>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative',
        zIndex: 5
      }}>
        <Catalog user={user} />
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(10px, -10px) rotate(1deg); }
          66% { transform: translate(-5px, 5px) rotate(-1deg); }
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #4ecdc4, #ff6b6b);
        }
      `}</style>
    </div>
  );
};

export default App; 