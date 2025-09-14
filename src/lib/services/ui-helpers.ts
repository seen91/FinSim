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
  if (innerWidth < 768) return 4; // Reduced from 5 to 4 for tighter layout
  return 6; // Reduced from 7 to 6 for tighter layout
}

export function calculateCardArcStyle(
  index: number, 
  totalVisible: number
): string {
  // Handle single card case
  if (totalVisible === 1) {
    return `
      transform: translate(-50%, 0) scale(1) rotate(0deg);
      z-index: 1;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;
  }
  
  // Calculate center index for even distribution
  const centerIndex = (totalVisible - 1) / 2;
  const relativeIndex = index - centerIndex;
  
  // Arc parameters that adapt based on number of cards
  const arcRadius = 180;
  
  // Dynamic angle calculation: fewer cards = tighter clustering, more cards = fuller spread
  let effectiveAngle;
  if (totalVisible === 2) {
    // For 2 cards, use a much smaller angle to keep them closer together
    effectiveAngle = 20; // Much tighter than before
  } else if (totalVisible === 3) {
    // For 3 cards, use a moderate angle
    effectiveAngle = 35;
  } else if (totalVisible <= 5) {
    // For 4-5 cards, gradually increase
    effectiveAngle = 30 + (totalVisible - 3) * 8; // 38° for 4 cards, 46° for 5 cards
  } else {
    // For 6+ cards, use wider spread but not the full arc
    effectiveAngle = Math.min(55, 46 + (totalVisible - 5) * 3);
  }
  
  // Calculate angle for this card position
  const angleStep = totalVisible > 1 ? (effectiveAngle * 2) / (totalVisible - 1) : 0;
  const angle = relativeIndex * angleStep;
  const angleRad = (angle * Math.PI) / 180;
  
  // Calculate position on the circular arc
  const x = Math.sin(angleRad) * arcRadius;
  // More pronounced downward arc for fewer cards, less for more cards
  const arcDepthFactor = totalVisible <= 3 ? 0.3 : 0.4;
  const y = (1 - Math.cos(angleRad)) * arcRadius * arcDepthFactor;
  
  // Calculate card rotation - less aggressive for fewer cards
  const rotationFactor = totalVisible <= 3 ? 0.6 : 0.8;
  const rotation = angle * rotationFactor;
  
  // Calculate scale - center cards slightly larger, outer cards smaller
  const distanceFromCenter = Math.abs(relativeIndex);
  const maxDistance = Math.max(1, centerIndex);
  const scaleFactor = 1 - (distanceFromCenter / maxDistance) * 0.1; // Less scale variation for tighter feel
  const scale = Math.max(0.85, scaleFactor);
  
  // Calculate z-index - center cards on top
  const zIndex = Math.round(10 - distanceFromCenter);
  
  return `
    transform: translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg);
    z-index: ${zIndex};
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  `;
}

export function calculateStackCardStyle(
  index: number,
  totalCards: number,
  side: 'left' | 'right',
  basePosition: number
): string {
  // Dense stacking with heavy overlap
  const stackSpacing = 12; // Adjusted for smaller cards
  const baseRotation = side === 'left' ? -30 : 30; // More aggressive rotation
  const stackOffset = index * stackSpacing;
  
  // Position relative to the base position (edge of main hand)
  const x = side === 'left' 
    ? basePosition - 50 - stackOffset // Adjusted for smaller card width
    : basePosition + 50 + stackOffset;
  
  // Slight vertical offset for depth
  const y = index * 2;
  
  // Scale down progressively for cards further back
  const scale = 0.6 - (index * 0.04); // Adjusted for smaller base cards
  
  // Z-index decreases with distance from main hand
  const zIndex = side === 'left' 
    ? 5 - index 
    : 5 - index;
  
  // Rotation increases with distance
  const rotation = baseRotation + (index * (side === 'left' ? -6 : 6));
  
  return `
    transform: translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg);
    z-index: ${zIndex};
    opacity: ${Math.max(0.3, 1 - index * 0.2)};
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  `;
}
