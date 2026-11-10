// Hand-written 12px icons: butt caps, miter joins, currentColor. No icon library (PLAN 7.3 #2). Pure presentational.
import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.5, strokeLinecap: 'butt', strokeLinejoin: 'miter', 'aria-hidden': true,
};

export const XIcon = (p: SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M2 2l8 8M10 2l-8 8" /></svg>);
export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M2 6.5l3 3 5-7" /></svg>);
export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M7.5 7.5L11 11" /><path d="M1.75 1.75h5.5v5.5h-5.5z" /></svg>);
