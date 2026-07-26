import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import API from '../services/api';
import { showError } from '../utils/Toast';
import { useApi } from '../hooks/useApi';
import AuthLayout from '../components/AuthLayout';
import { LoadingSpinner } from '../components/StateComponents';
import ErrorBoundary from '../components/ErrorBoundary';

function ThemeToggle() {
  const { theme, toggleTheme } = useAuth();

  return (
    <div className="theme-toggle-container" style={{ textAlign: 'right', marginBottom: '1rem' }}>
      <button
        onClick={toggleTheme}
        className="submit-btn"
        style={{ width: 'auto', padding: '8px 16px' }}
      >
        Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
      </button>
    </div>
  );
}

function ProfileUpdateForm({ user, onUpdate }) {
  const [formData, setFormData] = useState({
    username: user.username || '',
    email: user.email || '',
    business_name: user.business_name || '',
    phone: user.phone || '',
    monthly_budget: user.monthly_budget || '',
  });
  
  const { loading, error, execute, reset } = useApi();
  const { loading: avatarLoading, execute: executeAvatar } = useApi();
  const [validationError, setValidationError] = useState('');
  const displayError = validationError || error;

  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (displayError) {
      setValidationError('');
      reset();
    }
  };

  useEffect(() => {
    if (user.avatar) {
      setAvatarPreview(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}${user.avatar}`);
    }
  }, [user.avatar]);

  const handleAvatarClick = () => {
    if (avatarLoading) return;
    fileInputRef.current.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB
      showError("File is too large. Maximum size is 5MB.");
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setAvatarPreview(localPreviewUrl);

    const formData = new FormData();
    formData.append('avatar', file);

    await executeAvatar(
      () => API.auth.uploadAvatar(formData),
      {
        loadingMessage: 'Uploading avatar...',
        successMessage: 'Avatar updated!',
        onSuccess: (responseData) => onUpdate(responseData?.data?.user),
        onError: () => {
          setAvatarPreview(user.avatar ? `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}${user.avatar}` : null);
        }
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    reset();

    const payload = {
      username: formData.username,
      email: formData.email,
    };
    
    if (user.role === 'business') {
      payload.business_name = formData.business_name;
      payload.phone = formData.phone;
    } else {
      payload.monthly_budget = formData.monthly_budget;
    }
    
    await execute(
      () => API.auth.updateProfile(payload),
      {
        loadingMessage: 'Saving changes...',
        successMessage: 'Profile updated successfully!',
        onSuccess: (responseData) => onUpdate(responseData?.data?.user)
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h3 className="form-section-title">Update Profile</h3>

      <div className="avatar-upload-container">
        <div className="avatar-wrapper" onClick={handleAvatarClick}>
          <img
            src={avatarPreview || '/default-avatar.png'}
            alt="User Avatar"
            className="profile-avatar"
          />
          <div className="avatar-overlay">
            {avatarLoading ? <LoadingSpinner size="small" /> : <span>Change</span>}
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarChange}
          accept="image/png, image/jpeg, image/gif, image/webp"
          style={{ display: 'none' }}
        />
      </div>

      {displayError && <div className="error-message">{displayError}</div>}
      <div className="form-group">
        <label className="form-label">Username</label>
        <input
          type="text"
          name="username"
          className="form-input"
          value={formData.username}
          onChange={handleChange}
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input
          type="email"
          name="email"
          className="form-input"
          value={formData.email}
          onChange={handleChange}
          disabled={loading}
        />
      </div>
      {user.role === 'business' && (
        <>
          <div className="form-group">
            <label className="form-label">Business Name</label>
            <input
              type="text"
              name="business_name"
              className="form-input"
              value={formData.business_name}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              type="tel"
              name="phone"
              className="form-input"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
        </>
      )}
      {user.role === 'student' && (
        <div className="form-group">
          <label className="form-label">Monthly Budget</label>
          <input
            type="number"
            name="monthly_budget"
            className="form-input"
            value={formData.monthly_budget}
            onChange={handleChange}
            disabled={loading}
          />
        </div>
      )}
      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}

function PasswordChangeForm() {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const { loading, error, execute, reset } = useApi();
  const [validationError, setValidationError] = useState('');
  const displayError = validationError || error;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (displayError) {
      setValidationError('');
      reset();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    reset();

    if (formData.newPassword !== formData.confirmPassword) {
      return setValidationError('New passwords do not match.');
    }
    if (formData.newPassword.length < 4) {
      return setValidationError('New password must be at least 4 characters.');
    }
    
    await execute(
      () => API.auth.changePassword({
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      }),
      {
        loadingMessage: 'Changing password...',
        successMessage: 'Password changed successfully!',
        onSuccess: () => {
          setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        }
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '2rem' }}>
      <h3 className="form-section-title">Change Password</h3>
      {displayError && <div className="error-message">{displayError}</div>}
      <div className="form-group">
        <label className="form-label">Current Password</label>
        <input
          type="password"
          name="oldPassword"
          className="form-input"
          value={formData.oldPassword}
          onChange={handleChange}
          disabled={loading}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label">New Password</label>
        <input
          type="password"
          name="newPassword"
          className="form-input"
          value={formData.newPassword}
          onChange={handleChange}
          disabled={loading}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label">Confirm New Password</label>
        <input
          type="password"
          name="confirmPassword"
          className="form-input"
          value={formData.confirmPassword}
          onChange={handleChange}
          disabled={loading}
          required
        />
      </div>
      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? 'Changing...' : 'Change Password'}
      </button>
    </form>
  );
}

export default function ProfilePage() {
  const { user, updateUser, loading } = useAuth();

  if (loading) {
    return <AuthLayout title="Loading Profile..."><p>Please wait...</p></AuthLayout>;
  }

  if (!user) {
    return <AuthLayout title="Not Authenticated"><p>Please log in to view your profile.</p></AuthLayout>;
  }

  return (
    <AuthLayout title="My Profile">
      <ThemeToggle />
      <div className="profile-container">
        <ErrorBoundary>
          <ProfileUpdateForm user={user} onUpdate={updateUser} />
        </ErrorBoundary>
        <ErrorBoundary>
          <PasswordChangeForm />
        </ErrorBoundary>
      </div>
    </AuthLayout>
  );
}