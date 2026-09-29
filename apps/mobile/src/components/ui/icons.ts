/**
 * Clepso icon set → Phosphor (Regular weight; Fill for the active tab).
 * Direct imports keep the bundle to the 50 icons the product uses.
 */
import { House } from 'phosphor-react-native/src/icons/House';
import { Briefcase } from 'phosphor-react-native/src/icons/Briefcase';
import { CalendarBlank } from 'phosphor-react-native/src/icons/CalendarBlank';
import { Receipt } from 'phosphor-react-native/src/icons/Receipt';
import { Plus } from 'phosphor-react-native/src/icons/Plus';
import { Clock } from 'phosphor-react-native/src/icons/Clock';
import { Microphone } from 'phosphor-react-native/src/icons/Microphone';
import { Check } from 'phosphor-react-native/src/icons/Check';
import { CaretRight } from 'phosphor-react-native/src/icons/CaretRight';
import { CaretLeft } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretDown } from 'phosphor-react-native/src/icons/CaretDown';
import { MagnifyingGlass } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { Bell } from 'phosphor-react-native/src/icons/Bell';
import { Tray } from 'phosphor-react-native/src/icons/Tray';
import { Play } from 'phosphor-react-native/src/icons/Play';
import { Pause } from 'phosphor-react-native/src/icons/Pause';
import { Stop } from 'phosphor-react-native/src/icons/Stop';
import { FileText } from 'phosphor-react-native/src/icons/FileText';
import { Users } from 'phosphor-react-native/src/icons/Users';
import { User } from 'phosphor-react-native/src/icons/User';
import { Buildings } from 'phosphor-react-native/src/icons/Buildings';
import { CurrencyDollar } from 'phosphor-react-native/src/icons/CurrencyDollar';
import { Warning } from 'phosphor-react-native/src/icons/Warning';
import { ArrowUpRight } from 'phosphor-react-native/src/icons/ArrowUpRight';
import { ArrowDownRight } from 'phosphor-react-native/src/icons/ArrowDownRight';
import { DotsThree } from 'phosphor-react-native/src/icons/DotsThree';
import { X } from 'phosphor-react-native/src/icons/X';
import { Camera } from 'phosphor-react-native/src/icons/Camera';
import { ChatCircle } from 'phosphor-react-native/src/icons/ChatCircle';
import { ShieldCheck } from 'phosphor-react-native/src/icons/ShieldCheck';
import { PencilSimpleLine } from 'phosphor-react-native/src/icons/PencilSimpleLine';
import { Phone } from 'phosphor-react-native/src/icons/Phone';
import { SlidersHorizontal } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import { SidebarSimple } from 'phosphor-react-native/src/icons/SidebarSimple';
import { Lock } from 'phosphor-react-native/src/icons/Lock';
import { Scales } from 'phosphor-react-native/src/icons/Scales';
import { Gavel } from 'phosphor-react-native/src/icons/Gavel';
import { DownloadSimple } from 'phosphor-react-native/src/icons/DownloadSimple';
import { UploadSimple } from 'phosphor-react-native/src/icons/UploadSimple';
import { PaperPlaneTilt } from 'phosphor-react-native/src/icons/PaperPlaneTilt';
import { Link } from 'phosphor-react-native/src/icons/Link';
import { Tag } from 'phosphor-react-native/src/icons/Tag';
import { Folder } from 'phosphor-react-native/src/icons/Folder';
import { ChartBar } from 'phosphor-react-native/src/icons/ChartBar';
import { Gear } from 'phosphor-react-native/src/icons/Gear';
import { UserFocus } from 'phosphor-react-native/src/icons/UserFocus';
import { WifiSlash } from 'phosphor-react-native/src/icons/WifiSlash';
import { Sun } from 'phosphor-react-native/src/icons/Sun';
import { Moon } from 'phosphor-react-native/src/icons/Moon';
import { Trash } from 'phosphor-react-native/src/icons/Trash';
import { Copy } from 'phosphor-react-native/src/icons/Copy';

export const ICONS = {
  home: House,
  briefcase: Briefcase,
  calendar: CalendarBlank,
  receipt: Receipt,
  plus: Plus,
  clock: Clock,
  mic: Microphone,
  check: Check,
  'chevron-right': CaretRight,
  'chevron-left': CaretLeft,
  'chevron-down': CaretDown,
  search: MagnifyingGlass,
  bell: Bell,
  inbox: Tray,
  play: Play,
  pause: Pause,
  stop: Stop,
  file: FileText,
  users: Users,
  user: User,
  building: Buildings,
  dollar: CurrencyDollar,
  alert: Warning,
  'arrow-up-right': ArrowUpRight,
  'arrow-down-right': ArrowDownRight,
  more: DotsThree,
  x: X,
  camera: Camera,
  message: ChatCircle,
  shield: ShieldCheck,
  pen: PencilSimpleLine,
  phone: Phone,
  sliders: SlidersHorizontal,
  panel: SidebarSimple,
  lock: Lock,
  scale: Scales,
  gavel: Gavel,
  download: DownloadSimple,
  upload: UploadSimple,
  send: PaperPlaneTilt,
  link: Link,
  tag: Tag,
  folder: Folder,
  chart: ChartBar,
  settings: Gear,
  face: UserFocus,
  'wifi-off': WifiSlash,
  sun: Sun,
  moon: Moon,
  trash: Trash,
  copy: Copy,
} as const;

export type IconName = keyof typeof ICONS;
