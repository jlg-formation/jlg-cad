import type {ComponentType, ReactNode, SVGProps} from 'react';
import './cad-icons.css';

export type CadIconProps = SVGProps<SVGSVGElement> & {size?: number | string};
export type CadIconComponent = ComponentType<CadIconProps>;

const blue = 'var(--cad-icon-blue, #67baff)';
const gold = 'var(--cad-icon-gold, #efc16b)';
function Grip({x,y}:{x:number;y:number}) {
 return <rect x={x-1.25} y={y-1.25} width="2.5" height="2.5" fill={blue} stroke="none"/>;
}
function icon(name:string, drawing:ReactNode):CadIconComponent {
 return function CadIcon({size=18,className='',strokeWidth=1.25,...props}:CadIconProps) {
  return <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square" strokeLinejoin="miter" className={`cad-icon ${className}`} data-cad-icon={name} aria-hidden="true" focusable="false">{drawing}</svg>;
 };
}

export const LineIcon = icon('line', <><path d="M4 20 20 4"/><Grip x={4} y={20}/><Grip x={20} y={4}/></>);
export const OtherToolsIcon = icon('other-tools', <>
 <g stroke={gold} transform="rotate(45 12 12)"><rect x="10" y="1" width="4" height="7" rx="1"/><path d="M12 8v11m-1 0v3h2v-3"/></g>
 <g transform="rotate(-45 12 12)"><path d="M5 5h3.8A2 2 0 0 0 10.8 3H18v4H5Z"/><path d="M10.85 7v14h2.3V7"/></g>
</>);
export const PolylineIcon = icon('polyline', <><path d="M3 18h8l3-12h7"/><Grip x={3} y={18}/><Grip x={11} y={18}/><Grip x={14} y={6}/><Grip x={21} y={6}/></>);
export const CircleIcon = icon('circle', <><circle cx="12" cy="12" r="8.5"/><path d="m12 12 6-6" stroke={blue}/><Grip x={12} y={12}/><Grip x={18} y={6}/></>);
export const ArcIcon = icon('arc', <><path d="M4 20A16 16 0 0 1 20 4"/><Grip x={4} y={20}/><Grip x={8.7} y={8.7}/><Grip x={20} y={4}/></>);
export const TrimIcon = icon('trim', <><path d="M8 3v18" stroke={blue}/><path d="M3 16 8 13.5"/><path d="m8 13.5 13-6.5" stroke={gold} strokeDasharray="2 2"/><path d="m13 14 5 5m0-5-5 5" stroke={gold}/><Grip x={8} y={13.5}/></>);
export const MoveIcon = icon('move', <><path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/><Grip x={12} y={12}/></>);
export const CopyIcon = icon('copy', <>
 <circle cx="6.5" cy="6" r="3.75"/>
 <path d="M13 3.5h5.5v5" stroke="var(--cad-icon-copy-arrow, #ffd447)" strokeWidth="1.6"/>
 <path d="m15.5 8 3 4 3-4Z" fill="var(--cad-icon-copy-arrow, #ffd447)" stroke="none"/>
 <g stroke={blue} strokeWidth="1.65">
  <path d="M15.25 13.35a4.5 4.5 0 1 1 0 8.3"/>
  <circle cx="10" cy="17.5" r="4.5"/>
 </g>
</>);
export const CopyResultIcon = icon('copy-result', <>
 <path d="M9 8V5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-3"/>
 <rect x="3" y="8" width="12" height="14" rx="3"/>
</>);
export const PasteIcon = icon('paste', <><path d="M8 5H5v16h13v-5M15 5h3v4"/><path d="M9 3h5v4H9z" fill={gold} stroke={gold}/><path d="M12 11h9v9h-9z" fill="var(--cad-icon-paper, #dce5ed)" stroke="var(--cad-icon-paper-edge, #8ba1b2)"/><path d="M14 14h5m-5 3h4" stroke="#536979"/></>);
export const LayersIcon = icon('layers', <><path d="m3 16 9 5 9-5" stroke={blue}/><path d="m3 11 9 5 9-5"/><path d="m3 7 9-4 9 4-9 5z" fill="currentColor" fillOpacity=".16"/><path d="M18 14v6m-3-3h6" stroke={gold}/></>);

