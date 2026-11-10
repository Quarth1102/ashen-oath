import {
  Anvil, Apple, Bed, BookOpen, Brain, Briefcase, Castle, Check, Church, Coffee, Coins, Crown, Droplet,
  Dumbbell, Eye, Feather, Flag, Flame, Footprints, Gem, Gift, Hammer, Heart, Leaf, Moon, Mountain, Music,
  Package, Palette, PenLine, Scroll, Shield, Skull, Sparkles, Star, Sun, Sword, Swords, Tent, Trees, Users,
  WandSparkles, Waves, type LucideIcon,
} from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  sword: Sword, heart: Heart, book: BookOpen, eye: Eye, anvil: Anvil, crown: Crown, flame: Flame, skull: Skull,
  moon: Moon, leaf: Leaf, star: Star, coins: Coins, shield: Shield, sparkles: Sparkles, droplet: Droplet,
  swords: Swords, scroll: Scroll, tent: Tent, trees: Trees, waves: Waves, church: Church, mountain: Mountain,
  gem: Gem, flag: Flag, castle: Castle, check: Check, package: Package, gift: Gift, brain: Brain,
  dumbbell: Dumbbell, music: Music, palette: Palette, pen: PenLine, users: Users, sun: Sun, hammer: Hammer,
  feather: Feather, wand: WandSparkles, footprints: Footprints, apple: Apple, bed: Bed, coffee: Coffee,
  briefcase: Briefcase,
};

export const STAT_ICON_KEYS = [
  'sword', 'dumbbell', 'heart', 'apple', 'bed', 'footprints', 'book', 'brain', 'pen', 'eye', 'moon', 'feather',
  'anvil', 'hammer', 'briefcase', 'crown', 'users', 'music', 'palette', 'wand', 'leaf', 'sun', 'coffee', 'shield',
];

export function Icon({ name, className, size = 16, style }: { name: string; className?: string; size?: number; style?: React.CSSProperties }) {
  const C = ICONS[name] ?? Star;
  return <C size={size} className={className} style={style} strokeWidth={2} />;
}
