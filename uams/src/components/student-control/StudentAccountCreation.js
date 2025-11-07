import React, { useState, useEffect, useCallback } from 'react';
import DashboardNavBar from '../DashboardNavBar';
import StudentAccCreateForm from './StudentAccCreateForm';
import StudentAccUpdateForm from './StudentAccUpdateForm';
import supabase from '../../lib/supabaseClient';

const StudentAccountCreation = () => {
  const [showForm, setShowForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('login')
        .select('*')
        .eq('role', 'Student')
        .order('id');

      if (error) {
        console.error('Error fetching accounts:', error);
      } else {
        const accountsData = data || [];
        setAllAccounts(accountsData);
        setAccounts(accountsData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...allAccounts];

    // Filter by search term (username)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(account => 
        account.user_name.toLowerCase().includes(searchLower)
      );
    }

    setAccounts(filtered);
  }, [allAccounts, searchTerm]);

  // Apply filters when filters or search term change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleAccountCreated = () => {
    setShowForm(false);
    fetchAccounts(); // Refresh the list
  };

  const handleAccountUpdated = () => {
    setShowUpdateForm(false);
    setSelectedAccount(null);
    fetchAccounts(); // Refresh the list
  };

  const handleUpdateClick = (account) => {
    setSelectedAccount(account);
    setShowUpdateForm(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
  };

  return (
    <div className="dashboard-page">
      <DashboardNavBar />
      
      <div className="dashboard" style={{ marginTop: '60px' }}>
        <h1>Student Account Creation</h1>
        
        <div className="dashboard-content">
          {/* Search Bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <span style={{ fontWeight: 'bold', color: '#342D2D', minWidth: 'fit-content' }}>🔍 Search:</span>
              <input
                type="text"
                placeholder="Search by Username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 15px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  maxWidth: '400px'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#28a745';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#ddd';
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#f8f9fa',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#666'
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <button
              onClick={() => setShowForm(true)}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Create Student Account
            </button>
            
            {searchTerm && (
              <button
                onClick={clearFilters}
                style={{
                  padding: '8px 15px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Clear Search
              </button>
            )}
          </div>

          {showForm && (
            <StudentAccCreateForm
              onClose={() => setShowForm(false)}
              onAccountCreated={handleAccountCreated}
            />
          )}

          {showUpdateForm && selectedAccount && (
            <StudentAccUpdateForm
              account={selectedAccount}
              onClose={() => {
                setShowUpdateForm(false);
                setSelectedAccount(null);
              }}
              onAccountUpdated={handleAccountUpdated}
            />
          )}

          <div className="accounts-list">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <h2 style={{ margin: 0 }}>Student Accounts</h2>
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Showing {accounts.length} of {allAccounts.length} accounts
              </div>
            </div>
            
            {loading ? (
              <p>Loading accounts...</p>
            ) : accounts.length === 0 ? (
              <p>
                {allAccounts.length === 0 
                  ? "No accounts created yet." 
                  : "No accounts match the current filters."
                }
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginTop: '20px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#28a745', color: 'white' }}>
                      <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>ID</th>
                      <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Username</th>
                      <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Role</th>
                      <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account, index) => (
                      <tr 
                        key={account.id}
                        style={{ 
                          backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
                        }}
                      >
                        <td style={{ padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold' }}>
                          {account.id}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          {account.user_name}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              color: 'white',
                              backgroundColor: '#007bff'
                            }}
                          >
                            Student
                          </span>
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            <button
                              style={{
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                              onClick={() => handleUpdateClick(account)}
                              title="Update account details"
                            >
                              Edit
                            </button>
                            <button
                              style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete account ${account.user_name}?`)) {
                                try {
                                  // First, remove user_name from student table if it exists
                                  await supabase
                                    .from('student')
                                    .update({ user_name: null })
                                    .eq('user_name', account.user_name);

                                  // Then delete from login table
                                  const { error } = await supabase
                                    .from('login')
                                    .delete()
                                    .eq('id', account.id);

                                  if (error) {
                                    console.error('Error deleting account:', error);
                                    alert('Error deleting account: ' + error.message);
                                  } else {
                                    alert('Account deleted successfully!');
                                    fetchAccounts(); // Refresh the list
                                  }
                                } catch (error) {
                                  console.error('Error:', error);
                                  alert('An unexpected error occurred');
                                }
                              }
                            }}
                            title="Delete account"
                          >
                            Delete
                          </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAccountCreation;