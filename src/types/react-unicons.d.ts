// Type declarations for @iconscout/react-unicons, which ships no bundled types.
// Each icon is a React component accepting standard SVG props plus `size`/`color`.
// Add new icons here as they are imported across the app.
declare module '@iconscout/react-unicons' {
  import * as React from 'react';

  export interface UniconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
  }

  export type UniconComponent = React.FC<UniconProps>;

  export const UilAngleLeft: UniconComponent;
  export const UilAngleRight: UniconComponent;
  export const UilArrowLeft: UniconComponent;
  export const UilArrowRight: UniconComponent;
  export const UilArrowUpRight: UniconComponent;
  export const UilCheck: UniconComponent;
  export const UilCopy: UniconComponent;
  export const UilLink: UniconComponent;
  export const UilMapPin: UniconComponent;
  export const UilSpin: UniconComponent;
}
