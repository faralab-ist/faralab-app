import React, { useState } from 'react';
import './DockSidebar.css';
import TestChargeMenu from '../Toolbar/ToolbarPopup/TestChargeMenu';
import SlicerMenu from '../Toolbar/ToolbarPopup/SlicerMenu';

/**
 * DockSidebar - Left sidebar "desk" where ToolbarPopup windows can be docked
 * @param {Object} props
 * @param {Object} props.dockedWindows - { TestCharge: true, Slice: false, ... }
 * @param {Function} props.onUndock - Callback to undock a window back to floating
 * @param {Array} props.tabOrder - Order of tabs for user organization
 * @param {Function} props.setTabOrder - Update tab order
 * @param {Object} props.testChargeProps - Props for TestChargeMenu
 * @param {Object} props.slicerProps - Props for SlicerMenu
 */
export default function DockSidebar({
  dockedWindows,
  onUndock,
  tabOrder,
  setTabOrder,
  testChargeProps,
  slicerProps,
}) {
  const [draggedTab, setDraggedTab] = useState(null);
  const [dragOverTab, setDragOverTab] = useState(null);
  const [expandedWindows, setExpandedWindows] = useState({ TestCharge: true, Slice: true }); // Track which windows are expanded
  
  // Get list of docked window names in user-defined order
  const dockedWindowNames = tabOrder.filter(name => dockedWindows[name]);

  // If no windows docked, show collapsed state
  const isCollapsed = dockedWindowNames.length === 0;

  // Toggle expanded state for a window
  const toggleExpanded = (windowName) => {
    setExpandedWindows(prev => ({ ...prev, [windowName]: !prev[windowName] }));
  };

  // Tab drag handlers for reordering and undocking
  const handleTabDragStart = (e, windowName) => {
    setDraggedTab(windowName);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('windowName', windowName);
    e.dataTransfer.setData('source', 'docker');
  };

  const handleTabDragOver = (e, windowName) => {
    e.preventDefault();
    if (draggedTab && draggedTab !== windowName) {
      setDragOverTab(windowName);
    }
  };

  const handleTabDrop = (e, targetName) => {
    e.preventDefault();
    if (!draggedTab || draggedTab === targetName) return;

    const newOrder = [...tabOrder];
    const draggedIdx = newOrder.indexOf(draggedTab);
    const targetIdx = newOrder.indexOf(targetName);

    // Remove dragged item and insert at target position
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedTab);

    setTabOrder(newOrder);
    setDraggedTab(null);
    setDragOverTab(null);
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
  };

  // Render content for specific window
  const renderWindowContent = (windowName) => {
    switch (windowName) {
      case 'TestCharge':
        return <TestChargeMenu {...testChargeProps} />;
      case 'Slice':
        return <SlicerMenu {...slicerProps} />;
      default:
        return null;
    }
  };

  return (
    <div className={`dock-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Docked windows list */}
      <div className="dock-content">
        {dockedWindowNames.map((windowName) => (
          <div key={windowName} className="dock-window-section">
            {/* Window header - clicking toggles expansion */}
            <div
              className={`dock-window-header ${draggedTab === windowName ? 'dragging' : ''}`}
              onClick={() => toggleExpanded(windowName)}
              draggable
              onDragStart={(e) => handleTabDragStart(e, windowName)}
              onDragOver={(e) => handleTabDragOver(e, windowName)}
              onDrop={(e) => handleTabDrop(e, windowName)}
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
