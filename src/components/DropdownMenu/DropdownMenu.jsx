import React, { forwardRef, useState } from 'react';
import { FaChevronRight, FaCheck } from 'react-icons/fa';
import './DropdownMenu.css';

const DropdownMenu = forwardRef(({ menu, position, onItemClick }, ref) => {
  const [activeSubmenu, setActiveSubmenu] = useState(null);

  return (
    <div ref={ref} className="dropdown-menu" style={{ top: position.top, left: position.left }}>
      {menu.map((item, index) => {
        if (item.type === 'separator') {
          return <div key={index} className="dropdown-separator" />;
        }

        const hasSubmenu = Boolean(item.submenu && item.items && item.items.length > 0);

        return (
          <div
            key={item.id || index}
            className={`dropdown-item ${item.disabled ? 'disabled' : ''} ${hasSubmenu ? 'has-submenu' : ''}`}
            onMouseEnter={() => {
              if (hasSubmenu) {
                setActiveSubmenu(item.id || index);
              } else {
                setActiveSubmenu(null);
              }
            }}
            onClick={(e) => {
              if (item.disabled) return;
              if (hasSubmenu) {
                e.stopPropagation();
                return;
              }
              if (item.onClick) {
                item.onClick();
              }
              if (onItemClick && !item.preventClose) {
                onItemClick();
              }
            }}
          >
            {item.checked !== undefined ? (
              item.checked ? (
                <FaCheck className="dropdown-check-icon" style={{ marginRight: '8px', fontSize: '13px', color: '#22c55e' }} />
              ) : (
                <span className="dropdown-check-placeholder" style={{ display: 'inline-block', width: '13px', marginRight: '8px' }} />
              )
            ) : (
              item.icon
            )}
            <span className="dropdown-label">{item.label}</span>
            {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
            {hasSubmenu && <FaChevronRight className="submenu-arrow" />}

            {/* Recursive / Floating Submenu */}
            {hasSubmenu && activeSubmenu === (item.id || index) && (
              <div
                className="dropdown-submenu"
                onMouseEnter={() => setActiveSubmenu(item.id || index)}
              >
                {item.items.map((subItem, sIdx) => {
                  if (subItem.type === 'separator') {
                    return <div key={sIdx} className="dropdown-separator" />;
                  }
                  return (
                    <div
                      key={subItem.id || sIdx}
                      className={`dropdown-item ${subItem.disabled ? 'disabled' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (subItem.disabled) return;
                        if (subItem.onClick) {
                          subItem.onClick();
                        }
                        if (onItemClick) {
                          onItemClick();
                        }
                      }}
                    >
                      {subItem.icon}
                      <span className="dropdown-label">{subItem.label}</span>
                      {subItem.shortcut && <span className="shortcut">{subItem.shortcut}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

export default DropdownMenu;
