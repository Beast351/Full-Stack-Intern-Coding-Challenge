import React, { useState, useEffect, createContext, useContext } from 'react';
import { Star, LogOut, Users, Store, BarChart3, Search, ArrowUpDown, Eye, Plus, Lock, Menu, X } from 'lucide-react';

// Auth Context
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// API Base URL
const API = 'http://localhost:5000/api';

// API Helper
const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.errors?.join(', ') || 'Error');
  return data;
};

// Validation
const validate = {
  name: (v) => v?.length >= 20 && v?.length <= 60 ? '' : 'Name: 20-60 characters',
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Invalid email',
  password: (v) => /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,16}$/.test(v) ? '' : 'Password: 8-16 chars, 1 uppercase, 1 special',
  address: (v) => !v || v.length <= 400 ? '' : 'Address: max 400 chars',
};

// Components
const Input = ({ label, error, ...props }) => (
  <div className="mb-3">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input {...props} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${error ? 'border-red-500' : 'border-gray-300'}`} />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

const Button = ({ children, variant = 'primary', ...props }) => {
  const styles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };
  return <button {...props} className={`px-4 py-2 rounded-lg font-medium transition ${styles[variant]} ${props.className || ''}`}>{children}</button>;
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>
);

const StarRating = ({ rating, onRate, interactive = false }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={20}
        className={`${n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
        onClick={() => interactive && onRate?.(n)}
      />
    ))}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

