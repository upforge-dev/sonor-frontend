import React, { useState } from 'react';

const MessagesIcon = ({ size = 48, className = '', onClick = undefined }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  const handleClick = () => {
    setIsActivated(!isActivated);
    onClick?.();
  };

  const isActive = isHovered || isActivated;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: isActive 
            ? 'drop-shadow(0 0 8px rgba(255,255,255,0.6))' 
            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          transition: 'filter 0.3s ease',
        }}
      >
        <style>
          {`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-2px); }
            }
            
            @keyframes dotBounce1 {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-2px); }
            }
            
            @keyframes dotBounce2 {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-3px); }
            }
            
            @keyframes dotBounce3 {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-2px); }
            }
            
            @keyframes ripple {
              0% { transform: scale(1); opacity: 0.4; }
              100% { transform: scale(1.5); opacity: 0; }
            }
            
            .icon-group {
              animation: float 3s ease-in-out infinite;
            }
            
            .icon-group.active {
              animation: none;
            }
            
            .bubble-main {
              transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            
            .bubble-main.active {
              transform: scale(1.08);
            }
            
            .dot {
              transition: all 0.2s ease;
            }
            
            .dot.active {
              animation-duration: 0.6s;
              animation-timing-function: ease-in-out;
              animation-iteration-count: infinite;
            }
            
            .dot1.active { animation-name: dotBounce1; }
            .dot2.active { animation-name: dotBounce2; animation-delay: 0.1s; }
            .dot3.active { animation-name: dotBounce3; animation-delay: 0.2s; }
            
            .ripple {
              animation: ripple 0.6s ease-out forwards;
            }
          `}
        </style>
        
        {/* Ripple effect on activation */}
        {isActive && (
          <circle
            className="ripple"
            cx="24"
            cy="22"
            r="14"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
        )}
        
        <g className={`icon-group ${isActive ? 'active' : ''}`}>
          {/* Main chat bubble */}
          <path
            className={`bubble-main ${isActive ? 'active' : ''}`}
            d="M8 12C8 9.79086 9.79086 8 12 8H36C38.2091 8 40 9.79086 40 12V28C40 30.2091 38.2091 32 36 32H28L20 40V32H12C9.79086 32 8 30.2091 8 28V12Z"
            fill="white"
            style={{
              transformOrigin: '24px 22px',
            }}
          />
          
          {/* Typing dots - Brand green gradient */}
          <g style={{ transformOrigin: '24px 20px' }}>
            <circle
              className={`dot dot1 ${isActive ? 'active' : ''}`}
              cx="16"
              cy="20"
              r="2.5"
              fill={isActive ? '#10B981' : '#94A3B8'}
              style={{
                transition: 'fill 0.3s ease',
                transformOrigin: '16px 20px',
              }}
            />
            <circle
              className={`dot dot2 ${isActive ? 'active' : ''}`}
              cx="24"
              cy="20"
              r="2.5"
              fill={isActive ? '#34D399' : '#94A3B8'}
              style={{
                transition: 'fill 0.3s ease',
                transformOrigin: '24px 20px',
              }}
            />
            <circle
              className={`dot dot3 ${isActive ? 'active' : ''}`}
              cx="32"
              cy="20"
              r="2.5"
              fill={isActive ? '#6EE7B7' : '#94A3B8'}
              style={{
                transition: 'fill 0.3s ease',
                transformOrigin: '32px 20px',
              }}
            />
          </g>
        </g>
      </svg>
    </div>
  );
};

export default MessagesIcon;
