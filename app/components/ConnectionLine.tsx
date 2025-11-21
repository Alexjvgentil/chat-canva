import React, { useId, useMemo } from 'react';

interface ConnectionLineProps {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  color?: string;
  strokeWidth?: number;
  dashed?: boolean;
  showArrow?: boolean;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  color = '#6B7280',
  strokeWidth = 2,
  dashed = false,
  showArrow = true,
}) => {
  const uniqueId = useId().replace(/:/g, '');
  const markerId = useMemo(() => `arrowhead-${uniqueId}`, [uniqueId]);

  const distX = Math.abs(targetX - sourceX);
  const curvature = 0.5;
  const controlOffsetBase = Math.max(distX * curvature, 60);
  const direction = targetX >= sourceX ? 1 : -1;
  const controlOffset = controlOffsetBase * direction;

  const cp1X = sourceX + controlOffset;
  const cp2X = targetX - controlOffset;

  const pathData = `M ${sourceX} ${sourceY} C ${cp1X} ${sourceY}, ${cp2X} ${targetY}, ${targetX} ${targetY}`;

  return (
    <>
      {showArrow && (
        <defs>
          <marker
            id={markerId}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill={color} />
          </marker>
        </defs>
      )}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        markerEnd={showArrow ? `url(#${markerId})` : undefined}
        strokeDasharray={dashed ? '6 6' : undefined}
      />
    </>
  );
};

export default ConnectionLine;
