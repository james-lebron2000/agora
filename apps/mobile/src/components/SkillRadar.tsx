import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

export interface SkillPoint {
  label: string;
  value: number;
}

interface SkillRadarProps {
  skills: SkillPoint[];
  size?: number;
  levels?: number;
}

const toRadians = (angle: number) => (angle * Math.PI) / 180;
const clamp = (value: number) => Math.max(0, Math.min(100, value));

export default function SkillRadar({ skills, size = 240, levels = 4 }: SkillRadarProps) {
  const normalized = skills.slice(0, 6);
  const center = size / 2;
  const radius = size * 0.34;

  const levelPolygons = useMemo(() => {
    return Array.from({ length: levels }, (_, index) => {
      const ratio = (index + 1) / levels;
      const points = normalized.map((_, skillIndex) => {
        const angle = -90 + (360 / normalized.length) * skillIndex;
        const x = center + radius * ratio * Math.cos(toRadians(angle));
        const y = center + radius * ratio * Math.sin(toRadians(angle));
        return `${x},${y}`;
      });
      return points.join(' ');
    });
  }, [center, levels, normalized, radius]);

  const axisPoints = useMemo(() => {
    return normalized.map((_, skillIndex) => {
      const angle = -90 + (360 / normalized.length) * skillIndex;
      const x = center + radius * Math.cos(toRadians(angle));
      const y = center + radius * Math.sin(toRadians(angle));
      const labelX = center + radius * 1.18 * Math.cos(toRadians(angle));
      const labelY = center + radius * 1.18 * Math.sin(toRadians(angle));
      return { x, y, labelX, labelY };
    });
  }, [center, normalized, radius]);

  const skillPolygon = useMemo(() => {
    const points = normalized.map((skill, skillIndex) => {
      const angle = -90 + (360 / normalized.length) * skillIndex;
      const ratio = clamp(skill.value) / 100;
      const x = center + radius * ratio * Math.cos(toRadians(angle));
      const y = center + radius * ratio * Math.sin(toRadians(angle));
      return `${x},${y}`;
    });
    return points.join(' ');
  }, [center, normalized, radius]);

  if (normalized.length < 3) {
    return <View style={[styles.placeholder, { width: size, height: size }]} />;
  }

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {levelPolygons.map((polygonPoints, index) => (
          <Polygon
            key={`grid-${index}`}
            points={polygonPoints}
            fill="none"
            stroke="#dbeafe"
            strokeWidth={1}
          />
        ))}

        {axisPoints.map((point, index) => (
          <Line
            key={`axis-${index}`}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke="#bfdbfe"
            strokeWidth={1}
          />
        ))}

        <Polygon points={skillPolygon} fill="#6366f145" stroke="#4f46e5" strokeWidth={2} />

        <Circle cx={center} cy={center} r={3} fill="#4f46e5" />

        {normalized.map((skill, index) => {
          const point = axisPoints[index];
          return (
            <SvgText
              key={`label-${skill.label}`}
              x={point.labelX}
              y={point.labelY}
              fontSize={11}
              fill="#334155"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {`${skill.label} ${Math.round(clamp(skill.value))}`}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
});
