import React, { useState, useEffect } from 'react';
import supabase from '../../lib/supabaseClient';

const StudentAccUpdateForm = ({ account, onClose, onAccountUpdated }) => {
  const [formData, setFormData] = useState({
    user_name: '',
    password: '',
    role: 'Student'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (account) {
      setFormData({
        user_name: account.user_name || '',
        password: '', // Don't pre-fill password for security
        role: account.role || 'Student'
      });
    }
  }, [account]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.user_name.trim()) {
      newErrors.user_name = 'Username is required';
    } else if (formData.user_name.length < 3) {
      newErrors.user_name = 'Username must be at least 3 characters';
    }

    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters if provided';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Check if username is being changed
      const usernameChanged = formData.user_name !== account.user_name;
      
      if (usernameChanged) {
        // Check if new username already exists
        const { data: existingAccount, error: checkError } = await supabase
          .from('login')
          .select('id')
          .eq('user_name', formData.user_name)
          .neq('id', account.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking username:', checkError);
          alert('Error checking username availability: ' + checkError.message);
          return;
        }

        if (existingAccount) {
          alert('Username already exists. Please choose a different username.');
          return;
        }
      }

      // Prepare update data
      const updateData = {
        user_name: formData.user_name,
        role: formData.role
      };

      // Only include password if it's provided
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      // Update login table
      const { error: loginError } = await supabase
        .from('login')
        .update(updateData)
        .eq('id', account.id);

      if (loginError) {
        console.error('Error updating account:', loginError);
        alert('Error updating account: ' + loginError.message);
        return;
      }

      // If username changed, update student table
      if (usernameChanged) {
        // First, clear the old username from student table
        await supabase
          .from('student')
          .update({ user_name: null })
          .eq('user_name', account.user_name);

        // Then, set the new username for the correct student
        await supabase
          .from('student')
          .update({ user_name: formData.user_name })
          .eq('sid', formData.user_name); // Assuming new username is student ID
      }

      alert('Account updated successfully!');
      onAccountUpdated();
    } catch (error) {
      console.error('Error:', error);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '20px', color: '#007bff', textAlign: 'center' }}>Update Student Account</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Account ID
            </label>
            <input
              type="text"
              value={account?.id || ''}
              disabled
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#f8f9fa',
                color: '#6c757d'
              }}
            />
            <span style={{ color: '#6c757d', fontSize: '12px' }}>Account ID cannot be changed</span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Username *
            </label>
            <input
              type="text"
              name="user_name"
              value={formData.user_name}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: errors.user_name ? '2px solid #dc3545' : '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              placeholder="Enter username"
            />
            {errors.user_name && (
              <span style={{ color: '#dc3545', fontSize: '12px' }}>{errors.user_name}</span>
            )}
            <span style={{ color: '#6c757d', fontSize: '12px' }}>
              Changing username will update the student link
            </span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              New Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: errors.password ? '2px solid #dc3545' : '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              placeholder="Enter new password (leave blank to keep current)"
            />
            {errors.password && (
              <span style={{ color: '#dc3545', fontSize: '12px' }}>{errors.password}</span>
            )}
            <span style={{ color: '#6c757d', fontSize: '12px' }}>
              Leave blank to keep current password. Minimum 6 characters if changing.
            </span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Role *
            </label>
            <input
              type="text"
              value="Student"
              disabled
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#f8f9fa',
                color: '#6c757d'
              }}
            />
            <span style={{ color: '#6c757d', fontSize: '12px' }}>Role cannot be changed for student accounts</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '30px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: loading ? '#cccccc' : '#007bff',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Updating...' : 'Update Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentAccUpdateForm;