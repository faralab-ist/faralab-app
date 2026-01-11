import React, { useState } from 'react';
import './DockSidebar.css';
import TestChargeMenu from '../Toolbar/ToolbarPopup/TestChargeMenu';
import SlicerMenu from '../Toolbar/ToolbarPopup/SlicerMenu';
import EFieldMenu from '../Toolbar/ToolbarPopup/EFieldMenu';
import GaussianMenu from '../Toolbar/ToolbarPopup/GaussianMenu';

/**
 * DockSidebar - Left sidebar "desk" where ToolbarPopup windows can be docked
 * @param {Object} props
 * @param {Object} props.dockedWindows - { TestCharge: true, Slice: false, ... }
 * @param {Function} props.onUndock - Callback to undock a window back to floating
 * @param {Array} props.tabOrder - Order of tabs for user organization
 * @param {Function} props.setTabOrder - Update tab order
 * @param {Object} props.testChargeProps - Props for TestChargeMenu
 * @param {Object} props.slicerProps - Props for SlicerMenu
 * @param {Object} props.efieldProps - Props for EFieldMenu
 * @param {Object} props.gaussianProps - Props for GaussianMenu
 */
export default function DockSidebar({
  dockedWindows,
  onUndock,
  tabOrder,
  setTabOrder,
  testChargeProps,
  slicerProps,
  efieldProps,
  gaussianProps,
}) {
  const [draggedTab, setDraggedTab] = useState(null);
  const [dragOverTab, setDragOverTab] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // 'before' or 'after'
  const [expandedWindows, setExpandedWindows] = useState({ 
    TestCharge: true, 
    Slice: true, 
    EField: true, 
    Gaussian: true 
  }); // Track which windows are expanded
  
  // Get list of docked window names in user-defined order
  const dockedWindowNames = tabOrder.filter(name => dockedWindows[name]);

  // If no windows docked, show collapsed state
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

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedTab !== e.target.closest('.dock-window-header')?.textContent?.trim()) {
      performReorder();
    }
    
    setDraggedTab(null);
    setDragOverTab(null);
    setDropPosition(null);
  };

  const handleTabDragEnd = (e) => {
    // If dragged outside docker area, undock it
    const dockerRect = e.currentTarget.closest('.dock-sidebar').getBoundingClientRect();
    const isOutsideDock = e.clientX > dockerRect.right || e.clientX < dockerRect.left;
    
    if (isOutsideDock && draggedTab) {
      // Pass the position where the drag ended
      const position = {
        left: e.clientX - 150, // Center the popup on cursor
        top: e.clientY - 20
      };
      onUndock(draggedTab, position);
    }
    
    setDraggedTab(null);
    setDragOverTab(null);
    setDropPosition(null);
  };

  const handleContentDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Render content for specific window
  const renderWindowContent = (windowName) => {
    switch (windowName) {
      case 'TestCharge':
        return <TestChargeMenu {...testChargeProps} />;
      case 'Slice':
        return <SlicerMenu {...slicerProps} />;
      case 'EField':
        return <EFieldMenu {...efieldProps} />;
      case 'Gaussian':
        return <GaussianMenu {...gaussianProps} />;
      default:
        return null;
    }
  };

  return (
    <div className={`dock-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Docked windows list */}
      <div 
        className="dock-content"
        onDragOver={handleContentDragOver}
        onDrop={handleDrop}
      >
        {dockedWindowNames.map((windowName) => (
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
              onDrop={handleDrop}
              onDragEnd={handleTabDragEnd}
            >
              <span className="dock-window-expand">
                {expandedWindows[windowName] ? "▾" : "▸"}
              </span>
              <span className="dock-window-title">{windowName}</span>
              <button
                className="dock-window-undock"
                onClick={(e) => {
                  e.stopPropagation();
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
        ))}
      </div>

      {/* Drop zone indicator (shown when dragging) */}
      <div className="dock-drop-indicator">
        Drop here to dock
      </div>
    </div>
  );
}
