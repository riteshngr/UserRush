import React from 'react';

const BaddieSealBar = ({ health }) => {
  const isBreaking = health < 20;

  const containerStyle = {
    position: 'absolute',
    top: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '80%',
    maxWidth: '800px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    zIndex: 100,
    fontFamily: "'Outfit', 'Inter', sans-serif",
    pointerEvents: 'none',
  };

  const titleStyle = {
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: '900',
    letterSpacing: '0.3rem',
    textTransform: 'uppercase',
    textShadow: '0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 59, 59, 0.3)',
    margin: 0,
  };

  const barContainerStyle = {
    width: '100%',
    height: '24px',
    background: 'rgba(20, 20, 20, 0.8)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    padding: '3px',
    boxShadow: isBreaking 
      ? '0 0 20px rgba(255, 0, 0, 0.8)' 
      : '0 0 15px rgba(255, 80, 80, 0.4)',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(5px)',
    animation: isBreaking ? 'pulse-red 1s infinite alternate' : 'none',
  };

  const barFillStyle = {
    width: `${health}%`,
    height: '100%',
    background: 'linear-gradient(90deg, #ff3b3b, #ff7a18, #ffd93b)',
    borderRadius: '2px',
    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: 'inset 0 0 10px rgba(255, 255, 255, 0.3)',
  };

  const percentageStyle = {
    color: isBreaking ? '#ff3b3b' : '#aaa',
    fontSize: '1rem',
    fontWeight: 'bold',
    letterSpacing: '0.1rem',
    marginTop: '4px',
    textShadow: isBreaking ? '0 0 8px rgba(255, 0, 0, 0.5)' : 'none',
  };

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes pulse-red {
            from { box-shadow: 0 0 10px rgba(255, 0, 0, 0.4); border-color: rgba(255, 0, 0, 0.2); }
            to { box-shadow: 0 0 25px rgba(255, 0, 0, 0.9); border-color: rgba(255, 0, 0, 0.8); }
          }
        `}
      </style>
      <h2 style={titleStyle}>FREE THE BADDIE</h2>
      <div style={barContainerStyle}>
        <div style={barFillStyle} />
      </div>
      <div style={percentageStyle}>
        {isBreaking ? '⚠ SEAL BREAKING ⚠' : `${Math.round(health)}%`}
      </div>
    </div>
  );
};

export default BaddieSealBar;
