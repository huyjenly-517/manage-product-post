import React, { useState } from 'react';

const SimpleTextTest = () => {
  const [text, setText] = useState('Test text here');
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleChange = (e) => {
    addLog(`onChange: ${e.target.value}`);
    setText(e.target.value);
  };

  const handleBlur = (e) => {
    addLog(`onBlur: ${e.target.value}`);
  };

  const handleKeyUp = (e) => {
    addLog(`onKeyUp: ${e.target.value}`);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Simple Text Test</h2>
      <div style={{ marginBottom: '20px' }}>
        <label>Text Input:</label>
        <textarea
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyUp={handleKeyUp}
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '10px',
            border: '2px solid #007bff',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'white',
            color: 'black'
          }}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Current Text:</strong> {text}
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Event Logs:</strong>
        <div style={{ 
          maxHeight: '200px', 
          overflowY: 'auto', 
          border: '1px solid #ccc', 
          padding: '10px',
          backgroundColor: '#f8f9fa'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ fontSize: '12px', marginBottom: '2px' }}>{log}</div>
          ))}
        </div>
      </div>
      
      <button 
        onClick={() => setLogs([])}
        style={{
          padding: '8px 16px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Clear Logs
      </button>
    </div>
  );
};

export default SimpleTextTest; 