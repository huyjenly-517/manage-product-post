import React, { useState } from 'react';

export default function ProductQuickviewConfig() {
  const [config, setConfig] = useState({
    enabled: true,
    position: 'below', // 'above' or 'below'
    show: {
      price: true,
      button: true,
      description: true,
      variant: true,
    },
  });

  const handleToggle = (field) => {
    setConfig((prev) => ({
      ...prev,
      show: {
        ...prev.show,
        [field]: !prev.show[field],
      },
    }));
  };

  const handlePositionChange = (e) => {
    setConfig((prev) => ({
      ...prev,
      position: e.target.value,
    }));
  };

  const handleEnabledToggle = () => {
    setConfig((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  };

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>⚙️ Cấu hình Quickview sản phẩm</h2>

      {/* Bật/tắt Quickview */}
      <div style={styles.section}>
        <label>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={handleEnabledToggle}
          />
          <span style={styles.label}> Bật Quickview</span>
        </label>
      </div>

      {/* Vị trí hiển thị */}
      <div style={styles.section}>
        <label style={styles.label}>Vị trí hiển thị Quickview:</label>
        <select
          value={config.position}
          onChange={handlePositionChange}
          style={styles.select}
        >
          <option value="above">Trên ảnh sản phẩm</option>
          <option value="below">Dưới ảnh sản phẩm</option>
        </select>
      </div>

      {/* Các thành phần hiển thị */}
      <div style={styles.section}>
        <label>
          <input
            type="checkbox"
            checked={config.show.price}
            onChange={() => handleToggle('price')}
          />
          <span style={styles.label}> Hiển thị Giá</span>
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={config.show.button}
            onChange={() => handleToggle('button')}
          />
          <span style={styles.label}> Hiển thị Nút Mua</span>
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={config.show.description}
            onChange={() => handleToggle('description')}
          />
          <span style={styles.label}> Hiển thị Mô tả</span>
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={config.show.variant}
            onChange={() => handleToggle('variant')}
          />
          <span style={styles.label}> Hiển thị Biến thể</span>
        </label>
      </div>

      {/* Hiển thị cấu hình hiện tại (cho dev/debug) */}
      <pre style={styles.codeBlock}>
        {JSON.stringify(config, null, 2)}
      </pre>
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: '500px',
    margin: '2rem auto',
    padding: '1.5rem',
    border: '1px solid #ccc',
    borderRadius: '8px',
    fontFamily: 'sans-serif',
    backgroundColor: '#fafafa',
  },
  title: {
    marginBottom: '1rem',
  },
  section: {
    marginBottom: '1rem',
  },
  label: {
    marginLeft: '0.5rem',
  },
  select: {
    display: 'block',
    marginTop: '0.5rem',
    padding: '0.25rem',
  },
  codeBlock: {
    marginTop: '2rem',
    background: '#eee',
    padding: '1rem',
    borderRadius: '4px',
    fontSize: '14px',
  },
};