const SortableTable = ({ columns, data, onSort, sortConfig }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          {columns.map((col) => (
            <th key={col.key} className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => col.sortable && onSort(col.key)}>
                {col.label}
                {col.sortable && <ArrowUpDown size={14} className={sortConfig?.key === col.key ? 'text-blue-600' : ''} />}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y">
        {data.map((row, i) => (
          <tr key={row.id || i} className="hover:bg-gray-50">
            {columns.map((col) => (
              <td key={col.key} className="px-4 py-3 text-sm">{col.render ? col.render(row) : row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Auth Pages
const LoginPage = ({ onSwitch }) => {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(form) });
      login(data.user, data.token);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Store Rating Platform</h1>
        <form onSubmit={handleSubmit}>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button>
        </form>
        <p className="text-center mt-4 text-sm text-gray-600">
          Don't have an account? <button onClick={onSwitch} className="text-blue-600 font-medium">Sign Up</button>
        </p>
      </Card>
    </div>
  );
};

const RegisterPage = ({ onSwitch }) => {
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', address: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    setErrors({ ...errors, [field]: validate[field]?.(value) || '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = { name: validate.name(form.name), email: validate.email(form.email), password: validate.password(form.password), address: validate.address(form.address) };
    setErrors(newErrors);
    if (Object.values(newErrors).some((e) => e)) return;

    setLoading(true);
    setServerError('');
    try {
      const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(form) });
      login(data.user, data.token);
    } catch (err) {
      setServerError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
        <form onSubmit={handleSubmit}>
          <Input label="Name" value={form.name} onChange={(e) => handleChange('name', e.target.value)} error={errors.name} placeholder="Min 20 characters" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} error={errors.email} />
          <Input label="Password" type="password" value={form.password} onChange={(e) => handleChange('password', e.target.value)} error={errors.password} placeholder="8-16 chars, 1 uppercase, 1 special" />
          <Input label="Address" value={form.address} onChange={(e) => handleChange('address', e.target.value)} error={errors.address} placeholder="Max 400 characters" />
          {serverError && <p className="text-red-500 text-sm mb-3">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating...' : 'Sign Up'}</Button>
        </form>
        <p className="text-center mt-4 text-sm text-gray-600">
          Already have an account? <button onClick={onSwitch} className="text-blue-600 font-medium">Login</button>
        </p>
      </Card>
    </div>
  );
};

// Dashboard Layout
const DashboardLayout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">{title}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">{user?.name} ({user?.role})</span>
            <Button variant="secondary" onClick={logout} className="flex items-center gap-2">
              <LogOut size={16} /> Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
};

// Admin Dashboard
const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalStores: 0, totalRatings: 0 });
  const [view, setView] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [filters, setFilters] = useState({ name: '', email: '', address: '', role: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'name', order: 'asc' });
  const [modal, setModal] = useState({ type: null, data: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (view === 'users') loadUsers();
    if (view === 'stores') loadStores();
  }, [view, filters, sortConfig]);

  const loadStats = async () => {
    try {
      const data = await api('/admin/dashboard');
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...filters, sortBy: sortConfig.key, order: sortConfig.order });
      const data = await api(`/admin/users?${params}`);
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadStores = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...filters, sortBy: sortConfig.key, order: sortConfig.order });
      const data = await api(`/admin/stores?${params}`);
      setStores(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSort = (key) => {
    setSortConfig({ key, order: sortConfig.key === key && sortConfig.order === 'asc' ? 'desc' : 'asc' });
  };

  const userColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'address', label: 'Address', sortable: true },
    { key: 'role', label: 'Role', sortable: true, render: (row) => <span className={`px-2 py-1 rounded text-xs ${row.role === 'admin' ? 'bg-purple-100 text-purple-800' : row.role === 'store_owner' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{row.role}</span> },
    { key: 'rating', label: 'Rating', render: (row) => row.role === 'store_owner' ? <StarRating rating={row.rating || 0} /> : '-' },
    { key: 'actions', label: '', render: (row) => <button onClick={() => setModal({ type: 'viewUser', data: row })}><Eye size={16} className="text-gray-500 hover:text-blue-600" /></button> },
  ];

  const storeColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'address', label: 'Address', sortable: true },
    { key: 'rating', label: 'Rating', render: (row) => <StarRating rating={row.rating || 0} /> },
  ];

  return (
    <DashboardLayout title="Admin Dashboard">
      {/* Navigation */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['dashboard', 'users', 'stores'].map((v) => (
          <Button key={v} variant={view === v ? 'primary' : 'secondary'} onClick={() => setView(v)}>
            {v === 'dashboard' && <BarChart3 size={16} className="inline mr-1" />}
            {v === 'users' && <Users size={16} className="inline mr-1" />}
            {v === 'stores' && <Store size={16} className="inline mr-1" />}
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </Button>
        ))}
      </div>

      {/* Dashboard View */}
      {view === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card><div className="flex items-center gap-4"><Users size={40} className="text-blue-500" /><div><p className="text-3xl font-bold">{stats.totalUsers}</p><p className="text-gray-500">Total Users</p></div></div></Card>
          <Card><div className="flex items-center gap-4"><Store size={40} className="text-green-500" /><div><p className="text-3xl font-bold">{stats.totalStores}</p><p className="text-gray-500">Total Stores</p></div></div></Card>
          <Card><div className="flex items-center gap-4"><Star size={40} className="text-yellow-500" /><div><p className="text-3xl font-bold">{stats.totalRatings}</p><p className="text-gray-500">Total Ratings</p></div></div></Card>
        </div>
      )}

      {/* Users View */}
      {view === 'users' && (
        <Card>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-semibold">Users</h2>
            <Button onClick={() => setModal({ type: 'addUser' })}><Plus size={16} className="inline mr-1" />Add User</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <Input placeholder="Filter by name" value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
            <Input placeholder="Filter by email" value={filters.email} onChange={(e) => setFilters({ ...filters, email: e.target.value })} />
            <Input placeholder="Filter by address" value={filters.address} onChange={(e) => setFilters({ ...filters, address: e.target.value })} />
            <select className="px-3 py-2 border border-gray-300 rounded-lg" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="store_owner">Store Owner</option>
            </select>
          </div>
          <SortableTable columns={userColumns} data={users} onSort={handleSort} sortConfig={sortConfig} />
        </Card>
      )}

      {/* Stores View */}
      {view === 'stores' && (
        <Card>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-semibold">Stores</h2>
            <Button onClick={() => setModal({ type: 'addStore' })}><Plus size={16} className="inline mr-1" />Add Store</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            <Input placeholder="Filter by name" value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
            <Input placeholder="Filter by email" value={filters.email} onChange={(e) => setFilters({ ...filters, email: e.target.value })} />
            <Input placeholder="Filter by address" value={filters.address} onChange={(e) => setFilters({ ...filters, address: e.target.value })} />
          </div>
          <SortableTable columns={storeColumns} data={stores} onSort={handleSort} sortConfig={sortConfig} />
        </Card>
      )}

      {/* Modals */}
      <AddUserModal isOpen={modal.type === 'addUser'} onClose={() => setModal({ type: null })} onSuccess={() => { setModal({ type: null }); loadUsers(); loadStats(); }} />
      <AddStoreModal isOpen={modal.type === 'addStore'} onClose={() => setModal({ type: null })} onSuccess={() => { setModal({ type: null }); loadStores(); loadStats(); }} />
      <ViewUserModal isOpen={modal.type === 'viewUser'} user={modal.data} onClose={() => setModal({ type: null })} />
    </DashboardLayout>
  );
};

const AddUserModal = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', address: '', role: 'user' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = { name: validate.name(form.name), email: validate.email(form.email), password: validate.password(form.password) };
    setErrors(newErrors);
    if (Object.values(newErrors).some((e) => e)) return;

    setLoading(true);
    try {
      await api('/admin/users', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', email: '', password: '', address: '', role: 'user' });
      onSuccess();
    } catch (err) {
      setServerError(err.message);
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New User">
      <form onSubmit={handleSubmit}>
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
        <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
        <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {serverError && <p className="text-red-500 text-sm mb-3">{serverError}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Adding...' : 'Add User'}</Button>
      </form>
    </Modal>
  );
};

const AddStoreModal = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: '', email: '', address: '', ownerName: '', ownerEmail: '', ownerPassword: '', ownerAddress: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {
      name: validate.name(form.name), email: validate.email(form.email),
      ownerName: validate.name(form.ownerName), ownerEmail: validate.email(form.ownerEmail), ownerPassword: validate.password(form.ownerPassword)
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some((e) => e)) return;

    setLoading(true);
    try {
      await api('/admin/stores', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', email: '', address: '', ownerName: '', ownerEmail: '', ownerPassword: '', ownerAddress: '' });
      onSuccess();
    } catch (err) {
      setServerError(err.message);
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Store">
      <form onSubmit={handleSubmit}>
        <h4 className="font-medium mb-2">Store Details</h4>
        <Input label="Store Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <Input label="Store Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
        <Input label="Store Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <h4 className="font-medium mb-2 mt-4">Owner Details</h4>
        <Input label="Owner Name" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} error={errors.ownerName} />
        <Input label="Owner Email" type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} error={errors.ownerEmail} />
        <Input label="Owner Password" type="password" value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} error={errors.ownerPassword} />
        <Input label="Owner Address" value={form.ownerAddress} onChange={(e) => setForm({ ...form, ownerAddress: e.target.value })} />
        {serverError && <p className="text-red-500 text-sm mb-3">{serverError}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Adding...' : 'Add Store'}</Button>
      </form>
    </Modal>
  );
};

const ViewUserModal = ({ isOpen, user, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="User Details">
    {user && (
      <div className="space-y-3">
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Address:</strong> {user.address || 'N/A'}</p>
        <p><strong>Role:</strong> {user.role}</p>
        {user.role === 'store_owner' && <p><strong>Rating:</strong> <StarRating rating={user.rating || 0} /></p>}
      </div>
    )}
  </Modal>
);

// User Dashboard
const UserDashboard = () => {
  const [stores, setStores] = useState([]);
  const [filters, setFilters] = useState({ name: '', address: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'name', order: 'asc' });
  const [passwordModal, setPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStores();
  }, [filters, sortConfig]);

  const loadStores = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...filters, sortBy: sortConfig.key, order: sortConfig.order });
      const data = await api(`/stores?${params}`);
      setStores(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleRate = async (storeId, rating) => {
    try {
      await api('/ratings', { method: 'POST', body: JSON.stringify({ storeId, rating }) });
      loadStores();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSort = (key) => {
    setSortConfig({ key, order: sortConfig.key === key && sortConfig.order === 'asc' ? 'desc' : 'asc' });
  };

  return (
    <DashboardLayout title="Store Ratings">
      <div className="flex justify-end mb-4">
        <Button variant="secondary" onClick={() => setPasswordModal(true)}><Lock size={16} className="inline mr-1" />Change Password</Button>
      </div>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg" placeholder="Search by name" value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg" placeholder="Search by address" value={filters.address} onChange={(e) => setFilters({ ...filters, address: e.target.value })} />
          </div>
        </div>
        <div className="space-y-4">
          {stores.map((store) => (
            <div key={store.id} className="border rounded-lg p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <h3 className="font-semibold text-lg">{store.name}</h3>
                  <p className="text-gray-500 text-sm">{store.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Overall: {store.overall_rating || 0}/5</p>
                  <StarRating rating={store.overall_rating || 0} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between items-center flex-wrap gap-2">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Your Rating:</p>
                  <StarRating rating={store.user_rating || 0} interactive onRate={(r) => handleRate(store.id, r)} />
                </div>
                <p className="text-xs text-gray-400">{store.user_rating ? 'Click to modify' : 'Click to rate'}</p>
              </div

              import React, { useState, useEffect, createContext, useContext } from 'react';
import { Star, LogOut, Users, Store, BarChart3, Search, ArrowUpDown, Eye, Plus, Lock, Menu, X } from 'lucide-react';

// Auth Context
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// API Base URL
const API = 'http://localhost:5000/api';

// API Helper
const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.errors?.join(', ') || 'Error');
  return data;
};

// Validation
const validate = {
  name: (v) => v?.length >= 20 && v?.length <= 60 ? '' : 'Name: 20-60 characters',
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Invalid email',
  password: (v) => /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,16}$/.test(v) ? '' : 'Password: 8-16 chars, 1 uppercase, 1 special',
  address: (v) => !v || v.length <= 400 ? '' : 'Address: max 400 chars',
};

// Components
const Input = ({ label, error, ...props }) => (
  <div className="mb-3">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input {...props} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${error ? 'border-red-500' : 'border-gray-300'}`} />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

const Button = ({ children, variant = 'primary', ...props }) => {
  const styles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };
  return <button {...props} className={`px-4 py-2 rounded-lg font-medium transition ${styles[variant]} ${props.className || ''}`}>{children}</button>;
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>
);