export const SelectIcon = icon('select', <><path d="m5 3 14 10-7 1-3 7z" fill="currentColor" fillOpacity=".12"/><path d="m12 14 5 7" stroke={blue}/></>);
export const PanIcon = icon('pan', <><path d="M7 12V7a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-6a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v7l-3 5H9l-5-7a1.5 1.5 0 0 1 2-2l3 3"/><path d="M10 21h6" stroke={blue}/></>);
export const OffsetIcon = icon('offset', <g strokeWidth=".9" strokeLinejoin="round">
 <path d="M3 22V8a6 6 0 0 1 12 0v2l1.7-1.3c1.4-1.1 3.5-.5 4.2 1 .5 1 .3 2.2-.4 3.1l-4.2 5.5c-.8 1-1.3 2.3-1.3 3.6V22Z"/>
 <path d="M5 20V8a4 4 0 0 1 8 0v6l5-3.7a.8.8 0 0 1 1.1 1.1l-4.2 5.5a8 8 0 0 0-1.6 3.1Z" stroke={blue}/>
 <path d="M9 20v2" stroke={gold} strokeWidth=".6"/>
 <path d="m9 20-.65.8h1.3Zm0 2-.65-.8h1.3Z" fill={gold} stroke="none"/>
</g>);
export const ExtendIcon = icon('extend', <>
 <path d="M20 3v18" stroke={blue}/>
 <path d="M3 19 9.75 14.78125"/>
 <path d="M12.25 13.21875 20 8" stroke={gold} strokeDasharray="1.7 1.5" strokeWidth="1"/>
 <path d="M5 10 12 5.625m-3.5-.125 3.5.125-1.3 3.175" stroke={gold} strokeWidth="1.5"/>
 <rect x="9.75" y="12.75" width="2.5" height="2.5" stroke={blue} strokeWidth="1"/>
</>);
export const JoinIcon = icon('join', <>
 <path d="M5.5 4 3 8.5M8 4l2.5 4.5M4.5 10.5h5"/>
 <g fill={blue} stroke="none">
  <rect x="5.75" y="1" width="2" height="2"/>
  <rect x="1" y="9.5" width="2" height="2"/>
  <rect x="11" y="9.5" width="2" height="2"/>
 </g>
 <path d="M2 19h8m-3-3 3 3-3 3" stroke={gold} strokeWidth="1.6"/>
 <path d="m17 13 5 9H12Z" stroke={blue} strokeLinejoin="round"/>
</>);
export const FilletIcon = icon('fillet', <><path d="M3 19h13V4"/><path d="M16 19h5M16 19v-6" stroke={gold}/><Grip x={16} y={19}/></>);
export const RotateIcon = icon('rotate', <>
 <path d="M4 19V3h4v14" stroke={blue} strokeWidth="1.5"/>
 <path d="M8 17h14v4H6" strokeDasharray="1.5 1.5" strokeWidth="1"/>
 <path d="M10 5a12 12 0 0 1 10 9" stroke={gold} strokeWidth="1.5"/>
 <path d="m18 13.5 2.25 3L22 13Z" fill={gold} stroke="none"/>
 <circle cx="4" cy="19" r="1.6" stroke={gold} strokeWidth="1.5"/>
</>);
export const MirrorIcon = icon('mirror', <><path d="M12 2v20" stroke={gold} strokeDasharray="2 2"/><path d="M3 18V6l6 12z"/><path d="M21 18V6l-6 12z" stroke={blue}/></>);
export const MeasureIcon = icon('measure', <><path d="m3 16 14-13 4 4L7 20zM13 7l2 2m-6 2 2 2m-6 2 2 2"/><Grip x={3} y={16}/><Grip x={21} y={7}/></>);
export const RectangleIcon = icon('rectangle', <><path d="M4 5h16v14H4z"/><Grip x={4} y={5}/><Grip x={20} y={19}/></>);
export const TextIcon = icon('text', <><path d="m5 20 7-16 7 16M8 14h8"/><path d="M3 21h18" stroke={blue} strokeDasharray="2 2"/></>);
export const ViewportIcon = icon('viewport', <><path d="M3 4h18v16H3z"/><path d="M7 8h10v8H7z" stroke={blue}/><Grip x={7} y={8}/><Grip x={17} y={16}/></>);
export const BezierIcon = icon('bezier', <><path d="m9 7.5 6 9" stroke={blue}/><path d="M3 10C6 4 8 6 12 12S18 20 21 14"/><circle cx="9" cy="7.5" r="1" fill={blue} stroke="none"/><circle cx="15" cy="16.5" r="1" fill={blue} stroke="none"/><Grip x={3} y={10}/><Grip x={12} y={12}/><Grip x={21} y={14}/></>);
export const DimensionIcon = icon('dimension', <>
 <path d="m4 20 15-9M3 17l3 5M17 8l4 6" stroke={blue}/>
 <path d="m3 10 14-8M3 10l4-.5M3 10l2.5-3.5M17 2l-2.5 3.5M17 2l-4 .5" stroke={gold}/>
 <path d="m4 20-2-12m17 3-2-10" strokeWidth="1"/>
</>);
export const LinearDimensionIcon = icon('linear-dimension', <>
 <path d="M4 13v8M20 13v8M4 20h16" stroke={blue}/>
 <path d="M4 3v10M20 3v10" strokeWidth="1"/>
 <path d="M4 7h16M4 7l3-2M4 7l3 2M20 7l-3-2M20 7l-3 2" stroke={gold}/>
</>);
export const DiameterDimensionIcon = icon('diameter-dimension', <>
 <circle cx="12" cy="12" r="8" stroke={blue}/>
 <path d="M3 21 21 3" stroke={gold}/>
 <path d="m6.35 17.65 1-3.8m-1 3.8 3.8-1m7.5-10.3-3.8 1m3.8-1-1 3.8" stroke={gold}/>
 <path d="M10.5 12h3M12 10.5v3" strokeWidth="1"/>
</>);
export const AlignedDimensionIcon = icon('aligned-dimension', <><path d="m3 11 7-7m4 17 7-7"/><path d="m6 8 12 10m-12-10 1 4m-1-4 4 .3m8 9-4-.3m4 .3-1-4" stroke={blue}/></>);
export const AngularDimensionIcon = icon('angular-dimension', <><path d="M3 21h19M3 21 16 3"/><path d="M10 11a13 13 0 0 1 7 10m0 0-2-3m2 3 2-3m-9-10 4 1m-4-1 1 4" stroke={blue}/></>);
export const ArcLengthDimensionIcon = icon('arc-length-dimension', <><path d="M6 21A16 16 0 0 1 21 6M3 21h7M21 3v7"/><path d="M3 18A18 18 0 0 1 18 3m-15 15 3-2m-3 2-1-4m16-11-3-1m3 1-2 3" stroke={blue}/></>);
export const RadiusDimensionIcon = icon('radius-dimension', <><path d="M3 21A18 18 0 0 1 21 3"/><path d="m20 20-13-13m0 0 4 1m-4-1 1 4" stroke={blue}/></>);
export const OrdinateDimensionIcon = icon('ordinate-dimension', <><path d="M3 3v18h18"/><path d="M4 13h14M11 20V4m-2 0 4 4m0-4-4 4m9 6 4-4m-4 0 4 4" stroke={blue}/></>);
export const JoggedDimensionIcon = icon('jogged-dimension', <><path d="M3 21A18 18 0 0 1 21 3"/><path d="m21 20-7-7v4l-7-10m0 0 4 1m-4-1 1 4" stroke={blue}/></>);
export const VisibleIcon = icon('visible', <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3" stroke={blue}/></>);
export const HiddenIcon = icon('hidden', <><path d="M3 9 2 12s4 7 10 7c2 0 4-1 6-3M7 6c7-4 13 3 15 6l-2 3" opacity=".65"/><path d="M3 3 21 21" stroke={gold}/></>);
export const LockIcon = icon('lock', <><path d="M7 10V7a5 5 0 0 1 10 0v3"/><path d="M5 10h14v11H5z" fill={gold} fillOpacity=".2" stroke={gold}/><path d="M12 14v3"/></>);
export const UnlockIcon = icon('unlock', <><path d="M9 10V7a5 5 0 0 1 10 0"/><path d="M4 10h14v11H4z"/><path d="M11 14v3" stroke={blue}/></>);
export const AddIcon = icon('add', <path d="M12 4v16M4 12h16" stroke={blue}/>);
export const DeleteIcon = icon('delete', <><path d="M6 7h12l-1 14H7zM4 7h16M9 7V3h6v4"/><path d="M10 11v6m4-6v6" stroke={gold}/></>);
export const HatchIcon = icon('hatch', <><path d="M4 4h16v16H4z"/><path d="m4 10 6-6M4 16 16 4M6 20 20 6m-8 14 8-8m-2 8 2-2" stroke={blue}/></>);
export const CutIcon = icon('cut', <><circle cx="6" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="m8 15 11-12M15 15 4 3"/><Grip x={11.5} y={11}/></>);
export const CopyBaseIcon = icon('copy-base', <><path d="M4 10V4h10v4M10 10h10v10H10z"/><path d="M5 14v8m-4-4h8" stroke={gold}/><Grip x={10} y={10}/></>);
export const UndoIcon = icon('undo', <><path d="M4 9h10a6 6 0 0 1 0 12h-4"/><path d="m8 4-5 5 5 5" stroke={blue}/></>);
export const RedoIcon = icon('redo', <><path d="M20 9H10a6 6 0 0 0 0 12h4"/><path d="m16 4 5 5-5 5" stroke={blue}/></>);
export const HistoryIcon = icon('history', <><path d="M4 8a9 9 0 1 1-1 8M3 3v6h6"/><path d="M12 6v6l4 2" stroke={blue}/></>);
export const RepeatIcon = icon('repeat', <><path d="M4 10V6h16m-4-4 4 4-4 4M20 14v4H4m4-4-4 4 4 4"/><path d="M9 12h6" stroke={blue}/></>);
export const FitViewIcon = icon('fit-view', <><path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/><path d="M8 8h8v8H8z" stroke={blue}/></>);
export const ZoomInIcon = icon('zoom-in', <><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/><path d="M7 10h6m-3-3v6" stroke={blue}/></>);
export const WindowZoomIcon = icon('window-zoom', <><path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/><path d="M7 7h10v10H7z" stroke={blue} strokeDasharray="2 2"/></>);
export const PropertiesIcon = icon('properties', <><path d="M3 6h18M3 12h18M3 18h18"/><path d="M7 3v6m10 0v6M9 15v6" stroke={blue} strokeWidth="2.5"/></>);
export const ConfirmIcon = icon('confirm', <path d="m4 12 5 6L20 5" stroke={blue}/>);
export const CloseIcon = icon('close', <path d="m5 5 14 14M5 19 19 5"/>);
export const OriginIcon = icon('origin', <><circle cx="12" cy="12" r="6"/><path d="M12 2v6m0 8v6M2 12h6m8 0h6"/><Grip x={12} y={12}/></>);
export const ReturnIcon = icon('return', <><path d="M20 4v10H4"/><path d="m9 9-5 5 5 5" stroke={blue}/></>);
export const ChevronRightIcon = icon('chevron-right', <path d="m9 5 7 7-7 7"/>);
export const ChevronLeftIcon = icon('chevron-left', <path d="m15 5-7 7 7 7"/>);
export const MinusIcon = icon('minus', <path d="M4 12h16"/>);
export const FolderIcon = icon('folder', <><path d="M3 18V5h7l3 3h8v4"/><path d="M3 20 6 11h16l-3 9z" fill={gold} fillOpacity=".2" stroke={gold}/></>);
export const DownloadIcon = icon('download', <><path d="M4 16v5h16v-5"/><path d="M12 3v13m-5-5 5 5 5-5" stroke={blue}/></>);
export const FileIcon = icon('file', <><path d="M5 3h9l5 5v13H5zM14 3v5h5"/><path d="M8 12h8m-8 4h6" stroke={blue}/></>);
export const SettingsIcon = icon('settings', <><path d="m9 3-.5 3-2 1-3-.5-2 4 2.5 2v2L2 17l2 4 3-.5 2 1L10 23h4l1-2.5 2-1 3 .5 2-4-2.5-2v-2L22 10l-2-4-3 .5-2-1L14 3Z" transform="translate(1 -1) scale(.92)"/><circle cx="12" cy="11" r="3.5" stroke={blue}/></>);
export const HelpIcon = icon('help', <><circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 1 1 4 3c-1 1-1 2-1 3" stroke={blue}/><Grip x={12} y={17}/></>);

export const ScaleIcon = icon('scale', <><path d="M3 14h7v7H3z" stroke={blue}/><path d="M3 3h18v18H3z" strokeDasharray="2 2"/><path d="m10 14 10-10m-6 0h6v6" stroke={gold}/><Grip x={3} y={21}/></>);
