/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '@/scripts/GalleryEnhancer' {
  function init(): void

  export default init
}

declare module '@/scripts/MultipageViewerEnhancer' {
  function init(): void;

  export default init
}

// ExHentai built-in variables & functions
interface Window {
  gid: number;
  pagecount: number; // page Count
  currentpage: number; // current page
  preload_scroll_images: () => void; // preload images & set currentpage
  action_reload: (page) => void; // reload image
  preload_generic: (a, b, c) => void; // HTML nodes operation
  pop_ren: () => false; // open rename pop-up

  // Favorites
  clicked_fav: () => void; // set it to () => {} in order to prevent undefined error
}

interface Document {
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitFullscreenElement?: Element;
}

interface HTMLElement {
  msRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
}