const StarRating = ({ rating, onRate, interactive = false }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={20}
        className={`${n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
        onClick={() => interactive && onRate?.(n)}
      />
    ))}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

const SortableTable = ({ columns, data, onSort, sortConfig }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          {columns.map((col) => (
            <th key={col.key} className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => col.sortable && onSort(col.key)}>
                {col.label}
                {col.sortable && <ArrowUpDown size={14} className={sortConfig?.key === col.key ? 'text-blue-600' : ''} />}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y">
        {data.map((row, i) => (
          <tr key={row.id || i} className="hover:bg-gray-50">
            {columns.map((col) => (
              <td key={col.key} className="px-4 py-3 text-sm">{col.render ? col.render(row) : row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Auth Pages
const LoginPage = ({ onSwitch }) => {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(form) });
      login(data.user, data.token);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Store Rating Platform</h1>
        <form onSubmit={handleSubmit}>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button>
        </form>
        <p className="text-center mt-4 text-sm text-gray-600">
          Don't have an account? <button onClick={onSwitch} className="text-blue-600 font-medium">Sign Up</button>
        </p>
      </Card>
    </div>
  );
};

const RegisterPage = ({ onSwitch }) => {
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', address: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    setErrors({ ...errors, [field]: validate[field]?.(value) || '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = { name: validate.name(form.name), email: validate.email(form.email), password: validate.password(form.password), address: validate.address(form.address) };
    setErrors(newErrors);
    if (Object.values(newErrors).some((e) => e)) return;

    setLoading(true);
    setServerError('');
    try {
      const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(form) });
      login(data.user, data.token);
    } catch (err) {
      setServerError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
        <form onSubmit={handleSubmit}>
          <Input label="Name" value={form.name} onChange={(e) => handleChange('name', e.target.value)} error={errors.name} placeholder="Min 20 characters" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} error={errors.email} />
          <Input label="Password" type="password" value={form.password} onChange={(e) => handleChange('password', e.target.value)} error={errors.password} placeholder="8-16 chars, 1 uppercase, 1 special" />
          <Input label="Address" value={form.address} onChange={(e) => handleChange('address', e.target.value)} error={errors.address} placeholder="Max 400 characters" />
          {serverError && <p className="text-red-500 text-sm mb-3">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating...' : 'Sign Up'}</Button>
        </form>
        <p className="text-center mt-4 text-sm text-gray-600">
          Already have an account? <button onClick={onSwitch} className="text-blue-600 font-medium">Login</button>
        </p>
      </Card>
    </div>
  );
};

// Dashboard Layout
const DashboardLayout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">{title}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">{user?.name} ({user?.role})</span>
            <Button variant="secondary" onClick={logout} className="flex items-center gap-2">
              <LogOut size={16} /> Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
};

// Admin Dashboard
const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalStores: 0, totalRatings: 0 });
  const [view, setView] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [filters, setFilters] = useState({ name: '', email: '', address: '', role: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'name', order: 'asc' });
  const [modal, setModal] = useState({ type: null, data: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (view === 'users') loadUsers();
    if (view === 'stores') loadStores();
  }, [view, filters, sortConfig]);

  const loadStats = async () => {
    try {
      const data = await api('/admin/dashboard');
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...filters, sortBy: sortConfig.key, order: sortConfig.order });
      const data = await api(`/admin/users?${params}`);
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadStores = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...filters, sortBy: sortConfig.key, order: sortConfig.order });
      const data = await api(`/admin/stores?${params}`);
      setStores(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSort = (key) => {
    setSortConfig({ key, order: sortConfig.key === key && sortConfig.order === 'asc' ? 'desc' : 'asc' });
  };

  const userColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'address', label: 'Address', sortable: true },
    { key: 'role', label: 'Role', sortable: true, render: (row) => <span className={`px-2 py-1 rounded text-xs ${row.role === 'admin' ? 'bg-purple-100 text-purple-800' : row.role === 'store_owner' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{row.role}</span> },
    { key: 'rating', label: 'Rating', render: (row) => row.role === 'store_owner' ? <StarRating rating={row.rating || 0} /> : '-' },
    { key: 'actions', label: '', render: (row) => <button onClick={() => setModal({ type: 'viewUser', data: row })}><Eye size={16} className="text-gray-500 hover:text-blue-600" /></button> },
  ];

  const storeColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'address', label: 'Address', sortable: true },
    { key: 'rating', label: 'Rating', render: (row) => <StarRating rating={row.rating || 0} /> },
  ];

  return (
    <DashboardLayout title="Admin Dashboard">
      {/* Navigation */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['dashboard', 'users', 'stores'].map((v) => (
          <Button key={v} variant={view === v ? 'primary' : 'secondary'} onClick={() => setView(v)}>
            {v === 'dashboard' && <BarChart3 size={16} className="inline mr-1" />}
            {v === 'users' && <Users size={16} className="inline mr-1" />}
            {v === 'stores' && <Store size={16} className="inline mr-1" />}
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </Button>
        ))}
      </div>

      {/* Dashboard View */}
      {view === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card><div className="flex items-center gap-4"><Users size={40} className="text-blue-500" /><div><p className="text-3xl font-bold">{stats.totalUsers}</p><p className="text-gray-500">Total Users</p></div></div></Card>
          <Card><div className="flex items-center gap-4"><Store size={40} className="text-green-500" /><div><p className="text-3xl font-bold">{stats.totalStores}</p><p className="text-gray-500">Total Stores</p></div></div></Card>
          <Card><div className="flex items-center gap-4"><Star size={40} className="text-yellow-500" /><div><p className="text-3xl font-bold">{stats.totalRatings}</p><p className="text-gray-500">Total Ratings</p></div></div></Card>
        </div>
      )}

      {/* Users View */}
      {view === 'users' && (
        <Card>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-semibold">Users</h2>
            <Button onClick={() => setModal({ type: 'addUser' })}><Plus size={16} className="inline mr-1" />Add User</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <Input placeholder="Filter by name" value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
            <Input placeholder="Filter by email" value={filters.email} onChange={(e) => setFilters({ ...filters, email: e.target.value })} />
            <Input placeholder="Filter by address" value={filters.address} onChange={(e) => setFilters({ ...filters, address: e.target.value })} />
            <select className="px-3 py-2 border border-gray-300 rounded-lg" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="store_owner">Store Owner</option>
            </select>
          </div>
          <SortableTable columns={userColumns} data={users} onSort={handleSort} sortConfig={sortConfig} />
        </Card>
      )}

      {/* Stores View */}
      {view === 'stores' && (
        <Card>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-semibold">Stores</h2>
            <Button onClick={() => setModal({ type: 'addStore' })}><Plus size={16} className="inline mr-1" />Add Store</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            <Input placeholder="Filter by name" value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
            <Input placeholder="Filter by email" value={filters.email} onChange={(e) => setFilters({ ...filters, email: e.target.value })} />
            <Input placeholder="Filter by address" value={filters.address} onChange={(e) => setFilters({ ...filters, address: e.target.value })} />
          </div>
          <SortableTable columns={storeColumns} data={stores} onSort={handleSort} sortConfig={sortConfig} />
        </Card>
      )}

      {/* Modals */}
      <AddUserModal isOpen={modal.type === 'addUser'} onClose={() => setModal({ type: null })} onSuccess={() => { setModal({ type: null }); loadUsers(); loadStats(); }} />
      <AddStoreModal isOpen={modal.type === 'addStore'} onClose={() => setModal({ type: null })} onSuccess={() => { setModal({ type: null }); loadStores(); loadStats(); }} />
      <ViewUserModal isOpen={modal.type === 'viewUser'} user={modal.data} onClose={() => setModal({ type: null })} />
    </DashboardLayout>
  );
};

