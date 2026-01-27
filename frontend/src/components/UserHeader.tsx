import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const UserHeader: React.FC = () => {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const formatEmail = (email: string) => {
    return email.length > 25 ? `${email.substring(0, 22)}...` : email;
  };

  return (
    <div className="user-header">
      <div className="user-avatar">
        {getInitials(user.email || 'U')}
      </div>
      
      <div className="user-info">
        <h3>Tournament Manager</h3>
        <p>{formatEmail(user.email || 'Unknown User')}</p>
      </div>

      <button
        onClick={handleSignOut}
        className="logout-btn"
        title="Sign Out"
      >
        <LogOut size={16} />
        Sign Out
      </button>
    </div>
  );
};

export default UserHeader;