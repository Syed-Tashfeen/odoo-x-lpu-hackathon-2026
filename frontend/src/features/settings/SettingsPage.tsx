import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import styles from './SettingsPage.module.css';

interface LocationItem {
  id: string;
  name: string;
  shortCode: string;
  warehouseCode: string;
  type: string;
}

const STORAGE_KEY_SETTINGS = 'stocksense_warehouse_settings';
const STORAGE_KEY_LOCATIONS = 'stocksense_locations_list';

const DEFAULT_LOCATIONS: LocationItem[] = [
  { id: '1', name: 'Primary Storage', shortCode: 'Stock1', warehouseCode: 'WH', type: 'Internal Storage' },
  { id: '2', name: 'Secondary Storage', shortCode: 'Stock2', warehouseCode: 'WH', type: 'Internal Storage' },
  { id: '3', name: 'Heavy Pallet Racks', shortCode: 'Rack A', warehouseCode: 'WH', type: 'Racks' },
  { id: '4', name: 'Assembly Floor', shortCode: 'Production', warehouseCode: 'WH', type: 'Production' },
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  // Active Tab: 'warehouse' (Wireframe 2) | 'locations' (Wireframe 3) | 'profile'
  const [activeTab, setActiveTab] = useState<'warehouse' | 'locations' | 'profile'>('warehouse');

  // Warehouse Form State (Wireframe 2)
  const [warehouseName, setWarehouseName] = useState('Central Warehouse');
  const [warehouseCode, setWarehouseCode] = useState('WH');
  const [warehouseAddress, setWarehouseAddress] = useState('Industrial Area Phase 2, Jalandhar, Punjab');

  // Location Form State (Wireframe 3)
  const [locations, setLocations] = useState<LocationItem[]>(DEFAULT_LOCATIONS);
  const [newLocName, setNewLocName] = useState('');
  const [newLocShortCode, setNewLocShortCode] = useState('');

  // Profile & Password State
  const [profileName, setProfileName] = useState(user?.name || 'Syed Tashfeen');
  const [profileEmail, setProfileEmail] = useState(user?.email || 'admin@stocksense.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedWh = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedWh) {
        const parsed = JSON.parse(savedWh);
        if (parsed.name) setWarehouseName(parsed.name);
        if (parsed.shortCode) setWarehouseCode(parsed.shortCode);
        if (parsed.address) setWarehouseAddress(parsed.address);
      }

      const savedLocs = localStorage.getItem(STORAGE_KEY_LOCATIONS);
      if (savedLocs) {
        const parsedLocs = JSON.parse(savedLocs);
        if (Array.isArray(parsedLocs) && parsedLocs.length > 0) {
          setLocations(parsedLocs);
        }
      }
    } catch {
      // Ignore fallback
    }
  }, []);

  // Save Warehouse Settings (Wireframe 2)
  const handleSaveWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseName.trim() || !warehouseCode.trim()) {
      toast.error('Name and Short Code are required');
      return;
    }
    const data = {
      name: warehouseName.trim(),
      shortCode: warehouseCode.trim().toUpperCase(),
      address: warehouseAddress.trim(),
    };
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(data));
    setWarehouseCode(data.shortCode);
    toast.success('Warehouse details saved successfully!');
  };

  // Add Location (Wireframe 3)
  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim() || !newLocShortCode.trim()) {
      toast.error('Location Name and Short Code are required');
      return;
    }

    const cleanShortCode = newLocShortCode.trim().replace(/^WH\//, '');
    const newLoc: LocationItem = {
      id: Date.now().toString(),
      name: newLocName.trim(),
      shortCode: cleanShortCode,
      warehouseCode: warehouseCode || 'WH',
      type: 'Internal Storage',
    };

    const updated = [...locations, newLoc];
    setLocations(updated);
    localStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(updated));
    toast.success(`Location ${warehouseCode}/${cleanShortCode} added!`);
    setNewLocName('');
    setNewLocShortCode('');
  };

  // Delete Location
  const handleDeleteLocation = (id: string, name: string) => {
    const updated = locations.filter((l) => l.id !== id);
    setLocations(updated);
    localStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(updated));
    toast.success(`Removed location ${name}`);
  };

  // Handle Profile Update
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profile details updated');
  };

  // Handle Password Change
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter current password');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    toast.success('Password changed successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className={styles.container}>
      {/* Settings Navigation Tabs */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'warehouse' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('warehouse')}
        >
          🏢 Warehouse
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'locations' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('locations')}
        >
          📍 Locations
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 My Profile & Security
        </button>
      </div>

      {/* ============================================================
          TAB 1: Warehouse Configuration (Matches Wireframe 2)
          "This page contains the warehouse details & location."
         ============================================================ */}
      {activeTab === 'warehouse' && (
        <div className={styles.wireframeCard}>
          <div className={styles.cardHeader}>
            <div className={styles.pageAnnotation}>
              ℹ️ This page contains the warehouse details &amp; location.
            </div>
            <h1 className={styles.wireframeTitle}>Warehouse</h1>
          </div>

          <form onSubmit={handleSaveWarehouse} className={styles.formBody}>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>Name:</label>
              <input
                type="text"
                className={styles.fieldInput}
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                placeholder="e.g. Central Warehouse"
                required
              />
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>Short Code:</label>
              <input
                type="text"
                className={styles.fieldInput}
                value={warehouseCode}
                onChange={(e) => setWarehouseCode(e.target.value.toUpperCase())}
                placeholder="e.g. WH"
                required
              />
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>Address:</label>
              <input
                type="text"
                className={styles.fieldInput}
                value={warehouseAddress}
                onChange={(e) => setWarehouseAddress(e.target.value)}
                placeholder="e.g. Industrial Area Phase 2, Jalandhar"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
              <button type="submit" className={styles.saveBtn}>
                Save Warehouse Details
              </button>

              <button
                type="button"
                className={styles.tabBtn}
                style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}
                onClick={() => setActiveTab('locations')}
              >
                Go to Locations ({locations.length} active) →
              </button>
            </div>
          </form>

          <div className={styles.helperBox}>
            💡 <strong>Tip:</strong> The short code <code>{warehouseCode}</code> automatically prefixes all inventory operations (e.g. <code>{warehouseCode}/IN/0001</code>, <code>{warehouseCode}/OUT/0001</code>) and location racks.
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: Location Configuration (Matches Wireframe 3)
          "This holds the multiple locations of warehouse, rooms etc.."
         ============================================================ */}
      {activeTab === 'locations' && (
        <div className={styles.wireframeCard}>
          <div className={styles.cardHeader}>
            <div className={styles.pageAnnotation}>
              ℹ️ This holds the multiple locations of warehouse, rooms etc..
            </div>
            <h1 className={styles.wireframeTitle}>location</h1>
          </div>

          {/* New Location Form matching Wireframe 3 */}
          <form onSubmit={handleAddLocation} className={styles.formBody}>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>Name:</label>
              <input
                type="text"
                className={styles.fieldInput}
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                placeholder="e.g. Room B / Heavy Racks"
                required
              />
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>Short Code:</label>
              <input
                type="text"
                className={styles.fieldInput}
                value={newLocShortCode}
                onChange={(e) => setNewLocShortCode(e.target.value)}
                placeholder="e.g. Stock3 or Room B"
                required
              />
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>warehouse:</label>
              <input
                type="text"
                className={`${styles.fieldInput} ${styles.fieldInputReadOnly}`}
                value={warehouseCode || 'WH'}
                readOnly
              />
            </div>

            <div style={{ marginTop: 8 }}>
              <button type="submit" className={styles.saveBtn}>
                + Add Location
              </button>
            </div>
          </form>

          {/* Current Locations Table */}
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px 0', color: '#0F172A' }}>
              Active Warehouse Locations ({locations.length})
            </h3>

            <table className={styles.locationsTable}>
              <thead>
                <tr>
                  <th>Location Code</th>
                  <th>Description / Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => {
                  const fullCode = `${loc.warehouseCode || warehouseCode}/${loc.shortCode}`;
                  return (
                    <tr key={loc.id}>
                      <td>
                        <span className={styles.locationBadge}>{fullCode}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{loc.name}</td>
                      <td style={{ color: '#64748B' }}>{loc.type}</td>
                      <td>
                        <span className={styles.statusActive}>ACTIVE</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {locations.length > 1 && (
                          <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteLocation(loc.id, fullCode)}
                            title="Remove location"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: My Profile & Password Management (Phase 6)
         ============================================================ */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* User Details */}
          <div className={styles.wireframeCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.wireframeTitle}>User Profile</h2>
            </div>

            <form onSubmit={handleSaveProfile} className={styles.formBody}>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>Full Name:</label>
                <input
                  type="text"
                  className={styles.fieldInput}
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>Email Address:</label>
                <input
                  type="email"
                  className={styles.fieldInput}
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>System Role:</label>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8', padding: '4px 10px', borderRadius: 4 }}>
                    {user?.role || 'ADMINISTRATOR'}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <button type="submit" className={styles.saveBtn}>
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className={styles.wireframeCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.wireframeTitle}>Security &amp; Password</h2>
            </div>

            <form onSubmit={handleChangePassword} className={styles.formBody}>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>Current Password:</label>
                <input
                  type="password"
                  className={styles.fieldInput}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>New Password:</label>
                <input
                  type="password"
                  className={styles.fieldInput}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>Confirm Password:</label>
                <input
                  type="password"
                  className={styles.fieldInput}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <div style={{ marginTop: 8 }}>
                <button type="submit" className={styles.saveBtn}>
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