const AddUserModal = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', address: '', role: 'user' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = { name: validate.name(form.name), email: validate.email(form.email), password: validate.password(form.password) };
    setErrors(newErrors);
    if (Object.values(newErrors).some((e) => e)) return;

    setLoading(true);
    try {
      await api('/admin/users', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', email: '', password: '', address: '', role: 'user' });
      onSuccess();
    } catch (err) {
      setServerError(err.message);
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New User">
      <form onSubmit={handleSubmit}>
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
        <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
        <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {serverError && <p className="text-red-500 text-sm mb-3">{serverError}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Adding...' : 'Add User'}</Button>
      </form>
    </Modal>
  );
};

const AddStoreModal = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: '', email: '', address: '', ownerName: '', ownerEmail: '', ownerPassword: '', ownerAddress: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {
      name: validate.name(form.name), email: validate.email(form.email),
      ownerName: validate.name(form.ownerName), ownerEmail: validate.email(form.ownerEmail), ownerPassword: validate.password(form.ownerPassword)
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some((e) => e)) return;

    setLoading(true);
    try {
      await api('/admin/stores', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', email: '', address: '', ownerName: '', ownerEmail: '', ownerPassword: '', ownerAddress: '' });
      onSuccess();
    } catch (err) {
      setServerError(err.message);
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Store">
      <form onSubmit={handleSubmit}>
        <h4 className="font-medium mb-2">Store Details</h4>
        <Input label="Store Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <Input label="Store Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
        <Input label="Store Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <h4 className="font-medium mb-2 mt-4">Owner Details</h4>
        <Input label="Owner Name" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} error={errors.ownerName} />
        <Input label="Owner Email" type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} error={errors.ownerEmail} />
        <Input label="Owner Password" type="password" value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} error={errors.ownerPassword} />
        <Input label="Owner Address" value={form.ownerAddress} onChange={(e) => setForm({ ...form, ownerAddress: e.target.value })} />
        {serverError && <p className="text-red-500 text-sm mb-3">{serverError}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Adding...' : 'Add Store'}</Button>
      </form>
    </Modal>
  );
};

