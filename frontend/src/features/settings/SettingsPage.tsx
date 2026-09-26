import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [warehouseName, setWarehouseName] = useState('Main Warehouse');
  const [warehouseCode, setWarehouseCode] = useState('WH');
  const [locations, setLocations] = useState([
    { id: '1', name: 'WH/Stock1', type: 'Internal Storage' },
    { id: '2', name: 'WH/Rack A', type: 'Heavy Racks' },
    { id: '3', name: 'WH/Production', type: 'Assembly Floor' },
  ]);
  const [newLocName, setNewLocName] = useState('');

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;
    setLocations([
      ...locations,
      { id: Date.now().toString(), name: newLocName.trim(), type: 'Internal Storage' },
    ]);
    toast.success(`Location ${newLocName} added`);
    setNewLocName('');
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0' }}>Warehouse & System Settings</h1>
        <p style={{ color: '#64748B', margin: 0, fontSize: 14 }}>
          Configure warehouse locations, naming conventions, and inventory rules
        </p>
      </header>

      {/* Warehouse Info Card */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
          Warehouse Configuration
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Warehouse Name
            </label>
            <input
              type="text"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 14 }}
              value={warehouseName}
              onChange={(e) => setWarehouseName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Warehouse Short Code
            </label>
            <input
              type="text"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 14 }}
              value={warehouseCode}
              onChange={(e) => setWarehouseCode(e.target.value.toUpperCase())}
            />
            <span style={{ fontSize: 11, color: '#64748B', marginTop: 4, display: 'block' }}>
              Used in references like {warehouseCode}/IN/0001
            </span>
          </div>
        </div>
      </div>

      {/* Locations Management */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
          Warehouse Locations
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {locations.map((loc) => (
            <div
              key={loc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: '#F8FAFC',
                borderRadius: 6,
                border: '1px solid #E2E8F0',
              }}
            >
              <div>
                <strong style={{ fontFamily: 'monospace', color: '#714B67' }}>{loc.name}</strong>
                <span style={{ fontSize: 12, color: '#64748B', marginLeft: 12 }}>{loc.type}</span>
              </div>
              <span style={{ fontSize: 11, background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: 9999, fontWeight: 700 }}>
                ACTIVE
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddLocation} style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="e.g. WH/Zone B"
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 14 }}
            value={newLocName}
            onChange={(e) => setNewLocName(e.target.value)}
          />
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              background: '#714B67',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Add Location
          </button>
        </form>
      </div>

      {/* User Profile */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
          Current User Profile
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <span style={{ fontSize: 12, color: '#64748B', display: 'block' }}>Name</span>
            <strong style={{ fontSize: 15 }}>{user?.name || 'Syed Tashfeen'}</strong>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#64748B', display: 'block' }}>Email</span>
            <strong style={{ fontSize: 15 }}>{user?.email || 'admin@stocksense.com'}</strong>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#64748B', display: 'block' }}>Role</span>
            <span style={{ fontSize: 12, fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 4 }}>
              {user?.role || 'ADMIN'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
