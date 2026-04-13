import React from 'react';

const ControlsOverlay = ({ onClose }) => {
  const containerStyle = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(15, 23, 42, 0.95)',
    padding: '2rem',
    borderRadius: '1.5rem',
    border: '2px solid rgba(255, 122, 24, 0.5)',
    boxShadow: '0 0 30px rgba(255, 122, 24, 0.2)',
    zIndex: 2000,
    color: '#fff',
    fontFamily: "'Outfit', 'Inter', sans-serif",
    minWidth: '300px',
    textAlign: 'center',
    backdropFilter: 'blur(10px)',
  };

  const titleStyle = {
    fontSize: '2rem',
    fontWeight: '900',
    marginBottom: '1.5rem',
    textTransform: 'uppercase',
    color: '#ff7a18',
  };

  const controlRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.8rem 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  };

  const keyStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '0.2rem 0.6rem',
    borderRadius: '0.4rem',
    fontWeight: 'bold',
    color: '#ff7a18',
    border: '1px solid rgba(255, 122, 24, 0.3)',
  };

  const closeButtonStyle = {
    marginTop: '2rem',
    padding: '0.6rem 2rem',
    background: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '2rem',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  };

  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>CONTROLS</h3>
      
      <div style={controlRowStyle}>
        <span>WASD</span>
        <span style={keyStyle}>MOVE</span>
      </div>
      
      <div style={controlRowStyle}>
        <span>E</span>
        <span style={keyStyle}>MOUNT TYRE</span>
      </div>
      
      <div style={controlRowStyle}>
        <span>SPACE</span>
        <span style={keyStyle}>LAUNCH TYRE</span>
      </div>

      <button 
        style={closeButtonStyle}
        onClick={onClose}
        onMouseOver={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; }}
        onMouseOut={(e) => { e.target.style.background = 'transparent'; }}
      >
        CLOSE
      </button>
    </div>
  );
};

export default ControlsOverlay;