const ViewUserModal = ({ isOpen, user, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="User Details">
    {user && (
      <div className="space-y-3">
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Address:</strong> {user.address || 'N/A'}</p>
        <p><strong>Role:</strong> {user.role}</p>
        {user.role === 'store_owner' && <p><strong>Rating:</strong> <StarRating rating={user.rating || 0} /></p>}
      </div>
    )}
  </Modal>
);

// User Dashboard
const UserDashboard = () => {
  const [stores, setStores] = useState([]);
  const [filters, setFilters] = useState({ name: '', address: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'name', order: 'asc' });
  const [passwordModal, setPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStores();
  }, [filters, sortConfig]);

  const loadStores = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...filters, sortBy: sortConfig.key, order: sortConfig.order });
      const data = await api(`/stores?${params}`);
      setStores(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleRate = async (storeId, rating) => {
    try {
      await api('/ratings', { method: 'POST', body: JSON.stringify({ storeId, rating }) });
      loadStores();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSort = (key) => {
    setSortConfig({ key, order: sortConfig.key === key && sortConfig.order === 'asc' ? 'desc' : 'asc' });
  };

  return (
    <DashboardLayout title="Store Ratings">
      <div className="flex justify-end mb-4">
        <Button variant="secondary" onClick={() => setPasswordModal(true)}><Lock size={16} className="inline mr-1" />Change Password</Button>
      </div>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg" placeholder="Search by name" value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg" placeholder="Search by address" value={filters.address} onChange={(e) => setFilters({ ...filters, address: e.target.value })} />
          </div>
        </div>
        <div className="space-y-4">
          {stores.map((store) => (
            <div key={store.id} className="border rounded-lg p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <h3 className="font-semibold text-lg">{store.name}</h3>
                  <p className="text-gray-500 text-sm">{store.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Overall: {store.overall_rating || 0}/5</p>
                  <StarRating rating={store.overall_rating || 0} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between items-center flex-wrap gap-2">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Your Rating:</p>
                  <StarRating rating={store.user_rating || 0} interactive onRate={(r) => handleRate(store.id, r)} />
                </div>
                <p className="text-xs text-gray-400">{store.user_rating ? 'Click to modify' : 'Click to rate'}</p>
              </div>
            </div>
          ))}
          {stores.length === 0 && <p className="text-center text-gray-500 py-8">No stores found</p>}
        </div>
      </Card>
      <ChangePasswordModal isOpen={passwordModal} onClose={() => setPasswordModal(false)} />
    </DashboardLayout>
  );
};

// Store Owner Dashboard
const StoreOwnerDashboard = () => {
  const [data, setData] = useState({ averageRating: 0, ratings: [] });
  const [passwordModal, setPasswordModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const result = await api('/owner/dashboard');
      setData(result);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <DashboardLayout title="Store Owner Dashboard">
      <div className="flex justify-end mb-4">
        <Button variant="secondary" onClick={() => setPasswordModal(true)}><Lock size={16} className="inline mr-1" />Change Password</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="text-lg font-semibold mb-4">Average Rating</h3>
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold text-yellow-500">{data.averageRating}</span>
            <StarRating rating={Math.round(data.averageRating)} />
          </div>
          <p className="text-gray-500 mt-2">Based on {data.ratings.length} ratings</p>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold mb-4">Rating Distribution</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((n) => {
              const count = data.ratings.filter((r) => r.rating === n).length;
              const pct = data.ratings.length ? (count / data.ratings.length) * 100 : 0;
              return (
                <div key={n} className="flex items-center gap-2">
                  <span className="w-4 text-sm">{n}</span>
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm text-gray-500 w-8">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <Card>
        <h3 className="text-lg font-semibold mb-4">User Ratings</h3>
        {data.ratings.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No ratings yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Rating</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.ratings.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{r.name}</td>
                    <td className="px-4 py-3 text-sm">{r.email}</td>
                    <td className="px-4 py-3"><StarRating rating={r.rating} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(r.updated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <ChangePasswordModal isOpen={passwordModal} onClose={() => setPasswordModal(false)} />
    </DashboardLayout>
  );
};

// Change Password Modal
const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pwError = validate.password(form.newPassword);
    if (pwError) return setError(pwError);

    setLoading(true);
    setError('');
    try {
      await api('/auth/password', { method: 'PUT', body: JSON.stringify(form) });
      setSuccess(true);
      setForm({ currentPassword: '', newPassword: '' });
      setTimeout(() => { setSuccess(false); onClose(); }, 1500);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Password">
      {success ? (
        <div className="text-center py-4">
          <p className="text-green-600 font-medium">Password updated successfully!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Input label="Current Password" type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
          <Input label="New Password" type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required />
          <p className="text-xs text-gray-500 mb-3">8-16 chars, 1 uppercase, 1 special character</p>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</Button>
        </form>
      )}
    </Modal>
  );
};

// Main App
export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authView, setAuthView] = useState('login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {!user ? (
        authView === 'login' ? <LoginPage onSwitch={() => setAuthView('register')} /> : <RegisterPage onSwitch={() => setAuthView('login')} />
      ) : user.role === 'admin' ? (
        <AdminDashboard />
      ) : user.role === 'store_owner' ? (
        <StoreOwnerDashboard />
      ) : (
        <UserDashboard />
      )}
    </AuthContext.Provider>
  );
}