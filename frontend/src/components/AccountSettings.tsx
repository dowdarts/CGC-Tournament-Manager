import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Save, 
  Eye, 
  EyeOff
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';

const AccountSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Profile form data
  const [profile, setProfile] = useState({
    displayName: '',
    email: user?.email || '',
    organization: '',
    phone: ''
  });
  
  // Password change form
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  
  useEffect(() => {
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load user profile from user_profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Profile error details:', {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
          statusCode: profileError.statusCode
        });
      }

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            display_name: user.email || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (createError) {
          console.error('❌ Create error details:', {
            message: createError.message,
            code: createError.code,
            details: createError.details,
            hint: createError.hint,
            statusCode: createError.statusCode
          });
          throw createError;
        }
        
        // Set default values
        setProfile({
          displayName: user.email || '',
          email: user.email || '',
          organization: '',
          phone: ''
        });
      } else if (profileError) {
        console.error('❌ Profile error:', profileError);
        throw profileError;
      } else if (profileData) {
        setProfile({
          displayName: profileData.display_name || '',
          email: profileData.email || user.email || '',
          organization: profileData.organization || '',
          phone: profileData.phone || ''
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user?.id,
          email: profile.email,
          display_name: profile.displayName,
          organization: profile.organization,
          phone: profile.phone,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Update auth email if changed
      if (profile.email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profile.email
        });
        
        if (emailError) throw emailError;
        setSuccess('Profile updated! Please check your email to confirm the new email address.');
      } else {
        setSuccess('Profile updated successfully!');
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match');
      setSaving(false);
      return;
    }

    if (passwords.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword
      });

      if (error) throw error;

      setSuccess('Password changed successfully!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-small loading-spinner" />
        Loading account settings...
      </div>
    );
  }

  return (
    <div className="account-settings">
      <div className="account-settings-header">
        <h2 className="text-gradient">Account Settings</h2>
        <p>Manage your profile, security, and branding preferences</p>
      </div>

      {error && (
        <div className="alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert-success">
          {success}
        </div>
      )}

      {/* Profile Information */}
      <div className="card account-section">
        <div className="section-header">
          <User size={20} />
          <h3>Profile Information</h3>
        </div>
        
        <form onSubmit={handleProfileUpdate}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                <User size={16} />
                Display Name
              </label>
              <input
                type="text"
                className="form-input"
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                placeholder="Your display name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Mail size={16} />
                Email Address
              </label>
              <input
                type="email"
                className="form-input"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Organization
              </label>
              <input
                type="text"
                className="form-input"
                value={profile.organization}
                onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                placeholder="Your organization or club"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Phone Number
              </label>
              <input
                type="tel"
                className="form-input"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="Your phone number"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary save-profile-btn"
          >
            {saving && <div className="spinner-small" />}
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Password Change */}
      <div className="card account-section">
        <div className="section-header">
          <Lock size={20} />
          <h3>Change Password</h3>
        </div>

        <form onSubmit={handlePasswordChange}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <div className="password-input-container">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  className="form-input password-input"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="password-toggle"
                >
                  {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="password-input-container">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  className="form-input password-input"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="password-toggle"
                >
                  {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="password-input-container">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  className="form-input password-input"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="password-toggle"
                >
                  {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary change-password-btn"
          >
            {saving && <div className="spinner-small" />}
            <Lock size={16} />
            {saving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountSettings;