import React, { useState, useMemo } from 'react';
import './DockSidebar.css';
import TestChargeMenu from '../Toolbar/ToolbarPopup/TestChargeMenu';
import SlicerMenu from '../Toolbar/ToolbarPopup/SlicerMenu';
import EFieldMenu from '../Toolbar/ToolbarPopup/EFieldMenu';
import GaussianMenu from '../Toolbar/ToolbarPopup/GaussianMenu';
import TestChargeIcon from '../../../assets/lowercase_q2.svg';
import SliceIcon from '../../../assets/slice.svg';
import FieldViewIcon from '../../../assets/field_view.svg';
import GaussianIcon from '../../../assets/gaussian_surface.svg';

/**
 * Tool Registry - Add new tools here without modifying component logic
 */
const TOOL_REGISTRY = {
  TestCharge: { 
    component: TestChargeMenu, 
    icon: TestChargeIcon,
    label: 'Test Charge'
  },
  Slice: { 
    component: SlicerMenu, 
    icon: SliceIcon,
    label: 'Slicer'
  },
  EField: { 
    component: EFieldMenu, 
    icon: FieldViewIcon,
    label: 'Field View'
  },
  Gaussian: { 
    component: GaussianMenu, 
    icon: GaussianIcon,
    label: 'Gaussian'
  }
};

/**
 * DockSidebar - Dynamic Island-style floating dock on the left
 * @param {Object} props
 * @param {Object} props.dockedWindows - { TestCharge: true, Slice: false, ... }
 * @param {Function} props.onUndock - Callback to undock a window back to floating
 * @param {Array} props.tabOrder - Order of tabs for user organization
 * @param {Function} props.setTabOrder - Update tab order
 * @param {Object} props.windowProps - Props for all windows { TestCharge: {...}, Slice: {...}, ... }
 */
