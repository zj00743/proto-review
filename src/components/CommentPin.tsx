import { generateColor } from '../lib/utils';

interface CommentPinProps {
  author: string;
  x: number;
  y: number;
  resolved: boolean;
  selected: boolean;
  onClick: () => void;
}

export function CommentPin({ author, x, y, resolved, selected, onClick }: CommentPinProps) {
  const initials = author
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const color = generateColor(author);

  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`absolute pointer-events-auto w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg transition-all hover:scale-110 z-10 border-2 border-white
        ${resolved ? 'opacity-50 grayscale' : ''}
        ${selected ? 'ring-2 ring-gray-500 ring-offset-2 scale-110 comment-pin-pulse' : ''}
      `}
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -100%)',
        backgroundColor: color,
      }}
      aria-label={`Comment by ${author}`}
    >
      {initials}
    </button>
  );
}
