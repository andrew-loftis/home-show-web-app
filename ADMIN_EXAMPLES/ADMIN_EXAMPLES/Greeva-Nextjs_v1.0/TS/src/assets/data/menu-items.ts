import { MenuItemType } from '@/types/menu'

export const MENU_ITEMS: MenuItemType[] = [
  {
    key: 'navigation',
    label: 'Navigation',
    isTitle: true,
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'tabler:dashboard',
    badge: {
      text: "5",
      variant: "success",
    },
    url: '/dashboard'
  },
  {
    key: 'calendar',
    label: 'Calendar',
    icon: 'tabler:calendar',
    url: '/calendar'
  },
  {
    key: 'email',
    label: 'Email',
    icon: 'tabler:inbox',
    url: '/email'
  },
  {
    key: 'file-manager',
    label: 'File Manager',
    icon: 'tabler:folder',
    url: '/file-manager',
  },
  {
    key: 'invoice',
    label: 'Invoice',
    icon: 'tabler:file-invoice',
    children: [
      {
        key: 'invoices',
        label: 'Invoices',
        url: '/invoices',
        parentKey: 'invoice',
      },
      {
        key: 'view-invoices',
        label: 'View Invoices',
        url: '/invoices/view-invoice',
        parentKey: 'invoice',
      },
      {
        key: 'create-invoices',
        label: 'Create Invoices',
        url: '/invoices/create-invoices',
        parentKey: 'invoice',
      },
    ]
  },
  {
    key: 'pages',
    label: 'Pages',
    icon: 'tabler:files',
    children: [
      {
        key: 'starter-page',
        label: 'Starter Page',
        url: '/pages/starter-page',
        parentKey: 'pages',
      },
      {
        key: 'pricing',
        label: 'Pricing',
        url: '/pages/pricing',
        parentKey: 'pages',
      },
      {
        key: 'faqs',
        label: 'FAQs',
        url: '/pages/faqs',
        parentKey: 'pages',
      },
      {
        key: 'maintenance',
        label: 'Maintenance',
        url: '/maintenance',
        parentKey: 'pages',
      },
      {
        key: 'timeline',
        label: 'Timeline',
        url: '/pages/timeline',
        parentKey: 'pages',
      },
      {
        key: 'coming-soon',
        label: 'Coming Soon',
        url: '/coming-soon',
        parentKey: 'pages',
      },
      {
        key: 'terms',
        label: 'Terms & Conditions',
        url: '/pages/terms',
        parentKey: 'pages',
      },
      {
        key: 'error-404-alt',
        label: 'Error 404 Alt',
        url: '/pages/error-404-alt',
        parentKey: 'pages',
      },
    ],
  },
  {
    key: 'auth',
    label: 'Auth Pages',
    icon: 'ri:lock-password-line',
    children: [
      {
        key: 'login',
        label: 'Login',
        url: '/auth/login',
        parentKey: 'auth',
      },
      {
        key: 'register',
        label: 'Register',
        url: '/auth/register',
        parentKey: 'auth',
      },
      {
        key: 'logout',
        label: 'Logout',
        url: '/auth/logout',
        parentKey: 'auth',
      },
      {
        key: 'recover-password',
        label: 'Recover Password',
        url: '/auth/recover-password',
        parentKey: 'auth',
      },
      {
        key: 'create-password',
        label: 'Create Password',
        url: '/auth/create-password',
        parentKey: 'auth',
      },
      {
        key: 'lock-screen',
        label: 'Lock Screen',
        url: '/auth/lock-screen',
        parentKey: 'auth',
      },
      {
        key: 'confirm-mail',
        label: 'Confirm Mail',
        url: '/auth/confirm-mail',
        parentKey: 'auth',
      },
      {
        key: 'login-pin',
        label: 'Login with PIN',
        url: '/auth/login-pin',
        parentKey: 'auth',
      },
    ],
  },
  {
    key: 'errors',
    label: 'Error Pages',
    icon: 'tabler:server-2',
    children: [
      {
        key: 'error-401',
        label: '401 Unauthorized',
        url: '/errors/error-401',
        parentKey: 'errors',
      },
      {
        key: 'error-400',
        label: '400 Bad Request',
        url: '/errors/error-400',
        parentKey: 'errors',
      },
      {
        key: 'error-403',
        label: '403 Forbidden',
        url: '/errors/error-403',
        parentKey: 'errors',
      },
      {
        key: 'error-404',
        label: '404 Not Found',
        url: '/errors/error-404',
        parentKey: 'errors',
      },
      {
        key: 'error-500',
        label: '500 Internal Server',
        url: '/errors/error-500',
        parentKey: 'errors',
      },
      {
        key: 'service-unavailable',
        label: 'Service Unavailable',
        url: '/errors/service-unavailable',
        parentKey: 'errors',
      },

    ]
  },
  {
    key: 'more',
    label: 'More',
    isTitle: true,
  },
  {
    key: 'layouts',
    label: 'Layouts',
    icon: 'tabler:layout',
    children: [
      {
        key: 'horizontal',
        label: 'Horizontal',
        url: '/layouts/horizontal',
        parentKey: 'layouts',
        target: '_blank',
      },
      {
        key: 'detached',
        label: 'Detached',
        target: '_blank',
        url: '/layouts/detached',
        parentKey: 'layouts',
      },
      {
        key: 'full-view',
        label: 'Full View',
        url: '/layouts/full-view',
        parentKey: 'layouts',
        target: '_blank',
      },
      {
        key: 'fullscreen-view',
        label: 'FullScreen View',
        url: '/layouts/fullscreen-view',
        parentKey: 'layouts',
        target: '_blank',
      },
      {
        key: 'hover-menu',
        label: 'Hover Menu',
        url: '/layouts/hover-menu',
        parentKey: 'layouts',
        target: '_blank',
      },
      {
        key: 'compact',
        label: 'Compact',
        url: '/layouts/compact',
        parentKey: 'layouts',
        target: '_blank',
      },
      {
        key: 'icon-view',
        label: 'Icon View',
        url: '/layouts/icon-view',
        parentKey: 'layouts',
        target: '_blank',
      },
      {
        key: 'dark-mode',
        label: 'Dark Mode',
        url: '/layouts/dark-mode',
        parentKey: 'layouts',
        target: '_blank',
      },
    ],
  },
  {
    key: 'multi-level',
    label: 'Multi Level',
    icon: 'tabler:box-multiple-3',
    children: [
      {
        key: 'second-level',
        label: 'Second Level',
        parentKey: 'multi-level',
        children: [
          {
            key: 'item11',
            label: 'Item 1',
            parentKey: 'second-level',
          },
          {
            key: 'item22',
            label: 'Item 2',
            parentKey: 'second-level',
          },
        ]
      },
      {
        key: 'third-level',
        label: 'Third Level',
        parentKey: 'multi-level',
        children: [
          {
            key: 'item1',
            label: 'Item 1',
            parentKey: 'third-level',
          },
          {
            key: 'item2',
            label: 'Item 2',
            parentKey: 'third-level',
            children: [
              {
                key: 'item2.1',
                label: 'Item 2.1',
                parentKey: 'item2',
              },
              {
                key: 'item2.2',
                label: 'Item 2.2',
                parentKey: 'item2',
              },
            ]
          },
        ]
      },
    ]
  },
  {
    key: 'components',
    label: 'Components',
    isTitle: true,
  },
  {
    key: 'base-ui',
    label: 'Base UI',
    icon: 'tabler:brightness',
    children: [
      {
        key: 'base-ui-accordions',
        label: 'Accordions',
        url: '/ui/accordions',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-alerts',
        label: 'Alerts',
        url: '/ui/alerts',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-avatars',
        label: 'Avatars',
        url: '/ui/avatars',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-badges',
        label: 'Badges',
        url: '/ui/badges',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-breadcrumb',
        label: 'Breadcrumb',
        url: '/ui/breadcrumb',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-buttons',
        label: 'Buttons',
        url: '/ui/buttons',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-cards',
        label: 'Cards',
        url: '/ui/cards',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-carousel',
        label: 'Carousel',
        url: '/ui/carousel',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-collapse',
        label: 'Collapse',
        url: '/ui/collapse',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-dropdowns',
        label: 'Dropdowns',
        url: '/ui/dropdowns',
        parentKey: 'base-ui',
      },
      {
        key: 'ul-ratio',
        label: 'Ratio',
        url: '/ui/ratio',
        parentKey: 'base-ui',
      },
      {
        key: 'ul-grid',
        label: 'Grid',
        url: '/ui/grid',
        parentKey: 'base-ui',
      },
      {
        key: 'ul-links',
        label: 'Links',
        url: '/ui/links',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-list-group',
        label: 'List Group',
        url: '/ui/list-group',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-modals',
        label: 'Modals',
        url: '/ui/modals',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-notifications',
        label: 'Notifications',
        url: '/ui/notifications',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-offcanvas',
        label: 'Offcanvas',
        url: '/ui/offcanvas',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-placeholders',
        label: 'Placeholders',
        url: '/ui/placeholders',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-pagination',
        label: 'Pagination',
        url: '/ui/pagination',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-popovers',
        label: 'Popovers',
        url: '/ui/popovers',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-progress',
        label: 'Progress',
        url: '/ui/progress',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-spinners',
        label: 'Spinners',
        url: '/ui/spinners',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-tabs',
        label: 'Tabs',
        url: '/ui/tabs',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-tooltips',
        label: 'Tooltips',
        url: '/ui/tooltips',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-typography',
        label: 'Typography',
        url: '/ui/typography',
        parentKey: 'base-ui',
      },
      {
        key: 'base-ui-utilities',
        label: 'Utilities',
        url: '/ui/utilities',
        parentKey: 'base-ui',
      },
    ]
  },
  {
    key: 'extended-ui',
    label: 'Extended UI',
    icon: 'tabler:alien',
    children: [
      {
        key: 'dragula',
        label: 'Dragula',
        url: '/extended/dragula',
        parentKey: 'extended-ui',
      },
      {
        key: 'sweet-alert',
        label: 'Sweet Alert',
        url: '/extended/sweet-alert',
        parentKey: 'extended-ui',
      },
      {
        key: 'ratings',
        label: 'Ratings',
        url: '/extended/ratings',
        parentKey: 'extended-ui',
      },
      {
        key: 'scrollbar',
        label: 'Scrollbar',
        url: '/extended/scrollbar',
        parentKey: 'extended-ui',
      },
    ]
  },
  {
    key: 'icons',
    label: 'Icons',
    icon: 'tabler:leaf',
    children: [
      {
        key: 'tabler',
        label: 'Tabler',
        url: '/icons/tabler',
        parentKey: 'icons',
      },
      {
        key: 'solar',
        label: 'Solar',
        url: '/icons/solar',
        parentKey: 'icons',
      },
    ]
  },
  {
    key: 'charts',
    label: 'Charts',
    icon: 'tabler:chart-arcs',
    children: [
      {
        key: 'area',
        label: 'Area',
        url: '/charts/area',
        parentKey: 'charts',
      },
      {
        key: 'bar',
        label: 'Bar',
        url: '/charts/bar',
        parentKey: 'charts',
      },
      {
        key: 'bubble',
        label: 'Bubble',
        url: '/charts/bubble',
        parentKey: 'charts',
      },
      {
        key: 'candlestick',
        label: 'Candlestick',
        url: '/charts/candlestick',
        parentKey: 'charts',
      },
      {
        key: 'column',
        label: 'Column',
        url: '/charts/column',
        parentKey: 'charts',
      },
      {
        key: 'heatmap',
        label: 'Heatmap',
        url: '/charts/heatmap',
        parentKey: 'charts',
      },
      {
        key: 'line',
        label: 'Line',
        url: '/charts/line',
        parentKey: 'charts',
      },
      {
        key: 'mixed',
        label: 'Mixed',
        url: '/charts/mixed',
        parentKey: 'charts',
      },
      {
        key: 'timeline-chart',
        label: 'Timeline',
        url: '/charts/timeline',
        parentKey: 'charts',
      },
      {
        key: 'boxplot',
        label: 'Boxplot',
        url: '/charts/boxplot',
        parentKey: 'charts',
      },
      {
        key: 'treemap',
        label: 'Treemap',
        url: '/charts/treemap',
        parentKey: 'charts',
      },
      {
        key: 'pie',
        label: 'Pie',
        url: '/charts/pie',
        parentKey: 'charts',
      },
      {
        key: 'radar',
        label: 'Radar',
        url: '/charts/radar',
        parentKey: 'charts',
      },
      {
        key: 'radialBar',
        label: 'RadialBar',
        url: '/charts/radialBar',
        parentKey: 'charts',
      },
      {
        key: 'scatter',
        label: 'Scatter',
        url: '/charts/scatter',
        parentKey: 'charts',
      },
      {
        key: 'polar',
        label: 'Polar Area',
        url: '/charts/polar',
        parentKey: 'charts',
      },
      {
        key: 'sparklines',
        label: 'Sparklines',
        url: '/charts/sparklines',
        parentKey: 'charts',
      },
    ],
  },
  {
    key: 'forms',
    label: 'Forms',
    icon: 'tabler:forms',
    children: [
      {
        key: 'basic',
        label: 'Basic Elements',
        url: '/forms/basic',
        parentKey: 'forms',
      },
      {
        key: 'inputmask',
        label: 'Inputmask',
        url: '/forms/inputmask',
        parentKey: 'forms',
      },
      {
        key: 'picker',
        label: 'Picker',
        url: '/forms/picker',
        parentKey: 'forms',
      },
      {
        key: 'select',
        label: 'Select',
        url: '/forms/select',
        parentKey: 'forms',
      },
      {
        key: 'slider',
        label: 'Range Slider',
        url: '/forms/slider',
        parentKey: 'forms',
      },
      {
        key: 'validation',
        label: 'Validation',
        url: '/forms/validation',
        parentKey: 'forms',
      },
      {
        key: 'wizard',
        label: 'Wizard',
        url: '/forms/wizard',
        parentKey: 'forms',
      },
      {
        key: 'file-uploads',
        label: 'File Uploads',
        url: '/forms/file-uploads',
        parentKey: 'forms',
      },
      {
        key: 'editors',
        label: 'Editors',
        url: '/forms/editors',
        parentKey: 'forms',
      },
      {
        key: 'layout',
        label: 'Layouts',
        url: '/forms/layout',
        parentKey: 'forms',
      },
    ]
  },
  {
    key: 'tables',
    label: 'Tables',
    icon: 'tabler:table',
    children: [

      {
        key: 'basic-table',
        label: 'Basic Tables',
        url: '/tables/basic-table',
        parentKey: 'tables',
      },
      {
        key: 'gridJs',
        label: 'GridJs Tables',
        url: '/tables/gridJs',
        parentKey: 'tables',
      },
    ]
  },
  {
    key: 'maps',
    label: 'Maps',
    icon: 'tabler:map-pin',
    children: [
      {
        key: 'google',
        label: 'Google Maps',
        url: '/maps/google',
        parentKey: 'maps',
      },
      {
        key: 'vector',
        label: 'Vector Maps',
        url: '/maps/vector',
        parentKey: 'maps',
      },
      {
        key: 'vector',
        label: 'Leaflet Maps',
        url: '/maps/leaflet',
        parentKey: 'maps',
      },
    ],
  },
]


