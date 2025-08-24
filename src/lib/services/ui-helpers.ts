import type { FinancialCard } from '../core/types';

export function getVisibleCards<T>(
  allItems: T[], 
  currentIndex: number, 
  maxVisible: number
): T[] {
  if (allItems.length === 0) return [];
  
  const startIndex = Math.max(0, Math.min(currentIndex, allItems.length - maxVisible));
  const endIndex = Math.min(startIndex + maxVisible, allItems.length);
  
  return allItems.slice(startIndex, endIndex);
}

export function calculateResponsiveMaxCards(innerWidth: number): number {
  if (innerWidth < 480) return 3;
  if (innerWidth < 768) return 5;
  return 7;
}

export function calculateCardArcStyle(
  index: number, 
  totalVisible: number
): string {
  const centerIndex = Math.floor(totalVisible / 2);
  const relativeIndex = index - centerIndex;
  
  // Arc parameters
  const arcRadius = 300;
  const maxAngle = 45;
  const angleStep = totalVisible > 1 ? (maxAngle * 2) / (totalVisible - 1) : 0;
  const angle = relativeIndex * angleStep;
  
  // Calculate position
  const angleRad = (angle * Math.PI) / 180;
  const x = Math.sin(angleRad) * arcRadius;
  const y = Math.cos(angleRad) * arcRadius - arcRadius;
  
  // Calculate scale and z-index
  const distanceFromCenter = Math.abs(relativeIndex);
  const scale = 1 - (distanceFromCenter * 0.15);
  const zIndex = totalVisible - distanceFromCenter;
  
  // Calculate rotation
  const rotation = angle * 0.7;
  
  return `
    transform: translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg);
    z-index: ${zIndex};
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  `;
}
