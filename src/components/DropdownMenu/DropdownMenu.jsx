import React, { forwardRef } from 'react';
import './DropdownMenu.css';

const DropdownMenu = forwardRef(({ menu, position }, ref) => {
  return (
    <div ref={ref} className="dropdown-menu" style={{ top: position.top, left: position.left }}>
      {menu.map((item, index) => {
        if (item.type === 'separator') {
          return <div key={index} className="dropdown-separator" />;
        }
        return (
          <div
            key={index}
            className={`dropdown-item ${item.disabled ? 'disabled' : ''}`}
            onClick={() => {
              if (item.disabled) return;
              if (item.onClick) {
                item.onClick();
              }
            }}
          >
            {item.icon}
            <span>{item.label}</span>
            <span className="shortcut">{item.shortcut}</span>
          </div>
        );
      })}
    </div>
  );
});

export default DropdownMenu;