export default function DockSidebar({
  dockedWindows,
  onUndock,
  tabOrder,
  setTabOrder,
  windowProps = {},
  // Legacy props (deprecated - use windowProps instead)
  testChargeProps,
  slicerProps,
  efieldProps,
  gaussianProps,
}) {
  // Merge legacy props with windowProps for backward compatibility
  const mergedWindowProps = useMemo(() => ({
    TestCharge: windowProps.TestCharge || testChargeProps,
    Slice: windowProps.Slice || slicerProps,
    EField: windowProps.EField || efieldProps,
    Gaussian: windowProps.Gaussian || gaussianProps,
    ...windowProps
  }), [windowProps, testChargeProps, slicerProps, efieldProps, gaussianProps]);

  const [draggedTab, setDraggedTab] = useState(null);
  const [dragOverTab, setDragOverTab] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // 'before' or 'after'
  
  // Initialize expanded state based on docked windows
  const [expandedWindows, setExpandedWindows] = useState(() => 
    Object.keys(TOOL_REGISTRY).reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );
  
  const [isHovered, setIsHovered] = useState(false); // Track hover state for island expansion
  
  // Get list of docked window names in user-defined order
  const dockedWindowNames = tabOrder.filter(name => dockedWindows[name]);

  // If no windows docked, show collapsed state (minimal island)
  const isCollapsed = dockedWindowNames.length === 0;

  // Toggle expanded state for a window
  const toggleExpanded = (windowName) => {
    setExpandedWindows(prev => ({ ...prev, [windowName]: !prev[windowName] }));
  };

  const shouldShowDropLine = (windowName, position) => {
    if (!draggedTab || !dragOverTab) return false;
    
    // Don't show line if it's the same position where the item already is
    const currentIdx = tabOrder.indexOf(draggedTab);
    const targetIdx = tabOrder.indexOf(windowName);
    
    if (position === 'before' && currentIdx === targetIdx - 1) return false;
    if (position === 'after' && currentIdx === targetIdx + 1) return false;
    if (currentIdx === targetIdx) return false;
    
    return true;
  };

  // Tab drag handlers for reordering and undocking
  const handleTabDragStart = (e, windowName) => {
    setDraggedTab(windowName);
    e.dataTransfer.effectAllowed = 'move';
    // Store the window name in dataTransfer for safer comparison
    e.dataTransfer.setData('text/plain', windowName);
  };

  const handleTabDragOver = (e, windowName) => {
    e.preventDefault();
    if (draggedTab && draggedTab !== windowName) {
      setDragOverTab(windowName);
      
      // Calculate if we should drop before or after this item
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      setDropPosition(e.clientY < midpoint ? 'before' : 'after');
    }
  };

  const performReorder = () => {
    if (!draggedTab || !dragOverTab || !dropPosition) return;

    const newOrder = [...tabOrder];
    const draggedIdx = newOrder.indexOf(draggedTab);
    newOrder.splice(draggedIdx, 1);
    
    let insertIdx = newOrder.indexOf(dragOverTab);
    if (dropPosition === 'after') {
      insertIdx += 1;
    }
    
    newOrder.splice(insertIdx, 0, draggedTab);
    setTabOrder(newOrder);
  };

  const handleDrop = (e, targetName) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Use state comparison instead of DOM text comparison
    if (draggedTab && draggedTab !== targetName) {
      performReorder();
    }
    
    setDraggedTab(null);
    setDragOverTab(null);
    setDropPosition(null);
  };

  const handleTabDragEnd = (e, windowName) => {
    // Check if dragged outside by comparing mouse position to viewport bounds
    // More reliable than getBoundingClientRect during animations
    const threshold = 100; // pixels from left edge
    const isOutsideDock = e.clientX > threshold;
    
    if (isOutsideDock && draggedTab) {
      // Pass the position where the drag ended, clamped to keep window visible
      const position = {
        left: Math.max(20, e.clientX - 150),
        top: Math.max(20, e.clientY - 20)
      };
      setExpandedWindows(prev => ({ ...prev, [windowName]: false }));
      setIsHovered(false);
      onUndock(windowName, position);
    }
    
    setDraggedTab(null);
    setDragOverTab(null);
    setDropPosition(null);
  };

  const handleContentDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Render content for specific window using registry
  const renderWindowContent = (windowName) => {
    const tool = TOOL_REGISTRY[windowName];
    if (!tool) return null;
    
    const ToolComponent = tool.component;
    const props = mergedWindowProps[windowName] || {};
    
    return <ToolComponent {...props} />;
  };

  return (
    <div 
      className={`dock-sidebar ${isCollapsed ? 'collapsed' : ''} ${isHovered ? 'expanded' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Icon badges container (visible when NOT expanded) */}
      {!isHovered && !isCollapsed && (
        <div className="dock-island-badges">
          {dockedWindowNames.map((windowName) => {
            const tool = TOOL_REGISTRY[windowName];
            if (!tool) return null;
            
            return (
              <div
                key={windowName}
                className="dock-badge"
                title={tool.label}
              >
                <img src={tool.icon} alt={tool.label} className="dock-badge-icon" />
              </div>
            );
          })}
        </div>
      )}

      {/* Collapsed empty state */}
      {isCollapsed && (
        <div className="dock-island-badges">
          <div className="dock-empty-indicator">∅</div>
        </div>
      )}

      {/* Expanded content (visible on hover) */}
      {isHovered && !isCollapsed && (
        <div 
          className="dock-content"
          onDragOver={handleContentDragOver}
          onDrop={(e) => handleDrop(e, null)}
        >
        {dockedWindowNames.map((windowName) => {
          const tool = TOOL_REGISTRY[windowName];
          if (!tool) return null;
          
          return (
            <div key={windowName} className="dock-window-section">
              {/* Drop line indicator above */}
              {dragOverTab === windowName && dropPosition === 'before' && shouldShowDropLine(windowName, 'before') && (
                <div className="drop-line" />
              )}
              
              {/* Window header - clicking toggles expansion */}
              <div
                className={`dock-window-header ${draggedTab === windowName ? 'dragging' : ''}`}
                onClick={() => toggleExpanded(windowName)}
                draggable
                onDragStart={(e) => handleTabDragStart(e, windowName)}
                onDragOver={(e) => handleTabDragOver(e, windowName)}
                onDrop={(e) => handleDrop(e, windowName)}
                onDragEnd={(e) => handleTabDragEnd(e, windowName)}
              >
                <span className="dock-window-expand">
                  {expandedWindows[windowName] ? "▾" : "▸"}
                </span>
                <span className="dock-window-title">{tool.label}</span>
                <button
                  className="dock-window-undock"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedWindows(prev => ({ ...prev, [windowName]: false }));
                    onUndock(windowName);
                  }}
                  title="Pop out"
                >
                  ⇱
                </button>
              </div>
              
              {/* Window content */}
              {expandedWindows[windowName] && (
                <div className="dock-window-content">
                  {renderWindowContent(windowName)}
                </div>
              )}
              
              {/* Drop line indicator below */}
              {dragOverTab === windowName && dropPosition === 'after' && shouldShowDropLine(windowName, 'after') && (
                <div className="drop-line" />
              )}
            </div>
          );
        })}
        </div>
      )}

      {/* Drop zone indicator (shown when dragging) */}
      <div className="dock-drop-indicator">
      </div>
    </div>
  );
}