export const HORIZONTAL_MENU_ITEM: MenuItemType[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'tabler:dashboard',
    url: '/dashboard'
  },
  {
    key: 'apps',
    label: 'Apps',
    icon: 'tabler:apps',
    children: [
      {
        key: 'calendar',
        label: 'Calendar',
        url: '/calendar',
        parentKey: 'apps'
      },
      {
        key: 'email',
        label: 'Email',
        url: '/email',
        parentKey: 'apps'
      },
      {
        key: 'file-manager',
        label: 'File Manager',
        url: '/file-manager',
        parentKey: 'apps'
      },
      {
        key: 'invoices',
        label: 'Invoice',
        parentKey: 'apps',
        children: [
          {
            key: 'invoices',
            label: 'Invoices',
            url: '/invoices',
            parentKey: 'invoice',
          },
          {
            key: 'view-invoices',
            label: 'View Invoices',
            url: '/invoices/view-invoice',
            parentKey: 'invoice',
          },
          {
            key: 'create-invoices',
            label: 'Create Invoices',
            url: '/invoices/create-invoices',
            parentKey: 'invoice',
          },
        ]
      },
    ]
  },
  {
    key: 'pages',
    label: 'Pages',
    icon: 'tabler:file-description',
    children: [
      {
        key: 'auth',
        label: 'Authentication',
        parentKey: 'pages',
        children: [
          {
            key: 'login',
            label: 'Login',
            url: '/auth/login',
            parentKey: 'auth',
          },
          {
            key: 'register',
            label: 'Register',
            url: '/auth/register',
            parentKey: 'auth',
          },
          {
            key: 'logout',
            label: 'Logout',
            url: '/auth/logout',
            parentKey: 'auth',
          },
          {
            key: 'recover-password',
            label: 'Recover Password',
            url: '/auth/recover-password',
            parentKey: 'auth',
          },
          {
            key: 'create-password',
            label: 'Create Password',
            url: '/auth/create-password',
            parentKey: 'auth',
          },
          {
            key: 'lock-screen',
            label: 'Lock Screen',
            url: '/auth/lock-screen',
            parentKey: 'auth',
          },
          {
            key: 'confirm-mail',
            label: 'Confirm Mail',
            url: '/auth/confirm-mail',
            parentKey: 'auth',
          },
          {
            key: 'login-pin',
            label: 'Login with PIN',
            url: '/auth/login-pin',
            parentKey: 'auth',
          },
        ]
      },
      {
        key: 'errors',
        label: 'Error Pages',
        parentKey: 'pages',
        children: [
          {
            key: 'error-401',
            label: '401 Unauthorized',
            url: '/errors/error-401',
            parentKey: 'errors',
          },
          {
            key: 'error-400',
            label: '400 Bad Reques',
            url: '/errors/error-400',
            parentKey: 'errors',
          },
          {
            key: 'error-403',
            label: '403 Forbidden',
            url: '/errors/error-403',
            parentKey: 'errors',
          },
          {
            key: 'error-404',
            label: '404 Not Found',
            url: '/errors/error-404',
            parentKey: 'errors',
          },
          {
            key: 'error-500',
            label: '500 Internal Server',
            url: '/errors/error-500',
            parentKey: 'errors',
          },
          {
            key: 'service-unavailable',
            label: 'Service Unavailable',
            url: '/errors/service-unavailable',
            parentKey: 'errors',
          },
        ]
      },
      {
        key: 'starter-page',
        label: 'Starter Page',
        url: '/pages/starter-page',
        parentKey: 'pages',
      },
      {
        key: 'faq',
        label: 'FAQ',
        url: '/pages/faqs',
        parentKey: 'pages',
      },
      {
        key: 'maintenance',
        label: 'Maintenance',
        url: '/maintenance',
        parentKey: 'pages',
      },
      {
        key: 'timeline',
        label: 'Timeline',
        url: '/pages/timeline',
        parentKey: 'pages',
      },
    ]
  },
  {
    key: 'components',
    label: 'Components',
    icon: 'tabler:components',
    children: [
      {
        key: 'base-ui',
        label: 'Base UI',
        children: [
          {
            key: 'base-ui-accordions',
            label: 'Accordions',
            url: '/ui/accordions',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-alerts',
            label: 'Alerts',
            url: '/ui/alerts',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-avatars',
            label: 'Avatars',
            url: '/ui/avatars',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-badges',
            label: 'Badges',
            url: '/ui/badges',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-breadcrumb',
            label: 'Breadcrumb',
            url: '/ui/breadcrumb',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-buttons',
            label: 'Buttons',
            url: '/ui/buttons',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-cards',
            label: 'Cards',
            url: '/ui/cards',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-carousel',
            label: 'Carousel',
            url: '/ui/carousel',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-collapse',
            label: 'Collapse',
            url: '/ui/collapse',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-dropdowns',
            label: 'Dropdowns',
            url: '/ui/dropdowns',
            parentKey: 'base-ui',
          },
          {
            key: 'ul-ratio',
            label: 'Ratio',
            url: '/ui/ratio',
            parentKey: 'base-ui',
          },
          {
            key: 'ul-grid',
            label: 'Grid',
            url: '/ui/grid',
            parentKey: 'base-ui',
          },
          {
            key: 'ul-links',
            label: 'Links',
            url: '/ui/links',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-list-group',
            label: 'List Group',
            url: '/ui/list-group',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-modals',
            label: 'Modals',
            url: '/ui/modals',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-notifications',
            label: 'Notifications',
            url: '/ui/notifications',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-offcanvas',
            label: 'Offcanvas',
            url: '/ui/offcanvas',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-placeholders',
            label: 'Placeholders',
            url: '/ui/placeholders',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-pagination',
            label: 'Pagination',
            url: '/ui/pagination',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-popovers',
            label: 'Popovers',
            url: '/ui/popovers',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-progress',
            label: 'Progress',
            url: '/ui/progress',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-spinners',
            label: 'Spinners',
            url: '/ui/spinners',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-tabs',
            label: 'Tabs',
            url: '/ui/tabs',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-tooltips',
            label: 'Tooltips',
            url: '/ui/tooltips',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-typography',
            label: 'Typography',
            url: '/ui/typography',
            parentKey: 'base-ui',
          },
          {
            key: 'base-ui-utilities',
            label: 'Utilities',
            url: '/ui/utilities',
            parentKey: 'base-ui',
          },
        ]
      },
      {
        key: 'extended-ui',
        label: 'Extended UI',
        children: [
          {
            key: 'dragula',
            label: 'Dragula',
            url: '/extended/dragula',
            parentKey: 'extended-ui',
          },
          {
            key: 'sweet-alert',
            label: 'Sweet Alert',
            url: '/extended/sweet-alert',
            parentKey: 'extended-ui',
          },
          {
            key: 'ratings',
            label: 'Ratings',
            url: '/extended/ratings',
            parentKey: 'extended-ui',
          },
          {
            key: 'scrollbar',
            label: 'Scrollbar',
            url: '/extended/scrollbar',
            parentKey: 'extended-ui',
          },
        ]
      },
      {
        key: 'forms',
        label: 'Forms',
        children: [
          {
            key: 'basic',
            label: 'Basic Elements',
            url: '/forms/basic',
            parentKey: 'forms',
          },
          {
            key: 'inputmask',
            label: 'Inputmask',
            url: '/forms/inputmask',
            parentKey: 'forms',
          },
          {
            key: 'picker',
            label: 'Picker',
            url: '/forms/picker',
            parentKey: 'forms',
          },
          {
            key: 'select',
            label: 'Select',
            url: '/forms/select',
            parentKey: 'forms',
          },
          {
            key: 'slider',
            label: 'Range Slider',
            url: '/forms/slider',
            parentKey: 'forms',
          },
          {
            key: 'validation',
            label: 'Validation',
            url: '/forms/validation',
            parentKey: 'forms',
          },
          {
            key: 'wizard',
            label: 'Wizard',
            url: '/forms/wizard',
            parentKey: 'forms',
          },
          {
            key: 'file-uploads',
            label: 'File Uploads',
            url: '/forms/file-uploads',
            parentKey: 'forms',
          },
          {
            key: 'editors',
            label: 'Editors',
            url: '/forms/editors',
            parentKey: 'forms',
          },
          {
            key: 'layouts',
            label: 'Layouts',
            url: '/forms/layouts',
            parentKey: 'forms',
          },
        ]
      },
      {
        key: 'charts',
        label: 'Charts',
        children: [
          {
            key: 'area',
            label: 'Area',
            url: '/charts/area',
            parentKey: 'charts',
          },
          {
            key: 'bar',
            label: 'Bar',
            url: '/charts/bar',
            parentKey: 'charts',
          },
          {
            key: 'bubble',
            label: 'Bubble',
            url: '/charts/bubble',
            parentKey: 'charts',
          },
          {
            key: 'candlestick',
            label: 'Candlestick',
            url: '/charts/candlestick',
            parentKey: 'charts',
          },
          {
            key: 'column',
            label: 'Column',
            url: '/charts/column',
            parentKey: 'charts',
          },
          {
            key: 'heatmap',
            label: 'Heatmap',
            url: '/charts/heatmap',
            parentKey: 'charts',
          },
          {
            key: 'line',
            label: 'Line',
            url: '/charts/line',
            parentKey: 'charts',
          },
          {
            key: 'mixed',
            label: 'Mixed',
            url: '/charts/mixed',
            parentKey: 'charts',
          },
          {
            key: 'timeline-chart',
            label: 'Timeline',
            url: '/charts/timeline',
            parentKey: 'charts',
          },
          {
            key: 'boxplot',
            label: 'Boxplot',
            url: '/charts/boxplot',
            parentKey: 'charts',
          },
          {
            key: 'treemap',
            label: 'Treemap',
            url: '/charts/treemap',
            parentKey: 'charts',
          },
          {
            key: 'pie',
            label: 'Pie',
            url: '/charts/pie',
            parentKey: 'charts',
          },
          {
            key: 'radar',
            label: 'Radar',
            url: '/charts/radar',
            parentKey: 'charts',
          },
          {
            key: 'radialBar',
            label: 'RadialBar',
            url: '/charts/radialBar',
            parentKey: 'charts',
          },
          {
            key: 'scatter',
            label: 'Scatter',
            url: '/charts/scatter',
            parentKey: 'charts',
          },
          {
            key: 'polar',
            label: 'Polar Area',
            url: '/charts/polar',
            parentKey: 'charts',
          },
          {
            key: 'sparklines',
            label: 'Sparklines',
            url: '/charts/sparklines',
            parentKey: 'charts',
          },
        ],
      },
      {
        key: 'tables',
        label: 'Tables',
        children: [
          {
            key: 'basic-table',
            label: 'Basic Tables',
            url: '/tables/basic-table',
            parentKey: 'tables',
          },
          {
            key: 'gridJs',
            label: 'GridJs Tables',
            url: '/tables/gridJs',
            parentKey: 'tables',
          },
        ]
      },
      {
        key: 'icons',
        label: 'Icons',
        children: [
          {
            key: 'tabler',
            label: 'Tabler',
            url: '/icons/tabler',
            parentKey: 'icons',
          },
          {
            key: 'solar',
            label: 'Solar',
            url: '/icons/solar',
            parentKey: 'icons',
          },
        ]
      },
      {
        key: 'maps',
        label: 'Maps',
        children: [
          {
            key: 'google',
            label: 'Google Maps',
            url: '/maps/google',
            parentKey: 'maps',
          },
          {
            key: 'vector',
            label: 'Vector Maps',
            url: '/maps/vector',
            parentKey: 'maps',
          },
          {
            key: 'leaflet',
            label: 'Leaflet Maps',
            url: '/maps/leaflet',
            parentKey: 'maps',
          },
        ]
      },
    ]
  },
  {
    key: 'layouts',
    label: 'Layouts',
    icon: 'tabler:layout',
    children: [
      {
        key: 'horizontal',
        label: 'Horizontal',
        url: '/layouts/horizontal',
        parentKey: 'layouts',
        target: '_blank',
      },
      {
        key: 'detached',
        label: 'Detached',
        target: '_blank',
        url: '/layouts/detached',
        parentKey: 'layouts',
      },
      {
        key: 'full-view',
        label: 'Full View',
        url: '/layouts/full-view',
        parentKey: 'layouts',
        target: '_blank',
      },
      {
        key: 'fullscreen-view',
        label: 'FullScreen View',
        url: '/layouts/fullscreen-view',
        parentKey: 'layouts',
        target: '_blank',
      },
      {
        key: 'hover-menu',
        label: 'Hover Menu',
        url: '/layouts/hover-menu',
        parentKey: 'layouts',
        target: '_blank',
      },
      {
        key: 'compact',
        label: 'Compact',
        url: '/layouts/compact',
        parentKey: 'layouts',
        target: '_blank',
      },
      {
        key: 'icon-view',
        label: 'Icon View',
        url: '/layouts/icon-view',
        parentKey: 'layouts',
        target: '_blank',
      },
      {
        key: 'dark-mode',
        label: 'Dark Mode',
        url: '/layouts/dark-mode',
        parentKey: 'layouts',
        target: '_blank',
      },
    ],
  },
]